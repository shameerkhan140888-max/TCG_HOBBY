import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const port = Number(process.env.PORT ?? 4000);
const app = await NestFactory.create(AppModule);
app.enableCors({ origin: true, credentials: true });
await app.listen(port);
