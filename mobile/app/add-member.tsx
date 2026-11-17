import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { MemberForm } from '../src/components/MemberForm';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { useCover } from '../src/store/CoverContext';
import { usePlans } from '../src/store/PlansContext';
import { colors, spacing } from '../src/theme';

export default function AddMember() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>();
  const { policies, addMember } = useCover();
  const { plans } = usePlans();
  const policy = policies.find((p) => p.id === policyId);
  const plan = plans.find((p) => p.id === policy?.planId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!policy || !plan) return <Screen><ScreenHeader onBack={() => router.back()} /><Text variant="body">We can't find that plan.</Text></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Add Family Member" onBack={() => router.back()} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <Text variant="body" color={colors.muted}>
          They'll be added to your {plan.name} plan. Your monthly total goes up by their fee, and {policy.status === 'active' ? `a ${plan.waitingPeriodDays}-day waiting period applies to them from today` : 'their waiting period starts when your cover starts'}.
        </Text>
        <MemberForm
          plan={plan}
          busy={busy}
          existing={policy.members}
          submitLabel="Add To My Plan"
          onAdd={async (m) => {
            setBusy(true);
            setError(undefined);
            try {
              await addMember(policy.id, m);
              router.back();
            } catch (e) {
              setError(e instanceof Error ? e.message : "We couldn't add them just now. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        />
        {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
      </View>
    </Screen>
  );
}
