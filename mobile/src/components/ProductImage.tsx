import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { accents, radii, type AccentName } from '../theme';
import { Icon } from './Icon';

interface Props {
  uri?: string;
  icon: string;
  accent: AccentName;
  height?: number;
  label: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shows product photography when an image URL exists. Until real photography is supplied by the
 * catalogue, it falls back to a calm illustrated tile so layouts never show broken images.
 */
export function ProductImage({ uri, icon, accent, height = 120, label, style }: Props) {
  const a = accents[accent];
  return (
    <View style={[styles.box, { height, backgroundColor: a.tint }, style]} accessible accessibilityRole="image" accessibilityLabel={label}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
      ) : (
        <>
          <View style={[styles.blob, { backgroundColor: a.main, opacity: 0.12, width: height * 1.1, height: height * 1.1, right: -height * 0.25, top: -height * 0.35 }]} />
          <View style={[styles.blob, { backgroundColor: a.main, opacity: 0.08, width: height * 0.7, height: height * 0.7, left: -height * 0.2, bottom: -height * 0.3 }]} />
          <Icon name={icon} size={Math.min(56, height * 0.42)} color={a.main} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', alignSelf: 'stretch' },
  blob: { position: 'absolute', borderRadius: radii.pill },
});
