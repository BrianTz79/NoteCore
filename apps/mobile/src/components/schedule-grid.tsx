import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  WEEKDAY_SHORT_LABELS,
  entriesForWeekday,
  minutesOfDay,
  scheduleRange,
  type ScheduleEntry,
} from '@notecore/shared';
import { RADIUS, SPACE, TEXT, c, colors, fuente } from './ui';

/**
 * Vista semanal del horario en la app (FR-009).
 *
 * Misma rejilla de horas × días que la web —la paridad del Principio I se comprueba
 * mirando ambas pantallas—, con desplazamiento horizontal para que quepa en el teléfono
 * sin dejar de ser una semana completa.
 *
 * Las medidas se calculan con las mismas funciones de `shared` que usa la web, así que la
 * disposición de las clases coincide en las dos plataformas.
 */

/** Alto de una hora. Fija la escala vertical, igual que en la web. */
const HOUR_HEIGHT = 60;
/** Ancho de cada columna de día. Suficiente para "07:00–09:00" y un aula corta. */
const DAY_WIDTH = 104;
/** Ancho del eje de horas de la izquierda. */
const AXIS_WIDTH = 48;

export function ScheduleGrid({
  entries,
  onSelect,
}: {
  entries: readonly ScheduleEntry[];
  onSelect?: (entry: ScheduleEntry) => void;
}) {
  const range = scheduleRange(entries);
  const hours = Array.from(
    { length: range.endHour - range.startHour },
    (_, index) => range.startHour + index,
  );
  const totalHeight = hours.length * HOUR_HEIGHT;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.row}>
          {/* Eje de horas: queda a la izquierda y se desplaza junto a la rejilla. */}
          <View style={{ width: AXIS_WIDTH }}>
            <View style={styles.headerCell} />
            <View style={{ height: totalHeight }}>
              {hours.map((hour, index) => (
                <Text
                  key={hour}
                  style={[styles.hourLabel, { top: index * HOUR_HEIGHT + 2 }]}
                >
                  {String(hour).padStart(2, '0')}:00
                </Text>
              ))}
            </View>
          </View>

          {range.weekdays.map((day) => (
            <View key={day} style={{ width: DAY_WIDTH }}>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>{WEEKDAY_SHORT_LABELS[day]}</Text>
              </View>

              <View style={[styles.dayColumn, { height: totalHeight }]}>
                {hours.map((hour, index) => (
                  <View
                    key={hour}
                    style={[styles.hourLine, { top: index * HOUR_HEIGHT }]}
                  />
                ))}

                {entriesForWeekday(entries, day).map((entry) => {
                  const top =
                    ((minutesOfDay(entry.startTime) - range.startHour * 60) / 60) * HOUR_HEIGHT;
                  const height =
                    ((minutesOfDay(entry.endTime) - minutesOfDay(entry.startTime)) / 60) *
                    HOUR_HEIGHT;

                  return (
                    <Pressable
                      key={entry.blockId}
                      onPress={onSelect ? () => onSelect(entry) : undefined}
                      style={({ pressed }) => [
                        styles.block,
                        {
                          top,
                          height,
                          borderLeftColor: entry.color,
                          // Los dos últimos dígitos son la transparencia: el color de la
                          // materia se reconoce sin comerse el contraste del texto.
                          backgroundColor: `${entry.color}33`,
                        },
                        pressed ? styles.blockPressed : null,
                      ]}
                    >
                      <Text numberOfLines={1} style={styles.blockTitle}>
                        {entry.subjectName}
                      </Text>
                      <Text numberOfLines={1} style={styles.blockTime}>
                        {entry.startTime}–{entry.endTime}
                      </Text>
                      {entry.room ? (
                        <Text numberOfLines={1} style={styles.blockRoom}>
                          {entry.room}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: colors.borde,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.tarjeta,
    padding: 8,
  },
  row: { flexDirection: 'row' },
  headerCell: { height: 28, alignItems: 'center', justifyContent: 'center' },
  headerText: { color: colors.texto, fontSize: TEXT.sm, fontWeight: '600' },
  hourLabel: {
    position: 'absolute',
    right: SPACE.xs,
    color: c.tinta3,
    fontFamily: fuente.mono,
    fontVariant: ['tabular-nums'],
    fontSize: TEXT.xs,
  },
  dayColumn: {
    borderLeftColor: colors.borde,
    borderLeftWidth: 1,
    position: 'relative',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopColor: colors.borde,
    borderTopWidth: 1,
  },
  block: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderLeftWidth: 3,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  blockPressed: { opacity: 0.7 },
  blockTitle: { color: colors.textoFuerte, fontSize: TEXT.xs, fontWeight: '600' },
  blockTime: {
    color: c.tinta2,
    fontFamily: fuente.mono,
    fontVariant: ['tabular-nums'],
    fontSize: TEXT.xs,
  },
  blockRoom: { color: colors.textoSuave, fontSize: TEXT.xs },
});
