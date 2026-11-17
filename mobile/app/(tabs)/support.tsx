import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../src/components/Card';
import { Icon, type IconName } from '../../src/components/Icon';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { EditorialHeading, Text } from '../../src/components/Text';
import { FAQS, SUPPORT_HOURS, callSupport, openWhatsApp } from '../../src/lib/support';
import { accents, colors, radii, spacing, type AccentName } from '../../src/theme';

function Action({ icon, title, sub, accent, onPress }: { icon: IconName; title: string; sub: string; accent: AccentName; onPress: () => void }) {
  const a = accents[accent];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}>
      <View style={[styles.actionIcon, { backgroundColor: a.tint }]}><Icon name={icon} size={24} color={a.main} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="cardTitle">{title}</Text>
        <Text variant="bodyS">{sub}</Text>
      </View>
      <Icon name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

export default function Support() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Screen>
      <EditorialHeading lead="We're right here, " accent="Neighbour" trail="." variant="displayM" style={{ marginTop: spacing.lg }} />
      <Text variant="body" color={colors.muted} style={{ marginTop: spacing.sm }}>{SUPPORT_HOURS}</Text>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Action icon="whatsapp" title="Chat On WhatsApp" sub="The quickest way to reach a real person" accent="olive" onPress={() => openWhatsApp('Hi TGN, I need a hand with something.')} />
        <Action icon="phone-outline" title="Call Us" sub="Prefer to talk it through?" accent="ember" onPress={callSupport} />
        <Action icon="clipboard-text-search-outline" title="Ask About My Plan" sub="Questions about cover, family or payments" accent="gold" onPress={() => router.push({ pathname: '/support/request', params: { kind: 'policy_enquiry' } })} />
        <Action icon="alert-circle-outline" title="Report A Problem" sub="Tell us what went wrong and we'll make it right" accent="berry" onPress={() => router.push({ pathname: '/support/request', params: { kind: 'problem' } })} />
      </View>

      <SectionHeader title="Common Questions" />
      <View style={{ gap: spacing.sm }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <Card key={f.q} noTab padded={false}>
              <Pressable onPress={() => setOpen(isOpen ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={styles.faq}>
                <Text variant="cardTitle" style={{ flex: 1, fontSize: 15 }}>{f.q}</Text>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
              </Pressable>
              {isOpen ? <Text variant="body" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>{f.a}</Text> : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 72 },
  actionIcon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  faq: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 56 },
});
