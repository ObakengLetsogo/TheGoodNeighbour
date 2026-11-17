import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { BundleSummary } from '../../src/components/BundleSummary';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { ordinal } from '../../src/lib/cover';
import { displayPhone, formatDate, formatDateLong, formatZAR, pluralise } from '../../src/lib/format';
import { POLICY_STATUS_LABEL } from '../../src/lib/status';
import { useAuth } from '../../src/store/AuthContext';
import { useCover } from '../../src/store/CoverContext';
import { colors, spacing } from '../../src/theme';
import { RELATIONSHIP_LABEL, type Policy } from '../../src/types';

/** A summary of the customer's cover that they can keep or share. */
export default function Schedule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { policies } = useCover();
  const p = policies.find((x) => x.id === id);
  if (!p) return <Screen><ScreenHeader /><EmptyState icon="file-document-outline" title="We can't find that cover" message="It may not be on this account." actionLabel="My Cover" onAction={() => router.replace('/(tabs)/cover')} /></Screen>;

  const share = async () => {
    try { await Share.share({ title: `TGN cover ${p.reference}`, message: scheduleText(p) }); }
    catch { Alert.alert("Couldn't share", 'Sharing isn\'t available here. You can screenshot this page instead.'); }
  };

  return (
    <Screen>
      <ScreenHeader title="Policy Schedule" />
      <Text variant="bodyS" style={{ marginTop: spacing.xs }}>A summary of your cover. It isn't the full terms.</Text>

      <Card accent="ember" tabLabel={p.reference} style={{ marginTop: spacing.xl }}>
        <Rows rows={[
          ['Status', POLICY_STATUS_LABEL[p.status]],
          ['Main member', p.holder.name],
          ['ID number', p.holder.idNumber ?? '–'],
          ['Mobile', user ? displayPhone(user.phone) : '–'],
          ['Applied', formatDate(p.createdAt)],
          ['Cover started', p.startDate ? formatDateLong(p.startDate) : 'Not yet started'],
          ['Waiting period ends', p.waitingEndsOn ? formatDateLong(p.waitingEndsOn) : '–'],
        ]} />
      </Card>

      <Text variant="section" style={styles.h}>What Your Family Receives</Text>
      <Card accent="gold" tabLabel={`Bundle version ${p.bundle.version}`}>
        <BundleSummary lines={p.bundle.lines} totalValueCents={p.bundle.bundleValueCents} />
      </Card>

      <Text variant="section" style={styles.h}>Who Is Covered</Text>
      <Card accent="berry" tabLabel={pluralise(p.members.length + 1, 'person', 'people')}>
        <View style={{ gap: spacing.md }}>
          <Person name={p.holder.name} sub="Main member" />
          {p.members.map((m) => <Person key={m.id} name={m.fullName} sub={`${RELATIONSHIP_LABEL[m.relationship]} · ID ${m.idNumber ?? 'none'} · born ${formatDate(m.dateOfBirth)}${m.coverStartsOn ? ` · covered from ${formatDate(m.coverStartsOn)}` : ''}`} />)}
        </View>
      </Card>

      <Text variant="section" style={styles.h}>Your Price</Text>
      <Card accent="olive" tabLabel="Monthly">
        <Rows rows={[
          ['You', formatZAR(p.baseMonthlyCents)],
          ...p.members.map((m) => [`${m.fullName} (${RELATIONSHIP_LABEL[m.relationship]})`, formatZAR(m.feeCents)] as [string, string]),
          ['Every month', formatZAR(p.monthlyTotalCents)],
          ['Debit date', `The ${ordinal(p.debitDay)} of each month`],
        ]} />
      </Card>

      {p.consentAt ? (
        <Text variant="bodyS" style={{ marginTop: spacing.lg }}>
          You accepted the Terms Of Use (version {p.termsVersion}) and Privacy Notice (version {p.privacyVersion}) on {formatDateLong(p.consentAt)}.
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <Button label="Share Or Save" icon="share-variant-outline" onPress={share} />
        <Button label="Read The Terms Of Use" variant="secondary" onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'terms' } })} />
      </View>
    </Screen>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {rows.map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="body" color={colors.muted} style={{ flex: 1 }}>{k}</Text>
          <Text variant="cardTitle" style={{ flexShrink: 1, textAlign: 'right' }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Person({ name, sub }: { name: string; sub: string }) {
  return (
    <View>
      <Text variant="cardTitle">{name}</Text>
      <Text variant="bodyS">{sub}</Text>
    </View>
  );
}

function scheduleText(p: Policy): string {
  const lines = [
    `TGN - The Good Neighbour`, `Policy schedule ${p.reference}`, `Status: ${POLICY_STATUS_LABEL[p.status]}`, '',
    `Main member: ${p.holder.name}`, p.startDate ? `Cover started: ${formatDateLong(p.startDate)}` : 'Cover has not started yet', '',
    `What your family receives (worth ${formatZAR(p.bundle.bundleValueCents)}):`,
    ...p.bundle.lines.flatMap((l) => [`- ${l.quantity > 1 ? `${l.quantity} x ` : ''}${l.name}`, ...l.contents.map((c) => `    ${c}`)]), '',
    'Covered:', `- ${p.holder.name} (main member)`, ...p.members.map((m) => `- ${m.fullName} (${RELATIONSHIP_LABEL[m.relationship]})`), '',
    `Monthly price: ${formatZAR(p.monthlyTotalCents)}, debit order on the ${ordinal(p.debitDay)}`, '',
    'This is a summary and not the full terms.',
  ];
  return lines.join('\n');
}

const styles = StyleSheet.create({ h: { marginTop: spacing.xl, marginBottom: spacing.md } });
