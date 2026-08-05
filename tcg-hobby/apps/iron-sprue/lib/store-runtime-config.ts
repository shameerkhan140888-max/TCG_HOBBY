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
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  publicBaseUrl: string;
  customMediaDomain?: string;
  uploadPrefix: string;
  allowedMimeTypes: readonly string[];
  maxFileSizeBytes: number;
  cacheControl: string;
  corsPolicy: {
    allowedOrigins: readonly string[];
    allowedMethods: readonly string[];
    allowedHeaders: readonly string[];
    exposeHeaders: readonly string[];
  };
  lifecyclePolicy: {
    incompleteMultipartUploadDays: number;
    nonCurrentVersionExpirationDays?: number;
  };
};

const TCG_DATABASE_ENV_NAMES = new Set(['DATABASE_URL', 'DIRECT_DATABASE_URL', 'TCG_HOBBY_DATABASE_URL']);
const DEFAULT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
const REQUIRED_IRON_SPRUE_R2_BUCKET = 'iron-sprue-product-media';
const PRODUCTION_MEDIA_HOST = 'media.ironsprue.co.uk';

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
  const accountId = required('IRON_SPRUE_R2_ACCOUNT_ID');
  const bucketName = required('IRON_SPRUE_R2_BUCKET_NAME');
  if (bucketName !== REQUIRED_IRON_SPRUE_R2_BUCKET) {
    throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${REQUIRED_IRON_SPRUE_R2_BUCKET}.`);
  }
  if (bucketName === process.env.R2_BUCKET_NAME?.trim()) {
    throw new Error('IRON_SPRUE_R2_BUCKET_NAME must not reuse the TCG Hobby R2 bucket.');
  }
  const accessKeyId = required('IRON_SPRUE_R2_ACCESS_KEY_ID');
  const secretAccessKey = required('IRON_SPRUE_R2_SECRET_ACCESS_KEY');
  const endpoint = required('IRON_SPRUE_R2_ENDPOINT').replace(/\/$/, '');
  const region = process.env.IRON_SPRUE_R2_REGION?.trim() || 'auto';
  const publicBaseUrl = required('IRON_SPRUE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  if (!publicBaseUrl.startsWith('https://')) {
    throw new Error('IRON_SPRUE_R2_PUBLIC_BASE_URL must be an absolute HTTPS URL.');
  }
  const environment = normalizedEnvironment();
  if (publicBaseUrl.includes('r2.dev') && environment === 'production') {
    throw new Error('Iron Sprue production media must use a custom media domain, not r2.dev.');
  }
  if (environment === 'production' && new URL(publicBaseUrl).hostname !== PRODUCTION_MEDIA_HOST) {
    throw new Error(`Iron Sprue production media must be served from ${PRODUCTION_MEDIA_HOST}.`);
  }

  const config: IronSprueMediaConfig = {
    store: 'IRON_SPRUE',
    bucketBinding: 'IRON_SPRUE_MEDIA',
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    endpoint,
    region,
    publicBaseUrl,
    uploadPrefix: process.env.IRON_SPRUE_R2_UPLOAD_PREFIX?.trim() || 'products/',
    allowedMimeTypes: DEFAULT_IMAGE_MIME_TYPES,
    maxFileSizeBytes: Number(process.env.IRON_SPRUE_R2_MAX_FILE_SIZE_BYTES ?? 12 * 1024 * 1024),
    cacheControl: process.env.IRON_SPRUE_R2_CACHE_CONTROL?.trim() || 'public, max-age=31536000, immutable',
    corsPolicy: {
      allowedOrigins: [process.env.IRON_SPRUE_SITE_URL?.trim() || 'https://www.ironsprue.co.uk'],
      allowedMethods: ['GET', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Cache-Control'],
      exposeHeaders: ['ETag', 'Cache-Control'],
    },
    lifecyclePolicy: {
      incompleteMultipartUploadDays: Number(process.env.IRON_SPRUE_R2_INCOMPLETE_UPLOAD_DAYS ?? 7),
      nonCurrentVersionExpirationDays: Number(process.env.IRON_SPRUE_R2_NONCURRENT_VERSION_DAYS ?? 90),
    },
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
