import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatZAR } from '../lib/format';
import { accents, colors, radii, spacing, type AccentName } from '../theme';
import type { BundleLine } from '../types';
import { Icon } from './Icon';
import { Text } from './Text';

export const itemAccent = (itemId: string, kind: string): AccentName => (itemId === 'cattle' ? 'berry' : kind === 'livestock' ? 'ember' : 'gold');
export const itemIcon = (itemId: string, kind: string) => (itemId === 'cattle' ? 'cow' : kind === 'livestock' ? 'sheep' : 'basket-outline');

/** What the family receives: each item with its value, and the grocery list on tap. */
export function BundleSummary({ lines, totalValueCents, showValues = true }: { lines: BundleLine[]; totalValueCents?: number; showValues?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={{ gap: spacing.sm }}>
      {lines.map((l) => {
        const a = accents[itemAccent(l.itemId, l.kind)];
        const expandable = l.contents.length > 0;
        const isOpen = open === l.itemId;
        return (
          <View key={l.itemId} style={styles.row}>
            <Pressable onPress={() => expandable && setOpen(isOpen ? null : l.itemId)} disabled={!expandable} accessibilityRole={expandable ? 'button' : 'text'}
              accessibilityState={expandable ? { expanded: isOpen } : undefined} accessibilityLabel={`${l.quantity > 1 ? `${l.quantity} ` : ''}${l.name}${expandable ? ', show the grocery list' : ''}`}
              style={styles.head}>
              <View style={[styles.icon, { backgroundColor: a.tint }]}><Icon name={itemIcon(l.itemId, l.kind)} size={22} color={a.main} /></View>
              <View style={{ flex: 1 }}>
                <Text variant="cardTitle">{l.quantity > 1 ? `${l.quantity} × ` : ''}{l.name}</Text>
                {expandable ? <Text variant="bodyS" color={colors.olive}>{isOpen ? 'Hide the list' : `See the list (${l.contents.length} items)`}</Text> : null}
              </View>
              {showValues ? <Text variant="price">{formatZAR(l.valueCents)}</Text> : null}
              {expandable ? <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} /> : null}
            </Pressable>
            {isOpen ? (
              <View style={styles.list}>
                {l.contents.map((c) => (
                  <View key={c} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                    <Icon name="check" size={16} color={a.main} />
                    <Text variant="body" style={{ flex: 1 }}>{c}</Text>
                  </View>
                ))}
                <Text variant="bodyS" style={{ marginTop: spacing.xs }}>Brands and pack sizes may vary slightly with availability.</Text>
              </View>
            ) : null}
          </View>
        );
      })}
      {showValues && totalValueCents != null ? (
        <View style={[styles.head, { paddingHorizontal: spacing.xs }]}>
          <Text variant="cardTitle" style={{ flex: 1 }}>Worth</Text>
          <Text variant="price" style={{ fontSize: 20 }}>{formatZAR(totalValueCents)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  icon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xs, gap: 6 },
});
