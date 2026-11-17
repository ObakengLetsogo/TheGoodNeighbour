import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** Vertical progress timeline. Steps before `current` are done; `current` is where things stand. */
export function Timeline({ steps, current, hints, allDone }: { steps: string[]; current: number; hints?: Record<number, string>; allDone?: boolean }) {
  return (
    <View accessible accessibilityLabel={`Progress: ${steps[current]}, step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => {
        const done = i < current || (allDone && i === current);
        const now = i === current && !allDone;
        const last = i === steps.length - 1;
        return (
          <View key={label} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.node, done && styles.nodeDone, now && styles.nodeNow]}>
                {done ? <Icon name="check" size={14} color={colors.white} /> : now ? <View style={styles.pulse} /> : null}
              </View>
              {!last ? <View style={[styles.line, done && { backgroundColor: colors.olive }]} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.lg }}>
              <Text variant="cardTitle" color={i > current ? colors.muted : colors.ink}>{label}</Text>
              {hints?.[i] ? <Text variant="bodyS">{hints[i]}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 24 },
  node: { width: 24, height: 24, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.olive, borderColor: colors.olive },
  nodeNow: { borderColor: colors.olive, backgroundColor: colors.oliveLight },
  pulse: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.olive },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
});
