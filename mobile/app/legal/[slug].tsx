import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Badge } from '../../src/components/Chip';
import { LegalText } from '../../src/components/LegalText';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { ErrorState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { formatDate } from '../../src/lib/format';
import { legalService } from '../../src/services/api';
import { colors, radii, spacing } from '../../src/theme';
import type { LegalDoc } from '../../src/types';

export default function LegalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [doc, setDoc] = useState<LegalDoc>();
  const [error, setError] = useState<string>();
  const load = () => { setError(undefined); legalService.get(slug).then(setDoc).catch((e: Error) => setError(e.message)); };
  useEffect(load, [slug]);

  return (
    <Screen>
      <ScreenHeader title={doc?.title ?? 'Document'} onBack={() => router.back()} />
      {error ? <ErrorState message={error} onRetry={load} /> : !doc ? <LoadingState rows={3} /> : (
        <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Badge label={`Version ${doc.version}`} />
            <Badge label={`Updated ${formatDate(doc.updatedAt)}`} />
            {doc.draft ? <Badge label="Draft" color={colors.warning} bg="#F7ECD8" /> : null}
          </View>
          {doc.draft ? (
            <View style={{ backgroundColor: '#F7ECD8', borderRadius: radii.md, padding: spacing.md }}>
              <Text variant="bodyS" color={colors.inkSoft}>This is a draft and is still being finalised. It isn't the final wording.</Text>
            </View>
          ) : null}
          <LegalText body={doc.body} />
        </View>
      )}
    </Screen>
  );
}
