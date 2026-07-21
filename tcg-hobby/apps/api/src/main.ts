import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ApiExceptionFilter } from './api-exception.filter.js';

for (const candidate of ['../../.env', '../../.env.local', '.env', '.env.local']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) process.loadEnvFile(path);
}

const { AppModule } = await import('./app.module.js');

const port = Number(process.env.PORT ?? 4000);
const app = await NestFactory.create(AppModule);
app.enableCors({ origin: true, credentials: true });
app.useGlobalFilters(new ApiExceptionFilter());
await app.listen(port, '0.0.0.0');
