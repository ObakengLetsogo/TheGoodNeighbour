import { StyleSheet, View } from 'react-native';
import { pct } from '../lib/cover';
import { formatZAR } from '../lib/format';
import { colors, spacing } from '../theme';
import { RELATIONSHIP_LABEL, type PersonQuote } from '../types';
import { Text } from './Text';

export interface PersonLine extends PersonQuote {
  /** Their name, when we have it. */
  name?: string;
}

/**
 * Shows exactly how the monthly price adds up: for each person, the reference base price x their relationship % x
 * their age %, and their resulting fee. This is what makes the total checkable by the customer.
 */
export function PriceBreakdown({ baseMonthlyCents, people, totalMonthlyCents, explain = true }: {
  baseMonthlyCents: number; people: PersonLine[]; totalMonthlyCents: number; explain?: boolean;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {explain ? (
        <Text variant="bodyS">
          The cost of your bundle sets a base price of {formatZAR(baseMonthlyCents)} a month. Each person pays that base × a % for their relationship × a % for their age.
        </Text>
      ) : null}
      {people.map((p, i) => {
        const you = p.role === 'you';
        const rel = p.role === 'you' ? 'Main member' : RELATIONSHIP_LABEL[p.role];
        const who = p.name ?? (you ? 'You' : rel);
        return (
          <View key={i} style={styles.row} accessible accessibilityLabel={`${who}${p.age != null ? `, age ${p.age}` : ''}, ${formatZAR(p.feeCents)} a month`}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="cardTitle">{who}</Text>
              <Text variant="bodyS">
                {rel}{p.age != null ? ` · age ${p.age}` : ' · age not entered yet'}
              </Text>
              <Text variant="bodyS" color={colors.muted}>
                {formatZAR(baseMonthlyCents)} × {pct(p.relationshipBps)} {you ? '' : 'relationship '}× {pct(p.ageBps)} age
              </Text>
            </View>
            <Text variant="price">{formatZAR(p.feeCents)}</Text>
          </View>
        );
      })}
      <View style={[styles.row, styles.total]}>
        <Text variant="cardTitle" style={{ flex: 1 }}>Every month</Text>
        <Text variant="price" style={{ fontSize: 20 }}>{formatZAR(totalMonthlyCents)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  total: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
});
