import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AuthModule } from './auth/auth.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { DatabaseModule } from './database/database.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Controller('api/v1')
class HealthController {
  @Get('health')
  health() { return { status: 'ok', service: 'orbit-api', sprint: 'SP1', authMode: process.env.AUTH_MODE ?? 'local' }; }
}

@Module({ imports: [DatabaseModule, AuthModule, WorkspacesModule], controllers: [HealthController] })
class AppModule {}

export async function createApp() {
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.enableCors({ origin: webOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type'] });
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Cache-Control', 'no-store');
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (mutating && request.headers.origin && request.headers.origin !== webOrigin) {
      response.status(403).json({ code: 'FORBIDDEN', message: 'Nguồn yêu cầu không được cho phép.', requestId: randomUUID() });
      return;
    }
    next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.init();
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 4000), '127.0.0.1');
  console.info(`Orbit SP1 API ready at http://127.0.0.1:${process.env.PORT ?? 4000}/api/v1`);
}

if (require.main === module) {
  bootstrap().catch(() => {
    // Avoid leaking a database connection string or provider credentials in startup logs.
    console.error('Cannot start Orbit API. Check DATABASE_URL and authentication configuration.');
    process.exitCode = 1;
  });
}
