import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { HttpErrorFilter } from './http-error.filter.js';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true }),
);
app.enableCors({ origin: ['http://localhost:3000'], credentials: true });
app.useGlobalFilters(new HttpErrorFilter());
await app.listen({ port: 4000, host: '0.0.0.0' });
