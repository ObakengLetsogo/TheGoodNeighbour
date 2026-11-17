import { StyleSheet, View } from 'react-native';
import { pct } from '../lib/cover';
import { formatZAR } from '../lib/format';
import { colors, radii, spacing } from '../theme';
import { RELATIONSHIP_LABEL, type CoverOptions } from '../types';
import { Text } from './Text';

/** The rules behind the price, generated from the live settings: relationship %, then age bands. */
export function HowPriceWorks({ options, exampleBaseCents }: { options: CoverOptions; exampleBaseCents?: number }) {
  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="body" color={colors.inkSoft}>
        1. The <Text variant="cardTitle">cost of your bundle</Text> sets a base monthly price.{'\n'}
        2. <Text variant="cardTitle">Everyone covered</Text>, including you, pays that base × a % for their <Text variant="cardTitle">relationship</Text> × a % for their <Text variant="cardTitle">age</Text>.{'\n'}
        3. Add everyone up, and that's your monthly total.
      </Text>
      {exampleBaseCents ? <Text variant="bodyS">For example, with a base of {formatZAR(exampleBaseCents)}: a 40 year old pays {formatZAR(Math.round(exampleBaseCents * (options.ageBands.find((b) => 40 >= b.fromAge && 40 <= b.toAge)?.multiplierBps ?? 10000) / 10000))}.</Text> : null}

      <View style={{ gap: spacing.sm }}>
        <Text variant="cardTitle">By relationship</Text>
        <View style={styles.table}>
          {options.relationships.map((r, i) => (
            <View key={r.relationship} style={[styles.tr, i > 0 && styles.sep]}>
              <Text variant="body" style={{ flex: 1 }}>{RELATIONSHIP_LABEL[r.relationship]}</Text>
              <Text variant="cardTitle">{pct(r.multiplierBps)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="cardTitle">By age</Text>
        <View style={styles.table}>
          {options.ageBands.map((b, i) => (
            <View key={b.fromAge} style={[styles.tr, i > 0 && styles.sep]}>
              <Text variant="body" style={{ flex: 1 }}>{b.toAge >= 110 ? `${b.fromAge} and over` : `${b.fromAge} to ${b.toAge}`}</Text>
              <Text variant="cardTitle">{pct(b.multiplierBps)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  table: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  sep: { borderTopWidth: 1, borderTopColor: colors.border },
});
