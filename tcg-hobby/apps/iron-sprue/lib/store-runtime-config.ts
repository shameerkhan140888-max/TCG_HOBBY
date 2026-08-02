export type IronSprueRuntimeEnvironment = 'development' | 'preview' | 'production' | 'test';

export type IronSprueDatabaseConfig = {
  store: 'IRON_SPRUE';
  environment: IronSprueRuntimeEnvironment;
  pooledUrl: string;
  directUrl: string;
  workerReadUrl: string;
};

export type IronSprueMediaConfig = {
  store: 'IRON_SPRUE';
  bucketBinding: 'IRON_SPRUE_MEDIA';
  bucketName: string;
  publicBaseUrl: string;
  customMediaDomain?: string;
  uploadPrefix: string;
  allowedMimeTypes: readonly string[];
  maxFileSizeBytes: number;
  cacheControl: string;
};

const TCG_DATABASE_ENV_NAMES = new Set(['DATABASE_URL', 'DIRECT_DATABASE_URL', 'TCG_HOBBY_DATABASE_URL']);
const DEFAULT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Iron Sprue runtime configuration.`);
  return value;
}

function normalizedEnvironment(): IronSprueRuntimeEnvironment {
  const value = (process.env.IRON_SPRUE_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development').trim();
  if (value === 'production' || value === 'preview' || value === 'test' || value === 'development') return value;
  throw new Error('IRON_SPRUE_ENVIRONMENT must be development, preview, production or test.');
}

function rejectTcghobbyUrlReuse(value: string, variableName: string) {
  for (const tcgName of TCG_DATABASE_ENV_NAMES) {
    const tcgValue = process.env[tcgName]?.trim();
    if (tcgValue && tcgValue === value) {
      throw new Error(`${variableName} must not reuse ${tcgName}; Iron Sprue requires a dedicated Neon project.`);
    }
  }
}

export function getIronSprueDatabaseConfig(): IronSprueDatabaseConfig {
  const pooledUrl = required('IRON_SPRUE_DATABASE_URL');
  const directUrl = required('IRON_SPRUE_DIRECT_DATABASE_URL');
  const workerReadUrl = required('IRON_SPRUE_WORKER_READ_DATABASE_URL');
  rejectTcghobbyUrlReuse(pooledUrl, 'IRON_SPRUE_DATABASE_URL');
  rejectTcghobbyUrlReuse(directUrl, 'IRON_SPRUE_DIRECT_DATABASE_URL');
  rejectTcghobbyUrlReuse(workerReadUrl, 'IRON_SPRUE_WORKER_READ_DATABASE_URL');

  return { store: 'IRON_SPRUE', environment: normalizedEnvironment(), pooledUrl, directUrl, workerReadUrl };
}

export function getIronSprueMediaConfig(): IronSprueMediaConfig {
  const bucketName = required('IRON_SPRUE_R2_BUCKET_NAME');
  if (bucketName === process.env.R2_BUCKET_NAME?.trim()) {
    throw new Error('IRON_SPRUE_R2_BUCKET_NAME must not reuse the TCG Hobby R2 bucket.');
  }
  const publicBaseUrl = required('IRON_SPRUE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  if (!publicBaseUrl.startsWith('https://')) {
    throw new Error('IRON_SPRUE_R2_PUBLIC_BASE_URL must be an absolute HTTPS URL.');
  }
  if (publicBaseUrl.includes('r2.dev') && normalizedEnvironment() === 'production') {
    throw new Error('Iron Sprue production media must use a custom media domain, not r2.dev.');
  }

  const config: IronSprueMediaConfig = {
    store: 'IRON_SPRUE',
    bucketBinding: 'IRON_SPRUE_MEDIA',
    bucketName,
    publicBaseUrl,
    uploadPrefix: process.env.IRON_SPRUE_R2_UPLOAD_PREFIX?.trim() || 'products/',
    allowedMimeTypes: DEFAULT_IMAGE_MIME_TYPES,
    maxFileSizeBytes: Number(process.env.IRON_SPRUE_R2_MAX_FILE_SIZE_BYTES ?? 5 * 1024 * 1024),
    cacheControl: process.env.IRON_SPRUE_R2_CACHE_CONTROL?.trim() || 'public, max-age=31536000, immutable',
  };
  const customMediaDomain = process.env.IRON_SPRUE_R2_CUSTOM_MEDIA_DOMAIN?.trim();
  if (customMediaDomain) config.customMediaDomain = customMediaDomain;
  return config;
}

export function assertIronSprueMediaKey(key: string) {
  const normalized = key.replace(/^\/+/, '');
  if (normalized.startsWith('tcg-hobby/') || normalized.startsWith('products/tcg-hobby/')) {
    throw new Error('TCG Hobby media paths are not valid for Iron Sprue assets.');
  }
  return normalized;
}
