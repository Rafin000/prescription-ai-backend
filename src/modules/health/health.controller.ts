import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/decorators/public.decorator';
import { DatabaseService } from 'src/modules/database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  async check() {
    const client = await this.db.pool.connect();
    try {
      await client.query('SELECT 1');
      return { status: 'ok', service: 'prescription-ai-backend', db: 'ok' };
    } finally {
      client.release();
    }
  }
}
