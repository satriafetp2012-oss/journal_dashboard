import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  HEALTH_JOURNALS,
  HealthJournal,
  JournalTier,
  AccessModel,
  WaiverPolicy,
  OpenAlexPaper,
  SubmissionGuidelines,
} from './src/data/journals.ts';
import { regionForCountry } from './src/lib/format.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE_PATH = path.resolve(__dirname, '.journals-db.json');

function loadPersistedCatalog(): HealthJournal[] {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load persisted journal catalog, using default seed:', err);
  }
  return [...HEALTH_JOURNALS];
}

let activeCatalog: HealthJournal[] = loadPersistedCatalog();

function saveCatalogToDisk(journals: HealthJournal[]): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(journals, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist journal catalog to disk:', err);
  }
}

function getAllJournals(): HealthJournal[] {
  return activeCatalog;
}

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
function withoutEmpty<T extends Record<string, unknown>>(obj: T | undefined): Partial<T> {
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

type IncomingJournal = Omit<Partial<HealthJournal>, 'guidelines'> & { guidelines?: Partial<SubmissionGuidelines> };

function buildNormalizedJournal(body: IncomingJournal, indexOffset = 0): HealthJournal {
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

function nr(v: number | null | undefined, suffix = ''): string {
  return v === null || v === undefined ? 'not reported' : `${v}${suffix}`;
}

const MATCHER_MAX_CANDIDATES = 120;

/**
 * Narrows a large catalog to the most relevant candidates before it is sent to Gemini,
 * so the prompt stays small even with thousands of journals.
 * Hard constraints first (tier, known APC within budget, waiver route), then keyword overlap.
 */
function shortlistForMatcher(
  journals: HealthJournal[],
  opts: { text: string; maxApcUsd: number; preferredTiers: string[]; requireWaiverOrZeroApc: boolean }
): HealthJournal[] {
  if (journals.length <= MATCHER_MAX_CANDIDATES) return journals;
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'among', 'study', 'using', 'based', 'between', 'into', 'were', 'was', 'are', 'its', 'their', 'our', 'in', 'of', 'on', 'to', 'a', 'an']);
  const terms = Array.from(
    new Set(
      opts.text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3 && !stop.has(t))
    )
  );
  const pool = journals.filter((j) => {
    if (opts.preferredTiers.length && !opts.preferredTiers.includes(j.tier)) return false;
    if (j.apcUsd !== null && j.apcUsd > opts.maxApcUsd && j.accessModel !== 'Hybrid' && j.accessModel !== 'Subscription') return false;
    if (opts.requireWaiverOrZeroApc) {
      const w = (j.waiverPolicy || '').toLowerCase();
      const free = j.apcUsd === 0 || j.accessModel === 'Diamond OA' || j.accessModel === 'Hybrid';
      if (!free && !/\byes\b|agreement|read-and-publish|hinari|50% lmic|case-by-case|subsidi[sz]ed/.test(w)) return false;
    }
    return true;
  });
  const tierBonus: Record<string, number> = { Q1: 0.4, Q2: 0.3, Q3: 0.2, Q4: 0.1, NR: 0 };
  const scored = pool.map((j) => {
    const hay = `${j.title} ${j.subjectPrimary} ${j.subjects.join(' ')} ${j.scopeSummary} ${j.keyTopics.join(' ')}`.toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    return { j, score: score + (tierBonus[j.tier] ?? 0) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MATCHER_MAX_CANDIDATES).map((x) => x.j);
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 1. Get full catalog of health journals
  app.get('/api/journals', (_req, res) => {
    res.json({ journals: getAllJournals() });
  });

  // 2. Add a single custom or regional journal to the active catalog
  app.post('/api/journals', (req, res) => {
    try {
      const body = req.body as IncomingJournal;
      if (!body.title || !body.tier || !body.country || !body.subjectPrimary) {
        res.status(400).json({ error: 'Title, Tier, Country, and Primary Subject are required.' });
        return;
      }

      const newJournal = buildNormalizedJournal(body, 0);
      activeCatalog = [newJournal, ...activeCatalog];
      saveCatalogToDisk(activeCatalog);
      res.status(201).json({ journal: newJournal, totalCount: activeCatalog.length });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create journal entry';
      res.status(500).json({ error: msg });
    }
  });

  // 2b. Bulk import / update journal database from uploaded XLS, XLSX, or CSV parsed records
  app.post('/api/journals/bulk', (req, res) => {
    try {
      const { journals: incomingRows, mode = 'merge', offset = 0 } = req.body as {
        journals?: IncomingJournal[];
        mode?: 'merge' | 'replace';
        offset?: number;
      };

      if (!Array.isArray(incomingRows) || incomingRows.length === 0) {
        res.status(400).json({ error: 'No valid journal rows found in uploaded file.' });
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;

      if (mode === 'replace') {
        const normalizedList = incomingRows
          .filter((r) => r && r.title && String(r.title).trim().length > 0)
          .map((row, idx) => buildNormalizedJournal(row, offset + idx));

        if (normalizedList.length === 0) {
          res.status(400).json({ error: 'Uploaded file did not contain any rows with a valid journal title.' });
          return;
        }

        addedCount = normalizedList.length;
        activeCatalog = normalizedList;
      } else {
        // Merge mode: match existing by normalized ISSN or lowercase Title
        const updatedCatalog = [...activeCatalog];

        incomingRows.forEach((row, idx) => {
          if (!row || !row.title || !String(row.title).trim()) return;
          const cleanTitle = String(row.title).trim().toLowerCase();
          const cleanIssns = String(row.issn || '')
            .split(/[,;]/)
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);

          const existingIdx = updatedCatalog.findIndex((existing) => {
            const titleMatch = existing.title.trim().toLowerCase() === cleanTitle;
            const issnMatch = cleanIssns.some(
              (x) => x === (existing.issn || '').toLowerCase() || x === (existing.eissn || '').toLowerCase()
            );
            return titleMatch || Boolean(issnMatch);
          });

          if (existingIdx !== -1) {
            const current = updatedCatalog[existingIdx];
            // Only values present in the upload overwrite; blanks keep what is already stored.
            const merged = buildNormalizedJournal(
              {
                ...current,
                ...withoutEmpty(row as Record<string, unknown>),
                id: current.id,
                guidelines: {
                  ...current.guidelines,
                  ...withoutEmpty(row.guidelines as Record<string, unknown>),
                },
              },
              offset + idx
            );
            updatedCatalog[existingIdx] = merged;
            updatedCount++;
          } else {
            const created = buildNormalizedJournal(row, offset + idx);
            updatedCatalog.unshift(created);
            addedCount++;
          }
        });

        activeCatalog = updatedCatalog;
      }

      saveCatalogToDisk(activeCatalog);
      res.status(200).json({
        journals: activeCatalog,
        summary: {
          mode,
          addedCount,
          updatedCount,
          totalCount: activeCatalog.length,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to process bulk journal database update.';
      res.status(500).json({ error: msg });
    }
  });

  // 2c. Reset journal database back to default curated seed
  app.post('/api/journals/reset', (_req, res) => {
    activeCatalog = [...HEALTH_JOURNALS];
    saveCatalogToDisk(activeCatalog);
    res.json({
      journals: activeCatalog,
      summary: {
        totalCount: activeCatalog.length,
      },
    });
  });

  // 3. OpenAlex Real-Time Bibliographic Search (ported from GAS findSimilarPapers)
  app.post('/api/openalex/similar', async (req, res) => {
    try {
      const { query } = req.body as { query?: string };
      if (!query || query.trim().length < 3) {
        res.status(400).json({ error: 'Please provide a search query, title, or keywords.' });
        return;
      }

      const cleanQuery = query.trim().slice(0, 240);
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(cleanQuery)}&per-page=8&sort=relevance_score:desc`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GlobalHealthJournalAtlas/1.0 (mailto:research@globalhealthatlas.org)',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `OpenAlex API returned status ${response.status}` });
        return;
      }

      const data = (await response.json()) as {
        results?: Array<{
          id?: string;
          title?: string;
          publication_year?: number;
          cited_by_count?: number;
          doi?: string | null;
          open_access?: { is_oa?: boolean };
          primary_location?: {
            source?: {
              display_name?: string;
              issn_l?: string | null;
            };
          };
          authorships?: Array<{
            author?: { display_name?: string };
          }>;
        }>;
      };

      const papers: OpenAlexPaper[] = (data.results || []).map((item) => ({
        id: item.id || String(Math.random()),
        title: item.title || 'Untitled Research Article',
        publicationYear: item.publication_year || 2025,
        citedByCount: item.cited_by_count || 0,
        doi: item.doi || null,
        journalName: item.primary_location?.source?.display_name || 'International Health Venue',
        issn: item.primary_location?.source?.issn_l || null,
        isOpenAccess: Boolean(item.open_access?.is_oa),
        authors: (item.authorships || [])
          .slice(0, 4)
          .map((a) => a.author?.display_name || '')
          .filter(Boolean),
      }));

      res.json({ papers });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to query OpenAlex bibliographic database.';
      res.status(500).json({ error: msg });
    }
  });

  // 4. AI Manuscript Matcher (Title + Abstract + Keywords + Budget/Tier constraints -> Gemini 4 Hydrogen)
  app.post('/api/ai/suggest-journals', async (req, res) => {
    try {
      const {
        title = '',
        abstract = '',
        keywords = '',
        maxApcUsd = 6000,
        preferredTiers = ['Q1', 'Q2', 'Q3', 'Q4'],
        requireWaiverOrZeroApc = false,
      } = req.body as {
        title?: string;
        abstract?: string;
        keywords?: string;
        maxApcUsd?: number;
        preferredTiers?: string[];
        requireWaiverOrZeroApc?: boolean;
      };

      if (!title.trim() && !abstract.trim() && !keywords.trim()) {
        res.status(400).json({ error: 'Please provide at least a manuscript title, abstract, or keywords.' });
        return;
      }

      const ai = getGenAIClient();
      const allJournals = shortlistForMatcher(getAllJournals(), {
        text: `${title} ${keywords} ${abstract}`,
        maxApcUsd,
        preferredTiers,
        requireWaiverOrZeroApc,
      });

      // Filter candidate pool or pass full catalog with constraints noted
      const catalogContext = allJournals.map((j) => ({
        journalId: j.id,
        title: j.title,
        tier: j.tier,
        impactFactor: j.impactFactor,
        citeScore: j.citeScore,
        apcUsd: j.apcUsd,
        accessModel: j.accessModel,
        waiverPolicy: j.waiverPolicy,
        subjectPrimary: j.subjectPrimary,
        country: j.country,
        acceptanceRatePct: j.acceptanceRatePct,
        firstDecisionDays: j.firstDecisionDays,
        scopeSummary: j.scopeSummary,
        reportingStandards: j.guidelines.reportingStandards,
      }));

      const prompt = `You are a Senior Editorial Advisor for International Public Health, Field Epidemiology (FETP), and Clinical Medicine journals.
Analyze the researcher's manuscript submission details below and recommend the top 4 most suitable journals from the provided catalog.

RESEARCHER MANUSCRIPT INPUT:
- Title: ${title || '(Not provided)'}
- Abstract: ${abstract || '(Not provided)'}
- Keywords: ${keywords || '(Not provided)'}

RESEARCHER CONSTRAINTS:
- Maximum APC Budget: $${maxApcUsd} USD
- Preferred Quartile Tiers: ${preferredTiers.join(', ')}
- Requires LMIC Waiver or $0 Diamond OA / Hybrid: ${requireWaiverOrZeroApc ? 'YES (Prioritize $0 APC, Hybrid, or Full HINARI/Research4Life Waiver journals)' : 'No strict waiver requirement'}

AVAILABLE JOURNAL CATALOG (Use exact journalId values from this list; null means the value is not reported — do not assume or invent it):
${JSON.stringify(catalogContext, null, 2)}

Provide a rigorous, constructive epidemiological and editorial assessment. Ensure all recommended journalId values exist in the catalog above.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedStudyDesign: {
                type: Type.STRING,
                description: 'Detected epidemiological or clinical study design (e.g., Outbreak Investigation, Retrospective Cohort, Cluster RCT, Systematic Review & Meta-Analysis, Cross-Sectional Surveillance).',
              },
              detectedMeSHKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '5 to 7 standardized MeSH / DeCS medical subject headings extracted from the input.',
              },
              manuscriptReadinessSummary: {
                type: Type.STRING,
                description: '2-3 sentence editorial evaluation of the manuscript topic, public health novelty, and methodological framing.',
              },
              recommendedReportingGuideline: {
                type: Type.STRING,
                description: 'Primary EQUATOR network reporting checklist required (e.g., STROBE, CONSORT, PRISMA 2020, ORION, RECORD, COREQ) and why.',
              },
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    journalId: {
                      type: Type.STRING,
                      description: 'Exact journalId from the provided catalog.',
                    },
                    matchScore: {
                      type: Type.INTEGER,
                      description: 'Alignment score from 65 to 99.',
                    },
                    fitCategory: {
                      type: Type.STRING,
                      description: 'Must be one of: "Target Reach (Ambitious)", "Primary Best Fit", or "High-Acceptance Safe Fit".',
                    },
                    scopeAlignmentRationale: {
                      type: Type.STRING,
                      description: 'Specific explanation of why this manuscript fits this journal scope and readership.',
                    },
                    strengthsForJournal: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '2 to 3 specific reasons editors at this journal will value this manuscript.',
                    },
                    methodologyAndReportingAdvice: {
                      type: Type.STRING,
                      description: 'Concrete formatting or methodological adjustment needed before submitting to this specific journal.',
                    },
                    apcAndWaiverStrategy: {
                      type: Type.STRING,
                      description: 'Advice on managing APC cost, Diamond OA status, Hybrid option, or Research4Life/LMIC waiver for this journal.',
                    },
                    estimatedReviewTimeline: {
                      type: Type.STRING,
                      description: 'Expected first decision and publication timeline notes.',
                    },
                  },
                  required: [
                    'journalId',
                    'matchScore',
                    'fitCategory',
                    'scopeAlignmentRationale',
                    'strengthsForJournal',
                    'methodologyAndReportingAdvice',
                    'apcAndWaiverStrategy',
                    'estimatedReviewTimeline',
                  ],
                },
              },
            },
            required: [
              'detectedStudyDesign',
              'detectedMeSHKeywords',
              'manuscriptReadinessSummary',
              'recommendedReportingGuideline',
              'matches',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to generate AI journal recommendations.';
      res.status(500).json({ error: msg });
    }
  });

  // 5. Automated Impact Factor Analysis & Submission Readiness Brief (Gemini 4 Hydrogen)
  app.post('/api/ai/impact-analysis', async (req, res) => {
    try {
      const { journalId, researcherContext = '' } = req.body as {
        journalId?: string;
        researcherContext?: string;
      };

      const journal = getAllJournals().find((j) => j.id === journalId);
      if (!journal) {
        res.status(404).json({ error: 'Selected journal not found in catalog.' });
        return;
      }

      const ai = getGenAIClient();
      const prompt = `You are a Scientometrics & Academic Publishing Strategist for global health researchers.
Perform an automated Impact Factor & Citation Trajectory analysis for the following journal:

JOURNAL PROFILE:
- Title: ${journal.title} (${journal.abbreviation})
- Publisher: ${journal.publisher} (${journal.country})
- Quartile Tier: ${journal.tier} | SJR: ${nr(journal.sjrScore)} | JIF: ${nr(journal.impactFactor)} | 5-Year JIF: ${nr(journal.fiveYearImpactFactor)} | CiteScore: ${nr(journal.citeScore)} | H-Index: ${nr(journal.hIndex)}
- APC: ${journal.apcUsd === null ? 'not reported' : `$${journal.apcUsd} USD`} (${journal.accessModel} — ${journal.waiverPolicy || 'waiver policy not reported'})
- Acceptance Rate: ${nr(journal.acceptanceRatePct, '%')} | First Decision: ${nr(journal.firstDecisionDays, ' days')} | Total Publication Time: ${nr(journal.publicationTimeDays, ' days')}
- 5-Year Impact History (2021-2025): ${journal.impactHistory.length ? JSON.stringify(journal.impactHistory) : 'not reported'}
(Values marked "not reported" are unknown. Do not estimate or invent them.)
- Scope: ${journal.scopeSummary}
- Submission Guidelines: ${JSON.stringify(journal.guidelines)}
${researcherContext ? `- Researcher Target Context: ${researcherContext}` : ''}

Generate a structured scientometric impact analysis and actionable submission strategy.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              journalId: { type: Type.STRING },
              executiveTrajectory: {
                type: Type.STRING,
                description: 'Analysis of the journal 2021-2025 JIF and CiteScore trend (including post-pandemic normalization and 5-year JIF stability).',
              },
              citationVelocityAssessment: {
                type: Type.STRING,
                description: 'Evaluation of citation half-life, CiteScore-to-JIF ratio, and global visibility across SCIE/Scopus/MEDLINE.',
              },
              tierStabilityForecast: {
                type: Type.STRING,
                description: 'Forecast of quartile (Q1-Q4) standing over the next 2-3 JCR cycles.',
              },
              apcRoiEvaluation: {
                type: Type.STRING,
                description: 'Cost-effectiveness comparison of its APC ($USD), waiver policy, acceptance rate, and turnaround speed for global/LMIC authors.',
              },
              strategicPositioningTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 4 concrete editorial tips to maximize desk-review survival at this journal.',
              },
              submissionReadinessChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 specific pre-submission compliance checks tailored to this journal.',
              },
            },
            required: [
              'journalId',
              'executiveTrajectory',
              'citationVelocityAssessment',
              'tierStabilityForecast',
              'apcRoiEvaluation',
              'strategicPositioningTips',
              'submissionReadinessChecklist',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to run automated impact factor analysis.';
      res.status(500).json({ error: msg });
    }
  });

  let viteMiddleware: express.RequestHandler | null = null;

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.use((req, res, next) => {
      if (viteMiddleware) {
        viteMiddleware(req, res, next);
      } else {
        res.status(503).send('Vite dev server is initializing...');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlobalHealth Journal Atlas server running on http://0.0.0.0:${PORT}`);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    viteMiddleware = vite.middlewares;
  }
}

startServer();
