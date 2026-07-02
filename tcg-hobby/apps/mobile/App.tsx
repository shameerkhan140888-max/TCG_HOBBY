import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { ProductSummary } from '@tcg-hobby/types';

const featured: ProductSummary = {
  id: 'prod_arcane_booster_box',
  name: 'Arcane Booster Box',
  slug: 'arcane-booster-box',
  game: 'Magic: The Gathering',
  price: { amountMinor: 11999, currency: 'GBP' },
  inStock: true,
};

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>TCG Hobby</Text>
        <Text style={styles.title}>Mobile companion</Text>
        <Text style={styles.copy}>{featured.name} is ready for catalogue, wishlist, and collection workflows.</Text>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderColor: '#27272a',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#18181b',
    padding: 24,
  },
  eyebrow: {
    color: '#ff7a1a',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fafafa',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  copy: {
    color: '#d4d4d8',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
});
