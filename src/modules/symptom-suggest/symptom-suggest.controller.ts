import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/decorators/public.decorator';
import { SuggestDto } from './dtos/suggest.dto';
import { SymptomSuggestService } from './symptom-suggest.service';

@Controller('public/symptom-suggest')
export class SymptomSuggestController {
  constructor(private readonly svc: SymptomSuggestService) {}

  @Public()
  @Post()
  @HttpCode(200)
  // LLM upgrade-path lives here — protect it hard once costs matter.
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  suggest(@Body() dto: SuggestDto) {
    return { suggestions: this.svc.suggest(dto.symptoms) };
  }
}
