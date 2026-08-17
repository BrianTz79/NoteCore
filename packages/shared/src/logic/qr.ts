/**
 * Codificador de códigos QR (FR-028).
 *
 * Principio VIII: el QR se genera UNA vez aquí y los dos clientes pintan la misma matriz
 * —web con `<svg>`, app con `react-native-svg`—. Con una librería por plataforma serían dos
 * implementaciones distintas del mismo código, y basta que difieran en el margen o en la
 * versión elegida para que una cámara lea el de un cliente y no el del otro.
 *
 * Alcance deliberadamente estrecho: solo lo que hace falta para codificar un enlace de
 * compartición. Modo **byte**, corrección de errores **M** y versiones 1 a 10, que cubren
 * hasta 271 caracteres —de sobra para `https://notecore.ourocore.net/compartido/ABCD2345`—.
 * No implementa los modos numérico, alfanumérico ni kanji porque ningún enlace los necesita.
 *
 * Implementado sobre la norma ISO/IEC 18004.
 */

/* ─────────────────────────── Aritmética del cuerpo de Galois ─────────────────────────── */

/**
 * Tablas de exponentes y logaritmos en GF(256).
 *
 * Reed-Solomon multiplica polinomios sobre este cuerpo. Con las tablas, multiplicar se
 * reduce a sumar logaritmos, que es lo que hace viable calcular la corrección de errores sin
 * bucles anidados.
 */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    // 0x11d es el polinomio primitivo que fija la norma para QR.
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255]!;
}

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

/**
 * Polinomio generador de `degree` símbolos de corrección.
 *
 * Los coeficientes salen del mayor grado al menor —`[1, 216, 194, …]` para grado 10, tal como
 * los tabula la norma—. El orden importa: invertido, la división polinómica de
 * `errorCorrectionBlock` produce símbolos de corrección que no se corresponden con los datos,
 * y el resultado es un QR de estructura impecable que ningún lector consigue decodificar.
 */
function generatorPolynomial(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);

  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j += 1) {
      // El término de mayor grado se arrastra, y el producto por α^i cae en el siguiente.
      next[j] = (next[j]! ^ poly[j]!) as number;
      next[j + 1] = (next[j + 1]! ^ gfMultiply(poly[j]!, GF_EXP[i]!)) as number;
    }
    poly = next;
  }

  return poly;
}

/** Los símbolos de corrección de un bloque de datos. */
function errorCorrectionBlock(data: Uint8Array, count: number): Uint8Array {
  const generator = generatorPolynomial(count);
  const remainder = new Uint8Array(data.length + count);
  remainder.set(data);

  for (let i = 0; i < data.length; i += 1) {
    const factor = remainder[i]!;
    if (factor === 0) continue;
    for (let j = 0; j < generator.length; j += 1) {
      remainder[i + j] = (remainder[i + j]! ^ gfMultiply(generator[j]!, factor)) as number;
    }
  }

  return remainder.slice(data.length);
}

/* ─────────────────────────── Parámetros por versión ─────────────────────────── */

/**
 * Para cada versión (1 a 10) con corrección **M**: capacidad en bytes de datos, símbolos de
 * corrección por bloque, y en cuántos bloques se reparte.
 *
 * Son las tablas 7 a 9 de la norma. Solo se incluye el nivel M —el equilibrio habitual entre
 * tamaño y tolerancia a manchas— porque es el único que este codificador ofrece.
 */
interface VersionSpec {
  readonly version: number;
  /** Bytes de datos que caben. */
  readonly dataBytes: number;
  /** Símbolos de corrección por bloque. */
  readonly ecPerBlock: number;
  /** Bloques del grupo 1 y del grupo 2 (el segundo lleva un byte más de datos). */
  readonly group1Blocks: number;
  readonly group2Blocks: number;
}

const VERSIONS: readonly VersionSpec[] = [
  { version: 1, dataBytes: 16, ecPerBlock: 10, group1Blocks: 1, group2Blocks: 0 },
  { version: 2, dataBytes: 28, ecPerBlock: 16, group1Blocks: 1, group2Blocks: 0 },
  { version: 3, dataBytes: 44, ecPerBlock: 26, group1Blocks: 1, group2Blocks: 0 },
  { version: 4, dataBytes: 64, ecPerBlock: 18, group1Blocks: 2, group2Blocks: 0 },
  { version: 5, dataBytes: 86, ecPerBlock: 24, group1Blocks: 2, group2Blocks: 0 },
  { version: 6, dataBytes: 108, ecPerBlock: 16, group1Blocks: 4, group2Blocks: 0 },
  { version: 7, dataBytes: 124, ecPerBlock: 18, group1Blocks: 4, group2Blocks: 0 },
  { version: 8, dataBytes: 154, ecPerBlock: 22, group1Blocks: 2, group2Blocks: 2 },
  { version: 9, dataBytes: 182, ecPerBlock: 22, group1Blocks: 3, group2Blocks: 2 },
  { version: 10, dataBytes: 216, ecPerBlock: 26, group1Blocks: 4, group2Blocks: 1 },
];

/** Posiciones centrales de los patrones de alineación, por versión. */
const ALIGNMENT_CENTERS: readonly (readonly number[])[] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/** Texto UTF-8 como bytes. Un enlace es ASCII, pero un título con acentos no lo sería. */
function toUtf8(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);

  // Respaldo para entornos sin `TextEncoder`. React Native y Node lo traen desde hace años.
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

/** Error de codificación: el contenido no cabe en las versiones que se soportan. */
export class QrTooLongError extends Error {
  constructor(bytes: number) {
    super(`El contenido no cabe en un QR de esta implementación (${bytes} bytes)`);
    this.name = 'QrTooLongError';
  }
}

/* ─────────────────────────── Construcción de la matriz ─────────────────────────── */

/**
 * Escribe un patrón de búsqueda de 7×7 con su separador blanco alrededor.
 *
 * El recorrido va de -1 a 7 para cubrir también el separador, así que antes de decidir el
 * color hay que comprobar si la casilla cae **fuera** del cuadro 7×7. Sin esa comprobación,
 * `r === 0` da por buena la fila del borde superior incluso en las columnas del separador, y
 * el patrón sale pegado al resto del código: ninguna cámara lo localiza.
 */
function placeFinder(matrix: (boolean | null)[][], row: number, col: number): void {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= matrix.length || cc < 0 || cc >= matrix.length) continue;

      // Fuera del cuadro 7×7 está el separador, que es siempre blanco.
      if (r < 0 || r > 6 || c < 0 || c > 6) {
        matrix[rr]![cc] = false;
        continue;
      }

      const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const inCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[rr]![cc] = onBorder || inCenter;
    }
  }
}

/** Las ocho máscaras que define la norma. */
function maskAt(pattern: number, row: number, col: number): boolean {
  switch (pattern) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

/**
 * Dónde va cada uno de los 15 bits de formato, del más significativo al menos.
 *
 * Primera copia: en L alrededor del patrón de búsqueda superior izquierdo —baja por la
 * columna 8 y sigue por la fila 8—, saltando la fila y la columna 6, que son de temporización.
 */
const FORMAT_POSITIONS_1: readonly (readonly [number, number])[] = [
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
  [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
];

/**
 * Segunda copia, redundante: los primeros siete bits suben por la columna 8 desde abajo y
 * los ocho restantes recorren la fila 8 desde el borde derecho.
 *
 * Los valores negativos se cuentan desde el final de la matriz, porque estas posiciones
 * dependen del tamaño y este varía con la versión.
 */
const FORMAT_POSITIONS_2: readonly (readonly [number, number])[] = [
  [-1, 8], [-2, 8], [-3, 8], [-4, 8], [-5, 8], [-6, 8], [-7, 8],
  [8, -8], [8, -7], [8, -6], [8, -5], [8, -4], [8, -3], [8, -2], [8, -1],
];

/** Los 15 bits de información de formato para el nivel M y una máscara dada. */
function formatBits(maskPattern: number): number {
  // 0b00 es el indicador del nivel M en los dos bits de nivel de corrección.
  const data = (0b00 << 3) | maskPattern;
  let bits = data << 10;

  for (let i = 4; i >= 0; i -= 1) {
    if (bits & (1 << (i + 10))) bits ^= 0b10100110111 << i;
  }

  // La máscara fija que exige la norma, para que un formato de ceros no quede todo blanco.
  return ((data << 10) | bits) ^ 0b101010000010010;
}

/** Los 18 bits de versión, presentes solo desde la versión 7. */
function versionBits(version: number): number {
  let bits = version << 12;
  for (let i = 5; i >= 0; i -= 1) {
    if (bits & (1 << (i + 12))) bits ^= 0b1111100100101 << i;
  }
  return (version << 12) | bits;
}

/** Penalización de una matriz según las cuatro reglas de la norma. Menos es mejor. */
function penalty(matrix: readonly (readonly boolean[])[]): number {
  const size = matrix.length;
  let score = 0;

  // Regla 1: rachas de cinco o más módulos del mismo color, en filas y en columnas.
  for (let i = 0; i < size; i += 1) {
    for (const line of [
      matrix[i]!,
      matrix.map((row) => row[i]!),
    ]) {
      let run = 1;
      for (let j = 1; j < size; j += 1) {
        if (line[j] === line[j - 1]) {
          run += 1;
        } else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Regla 2: bloques de 2×2 del mismo color.
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = matrix[r]![c];
      if (v === matrix[r]![c + 1] && v === matrix[r + 1]![c] && v === matrix[r + 1]![c + 1]) {
        score += 3;
      }
    }
  }

  // Regla 3: el patrón 1:1:3:1:1 que imita a un patrón de búsqueda.
  const bad1 = [true, false, true, true, true, false, true, false, false, false, false];
  const bad2 = [false, false, false, false, true, false, true, true, true, false, true];
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j + 11 <= size; j += 1) {
      const row = matrix[i]!.slice(j, j + 11);
      const col = matrix.slice(j, j + 11).map((r) => r[i]!);
      for (const line of [row, col]) {
        if (bad1.every((v, k) => v === line[k]) || bad2.every((v, k) => v === line[k])) {
          score += 40;
        }
      }
    }
  }

  // Regla 4: desequilibrio entre módulos oscuros y claros.
  const dark = matrix.reduce(
    (total, row) => total + row.reduce((n, v) => n + (v ? 1 : 0), 0),
    0,
  );
  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return score;
}

/**
 * La matriz de un código QR, lista para pintarse.
 *
 * `modules[fila][columna]` es `true` donde el módulo va en oscuro.
 */
export interface QrMatrix {
  readonly size: number;
  readonly modules: readonly (readonly boolean[])[];
  readonly version: number;
}

/**
 * Codifica un texto como matriz QR (FR-028).
 *
 * Modo byte y corrección M. Elige la versión más pequeña en la que quepa el contenido: un QR
 * más pequeño tiene módulos más grandes en el mismo espacio de pantalla, y eso es lo que
 * hace que una cámara mediocre lo lea a la primera.
 */
export function encodeQr(text: string): QrMatrix {
  const data = toUtf8(text);

  const spec = VERSIONS.find((candidate) => {
    // 4 bits de modo + 8 o 16 de longitud, según la versión.
    const lengthBits = candidate.version < 10 ? 8 : 16;
    return data.length + Math.ceil((4 + lengthBits) / 8) <= candidate.dataBytes;
  });

  if (!spec) throw new QrTooLongError(data.length);

  /* ── 1. Flujo de bits: modo, longitud, datos y relleno ── */

  const bits: number[] = [];
  const pushBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  };

  pushBits(0b0100, 4); // modo byte
  pushBits(data.length, spec.version < 10 ? 8 : 16);
  for (const byte of data) pushBits(byte, 8);

  const capacityBits = spec.dataBytes * 8;
  // Terminador de hasta cuatro ceros.
  for (let i = 0; i < 4 && bits.length < capacityBits; i += 1) bits.push(0);
  // Completar hasta byte entero.
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j]!;
    dataCodewords.push(byte);
  }
  // Relleno alterno que fija la norma hasta llenar la capacidad.
  const PAD = [0xec, 0x11];
  while (dataCodewords.length < spec.dataBytes) {
    dataCodewords.push(PAD[(dataCodewords.length - bits.length / 8) % 2]!);
  }

  /* ── 2. Reparto en bloques y corrección de errores ── */

  const totalBlocks = spec.group1Blocks + spec.group2Blocks;
  const group1Size = Math.floor(spec.dataBytes / totalBlocks);

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < totalBlocks; i += 1) {
    const size = i < spec.group1Blocks ? group1Size : group1Size + 1;
    const block = new Uint8Array(dataCodewords.slice(offset, offset + size));
    offset += size;
    dataBlocks.push(block);
    ecBlocks.push(errorCorrectionBlock(block, spec.ecPerBlock));
  }

  // Entrelazado: se toma el byte i de cada bloque por turno. Es lo que hace que una mancha
  // sobre el código dañe un poco de todos los bloques en vez de destruir uno entero.
  const finalCodewords: number[] = [];
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) finalCodewords.push(block[i]!);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (const block of ecBlocks) finalCodewords.push(block[i]!);
  }

  /* ── 3. Colocación en la matriz ── */

  const size = spec.version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );

  placeFinder(matrix, 0, 0);
  placeFinder(matrix, 0, size - 7);
  placeFinder(matrix, size - 7, 0);

  // Patrones de alineación, salvo donde chocarían con los de búsqueda.
  const centers = ALIGNMENT_CENTERS[spec.version] ?? [];
  for (const r of centers) {
    for (const c of centers) {
      const nearFinder =
        (r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8);
      if (nearFinder) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          matrix[r + dr]![c + dc] =
            Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
        }
      }
    }
  }

  // Patrones de temporización: la línea alterna que fija la rejilla.
  for (let i = 8; i < size - 8; i += 1) {
    const value = i % 2 === 0;
    matrix[6]![i] = value;
    matrix[i]![6] = value;
  }

  // Módulo siempre oscuro que exige la norma.
  matrix[size - 8]![8] = true;

  // Se reservan las casillas de formato y de versión para no escribir datos encima.
  const reserved: [number, number][] = [];
  for (let i = 0; i < 9; i += 1) {
    reserved.push([8, i], [i, 8]);
  }
  for (let i = 0; i < 8; i += 1) {
    reserved.push([8, size - 1 - i], [size - 1 - i, 8]);
  }
  if (spec.version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        reserved.push([i, size - 11 + j], [size - 11 + j, i]);
      }
    }
  }
  for (const [r, c] of reserved) {
    if (matrix[r]![c] === null) matrix[r]![c] = false;
  }

  // Recorrido en zigzag de abajo a arriba, dos columnas a la vez.
  const dataBits: number[] = [];
  for (const codeword of finalCodewords) {
    for (let i = 7; i >= 0; i -= 1) dataBits.push((codeword >> i) & 1);
  }

  const placed: (boolean | null)[][] = matrix.map((row) => [...row]);
  const isReserved = (r: number, c: number) => matrix[r]![c] !== null;

  /**
   * Recorrido en zigzag: columnas de dos en dos, de derecha a izquierda, alternando el
   * sentido vertical en cada par.
   *
   * Las columnas se recorren desde una lista construida de antemano en lugar de decrementar
   * el índice dentro del bucle. Saltar la columna 6 —la de temporización— restando al
   * contador desplazaba todos los pares siguientes en uno, y los datos acababan escritos en
   * columnas equivocadas: la estructura del QR salía perfecta y ninguna cámara lo leía.
   */
  const columnPairs: number[] = [];
  for (let col = size - 1; col > 0; col -= 2) {
    // La columna 6 es de temporización y no forma pareja con nadie: a partir de ella, los
    // pares se desplazan uno a la izquierda —(8,7) y luego (5,4)—, en vez de tomarla como
    // miembro del par. Restarle uno al contador en cuanto `col` baja de 6 desplazaría también
    // el par (10,9), y los datos de esas dos columnas se escribirían intercambiados.
    if (col === 6) col = 5;
    columnPairs.push(col);
  }

  let bitIndex = 0;
  let upward = true;
  for (const col of columnPairs) {
    for (let i = 0; i < size; i += 1) {
      const row = upward ? size - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (isReserved(row, c)) continue;
        placed[row]![c] = bitIndex < dataBits.length ? dataBits[bitIndex] === 1 : false;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }

  /* ── 4. Máscara: se prueban las ocho y gana la de menor penalización ── */

  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  let bestPattern = 0;

  for (let pattern = 0; pattern < 8; pattern += 1) {
    const candidate: boolean[][] = placed.map((row, r) =>
      row.map((value, c) => {
        if (isReserved(r, c)) return value === true;
        return (value === true) !== maskAt(pattern, r, c);
      }),
    );

    /**
     * El formato se escribe antes de puntuar: forma parte del código que la cámara lee.
     *
     * Las posiciones van en tablas explícitas y no derivadas de `i` con condicionales: las
     * dos copias del formato recorren la matriz en órdenes distintos —una en L alrededor del
     * patrón superior izquierdo, la otra partida entre el borde derecho y el inferior— y
     * calcularlas con aritmética de índices es exactamente donde se cuela un desfase que
     * deja el QR con la estructura correcta pero ilegible.
     *
     * `i` va del bit 14 (el más significativo) al 0, que es el orden que fija la norma.
     */
    const format = formatBits(pattern);
    for (let i = 0; i < 15; i += 1) {
      const bit = ((format >> (14 - i)) & 1) === 1;

      const [r1, c1] = FORMAT_POSITIONS_1[i]!;
      candidate[r1]![c1] = bit;

      const [r2, c2] = FORMAT_POSITIONS_2[i]!;
      candidate[r2 < 0 ? size + r2 : r2]![c2 < 0 ? size + c2 : c2] = bit;
    }

    if (spec.version >= 7) {
      const version = versionBits(spec.version);
      for (let i = 0; i < 18; i += 1) {
        const bit = ((version >> i) & 1) === 1;
        candidate[Math.floor(i / 3)]![size - 11 + (i % 3)] = bit;
        candidate[size - 11 + (i % 3)]![Math.floor(i / 3)] = bit;
      }
    }

    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
      bestPattern = pattern;
    }
  }

  void bestPattern;

  return { size, modules: best!, version: spec.version };
}

/**
 * El QR como ruta SVG, para pintarlo con un solo elemento.
 *
 * Devolver una `path` en lugar de un rectángulo por módulo importa: un QR de versión 3 tiene
 * 841 módulos, y 841 nodos en el árbol hacen que la app tarde visiblemente en abrir la
 * pantalla. Con una ruta es un nodo.
 */
export function qrToSvgPath(matrix: QrMatrix): string {
  const parts: string[] = [];

  for (let r = 0; r < matrix.size; r += 1) {
    for (let c = 0; c < matrix.size; c += 1) {
      if (matrix.modules[r]![c]) parts.push(`M${c} ${r}h1v1h-1z`);
    }
  }

  return parts.join('');
}

/**
 * El `viewBox` que acompaña a la ruta, con el margen que exige la norma.
 *
 * Los cuatro módulos de "zona tranquila" no son decoración: sin ellos muchas cámaras no
 * localizan el código sobre un fondo con textura.
 */
export const QR_QUIET_ZONE = 4;

export function qrViewBox(matrix: QrMatrix): string {
  const total = matrix.size + QR_QUIET_ZONE * 2;
  return `${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${total} ${total}`;
}
