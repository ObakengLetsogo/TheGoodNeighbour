import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icon';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { BundleSummary } from '../../src/components/BundleSummary';
import { Timeline } from '../../src/components/Timeline';
import { displayPhone, formatDateLong } from '../../src/lib/format';
import { CLAIM_STATUS_LABEL, CLAIM_STEPS, claimStep } from '../../src/lib/status';
import { callSupport, openWhatsApp } from '../../src/lib/support';
import { useCover } from '../../src/store/CoverContext';
import { colors, radii, spacing } from '../../src/theme';

export default function ClaimDetails() {
  const { id, submitted } = useLocalSearchParams<{ id: string; submitted?: string }>();
  const { claims } = useCover();
  const claim = claims.find((c) => c.id === id);
  const close = () => (submitted ? router.replace('/(tabs)/cover') : router.back());

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

      <Text variant="section" style={styles.h}>What We're Delivering</Text>
      <Card accent="ember" tabLabel="Your bundle">
        <BundleSummary lines={claim.bundle.lines} showValues={false} />
      </Card>

      <Text variant="section" style={styles.h}>Delivery</Text>
      <Card accent="berry" tabLabel="To">
        <View style={{ gap: spacing.xs }}>
          <Text variant="cardTitle">{claim.delivery.recipientName}</Text>
          <Text variant="body">{displayPhone(claim.delivery.recipientPhone)}</Text>
          <Text variant="body">{claim.delivery.addressLine}, {claim.delivery.suburb}</Text>
          <Text variant="body">{claim.delivery.city}, {claim.delivery.province} {claim.delivery.postalCode}</Text>
          <Text variant="bodyS" style={{ marginTop: spacing.xs }}>We'll call to confirm the date and arrangements.</Text>
        </View>
      </Card>

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
