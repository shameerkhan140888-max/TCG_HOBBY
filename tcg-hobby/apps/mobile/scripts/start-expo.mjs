process.env.EXPO_NO_DEPENDENCY_VALIDATION = '1';
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

await import('expo/bin/cli');
