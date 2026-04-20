import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { CLS_REQUEST_ID } from 'src/base/base.constants';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService, ClsService],
      useFactory: (config: ConfigService, cls: ClsService) => {
        const isDev = config.get<string>('NODE_ENV') !== 'production';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info',
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                  },
                }
              : undefined,
            genReqId: (req) => {
              const id =
                (req.headers['x-request-id'] as string | undefined) ??
                randomUUID();
              // Thread the id through CLS so repos + workers log with it.
              cls.set(CLS_REQUEST_ID, id);
              return id;
            },
            customProps: () => ({
              requestId: cls.get<string>(CLS_REQUEST_ID),
            }),
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
              }),
              res: (res) => ({ statusCode: res.statusCode }),
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                '*.password',
                '*.password_hash',
                '*.token',
              ],
              censor: '[redacted]',
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
