import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Badge, Chip } from '../src/components/Chip';
import { Icon } from '../src/components/Icon';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { EmptyState } from '../src/components/States';
import { Text } from '../src/components/Text';
import { formatDate, formatZAR } from '../src/lib/format';
import { confirmAction } from '../src/lib/confirm';
import { POLICY_STATUS_LABEL } from '../src/lib/status';
import { useFamily } from '../src/store/FamilyContext';
import { useOptions } from '../src/store/OptionsContext';
import { colors, spacing } from '../src/theme';
import { RELATIONSHIP_LABEL, type SharedPolicy } from '../src/types';

const CHOICES = [10, 20, 25, 30, 40, 50, 60, 75, 90];

/** Plans you pay a share of, and invitations to join one. */
export default function Shared() {
  const { invitations, shared, loaded, accept, decline } = useFamily();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(undefined);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); } finally { setBusy(undefined); }
  };

  return (
    <Screen>
      <ScreenHeader title="Shared Plans" />
      {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite" style={{ marginTop: spacing.md }}>{error}</Text> : null}

      {invitations.needsVerification ? (
        <View style={styles.notice}>
          <Icon name="cellphone-message" size={24} color={colors.ink} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text variant="cardTitle">Someone has invited you</Text>
            <Text variant="bodyS" color={colors.inkSoft}>Verify your mobile number to see the invitation. It makes sure invitations reach the right person.</Text>
            <Button label="Verify My Number" size="small" fullWidth={false} onPress={() => router.push('/verify-phone')} />
          </View>
        </View>
      ) : null}

      {invitations.items.length > 0 ? <Text variant="section" style={styles.h}>Invitations</Text> : null}
      <View style={{ gap: spacing.lg }}>
        {invitations.items.map((i) => (
          <Card key={i.id} accent="gold" tabLabel="Invitation">
            <View style={{ gap: spacing.sm }}>
              <Text variant="cardTitle">{i.ownerName} asked you to share the cost</Text>
              <Text variant="body">Your share: <Text variant="body" style={{ fontFamily: 'Urbanist_700Bold' }}>{i.shareBps / 100}% · about {formatZAR(i.shareCents)} a month</Text> of {formatZAR(i.monthlyTotalCents)}.</Text>
              <Text variant="bodyS">Covers {i.peopleCovered} {i.peopleCovered === 1 ? 'person' : 'people'}: {i.bundleSummary}.</Text>
              <Text variant="bodyS">You'll see who has paid each month. You can change your share or leave whenever you like.</Text>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
                <Button label="Accept" fullWidth={false} style={{ flex: 1 }} loading={busy === i.id} onPress={() => run(i.id, () => accept(i.id))} />
                <Button label="Not Now" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={() => run(i.id, () => decline(i.id))} />
              </View>
            </View>
          </Card>
        ))}
      </View>

      {shared.length > 0 ? <Text variant="section" style={styles.h}>Plans You Share</Text> : null}
      <View style={{ gap: spacing.xl }}>{shared.map((p) => <SharedCard key={p.contributorId} plan={p} run={run} busy={busy} />)}</View>

      {loaded && shared.length === 0 && invitations.items.length === 0 && !invitations.needsVerification ? (
        <EmptyState icon="account-group-outline" title="Nothing shared yet" message="When a brother, sister or parent invites you to share the cost of a family plan, it will show up here." />
      ) : null}
    </Screen>
  );
}

function SharedCard({ plan, run, busy }: { plan: SharedPolicy; run: (key: string, fn: () => Promise<void>) => Promise<void>; busy?: string }) {
  const { updateShare, leave } = useFamily();
  const { options } = useOptions();
  const [editing, setEditing] = useState(false);
  const owing = Math.max(0, plan.myShareCents - plan.myPaidThisMonthCents);
  const currentPct = plan.myShareBps / 100;
  const others = plan.contributors.filter((c) => c.status === 'active').reduce((n, c) => n + c.shareBps / 100, 0) - currentPct;
  const room = 95 - others;
  const minPct = options && options.minContributionCents > 0 && plan.monthlyTotalCents > 0 ? Math.max(5, Math.ceil((options.minContributionCents * 100) / plan.monthlyTotalCents)) : 5;

  return (
    <Card accent="berry" tabLabel={plan.reference}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Text variant="cardTitle" style={{ flex: 1 }}>{plan.ownerName}'s plan</Text>
          <Badge label={POLICY_STATUS_LABEL[plan.status]} />
        </View>

        <View style={styles.box}>
          <Text variant="eyebrow">YOUR SHARE</Text>
          <Text variant="displayM" style={{ fontSize: 26, lineHeight: 30 }}>{currentPct}% · {formatZAR(plan.myShareCents)}</Text>
          <Text variant="bodyS">{plan.myPaidThisMonthCents >= plan.myShareCents ? `Paid this month: ${formatZAR(plan.myPaidThisMonthCents)}` : `Still to pay this month: ${formatZAR(owing)}`}{plan.nextDebitDate ? ` · next debit ${formatDate(plan.nextDebitDate)}` : ''}</Text>
        </View>

        <Text variant="label" color={colors.inkSoft}>Who pays what ({formatZAR(plan.monthlyTotalCents)} a month)</Text>
        <View style={{ gap: spacing.xs }}>
          <Line name={`${plan.ownerName} (owner)`} pct={plan.ownerShareBps / 100} paid={plan.ownerPaidThisMonthCents} cents={plan.ownerShareCents} />
          {plan.contributors.filter((c) => c.status === 'active').map((c) => <Line key={c.id} name={c.name} pct={c.shareBps / 100} paid={c.paidThisMonthCents} cents={c.shareCents} />)}
        </View>

        <Text variant="label" color={colors.inkSoft}>Who is covered</Text>
        <View style={{ gap: 2 }}>
          {plan.members.map((m, i) => <Text key={i} variant="body">{m.fullName} <Text variant="bodyS">· {m.relationship === 'main' ? 'Main member' : RELATIONSHIP_LABEL[m.relationship]} · age {m.age}</Text></Text>)}
          <Text variant="bodyS" style={{ marginTop: spacing.xs }}>{plan.bundleLines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name)).join(', ')}</Text>
        </View>

        {editing ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.inkSoft}>Change your share</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {CHOICES.map((c) => <Chip key={c} label={`${c}%`} selected={c === currentPct} disabled={c > room || c < minPct} onPress={() => run(plan.contributorId, async () => { await updateShare(plan.contributorId, c); setEditing(false); })} />)}
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label={editing ? 'Done' : 'Change My Share'} variant="secondary" size="small" fullWidth={false} style={{ flex: 1 }} onPress={() => setEditing(!editing)} />
          <Button label="Leave Plan" variant="danger" size="small" fullWidth={false} loading={busy === `leave-${plan.contributorId}`} style={{ flex: 1 }}
            onPress={() => confirmAction('Leave This Plan?', `${plan.ownerName} will be told, and your share goes back to them.`, 'Leave', () => run(`leave-${plan.contributorId}`, () => leave(plan.contributorId)))} />
        </View>
      </View>
    </Card>
  );
}

function Line({ name, pct, paid, cents }: { name: string; pct: number; paid: number; cents: number }) {
  const done = paid >= cents && cents > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Icon name={done ? 'check-circle' : 'circle-outline'} size={20} color={done ? colors.success : colors.muted} />
      <Text variant="body" style={{ flex: 1 }}>{name}</Text>
      <Text variant="bodyS">{pct}% · {formatZAR(cents)}{done ? ' · paid' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  notice: { flexDirection: 'row', gap: spacing.md, backgroundColor: '#F8EAC2', borderRadius: 14, padding: spacing.lg, marginTop: spacing.lg },
  box: { backgroundColor: colors.oliveLight, borderRadius: 14, padding: spacing.md, gap: 2 },
});
