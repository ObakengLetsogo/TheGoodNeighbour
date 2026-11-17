import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { feeFor, memberProblem, ruleFor } from '../lib/cover';
import { formatZAR } from '../lib/format';
import { ageOn, dobFromSAId } from '../lib/saId';
import { colors, spacing } from '../theme';
import { RELATIONSHIP_LABEL, type CoverOptions, type MemberInput, type Relationship } from '../types';
import { Button } from './Button';
import { Chip } from './Chip';
import { DateField } from './DateField';
import { Input } from './Input';
import { Text } from './Text';

/**
 * Collects one family member: their relationship to the main member, full name and ID number.
 * The date of birth is read from a valid ID number; people without an ID (young children) enter it instead.
 */
export function MemberForm({ options, baseMonthlyCents, existing, onAdd, busy, submitLabel = 'Add To My Cover', onCancel }: {
  options: CoverOptions; baseMonthlyCents: number; existing: Pick<MemberInput, 'relationship'>[];
  onAdd: (m: MemberInput) => void | Promise<void>; busy?: boolean; submitLabel?: string; onCancel?: () => void;
}) {
  const rels = options.relationships.map((r) => r.relationship);
  const [relationship, setRelationship] = useState<Relationship>(rels[0]);
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [manualDob, setManualDob] = useState('');
  const [errors, setErrors] = useState<{ name?: string; id?: string; dob?: string }>({});
  const [formKey, setFormKey] = useState(0);
  const rule = ruleFor(options, relationship);

  const idDob = useMemo(() => dobFromSAId(idNumber), [idNumber]);
  const dob = idDob ?? manualDob;
  const age = dob ? ageOn(dob) : null;
  const needsId = age === null || age >= 16;

  const submit = async () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Please enter their full name.';
    if (idNumber && !idDob) next.id = idNumber.length < 13 ? 'ID numbers have 13 digits.' : "That ID number doesn't look right.";
    if (!idNumber && !manualDob) next.dob = 'Please enter their ID number, or their date of birth if they have no ID.';
    if (!next.id && dob && needsId && !idNumber) next.id = 'Please add their ID number.';
    if (!next.dob && !next.id && dob) next.dob = memberProblem(options, relationship, dob, existing) ?? undefined;
    setErrors(next);
    if (next.name || next.id || next.dob) return;
    await onAdd({ relationship, fullName: name.trim(), idNumber: idNumber || undefined, dateOfBirth: dob });
    setName(''); setIdNumber(''); setManualDob(''); setErrors({}); setFormKey((k) => k + 1);
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: 6 }}>
        <Text variant="label" color={colors.inkSoft}>Their relationship to you</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {rels.map((r) => <Chip key={r} label={RELATIONSHIP_LABEL[r]} selected={r === relationship} onPress={() => setRelationship(r)} />)}
        </View>
        {rule ? (
          <Text variant="bodyS">
            +{formatZAR(feeFor(baseMonthlyCents, rule.multiplierBps))} a month · ages {rule.minAge} to {rule.maxAge} · up to {rule.maxCount}
          </Text>
        ) : null}
      </View>
      <Input label="Full Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
      <Input label="ID Number" value={idNumber} onChangeText={(t) => setIdNumber(t.replace(/\D/g, '').slice(0, 13))} keyboardType="number-pad" maxLength={13} error={errors.id}
        hint={idDob ? `Born ${idDob}, age ${ageOn(idDob)}` : 'Their 13-digit South African ID number. Children under 16 can skip it.'} />
      {!idDob ? <DateField key={formKey} label="Date Of Birth (if no ID number)" onChange={setManualDob} error={errors.dob} /> : errors.dob ? <Text variant="bodyS" color={colors.danger}>{errors.dob}</Text> : null}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {onCancel ? <Button label="Cancel" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={onCancel} /> : null}
        <Button label={submitLabel} icon="plus" onPress={submit} loading={busy} fullWidth={!onCancel} style={onCancel ? { flex: 1 } : undefined} />
      </View>
    </View>
  );
}
