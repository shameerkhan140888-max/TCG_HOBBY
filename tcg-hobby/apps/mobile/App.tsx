import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountScreen, OrderScreen, OrdersScreen, ProfileScreen } from './src/account-screens';
import { AuthProvider } from './src/auth-context';
import { LoginScreen, RegisterScreen } from './src/auth-screens';
import { BasketProvider, useBasket } from './src/basket-context';
import { BasketScreen } from './src/basket-screen';
import { CatalogueScreen } from './src/catalogue-screen';
import { CheckoutScreen } from './src/checkout-screen';
import { HomeScreen } from './src/home-screen';
import { MobileErrorBoundary } from './src/error-boundary';
import type { MainTabParamList, RootStackParamList } from './src/navigation-types';
import { ProductScreen } from './src/product-screen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();
const navigationTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: colors.orange, background: colors.background, card: '#0d0d0f', border: colors.line, text: colors.text } };
const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = { Home: 'home-outline', Catalogue: 'grid-outline', Basket: 'bag-outline', Account: 'person-outline' };

function MainTabs() {
  const { basket } = useBasket();
  return <Tabs.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.orange, tabBarInactiveTintColor: colors.muted, tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />, ...(route.name === 'Basket' && basket.totalItems ? { tabBarBadge: basket.totalItems } : {}), tabBarBadgeStyle: styles.badge })}>
    <Tabs.Screen name="Home" component={HomeScreen} /><Tabs.Screen name="Catalogue" component={CatalogueScreen} /><Tabs.Screen name="Basket" component={BasketScreen} /><Tabs.Screen name="Account" component={AccountScreen} />
  </Tabs.Navigator>;
}

function AppNavigator() {
  const network = useNetInfo();
  return <View style={styles.root}>{network.isConnected === false ? <View style={styles.offline}><Text style={styles.offlineText}>You are offline. Some information may be out of date.</Text></View> : null}<NavigationContainer theme={navigationTheme}><Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0d0d0f' }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} /><Stack.Screen name="Product" component={ProductScreen} options={{ title: 'Product' }} /><Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} /><Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} /><Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} /><Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} /><Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} /><Stack.Screen name="Order" component={OrderScreen} options={{ title: 'Order details' }} /></Stack.Navigator></NavigationContainer></View>;
}

export default function App() { return <MobileErrorBoundary><SafeAreaProvider><StatusBar barStyle="light-content" backgroundColor={colors.background} /><AuthProvider><BasketProvider><AppNavigator /></BasketProvider></AuthProvider></SafeAreaProvider></MobileErrorBoundary>; }

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, offline: { backgroundColor: colors.amber, paddingHorizontal: 12, paddingVertical: 8 }, offlineText: { color: '#111', fontWeight: '800', textAlign: 'center' }, tabBar: { minHeight: 66, paddingTop: 7, paddingBottom: 8, backgroundColor: '#0d0d0f', borderTopColor: colors.line }, tabLabel: { fontSize: 11, fontWeight: '700' }, badge: { backgroundColor: colors.orange, color: '#090909' } });
