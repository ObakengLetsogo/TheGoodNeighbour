import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BundleSummary, itemAccent, itemIcon } from '../../src/components/BundleSummary';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { HowPriceWorks } from '../../src/components/HowPriceWorks';
import { Icon } from '../../src/components/Icon';
import { Screen } from '../../src/components/Screen';
import { ErrorState, LoadingState } from '../../src/components/States';
import { EditorialHeading, Text } from '../../src/components/Text';
import { months } from '../../src/lib/cover';
import { formatZAR } from '../../src/lib/format';
import { useCover } from '../../src/store/CoverContext';
import { useOptions } from '../../src/store/OptionsContext';
import { accents, colors, radii, spacing } from '../../src/theme';

export default function BuildTab() {
  const { status, options, error, reload } = useOptions();
  const { current } = useCover();
  return (
    <Screen>
      <EditorialHeading lead="Cover that's yours, " accent="built your way" trail="." variant="displayM" style={{ marginTop: spacing.lg }} />
      <Text variant="body" color={colors.muted} style={{ marginTop: spacing.sm }}>
        Choose what your family receives: groceries, sheep, a cow. Your monthly price follows what you choose.
      </Text>

      {status === 'loading' ? <View style={{ marginTop: spacing.xl }}><LoadingState rows={2} /></View> : null}
      {status === 'error' ? <ErrorState message={error} onRetry={reload} /> : null}

      {options ? (
        <>
          {current ? (
            <Card accent="ember" tabLabel="Your bundle" style={{ marginTop: spacing.xl }}>
              <View style={{ gap: spacing.md }}>
                <BundleSummary lines={current.bundle.lines} totalValueCents={current.bundle.bundleValueCents} />
                <Button label="Change My Bundle" icon="tune-variant" onPress={() => router.push({ pathname: '/builder', params: { policyId: current.id } })} />
              </View>
            </Card>
          ) : (
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              {options.items.filter((i) => i.id !== 'grocery-2500' && i.id !== 'grocery-7500' && i.id !== 'grocery-10000').map((i) => {
                const a = accents[itemAccent(i.id, i.kind)];
                const grocery = i.kind === 'grocery';
                return (
                  <View key={i.id} style={[styles.tile, { backgroundColor: a.tint }]}>
                    <View style={[styles.tileIcon, { backgroundColor: a.main }]}><Icon name={itemIcon(i.id, i.kind)} size={30} color={i.id === 'cattle' || !grocery ? colors.white : colors.ink} /></View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="cardTitle">{grocery ? 'Groceries' : i.name}</Text>
                      <Text variant="bodyS" color={colors.inkSoft}>
                        {grocery ? `Hampers from ${formatZAR(Math.min(...options.items.filter((x) => x.kind === 'grocery').map((x) => x.valueCents)))}, with the full list shown` : `${i.description}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <Button label="Start Building" icon="arrow-right" onPress={() => router.push('/builder')} style={{ marginTop: spacing.sm }} />
            </View>
          )}

          <Text variant="section" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>How your price is worked out</Text>
          <Card accent="gold" tabLabel="Price rules">
            <HowPriceWorks options={options} />
          </Card>

          <Text variant="section" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>How it works</Text>
          <View style={{ gap: spacing.md }}>
            <Fact accent="gold" icon="calendar-month-outline" title="Pay monthly" text="A small monthly price, by debit order." />
            <Fact accent="berry" icon="account-multiple-plus-outline" title="Add your family" text="Spouse, children, parents, siblings and more. Each pays a small fee, set by their relationship to you." />
            <Fact accent="ember" icon="timer-sand" title="Waiting periods" text={`Natural causes: ${months(options.naturalWaitingDays)}. ${options.accidentalWaitingDays === 0 ? 'Accidents: no waiting period.' : `Accidents: ${months(options.accidentalWaitingDays)}.`}`} />
            <Fact accent="olive" icon="swap-vertical" title="Change it any time" text={`Reduce your bundle straight away. If you increase it, the extra pays out after ${months(options.upgradeWaitingDays)}.`} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Fact({ accent, icon, title, text }: { accent: 'gold' | 'berry' | 'ember' | 'olive'; icon: string; title: string; text: string }) {
  const a = accents[accent];
  return (
    <View style={styles.fact}>
      <View style={[styles.factIcon, { backgroundColor: a.tint }]}><Icon name={icon} size={22} color={a.main} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="cardTitle">{title}</Text>
        <Text variant="bodyS">{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderRadius: radii.lg, padding: spacing.lg },
  tileIcon: { width: 60, height: 60, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  fact: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  factIcon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
