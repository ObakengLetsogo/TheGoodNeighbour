import { useState } from 'react';
import { View } from 'react-native';
import { formatZAR } from '../lib/format';
import { memberProblem, ruleFor } from '../lib/plans';
import { dobFromSAId } from '../lib/saId';
import { spacing, colors } from '../theme';
import { MEMBER_LABEL, type MemberInput, type MemberType, type Plan } from '../types';
import { Button } from './Button';
import { Chip } from './Chip';
import { DateField } from './DateField';
import { Input } from './Input';
import { Text } from './Text';

/**
 * Collects one family member and checks them against the plan's rules, showing the monthly fee for
 * the chosen relationship. `existing` are people already on the application/plan.
 */
export function MemberForm({
  plan, existing, onAdd, busy, submitLabel = 'Add To Plan', onCancel,
}: {
  plan: Plan; existing: Pick<MemberInput, 'type'>[]; onAdd: (m: MemberInput) => void | Promise<void>; busy?: boolean; submitLabel?: string; onCancel?: () => void;
}) {
  const types = plan.memberRules.map((r) => r.type);
  const [type, setType] = useState<MemberType>(types[0]);
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dob, setDob] = useState('');
  const [errors, setErrors] = useState<{ name?: string; id?: string; dob?: string }>({});
  const [formKey, setFormKey] = useState(0);
  const rule = ruleFor(plan, type);

  const submit = async () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Please enter their full name.';
    if (!dob) next.dob = 'Please enter a valid date of birth.';
    const id = idNumber.trim();
    if (id) {
      const fromId = dobFromSAId(id);
      if (!fromId) next.id = "That ID number doesn't look right.";
      else if (dob && fromId !== dob) next.id = "This ID number doesn't match the date of birth.";
    }
    if (!next.dob && dob) next.dob = memberProblem(plan, type, dob, existing) ?? undefined;
    setErrors(next);
    if (next.name || next.id || next.dob) return;
    await onAdd({ type, fullName: name.trim(), idNumber: id || undefined, dateOfBirth: dob });
    setName(''); setIdNumber(''); setDob(''); setErrors({}); setFormKey((k) => k + 1);
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: 6 }}>
        <Text variant="label" color={colors.inkSoft}>Relationship</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {types.map((t) => <Chip key={t} label={MEMBER_LABEL[t]} selected={t === type} onPress={() => setType(t)} />)}
        </View>
        {rule ? (
          <Text variant="bodyS">
            {formatZAR(rule.feeCents)} a month · {formatZAR(rule.coverCents)} cover · ages {rule.minAge} to {rule.maxAge} · up to {rule.maxCount}
          </Text>
        ) : null}
      </View>
      <Input label="Full Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
      <DateField key={formKey} label="Date Of Birth" onChange={setDob} error={errors.dob} />
      <Input label="ID Number" optional value={idNumber} onChangeText={(t) => setIdNumber(t.replace(/\D/g, '').slice(0, 13))} keyboardType="number-pad" maxLength={13} error={errors.id} hint="Children can be added without one." />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {onCancel ? <Button label="Cancel" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={onCancel} /> : null}
        <Button label={submitLabel} icon="plus" onPress={submit} loading={busy} fullWidth={!onCancel} style={onCancel ? { flex: 1 } : undefined} />
      </View>
    </View>
  );
}
