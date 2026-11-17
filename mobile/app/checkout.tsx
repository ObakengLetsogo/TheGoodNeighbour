import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { Icon } from '../src/components/Icon';
import { Input } from '../src/components/Input';
import { ScreenHeader } from '../src/components/Screen';
import { TotalsBlock } from '../src/components/Summary';
import { Text } from '../src/components/Text';
import { DELIVERY_WINDOWS, upcomingDates } from '../src/lib/dates';
import { formatZAR, normaliseSAPhone } from '../src/lib/format';
import { priceBasket } from '../src/lib/pricing';
import { paymentProvider, type PaymentMethodId } from '../src/services';
import { useAuth } from '../src/store/AuthContext';
import { useBasket } from '../src/store/BasketContext';
import { useCatalog } from '../src/store/CatalogContext';
import { useOrders } from '../src/store/OrdersContext';
import { colors, components, radii, spacing } from '../src/theme';
import type { DeliveryWindowId } from '../src/types';

type Errors = Partial<Record<'name' | 'phone' | 'address' | 'suburb' | 'city' | 'province' | 'postal' | 'date' | 'window' | 'form', string>>;

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { basket, clear } = useBasket();
  const { catalog } = useCatalog();
  const { place } = useOrders();
  const dates = useMemo(() => upcomingDates(14), []);

  const [forSelf, setForSelf] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [city, setCity] = useState('');
  const [provinceCode, setProvinceCode] = useState<string>();
  const [postal, setPostal] = useState('');
  const [date, setDate] = useState<string>();
  const [win, setWin] = useState<DeliveryWindowId>();
  const [instructions, setInstructions] = useState('');
  const [method, setMethod] = useState<PaymentMethodId>('card');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const zone = catalog.deliveryZones.find((z) => z.provinceCode === provinceCode);
  const priced = priceBasket(basket, zone?.feeCents ?? null);
  const methods = paymentProvider.availableMethods();

  const toggleSelf = (v: boolean) => {
    setForSelf(v);
    if (v && user) { setName(user.fullName); setPhone(user.phone); }
    else { setName(''); setPhone(''); }
  };

  const submit = async () => {
    const e164 = normaliseSAPhone(phone);
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Please enter the recipient's name.";
    if (!e164) next.phone = 'Please enter a valid South African mobile number.';
    if (address.trim().length < 3) next.address = 'Please enter the street address.';
    if (suburb.trim().length < 2) next.suburb = 'Please enter the suburb, village or area.';
    if (city.trim().length < 2) next.city = 'Please enter the town or city.';
    if (!zone) next.province = 'Please choose the province.';
    if (!/^\d{4}$/.test(postal)) next.postal = 'Postal codes have 4 digits.';
    if (!date) next.date = 'Please choose a delivery date.';
    if (!win) next.window = 'Please choose a delivery window.';
    setErrors(next);
    if (Object.keys(next).length || !e164 || !zone || !date || !win || !user) return;

    setBusy(true);
    try {
      const order = await place({
        basket,
        placedBy: { name: user.fullName, phone: user.phone },
        delivery: {
          recipientName: name.trim(), recipientPhone: e164, addressLine: address.trim(), suburb: suburb.trim(), city: city.trim(),
          provinceCode: zone.provinceCode, province: zone.province, postalCode: postal, date, window: win,
          instructions: instructions.trim() || undefined,
        },
      });
      clear();
      // The payment boundary: with no provider configured this resolves to "not_configured" and the
      // order simply stays awaiting payment. We never mark anything as paid on the client.
      try {
        const result = await paymentProvider.startPayment(order, method);
        if (result.state === 'redirect') Linking.openURL(result.url).catch(() => {});
      } catch {
        /* the order is saved; payment can be retried from the order screen */
      }
      router.replace({ pathname: '/order/[id]', params: { id: order.id, placed: '1' } });
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "We couldn't place your order. Nothing was charged. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  if (basket.lines.length === 0 && !busy) {
    return (
      <View style={styles.root}>
        <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.lg }}><ScreenHeader title="Delivery" /></View>
        <View style={{ padding: spacing.xl, gap: spacing.lg }}>
          <Text variant="body">Your basket is empty.</Text>
          <Button label="Browse Packages" onPress={() => router.dismissTo('/(tabs)')} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Arrange Delivery" />
        <Text variant="body" color={colors.muted}>Delivering for family somewhere else? Just enter their details. You can send it anywhere in South Africa.</Text>

        <Section title="Who Is It For?">
          <Pressable onPress={() => toggleSelf(!forSelf)} accessibilityRole="checkbox" accessibilityState={{ checked: forSelf }} style={styles.self}>
            <Icon name={forSelf ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={forSelf ? colors.olive : colors.muted} />
            <Text variant="body">I'm the one receiving it</Text>
          </Pressable>
          <Input label="Recipient Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
          <Input label="Recipient Mobile Number" prefix="+27" value={phone.startsWith('+27') ? phone.slice(3) : phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="82 123 4567" error={errors.phone} hint="We'll use this to coordinate the delivery." />
        </Section>

        <Section title="Where Is It Going?">
          <Input label="Street Address" value={address} onChangeText={setAddress} autoCapitalize="words" error={errors.address} />
          <Input label="Suburb, Village Or Area" value={suburb} onChangeText={setSuburb} autoCapitalize="words" error={errors.suburb} />
          <Input label="Town Or City" value={city} onChangeText={setCity} autoCapitalize="words" error={errors.city} />
          <View style={{ gap: 6 }}>
            <Text variant="label" color={colors.inkSoft}>Province</Text>
            <View style={styles.wrap}>
              {catalog.deliveryZones.map((z) => <Chip key={z.provinceCode} label={z.province} selected={z.provinceCode === provinceCode} onPress={() => setProvinceCode(z.provinceCode)} />)}
            </View>
            {errors.province ? <Text variant="bodyS" color={colors.danger}>{errors.province}</Text> : null}
          </View>
          <Input label="Postal Code" value={postal} onChangeText={(t) => setPostal(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} error={errors.postal} />
        </Section>

        <Section title="When?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }} style={{ marginHorizontal: -spacing.lg }} contentInset={{ left: spacing.lg, right: spacing.lg }}>
            <View style={{ width: spacing.lg - spacing.sm }} />
            {dates.map((d) => {
              const sel = d.iso === date;
              return (
                <Pressable key={d.iso} onPress={() => setDate(d.iso)} accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityLabel={`${d.weekday} ${d.day} ${d.month}`} style={[styles.date, sel && styles.dateSel]}>
                  <Text variant="eyebrow" color={sel ? colors.white : colors.muted}>{d.weekday.toUpperCase()}</Text>
                  <Text variant="section" color={sel ? colors.white : colors.ink}>{d.day}</Text>
                  <Text variant="bodyS" color={sel ? colors.white : colors.muted}>{d.month}</Text>
                </Pressable>
              );
            })}
            <View style={{ width: spacing.lg }} />
          </ScrollView>
          {errors.date ? <Text variant="bodyS" color={colors.danger}>{errors.date}</Text> : null}
          <View style={{ gap: spacing.sm }}>
            {DELIVERY_WINDOWS.map((w) => (
              <Pressable key={w.id} onPress={() => setWin(w.id)} accessibilityRole="radio" accessibilityState={{ selected: win === w.id }} style={[styles.opt, win === w.id && styles.optSel]}>
                <Icon name={win === w.id ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={win === w.id ? colors.olive : colors.muted} />
                <Text variant="cardTitle" style={{ flex: 1 }}>{w.label}</Text>
                <Text variant="label">{w.hours}</Text>
              </Pressable>
            ))}
            {errors.window ? <Text variant="bodyS" color={colors.danger}>{errors.window}</Text> : null}
          </View>
          <Text variant="bodyS">Your date and window are a preference. We confirm what's possible with you once your order is received.</Text>
          <Input label="Special Delivery Instructions" optional multiline value={instructions} onChangeText={setInstructions} placeholder="Gate codes, landmarks, who to call on arrival..." />
        </Section>

        <Section title="Payment">
          {methods.map((m) => (
            <Pressable key={m.id} onPress={() => setMethod(m.id)} accessibilityRole="radio" accessibilityState={{ selected: method === m.id }} style={[styles.opt, method === m.id && styles.optSel]}>
              <Icon name={method === m.id ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={method === m.id ? colors.olive : colors.muted} />
              <View style={{ flex: 1 }}>
                <Text variant="cardTitle">{m.label}</Text>
                <Text variant="bodyS">{m.description}</Text>
              </View>
            </Pressable>
          ))}
          {!paymentProvider.isConfigured ? (
            <View style={styles.notice} accessible accessibilityRole="alert">
              <Icon name="information-outline" size={20} color={colors.warning} />
              <Text variant="bodyS" color={colors.inkSoft} style={{ flex: 1 }}>
                Online payment isn't switched on yet. Placing your order saves it as received and unpaid. Nothing is charged, and we'll let you know how to pay.
              </Text>
            </View>
          ) : null}
        </Section>

        <Card noTab>
          <Text variant="section" style={{ marginBottom: spacing.md }}>Order Summary</Text>
          <TotalsBlock totals={priced.totals} deliveryLabel={zone ? `Delivery to ${zone.province}` : 'Delivery'} />
        </Card>

        {errors.form ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</Text> : null}
        <Button label="Place Order" icon="check" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
        <Text variant="bodyS" style={{ textAlign: 'center' }}>
          {priced.totals.totalCents != null ? `Order total ${formatZAR(priced.totals.totalCents)}. ` : ''}Final availability and delivery are confirmed by our team.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
      <Text variant="section" accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  self: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: components.minTouch },
  date: { width: 64, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', gap: 2 },
  dateSel: { backgroundColor: colors.olive, borderColor: colors.olive },
  opt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, minHeight: components.minTouch },
  optSel: { borderColor: colors.olive, backgroundColor: colors.oliveLight },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: '#F7ECD8', borderRadius: radii.md, padding: spacing.md },
});
