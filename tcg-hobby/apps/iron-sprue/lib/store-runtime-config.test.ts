import { afterEach, describe, expect, it } from 'vitest';
import { assertIronSprueMediaKey, getIronSprueDatabaseConfig, getIronSprueMediaConfig } from './store-runtime-config';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Iron Sprue runtime isolation config', () => {
  it('requires dedicated Iron Sprue database variables', () => {
    process.env.IRON_SPRUE_DATABASE_URL = 'postgresql://iron-dev.example/db';
    process.env.IRON_SPRUE_DIRECT_DATABASE_URL = 'postgresql://iron-direct.example/db';
    process.env.IRON_SPRUE_WORKER_READ_DATABASE_URL = 'postgresql://iron-read.example/db';
    process.env.DATABASE_URL = 'postgresql://tcg.example/db';

    expect(getIronSprueDatabaseConfig()).toMatchObject({
      store: 'IRON_SPRUE',
      pooledUrl: 'postgresql://iron-dev.example/db',
      directUrl: 'postgresql://iron-direct.example/db',
      workerReadUrl: 'postgresql://iron-read.example/db',
    });
  });

  it('fails closed when Iron Sprue would reuse the TCG database', () => {
    process.env.DATABASE_URL = 'postgresql://tcg.example/db';
    process.env.IRON_SPRUE_DATABASE_URL = 'postgresql://tcg.example/db';
    process.env.IRON_SPRUE_DIRECT_DATABASE_URL = 'postgresql://iron-direct.example/db';
    process.env.IRON_SPRUE_WORKER_READ_DATABASE_URL = 'postgresql://iron-read.example/db';

    expect(() => getIronSprueDatabaseConfig()).toThrow(/dedicated configured database target/);
  });

  it('allows local private R2 access before the public media URL is configured', () => {
    process.env.IRON_SPRUE_ENVIRONMENT = 'development';
    process.env.R2_BUCKET_NAME = 'tcg-hobby-media';
    process.env.IRON_SPRUE_R2_ACCOUNT_ID = 'iron-account';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'iron-access-key';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'iron-secret-key';
    process.env.IRON_SPRUE_R2_ENDPOINT = 'https://iron-account.r2.cloudflarestorage.com';

    expect(getIronSprueMediaConfig()).toMatchObject({
      store: 'IRON_SPRUE',
      bucketBinding: 'IRON_SPRUE_MEDIA',
      bucketName: 'iron-sprue-product-media',
      uploadPrefix: 'products/',
    });
    expect(getIronSprueMediaConfig().publicBaseUrl).toBeUndefined();
  });

  it('requires a dedicated HTTPS Iron Sprue R2 public base URL in production', () => {
    process.env.IRON_SPRUE_ENVIRONMENT = 'production';
    process.env.R2_BUCKET_NAME = 'tcg-hobby-media';
    process.env.IRON_SPRUE_R2_ACCOUNT_ID = 'iron-account';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'iron-access-key';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'iron-secret-key';
    process.env.IRON_SPRUE_R2_ENDPOINT = 'https://iron-account.r2.cloudflarestorage.com';
    process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL = 'https://media.ironsprue.co.uk';

    expect(getIronSprueMediaConfig()).toMatchObject({
      store: 'IRON_SPRUE',
      bucketBinding: 'IRON_SPRUE_MEDIA',
      bucketName: 'iron-sprue-product-media',
      publicBaseUrl: 'https://media.ironsprue.co.uk',
      uploadPrefix: 'products/',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      cacheControl: 'public, max-age=31536000, immutable',
    });

    delete process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL;
    expect(() => getIronSprueMediaConfig()).toThrow(/production media delivery/);
  });

  it('fails closed when Iron Sprue media would reuse a TCG bucket or non-production host', () => {
    process.env.IRON_SPRUE_ENVIRONMENT = 'production';
    process.env.R2_BUCKET_NAME = 'tcg-hobby-media';
    process.env.IRON_SPRUE_R2_ACCOUNT_ID = 'iron-account';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'tcg-hobby-media';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'iron-access-key';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'iron-secret-key';
    process.env.IRON_SPRUE_R2_ENDPOINT = 'https://iron-account.r2.cloudflarestorage.com';
    process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL = 'https://media.ironsprue.co.uk';

    expect(() => getIronSprueMediaConfig()).toThrow(/iron-sprue-product-media/);

    process.env.R2_BUCKET_NAME = 'tcg-hobby-media';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL = 'https://iron-sprue-media.r2.dev';

    expect(() => getIronSprueMediaConfig()).toThrow(/custom media domain/);
  });

  it('rejects TCG media paths', () => {
    expect(() => assertIronSprueMediaKey('tcg-hobby/products/card.webp')).toThrow(/TCG Hobby media paths/);
    expect(assertIronSprueMediaKey('/iron-sprue/products/kit.webp')).toBe('iron-sprue/products/kit.webp');
  });
});
