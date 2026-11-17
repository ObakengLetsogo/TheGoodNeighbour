import { View } from 'react-native';
import { PlanCard } from '../../src/components/PlanCard';
import { Screen } from '../../src/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/States';
import { EditorialHeading, Text } from '../../src/components/Text';
import { usePlans } from '../../src/store/PlansContext';
import { colors, spacing } from '../../src/theme';

export default function Plans() {
  const { status, plans, reload, error } = usePlans();
  return (
    <Screen>
      <EditorialHeading lead="Cover that fits your " accent="family" trail="." variant="displayM" style={{ marginTop: spacing.lg }} />
      <Text variant="body" color={colors.muted} style={{ marginTop: spacing.sm }}>Choose a plan, then add the people who matter for a small monthly fee each.</Text>
      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {status === 'loading' ? <LoadingState rows={2} label="Loading plans" /> : null}
        {status === 'error' ? <ErrorState message={error} onRetry={reload} /> : null}
        {status === 'ready' && plans.length === 0 ? <EmptyState icon="shield-outline" title="No plans available yet" message="We're getting our plans ready. Please check back soon." /> : null}
        {status === 'ready' ? plans.map((p) => <PlanCard key={p.id} plan={p} />) : null}
      </View>
    </Screen>
  );
}
