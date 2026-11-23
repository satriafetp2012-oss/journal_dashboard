// Shared journal normalisation, used by the browser (catalog loading, spreadsheet import)
// and by server.ts. Rule: unknown values stay null / empty. Nothing is estimated.
import type {
  HealthJournal,
  JournalTier,
  AccessModel,
  WaiverPolicy,
  SubmissionGuidelines,
} from '../data/journals';
import { regionForCountry } from './format';

function normalizeTier(raw?: string): JournalTier {
  const val = String(raw || '').trim().toUpperCase();
  if (val.includes('Q1') || val === '1') return 'Q1';
  if (val.includes('Q2') || val === '2') return 'Q2';
  if (val.includes('Q3') || val === '3') return 'Q3';
  if (val.includes('Q4') || val === '4') return 'Q4';
  return 'NR'; // not ranked / not reported: never guess a quartile
}

function normalizeAccessModel(raw?: string, apcUsd: number | null = null): AccessModel {
  const val = String(raw || '').trim().toLowerCase();
  if (val.includes('diamond')) return 'Diamond OA';
  if (val.includes('hybrid')) return 'Hybrid';
  if (val.includes('sub')) return 'Subscription';
  if (val.includes('gold') || val.includes('open')) return 'Gold OA';
  if (apcUsd === 0) return 'Diamond OA';
  return 'Gold OA';
}

/** Keeps the waiver / discount text as supplied. Only a known $0 APC is labelled free. */
function normalizeWaiverPolicy(raw: string | undefined, apcUsd: number | null, accessModel: AccessModel): WaiverPolicy {
  const val = String(raw || '').trim();
  if (val) return val;
  if (apcUsd === 0 || accessModel === 'Diamond OA') return '100% Free (No APC)';
  return '';
}

/** A finite, non-negative number, or null when missing / unparseable. Zero only counts when allowZero is set. */
function numOrNull(v: unknown, allowZero = false): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0 && !allowZero) return null;
  return n;
}

function cleanString(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Drops null / empty values so a merge never overwrites known data with "unknown". */
export function withoutEmpty<T extends Record<string, unknown>>(obj: T | undefined): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
    )
  ) as Partial<T>;
}

// Journal-specific guideline fields default to null ("not recorded"), never to invented values.
// Only the generic good-practice checklists have defaults.
const UNKNOWN_GUIDELINES: SubmissionGuidelines = {
  reportingStandards: [],
  wordLimitAbstract: null,
  wordLimitMainText: null,
  maxReferences: null,
  maxTablesFigures: null,
  referenceStyle: null,
  blindingPolicy: null,
  ethicsRequirements: [
    'Ethics committee approval number and informed consent statement (check the journal\'s own policy)',
  ],
  dataSharingPolicy: null,
  coverLetterChecklist: [
    'Summarize the public health significance and novelty of the work',
    'Confirm all authors approved the submission and declare competing interests',
  ],
  preprintPolicy: null,
  authorPortalUrl: '',
};

export type IncomingJournal = Omit<Partial<HealthJournal>, 'guidelines'> & { guidelines?: Partial<SubmissionGuidelines> };

export function buildNormalizedJournal(body: IncomingJournal, indexOffset = 0): HealthJournal {
  const title = cleanString(body.title) || 'Untitled Health Journal';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 36);
  const id = cleanString(body.id) || `${slug || 'journal'}-${Date.now()}-${indexOffset}`;
  const tier = normalizeTier(body.tier);
  const apcUsd = numOrNull(body.apcUsd, true);
  const accessModel = normalizeAccessModel(body.accessModel, apcUsd);
  const waiverPolicy = normalizeWaiverPolicy(body.waiverPolicy, apcUsd, accessModel);

  // "1234-5678, 8765-4321" in one ISSN cell -> issn + eissn
  const issnParts = cleanString(body.issn).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  const issn = issnParts[0] || '';
  const eissn = cleanString(body.eissn) || issnParts[1] || issn;

  const subjectParts = cleanString(body.subjectPrimary).split(';').map((x) => x.trim()).filter(Boolean);
  const subjectPrimary = subjectParts[0] || 'Unclassified';
  const subjects =
    Array.isArray(body.subjects) && body.subjects.length > 0 ? body.subjects : subjectParts.length ? subjectParts : [subjectPrimary];
  const country = cleanString(body.country);

  return {
    id,
    title,
    abbreviation: cleanString(body.abbreviation),
    issn,
    eissn,
    publisher: cleanString(body.publisher),
    tier,
    sjrScore: numOrNull(body.sjrScore),
    impactFactor: numOrNull(body.impactFactor),
    fiveYearImpactFactor: numOrNull(body.fiveYearImpactFactor),
    citeScore: numOrNull(body.citeScore),
    hIndex: numOrNull(body.hIndex),
    apcUsd,
    accessModel,
    waiverPolicy,
    subjectPrimary,
    subjects,
    country,
    region: body.region && body.region !== 'Global / Multilateral' ? body.region : regionForCountry(country),
    indexing: Array.isArray(body.indexing) ? body.indexing : [],
    acceptanceRatePct: numOrNull(body.acceptanceRatePct),
    firstDecisionDays: numOrNull(body.firstDecisionDays),
    publicationTimeDays: numOrNull(body.publicationTimeDays),
    scopeSummary: cleanString(body.scopeSummary),
    keyTopics: Array.isArray(body.keyTopics) && body.keyTopics.length > 0 ? body.keyTopics : subjects,
    impactHistory: Array.isArray(body.impactHistory) ? body.impactHistory : [],
    guidelines: { ...UNKNOWN_GUIDELINES, ...withoutEmpty(body.guidelines as Record<string, unknown>) } as SubmissionGuidelines,
  };
}

/** Stable id for a catalog row: slug of the title plus its position in the file. */
export function catalogRowId(title: string, index: number): string {
  const slug = String(title || 'journal')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
  return `${slug || 'journal'}-${index + 1}`;
}

/**
 * Merge uploaded rows into an existing catalog: match by title or any ISSN,
 * overwrite only the values the upload actually has, and add the rest as new journals.
 */
export function mergeIntoCatalog(
  existing: HealthJournal[],
  rows: IncomingJournal[]
): { journals: HealthJournal[]; addedCount: number; updatedCount: number } {
  const catalog = [...existing];
  let addedCount = 0;
  let updatedCount = 0;
  rows.forEach((row, idx) => {
    if (!row || !row.title || !String(row.title).trim()) return;
    const cleanTitle = String(row.title).trim().toLowerCase();
    const issns = [row.issn, row.eissn]
      .flatMap((x) => String(x || '').split(/[,;]/))
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    const i = catalog.findIndex(
      (ex) =>
        ex.title.trim().toLowerCase() === cleanTitle ||
        issns.some((x) => x === (ex.issn || '').toLowerCase() || x === (ex.eissn || '').toLowerCase())
    );
    if (i !== -1) {
      const current = catalog[i];
      catalog[i] = buildNormalizedJournal(
        {
          ...current,
          ...withoutEmpty(row as Record<string, unknown>),
          id: current.id,
          guidelines: { ...current.guidelines, ...withoutEmpty(row.guidelines as Record<string, unknown>) },
        },
        idx
      );
      updatedCount++;
    } else {
      catalog.unshift(buildNormalizedJournal({ ...row, id: row.id || catalogRowId(String(row.title), existing.length + idx) }, idx));
      addedCount++;
    }
  });
  return { journals: catalog, addedCount, updatedCount };
}

/**
 * The permanent journal catalog is the static file public/catalog.json (served as /catalog.json).
 * It is part of the deployment, so it survives restarts and redeploys until the file is replaced.
 * Falls back to the built-in example journals if the file is missing.
 */
export async function loadCatalogFile(): Promise<HealthJournal[] | null> {
  try {
    const res = await fetch('/catalog.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    const rows: IncomingJournal[] = Array.isArray(data) ? data : data?.journals;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows.map((row, i) => buildNormalizedJournal({ ...row, id: row.id || catalogRowId(String(row.title), i) }, i));
  } catch {
    return null;
  }
}
