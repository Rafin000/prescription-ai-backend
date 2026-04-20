import { Module } from '@nestjs/common';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingRepository } from './onboarding.repository';

@Module({
  imports: [DoctorsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingRepository],
  exports: [OnboardingService],
})
export class OnboardingModule {}
