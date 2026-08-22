import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ApiExceptionFilter } from './api-exception.filter.js';

for (const candidate of [
  '../../.env',
  '../../.env.local',
  '../iron-sprue/.env.local',
  '../../apps/iron-sprue/.env.local',
  '.env',
  '.env.local',
]) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) process.loadEnvFile(path);
}

const { AppModule } = await import('./app.module.js');

const port = Number(process.env.PORT ?? 4000);
const app = await NestFactory.create(AppModule);
const allowedOrigins = parseAllowedOrigins(process.env.API_CORS_ALLOWED_ORIGINS);
app.enableCors({
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
});
app.useGlobalFilters(new ApiExceptionFilter());
await app.listen(port, '0.0.0.0');

function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
