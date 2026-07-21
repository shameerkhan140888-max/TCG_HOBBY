import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicProductSummary } from '@tcg-hobby/types';
import type { RootStackParamList } from './navigation-types';
import { stockLabel } from './mobile-utils';
import { colors, spacing } from './theme';

export function money(amountMinor: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100); }
export function ScreenState({ loading, error, empty, onRetry }: { loading?: boolean; error?: string | null; empty?: string; onRetry?: () => void }) {
  if (loading) return <View style={styles.state}><ActivityIndicator color={colors.orange} /><Text style={styles.muted}>Loading...</Text></View>;
  return <View style={styles.state}><Text style={styles.stateTitle}>{error ? 'Something went wrong' : 'Nothing here yet'}</Text><Text style={styles.muted}>{error ?? empty}</Text>{onRetry ? <Button label="Try again" onPress={onRetry} /> : null}</View>;
}

export function Button({ label, onPress, disabled, icon, secondary }: { label: string; onPress(): void; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, (pressed || disabled) && styles.buttonPressed]}>
    {icon ? <Ionicons name={icon} size={18} color={secondary ? colors.text : '#090909'} /> : null}<Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
  </Pressable>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action}</View>;
}

export function ProductCard({ product, onAdd, compact = false }: { product: PublicProductSummary; onAdd?: (id: string) => Promise<void> | void; compact?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addToBasket = async () => {
    if (!onAdd || adding) return;
    setAdding(true);
    setAddError(null);
    try { await onAdd(product.id); }
    catch (cause) { setAddError(cause instanceof Error ? cause.message : 'Unable to add this product.'); }
    finally { setAdding(false); }
  };
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={() => navigation.navigate('Product', { slug: product.slug })} style={({ pressed }) => [styles.productCard, compact && styles.productCardCompact, pressed && styles.cardPressed]}>
    <View style={styles.imageFrame}>
      {product.image ? <Image source={{ uri: product.image.url }} accessibilityLabel={product.image.altText} resizeMode="contain" style={styles.image} /> : <View style={styles.placeholder}><Ionicons name="image-outline" size={34} color={colors.orange} /><Text style={styles.placeholderText}>Photography coming soon</Text></View>}
    </View>
    <View style={styles.badgeRow}><Text style={[styles.stock, product.stockState === 'LOW_STOCK' && styles.stockLow, product.stockState === 'OUT_OF_STOCK' && styles.stockOut]}>{stockLabel(product.stockState)}</Text>{product.featured ? <Text style={styles.featured}>Featured</Text> : null}</View>
    <Text style={styles.game}>{product.game}</Text><Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
    <View style={styles.productFooter}><Text style={styles.price}>{money(product.price.amountMinor)}</Text>{onAdd && product.purchasable ? <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.name} to basket`} accessibilityState={{ disabled: adding }} disabled={adding} onPress={(event) => { event.stopPropagation(); void addToBasket(); }} style={styles.addButton}>{adding ? <ActivityIndicator size="small" color="#090909" /> : <Ionicons name="bag-add-outline" size={20} color="#090909" />}</Pressable> : null}</View>
    {addError ? <Text accessibilityRole="alert" style={styles.addError}>{addError}</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  state: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  stateTitle: { color: colors.text, fontSize: 20, fontWeight: '800' }, muted: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { minHeight: 48, paddingHorizontal: 20, borderRadius: 6, backgroundColor: colors.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonSecondary: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.line }, buttonPressed: { opacity: 0.65 },
  buttonText: { color: '#090909', fontWeight: '800', fontSize: 15 }, buttonTextSecondary: { color: colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }, sectionTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  productCard: { width: '100%', backgroundColor: colors.surface, borderRadius: 8, padding: 12, gap: 8 }, productCardCompact: { width: '100%' }, cardPressed: { opacity: 0.8 },
  imageFrame: { aspectRatio: 1, backgroundColor: '#0c0c0e', borderRadius: 6, overflow: 'hidden' }, image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, placeholderText: { color: colors.muted, fontSize: 12 },
  badgeRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }, stock: { color: colors.green, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, stockLow: { color: colors.amber }, stockOut: { color: colors.red },
  featured: { color: colors.orange, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, game: { color: colors.muted, fontSize: 12 }, productName: { color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: '800', minHeight: 46 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, price: { color: colors.orange, fontSize: 20, fontWeight: '900' }, addButton: { width: 44, height: 44, borderRadius: 6, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }, addError: { color: colors.red, fontSize: 12, lineHeight: 17 },
});
