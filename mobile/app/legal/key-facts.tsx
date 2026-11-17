import { View } from 'react-native';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icon';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { ErrorState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { months, monthsAdj } from '../../src/lib/cover';
import { formatZAR } from '../../src/lib/format';
import { useOptions } from '../../src/store/OptionsContext';
import { colors, spacing } from '../../src/theme';
import { RELATIONSHIP_LABEL } from '../../src/types';

/** A plain-language summary generated from the live cover rules, so it can't drift from what the system actually does. */
export default function KeyFacts() {
  const { status, options, error, reload } = useOptions();
  return (
    <Screen>
      <ScreenHeader title="Key Facts" />
      {status === 'loading' ? <LoadingState rows={3} /> : status === 'error' || !options ? <ErrorState message={error} onRetry={reload} /> : (
        <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
          <Text variant="body" color={colors.muted}>A short summary of how your cover works. It is not the full terms. Please read those too.</Text>
          <Card accent="ember" tabLabel="Your cover">
            <Facts rows={[
              ['The cover', 'When someone on your cover passes away, we deliver the bundle you chose to your family.'],
              ['Smallest cover', `Worth at least ${formatZAR(options.minBundleValueCents)}.`],
              ['Preparing livestock', 'Slaughter and dressing is not included. It is arranged separately.'],
            ]} />
          </Card>
          <Card accent="gold" tabLabel="When it starts">
            <Facts rows={[
              ['Starting', 'Your application is reviewed first. Cover starts once it is approved and your first payment is received.'],
              ['Natural causes', `A ${monthsAdj(options.naturalWaitingDays)} waiting period.`],
              ['Accidents', options.accidentalWaitingDays === 0 ? 'No waiting period once cover has started.' : `A ${monthsAdj(options.accidentalWaitingDays)} waiting period.`],
              ['People added later', `Each has their own ${months(options.naturalWaitingDays)} waiting period for natural causes.`],
            ]} />
          </Card>
          <Card accent="berry" tabLabel="Your family">
            <Facts rows={[
              ['Who', `Up to ${options.maxMembers} family members. You join between ${options.mainMinAge} and ${options.mainMaxAge}.`],
              ...options.relationships.map((r) => [RELATIONSHIP_LABEL[r.relationship], `Up to ${r.maxCount}. Join aged ${r.minAge} to ${r.maxAge}. Cover ends at ${r.coverEndAge}.`] as [string, string]),
            ]} />
          </Card>
          <Card accent="olive" tabLabel="Paying and changing">
            <Facts rows={[
              ['Paying', 'Monthly by debit order. Your bank asks you to approve it first.'],
              ['Missed payments', `Cover lapses after ${options.lapseAfterMissedPayments} missed ${options.lapseAfterMissedPayments === 1 ? 'payment' : 'payments'}. It can be reinstated within ${months(options.reinstateWithinDays)} without a new waiting period.`],
              ['Reducing your bundle', 'Applies straight away.'],
              ['Increasing your bundle', `The increase pays out after a new ${monthsAdj(options.upgradeWaitingDays)} waiting period. Until then your earlier bundle applies.`],
              ['Price changes', `Reviewed once a year and capped at ${options.escalationCapPercent}%, with notice.`],
            ]} />
          </Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Icon name="information-outline" size={18} color={colors.muted} />
            <Text variant="bodyS" style={{ flex: 1 }}>These are the current rules and can change with notice. Your cover screen always shows the dates that apply to you.</Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map(([k, v]) => (
        <View key={k} style={{ gap: 2 }}>
          <Text variant="cardTitle">{k}</Text>
          <Text variant="body" color={colors.inkSoft}>{v}</Text>
        </View>
      ))}
    </View>
  );
}
