import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { DateField } from '../src/components/DateField';
import { Input } from '../src/components/Input';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { dobFromSAId } from '../src/lib/saId';
import { openWhatsApp } from '../src/lib/support';
import { useCover } from '../src/store/CoverContext';
import { useOptions } from '../src/store/OptionsContext';
import { colors, spacing } from '../src/theme';
import { RELATIONSHIP_LABEL, type Relationship } from '../src/types';

/**
 * Correct a family member's details. A name can always be fixed, and a missing ID added. Changing who someone is
 * (relationship, ID, date of birth) is open only before cover starts; afterwards we ask the customer to contact us.
 */
export default function EditMember() {
  const { policyId, memberId } = useLocalSearchParams<{ policyId: string; memberId: string }>();
  const { policies, editMember } = useCover();
  const { options } = useOptions();
  const policy = policies.find((p) => p.id === policyId);
  const member = policy?.members.find((m) => m.id === memberId);

  const [name, setName] = useState(member?.fullName ?? '');
  const [idNumber, setIdNumber] = useState('');
  const [dob, setDob] = useState('');
  const [relationship, setRelationship] = useState<Relationship | undefined>(member?.relationship);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!policy || !member || !options) return <Screen><ScreenHeader onBack={() => router.back()} /><Text variant="body">We can't find that person.</Text></Screen>;

  const started = !!policy.startDate;
  const hasId = !!member.idNumber;
  const canEditId = !started || !hasId;           // add a missing ID any time; change it only before cover starts
  const canEditIdentity = !started;

  const save = async () => {
    const patch: Record<string, string> = {};
    if (name.trim() !== member.fullName) {
      if (name.trim().length < 2) return setError('Please enter their full name.');
      patch.fullName = name.trim();
    }
    if (canEditId && idNumber) {
      const fromId = dobFromSAId(idNumber);
      if (!fromId) return setError("That ID number doesn't look right.");
      patch.idNumber = idNumber;
      if (canEditIdentity && !dob && fromId !== member.dateOfBirth) patch.dateOfBirth = fromId;
    }
    if (canEditIdentity && dob) patch.dateOfBirth = dob;
    if (canEditIdentity && relationship && relationship !== member.relationship) patch.relationship = relationship;
    if (Object.keys(patch).length === 0) return router.back();
    setBusy(true); setError(undefined);
    try { await editMember(policy.id, member.id, patch); router.back(); }
    catch (e) { setError(e instanceof Error ? e.message : "We couldn't save that. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <ScreenHeader title="Edit Details" onBack={() => router.back()} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        {started ? (
          <View style={{ backgroundColor: '#F7ECD8', borderRadius: 14, padding: spacing.md, gap: spacing.sm }}>
            <Text variant="bodyS" color={colors.inkSoft}>Your cover has started, so you can fix a name or add a missing ID here. To change {hasId ? 'their ID number, date of birth or relationship' : 'their date of birth or relationship'}, please contact us.</Text>
            <Button label="Contact Us On WhatsApp" icon="whatsapp" variant="secondary" size="small" fullWidth={false} onPress={() => openWhatsApp(`Hi TGN, I need to change details for ${member.fullName} on cover ${policy.reference}.`)} />
          </View>
        ) : null}

        {canEditIdentity ? (
          <View style={{ gap: 6 }}>
            <Text variant="label" color={colors.inkSoft}>Their relationship to you</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {options.relationships.map((r) => <Chip key={r.relationship} label={RELATIONSHIP_LABEL[r.relationship]} selected={r.relationship === relationship} onPress={() => setRelationship(r.relationship)} />)}
            </View>
          </View>
        ) : null}
        <Input label="Full Name" value={name} onChangeText={setName} autoCapitalize="words" />
        {canEditId ? (
          <Input label="ID Number" value={idNumber} onChangeText={(t) => setIdNumber(t.replace(/\D/g, '').slice(0, 13))} keyboardType="number-pad" maxLength={13}
            hint={hasId ? `Currently ${member.idNumber}. Leave blank to keep it.` : 'Their 13-digit South African ID number.'} />
        ) : (
          <View style={{ gap: 4 }}><Text variant="label" color={colors.inkSoft}>ID Number</Text><Text variant="body">{member.idNumber}</Text></View>
        )}
        {canEditIdentity ? <DateField label="Date Of Birth (leave blank to keep)" onChange={setDob} hint={`Currently ${member.dateOfBirth}.`} /> : <View style={{ gap: 4 }}><Text variant="label" color={colors.inkSoft}>Date Of Birth</Text><Text variant="body">{member.dateOfBirth}</Text></View>}

        {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label="Save Changes" onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}
