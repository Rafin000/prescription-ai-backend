import { IsObject } from 'class-validator';

export interface AvailabilityPayload {
  inPerson?: Record<string, Array<{ weekday: number; start: string; end: string }>>;
  video?: Array<{ weekday: number; start: string; end: string }>;
}

export class SaveAvailabilityDto {
  /**
   * Opaque from the server's POV — persisted verbatim in
   * `doctors.data.availability`. `@IsObject()` keeps the class-validator
   * whitelist from stripping the whole payload when there are no nested
   * decorators.
   */
  @IsObject()
  availability!: AvailabilityPayload;
}
