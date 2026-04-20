/**
 * Bangladesh mobile phone normalisation + validation.
 *
 * Accepted operator prefixes (BTRC-assigned):
 *   13 — Grameenphone (recent block)
 *   14 — Banglalink (recent block)
 *   15 — Teletalk
 *   16 — Airtel
 *   17 — Grameenphone
 *   18 — Robi
 *   19 — Banglalink
 *
 * Accepted input shapes:
 *   01712345678      — local 11-digit
 *   +8801712345678   — international
 *   880 1712 345678  — spaces / dashes / parens anywhere
 *   8801712345678    — no +
 *
 * All normalise to E.164: `+8801XXXXXXXXX`.
 */

const BD_MOBILE_RE = /^1[3-9]\d{8}$/;

export interface BdPhone {
  e164: string;   // +8801XXXXXXXXX
  local: string;  // 01XXXXXXXXX
  operator: 'gp' | 'banglalink' | 'teletalk' | 'airtel' | 'robi';
}

const OPERATOR_BY_PREFIX: Record<string, BdPhone['operator']> = {
  '13': 'gp',
  '14': 'banglalink',
  '15': 'teletalk',
  '16': 'airtel',
  '17': 'gp',
  '18': 'robi',
  '19': 'banglalink',
};

export function parseBdPhone(raw: string): BdPhone | null {
  if (!raw) return null;
  // Strip everything that isn't a digit or leading +.
  const digits = raw.replace(/[^\d]/g, '');
  let mobile: string | null = null;

  if (digits.startsWith('880') && digits.length === 13) {
    mobile = digits.slice(3); // drop country code
  } else if (digits.startsWith('0') && digits.length === 11) {
    mobile = digits.slice(1); // drop leading 0
  } else if (digits.length === 10) {
    mobile = digits;
  }

  if (!mobile || !BD_MOBILE_RE.test(mobile)) return null;

  const prefix = mobile.slice(0, 2);
  const operator = OPERATOR_BY_PREFIX[prefix];
  if (!operator) return null;

  return {
    e164: `+880${mobile}`,
    local: `0${mobile}`,
    operator,
  };
}

export function isValidBdPhone(raw: string): boolean {
  return parseBdPhone(raw) !== null;
}
