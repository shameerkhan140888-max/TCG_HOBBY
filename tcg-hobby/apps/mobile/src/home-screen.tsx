import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PublicHomeResponse } from '@tcg-hobby/types';
import { apiRequest } from './api';
import { ProductCard, ScreenState, SectionHeader } from './components';
import { useBasket } from './basket-context';
import type { MainTabParamList } from './navigation-types';
import { sharedStyles as s } from './styles';
import { colors, spacing } from './theme';

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { add } = useBasket();
  const [data, setData] = useState<PublicHomeResponse | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setData(await apiRequest('/v1/home')); setError(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Home unavailable.'); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!data) return <View style={s.screen}><ScreenState loading={!error} error={error} onRetry={load} /></View>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <View style={styles.hero}><Text style={s.eyebrow}>TCG Hobby</Text><Text style={s.h1}>Collect. Build. Play.</Text><Text style={s.body}>Trading cards, sealed releases and collector essentials, backed by fair pricing and clear availability.</Text>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Catalogue')} style={styles.heroButton}><Text style={styles.heroButtonText}>Shop the catalogue</Text></Pressable>
    </View>
    {data.categories.length ? <View><SectionHeader title="Browse categories" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{data.categories.map((category) => <Pressable key={category.id} style={s.chip} onPress={() => navigation.navigate('Catalogue')}><Text style={s.chipText}>{category.name}</Text></Pressable>)}</ScrollView></View> : null}
    {data.featuredProducts.length ? <View><SectionHeader title="Featured products" /><FlatList horizontal data={data.featuredProducts} keyExtractor={(item) => item.id} renderItem={({ item }) => <View style={{ width: 250 }}><ProductCard product={item} onAdd={add} /></View>} ItemSeparatorComponent={() => <View style={{ width: 12 }} />} showsHorizontalScrollIndicator={false} /></View> : null}
    {data.latestProducts.length ? <View><SectionHeader title="Latest arrivals" /><FlatList horizontal data={data.latestProducts} keyExtractor={(item) => item.id} renderItem={({ item }) => <View style={{ width: 250 }}><ProductCard product={item} onAdd={add} /></View>} ItemSeparatorComponent={() => <View style={{ width: 12 }} />} showsHorizontalScrollIndicator={false} /></View> : null}
    <View style={styles.trust}><Text style={styles.trustTitle}>Genuine products</Text><Text style={styles.trustTitle}>Fair pricing</Text><Text style={styles.trustTitle}>Collector focused</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({ hero: { minHeight: 300, justifyContent: 'flex-end', padding: spacing.lg, borderRadius: 8, backgroundColor: '#16110e', gap: spacing.md }, heroButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', backgroundColor: colors.orange, borderRadius: 6, paddingHorizontal: 18 }, heroButtonText: { color: '#080808', fontWeight: '900' }, chips: { gap: 10 }, trust: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.orangeDark }, trustTitle: { color: colors.text, fontWeight: '800' } });
