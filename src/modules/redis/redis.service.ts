import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
    this.client.on('error', (e) => this.log.error(`redis: ${e.message}`));
  }

  async onModuleInit() {
    await this.client.ping();
    this.log.log('Redis connection OK');
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}
