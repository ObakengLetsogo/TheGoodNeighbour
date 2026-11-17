import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Icon, type IconName } from '../../src/components/Icon';
import { LogoMark } from '../../src/components/Logo';
import { PlanCard } from '../../src/components/PlanCard';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { ErrorState, LoadingState } from '../../src/components/States';
import { EditorialHeading, Text } from '../../src/components/Text';
import { formatDate, formatZAR, greeting } from '../../src/lib/format';
import { POLICY_STATUS_LABEL } from '../../src/lib/status';
import { useCover } from '../../src/store/CoverContext';
import { usePlans } from '../../src/store/PlansContext';
import { accents, colors, radii, spacing, type AccentName } from '../../src/theme';

const STEPS: { icon: IconName; accent: AccentName; title: string; text: string }[] = [
  { icon: 'shield-check-outline', accent: 'olive', title: 'Choose a plan', text: 'Pick the cover that suits you.' },
  { icon: 'account-multiple-plus-outline', accent: 'ember', title: 'Add your family', text: 'Spouse, children, parents and more, for a small monthly fee each.' },
  { icon: 'calendar-month-outline', accent: 'gold', title: 'Pay monthly', text: 'By debit order, on a date that suits you.' },
  { icon: 'hand-heart-outline', accent: 'berry', title: "We're here when it matters", text: 'Claim any time, with a real person to help.' },
];

export default function Home() {
  const { width } = useWindowDimensions();
  const { status, plans, reload, error } = usePlans();
  const { current } = useCover();
  const gutter = spacing.lg;
  const cardW = Math.min(310, width - gutter * 2 - 28);
  const from = plans.length ? Math.min(...plans.map((p) => p.premiumCents)) : null;

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.brand} accessible accessibilityLabel="TGN">
          <LogoMark size={34} />
          <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>TGN</Text>
        </View>
      </View>

      <EditorialHeading lead={`${greeting()}, `} accent="Neighbour" trail="." variant="displayM" style={{ marginTop: spacing.sm }} />

      {current ? (
        <Pressable onPress={() => router.push({ pathname: '/policy/[id]', params: { id: current.id } })} accessibilityRole="button" accessibilityLabel={`Your ${current.planName} plan, ${POLICY_STATUS_LABEL[current.status]}`} style={styles.cover}>
          <View style={styles.coverTop}>
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow">YOUR PLAN</Text>
              <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>{current.planName}</Text>
            </View>
            <View style={styles.pill}><Text variant="label" color={colors.olive} style={{ fontFamily: 'Urbanist_600SemiBold' }}>{POLICY_STATUS_LABEL[current.status]}</Text></View>
          </View>
          <View style={styles.stats}>
            <Stat label="Monthly" value={formatZAR(current.monthlyTotalCents)} />
            <Stat label="Family" value={String(current.members.length)} />
            <Stat label="Next debit" value={current.nextDebitDate ? formatDate(current.nextDebitDate) : '–'} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="label" color={colors.olive} style={{ fontFamily: 'Urbanist_600SemiBold' }}>View your cover</Text>
            <Icon name="arrow-right" size={16} color={colors.olive} />
          </View>
        </Pressable>
      ) : (
        <View style={styles.hero}>
          <View style={styles.blob} />
          <Text variant="displayM" style={{ fontSize: 26, lineHeight: 30 }}>Whatever brings everyone together, we've got you.</Text>
          <Text variant="body" color={colors.inkSoft}>
            Funeral cover for you and the people who matter{from ? `, from ${formatZAR(from)} a month` : ''}. Add your family, pay monthly, and know someone is here when it matters.
          </Text>
          <Button label="View Plans" icon="arrow-right" onPress={() => router.push('/(tabs)/plans')} style={{ marginTop: spacing.xs }} />
        </View>
      )}

      <SectionHeader title="Our Plans" actionLabel="See All" onAction={() => router.push('/(tabs)/plans')} />
      {status === 'loading' ? <LoadingState rows={1} label="Loading plans" /> : null}
      {status === 'error' ? <ErrorState message={error} onRetry={reload} /> : null}
      {status === 'ready' ? (
        <FlatList
          horizontal data={plans} keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md, paddingRight: gutter, paddingBottom: spacing.sm }}
          style={{ marginHorizontal: -gutter, paddingLeft: gutter }}
          snapToInterval={cardW + spacing.md} decelerationRate="fast"
          renderItem={({ item }) => <PlanCard plan={item} width={cardW} />}
        />
      ) : null}

      <SectionHeader title="How It Works" />
      <View style={{ gap: spacing.md }}>
        {STEPS.map((s, i) => {
          const a = accents[s.accent];
          return (
            <View key={s.title} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: a.tint }]}><Icon name={s.icon} size={22} color={a.main} /></View>
              <View style={{ flex: 1 }}>
                <Text variant="cardTitle">{i + 1}. {s.title}</Text>
                <Text variant="bodyS">{s.text}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text variant="bodyS" style={{ marginTop: spacing.xl, textAlign: 'center' }}>
        Applications are reviewed before cover starts, and cover begins once your first payment is received.
      </Text>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="eyebrow">{label.toUpperCase()}</Text>
      <Text variant="price">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hero: { marginTop: spacing.xl, backgroundColor: colors.oliveLight, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md, overflow: 'hidden' },
  blob: { position: 'absolute', width: 180, height: 180, borderRadius: radii.pill, opacity: 0.08, right: -60, top: -70, backgroundColor: colors.olive },
  cover: { marginTop: spacing.xl, backgroundColor: colors.oliveLight, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.lg },
  coverTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: { backgroundColor: colors.card, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  stats: { flexDirection: 'row', gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepIcon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
