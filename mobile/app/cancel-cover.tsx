import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { Icon } from '../src/components/Icon';
import { Input } from '../src/components/Input';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { useCover } from '../src/store/CoverContext';
import { colors, spacing } from '../src/theme';

const REASONS = ['Too expensive', "I don't need it any more", "I'm switching to something else", 'Other'];

/**
 * Withdraw an application (instant) or ask to cancel cover that has started (staff confirm). We make clear what
 * cancelling means and ask for a reason, which helps us improve and gives staff context.
 */
export default function CancelCover() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>();
  const { policies, cancelCover } = useCover();
  const policy = policies.find((p) => p.id === policyId);
  const [reason, setReason] = useState<string>();
  const [note, setNote] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<'withdrawn' | 'requested'>();

  if (!policy) return <Screen><ScreenHeader onBack={() => router.back()} /><Text variant="body">We can't find that cover.</Text></Screen>;
  const started = !!policy.startDate;

  const submit = async () => {
    setBusy(true); setError(undefined);
    try {
      const p = await cancelCover(policy.id, reason, note.trim() || undefined);
      setResult(p.status === 'cancelled' ? 'withdrawn' : 'requested');
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't do that just now. Please try again.");
    } finally { setBusy(false); }
  };

  if (result) {
    return (
      <Screen>
        <ScreenHeader title={started ? 'Cancel My Cover' : 'Withdraw Application'} onBack={() => router.back()} />
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Text variant="displayM">{result === 'withdrawn' ? 'Your application is withdrawn.' : "We've got your request."}</Text>
          <Text variant="body" color={colors.muted}>
            {result === 'withdrawn'
              ? 'Nothing was charged. You can build a new cover any time.'
              : "Our team will contact you to confirm your cancellation date and anything owed to you or by you. Until then your cover stays as it is. You can change your mind from the cover screen."}
          </Text>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={started ? 'Cancel My Cover' : 'Withdraw Application'} onBack={() => router.back()} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <Text variant="body" color={colors.inkSoft}>
          {started
            ? "We're sorry to see you think about leaving. Before you go, here's what cancelling means:"
            : "Your cover hasn't started, so you can withdraw now and nothing is owed."}
        </Text>
        {started ? (
          <View style={{ gap: spacing.sm }}>
            <Point text="Your cover ends. We can't pay claims for anyone on it after the cancellation date." />
            <Point text="Our team confirms your cancellation date and any money owed or due back." />
            <Point text="If you apply again later, new waiting periods start from scratch." />
            <Point text="Thinking about the price? Reducing your bundle applies straight away and lowers it." />
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text variant="label" color={colors.inkSoft}>Why are you leaving? (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {REASONS.map((r) => <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(reason === r ? undefined : r)} />)}
          </View>
        </View>
        <Input label="Anything Else" optional multiline value={note} onChangeText={setNote} />

        <Pressable onPress={() => setSure(!sure)} accessibilityRole="checkbox" accessibilityState={{ checked: sure }} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', minHeight: 44 }}>
          <Icon name={sure ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={sure ? colors.danger : colors.muted} />
          <Text variant="body" style={{ flex: 1 }}>{started ? 'I understand what cancelling means.' : 'I want to withdraw my application.'}</Text>
        </Pressable>

        {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label={started ? 'Ask To Cancel My Cover' : 'Withdraw My Application'} variant="danger" onPress={submit} loading={busy} disabled={!sure} />
        <Button label="Keep My Cover" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

function Point({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
      <Icon name="circle-small" size={22} color={colors.muted} />
      <Text variant="body" color={colors.inkSoft} style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}
