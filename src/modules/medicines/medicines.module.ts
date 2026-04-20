import { Module } from '@nestjs/common';
import { MedicinesController } from './medicines.controller';
import { MedicinesRepository } from './medicines.repository';

@Module({
  controllers: [MedicinesController],
  providers: [MedicinesRepository],
  exports: [MedicinesRepository],
})
export class MedicinesModule {}
