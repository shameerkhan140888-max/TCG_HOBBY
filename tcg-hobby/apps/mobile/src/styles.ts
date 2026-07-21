import { StyleSheet } from 'react-native';
import { colors, spacing } from './theme';

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md, paddingBottom: 48, gap: spacing.lg },
  eyebrow: { color: colors.orange, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  h1: { color: colors.text, fontSize: 34, lineHeight: 39, fontWeight: '900' }, h2: { color: colors.text, fontSize: 24, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 }, label: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  error: { color: colors.red, fontSize: 14, lineHeight: 20 }, success: { color: colors.green, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.line }, card: { backgroundColor: colors.surface, borderRadius: 8, padding: spacing.md, gap: spacing.sm },
  chip: { minHeight: 42, borderRadius: 21, backgroundColor: colors.surface, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.orange }, chipText: { color: colors.text, fontWeight: '700' }, chipTextActive: { color: '#090909' },
});
