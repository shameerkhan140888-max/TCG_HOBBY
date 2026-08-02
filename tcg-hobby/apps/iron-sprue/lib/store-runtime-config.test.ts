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

    expect(() => getIronSprueDatabaseConfig()).toThrow(/dedicated Neon project/);
  });

  it('requires a dedicated HTTPS Iron Sprue R2 public base URL', () => {
    process.env.R2_BUCKET_NAME = 'tcg-hobby-media';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-media';
    process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL = 'https://media.iron-sprue.co.uk';

    expect(getIronSprueMediaConfig()).toMatchObject({
      store: 'IRON_SPRUE',
      bucketBinding: 'IRON_SPRUE_MEDIA',
      bucketName: 'iron-sprue-media',
      publicBaseUrl: 'https://media.iron-sprue.co.uk',
    });
  });

  it('rejects TCG media paths', () => {
    expect(() => assertIronSprueMediaKey('tcg-hobby/products/card.webp')).toThrow(/TCG Hobby media paths/);
    expect(assertIronSprueMediaKey('/iron-sprue/products/kit.webp')).toBe('iron-sprue/products/kit.webp');
  });
});
