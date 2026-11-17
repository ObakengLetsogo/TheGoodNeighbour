import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icon';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { formatZAR, pluralise } from '../../src/lib/format';
import { CLAIM_STATUS_LABEL, POLICY_STATUS_LABEL } from '../../src/lib/status';
import { useCover } from '../../src/store/CoverContext';
import { colors, radii, spacing } from '../../src/theme';

export default function Cover() {
  const { status, policies, claims, error, refresh } = useCover();
  return (
    <Screen>
      <Text variant="displayM" style={{ marginTop: spacing.lg }} accessibilityRole="header">My Cover</Text>
      {status === 'loading' ? <View style={{ marginTop: spacing.xl }}><LoadingState rows={2} label="Loading your cover" /></View> : null}
      {status === 'error' ? <ErrorState message={error} onRetry={refresh} /> : null}
      {status === 'ready' && policies.length === 0 ? (
        <EmptyState icon="shield-outline" title="No plan yet" message="When you apply for a plan, you'll follow it here: your family, your payments and any claims." actionLabel="View Plans" onAction={() => router.push('/(tabs)/plans')} />
      ) : null}
      {status === 'ready' && policies.length > 0 ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          {policies.map((p) => (
            <Card key={p.id} accent="olive" tabLabel={p.reference} onPress={() => router.push({ pathname: '/policy/[id]', params: { id: p.id } })} accessibilityLabel={`${p.planName} plan, ${POLICY_STATUS_LABEL[p.status]}`}>
              <View style={styles.row}>
                <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
                  <Text variant="cardTitle">{p.planName}</Text>
                  <Text variant="bodyS">{pluralise(p.members.length + 1, 'person', 'people')} covered · {formatZAR(p.coverCents)} cover</Text>
                  <Badge label={POLICY_STATUS_LABEL[p.status]} color={colors.olive} bg={colors.oliveLight} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="price">{formatZAR(p.monthlyTotalCents)}</Text>
                  <Text variant="bodyS">a month</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
      {claims.length > 0 ? (
        <>
          <SectionHeader title="Claims" />
          <View style={{ gap: spacing.sm }}>
            {claims.map((c) => (
              <Pressable key={c.id} onPress={() => router.push({ pathname: '/claim/[id]', params: { id: c.id } })} style={styles.claim} accessibilityRole="button" accessibilityLabel={`Claim ${c.reference}, ${CLAIM_STATUS_LABEL[c.status]}`}>
                <View style={{ flex: 1 }}>
                  <Text variant="cardTitle">{c.deceasedName}</Text>
                  <Text variant="bodyS">{c.reference} · {CLAIM_STATUS_LABEL[c.status]}</Text>
                </View>
                <Icon name="chevron-right" size={22} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  claim: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
});
