import { Module } from '@nestjs/common';
import { SymptomSuggestController } from './symptom-suggest.controller';
import { SymptomSuggestService } from './symptom-suggest.service';

@Module({
  controllers: [SymptomSuggestController],
  providers: [SymptomSuggestService],
  exports: [SymptomSuggestService],
})
export class SymptomSuggestModule {}
