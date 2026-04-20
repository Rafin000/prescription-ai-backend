import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Worker entrypoint. Same AppModule, no HTTP listener. BullMQ processors and
 * `@nestjs/schedule` crons are picked up from the module graph.
 *
 * In prod this runs as a separate Deployment. For cron-sensitive queues we
 * keep exactly ONE replica of this process with WORKER_ROLE=cron — see
 * queues.module when processors are added.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
    abortOnError: false,
  });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  // eslint-disable-next-line no-console
  console.log(
    `[prescription-ai-backend] worker started (role=${
      process.env.WORKER_ROLE ?? 'default'
    })`,
  );

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[worker] ${signal} received, draining…`);
    try {
      await app.close();
      process.exit(0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('worker shutdown failed', e);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
