import { Module } from '@nestjs/common';
import { AppointmentsModule } from 'src/modules/appointments/appointments.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

@Module({
  imports: [AppointmentsModule],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
