import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { itemIcon } from '../../src/components/BundleSummary';
import { Button } from '../../src/components/Button';
import { Icon, type IconName } from '../../src/components/Icon';
import { LogoMark } from '../../src/components/Logo';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { EditorialHeading, Text } from '../../src/components/Text';
import { formatDate, formatZAR, greeting } from '../../src/lib/format';
import { POLICY_STATUS_LABEL } from '../../src/lib/status';
import { useCover } from '../../src/store/CoverContext';
import { useOptions } from '../../src/store/OptionsContext';
import { accents, colors, radii, spacing, type AccentName } from '../../src/theme';

const STEPS: { icon: IconName; accent: AccentName; title: string; text: string }[] = [
  { icon: 'tune-variant', accent: 'ember', title: 'Build your cover', text: 'Groceries, sheep, a cow: choose what your family receives.' },
  { icon: 'account-multiple-plus-outline', accent: 'berry', title: 'Add your family', text: 'Spouse, children, parents and more, for a small monthly fee each.' },
  { icon: 'calendar-month-outline', accent: 'gold', title: 'Pay monthly', text: 'By debit order, on a date that suits you.' },
  { icon: 'hand-heart-outline', accent: 'olive', title: "We're here when it matters", text: 'Claim any time, with a real person to help.' },
];

export default function Home() {
  const { options } = useOptions();
  const { current } = useCover();
  const groceryFrom = options ? Math.min(...options.items.filter((i) => i.kind === 'grocery').map((i) => i.valueCents)) : null;

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.brand} accessible accessibilityLabel="TGN">
          <LogoMark size={36} />
          <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>TGN</Text>
        </View>
      </View>

      <EditorialHeading lead={`${greeting()}, `} accent="Neighbour" trail="." variant="displayM" style={{ marginTop: spacing.sm }} />

      {current ? (
        <Pressable onPress={() => router.push({ pathname: '/policy/[id]', params: { id: current.id } })} accessibilityRole="button" accessibilityLabel={`Your cover, ${POLICY_STATUS_LABEL[current.status]}`} style={[styles.panel, { backgroundColor: accents.gold.tint }]}>
          <View style={[styles.blob, { backgroundColor: colors.gold, right: -40, top: -50 }]} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" color={colors.inkSoft}>YOUR COVER</Text>
              <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>{formatZAR(current.bundle.bundleValueCents)} bundle</Text>
            </View>
            <View style={styles.pill}><Text variant="label" color={colors.ink} style={{ fontFamily: 'Urbanist_600SemiBold' }}>{POLICY_STATUS_LABEL[current.status]}</Text></View>
          </View>
          <View style={styles.row}>
            <Stat label="Monthly" value={formatZAR(current.monthlyTotalCents)} />
            <Stat label="Family" value={String(current.members.length)} />
            <Stat label="Next debit" value={current.nextDebitDate ? formatDate(current.nextDebitDate) : '–'} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="label" color={colors.ink} style={{ fontFamily: 'Urbanist_600SemiBold' }}>View your cover</Text>
            <Icon name="arrow-right" size={16} color={colors.ink} />
          </View>
        </Pressable>
      ) : (
        <View style={[styles.panel, { backgroundColor: accents.ember.tint }]}>
          <View style={[styles.blob, { backgroundColor: colors.ember, right: -50, top: -60, width: 200, height: 200, opacity: 0.22 }]} />
          <View style={[styles.blob, { backgroundColor: colors.berry, right: 60, bottom: -50, width: 110, height: 110, opacity: 0.18 }]} />
          <View style={[styles.blob, { backgroundColor: colors.gold, left: -30, bottom: 70, width: 70, height: 70, opacity: 0.35 }]} />
          <Text variant="displayM" style={{ fontSize: 27, lineHeight: 31 }}>Whatever brings everyone together, we've got you.</Text>
          <Text variant="body" color={colors.inkSoft}>Funeral cover you build yourself: groceries, sheep, a cow, delivered to your family when it matters. Paid monthly.</Text>
          <Button label="Build Your Cover" icon="arrow-right" onPress={() => router.push('/builder')} style={{ marginTop: spacing.xs }} />
        </View>
      )}

      <SectionHeader title="What You Can Include" />
      <View style={styles.tiles}>
        <Tile accent="gold" icon="basket-outline" title="Groceries" sub={groceryFrom ? `Hampers from ${formatZAR(groceryFrom)}` : 'Hampers'} dark />
        <Tile accent="ember" icon={itemIcon('sheep', 'livestock')} title="Sheep" sub="One, two or three" />
        <Tile accent="berry" icon={itemIcon('cattle', 'livestock')} title="A cow" sub="From our own farm" />
        <Tile accent="olive" icon="account-multiple-outline" title="Your family" sub="Add the people who matter" />
      </View>

      <SectionHeader title="How It Works" />
      <View style={{ gap: spacing.md }}>
        {STEPS.map((s, i) => {
          const a = accents[s.accent];
          return (
            <View key={s.title} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: a.main }]}><Icon name={s.icon} size={22} color={s.accent === 'gold' ? colors.ink : colors.white} /></View>
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

function Tile({ accent, icon, title, sub, dark }: { accent: AccentName; icon: IconName; title: string; sub: string; dark?: boolean }) {
  const a = accents[accent];
  return (
    <View style={[styles.tile, { backgroundColor: a.main }]} accessible accessibilityLabel={`${title}. ${sub}`}>
      <Icon name={icon} size={30} color={dark ? colors.ink : colors.white} />
      <View>
        <Text variant="cardTitle" color={dark ? colors.ink : colors.white}>{title}</Text>
        <Text variant="bodyS" color={dark ? colors.inkSoft : 'rgba(255,255,255,0.85)'}>{sub}</Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="eyebrow" color={colors.inkSoft}>{label.toUpperCase()}</Text>
      <Text variant="price">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panel: { marginTop: spacing.xl, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.lg, overflow: 'hidden' },
  blob: { position: 'absolute', width: 170, height: 170, borderRadius: radii.pill, opacity: 0.25 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: { backgroundColor: colors.card, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: '48%', flexGrow: 1, minHeight: 124, borderRadius: radii.lg, padding: spacing.lg, justifyContent: 'space-between' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepIcon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
