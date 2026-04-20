import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // We drain connections manually on SIGTERM rather than letting Nest swallow it.
    abortOnError: false,
  });

  app.useLogger(app.get(PinoLogger));

  app.use(cookieParser());
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: 0 /* GET */ }] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );

  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[prescription-ai-backend] HTTP listening on :${port}`);

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[prescription-ai-backend] ${signal} received, draining…`);
    try {
      await app.close();
      process.exit(0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('shutdown failed', e);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
