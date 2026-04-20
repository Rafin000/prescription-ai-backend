import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';

type Step = 'profile' | 'chambers' | 'availability' | 'preferences' | 'team' | 'payment';

@Injectable()
export class OnboardingRepository extends BaseRepository {
  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
  }

  async upsertStep(input: {
    teamId: string;
    doctorId: string;
    step: Step;
    payload: Record<string, unknown>;
    completed: boolean;
  }): Promise<void> {
    const client = await this.getClient();
    await client.query(
      `INSERT INTO onboarding_progress
         (team_id, doctor_id, step, completed_at, data)
       VALUES ($1, $2, $3, CASE WHEN $5 THEN now() ELSE NULL END, $4::jsonb)
       ON CONFLICT (doctor_id, step) DO UPDATE
         SET data         = onboarding_progress.data || EXCLUDED.data,
             completed_at = CASE WHEN $5 THEN now() ELSE onboarding_progress.completed_at END,
             updated_at   = now()`,
      [
        input.teamId,
        input.doctorId,
        input.step,
        JSON.stringify(input.payload),
        input.completed,
      ],
    );
  }
}
