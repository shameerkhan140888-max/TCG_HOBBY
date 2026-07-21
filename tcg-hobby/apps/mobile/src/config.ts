import { NativeModules } from 'react-native';
import { normaliseHttpOrigin } from './mobile-utils';

function developmentHost(): string {
  const scriptUrl = (NativeModules.SourceCode as { scriptURL?: string } | undefined)?.scriptURL;
  if (!scriptUrl) return '127.0.0.1';
  try { return new URL(scriptUrl).hostname; } catch { return '127.0.0.1'; }
}

const host = developmentHost();
const development = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
export const mobileConfig = {
  apiOrigin: normaliseHttpOrigin(process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${host}:4000`, 'EXPO_PUBLIC_API_BASE_URL'),
  storefrontOrigin: normaliseHttpOrigin(process.env.EXPO_PUBLIC_STOREFRONT_URL ?? `http://${host}:3000`, 'EXPO_PUBLIC_STOREFRONT_URL'),
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? (development ? 'development' : 'production'),
} as const;
