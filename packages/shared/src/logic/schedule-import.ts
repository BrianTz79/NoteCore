/**
 * Análisis del JSON que genera la IA a partir de la foto del horario (FR-007, FR-008).
 *
 * Principio II: esta es la regla, y vive aquí para que la API la aplique en el servidor.
 * Los clientes la usan solo para adelantar el resultado mientras el usuario escribe.
 *
 * La v1 no validaba nada: lo que la IA devolviera entraba tal cual en la base de datos, así
 * que una hora mal escrita se guardaba y rompía la vista después. Aquí cada elemento se
 * comprueba y lo que no pasa se descarta **con su motivo**, en vez de tumbar la importación
 * entera por una sola fila mala.
 */

import type {
  ImportPreview,
  ImportPreviewBlock,
  ImportPreviewSubject,
  ImportRejection,
} from '../types/schedule.js';
import { WEEKDAYS } from '../types/common.js';
import {
  WEEKDAY_LABELS,
  blocksOverlap,
  minutesOfDay,
  normalizeClockTime,
  normalizeWeekday,
} from './schedule.js';

/** Tope de materias por importación. Un horario real no se acerca; un pegado absurdo sí. */
const MAX_SUBJECTS = 30;

/** Tope de sesiones por materia, el mismo que acepta el alta manual. */
const MAX_BLOCKS_PER_SUBJECT = 20;

/** Error de formato del pegado completo, distinto de una fila concreta descartada. */
export class ImportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportParseError';
  }
}

/**
 * Extrae el JSON de un pegado, tolerando lo que la IA suele añadir de más.
 *
 * Aunque el prompt pide JSON a secas, es habitual que la respuesta venga envuelta en un
 * bloque de código Markdown o precedida de "Aquí tienes tu horario:". Recortar hasta el
 * primer corchete evita que el usuario tenga que limpiar el texto a mano —que era la
 * fricción principal del flujo de la v1—.
 */
function extractJson(raw: string): unknown {
  let text = raw.trim();

  // Bloque de código Markdown: ```json … ```
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(text);
  if (fenced?.[1] !== undefined) text = fenced[1].trim();

  // Texto suelto alrededor del arreglo: se recorta al primer `[` y al último `]`.
  if (!text.startsWith('[') && !text.startsWith('{')) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ImportParseError(
      'Eso no es un JSON válido. Copia la respuesta completa de la IA y vuelve a pegarla.',
    );
  }
}

/** Lee una propiedad admitiendo los nombres alternativos que la IA usa a veces. */
function readField(source: Record<string, unknown>, ...names: readonly string[]): unknown {
  for (const name of names) {
    if (source[name] !== undefined && source[name] !== null) return source[name];
  }
  return undefined;
}

/** Texto limpio o `null` si el valor no sirve como tal. */
function readText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Analiza el pegado y devuelve qué entraría, qué choca y qué se descarta.
 *
 * No escribe nada: es el paso previo que permite al usuario decidir con la información
 * delante. `existingSubjectNames` sirve para marcar los choques con lo que ya tiene.
 */
export function parseScheduleImport(
  raw: string,
  existingSubjectNames: readonly string[] = [],
): ImportPreview {
  const parsed = extractJson(raw);

  // Se acepta tanto el arreglo pelado como `{ "materias": [...] }`, que es la otra forma
  // en que la IA suele envolver la respuesta.
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null
      ? readField(parsed as Record<string, unknown>, 'materias', 'subjects', 'horario')
      : undefined;

  if (!Array.isArray(list)) {
    throw new ImportParseError(
      'El JSON debe ser una lista de materias. Revisa que copiaste la respuesta completa.',
    );
  }

  if (list.length === 0) {
    throw new ImportParseError('El JSON no trae ninguna materia.');
  }

  const rejected: ImportRejection[] = [];
  const subjects: ImportPreviewSubject[] = [];

  // Comparación de nombres insensible a mayúsculas y acentos, igual que en el servidor:
  // "Cálculo" y "calculo" son la misma materia para el usuario.
  const existing = new Set(existingSubjectNames.map(normalizeName));
  const seen = new Set<string>();

  list.forEach((item, index) => {
    // `location` se muestra tal cual al usuario, y las personas cuentan desde 1.
    const position = `Materia ${index + 1}`;

    if (subjects.length >= MAX_SUBJECTS) {
      rejected.push({
        location: position,
        reason: `Se alcanzó el máximo de ${MAX_SUBJECTS} materias por importación`,
      });
      return;
    }

    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      rejected.push({ location: position, reason: 'No es una materia válida' });
      return;
    }

    const source = item as Record<string, unknown>;
    const name = readText(readField(source, 'materia', 'name', 'nombre'));

    if (name === null) {
      rejected.push({ location: position, reason: 'No tiene nombre de materia' });
      return;
    }

    if (name.length > 80) {
      rejected.push({
        location: `${position} ("${name.slice(0, 30)}…")`,
        reason: 'El nombre pasa de 80 caracteres',
      });
      return;
    }

    const label = `${position} ("${name}")`;
    const key = normalizeName(name);

    // Duplicada dentro del propio pegado: la IA a veces repite una materia en lugar de
    // agrupar sus sesiones. Se descarta la segunda para no crear dos veces la misma.
    if (seen.has(key)) {
      rejected.push({ location: label, reason: 'Aparece repetida en el JSON' });
      return;
    }
    seen.add(key);

    const rawBlocks = readField(source, 'sesiones', 'blocks', 'bloques', 'horarios');
    const blocks: ImportPreviewBlock[] = [];

    if (rawBlocks !== undefined && !Array.isArray(rawBlocks)) {
      rejected.push({ location: label, reason: 'Sus sesiones no son una lista' });
    }

    if (Array.isArray(rawBlocks)) {
      rawBlocks.forEach((rawBlock, blockIndex) => {
        const blockLabel = `${label}, sesión ${blockIndex + 1}`;

        if (blocks.length >= MAX_BLOCKS_PER_SUBJECT) {
          rejected.push({
            location: blockLabel,
            reason: `Una materia no puede tener más de ${MAX_BLOCKS_PER_SUBJECT} sesiones`,
          });
          return;
        }

        const block = parseBlock(rawBlock, blockLabel, rejected);
        if (block === null) return;

        // Solape consigo misma: la IA a veces duplica una sesión con horas ligeramente
        // distintas. Se queda la primera, porque dos clases a la vez no son posibles.
        const clash = blocks.find((existingBlock) => blocksOverlap(existingBlock, block));
        if (clash) {
          rejected.push({
            location: blockLabel,
            reason: `Se encima con otra sesión de la misma materia (${WEEKDAY_LABELS[clash.weekday]} ${clash.startTime})`,
          });
          return;
        }

        blocks.push(block);
      });
    }

    if (blocks.length === 0) {
      rejected.push({ location: label, reason: 'No tiene ninguna sesión válida' });
      return;
    }

    // Se ordenan para que la vista previa se lea en el orden de la semana, no en el que
    // la IA los haya escrito: primero por día, y dentro del día por hora.
    blocks.sort((a, b) => {
      const byDay = WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday);
      if (byDay !== 0) return byDay;
      return minutesOfDay(a.startTime) - minutesOfDay(b.startTime);
    });

    subjects.push({
      name,
      blocks,
      conflictsWithExisting: existing.has(key),
    });
  });

  if (subjects.length === 0) {
    throw new ImportParseError(
      'Ninguna materia del JSON es válida. Revisa el formato y vuelve a intentarlo.',
    );
  }

  return {
    subjects,
    rejected,
    totalBlocks: subjects.reduce((total, subject) => total + subject.blocks.length, 0),
  };
}

/** Valida una sesión suelta. Devuelve `null` y anota el motivo si no sirve. */
function parseBlock(
  raw: unknown,
  label: string,
  rejected: ImportRejection[],
): ImportPreviewBlock | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    rejected.push({ location: label, reason: 'No es una sesión válida' });
    return null;
  }

  const source = raw as Record<string, unknown>;

  const weekday = normalizeWeekday(readField(source, 'dia', 'weekday', 'día', 'dia_semana'));
  if (weekday === null) {
    rejected.push({
      location: label,
      reason: 'El día no se reconoce (usa lunes a sábado)',
    });
    return null;
  }

  const startTime = normalizeClockTime(readField(source, 'hora_inicio', 'startTime', 'inicio'));
  if (startTime === null) {
    rejected.push({ location: label, reason: 'La hora de inicio no es válida (usa HH:MM)' });
    return null;
  }

  const endTime = normalizeClockTime(readField(source, 'hora_fin', 'endTime', 'fin'));
  if (endTime === null) {
    rejected.push({ location: label, reason: 'La hora de fin no es válida (usa HH:MM)' });
    return null;
  }

  if (minutesOfDay(endTime) <= minutesOfDay(startTime)) {
    rejected.push({
      location: label,
      reason: `La hora de fin (${endTime}) no es posterior a la de inicio (${startTime})`,
    });
    return null;
  }

  const room = readText(readField(source, 'aula', 'room', 'salon', 'salón'));

  return {
    weekday,
    startTime,
    endTime,
    // Un aula larguísima es señal de que la IA metió ahí otra cosa; se descarta el campo,
    // no la sesión, porque el aula es opcional.
    room: room !== null && room.length <= 30 ? room : null,
  };
}

/** Nombre en minúsculas y sin acentos, para comparar materias como lo haría una persona. */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
