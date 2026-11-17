import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatZAR } from '../lib/format';
import { accents, colors, radii, spacing } from '../theme';
import type { BenefitItem } from '../types';
import { itemAccent, itemIcon } from './BundleSummary';
import { Icon } from './Icon';
import { Stepper } from './Stepper';
import { Text } from './Text';

export type Selection = Record<string, number>;

/** Pick one grocery hamper (or none), then how many sheep and cows. Shows the grocery list for the chosen hamper. */
export function BundleBuilder({ items, value, onChange }: { items: BenefitItem[]; value: Selection; onChange: (s: Selection) => void }) {
  const [listOpen, setListOpen] = useState<string | null>(null);
  const groceries = items.filter((i) => i.kind === 'grocery');
  const livestock = items.filter((i) => i.kind === 'livestock');
  const chosen = groceries.find((g) => (value[g.id] ?? 0) > 0);
  const pickGrocery = (id: string | null) => {
    const next = { ...value };
    groceries.forEach((g) => delete next[g.id]);
    if (id) next[id] = 1;
    onChange(next);
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="section">Groceries</Text>
          <Text variant="bodyS">Choose one hamper. You can see exactly what's in it.</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Pressable onPress={() => pickGrocery(null)} accessibilityRole="radio" accessibilityState={{ selected: !chosen }} style={[styles.card, !chosen && styles.cardOn]}>
            <Icon name={!chosen ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={!chosen ? colors.olive : colors.muted} />
            <Text variant="cardTitle" style={{ flex: 1 }}>No groceries</Text>
          </Pressable>
          {groceries.map((g) => {
            const on = chosen?.id === g.id;
            const a = accents.gold;
            return (
              <View key={g.id} style={[styles.card, styles.col, on && { borderColor: a.main, backgroundColor: a.tint }, !g.available && { opacity: 0.5 }]}>
                <Pressable onPress={() => g.available && pickGrocery(g.id)} disabled={!g.available} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: !g.available }}
                  accessibilityLabel={`${g.name}, adds about ${formatZAR(g.monthlyCents)} a month`} style={styles.line}>
                  <Icon name={on ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={on ? colors.olive : colors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text variant="cardTitle">{g.name.replace('Grocery Hamper ', '')} of groceries</Text>
                    <Text variant="bodyS">{g.available ? `About ${formatZAR(g.monthlyCents)} a month` : 'Temporarily unavailable'}</Text>
                  </View>
                  <Pressable onPress={() => setListOpen(listOpen === g.id ? null : g.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${listOpen === g.id ? 'Hide' : 'Show'} the ${g.name} list`}>
                    <Text variant="label" color={colors.olive} style={{ fontFamily: 'Urbanist_600SemiBold' }}>{listOpen === g.id ? 'Hide list' : 'See list'}</Text>
                  </Pressable>
                </Pressable>
                {listOpen === g.id ? (
                  <View style={styles.list}>
                    {g.contents.map((c) => (
                      <View key={c} style={{ flexDirection: 'row', gap: spacing.sm }}><Icon name="check" size={16} color={a.main} /><Text variant="body" style={{ flex: 1 }}>{c}</Text></View>
                    ))}
                    <Text variant="bodyS" style={{ marginTop: spacing.xs }}>Brands and pack sizes may vary slightly with availability.</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="section">Livestock</Text>
          <Text variant="bodyS">From our own farm. Delivered to your family when it matters.</Text>
        </View>
        {livestock.map((l) => {
          const a = accents[itemAccent(l.id, l.kind)];
          const q = value[l.id] ?? 0;
          return (
            <View key={l.id} style={[styles.card, q > 0 && { borderColor: a.main, backgroundColor: a.tint }, !l.available && q === 0 && { opacity: 0.5 }]}>
              <View style={[styles.icon, { backgroundColor: q > 0 ? colors.card : a.tint }]}><Icon name={itemIcon(l.id, l.kind)} size={26} color={a.main} /></View>
              <View style={{ flex: 1 }}>
                <Text variant="cardTitle">{l.name}</Text>
                <Text variant="bodyS">{l.available || q > 0 ? `Up to ${l.maxQty} · about ${formatZAR(l.monthlyCents)} a month each` : 'Temporarily unavailable'}</Text>
              </View>
              <Stepper value={q} min={0} max={l.available ? l.maxQty : q} label={l.name} tint={q > 0 ? colors.card : colors.fill} color={a.main}
                onChange={(n) => onChange({ ...value, [l.id]: n })} />
            </View>
          );
        })}
        <Text variant="bodyS">Preparing livestock (slaughter and dressing) is arranged separately with our team and isn't part of the bundle.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, minHeight: 60 },
  cardOn: { borderColor: colors.olive, backgroundColor: colors.oliveLight },
  col: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { gap: 6, paddingLeft: 34, paddingBottom: spacing.xs },
  icon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
