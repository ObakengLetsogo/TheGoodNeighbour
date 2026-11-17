import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatZAR } from '../lib/format';
import { accents, colors, radii, spacing } from '../theme';
import type { Plan } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';

export function PlanCard({ plan, width }: { plan: Plan; width?: number }) {
  const a = accents[plan.accent] ?? accents.olive;
  const open = () => router.push({ pathname: '/plan/[id]', params: { id: plan.id } });
  const spouse = plan.memberRules.find((r) => r.type === 'spouse');
  return (
    <View style={width ? { width } : undefined}>
      <Card accent={plan.accent} tabLabel={plan.name} onPress={open} padded={false} accessibilityLabel={`${plan.name} plan. ${formatZAR(plan.coverCents)} cover from ${formatZAR(plan.premiumCents)} a month`}>
        <View style={[styles.hero, { backgroundColor: a.tint }]}>
          <View style={[styles.blob, { backgroundColor: a.main }]} />
          <Text variant="eyebrow" color={colors.inkSoft}>COVER FOR YOU</Text>
          <Text variant="displayM" style={{ fontSize: 34 }}>{formatZAR(plan.coverCents)}</Text>
        </View>
        <View style={styles.body}>
          <Text variant="bodyS" numberOfLines={2}>{plan.description}</Text>
          <View style={{ gap: 4, marginTop: spacing.xs }}>
            <Line text={`Family members from ${formatZAR(Math.min(...plan.memberRules.map((r) => r.feeCents)))} a month`} />
            {spouse ? <Line text={`Spouse cover ${formatZAR(spouse.coverCents)}`} /> : null}
            <Line text={`${plan.waitingPeriodDays}-day waiting period`} />
          </View>
          <View style={styles.foot}>
            <View>
              <Text variant="eyebrow">From</Text>
              <Text variant="price">{formatZAR(plan.premiumCents)}<Text variant="bodyS"> a month</Text></Text>
            </View>
            <Button label="View Plan" size="small" fullWidth={false} onPress={open} />
          </View>
        </View>
      </Card>
    </View>
  );
}

function Line({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name="check" size={14} color={colors.olive} />
      <Text variant="bodyS" color={colors.inkSoft} style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, paddingVertical: spacing.xl, overflow: 'hidden', gap: 2 },
  blob: { position: 'absolute', width: 150, height: 150, borderRadius: radii.pill, opacity: 0.12, right: -30, top: -50 },
  body: { padding: spacing.lg, gap: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
});
