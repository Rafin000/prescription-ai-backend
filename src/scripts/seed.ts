/* eslint-disable no-console */
/**
 * Seeds five signed-up doctors + their chambers, mirroring the landing's
 * `doctorDirectory` so the end-to-end flow looks identical whether the SPA is
 * running on mocks or against this backend.
 *
 *   yarn ts-node src/scripts/seed.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { runMigrations } from './migrate';

interface SeedChamber {
  name: string;
  address: string;
  phone?: string;
  timeLabel: string;
  lat: number;
  lng: number;
  area: string;
}

interface SeedDoctor {
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  feeBdt: number;
  offersTele: boolean;
  degrees: string[];
  focusAreas: string[];
  tagline: string;
  bio?: string;
  languages: string[];
  chambers: SeedChamber[];
}

const DOCTORS: SeedDoctor[] = [
  {
    name: 'Dr. Ashraful Karim',
    specialty: 'Cardiology',
    rating: 4.9,
    reviewCount: 218,
    feeBdt: 1500,
    offersTele: true,
    degrees: ['MBBS', 'FCPS (Medicine)', 'MD (Cardiology)'],
    focusAreas: ['Interventional Cardiology', 'Echocardiography'],
    tagline: 'AI-assisted prescriptions · 1,200+ consults this year',
    bio: 'Consultant Cardiologist at Popular Diagnostic & Square Hospital. Special interest in preventive cardiology and complex hypertension.',
    languages: ['Bangla', 'English'],
    chambers: [
      {
        name: 'Popular Diagnostic — Dhanmondi',
        address: 'House 16, Road 2, Dhanmondi, Dhaka 1205',
        phone: '+880 9666-787-555',
        timeLabel: '6:00 PM – 9:00 PM',
        lat: 23.7461,
        lng: 90.376,
        area: 'Dhanmondi',
      },
      {
        name: 'Square Hospital OPD',
        address: '18/F West Panthapath, Dhaka 1205',
        phone: '+880 2-8159457',
        timeLabel: '5:00 PM – 8:00 PM',
        lat: 23.7515,
        lng: 90.3805,
        area: 'Panthapath',
      },
    ],
  },
  {
    name: 'Dr. Nusrat Hossain',
    specialty: 'Dermatology',
    rating: 4.8,
    reviewCount: 167,
    feeBdt: 1200,
    offersTele: true,
    degrees: ['MBBS', 'DDV', 'FCPS (Dermatology)'],
    focusAreas: ['Acne & rosacea', 'Cosmetic dermatology'],
    tagline: 'Clear-skin protocols · weekend video clinics',
    bio: 'Consultant Dermatologist focused on evidence-based skincare and gentle cosmetic procedures.',
    languages: ['Bangla', 'English', 'Hindi'],
    chambers: [
      {
        name: 'Skin Studio Banani',
        address: 'Road 11, Block H, Banani, Dhaka 1213',
        phone: '+880 9612-000 002',
        timeLabel: '5:00 PM – 8:00 PM',
        lat: 23.7937,
        lng: 90.4066,
        area: 'Banani',
      },
    ],
  },
  {
    name: 'Dr. Anika Saleh',
    specialty: 'Paediatrics',
    rating: 4.9,
    reviewCount: 401,
    feeBdt: 1100,
    offersTele: true,
    degrees: ['MBBS', 'FCPS (Paediatrics)'],
    focusAreas: ['Newborn care', 'Vaccination', 'Asthma'],
    tagline: 'Child-friendly evening clinic in Mirpur',
    languages: ['Bangla', 'English'],
    chambers: [
      {
        name: 'Mirpur Children Clinic',
        address: 'Section 6, Block C, Mirpur, Dhaka 1216',
        phone: '+880 9612-000 003',
        timeLabel: '6:00 PM – 9:00 PM',
        lat: 23.8064,
        lng: 90.3681,
        area: 'Mirpur',
      },
    ],
  },
  {
    name: 'Dr. Sayed Mahmud',
    specialty: 'Psychiatry',
    rating: 4.9,
    reviewCount: 188,
    feeBdt: 1800,
    offersTele: true,
    degrees: ['MBBS', 'MD (Psychiatry)'],
    focusAreas: ['Anxiety', 'Depression', 'CBT'],
    tagline: 'Video sessions only · evening slots',
    bio: 'Therapy + medication support for anxiety, depression, and burnout. All sessions are tele-only and confidential.',
    languages: ['Bangla', 'English'],
    chambers: [
      {
        name: 'Mind Health Tele-clinic',
        address: 'Online · Bangladesh-wide',
        timeLabel: '7:00 PM – 10:00 PM',
        lat: 23.8103,
        lng: 90.4125,
        area: 'Tele-only',
      },
    ],
  },
  {
    name: 'Dr. Tahmina Akter',
    specialty: 'Obstetrics & Gynaecology',
    rating: 4.8,
    reviewCount: 254,
    feeBdt: 1500,
    offersTele: false,
    degrees: ['MBBS', 'FCPS (Obs & Gyn)'],
    focusAreas: ['Antenatal care', 'PCOS', 'Menopause'],
    tagline: 'Evening antenatal clinic in Uttara',
    bio: 'Antenatal, fertility, and menopause care delivered with warmth and current best practice.',
    languages: ['Bangla', 'English'],
    chambers: [
      {
        name: 'Uttara Crescent Hospital',
        address: 'Sector 6, Uttara, Dhaka 1230',
        phone: '+880 9612-000 005',
        timeLabel: '6:00 PM – 9:00 PM',
        lat: 23.8693,
        lng: 90.3899,
        area: 'Uttara',
      },
    ],
  },
];

async function main() {
  await runMigrations();

  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL or DATABASE_DIRECT_URL must be set');
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Single shared "Prescription AI" demo team.
    const team = await client.query<{ id: string }>(
      `INSERT INTO teams (plan, status, data)
       VALUES ('pro', 'active', $1::jsonb)
       RETURNING id`,
      [JSON.stringify({ name: 'Prescription AI — Seed clinic' })],
    );
    const teamId = team.rows[0].id;
    console.log(`[seed] team ${teamId}`);

    for (const d of DOCTORS) {
      const doctor = await client.query<{ id: string }>(
        `INSERT INTO doctors
           (team_id, name, specialty, rating, review_count, fee_bdt, offers_tele, status, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8::jsonb)
         RETURNING id`,
        [
          teamId,
          d.name,
          d.specialty,
          d.rating,
          d.reviewCount,
          d.feeBdt,
          d.offersTele,
          JSON.stringify({
            degrees: d.degrees,
            focus_areas: d.focusAreas,
            tagline: d.tagline,
            bio: d.bio ?? null,
            languages: d.languages,
          }),
        ],
      );
      const doctorId = doctor.rows[0].id;

      for (const c of d.chambers) {
        await client.query(
          `INSERT INTO chambers
             (team_id, doctor_id, lat, lng, area, status, data)
           VALUES ($1, $2, $3, $4, $5, 'active', $6::jsonb)`,
          [
            teamId,
            doctorId,
            c.lat,
            c.lng,
            c.area,
            JSON.stringify({
              name: c.name,
              address: c.address,
              phone: c.phone ?? null,
              time_label: c.timeLabel,
            }),
          ],
        );
      }
      console.log(`[seed] ${d.name}  (${d.chambers.length} chamber${d.chambers.length === 1 ? '' : 's'})`);
    }

    await client.query('COMMIT');
    console.log('[seed] done');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
