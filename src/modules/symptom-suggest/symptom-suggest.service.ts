import { Injectable } from '@nestjs/common';

/**
 * Rule-based specialty suggester. Matches keyword buckets, returns the top
 * few specialties most likely to match. Intentionally simple for MVP — the
 * upgrade path is an LLM call behind the same interface.
 */
@Injectable()
export class SymptomSuggestService {
  private readonly rules: Array<{ specialty: string; keywords: RegExp[] }> = [
    {
      specialty: 'Cardiology',
      keywords: [/chest\s*pain/, /palpitation/, /shortness\s*of\s*breath/, /heart/],
    },
    {
      specialty: 'Dermatology',
      keywords: [/rash/, /acne/, /eczema/, /itch/, /skin/, /psoriasis/],
    },
    {
      specialty: 'Paediatrics',
      keywords: [/child/, /kid/, /infant/, /baby/, /toddler/],
    },
    {
      specialty: 'Psychiatry',
      keywords: [/anxiety/, /depress/, /insomnia/, /panic/, /stress/, /mood/],
    },
    {
      specialty: 'Orthopaedics',
      keywords: [/back\s*pain/, /knee/, /joint/, /sprain/, /fracture/, /bone/, /neck/],
    },
    {
      specialty: 'ENT',
      keywords: [/sore\s*throat/, /ear/, /sinus/, /tinnitus/, /tonsil/, /hearing/],
    },
    {
      specialty: 'Gastroenterology',
      keywords: [/stomach/, /bloat/, /nausea/, /diarr/, /constipation/, /heartburn/, /acid/],
    },
    {
      specialty: 'OB-GYN',
      keywords: [/pregnan/, /menstr/, /period/, /gyna/, /pcos/],
    },
    {
      specialty: 'Neurology',
      keywords: [/migraine/, /headache/, /seizure/, /numb/, /tingling/, /dizzi/],
    },
    {
      specialty: 'General Medicine',
      keywords: [/fever/, /cough/, /cold/, /flu/, /fatigue/, /weak/],
    },
  ];

  suggest(symptoms: string): { specialty: string; score: number }[] {
    const s = symptoms.toLowerCase();
    const scored = this.rules
      .map((r) => {
        const score = r.keywords.reduce(
          (acc, re) => acc + (re.test(s) ? 1 : 0),
          0,
        );
        return { specialty: r.specialty, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    // Fallback: always suggest General Medicine if nothing matched.
    if (scored.length === 0) {
      return [{ specialty: 'General Medicine', score: 0 }];
    }
    return scored.slice(0, 3);
  }
}
