// Shared helpers for displaying journal metrics that may be unknown (null).
// Rule: an unknown value is shown as a dash, never replaced by a default number.

export const DASH = '—';

export function fmtNum(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || !Number.isFinite(value) ? DASH : value.toFixed(digits);
}

export function fmtInt(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined || !Number.isFinite(value) ? DASH : `${Math.round(value)}${suffix}`;
}

export function fmtApc(apcUsd: number | null | undefined): string {
  if (apcUsd === null || apcUsd === undefined || !Number.isFinite(apcUsd)) return 'APC unknown';
  if (apcUsd === 0) return '$0 Free';
  return `$${apcUsd.toLocaleString()}`;
}

export function isKnown(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

/** Sort comparator that always puts unknown values last, whatever the sort order. */
export function compareNullable(a: number | null | undefined, b: number | null | undefined, order: 'asc' | 'desc'): number {
  const ka = isKnown(a);
  const kb = isKnown(b);
  if (!ka && !kb) return 0;
  if (!ka) return 1;
  if (!kb) return -1;
  return order === 'asc' ? a - b : b - a;
}

/** True when a known route to a free or reduced APC exists (no APC, or a stated waiver, discount or agreement). */
export function hasWaiverRoute(j: { apcUsd: number | null; accessModel: string; waiverPolicy: string }): boolean {
  if (j.apcUsd === 0 || j.accessModel === 'Diamond OA') return true;
  const w = (j.waiverPolicy || '').toLowerCase();
  if (!w) return false;
  if (/\byes\b|agreement|read-and-publish|full hinari|50% lmic|case-by-case|subsidi[sz]ed|zero oa fee/.test(w)) return true;
  return false;
}

const REGION_BY_COUNTRY: Record<string, 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America' | 'Africa & Middle East'> = {};
const add = (region: keyof typeof REGION_LISTS) => REGION_LISTS[region].forEach((c) => (REGION_BY_COUNTRY[c] = region));
const REGION_LISTS = {
  'North America': ['United States', 'Canada'],
  Europe: [
    'United Kingdom', 'Ireland', 'Germany', 'France', 'Netherlands', 'Belgium', 'Luxembourg', 'Switzerland', 'Austria',
    'Italy', 'Spain', 'Portugal', 'Greece', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland', 'Poland', 'Czech Republic',
    'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia', 'Serbia', 'Bosnia and Herzegovina', 'North Macedonia',
    'Albania', 'Montenegro', 'Estonia', 'Latvia', 'Lithuania', 'Ukraine', 'Belarus', 'Russian Federation', 'Russia', 'Cyprus',
    'Malta', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan',
  ],
  'Asia-Pacific': [
    'Indonesia', 'Malaysia', 'Singapore', 'Thailand', 'Viet Nam', 'Vietnam', 'Philippines', 'Myanmar', 'Cambodia', 'Laos',
    'Brunei Darussalam', 'Timor-Leste', 'China', 'Hong Kong', 'Taiwan', 'Japan', 'South Korea', 'Korea, Republic of',
    'India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan', 'Maldives', 'Afghanistan', 'Mongolia', 'Kazakhstan',
    'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Australia', 'New Zealand', 'Papua New Guinea', 'Fiji',
  ],
  'Latin America': [
    'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay',
    'Cuba', 'Costa Rica', 'Panama', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Dominican Republic', 'Puerto Rico',
    'Jamaica', 'Trinidad and Tobago', 'Barbados',
  ],
  'Africa & Middle East': [
    'South Africa', 'Nigeria', 'Kenya', 'Ethiopia', 'Ghana', 'Uganda', 'Tanzania', 'Egypt', 'Morocco', 'Tunisia', 'Algeria',
    'Cameroon', 'Rwanda', 'Zimbabwe', 'Zambia', 'Malawi', 'Senegal', 'Sudan', 'Botswana', 'Namibia', 'Mozambique',
    'Turkey', 'Iran', 'Iraq', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Jordan',
    'Lebanon', 'Israel', 'Palestine', 'Syrian Arab Republic', 'Yemen',
  ],
} as const;
(Object.keys(REGION_LISTS) as Array<keyof typeof REGION_LISTS>).forEach(add);

export function regionForCountry(
  country: string | undefined
): 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America' | 'Africa & Middle East' | 'Global / Multilateral' {
  return (country && REGION_BY_COUNTRY[country.trim()]) || 'Global / Multilateral';
}
