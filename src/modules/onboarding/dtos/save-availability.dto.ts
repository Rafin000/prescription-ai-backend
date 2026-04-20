export class SaveAvailabilityDto {
  /** Opaque from the server's POV — we persist it in data.availability. */
  availability!: {
    inPerson?: Record<string, Array<{ weekday: number; start: string; end: string }>>;
    video?: Array<{ weekday: number; start: string; end: string }>;
  };
}
