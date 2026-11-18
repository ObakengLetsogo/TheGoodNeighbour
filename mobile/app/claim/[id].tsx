import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Choice } from '../../src/components/Choice';
import { Icon } from '../../src/components/Icon';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { BundleSummary } from '../../src/components/BundleSummary';
import { Timeline } from '../../src/components/Timeline';
import { displayPhone, formatDateLong, formatZAR } from '../../src/lib/format';
import { CLAIM_STATUS_LABEL, CLAIM_STEPS, claimStep } from '../../src/lib/status';
import { callSupport, openWhatsApp } from '../../src/lib/support';
import { confirmAction } from '../../src/lib/confirm';
import { claimService } from '../../src/services/api';
import { useCover } from '../../src/store/CoverContext';
import { DOCUMENT_LABEL, type ClaimDocumentType } from '../../src/types';
import { colors, radii, spacing } from '../../src/theme';

const WINDOW_LABEL = { morning: 'In the morning', afternoon: 'In the afternoon', day: 'Some time during the day' } as const;

export default function ClaimDetails() {
  const { id, submitted } = useLocalSearchParams<{ id: string; submitted?: string }>();
  const { claims, refresh, chooseBenefit } = useCover();
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const claim = claims.find((c) => c.id === id);
  const close = () => (submitted ? router.replace('/(tabs)/cover') : router.back());

  const pick = async (type: ClaimDocumentType) => {
    if (!claim) return;
    setUploadError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if (a.size && a.size > 5 * 1024 * 1024) { setUploadError('That file is too big. Please use one under 5 MB.'); return; }
    setBusy(type);
    try {
      const file = { uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', blob: Platform.OS === 'web' ? (a.file as Blob | undefined) : undefined };
      await claimService.uploadDocument(claim.id, type, file);
      await refresh();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'We could not upload that file.');
    } finally {
      setBusy(null);
    }
  };
  const remove = async (docId: string, name: string) => {
    if (!claim) return;
    confirmAction('Remove This File?', name, 'Remove', async () => {
      try { await claimService.removeDocument(claim.id, docId); await refresh(); } catch (e) { setUploadError(e instanceof Error ? e.message : 'We could not remove that file.'); }
    });
  };
  const open = claim ? claim.status === 'submitted' || claim.status === 'under_review' : false;
  const cash = claim?.benefitChoice === 'cash';
  const canChoose = claim ? ['submitted', 'under_review', 'approved'].includes(claim.status) : false;
  const choose = async (choice: 'bundle' | 'cash') => {
    if (!claim || claim.benefitChoice === choice) return;
    setUploadError(null);
    try { await chooseBenefit(claim.id, choice); } catch (e) { setUploadError(e instanceof Error ? e.message : 'We could not save that. Please try again.'); }
  };

  if (!claim) return <Screen><ScreenHeader onBack={close} /><EmptyState icon="file-search-outline" title="We can't find that claim" message="It may not be on this account." actionLabel="My Cover" onAction={() => router.replace('/(tabs)/cover')} /></Screen>;

  return (
    <Screen>
      <ScreenHeader title={claim.reference} onBack={close} />
      {submitted ? (
        <View style={styles.thanks} accessibilityRole="alert">
          <Icon name="hand-heart-outline" size={28} color={colors.olive} />
          <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>We've received your claim.</Text>
          <Text variant="body" color={colors.inkSoft}>Our team will call you on {displayPhone(claim.claimantPhone)}. Please take care of yourself and your family.</Text>
        </View>
      ) : null}
      <View style={{ marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Badge label={CLAIM_STATUS_LABEL[claim.status]} color={claim.status === 'declined' ? colors.danger : colors.olive} bg={colors.oliveLight} />
        <Badge label={claim.policyReference} />
      </View>

      <Text variant="section" style={styles.h}>Progress</Text>
      <Card noTab>
        {claim.status === 'declined' ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="cardTitle">We couldn't approve this claim</Text>
            {claim.staffNote ? <Text variant="body">{claim.staffNote}</Text> : null}
            <Text variant="bodyS">If you'd like to talk it through, please contact us.</Text>
          </View>
        ) : (
          <Timeline steps={CLAIM_STEPS} current={claimStep(claim.status)} allDone={claim.status === 'delivered'} />
        )}
      </Card>

      <Text variant="section" style={styles.h}>Details</Text>
      <Card noTab>
        <View style={{ gap: spacing.xs }}>
          <Text variant="cardTitle">{claim.deceasedName}</Text>
          <Text variant="body">Passed away on {formatDateLong(claim.dateOfDeath)} · {claim.causeOfDeath === 'accidental' ? 'accident' : 'natural causes'}</Text>
          <Text variant="bodyS">Claimed by {claim.claimantName}</Text>
          {claim.withinWaitingPeriod ? <Text variant="bodyS" color={colors.warning}>{claim.causeOfDeath === 'accidental' ? 'This happened before your cover started, so our team will review it carefully.' : 'This falls within the waiting period, so our team will review it carefully.'}</Text> : null}
        </View>
      </Card>

      <Text variant="section" style={styles.h}>Documents</Text>
      <Card accent="gold" tabLabel="Needed">
        <View style={{ gap: spacing.md }}>
          {(['death_certificate', ...(claim.missingDocuments.includes('deceased_id') || claim.documents.some((d) => d.type === 'deceased_id') ? ['deceased_id'] : []), 'other'] as ClaimDocumentType[]).map((type) => {
            const docs = claim.documents.filter((d) => d.type === type);
            const needed = claim.missingDocuments.includes(type);
            return (
              <View key={type} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon name={needed ? 'alert-circle-outline' : type === 'other' ? 'paperclip' : 'check-circle-outline'} size={20} color={needed ? colors.warning : colors.success} />
                  <Text variant="cardTitle" style={{ flex: 1 }}>{DOCUMENT_LABEL[type]}</Text>
                  {open && (type === 'other' || needed) ? <Button label="Add" icon="upload" size="small" variant="secondary" fullWidth={false} loading={busy === type} onPress={() => pick(type)} /> : null}
                </View>
                {docs.map((d) => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: 28 }}>
                    <Text variant="bodyS" style={{ flex: 1 }} numberOfLines={1}>{d.fileName} · {Math.max(1, Math.round(d.sizeBytes / 1024))} KB</Text>
                    {open ? <Button label="Remove" size="small" variant="ghost" fullWidth={false} onPress={() => remove(d.id, d.fileName)} /> : null}
                  </View>
                ))}
              </View>
            );
          })}
          <Text variant="bodyS">PDF, JPG or PNG, up to 5 MB each. A clear photo is fine. We keep your files private and encrypted.</Text>
          {claim.missingDocuments.includes('death_certificate') ? <Text variant="bodyS" color={colors.warning}>We can't approve the claim until we have the death certificate.</Text> : null}
          {uploadError ? <Text variant="bodyS" color={colors.danger} accessibilityRole="alert">{uploadError}</Text> : null}
        </View>
      </Card>

      {canChoose ? (
        <>
          <Text variant="section" style={styles.h}>How Would You Like To Receive It?</Text>
          <View style={{ gap: spacing.sm }}>
            <Choice selected={!cash} title="The bundle" text="We deliver the groceries and livestock to your family, on a day we agree with you." onPress={() => choose('bundle')} />
            <Choice selected={cash} title={`Cash instead: ${formatZAR(claim.cashAlternativeCents)}`} text="We pay you this amount instead. You can change your mind until the claim is settled." onPress={() => choose('cash')} />
            <Text variant="bodyS">If you choose cash, we'll call you to arrange the payment safely. We never ask for your banking details in the app.</Text>
          </View>
        </>
      ) : null}

      {cash ? (
        <>
          <Text variant="section" style={styles.h}>Your Cash Payment</Text>
          <Card accent="gold" tabLabel="Cash">
            <View style={{ gap: spacing.xs }}>
              <Text variant="displayM" style={{ fontSize: 26, lineHeight: 30 }}>{formatZAR(claim.cashAlternativeCents)}</Text>
              <Text variant="bodyS">Instead of the bundle: {claim.bundle.lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.name}` : l.name)).join(', ')}.</Text>
            </View>
          </Card>
        </>
      ) : (
        <>
          <Text variant="section" style={styles.h}>What We're Delivering</Text>
          <Card accent="ember" tabLabel="Your bundle">
            <BundleSummary lines={claim.bundle.lines} showValues={false} />
          </Card>
        </>
      )}

      {claim.status === 'approved' || claim.status === 'delivered' ? (
        <>
          <Text variant="section" style={styles.h}>{claim.status === 'delivered' ? (cash ? 'Paid' : 'Delivered') : cash ? 'Your Payment' : 'When To Expect Us'}</Text>
          <Card accent="olive" tabLabel={claim.status === 'delivered' ? 'Done' : cash ? 'Cash' : 'Delivery date'}>
            {claim.status === 'delivered' ? (
              <View style={{ gap: spacing.xs }}>
                <Text variant="cardTitle">{cash ? 'Your payment was made' : 'Your bundle was delivered'}</Text>
                {claim.deliveredAt ? <Text variant="body">{formatDateLong(claim.deliveredAt)}</Text> : null}
                <Text variant="bodyS">We're thinking of you and your family.</Text>
              </View>
            ) : cash ? (
              <Text variant="body">Your claim is approved. We'll call you to arrange your payment.</Text>
            ) : claim.deliveryDate ? (
              <View style={{ gap: spacing.xs }}>
                <Text variant="cardTitle">{formatDateLong(claim.deliveryDate)}</Text>
                <Text variant="body">{WINDOW_LABEL[claim.deliveryWindow ?? 'day']}</Text>
                {claim.deliveryNote ? <Text variant="bodyS" style={{ marginTop: spacing.xs }}>{claim.deliveryNote}</Text> : null}
                <Text variant="bodyS" style={{ marginTop: spacing.xs }}>We'll call {claim.delivery.recipientName} before we arrive. If the date doesn't suit, please tell us.</Text>
              </View>
            ) : (
              <Text variant="body">Your claim is approved. We'll call to agree a delivery date with you.</Text>
            )}
          </Card>
        </>
      ) : null}

      {cash ? null : <Text variant="section" style={styles.h}>Delivery</Text>}
      {cash ? null : <Card accent="berry" tabLabel="To">
        <View style={{ gap: spacing.xs }}>
          <Text variant="cardTitle">{claim.delivery.recipientName}</Text>
          <Text variant="body">{displayPhone(claim.delivery.recipientPhone)}</Text>
          <Text variant="body">{claim.delivery.addressLine}, {claim.delivery.suburb}</Text>
          <Text variant="body">{claim.delivery.city}, {claim.delivery.province} {claim.delivery.postalCode}</Text>
          <Text variant="bodyS" style={{ marginTop: spacing.xs }}>We'll call to confirm the date and arrangements.</Text>
        </View>
      </Card>}

      <View style={{ marginTop: spacing.xl, flexDirection: 'row', gap: spacing.md }}>
        <Button label="WhatsApp" icon="whatsapp" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={() => openWhatsApp(`Hi TGN, about claim ${claim.reference}.`)} />
        <Button label="Call Us" icon="phone-outline" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={callSupport} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  thanks: { backgroundColor: colors.oliveLight, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, marginTop: spacing.sm },
});
