import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  FileCheck2,
  Globe2,
  BookOpen,
  ArrowUpDown,
  ExternalLink,
  Download,
  Upload,
  Plus,
  Check,
  ChevronRight,
  SlidersHorizontal,
  DollarSign,
  Clock,
  Award,
  Copy,
  RefreshCw,
  AlertCircle,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import {
  HEALTH_JOURNALS,
  SUBJECT_CATEGORIES,
  COUNTRIES_LIST,
  HealthJournal,
  JournalTier,
  AIMatcherResponse,
  AIImpactAnalysisResponse,
  OpenAlexPaper,
} from './data/journals';
import SpreadsheetImporterModal from './components/SpreadsheetImporterModal';
import { DASH, fmtNum, fmtInt, fmtApc, isKnown, compareNullable, hasWaiverRoute } from './lib/format';
import { buildNormalizedJournal, catalogRowId, loadCatalogFile } from './lib/normalize';


type WorkspaceTab = 'explorer' | 'matcher' | 'impact' | 'guidelines';

type SortField = 'impactFactor' | 'citeScore' | 'sjrScore' | 'apcUsd' | 'acceptanceRatePct' | 'firstDecisionDays';
type SortOrder = 'asc' | 'desc';

const SAMPLE_MANUSCRIPTS = [
  {
    label: 'FETP Outbreak & Genomic Surveillance',
    title: 'Genomic Epidemiology and Field Outbreak Investigation of a Community Dengue Serotype-3 Cluster in East Java, Indonesia',
    abstract:
      'Background: In early 2026, routine district surveillance detected a rapid 3.8-fold surge in hospitalized dengue hemorrhagic fever cases across three peri-urban subdistricts in East Java. Methods: Fellows from the Field Epidemiology Training Program (FETP) conducted an active house-to-house case-control investigation (180 laboratory-confirmed cases, 360 neighborhood controls), entomological Breteau index surveys, and portable nanopore whole-genome sequencing of 48 NS1-positive serum samples. Results: Whole-genome phylogenetics identified an emerging DENV-3 Genotype I lineage with two novel non-structural protein mutations. Standing uncovered domestic water containers (aOR 3.42, 95% CI: 2.15–5.44) and lack of larvicide coverage were primary risk factors. Rapid vector control reduced weekly incidence by 74% within 21 days. Conclusions: Integrating field epidemiology outbreak response with decentralized genomic surveillance enables rapid containment in resource-limited endemic settings.',
    keywords: 'Dengue virus, Outbreak investigation, Field Epidemiology Training Program, Genomic surveillance, Vector control, Indonesia',
  },
  {
    label: 'Maternal Health & LMIC Cluster RCT',
    title: 'Community Health Worker-Led Mobile Partograph and Postpartum Hemorrhage Bundle in Rural Kenya: A Pragmatic Cluster-Randomized Trial',
    abstract:
      'Background: Postpartum hemorrhage remains the leading cause of maternal mortality in sub-Saharan Africa. We evaluated whether equipping rural primary health centers and community health workers (CHWs) with an offline clinical decision-support mHealth bundle and calibrated blood-collection drapes reduces severe maternal morbidity. Methods: We conducted a pragmatic, parallel-group cluster-randomized controlled trial across 42 rural primary birthing facilities in western Kenya (21 intervention, 21 usual care), enrolling 14,820 pregnant women over 18 months. The primary composite outcome was severe postpartum hemorrhage (>1000 mL blood loss), laparotomy, or maternal death within 42 days. Results: The primary outcome occurred in 1.8% of deliveries in intervention clusters versus 3.9% in control clusters (adjusted risk ratio 0.46, 95% CI: 0.34–0.62; p<0.001). Early uterotonic administration within 15 minutes increased from 48% to 91%. Conclusions: Low-cost CHW-integrated mHealth triage bundles substantially reduce severe maternal morbidity in rural LMIC facilities.',
    keywords: 'Maternal mortality, Postpartum hemorrhage, Cluster randomized trial, Community health workers, Digital health, Global health equity',
  },
  {
    label: 'Systematic Review & NCD Policy',
    title: 'Long-Term Effectiveness of National Sugar-Sweetened Beverage Excise Taxes on Obesity and Type 2 Diabetes Incidence: A Systematic Review and Meta-Analysis',
    abstract:
      'Objectives: Over 55 jurisdictions globally have enacted fiscal excise taxes on sugar-sweetened beverages (SSBs), yet pooled longitudinal evidence on downstream metabolic clinical outcomes remains fragmented. Methods: Following PRISMA 2020 guidelines (PROSPERO CRD42026118402), we searched MEDLINE, Embase, EconLit, SciELO, and Global Index Medicus from inception through January 2026 for quasi-experimental interrupted time-series and difference-in-differences evaluations of national or municipal SSB taxes with at least 24 months follow-up. Random-effects meta-analysis and meta-regression by tax pass-through rate were performed. Results: Across 38 longitudinal population studies encompassing 112 million individuals in 19 countries, a 20% ad-valorem equivalent SSB tax was associated with a -18.4% reduction in taxed beverage purchases (95% CI: -22.1% to -14.7%) and a -3.2% relative reduction in adolescent overweight/obesity prevalence after 3 years. Low-income households experienced the largest cardiometabolic benefit. Conclusions: Tiered volumetric SSB excise taxes are a high-impact fiscal policy for NCD prevention.',
    keywords: 'Sugar-sweetened beverages, Fiscal health policy, Systematic review, Meta-analysis, Non-communicable diseases, Obesity prevention',
  },
];

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('explorer');
  const [journals, setJournals] = useState<HealthJournal[]>(HEALTH_JOURNALS);

  // Directory Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<JournalTier | 'ALL'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
  const [selectedCountry, setSelectedCountry] = useState<string>('All Countries');
  const [apcFilterMode, setApcFilterMode] = useState<'ALL' | 'ZERO_APC' | 'WAIVER_ELIGIBLE' | 'UNDER_1500' | 'UNDER_3000'>('ALL');
  const [sortField, setSortField] = useState<SortField>('impactFactor');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  // Large catalogs: render the table a page at a time.
  const ROWS_PER_PAGE = 100;
  const [visibleRowCount, setVisibleRowCount] = useState<number>(ROWS_PER_PAGE);

  // Active Journal Selection for Deep Inspection (Impact & Guidelines)
  const [selectedJournalId, setSelectedJournalId] = useState<string>(HEALTH_JOURNALS[0].id);

  // Add Custom Journal & Bulk Spreadsheet Import Modal States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [lastImportBanner, setLastImportBanner] = useState<{
    mode: 'merge' | 'replace';
    addedCount: number;
    updatedCount: number;
    totalCount: number;
  } | null>(null);
  const [newJournalForm, setNewJournalForm] = useState({
    title: '',
    abbreviation: '',
    issn: '',
    publisher: '',
    tier: 'Q1' as JournalTier,
    // Blank = unknown. Placeholder numbers here used to be saved as real data.
    impactFactor: '',
    citeScore: '',
    sjrScore: '',
    apcUsd: '',
    subjectPrimary: SUBJECT_CATEGORIES[1] as string,
    country: 'Switzerland',
    acceptanceRatePct: '',
    firstDecisionDays: '',
    scopeSummary: '',
  });
  const [isSavingJournal, setIsSavingJournal] = useState<boolean>(false);

  // AI Matcher States
  const [msTitle, setMsTitle] = useState<string>(SAMPLE_MANUSCRIPTS[0].title);
  const [msAbstract, setMsAbstract] = useState<string>(SAMPLE_MANUSCRIPTS[0].abstract);
  const [msKeywords, setMsKeywords] = useState<string>(SAMPLE_MANUSCRIPTS[0].keywords);
  const [matcherMaxApc, setMatcherMaxApc] = useState<number>(6000);
  const [matcherTiers, setMatcherTiers] = useState<JournalTier[]>(['Q1', 'Q2', 'Q3']);
  const [matcherRequireWaiver, setMatcherRequireWaiver] = useState<boolean>(false);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matcherError, setMatcherError] = useState<string | null>(null);
  const [matcherResult, setMatcherResult] = useState<AIMatcherResponse | null>(null);

  // OpenAlex Live Bibliographic Evidence States
  const [openAlexPapers, setOpenAlexPapers] = useState<OpenAlexPaper[]>([]);
  const [isLoadingOpenAlex, setIsLoadingOpenAlex] = useState<boolean>(false);

  // AI Impact Analysis States
  const [impactResearcherContext, setImpactResearcherContext] = useState<string>(
    'Evaluating target journal for a multi-district epidemiological surveillance study from an LMIC institution.'
  );
  const [isAnalyzingImpact, setIsAnalyzingImpact] = useState<boolean>(false);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [impactAnalysisCache, setImpactAnalysisCache] = useState<Record<string, AIImpactAnalysisResponse>>({});

  // Guidelines Interactive Checklist State
  const [checkedGuidelines, setCheckedGuidelines] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Load the permanent catalog file (public/catalog.json) on page load
  useEffect(() => {
    loadCatalogFile().then((catalog) => {
      if (catalog) setJournals(catalog);
    });
  }, []);

  const selectedJournal = useMemo(() => {
    return journals.find((j) => j.id === selectedJournalId) || journals[0];
  }, [journals, selectedJournalId]);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>(SUBJECT_CATEGORIES);
    journals.forEach((j) => {
      if (j.subjectPrimary) set.add(j.subjectPrimary);
      j.subjects?.forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [journals]);

  const availableCountries = useMemo(() => {
    const set = new Set<string>(COUNTRIES_LIST);
    journals.forEach((j) => {
      if (j.country) set.add(j.country);
    });
    return Array.from(set);
  }, [journals]);

  // Filtered and sorted journals
  const filteredJournals = useMemo(() => {
    return journals
      .filter((j) => {
        if (selectedTier !== 'ALL' && j.tier !== selectedTier) return false;
        if (selectedSubject !== 'All Subjects' && !j.subjects.includes(selectedSubject) && j.subjectPrimary !== selectedSubject) {
          return false;
        }
        if (selectedCountry !== 'All Countries' && j.country !== selectedCountry) return false;

        // Unknown APC (null) never counts as free or as within budget.
        if (apcFilterMode === 'ZERO_APC' && j.apcUsd !== 0 && j.accessModel !== 'Hybrid') return false;
        if (apcFilterMode === 'WAIVER_ELIGIBLE' && !hasWaiverRoute(j)) return false;
        if (apcFilterMode === 'UNDER_1500' && !(isKnown(j.apcUsd) && j.apcUsd <= 1500)) return false;
        if (apcFilterMode === 'UNDER_3000' && !(isKnown(j.apcUsd) && j.apcUsd <= 3000)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = j.title.toLowerCase().includes(q);
          const matchAbbr = j.abbreviation.toLowerCase().includes(q);
          const matchIssn = j.issn.toLowerCase().includes(q) || j.eissn.toLowerCase().includes(q);
          const matchPub = j.publisher.toLowerCase().includes(q);
          const matchTopic = j.keyTopics.some((t) => t.toLowerCase().includes(q));
          const matchScope = j.scopeSummary.toLowerCase().includes(q);
          if (!matchTitle && !matchAbbr && !matchIssn && !matchPub && !matchTopic && !matchScope) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => compareNullable(a[sortField], b[sortField], sortOrder));
  }, [journals, selectedTier, selectedSubject, selectedCountry, apcFilterMode, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    setVisibleRowCount(ROWS_PER_PAGE);
  }, [selectedTier, selectedSubject, selectedCountry, apcFilterMode, searchQuery, sortField, sortOrder]);

  // Aggregate metrics for current filtered view
  const directoryStats = useMemo(() => {
    const count = filteredJournals.length;
    if (count === 0) {
      return { count: 0, q1Count: 0, zeroApcCount: 0, medianJif: DASH, avgDecisionDays: DASH };
    }
    const q1Count = filteredJournals.filter((j) => j.tier === 'Q1').length;
    const zeroApcCount = filteredJournals.filter((j) => j.apcUsd === 0 || j.accessModel === 'Hybrid').length;
    // Summary stats use only journals where the value is known.
    const sortedJifs = filteredJournals.map((j) => j.impactFactor).filter(isKnown).sort((a, b) => a - b);
    const medianJif = sortedJifs.length ? sortedJifs[Math.floor(sortedJifs.length / 2)].toFixed(1) : DASH;
    const knownDecisions = filteredJournals.map((j) => j.firstDecisionDays).filter(isKnown);
    const avgDecisionDays = knownDecisions.length
      ? String(Math.round(knownDecisions.reduce((acc, d) => acc + d, 0) / knownDecisions.length))
      : DASH;
    return { count, q1Count, zeroApcCount, medianJif, avgDecisionDays };
  }, [filteredJournals]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'apcUsd' || field === 'firstDecisionDays' ? 'asc' : 'desc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTier('ALL');
    setSelectedSubject('All Subjects');
    setSelectedCountry('All Countries');
    setApcFilterMode('ALL');
  };

  const exportFilteredToCsv = () => {
    const headers = [
      'Title',
      'Abbreviation',
      'ISSN',
      'Publisher',
      'Tier',
      'JIF (2025)',
      '5-Year JIF',
      'CiteScore',
      'SJR',
      'APC (USD)',
      'Access Model',
      'Waiver Policy',
      'Primary Subject',
      'Country',
      'Acceptance Rate (%)',
      'First Decision (Days)',
      'Reporting Standards',
      'Portal URL',
    ];
    const rows = filteredJournals.map((j) => [
      `"${j.title.replace(/"/g, '""')}"`,
      `"${j.abbreviation}"`,
      `"${j.issn}"`,
      `"${j.publisher.replace(/"/g, '""')}"`,
      j.tier,
      j.impactFactor ?? '',
      j.fiveYearImpactFactor ?? '',
      j.citeScore ?? '',
      j.sjrScore ?? '',
      j.apcUsd ?? '',
      `"${j.accessModel}"`,
      `"${j.waiverPolicy}"`,
      `"${j.subjectPrimary}"`,
      `"${j.country}"`,
      j.acceptanceRatePct ?? '',
      j.firstDecisionDays ?? '',
      `"${j.guidelines.reportingStandards.join('; ')}"`,
      `"${j.guidelines.authorPortalUrl}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `global-health-journals-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRunMatcher = async () => {
    setIsMatching(true);
    setMatcherError(null);

    // Parallel OpenAlex bibliographic search (ported from GAS findSimilarPapers)
    const searchSeed = msTitle.trim() || msKeywords.trim() || msAbstract.trim().slice(0, 140);
    if (searchSeed.length >= 3) {
      setIsLoadingOpenAlex(true);
      fetch('/api/openalex/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchSeed }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.papers) setOpenAlexPapers(data.papers);
        })
        .catch(() => {
          setOpenAlexPapers([]);
        })
        .finally(() => setIsLoadingOpenAlex(false));
    }

    try {
      const response = await fetch('/api/ai/suggest-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: msTitle,
          abstract: msAbstract,
          keywords: msKeywords,
          maxApcUsd: matcherMaxApc,
          preferredTiers: matcherTiers.length > 0 ? matcherTiers : ['Q1', 'Q2', 'Q3', 'Q4'],
          requireWaiverOrZeroApc: matcherRequireWaiver,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze manuscript.');
      }
      setMatcherResult(data);
    } catch (err) {
      setMatcherError(err instanceof Error ? err.message : 'Unexpected error communicating with AI engine.');
    } finally {
      setIsMatching(false);
    }
  };

  const handleRunImpactAnalysis = async (journalToAnalyze: HealthJournal) => {
    setIsAnalyzingImpact(true);
    setImpactError(null);
    try {
      const response = await fetch('/api/ai/impact-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalId: journalToAnalyze.id,
          researcherContext: impactResearcherContext,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate automated impact factor analysis.');
      }
      setImpactAnalysisCache((prev) => ({
        ...prev,
        [journalToAnalyze.id]: data,
      }));
    } catch (err) {
      setImpactError(err instanceof Error ? err.message : 'Error running impact analysis.');
    } finally {
      setIsAnalyzingImpact(false);
    }
  };

  const handleCreateCustomJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJournalForm.title.trim()) return;
    setIsSavingJournal(true);
    try {
      const num = (v: string) => (v.trim() === '' ? null : Number(v));
      // Added in the browser only (the live site has no server). To keep it, download the
      // catalog file from the importer and upload it to GitHub as public/catalog.json.
      const journal = buildNormalizedJournal(
        {
          id: catalogRowId(newJournalForm.title, Date.now()),
          title: newJournalForm.title,
          abbreviation: newJournalForm.abbreviation,
          issn: newJournalForm.issn,
          publisher: newJournalForm.publisher,
          tier: newJournalForm.tier,
          impactFactor: num(newJournalForm.impactFactor),
          citeScore: num(newJournalForm.citeScore),
          sjrScore: num(newJournalForm.sjrScore),
          apcUsd: num(newJournalForm.apcUsd),
          subjectPrimary: newJournalForm.subjectPrimary,
          country: newJournalForm.country,
          acceptanceRatePct: num(newJournalForm.acceptanceRatePct),
          firstDecisionDays: num(newJournalForm.firstDecisionDays),
          scopeSummary: newJournalForm.scopeSummary,
        },
        0
      );
      setJournals((prev) => [journal, ...prev]);
      setSelectedJournalId(journal.id);
      setShowAddModal(false)
    } finally {
      setIsSavingJournal(false);
    }
  };

  const copySubmissionBrief = (journal: HealthJournal) => {
    const g = journal.guidelines;
    const text = [
      `SUBMISSION READINESS BRIEF — ${journal.title.toUpperCase()} ${journal.abbreviation ? ` (${journal.abbreviation})` : ''}`,
      `ISSN: ${journal.issn} | Publisher: ${journal.publisher} (${journal.country})`,
      `Tier: ${journal.tier} | JIF: ${fmtNum(journal.impactFactor)} | 5Y-JIF: ${fmtNum(journal.fiveYearImpactFactor)} | CiteScore: ${fmtNum(journal.citeScore)} | SJR: ${fmtNum(journal.sjrScore, 2)}`,
      `APC: ${fmtApc(journal.apcUsd)} (${journal.accessModel} · ${journal.waiverPolicy || 'waiver policy not recorded'})`,
      `Review Speed: ${fmtInt(journal.firstDecisionDays, ' days')} to 1st decision | Acceptance Rate: ${fmtInt(journal.acceptanceRatePct, '%')}`,
      ``,
      `1. FORMATTING & LENGTH LIMITS`,
      `- Abstract Limit: ${g.wordLimitAbstract ?? 'not recorded'}${g.wordLimitAbstract ? ' words' : ''}`,
      `- Main Text Limit: ${g.wordLimitMainText ?? 'not recorded'}`,
      `- Max References: ${g.maxReferences ?? 'not recorded'} (${g.referenceStyle ?? 'style not recorded'})`,
      `- Max Tables/Figures: ${g.maxTablesFigures ?? 'not recorded'}`,
      `- Peer Review Mode: ${g.blindingPolicy ?? 'not recorded'}`,
      `- Required EQUATOR Checklists: ${g.reportingStandards.join(', ') || 'not recorded'}`,
      ``,
      `2. MANDATORY ETHICS & DECLARATIONS`,
      ...g.ethicsRequirements.map((req) => `- [ ] ${req}`),
      ``,
      `3. COVER LETTER CHECKLIST`,
      ...g.coverLetterChecklist.map((item) => `- [ ] ${item}`),
      ``,
      `4. DATA SHARING & PREPRINTS`,
      `- Data Policy: ${g.dataSharingPolicy ?? 'not recorded'}`,
      `- Preprint Policy: ${g.preprintPolicy ?? 'not recorded'}`,
      `- Author Portal: ${g.authorPortalUrl || 'not recorded'}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(journal.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const inspectJournalInTab = (journalId: string, tab: WorkspaceTab) => {
    setSelectedJournalId(journalId);
    setActiveTab(tab);
  };

  const toggleMatcherTier = (t: JournalTier) => {
    setMatcherTiers((prev) => (prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]));
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 zones separated by gap-8 (Brand wordmark | 4 single-line nav links | 1 primary CTA) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#FAF8F5]/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('explorer');
          }}
          className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display whitespace-nowrap shrink-0"
        >
          GlobalHealth Journal Atlas
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('explorer')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'explorer'
                ? 'text-teal-800 dark:text-teal-300 border-teal-700 dark:border-teal-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Journal Directory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matcher')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'matcher'
                ? 'text-teal-800 dark:text-teal-300 border-teal-700 dark:border-teal-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Manuscript Matcher
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('impact')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'impact'
                ? 'text-teal-800 dark:text-teal-300 border-teal-700 dark:border-teal-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Impact Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guidelines')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'guidelines'
                ? 'text-teal-800 dark:text-teal-300 border-teal-700 dark:border-teal-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Submission Guidelines
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('matcher')}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            Match Abstract
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center justify-between gap-1 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
            activeTab === 'explorer'
              ? 'bg-teal-800 text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Directory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matcher')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
            activeTab === 'matcher'
              ? 'bg-teal-800 text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          AI Matcher
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('impact')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
            activeTab === 'impact'
              ? 'bg-teal-800 text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Impact Analysis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guidelines')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
            activeTab === 'guidelines'
              ? 'bg-teal-800 text-white'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Guidelines
        </button>
      </div>

      {/* Main Content Container */}
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Workspace Context Banner & Utility Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-7 mb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl">
            <div className="text-xs font-medium text-teal-800 dark:text-teal-400 mb-2">
              International Health &amp; Epidemiology Bibliometric Intelligence · SCIE · Scopus · MEDLINE · OpenAlex
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-display text-balance">
              {activeTab === 'explorer' && 'Global Health Journal Directory & APC Explorer'}
              {activeTab === 'matcher' && 'Manuscript Abstract & Keyword Journal Recommender'}
              {activeTab === 'impact' && 'Automated Impact Factor & Citation Trajectory Analysis'}
              {activeTab === 'guidelines' && 'Global Researcher Submission Guidelines & Compliance Matrix'}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              {activeTab === 'explorer' &&
                'Compare peer-reviewed public health, field epidemiology (FETP), tropical medicine, and clinical journals by quartile tier (Q1–Q4), Article Processing Charge (APC), LMIC Research4Life waiver eligibility, and geographic scope.'}
              {activeTab === 'matcher' &&
                'Paste your working manuscript title, structured abstract, or MeSH keywords to receive tailored journal suggestions calibrated to your methodology, turnaround timeline, and APC budget.'}
              {activeTab === 'impact' &&
                'Evaluate 5-year Journal Impact Factor (JIF) stability, CiteScore-to-JIF ratios, SJR prestige, and automated editorial ROI diagnostics for global health publishing.'}
              {activeTab === 'guidelines' &&
                'Audit journal-specific EQUATOR reporting checklists (STROBE, CONSORT, PRISMA, ORION), word and table limits, blinding rules, and LMIC authorship reflexivity requirements.'}
            </p>
          </div>

          {/* Workspace Action Toolbar (below top bar) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-700/30 dark:border-teal-500/30 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Import XLS / CSV
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Index Custom Journal
            </button>
            <button
              type="button"
              onClick={exportFilteredToCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV ({filteredJournals.length})
            </button>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle color theme"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>

        {/* Database Synchronization Banner after XLS / CSV Import */}
        {lastImportBanner && (
          <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-teal-700/40 dark:border-teal-500/40 rounded-xl flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
              <Check className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
              <span>
                <strong>Catalog updated in this browser:</strong>{' '}
                {lastImportBanner.mode === 'replace'
                  ? `Replaced catalog with ${lastImportBanner.totalCount} imported journals.`
                  : `Added ${lastImportBanner.addedCount} new journals and updated ${lastImportBanner.updatedCount} existing records (Total active catalog: ${lastImportBanner.totalCount} journals).`}{' '}
                This is temporary until you reload. To keep it, use “Download catalog.json” in the importer and upload that
                file to GitHub as <span className="font-mono">public/catalog.json</span>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastImportBanner(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =====================================================================
            VIEW 1: JOURNAL DIRECTORY & MULTI-DIMENSIONAL FILTERING
           ===================================================================== */}
        {activeTab === 'explorer' && (
          <div className="space-y-6">
            {/* Summary KPI Strip (Tabular Numerals, Clean Hairline Grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Matching Journals</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {directoryStats.count}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  of {journals.length} indexed venues
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Q1 Top-Quartile Venues</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-teal-800 dark:text-teal-400">
                  {directoryStats.q1Count}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  SCIE / Scopus top 25%
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">$0 Fee / Diamond &amp; Hybrid</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {directoryStats.zeroApcCount}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Zero compulsory author fee
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Median Impact Factor</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {directoryStats.medianJif}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  2025 JCR / Web of Science
                </div>
              </div>
              <div className="p-4 col-span-2 lg:col-span-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">Mean Time to 1st Decision</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {directoryStats.avgDecisionDays === DASH ? DASH : `${directoryStats.avgDecisionDays}d`}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Initial editorial &amp; peer cycle
                </div>
              </div>
            </div>

            {/* Filter Control Bar: Tier, APC, Subject, Country, Search */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Keyword / Title / ISSN Search */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Search Journal, Topic, Publisher, or ISSN
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g., Lancet, Outbreak, FETP, WHO, 1080-6040..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700 dark:focus:border-teal-400"
                    />
                  </div>
                </div>

                {/* Subject Filter */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Subject Discipline
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700 dark:focus:border-teal-400"
                  >
                    {availableSubjects.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country Filter */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Publisher Country
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700 dark:focus:border-teal-400"
                  >
                    {availableCountries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Button */}
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="w-full px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>

              {/* Second Row: Interactive Segmented Controls for Quartile Tier & APC Bracket */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Quartile Tier Segmented Control */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                    Quartile Tier:
                  </span>
                  <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          selectedTier === tier
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {tier === 'ALL' ? 'All Tiers' : tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* APC & Waiver Bracket Segmented Control */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                    APC &amp; Waiver Filter:
                  </span>
                  <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg gap-0.5">
                    {(
                      [
                        { id: 'ALL', label: 'All APC Models' },
                        { id: 'ZERO_APC', label: '$0 Diamond / Hybrid' },
                        { id: 'WAIVER_ELIGIBLE', label: 'LMIC / HINARI Waiver' },
                        { id: 'UNDER_1500', label: '≤ $1,500' },
                        { id: 'UNDER_3000', label: '≤ $3,000' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setApcFilterMode(mode.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          apcFilterMode === mode.id
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* High-Density Data Grid Table */}
            {filteredJournals.length === 0 ? (
              <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  No health journals match your active filter criteria
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Try broadening your APC budget threshold, selecting &ldquo;All Countries&rdquo;, or resetting the quartile tier filter.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-3.5 px-4">Journal &amp; Indexing Metadata</th>
                        <th className="py-3.5 px-3">Tier</th>
                        <th className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSort('impactFactor')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                          >
                            JIF / 5Y
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSort('citeScore')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                          >
                            CiteScore / SJR
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSort('apcUsd')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                          >
                            APC (USD) &amp; Access
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3.5 px-4">Subject &amp; Country</th>
                        <th className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSort('firstDecisionDays')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
                          >
                            Speed &amp; Accept
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      {filteredJournals.slice(0, visibleRowCount).map((journal) => {
                        const isSelected = journal.id === selectedJournalId;
                        return (
                          <tr
                            key={journal.id}
                            onClick={() => setSelectedJournalId(journal.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-teal-50/50 dark:bg-teal-950/30'
                                : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {/* Journal Title & Unboxed Typographic Metadata */}
                            <td className="py-3.5 px-4 max-w-md">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                {journal.title}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-mono">{journal.issn}</span>
                                <span aria-hidden="true">·</span>
                                <span>{journal.publisher}</span>
                                {journal.indexing.length > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {journal.indexing.join(' / ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Quartile Tier (Unboxed Semantic Typography) */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  journal.tier === 'Q1'
                                    ? 'text-teal-800 dark:text-teal-400'
                                    : journal.tier === 'Q2'
                                    ? 'text-sky-700 dark:text-sky-400'
                                    : journal.tier === 'Q3'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {journal.tier}
                              </span>
                            </td>

                            {/* Impact Factor & 5-Year JIF */}
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {fmtNum(journal.impactFactor)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                5Y: {fmtNum(journal.fiveYearImpactFactor)}
                              </div>
                            </td>

                            {/* CiteScore & SJR */}
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {fmtNum(journal.citeScore)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                SJR {fmtNum(journal.sjrScore, 2)}
                              </div>
                            </td>

                            {/* APC & Waiver Model */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div
                                className={`font-mono tabular-nums font-bold ${
                                  journal.apcUsd === 0
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {fmtApc(journal.apcUsd)}
                              </div>
                              <div
                                className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] ml-auto truncate"
                                title={journal.waiverPolicy || undefined}
                              >
                                {journal.accessModel}
                                {journal.waiverPolicy ? ` · ${journal.waiverPolicy}` : ''}
                              </div>
                            </td>

                            {/* Subject & Country */}
                            <td className="py-3.5 px-4">
                              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                {journal.subjectPrimary}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {[journal.country, journal.region].filter(Boolean).join(' · ') || DASH}
                              </div>
                            </td>

                            {/* Speed & Acceptance Rate */}
                            <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="text-slate-900 dark:text-slate-100 font-medium">
                                {isKnown(journal.firstDecisionDays) ? `${journal.firstDecisionDays}d decision` : `${DASH} decision`}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {isKnown(journal.acceptanceRatePct) ? `${journal.acceptanceRatePct}% accept` : `${DASH} accept`}
                              </div>
                            </td>

                            {/* Direct Action Buttons */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => inspectJournalInTab(journal.id, 'impact')}
                                  className="px-2.5 py-1.5 text-xs font-medium text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-md transition-colors whitespace-nowrap shrink-0"
                                >
                                  Impact
                                </button>
                                <button
                                  type="button"
                                  onClick={() => inspectJournalInTab(journal.id, 'guidelines')}
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                                >
                                  Guidelines
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredJournals.length > visibleRowCount && (
                    <div className="p-4 flex items-center justify-center gap-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      <span>
                        Showing {visibleRowCount.toLocaleString()} of {filteredJournals.length.toLocaleString()} journals
                      </span>
                      <button
                        type="button"
                        onClick={() => setVisibleRowCount((n) => n + ROWS_PER_PAGE)}
                        className="px-3 py-1.5 font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-md"
                      >
                        Show {Math.min(ROWS_PER_PAGE, filteredJournals.length - visibleRowCount)} more
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Journal Quick-Preview Strip at Bottom of Directory */}
            {selectedJournal && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Selected Venue Snapshot{selectedJournal.abbreviation ? ` · ${selectedJournal.abbreviation}` : ''}{selectedJournal.issn ? ` · ISSN ${selectedJournal.issn}` : ''}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display mt-0.5">
                      {selectedJournal.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => inspectJournalInTab(selectedJournal.id, 'impact')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Run Automated Impact Analysis
                    </button>
                    <button
                      type="button"
                      onClick={() => inspectJournalInTab(selectedJournal.id, 'guidelines')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Full Submission Guidelines
                    </button>
                    {selectedJournal.guidelines.authorPortalUrl && (
                      <a
                        href={selectedJournal.guidelines.authorPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        Editorial Portal
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                  <div className="lg:col-span-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Editorial Scope &amp; Target Readership
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedJournal.scopeSummary || 'Scope not recorded. Check the journal website.'}
                    </p>
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Priority Topics: </span>
                      {selectedJournal.keyTopics.join(' · ')}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Mandatory Checklists: </span>
                      {selectedJournal.guidelines.reportingStandards.join(' · ') || 'Not recorded'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Word Limit: </span>
                      Abstract {selectedJournal.guidelines.wordLimitAbstract ? `${selectedJournal.guidelines.wordLimitAbstract}w` : DASH} / Main{' '}
                      {selectedJournal.guidelines.wordLimitMainText ?? DASH}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Peer Review Mode: </span>
                      {selectedJournal.guidelines.blindingPolicy ?? 'Not recorded'}
                      {selectedJournal.guidelines.referenceStyle ? ` (${selectedJournal.guidelines.referenceStyle})` : ''}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Waiver Policy: </span>
                      {selectedJournal.waiverPolicy || 'Not recorded'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW 2: AI MANUSCRIPT MATCHER (ABSTRACT / TITLE / KEYWORDS + OPENALEX)
           ===================================================================== */}
        {activeTab === 'matcher' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Manuscript Input & Constraints */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                    Manuscript Profile Input
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Load an epidemiological preset or paste your own draft
                  </p>
                </div>
              </div>

              {/* Sample Presets */}
              <div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Quick-Load Sample Research Scenarios:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_MANUSCRIPTS.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        setMsTitle(sample.title);
                        setMsAbstract(sample.abstract);
                        setMsKeywords(sample.keywords);
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-800 dark:hover:text-teal-300 rounded-md transition-colors text-left"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Manuscript Working Title
                </label>
                <input
                  type="text"
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  placeholder="Enter your full research title..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* Abstract */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Structured or Unstructured Abstract
                  </label>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {msAbstract.trim() ? msAbstract.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={msAbstract}
                  onChange={(e) => setMsAbstract(e.target.value)}
                  placeholder="Paste Background, Methods, Results, and Conclusions..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700 leading-relaxed"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  MeSH / DeCS Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={msKeywords}
                  onChange={(e) => setMsKeywords(e.target.value)}
                  placeholder="e.g., Outbreak investigation, Dengue, Cohort study, Surveillance..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* Researcher Constraints */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Author Budget &amp; Quartile Constraints
                </div>

                {/* Max APC Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Maximum APC Budget (USD):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {matcherMaxApc === 0 ? '$0 (Free / Diamond Only)' : `Up to $${matcherMaxApc.toLocaleString()}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6000}
                    step={250}
                    value={matcherMaxApc}
                    onChange={(e) => setMatcherMaxApc(Number(e.target.value))}
                    className="w-full accent-teal-800"
                  />
                </div>

                {/* Target Quartiles */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Target Tiers:</span>
                  <div className="flex items-center gap-1.5">
                    {(['Q1', 'Q2', 'Q3', 'Q4'] as JournalTier[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleMatcherTier(t)}
                        className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md border transition-colors ${
                          matcherTiers.includes(t)
                            ? 'bg-teal-800 text-white border-teal-800'
                            : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Waiver Checkbox */}
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matcherRequireWaiver}
                    onChange={(e) => setMatcherRequireWaiver(e.target.checked)}
                    className="rounded border-slate-300 text-teal-800 focus:ring-teal-700"
                  />
                  <span>Prioritize $0 Diamond OA, Hybrid, or Full HINARI / Research4Life Waiver venues</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleRunMatcher}
                disabled={isMatching}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isMatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing Abstract &amp; Querying OpenAlex...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Recommend Optimal Journals
                  </>
                )}
              </button>
            </div>

            {/* Right Column: AI Recommendations + OpenAlex Live Bibliographic Evidence */}
            <div className="lg:col-span-7 space-y-6">
              {matcherError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-sm text-red-800 dark:text-red-200">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Journal Matcher Alert</div>
                    <p className="mt-0.5 text-xs">{matcherError}</p>
                  </div>
                </div>
              )}

              {!matcherResult && !isMatching && (
                <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div className="text-xs font-semibold text-teal-800 dark:text-teal-400">
                    Ready for Editorial Evaluation
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
                    How the GlobalHealth Manuscript Matcher Works
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Click <strong>Recommend Optimal Journals</strong> to run a two-stage analysis modeled on the original Health Journal Finder workflow:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        01. Epidemiological &amp; Scope Fit
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Detects your exact study design (e.g. Outbreak Investigation, Cohort, Cluster RCT, Systematic Review), identifies required EQUATOR reporting guidelines, and ranks journals by scope fit and APC budget.
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        02. Live OpenAlex Bibliographic Grounding
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Queries the live OpenAlex database for real published papers matching your abstract topic so you can verify where similar studies were actually published and cited.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isMatching && (
                <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 animate-pulse">
                  <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-20 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                  <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                </div>
              )}

              {matcherResult && !isMatching && (
                <div className="space-y-6">
                  {/* Editorial Diagnosis Summary Header */}
                  <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Automated Editorial Triage &amp; Methodology Assessment
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display mt-0.5">
                          Detected Design: {matcherResult.detectedStudyDesign}
                        </h3>
                      </div>
                      <div className="text-xs font-mono text-teal-800 dark:text-teal-300">
                        Guideline: {matcherResult.recommendedReportingGuideline}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {matcherResult.manuscriptReadinessSummary}
                    </p>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Extracted MeSH / DeCS Descriptors: </span>
                      {matcherResult.detectedMeSHKeywords.join(' · ')}
                    </div>
                  </div>

                  {/* Recommended Journal Cards */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                      Top Recommended Target Journals ({matcherResult.matches.length})
                    </h3>

                    {matcherResult.matches.map((match, idx) => {
                      const matchedJournal =
                        journals.find((j) => j.id === match.journalId) ||
                        journals.find((j) => j.title.toLowerCase().includes(match.journalId.toLowerCase())) ||
                        journals[idx % journals.length];

                      return (
                        <div
                          key={`${match.journalId}-${idx}`}
                          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                              <div className="text-xs text-teal-800 dark:text-teal-400 font-semibold">
                                0{idx + 1}. {match.fitCategory} · {matchedJournal.tier} · {matchedJournal.country}
                              </div>
                              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display mt-0.5">
                                {matchedJournal.title}
                              </h4>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                JIF {fmtNum(matchedJournal.impactFactor)} · CiteScore {fmtNum(matchedJournal.citeScore)} · SJR{' '}
                                {fmtNum(matchedJournal.sjrScore, 2)} · APC {fmtApc(matchedJournal.apcUsd)}
                                {matchedJournal.waiverPolicy ? ` · ${matchedJournal.waiverPolicy}` : ''}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-2xl font-bold font-mono tabular-nums text-teal-800 dark:text-teal-400">
                                {match.matchScore}%
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">Scope Match</div>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">Scope Alignment Rationale: </span>
                              <span className="text-slate-600 dark:text-slate-300">{match.scopeAlignmentRationale}</span>
                            </div>

                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-1">
                                Key Manuscript Strengths for This Venue:
                              </div>
                              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                {match.strengthsForJournal.map((str, i) => (
                                  <li key={i}>• {str}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                              <div className="p-3 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                                  Pre-Submission Reporting Advice
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {match.methodologyAndReportingAdvice}
                                </p>
                              </div>
                              <div className="p-3 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                                  APC, Waiver &amp; Review Timeline
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {match.apcAndWaiverStrategy} ({match.estimatedReviewTimeline})
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => inspectJournalInTab(matchedJournal.id, 'impact')}
                              className="px-3 py-1.5 text-xs font-medium text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-md transition-colors"
                            >
                              Inspect Impact Trajectory
                            </button>
                            <button
                              type="button"
                              onClick={() => inspectJournalInTab(matchedJournal.id, 'guidelines')}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              Open Submission Checklist
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OpenAlex Live Similar Published Papers Section */}
              {(openAlexPapers.length > 0 || isLoadingOpenAlex) && (
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Live Bibliographic Evidence · OpenAlex Works API
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                        Similar Published Studies &amp; Their Publishing Venues
                      </h3>
                    </div>
                  </div>

                  {isLoadingOpenAlex ? (
                    <div className="text-xs text-slate-500 py-4">Querying OpenAlex bibliographic index...</div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {openAlexPapers.map((paper) => (
                        <div key={paper.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                            {paper.doi ? (
                              <a
                                href={paper.doi}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-teal-800 dark:hover:text-teal-400 underline-offset-2 hover:underline"
                              >
                                {paper.title}
                              </a>
                            ) : (
                              paper.title
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-teal-800 dark:text-teal-400">{paper.journalName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{paper.publicationYear}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{paper.citedByCount} citations</span>
                            {paper.isOpenAccess && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-700 dark:text-emerald-400">Open Access</span>
                              </>
                            )}
                            {paper.authors.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{paper.authors.join(', ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 3: AUTOMATED IMPACT FACTOR & CITATION TRAJECTORY ANALYTICS
           ===================================================================== */}
        {activeTab === 'impact' && selectedJournal && (
          <div className="space-y-6">
            {/* Journal Selector Bar */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-xl">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Select Health Journal for Scientometric Inspection
                </label>
                <select
                  value={selectedJournal.id}
                  onChange={(e) => setSelectedJournalId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700"
                >
                  {journals.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.tier} · JIF {fmtNum(j.impactFactor)} · SJR {fmtNum(j.sjrScore, 2)} · APC {fmtApc(j.apcUsd)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRunImpactAnalysis(selectedJournal)}
                  disabled={isAnalyzingImpact}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {isAnalyzingImpact ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Generating Scientometric Brief...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Run Automated AI Impact Analysis
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => inspectJournalInTab(selectedJournal.id, 'guidelines')}
                  className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  View Submission Guidelines
                </button>
              </div>
            </div>

            {/* Scientometric KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Quartile Standing</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-teal-800 dark:text-teal-400">
                  {selectedJournal.tier}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{selectedJournal.indexing.join(' / ') || 'SJR best quartile'}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Impact Factor (JIF)</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {fmtNum(selectedJournal.impactFactor)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">5-Year JIF: {fmtNum(selectedJournal.fiveYearImpactFactor)}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Scopus CiteScore</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {fmtNum(selectedJournal.citeScore)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {isKnown(selectedJournal.citeScore) && isKnown(selectedJournal.impactFactor) && selectedJournal.impactFactor > 0
                    ? `Ratio: ${(selectedJournal.citeScore / selectedJournal.impactFactor).toFixed(2)}x JIF`
                    : 'Ratio: —'}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">SCImago SJR &amp; H-Index</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {fmtNum(selectedJournal.sjrScore, 2)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">H-Index: {fmtInt(selectedJournal.hIndex)}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">APC &amp; Cost per JIF</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {isKnown(selectedJournal.apcUsd) ? (selectedJournal.apcUsd === 0 ? '$0' : `$${selectedJournal.apcUsd.toLocaleString()}`) : DASH}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {!isKnown(selectedJournal.apcUsd)
                    ? 'APC not recorded'
                    : selectedJournal.apcUsd === 0
                    ? 'No APC'
                    : isKnown(selectedJournal.impactFactor) && selectedJournal.impactFactor > 0
                    ? `$${Math.round(selectedJournal.apcUsd / selectedJournal.impactFactor)} / JIF pt`
                    : 'Cost per JIF: —'}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Editorial Velocity</div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {fmtInt(selectedJournal.firstDecisionDays, 'd')}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {fmtInt(selectedJournal.acceptanceRatePct, '%')} accept · {fmtInt(selectedJournal.publicationTimeDays, 'd')} pub
                </div>
              </div>
            </div>

            {/* 2-Column Split: 5-Year Trajectory SVG Chart & Peer Discipline Benchmark */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* 5-Year Historical Trajectory SVG Chart */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Multi-Year Citation Trajectory (2021–2025)
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                        Journal Impact Factor (JIF) vs. Scopus CiteScore Trend
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-teal-800 dark:text-teal-400 font-semibold">— JIF (2-Year)</span>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">-- CiteScore (4-Year)</span>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  {(() => {
                    const history = selectedJournal.impactHistory;
                    if (history.length < 2) {
                      return (
                        <div className="mt-4 h-56 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                          No multi-year JIF / CiteScore history recorded for this journal.
                        </div>
                      );
                    }
                    const maxVal = Math.max(...history.flatMap((h) => [h.jif, h.citeScore]), 5) * 1.15;
                    const width = 560;
                    const height = 210;
                    const padX = 44;
                    const padY = 24;
                    const plotW = width - padX * 2;
                    const plotH = height - padY * 2;

                    const getX = (i: number) => padX + (i / (history.length - 1)) * plotW;
                    const getY = (val: number) => padY + plotH - (val / maxVal) * plotH;

                    const jifPoints = history.map((h, i) => `${getX(i)},${getY(h.jif)}`).join(' ');
                    const csPoints = history.map((h, i) => `${getX(i)},${getY(h.citeScore)}`).join(' ');

                    return (
                      <div className="mt-4">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
                          {/* Horizontal reference grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                            const y = padY + plotH * (1 - t);
                            const labelVal = (maxVal * t).toFixed(1);
                            return (
                              <g key={idx}>
                                <line
                                  x1={padX}
                                  y1={y}
                                  x2={width - padX}
                                  y2={y}
                                  stroke="currentColor"
                                  className="text-slate-200 dark:text-slate-800"
                                  strokeDasharray="3 3"
                                />
                                <text
                                  x={padX - 8}
                                  y={y + 4}
                                  textAnchor="end"
                                  className="text-[10px] fill-slate-400 font-mono"
                                >
                                  {labelVal}
                                </text>
                              </g>
                            );
                          })}

                          {/* CiteScore Polyline */}
                          <polyline
                            fill="none"
                            stroke="#b45309"
                            strokeWidth="2.25"
                            strokeDasharray="5 4"
                            points={csPoints}
                          />

                          {/* JIF Polyline */}
                          <polyline
                            fill="none"
                            stroke="#115e59"
                            strokeWidth="2.75"
                            points={jifPoints}
                          />

                          {/* Data Points & Year Labels */}
                          {history.map((h, i) => {
                            const x = getX(i);
                            const yJif = getY(h.jif);
                            const yCs = getY(h.citeScore);
                            return (
                              <g key={h.year}>
                                <circle cx={x} cy={yCs} r="4" fill="#b45309" />
                                <circle cx={x} cy={yJif} r="4.5" fill="#115e59" />
                                <text
                                  x={x}
                                  y={yJif - 9}
                                  textAnchor="middle"
                                  className="text-[10px] font-mono font-bold fill-teal-900 dark:fill-teal-300"
                                >
                                  {h.jif.toFixed(1)}
                                </text>
                                <text
                                  x={x}
                                  y={height - 4}
                                  textAnchor="middle"
                                  className="text-[11px] font-mono fill-slate-500"
                                >
                                  {h.year}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                </div>

                {/* Year-by-Year Tabular Breakdown */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 gap-2 text-center font-mono text-xs">
                  {selectedJournal.impactHistory.map((pt) => (
                    <div key={pt.year} className="p-2 bg-[#FAF8F5] dark:bg-slate-950 rounded-lg">
                      <div className="text-slate-500">{pt.year}</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        JIF {pt.jif.toFixed(1)}
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">
                        CS {pt.citeScore.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peer Discipline Comparative Benchmark */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Subject Cohort Benchmark · {selectedJournal.subjectPrimary}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                      Peer Comparison in Primary Discipline
                    </h3>
                  </div>

                  <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                    {journals
                      .filter((j) => j.subjectPrimary === selectedJournal.subjectPrimary || j.subjects.includes(selectedJournal.subjectPrimary))
                      .sort((a, b) => compareNullable(a.impactFactor ?? a.sjrScore, b.impactFactor ?? b.sjrScore, 'desc'))
                      .slice(0, 6)
                      .map((peer) => {
                        const isCurrent = peer.id === selectedJournal.id;
                        return (
                          <div
                            key={peer.id}
                            onClick={() => setSelectedJournalId(peer.id)}
                            className={`py-2.5 px-2 flex items-center justify-between gap-3 cursor-pointer rounded-md transition-colors ${
                              isCurrent
                                ? 'bg-teal-50/70 dark:bg-teal-950/40 font-semibold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs text-slate-900 dark:text-slate-100 truncate">
                                {peer.title}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {peer.tier} · {fmtApc(peer.apcUsd)} · {fmtInt(peer.firstDecisionDays, 'd')}
                              </div>
                            </div>
                            <div className="text-right font-mono tabular-nums shrink-0">
                              <div className="text-xs font-bold text-teal-800 dark:text-teal-400">
                                {isKnown(peer.impactFactor) ? `JIF ${peer.impactFactor.toFixed(1)}` : `SJR ${fmtNum(peer.sjrScore, 2)}`}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {fmtInt(peer.acceptanceRatePct, '%')} acc
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  Tip: Click any peer journal row above to switch the active scientometric chart and compare APC cost-per-impact-point.
                </div>
              </div>
            </div>

            {/* Automated AI Impact Factor Analysis Output */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-teal-800 dark:text-teal-400">
                    Automated Scientometric &amp; Editorial Strategy Engine
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                    AI Impact Factor &amp; ROI Diagnostic for {selectedJournal.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={impactResearcherContext}
                    onChange={(e) => setImpactResearcherContext(e.target.value)}
                    placeholder="Optional researcher context (e.g., LMIC outbreak report)..."
                    className="w-64 sm:w-80 px-3 py-1.5 text-xs bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunImpactAnalysis(selectedJournal)}
                    disabled={isAnalyzingImpact}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-60 rounded-lg whitespace-nowrap shrink-0"
                  >
                    {impactAnalysisCache[selectedJournal.id] ? 'Refresh Analysis' : 'Analyze Now'}
                  </button>
                </div>
              </div>

              {impactError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-200">
                  {impactError}
                </div>
              )}

              {isAnalyzingImpact && (
                <div className="py-8 text-center text-sm text-slate-500 animate-pulse">
                  Evaluating 2021–2025 JIF normalization curve, CiteScore velocity, and LMIC APC return-on-investment...
                </div>
              )}

              {!isAnalyzingImpact && impactAnalysisCache[selectedJournal.id] ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                        01. 5-Year Impact Trajectory &amp; Normalization
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {impactAnalysisCache[selectedJournal.id].executiveTrajectory}
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                        02. Citation Velocity &amp; Indexing Reach
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {impactAnalysisCache[selectedJournal.id].citationVelocityAssessment}
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                        03. Quartile Stability Forecast
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {impactAnalysisCache[selectedJournal.id].tierStabilityForecast}
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                        04. APC Cost-Effectiveness &amp; Waiver ROI
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {impactAnalysisCache[selectedJournal.id].apcRoiEvaluation}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Strategic Positioning Tips for Desk-Review Survival:
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {impactAnalysisCache[selectedJournal.id].strategicPositioningTips.map((tip, i) => (
                          <li key={i}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Automated Pre-Submission Compliance Checks:
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {impactAnalysisCache[selectedJournal.id].submissionReadinessChecklist.map((chk, i) => (
                          <li key={i}>• {chk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                !isAnalyzingImpact && (
                  <div className="p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Click <strong>Run Automated AI Impact Analysis</strong> to generate an on-demand scientometric diagnosis of {selectedJournal.title}&apos;s 2021–2025 citation stability, APC return on investment, and desk-review positioning strategy.
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 4: GLOBAL RESEARCHER SUBMISSION GUIDELINES & COMPLIANCE HUB
           ===================================================================== */}
        {activeTab === 'guidelines' && selectedJournal && (
          <div className="space-y-6">
            {/* Journal Selector & Copy Brief Bar */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-xl">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Select Journal to Inspect Author Instructions &amp; Checklists
                </label>
                <select
                  value={selectedJournal.id}
                  onChange={(e) => setSelectedJournalId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-700"
                >
                  {journals.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.tier}{j.guidelines.blindingPolicy ? ` · ${j.guidelines.blindingPolicy}` : ''}{j.guidelines.referenceStyle ? ` · ${j.guidelines.referenceStyle}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => copySubmissionBrief(selectedJournal)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedId === selectedJournal.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied Submission Brief
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Formatted Submission Checklist
                    </>
                  )}
                </button>
                {selectedJournal.guidelines.authorPortalUrl && (
                  <a
                    href={selectedJournal.guidelines.authorPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Official Author Instructions
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Technical Formatting Specifications Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
              <div className="p-4">
                <div className="text-xs text-slate-500">Abstract Word Limit</div>
                <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {selectedJournal.guidelines.wordLimitAbstract ? `≤ ${selectedJournal.guidelines.wordLimitAbstract}w` : DASH}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">Strict portal cap</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500">Reference Limit &amp; Style</div>
                <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {selectedJournal.guidelines.maxReferences ? `≤ ${selectedJournal.guidelines.maxReferences} refs` : DASH}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{selectedJournal.guidelines.referenceStyle ?? 'Style not recorded'}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500">Tables &amp; Figures Cap</div>
                <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {selectedJournal.guidelines.maxTablesFigures ? `${selectedJournal.guidelines.maxTablesFigures} items` : DASH}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">Combined main files</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500">Peer Review Blinding</div>
                <div className="mt-1 text-base font-bold text-teal-800 dark:text-teal-400">
                  {selectedJournal.guidelines.blindingPolicy ?? DASH}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {selectedJournal.guidelines.blindingPolicy === 'Double-Blind'
                    ? 'Anonymize main text'
                    : selectedJournal.guidelines.blindingPolicy
                    ? 'Authors visible to reviewers'
                    : 'Not recorded'}
                </div>
              </div>
              <div className="p-4 col-span-2">
                <div className="text-xs text-slate-500">Main Manuscript Length</div>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedJournal.guidelines.wordLimitMainText ?? 'Not recorded'}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Checklists: {selectedJournal.guidelines.reportingStandards.join(' · ') || 'not recorded'}
                </div>
              </div>
            </div>

            {/* Interactive Pre-Submission Compliance Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Interactive Checklists */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
                <div>
                  <div className="text-xs text-teal-800 dark:text-teal-400 font-semibold">
                    Interactive Pre-Submission Audit
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                    Mandatory Ethics, Authorship &amp; Cover Letter Verification
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Check off each requirement below to verify readiness before uploading to {selectedJournal.title}
                  </p>
                </div>

                {/* Section A: Ethics & Institutional Declarations */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    01. Ethics Approval, Reflexivity &amp; Mandatory Boxes
                  </div>
                  {selectedJournal.guidelines.ethicsRequirements.map((req, idx) => {
                    const key = `${selectedJournal.id}-ethics-${idx}`;
                    const checked = Boolean(checkedGuidelines[key]);
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-700/40'
                            : 'bg-[#FAF8F5] dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCheckedGuidelines((prev) => ({ ...prev, [key]: !prev[key] }))
                          }
                          className="mt-0.5 rounded border-slate-300 text-teal-800 focus:ring-teal-700"
                        />
                        <span className={`text-xs leading-relaxed ${checked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {req}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Section B: Cover Letter & Portal Upload Requirements */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    02. Cover Letter &amp; Editorial Portal Checklist
                  </div>
                  {selectedJournal.guidelines.coverLetterChecklist.map((item, idx) => {
                    const key = `${selectedJournal.id}-cover-${idx}`;
                    const checked = Boolean(checkedGuidelines[key]);
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-700/40'
                            : 'bg-[#FAF8F5] dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCheckedGuidelines((prev) => ({ ...prev, [key]: !prev[key] }))
                          }
                          className="mt-0.5 rounded border-slate-300 text-teal-800 focus:ring-teal-700"
                        />
                        <span className={`text-xs leading-relaxed ${checked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 Cols: Open Science, EQUATOR Standards & Global Equity Waiver Guide */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="text-xs font-semibold text-teal-800 dark:text-teal-400">
                    Open Science &amp; Reproducibility Policies
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                    Data Sharing, Preprints &amp; EQUATOR Standards
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Data Availability Mandate
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {selectedJournal.guidelines.dataSharingPolicy ?? 'Not recorded. Check the journal\'s author guidelines.'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Preprint Policy (medRxiv / bioRxiv / SciELO)
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {selectedJournal.guidelines.preprintPolicy ?? 'Not recorded. Check the journal\'s author guidelines.'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                        APC &amp; Global Researcher Waiver Eligibility
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Published under <strong>{selectedJournal.accessModel}</strong> with list APC of{' '}
                        <strong>{isKnown(selectedJournal.apcUsd) ? `$${selectedJournal.apcUsd.toLocaleString()} USD` : 'unknown'}</strong>. Policy:{' '}
                        <strong>{selectedJournal.waiverPolicy || 'not recorded'}</strong>. Corresponding authors based in Research4Life Group A (full 100% waiver) or Group B (50% discount) countries should request fee exemption during step 1 of portal submission, never after acceptance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Index Custom or Regional Health Journal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                Index Custom Health Journal to Directory
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomJournal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Journal Title *</label>
                <input
                  type="text"
                  required
                  value={newJournalForm.title}
                  onChange={(e) => setNewJournalForm({ ...newJournalForm, title: e.target.value })}
                  placeholder="e.g., Asia-Pacific Journal of Public Health"
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">ISO Abbreviation</label>
                  <input
                    type="text"
                    value={newJournalForm.abbreviation}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, abbreviation: e.target.value })}
                    placeholder="Asia Pac. J. Public Health"
                    className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">ISSN</label>
                  <input
                    type="text"
                    value={newJournalForm.issn}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, issn: e.target.value })}
                    placeholder="1010-5395"
                    className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Publisher</label>
                  <input
                    type="text"
                    value={newJournalForm.publisher}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, publisher: e.target.value })}
                    placeholder="SAGE / APACPH"
                    className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Country</label>
                  <select
                    value={newJournalForm.country}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    {COUNTRIES_LIST.filter((c) => c !== 'All Countries').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Tier</label>
                  <select
                    value={newJournalForm.tier}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, tier: e.target.value as JournalTier })}
                    className="w-full px-2 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">JIF</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newJournalForm.impactFactor}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, impactFactor: e.target.value })}
                    className="w-full px-2 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">CiteScore</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newJournalForm.citeScore}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, citeScore: e.target.value })}
                    className="w-full px-2 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">APC ($USD)</label>
                  <input
                    type="number"
                    value={newJournalForm.apcUsd}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, apcUsd: e.target.value })}
                    className="w-full px-2 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Primary Subject Category</label>
                <select
                  value={newJournalForm.subjectPrimary}
                  onChange={(e) => setNewJournalForm({ ...newJournalForm, subjectPrimary: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  {SUBJECT_CATEGORIES.filter((s) => s !== 'All Subjects').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Editorial Scope Summary</label>
                <textarea
                  rows={3}
                  value={newJournalForm.scopeSummary}
                  onChange={(e) => setNewJournalForm({ ...newJournalForm, scopeSummary: e.target.value })}
                  placeholder="Describe target readership, study types, and regional focus..."
                  className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingJournal}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg"
                >
                  {isSavingJournal ? 'Saving...' : 'Add Journal to Atlas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Spreadsheet (.XLS / .XLSX / .CSV) Database Importer */}
      <SpreadsheetImporterModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        existingJournals={journals}
        onDatabaseUpdated={(updatedList, summary) => {
          setJournals(updatedList);
          if (updatedList.length > 0 && !updatedList.some((j) => j.id === selectedJournalId)) {
            setSelectedJournalId(updatedList[0].id);
          }
          setLastImportBanner(summary);
        }}
      />

      {/* Quiet Academic Footer */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 py-6 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            GlobalHealth Journal Atlas &amp; Matcher · Designed for Public Health Researchers &amp; Field Epidemiologists
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.equator-network.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-slate-200"
            >
              EQUATOR Reporting Network
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.research4life.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-slate-200"
            >
              Research4Life / HINARI Waivers
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://openalex.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-slate-200"
            >
              OpenAlex Bibliographic Index
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
