import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { Public } from 'src/decorators/public.decorator';
import { DoctorsService } from './doctors.service';
import { FilterDoctorsDto } from './dtos/filter-doctors.dto';

/** Public directory endpoints. No auth. CDN-cacheable. */
@Controller('public/doctors')
export class DoctorsController {
  constructor(private readonly svc: DoctorsService) {}

  @Public()
  @Get()
  list(@Query() filter: FilterDoctorsDto) {
    return this.svc.list(filter);
  }

  @Public()
  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.getById(id);
  }
}
