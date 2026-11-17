import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icon';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { formatZAR } from '../../src/lib/format';
import { useCover } from '../../src/store/CoverContext';
import { usePlans } from '../../src/store/PlansContext';
import { accents, colors, radii, spacing } from '../../src/theme';
import { MEMBER_LABEL } from '../../src/types';

export default function PlanDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, plans } = usePlans();
  const { current } = useCover();
  const plan = plans.find((p) => p.id === id);

  if (status === 'loading') return <Screen><ScreenHeader /><LoadingState rows={2} /></Screen>;
  if (!plan) return <Screen><ScreenHeader /><EmptyState icon="shield-off-outline" title="We can't find that plan" message="It may no longer be available." actionLabel="See Plans" onAction={() => router.replace('/(tabs)/plans')} /></Screen>;

  const a = accents[plan.accent] ?? accents.olive;
  const footer = current ? (
    <>
      <Text variant="bodyS" style={{ textAlign: 'center' }}>You already have a plan. You can add family members to it.</Text>
      <Button label="View My Cover" onPress={() => router.push({ pathname: '/policy/[id]', params: { id: current.id } })} />
    </>
  ) : (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="eyebrow">FROM</Text>
        <Text variant="price" style={{ fontSize: 22 }}>{formatZAR(plan.premiumCents)}<Text variant="bodyS"> a month</Text></Text>
      </View>
      <Button label="Apply For This Plan" icon="arrow-right" onPress={() => router.push({ pathname: '/apply/[planId]', params: { planId: plan.id } })} />
    </>
  );

  return (
    <Screen footer={footer}>
      <ScreenHeader />
      <View style={[styles.hero, { backgroundColor: a.tint }]}>
        <View style={[styles.blob, { backgroundColor: a.main }]} />
        <Text variant="eyebrow" color={colors.inkSoft}>{plan.name.toUpperCase()} PLAN</Text>
        <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>{formatZAR(plan.coverCents)}</Text>
        <Text variant="body" color={colors.inkSoft}>{plan.description}</Text>
      </View>

      <Text variant="section" style={styles.h} accessibilityRole="header">The Details</Text>
      <Card noTab>
        <View style={{ gap: spacing.md }}>
          <Fact icon="calendar-month-outline" text={`${formatZAR(plan.premiumCents)} a month for you`} />
          <Fact icon="timer-sand" text={`${plan.waitingPeriodDays}-day waiting period after cover starts`} />
          <Fact icon="account-outline" text={`For people aged ${plan.minAge} to ${plan.maxAge}`} />
          <Fact icon="bank-outline" text="Paid by debit order on a date you choose" />
        </View>
      </Card>

      <Text variant="section" style={styles.h} accessibilityRole="header">Add Your Family</Text>
      <Text variant="bodyS" style={{ marginBottom: spacing.md }}>Each person has their own cover and a small monthly fee.</Text>
      <View style={{ gap: spacing.sm }}>
        {plan.memberRules.map((r) => (
          <View key={r.type} style={styles.rule}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="cardTitle">{MEMBER_LABEL[r.type]}</Text>
              <Text variant="bodyS">{formatZAR(r.coverCents)} cover · ages {r.minAge} to {r.maxAge} · up to {r.maxCount}</Text>
            </View>
            <Text variant="price">+{formatZAR(r.feeCents)}</Text>
          </View>
        ))}
      </View>

      <Text variant="bodyS" style={{ marginTop: spacing.xl }}>
        This is an application. It is reviewed before cover starts, and cover begins once your first payment is received.
      </Text>
    </Screen>
  );
}

function Fact({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      <Icon name={icon} size={22} color={colors.olive} />
      <Text variant="body" style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, overflow: 'hidden' },
  blob: { position: 'absolute', width: 190, height: 190, borderRadius: radii.pill, opacity: 0.12, right: -60, top: -70 },
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md },
});
