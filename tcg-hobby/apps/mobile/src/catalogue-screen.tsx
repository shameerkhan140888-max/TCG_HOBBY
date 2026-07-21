import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CatalogueSort, PublicCatalogueFilterOptions, PublicCatalogueOption, PublicCatalogueResponse, PublicProductSummary } from '@tcg-hobby/types';
import { apiRequest } from './api';
import { useBasket } from './basket-context';
import { ProductCard, ScreenState } from './components';
import { buildCatalogueQuery, mergeUniqueProducts } from './mobile-utils';
import { sharedStyles as s } from './styles';
import { colors, spacing } from './theme';

type FilterState = { game: string; productType: string; set: string; language: string; category: string; sort: CatalogueSort };
const initialFilters: FilterState = { game: '', productType: '', set: '', language: '', category: '', sort: 'featured' };

function OptionRow({ label, value, options, onChange }: { label: string; value: string; options: PublicCatalogueOption[]; onChange(value: string): void }) {
  if (!options.length) return null;
  return <View style={styles.filterGroup}><Text style={styles.filterLabel}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
    <Pressable accessibilityRole="button" onPress={() => onChange('')} style={[s.chip, !value && s.chipActive]}><Text style={[s.chipText, !value && s.chipTextActive]}>All</Text></Pressable>
    {options.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => onChange(item.value)} style={[s.chip, value === item.value && s.chipActive]}><Text style={[s.chipText, value === item.value && s.chipTextActive]}>{item.name}</Text></Pressable>)}
  </ScrollView></View>;
}

export function CatalogueScreen() {
  const { add } = useBasket();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selected, setSelected] = useState<FilterState>(initialFilters);
  const [products, setProducts] = useState<PublicProductSummary[]>([]);
  const [data, setData] = useState<PublicCatalogueResponse | null>(null);
  const [filters, setFilters] = useState<PublicCatalogueFilterOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (page = 1, append = false) => {
    const currentRequest = ++requestId.current;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = buildCatalogueQuery({ search: submittedSearch, ...selected, page, pageSize: 20 });
      const result = await apiRequest<PublicCatalogueResponse>(`/v1/catalogue?${params}`);
      if (currentRequest !== requestId.current) return;
      setData(result);
      setProducts((current) => append ? mergeUniqueProducts(current, result.products) : result.products);
      setError(null);
    } catch (cause) {
      if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : 'Catalogue unavailable.');
    } finally {
      if (currentRequest === requestId.current) { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    }
  }, [selected, submittedSearch]);

  useEffect(() => { void apiRequest<PublicCatalogueFilterOptions>('/v1/catalogue/filters').then(setFilters).catch(() => undefined); }, []);
  useEffect(() => { const timer = setTimeout(() => setSubmittedSearch(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { void load(); }, [load]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => setSelected((current) => ({ ...current, [key]: value }));
  const reset = () => { setSearch(''); setSubmittedSearch(''); setSelected(initialFilters); };
  const refresh = () => { setRefreshing(true); void load(); };
  const loadMore = () => { if (!loading && !loadingMore && data?.pagination.hasNextPage) void load(data.pagination.page + 1, true); };

  const header = <View style={styles.header}><Text style={s.eyebrow}>Catalogue</Text><Text style={s.h1}>Find your next product</Text><View style={styles.searchRow}><TextInput accessibilityLabel="Search products" value={search} onChangeText={setSearch} onSubmitEditing={() => setSubmittedSearch(search.trim())} placeholder="Search products" placeholderTextColor={colors.muted} style={[s.input, styles.search]} returnKeyType="search" />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={styles.clear}><Text style={styles.clearText}>Clear</Text></Pressable> : null}</View>
    {filters ? <><OptionRow label="Game" value={selected.game} options={filters.games} onChange={(value) => updateFilter('game', value)} /><OptionRow label="Product type" value={selected.productType} options={filters.productTypes} onChange={(value) => updateFilter('productType', value)} /><OptionRow label="Set" value={selected.set} options={filters.sets} onChange={(value) => updateFilter('set', value)} /><OptionRow label="Language" value={selected.language} options={filters.languages} onChange={(value) => updateFilter('language', value)} /><OptionRow label="Category" value={selected.category} options={filters.categories} onChange={(value) => updateFilter('category', value)} /><View style={styles.filterGroup}><Text style={styles.filterLabel}>Sort</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{filters.sorts.map((item) => <Pressable accessibilityRole="button" key={item.value} onPress={() => updateFilter('sort', item.value)} style={[s.chip, selected.sort === item.value && s.chipActive]}><Text style={[s.chipText, selected.sort === item.value && s.chipTextActive]}>{item.label}</Text></Pressable>)}</ScrollView></View></> : null}
    <View style={s.between}><Text style={styles.resultCount}>{data ? `${data.pagination.totalItems} product${data.pagination.totalItems === 1 ? '' : 's'}` : ''}</Text><Pressable accessibilityRole="button" onPress={reset}><Text style={styles.reset}>Reset filters</Text></Pressable></View>
    {error && !products.length ? <ScreenState error={error} onRetry={() => void load()} /> : loading && !products.length ? <ScreenState loading /> : !products.length ? <ScreenState empty="No products match those filters." /> : null}
  </View>;

  return <View style={s.screen}><FlatList data={products} keyExtractor={(item) => item.id} numColumns={2} columnWrapperStyle={styles.columns} contentContainerStyle={styles.content} renderItem={({ item }) => <View style={styles.cardWrap}><ProductCard product={item} onAdd={add} /></View>} ListHeaderComponent={header} ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.orange} style={styles.footerLoader} /> : null} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />} onEndReached={loadMore} onEndReachedThreshold={0.4} /></View>;
}

const styles = StyleSheet.create({ content: { padding: spacing.md, paddingBottom: 40 }, header: { gap: spacing.md, marginBottom: spacing.lg }, searchRow: { flexDirection: 'row', gap: 8 }, search: { flex: 1 }, clear: { minWidth: 64, alignItems: 'center', justifyContent: 'center' }, clearText: { color: colors.orange, fontWeight: '800' }, filterGroup: { gap: 8 }, filterLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }, chips: { gap: 8 }, resultCount: { color: colors.muted }, reset: { color: colors.orange, fontWeight: '800' }, columns: { gap: 10, marginBottom: 10 }, cardWrap: { flex: 1, minWidth: 0 }, footerLoader: { marginVertical: spacing.lg } });
