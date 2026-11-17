import { View } from 'react-native';
import { colors, spacing } from '../theme';
import { Text } from './Text';

/** Renders legal text where lines starting "## " are headings and blank lines separate paragraphs. */
export function LegalText({ body }: { body: string }) {
  const blocks = body.trim().split(/\n{2,}/);
  return (
    <View style={{ gap: spacing.md }}>
      {blocks.map((b, i) => {
        const t = b.trim();
        if (t.startsWith('## ')) {
          const [head, ...rest] = t.split('\n');
          return (
            <View key={i} style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              <Text variant="section" accessibilityRole="header">{head.replace(/^##\s+/, '')}</Text>
              {rest.length ? <Text variant="body">{rest.join('\n')}</Text> : null}
            </View>
          );
        }
        return <Text key={i} variant="body" color={colors.inkSoft}>{t}</Text>;
      })}
    </View>
  );
}
