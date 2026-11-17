import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, components, fonts } from '../../src/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const TABS: { name: string; title: string; icon: IconName; active: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', active: 'home' },
  { name: 'explore', title: 'Explore', icon: 'compass-outline', active: 'compass' },
  { name: 'orders', title: 'Orders', icon: 'clipboard-text-outline', active: 'clipboard-text' },
  { name: 'support', title: 'Support', icon: 'chat-processing-outline', active: 'chat-processing' },
  { name: 'account', title: 'Account', icon: 'account-outline', active: 'account' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.olive,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: -2 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: components.tabBar.height + (Platform.OS === 'web' ? 0 : insets.bottom),
          paddingTop: 6,
          paddingBottom: Platform.OS === 'web' ? 8 : insets.bottom || 8,
        },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ focused, color }) => <MaterialCommunityIcons name={focused ? t.active : t.icon} size={24} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
