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
} from './src/data/journals.ts';

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
  return 'Q2';
}

function normalizeAccessModel(raw?: string, apcUsd = 0): AccessModel {
  const val = String(raw || '').trim().toLowerCase();
  if (val.includes('diamond') || (apcUsd === 0 && !val.includes('hybrid') && !val.includes('sub'))) {
    return 'Diamond OA';
  }
  if (val.includes('hybrid')) return 'Hybrid';
  if (val.includes('sub')) return 'Subscription';
  return 'Gold OA';
}

function normalizeWaiverPolicy(raw?: string, apcUsd = 0, accessModel?: AccessModel): WaiverPolicy {
  const val = String(raw || '').trim().toLowerCase();
  if (apcUsd === 0 || val.includes('100% free') || val.includes('no apc') || accessModel === 'Diamond OA') {
    return '100% Free (No APC)';
  }
  if (accessModel === 'Hybrid' || val.includes('subscription')) {
    return 'Standard Subscription (Zero OA Fee)';
  }
  if (val.includes('hinari') || val.includes('research4life') || val.includes('full')) {
    return 'Full HINARI / Research4Life A&B Waiver';
  }
  if (val.includes('50%') || val.includes('discount')) {
    return '50% LMIC Discount';
  }
  return 'Case-by-Case Institutional Waiver';
}

function buildNormalizedJournal(body: Partial<HealthJournal>, indexOffset = 0): HealthJournal {
  const title = (body.title || 'Untitled Health Journal').trim();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 36);
  const id = body.id?.trim() || `${slug || 'journal'}-${Date.now()}-${indexOffset}`;
  const tier = normalizeTier(body.tier);
  const jif = Number.isFinite(Number(body.impactFactor)) && Number(body.impactFactor) >= 0 ? Number(body.impactFactor) : 1.8;
  const citeScore =
    Number.isFinite(Number(body.citeScore)) && Number(body.citeScore) >= 0
      ? Number(body.citeScore)
      : Number((jif * 1.7).toFixed(1));
  const apcUsd = Number.isFinite(Number(body.apcUsd)) && Number(body.apcUsd) >= 0 ? Number(body.apcUsd) : 0;
  const accessModel = normalizeAccessModel(body.accessModel, apcUsd);
  const waiverPolicy = normalizeWaiverPolicy(body.waiverPolicy, apcUsd, accessModel);
  const subjectPrimary = body.subjectPrimary?.trim() || 'Public, Environmental & Occupational Health';
  const country = body.country?.trim() || 'Global / Multilateral';

  return {
    id,
    title,
    abbreviation: body.abbreviation?.trim() || title.slice(0, 28),
    issn: body.issn?.trim() || '2049-3630',
    eissn: body.eissn?.trim() || body.issn?.trim() || '2049-3630',
    publisher: body.publisher?.trim() || 'International Academic Press',
    tier,
    sjrScore:
      Number.isFinite(Number(body.sjrScore)) && Number(body.sjrScore) > 0
        ? Number(body.sjrScore)
        : Number((jif * 0.42).toFixed(2)),
    impactFactor: jif,
    fiveYearImpactFactor:
      Number.isFinite(Number(body.fiveYearImpactFactor)) && Number(body.fiveYearImpactFactor) > 0
        ? Number(body.fiveYearImpactFactor)
        : Number((jif * 1.2).toFixed(1)),
    citeScore,
    hIndex: Number.isFinite(Number(body.hIndex)) && Number(body.hIndex) > 0 ? Number(body.hIndex) : 48,
    apcUsd,
    accessModel,
    waiverPolicy,
    subjectPrimary,
    subjects:
      Array.isArray(body.subjects) && body.subjects.length > 0
        ? body.subjects
        : [subjectPrimary],
    country,
    region: body.region || 'Global / Multilateral',
    indexing:
      Array.isArray(body.indexing) && body.indexing.length > 0
        ? body.indexing
        : ['Scopus', 'MEDLINE', 'DOAJ'],
    acceptanceRatePct:
      Number.isFinite(Number(body.acceptanceRatePct)) && Number(body.acceptanceRatePct) > 0
        ? Number(body.acceptanceRatePct)
        : 28,
    firstDecisionDays:
      Number.isFinite(Number(body.firstDecisionDays)) && Number(body.firstDecisionDays) > 0
        ? Number(body.firstDecisionDays)
        : 30,
    publicationTimeDays:
      Number.isFinite(Number(body.publicationTimeDays)) && Number(body.publicationTimeDays) > 0
        ? Number(body.publicationTimeDays)
        : 75,
    scopeSummary:
      body.scopeSummary?.trim() ||
      `Publishes peer-reviewed international research in ${subjectPrimary.toLowerCase()} and health policy.`,
    keyTopics:
      Array.isArray(body.keyTopics) && body.keyTopics.length > 0
        ? body.keyTopics
        : [subjectPrimary, 'Public Health', 'Epidemiology'],
    impactHistory:
      Array.isArray(body.impactHistory) && body.impactHistory.length === 5
        ? body.impactHistory
        : [
            { year: 2021, jif: Number((jif * 0.85).toFixed(1)), citeScore: Number((citeScore * 0.85).toFixed(1)) },
            { year: 2022, jif: Number((jif * 1.15).toFixed(1)), citeScore: Number((citeScore * 1.1).toFixed(1)) },
            { year: 2023, jif: Number((jif * 1.08).toFixed(1)), citeScore: Number((citeScore * 1.05).toFixed(1)) },
            { year: 2024, jif: Number((jif * 1.02).toFixed(1)), citeScore: Number((citeScore * 1.01).toFixed(1)) },
            { year: 2025, jif, citeScore },
          ],
    guidelines: body.guidelines || {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,500 words (Original Research)',
      maxReferences: 40,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Institutional Review Board (IRB) or National Ethics Committee approval number required',
        'Informed consent declaration in Methods section',
      ],
      dataSharingPolicy: 'Data Availability Statement required prior to references.',
      coverLetterChecklist: [
        'Summarize public health significance and novelty',
        'Confirm all authors approved the submission and declare conflicts of interest',
      ],
      preprintPolicy: 'Permits preprint submissions on medRxiv and bioRxiv.',
      authorPortalUrl: 'https://www.equator-network.org/',
    },
  };
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
      const body = req.body as Partial<HealthJournal>;
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
      const { journals: incomingRows, mode = 'merge' } = req.body as {
        journals?: Array<Partial<HealthJournal>>;
        mode?: 'merge' | 'replace';
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
          .map((row, idx) => buildNormalizedJournal(row, idx));

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
          const cleanIssn = row.issn ? String(row.issn).trim().toLowerCase() : '';

          const existingIdx = updatedCatalog.findIndex((existing) => {
            const titleMatch = existing.title.trim().toLowerCase() === cleanTitle;
            const issnMatch =
              cleanIssn &&
              cleanIssn !== '2049-3630' &&
              (existing.issn.toLowerCase() === cleanIssn || existing.eissn.toLowerCase() === cleanIssn);
            return titleMatch || Boolean(issnMatch);
          });

          if (existingIdx !== -1) {
            const current = updatedCatalog[existingIdx];
            const merged = buildNormalizedJournal(
              {
                ...current,
                ...row,
                id: current.id,
                guidelines: {
                  ...current.guidelines,
                  ...(row.guidelines || {}),
                },
              },
              idx
            );
            updatedCatalog[existingIdx] = merged;
            updatedCount++;
          } else {
            const created = buildNormalizedJournal(row, idx);
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
      const allJournals = getAllJournals();

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

AVAILABLE JOURNAL CATALOG (Use exact journalId values from this list):
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
- Quartile Tier: ${journal.tier} | SJR: ${journal.sjrScore} | JIF: ${journal.impactFactor} | 5-Year JIF: ${journal.fiveYearImpactFactor} | CiteScore: ${journal.citeScore} | H-Index: ${journal.hIndex}
- APC: $${journal.apcUsd} USD (${journal.accessModel} — ${journal.waiverPolicy})
- Acceptance Rate: ${journal.acceptanceRatePct}% | First Decision: ${journal.firstDecisionDays} days | Total Publication Time: ${journal.publicationTimeDays} days
- 5-Year Impact History (2021-2025): ${JSON.stringify(journal.impactHistory)}
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
