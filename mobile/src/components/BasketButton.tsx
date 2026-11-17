import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useBasket } from '../store/BasketContext';
import { colors, components, radii } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function BasketButton() {
  const { count } = useBasket();
  return (
    <Pressable
      onPress={() => router.push('/basket')}
      accessibilityRole="button"
      accessibilityLabel={count ? `Basket, ${count} ${count === 1 ? 'item' : 'items'}` : 'Basket, empty'}
      style={styles.btn}
    >
      <Icon name="basket-outline" size={24} color={colors.ink} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text variant="eyebrow" color={colors.white} style={{ fontSize: 11, lineHeight: 14, letterSpacing: 0 }}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: components.minTouch, height: components.minTouch, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: radii.pill, backgroundColor: colors.olive, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
});
