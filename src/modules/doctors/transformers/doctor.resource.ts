import { makeTransformer } from 'src/base/base.transformer';
import { chamberResource } from 'src/modules/chambers/transformers/chamber.resource';
import { DoctorListRow, DoctorResource, DoctorRow } from '../types/doctor.model';

function baseFields(row: DoctorRow) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    rating: row.rating == null ? null : Number(row.rating),
    reviewCount: row.review_count,
    feeBdt: row.fee_bdt,
    offersTele: row.offers_tele,
    degrees: row.data?.degrees ?? [],
    focusAreas: row.data?.focus_areas ?? [],
    tagline: row.data?.tagline ?? null,
    bio: row.data?.bio ?? null,
    languages: row.data?.languages ?? [],
    avatarUrl: row.data?.avatar_url ?? null,
  };
}

export const doctorListResource = makeTransformer<DoctorListRow, DoctorResource>(
  (row) => ({
    ...baseFields(row),
    chambers: (row.chambers ?? []).map((c) => chamberResource.transform(c)),
    distanceKm:
      typeof row.distance_km === 'number'
        ? Math.round(row.distance_km * 100) / 100
        : null,
  }),
);
