import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PublicOrderDetail, PublicOrderSummary } from '@tcg-hobby/types';
import { apiRequest } from './api'; import { useAuth } from './auth-context'; import { Button, money, ScreenState } from './components'; import type { RootStackParamList } from './navigation-types'; import { sharedStyles as s } from './styles'; import { colors, spacing } from './theme';

export function AccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); const { user, loading, logout } = useAuth();
  if (loading) return <View style={s.screen}><ScreenState loading /></View>;
  if (!user) return <ScrollView style={s.screen} contentContainerStyle={s.content}><Text style={s.eyebrow}>Your account</Text><Text style={s.h1}>Keep your orders together.</Text><Text style={s.body}>Sign in with your existing TCG Hobby account or create one in a few moments.</Text><Button label="Sign in" onPress={() => navigation.navigate('Login')} /><Button secondary label="Create account" onPress={() => navigation.navigate('Register')} /></ScrollView>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content}><Text style={s.eyebrow}>Your account</Text><Text style={s.h1}>{user.name ? `Hello, ${user.name}.` : 'Welcome back.'}</Text><Text style={s.body}>{user.email}</Text><View style={s.card}><Text style={styles.cardTitle}>Profile</Text><Text style={s.body}>Keep your customer name up to date.</Text><Button secondary label="Edit profile" onPress={() => navigation.navigate('Profile')} /></View><View style={s.card}><Text style={styles.cardTitle}>Order history</Text><Text style={s.body}>Review order totals, payment state and fulfilment progress.</Text><Button label="View orders" onPress={() => navigation.navigate('Orders')} /></View><Button secondary label="Sign out" onPress={() => void logout()} /></ScrollView>;
}

export function ProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Profile'>) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submit = async () => {
    setPending(true); setError(null);
    try { await updateProfile(name); navigation.goBack(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Profile could not be updated.'); }
    finally { setPending(false); }
  };
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.eyebrow}>Account</Text><Text style={s.h1}>Your profile</Text><View><Text style={s.label}>Name</Text><TextInput accessibilityLabel="Name" value={name} onChangeText={setName} autoComplete="name" style={s.input} /></View>{error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}<Button label={pending ? 'Saving...' : 'Save profile'} disabled={pending} onPress={() => void submit()} /></ScrollView>;
}

export function OrdersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Orders'>) {
  const { token } = useAuth(); const [orders, setOrders] = useState<PublicOrderSummary[] | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setOrders(await apiRequest('/v1/orders', { token })); setError(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Orders unavailable.'); } }, [token]); useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <ScrollView style={s.screen} contentContainerStyle={s.content}><Text style={s.eyebrow}>Account</Text><Text style={s.h1}>Your orders</Text>{!orders ? <ScreenState loading={!error} error={error} onRetry={load} /> : orders.length === 0 ? <ScreenState empty="No orders are linked to this account yet." /> : orders.map((order) => <Pressable key={order.orderNumber} onPress={() => navigation.navigate('Order', { orderNumber: order.orderNumber })} style={s.card}><View style={s.between}><Text style={styles.cardTitle}>{order.orderNumber}</Text><Text style={styles.price}>{money(order.totalMinor)}</Text></View><Text style={s.body}>{new Date(order.createdAt).toLocaleDateString('en-GB')} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}</Text><Text style={styles.status}>{order.paymentStatus.replaceAll('_', ' ')} · {order.fulfilmentStatus.replaceAll('_', ' ')}</Text></Pressable>)}</ScrollView>;
}

export function OrderScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Order'>) {
  const { token } = useAuth(); const [order, setOrder] = useState<PublicOrderDetail | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setOrder(await apiRequest(`/v1/orders/${encodeURIComponent(route.params.orderNumber)}`, { token })); setError(null); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Order unavailable.'); } }, [route.params.orderNumber, token]); useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!order) return <View style={s.screen}><ScreenState loading={!error} error={error} onRetry={load} /></View>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content}><Text style={s.eyebrow}>Order</Text><Text style={s.h1}>{order.orderNumber}</Text><Text style={styles.status}>{order.paymentStatus.replaceAll('_', ' ')} · {order.fulfilmentStatus.replaceAll('_', ' ')}</Text>{order.items.map((item) => <View key={item.id} style={s.card}><Text style={styles.cardTitle}>{item.productName}</Text><View style={s.between}><Text style={s.body}>Quantity {item.quantity}</Text><Text style={styles.price}>{money(item.totalMinor)}</Text></View></View>)}<View style={s.divider} /><View style={s.between}><Text style={s.h2}>Total</Text><Text style={styles.total}>{money(order.totalMinor)}</Text></View><Text style={s.body}>Including VAT: {money(order.taxMinor)}</Text></ScrollView>;
}
const styles = StyleSheet.create({ cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, price: { color: colors.orange, fontWeight: '900' }, status: { color: colors.muted, textTransform: 'capitalize' }, total: { color: colors.orange, fontSize: 25, fontWeight: '900' } });
