import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { LogoMark } from './Logo';
import { ScreenHeader } from './Screen';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <ScreenHeader />
        </View>
        <LogoMark size={44} />
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
