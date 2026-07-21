import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from './auth-context'; import { Button } from './components'; import type { RootStackParamList } from './navigation-types'; import { sharedStyles as s } from './styles';
import { mobileConfig } from './config';
import { colors } from './theme';

function AuthForm({ mode, navigation }: { mode: 'login' | 'register'; navigation: NativeStackScreenProps<RootStackParamList, 'Login' | 'Register'>['navigation'] }) {
  const auth = useAuth(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  const submit = async () => { setPending(true); setError(null); try { if (mode === 'login') await auth.login(email, password); else await auth.register(email, password, confirmPassword); navigation.navigate('Main', { screen: 'Account' }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to continue.'); } finally { setPending(false); } };
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.eyebrow}>Customer account</Text><Text style={s.h1}>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</Text><Text style={s.body}>{mode === 'login' ? 'Use the same TCG Hobby account as the web storefront.' : 'One account for the storefront and mobile app.'}</Text>
    <View><Text style={s.label}>Email address</Text><TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={s.input} /></View><View><Text style={s.label}>Password</Text><TextInput accessibilityLabel="Password" secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChangeText={setPassword} style={s.input} /></View>{mode === 'register' ? <View><Text style={s.label}>Confirm password</Text><TextInput accessibilityLabel="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} style={s.input} /></View> : null}{error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}<Button label={pending ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'} disabled={pending} onPress={() => void submit()} />
    <Button secondary label={mode === 'login' ? 'Create an account' : 'Already have an account'} onPress={() => navigation.replace(mode === 'login' ? 'Register' : 'Login')} />
    <Text style={styles.legal}>By continuing, you agree to our <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${mobileConfig.storefrontOrigin}/terms`)}><Text style={styles.link}>Terms</Text></Pressable> and acknowledge our <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${mobileConfig.storefrontOrigin}/privacy`)}><Text style={styles.link}>Privacy Policy</Text></Pressable>.</Text>
  </ScrollView></KeyboardAvoidingView>;
}
export function LoginScreen(props: NativeStackScreenProps<RootStackParamList, 'Login'>) { return <AuthForm mode="login" navigation={props.navigation} />; }
export function RegisterScreen(props: NativeStackScreenProps<RootStackParamList, 'Register'>) { return <AuthForm mode="register" navigation={props.navigation} />; }

const styles = StyleSheet.create({ legal: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }, link: { color: colors.orange, fontWeight: '700' } });
