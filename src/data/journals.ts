// 'NR' = not ranked / quartile not reported
export type JournalTier = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'NR';

export type AccessModel = 'Diamond OA' | 'Gold OA' | 'Hybrid' | 'Subscription';

// Free text: imported waiver / discount notes are kept as written.
// Seed data uses labels such as 'Full HINARI / Research4Life A&B Waiver' or '100% Free (No APC)'.
export type WaiverPolicy = string;

export interface ImpactTrendPoint {
  year: number;
  jif: number;
  citeScore: number;
}

export interface SubmissionGuidelines {
  reportingStandards: string[];
  // null = not recorded for this journal (never guessed)
  wordLimitAbstract: number | null;
  wordLimitMainText: string | null;
  maxReferences: number | null;
  maxTablesFigures: number | null;
  referenceStyle: 'Vancouver (Numbered)' | 'AMA 11th Edition' | 'APA 7th Edition' | 'Harvard' | null;
  blindingPolicy: 'Double-Blind' | 'Single-Blind' | 'Open Peer Review' | null;
  ethicsRequirements: string[];
  dataSharingPolicy: string | null;
  coverLetterChecklist: string[];
  preprintPolicy: string | null;
  authorPortalUrl: string;
}

// Metric fields are null when the value is unknown. Never substitute a default number.
export interface HealthJournal {
  id: string;
  title: string;
  abbreviation: string;
  issn: string;
  eissn: string;
  publisher: string;
  tier: JournalTier;
  sjrScore: number | null;
  impactFactor: number | null;
  fiveYearImpactFactor: number | null;
  citeScore: number | null;
  hIndex: number | null;
  apcUsd: number | null;
  accessModel: AccessModel;
  waiverPolicy: WaiverPolicy;
  subjectPrimary: string;
  subjects: string[];
  country: string;
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America' | 'Africa & Middle East' | 'Global / Multilateral';
  indexing: string[];
  acceptanceRatePct: number | null;
  firstDecisionDays: number | null;
  publicationTimeDays: number | null;
  scopeSummary: string;
  keyTopics: string[];
  impactHistory: ImpactTrendPoint[];
  guidelines: SubmissionGuidelines;
}

export interface JournalMatchResult {
  journalId: string;
  matchScore: number;
  fitCategory: 'Target Reach (Ambitious)' | 'Primary Best Fit' | 'High-Acceptance Safe Fit';
  scopeAlignmentRationale: string;
  strengthsForJournal: string[];
  methodologyAndReportingAdvice: string;
  apcAndWaiverStrategy: string;
  estimatedReviewTimeline: string;
}

export interface AIMatcherResponse {
  detectedStudyDesign: string;
  detectedMeSHKeywords: string[];
  manuscriptReadinessSummary: string;
  recommendedReportingGuideline: string;
  matches: JournalMatchResult[];
}

export interface AIImpactAnalysisResponse {
  journalId: string;
  executiveTrajectory: string;
  citationVelocityAssessment: string;
  tierStabilityForecast: string;
  apcRoiEvaluation: string;
  strategicPositioningTips: string[];
  submissionReadinessChecklist: string[];
}

export interface OpenAlexPaper {
  id: string;
  title: string;
  publicationYear: number;
  citedByCount: number;
  doi: string | null;
  journalName: string;
  issn: string | null;
  isOpenAccess: boolean;
  authors: string[];
}

export const SUBJECT_CATEGORIES = [
  'All Subjects',
  'Public, Environmental & Occupational Health',
  'Epidemiology & Field Surveillance',
  'Infectious Diseases & Tropical Medicine',
  'Global & International Health Policy',
  'General & Internal Medicine',
  'Health Informatics & Digital Health',
  'Maternal, Child & Adolescent Health',
  'Health Economics & Systems Research',
  'Oncology & Non-Communicable Diseases',
  'Mental Health & Psychiatric Epidemiology'
] as const;

export const COUNTRIES_LIST = [
  'All Countries',
  'United Kingdom',
  'United States',
  'Switzerland',
  'Sweden',
  'Canada',
  'Brazil',
  'South Africa',
  'India',
  'Japan',
  'Australia',
  'Indonesia',
  'Kenya',
  'Mexico',
  'Thailand'
] as const;

export const HEALTH_JOURNALS: HealthJournal[] = [
  {
    id: 'lancet-global-health',
    title: 'The Lancet Global Health',
    abbreviation: 'Lancet Glob. Health',
    issn: '2214-109X',
    eissn: '2214-109X',
    publisher: 'Elsevier (Lancet Group)',
    tier: 'Q1',
    sjrScore: 8.42,
    impactFactor: 19.9,
    fiveYearImpactFactor: 26.4,
    citeScore: 31.8,
    hIndex: 142,
    apcUsd: 5780,
    accessModel: 'Gold OA',
    waiverPolicy: 'Full HINARI / Research4Life A&B Waiver',
    subjectPrimary: 'Global & International Health Policy',
    subjects: ['Global & International Health Policy', 'Epidemiology & Field Surveillance', 'Infectious Diseases & Tropical Medicine', 'Maternal, Child & Adolescent Health'],
    country: 'United Kingdom',
    region: 'Europe',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 8,
    firstDecisionDays: 21,
    publicationTimeDays: 68,
    scopeSummary: 'Publishes high-impact clinical trials, large-scale epidemiological cohorts, health system evaluations, and policy analyses directly improving health outcomes in low- and middle-income countries (LMICs) and disadvantaged populations worldwide.',
    keyTopics: ['LMIC Health Equity', 'Randomized Controlled Trials', 'Disease Burden GBD', 'Maternal Mortality', 'Pandemic Preparedness'],
    impactHistory: [
      { year: 2021, jif: 26.7, citeScore: 28.4 },
      { year: 2022, jif: 38.9, citeScore: 34.2 },
      { year: 2023, jif: 34.3, citeScore: 33.1 },
      { year: 2024, jif: 21.5, citeScore: 32.0 },
      { year: 2025, jif: 19.9, citeScore: 31.8 }
    ],
    guidelines: {
      reportingStandards: ['CONSORT (Trials)', 'STROBE (Observational)', 'PRISMA (Systematic Reviews)', 'GATHER (Global Health Estimates)', 'SAGER (Sex & Gender Equity)'],
      wordLimitAbstract: 300,
      wordLimitMainText: '3,500 words (Original Articles) / 4,500 words (Randomized Trials)',
      maxReferences: 30,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Mandatory local IRB / Ethics Committee approval from the country where data were collected',
        'Inclusion of authors from LMIC study settings (anti-helicopter research policy)',
        'Structured Research in Context panel (Evidence before this study, Added value, Implications)'
      ],
      dataSharingPolicy: 'Mandatory Data Sharing Statement detailing de-identified participant data availability, data dictionary, and study protocol.',
      coverLetterChecklist: [
        'Explain why findings change clinical practice or public health policy in resource-limited settings',
        'Confirm manuscript is not under consideration elsewhere and disclose related preprints',
        'Verify local LMIC co-authorship and capacity-building alignment'
      ],
      preprintPolicy: 'Accepts submissions previously posted on medRxiv, SSRN, or bioRxiv.',
      authorPortalUrl: 'https://www.thelancet.com/journals/langlo/home'
    }
  },
  {
    id: 'who-bulletin',
    title: 'Bulletin of the World Health Organization',
    abbreviation: 'Bull. World Health Organ.',
    issn: '0042-9686',
    eissn: '1564-0604',
    publisher: 'World Health Organization (WHO)',
    tier: 'Q1',
    sjrScore: 2.95,
    impactFactor: 8.4,
    fiveYearImpactFactor: 11.2,
    citeScore: 15.6,
    hIndex: 188,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Public, Environmental & Occupational Health',
    subjects: ['Public, Environmental & Occupational Health', 'Global & International Health Policy', 'Epidemiology & Field Surveillance', 'Health Economics & Systems Research'],
    country: 'Switzerland',
    region: 'Global / Multilateral',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ', 'SciELO'],
    acceptanceRatePct: 14,
    firstDecisionDays: 28,
    publicationTimeDays: 90,
    scopeSummary: 'Flagship diamond open-access public health journal of the WHO with zero publication fees. Focuses on actionable public health research, field lessons, policy practice, and universal health coverage implementation.',
    keyTopics: ['Universal Health Coverage', 'Primary Health Care', 'Field Epidemiology Lessons', 'Health Systems Financing', 'WHO Policy Implementation'],
    impactHistory: [
      { year: 2021, jif: 9.4, citeScore: 13.8 },
      { year: 2022, jif: 13.8, citeScore: 16.4 },
      { year: 2023, jif: 11.1, citeScore: 16.0 },
      { year: 2024, jif: 8.9, citeScore: 15.8 },
      { year: 2025, jif: 8.4, citeScore: 15.6 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'CHEERS (Health Economics)', 'TIDieR (Interventions)'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,000 words (Research & Policy & Practice) / 1,500 words (Lessons from the Field)',
      maxReferences: 50,
      maxTablesFigures: 4,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Double-blind anonymization: remove author names and institutional identifiers from main manuscript file',
        'National or institutional ethics approval number explicitly cited in Methods',
        'Abstracts translated by WHO into Arabic, Chinese, French, Russian, and Spanish upon acceptance'
      ],
      dataSharingPolicy: 'Authors must deposit underlying datasets in a recognized public repository or declare legal/ethical restrictions.',
      coverLetterChecklist: [
        'Specify target section: Research, Policy & Practice, Systematic Reviews, or Lessons from the Field',
        'Highlight relevance to international public health decision-makers and ministries of health',
        'Confirm zero conflicts of interest with tobacco or arms industries'
      ],
      preprintPolicy: 'Permits preprint servers; authors must link DOI upon submission.',
      authorPortalUrl: 'https://www.who.int/publications/journals/bulletin'
    }
  },
  {
    id: 'eid-cdc',
    title: 'Emerging Infectious Diseases',
    abbreviation: 'Emerg. Infect. Dis.',
    issn: '1080-6040',
    eissn: '1080-6059',
    publisher: 'U.S. Centers for Disease Control and Prevention (CDC)',
    tier: 'Q1',
    sjrScore: 3.12,
    impactFactor: 7.2,
    fiveYearImpactFactor: 9.8,
    citeScore: 14.9,
    hIndex: 254,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Infectious Diseases & Tropical Medicine',
    subjects: ['Infectious Diseases & Tropical Medicine', 'Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health'],
    country: 'United States',
    region: 'North America',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 18,
    firstDecisionDays: 24,
    publicationTimeDays: 75,
    scopeSummary: 'Premier diamond open-access journal published by the US CDC with zero APCs. Dedicated to tracking, investigating, and analyzing emerging and re-emerging infectious pathogens, outbreak investigations, zoonoses, and antimicrobial resistance.',
    keyTopics: ['Outbreak Investigation', 'Zoonotic Spillover', 'Antimicrobial Resistance', 'Genomic Surveillance', 'Field Epidemiology FETP'],
    impactHistory: [
      { year: 2021, jif: 6.9, citeScore: 12.1 },
      { year: 2022, jif: 16.1, citeScore: 18.5 },
      { year: 2023, jif: 11.8, citeScore: 17.2 },
      { year: 2024, jif: 7.6, citeScore: 15.4 },
      { year: 2025, jif: 7.2, citeScore: 14.9 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'STROME-ID (Molecular Epidemiology)', 'ORION (Outbreak Reports)', 'PRISMA'],
      wordLimitAbstract: 150,
      wordLimitMainText: '3,500 words (Research) / 1,200 words (Dispatches) / 800 words (Research Letters)',
      maxReferences: 40,
      maxTablesFigures: 4,
      referenceStyle: 'AMA 11th Edition',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Explicit distinction between public health outbreak emergency response (exempt) and human subjects research (IRB required)',
        'GenBank / GISAID accession numbers mandatory prior to acceptance for all sequence data',
        '50-word Author Bio required for the first author'
      ],
      dataSharingPolicy: 'All genomic sequences and phylogenetic alignments must be deposited in public databases (GenBank/SRA).',
      coverLetterChecklist: [
        'State clearly whether submission is a Full Research Article, Dispatch (brief outbreak study), or Research Letter',
        'Summarize public health urgency and pathogen novelty',
        'Confirm sequence accession IDs are included in text'
      ],
      preprintPolicy: 'Encourages preprints on medRxiv and bioRxiv for rapid public health dissemination.',
      authorPortalUrl: 'https://wwwnc.cdc.gov/eid'
    }
  },
  {
    id: 'bmj-global-health',
    title: 'BMJ Global Health',
    abbreviation: 'BMJ Glob. Health',
    issn: '2059-7908',
    eissn: '2059-7908',
    publisher: 'BMJ Publishing Group',
    tier: 'Q1',
    sjrScore: 2.88,
    impactFactor: 7.1,
    fiveYearImpactFactor: 8.3,
    citeScore: 11.9,
    hIndex: 82,
    apcUsd: 3890,
    accessModel: 'Gold OA',
    waiverPolicy: 'Full HINARI / Research4Life A&B Waiver',
    subjectPrimary: 'Global & International Health Policy',
    subjects: ['Global & International Health Policy', 'Public, Environmental & Occupational Health', 'Health Economics & Systems Research', 'Maternal, Child & Adolescent Health'],
    country: 'United Kingdom',
    region: 'Europe',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 19,
    firstDecisionDays: 32,
    publicationTimeDays: 72,
    scopeSummary: 'Publishes rigorous original research, practice papers, and health policy analyses addressing global health equity, decolonizing global health, health systems strengthening, and implementation science.',
    keyTopics: ['Health Systems Strengthening', 'Implementation Science', 'Decolonizing Global Health', 'Community Health Workers', 'Health Equity'],
    impactHistory: [
      { year: 2021, jif: 5.8, citeScore: 7.9 },
      { year: 2022, jif: 8.1, citeScore: 10.4 },
      { year: 2023, jif: 8.1, citeScore: 11.6 },
      { year: 2024, jif: 7.4, citeScore: 11.8 },
      { year: 2025, jif: 7.1, citeScore: 11.9 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'SRQR (Qualitative)', 'StaRI (Implementation Studies)', 'PRISMA'],
      wordLimitAbstract: 300,
      wordLimitMainText: '4,000 words (Original Research) / 3,500 words (Practice & Analysis)',
      maxReferences: 45,
      maxTablesFigures: 6,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Open Peer Review',
      ethicsRequirements: [
        'Mandatory Reflexivity Statement on International Research Partnerships when data come from LMICs',
        'Patient and Public Involvement (PPI) statement required in Methods section',
        'Key Messages box: What is already known, What this study adds, How this study might affect research/policy'
      ],
      dataSharingPolicy: 'Mandatory Data Availability Statement with repository DOI or reasonable request conditions.',
      coverLetterChecklist: [
        'Include Author Reflexivity Statement confirming equitable LMIC authorship',
        'Detail Patient and Public Involvement in study design',
        'Provide names and institutional emails of 3-4 independent peer reviewers'
      ],
      preprintPolicy: 'Full support for medRxiv direct transfer and preprint posting.',
      authorPortalUrl: 'https://gh.bmj.com/'
    }
  },
  {
    id: 'ijid-elsevier',
    title: 'International Journal of Infectious Diseases',
    abbreviation: 'Int. J. Infect. Dis.',
    issn: '1201-9712',
    eissn: '1878-3511',
    publisher: 'Elsevier (ISID Official Journal)',
    tier: 'Q1',
    sjrScore: 1.94,
    impactFactor: 4.8,
    fiveYearImpactFactor: 5.9,
    citeScore: 10.2,
    hIndex: 131,
    apcUsd: 2850,
    accessModel: 'Gold OA',
    waiverPolicy: 'Full HINARI / Research4Life A&B Waiver',
    subjectPrimary: 'Infectious Diseases & Tropical Medicine',
    subjects: ['Infectious Diseases & Tropical Medicine', 'Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health'],
    country: 'United Kingdom',
    region: 'Global / Multilateral',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 24,
    firstDecisionDays: 22,
    publicationTimeDays: 55,
    scopeSummary: 'Official publication of the International Society for Infectious Diseases (ISID). Focuses on clinical infectious diseases, field epidemiology, vaccine effectiveness, diagnostics, and surveillance in under-resourced settings.',
    keyTopics: ['Clinical Infectious Diseases', 'Vaccine Surveillance', 'Dengue & Arboviruses', 'Tuberculosis Control', 'One Health'],
    impactHistory: [
      { year: 2021, jif: 3.6, citeScore: 6.4 },
      { year: 2022, jif: 12.1, citeScore: 14.2 },
      { year: 2023, jif: 8.4, citeScore: 12.5 },
      { year: 2024, jif: 5.2, citeScore: 10.6 },
      { year: 2025, jif: 4.8, citeScore: 10.2 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'CARE (Case Reports routed to IJID Regions)'],
      wordLimitAbstract: 200,
      wordLimitMainText: '3,500 words (Full-Length Articles) / 1,200 words (Short Communications)',
      maxReferences: 35,
      maxTablesFigures: 5,
      referenceStyle: 'Harvard',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Highlights bullet list required (3 to 5 bullets, max 85 characters per bullet)',
        'Ethical approval reference number and informed consent declaration mandatory',
        'Declaration of generative AI use in writing if applicable'
      ],
      dataSharingPolicy: 'Encourages Mendeley Data or Zenodo link along with Data Availability statement.',
      coverLetterChecklist: [
        'Include 3-5 concise Highlights summarizing core discovery',
        'Confirm alignment with ISID global infectious disease mission',
        'Verify Research4Life waiver eligibility if corresponding author is in Group A/B country'
      ],
      preprintPolicy: 'Accepts preprints and supports SSRN First Look.',
      authorPortalUrl: 'https://www.ijidonline.com/'
    }
  },
  {
    id: 'plos-ntd',
    title: 'PLOS Neglected Tropical Diseases',
    abbreviation: 'PLoS Negl. Trop. Dis.',
    issn: '1935-2727',
    eissn: '1935-2735',
    publisher: 'Public Library of Science (PLOS)',
    tier: 'Q1',
    sjrScore: 1.56,
    impactFactor: 3.8,
    fiveYearImpactFactor: 4.5,
    citeScore: 7.4,
    hIndex: 162,
    apcUsd: 2630,
    accessModel: 'Gold OA',
    waiverPolicy: 'Full HINARI / Research4Life A&B Waiver',
    subjectPrimary: 'Infectious Diseases & Tropical Medicine',
    subjects: ['Infectious Diseases & Tropical Medicine', 'Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health'],
    country: 'United States',
    region: 'North America',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 36,
    firstDecisionDays: 34,
    publicationTimeDays: 78,
    scopeSummary: 'Leading open-access journal devoted solely to the pathology, epidemiology, prevention, treatment, and control of neglected tropical diseases (helminths, vector-borne protozoans, arboviruses, snakebite, mycoses).',
    keyTopics: ['Neglected Tropical Diseases', 'Vector Control', 'Mass Drug Administration', 'Schistosomiasis & Filariasis', 'Dengue & Chikungunya'],
    impactHistory: [
      { year: 2021, jif: 4.4, citeScore: 7.1 },
      { year: 2022, jif: 4.8, citeScore: 7.6 },
      { year: 2023, jif: 4.3, citeScore: 7.5 },
      { year: 2024, jif: 3.9, citeScore: 7.4 },
      { year: 2025, jif: 3.8, citeScore: 7.4 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'ARRIVE (Animal Research)'],
      wordLimitAbstract: 300,
      wordLimitMainText: 'No strict word limit (typically 4,000 - 6,000 words)',
      maxReferences: 70,
      maxTablesFigures: 8,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Mandatory 150-200 word non-technical Author Summary explaining significance to general public health readers',
        'PLOS Global Inclusivity Questionnaire required for research conducted outside authors home country',
        'Full underlying data must be available without restriction'
      ],
      dataSharingPolicy: 'Strict PLOS Open Data Policy: all minimal dataset files must be in Dryad, Figshare, OSF, or Supporting Information.',
      coverLetterChecklist: [
        'Verify inclusion of non-technical Author Summary right after Abstract',
        'Request PLOS Global Equity fee waiver during initial submission step if applicable',
        'Confirm all raw tabular data behind figures are uploaded'
      ],
      preprintPolicy: 'Automatically offers bioRxiv/medRxiv posting and welcomes all preprints.',
      authorPortalUrl: 'https://journals.plos.org/plosntds/'
    }
  },
  {
    id: 'ije-oxford',
    title: 'International Journal of Epidemiology',
    abbreviation: 'Int. J. Epidemiol.',
    issn: '0300-5771',
    eissn: '1464-3685',
    publisher: 'Oxford University Press (IEA Official Journal)',
    tier: 'Q1',
    sjrScore: 3.45,
    impactFactor: 6.4,
    fiveYearImpactFactor: 8.7,
    citeScore: 13.8,
    hIndex: 248,
    apcUsd: 4620,
    accessModel: 'Hybrid',
    waiverPolicy: 'Standard Subscription (Zero OA Fee)',
    subjectPrimary: 'Epidemiology & Field Surveillance',
    subjects: ['Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health', 'Oncology & Non-Communicable Diseases'],
    country: 'United Kingdom',
    region: 'Europe',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central'],
    acceptanceRatePct: 12,
    firstDecisionDays: 29,
    publicationTimeDays: 65,
    scopeSummary: 'Official journal of the International Epidemiological Association (IEA). Publishes advances in epidemiological causal inference, Cohort Profiles, Health & Demographic Surveillance System (HDSS) profiles, and global disease etiology.',
    keyTopics: ['Causal Inference', 'Cohort Profiles', 'HDSS Surveillance Profiles', 'Mendelian Randomization', 'Environmental Epidemiology'],
    impactHistory: [
      { year: 2021, jif: 7.2, citeScore: 12.9 },
      { year: 2022, jif: 9.7, citeScore: 15.1 },
      { year: 2023, jif: 7.7, citeScore: 14.4 },
      { year: 2024, jif: 6.7, citeScore: 14.0 },
      { year: 2025, jif: 6.4, citeScore: 13.8 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'RECORD (Routinely Collected Health Data)', 'STREGA (Genetic Association)', 'PRISMA'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,000 words (Original Articles) / 2,500 words (Cohort Profiles)',
      maxReferences: 40,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Avoid P-value dichotomization ("statistically significant"); report exact point estimates and 95% confidence intervals',
        'Key Messages bullet box required (3-5 bullet points)',
        'Explicit directed acyclic graphs (DAGs) or confounder selection rationale expected'
      ],
      dataSharingPolicy: 'Mandatory Data Availability section; analytical code (R/Stata/Python) sharing strongly expected.',
      coverLetterChecklist: [
        'Ensure manuscript strictly avoids binary "statistically significant/insignificant" phrasing per IJE editorial policy',
        'Choose Hybrid Subscription ($0 fee) or Open Access option upon acceptance',
        'Highlight methodological rigor and international generalizability'
      ],
      preprintPolicy: 'Accepts manuscripts posted on non-commercial preprint repositories.',
      authorPortalUrl: 'https://academic.oup.com/ije'
    }
  },
  {
    id: 'jmir-public-health',
    title: 'JMIR Public Health and Surveillance',
    abbreviation: 'JMIR Public Health Surveill.',
    issn: '2369-2960',
    eissn: '2369-2960',
    publisher: 'JMIR Publications',
    tier: 'Q1',
    sjrScore: 1.62,
    impactFactor: 3.5,
    fiveYearImpactFactor: 4.8,
    citeScore: 8.1,
    hIndex: 64,
    apcUsd: 2950,
    accessModel: 'Gold OA',
    waiverPolicy: '50% LMIC Discount',
    subjectPrimary: 'Health Informatics & Digital Health',
    subjects: ['Health Informatics & Digital Health', 'Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health'],
    country: 'Canada',
    region: 'North America',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 31,
    firstDecisionDays: 38,
    publicationTimeDays: 82,
    scopeSummary: 'Bridges public health epidemiology and digital health informatics. Covers real-time disease surveillance systems, infodemiology, participatory epidemiology, GIS spatial modeling, and AI-driven outbreak detection.',
    keyTopics: ['Digital Disease Surveillance', 'GIS & Spatial Epidemiology', 'Infodemiology', 'Electronic Health Records', 'Participatory Surveillance'],
    impactHistory: [
      { year: 2021, jif: 4.1, citeScore: 6.2 },
      { year: 2022, jif: 14.6, citeScore: 11.4 },
      { year: 2023, jif: 8.5, citeScore: 10.1 },
      { year: 2024, jif: 4.0, citeScore: 8.5 },
      { year: 2025, jif: 3.5, citeScore: 8.1 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'RECORD', 'CHERRIES (Web Surveys)', 'TRIPOD+AI (Prediction Models)'],
      wordLimitAbstract: 450,
      wordLimitMainText: '5,000 words (Original Papers) / 2,000 words (Short Papers)',
      maxReferences: 50,
      maxTablesFigures: 6,
      referenceStyle: 'AMA 11th Edition',
      blindingPolicy: 'Open Peer Review',
      ethicsRequirements: [
        'Structured abstract with Background, Objective, Methods, Results, Conclusions (and Trial Registration if applicable)',
        'Completed CHERRIES or STROBE checklist uploaded as Multimedia Appendix',
        'Strict disclosure of any LLM/AI tools used in analysis or manuscript drafting'
      ],
      dataSharingPolicy: 'Data Availability Statement required; open-source surveillance code on GitHub encouraged.',
      coverLetterChecklist: [
        'Emphasize intersection of public health practice and digital/surveillance methodology',
        'Confirm structured abstract adheres to JMIR subheadings',
        'Attach completed EQUATOR reporting checklist as supplementary file'
      ],
      preprintPolicy: 'Integrated with JMIR Preprints; all submissions can opt into open peer review.',
      authorPortalUrl: 'https://publichealth.jmir.org/'
    }
  },
  {
    id: 'bmc-public-health',
    title: 'BMC Public Health',
    abbreviation: 'BMC Public Health',
    issn: '1471-2458',
    eissn: '1471-2458',
    publisher: 'Springer Nature (BioMed Central)',
    tier: 'Q1',
    sjrScore: 1.38,
    impactFactor: 3.5,
    fiveYearImpactFactor: 4.4,
    citeScore: 6.8,
    hIndex: 198,
    apcUsd: 2990,
    accessModel: 'Gold OA',
    waiverPolicy: 'Full HINARI / Research4Life A&B Waiver',
    subjectPrimary: 'Public, Environmental & Occupational Health',
    subjects: ['Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance', 'Maternal, Child & Adolescent Health', 'Mental Health & Psychiatric Epidemiology'],
    country: 'United Kingdom',
    region: 'Europe',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 44,
    firstDecisionDays: 42,
    publicationTimeDays: 98,
    scopeSummary: 'Inclusive Q1 open-access journal evaluating manuscripts on scientific and methodological soundness rather than subjective perceived impact. Covers social determinants of health, behavioral epidemiology, occupational health, and chronic disease prevention.',
    keyTopics: ['Social Determinants of Health', 'Cross-Sectional & Cohort Surveys', 'Health Promotion', 'Maternal & Child Nutrition', 'Occupational Epidemiology'],
    impactHistory: [
      { year: 2021, jif: 3.3, citeScore: 5.1 },
      { year: 2022, jif: 4.1, citeScore: 6.0 },
      { year: 2023, jif: 4.5, citeScore: 6.7 },
      { year: 2024, jif: 3.6, citeScore: 6.8 },
      { year: 2025, jif: 3.5, citeScore: 6.8 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'COREQ (Qualitative)'],
      wordLimitAbstract: 350,
      wordLimitMainText: 'No maximum word limit (concise presentation expected)',
      maxReferences: 60,
      maxTablesFigures: 7,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Open Peer Review',
      ethicsRequirements: [
        'Mandatory "Declarations" section containing: Ethics approval and consent to participate, Consent for publication, Availability of data and materials, Competing interests, Funding, Authors contributions',
        'Written informed consent statement explicitly naming the institutional ethics board',
        'Clinical trial registration number in abstract if interventional'
      ],
      dataSharingPolicy: 'Mandatory Availability of Data and Materials declaration in the manuscript Declarations section.',
      coverLetterChecklist: [
        'Verify all 7 mandatory BMC Declarations subheadings are present at end of manuscript',
        'Confirm automatic Springer Nature LMIC Country Tier 1/2 waiver eligibility',
        'Highlight methodological rigor and sample size adequacy'
      ],
      preprintPolicy: 'Integrated with Research Square In Review preprint platform.',
      authorPortalUrl: 'https://bmcpublichealth.biomedcentral.com/'
    }
  },
  {
    id: 'epirev-johnshopkins',
    title: 'Epidemiologic Reviews',
    abbreviation: 'Epidemiol. Rev.',
    issn: '0193-936X',
    eissn: '1478-6729',
    publisher: 'Oxford University Press (Johns Hopkins Bloomberg School)',
    tier: 'Q1',
    sjrScore: 2.75,
    impactFactor: 5.9,
    fiveYearImpactFactor: 8.1,
    citeScore: 11.4,
    hIndex: 118,
    apcUsd: 4250,
    accessModel: 'Hybrid',
    waiverPolicy: 'Standard Subscription (Zero OA Fee)',
    subjectPrimary: 'Epidemiology & Field Surveillance',
    subjects: ['Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health', 'Oncology & Non-Communicable Diseases', 'Mental Health & Psychiatric Epidemiology'],
    country: 'United States',
    region: 'North America',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central'],
    acceptanceRatePct: 16,
    firstDecisionDays: 35,
    publicationTimeDays: 80,
    scopeSummary: 'Sponsored by the Johns Hopkins Bloomberg School of Public Health and Society for Epidemiologic Research. Publishes authoritative systematic reviews and meta-analyses synthesizing epidemiological evidence across major public health domains.',
    keyTopics: ['Systematic Reviews', 'Meta-Analysis', 'Risk Factor Synthesis', 'Bias & Heterogeneity Assessment', 'Public Health Evidence'],
    impactHistory: [
      { year: 2021, jif: 6.7, citeScore: 10.9 },
      { year: 2022, jif: 7.4, citeScore: 12.1 },
      { year: 2023, jif: 6.5, citeScore: 11.8 },
      { year: 2024, jif: 6.1, citeScore: 11.5 },
      { year: 2025, jif: 5.9, citeScore: 11.4 }
    ],
    guidelines: {
      reportingStandards: ['PRISMA 2020', 'MOOSE (Meta-analysis of Observational Studies)', 'PROSPERO Registration'],
      wordLimitAbstract: 200,
      wordLimitMainText: '5,000 words',
      maxReferences: 90,
      maxTablesFigures: 6,
      referenceStyle: 'AMA 11th Edition',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'PROSPERO registration ID strongly expected for all systematic reviews',
        'Complete search strategy string for at least 3 bibliographic databases in supplementary appendix',
        'Formal risk-of-bias assessment (ROBINS-I, RoB 2, or Newcastle-Ottawa Scale)'
      ],
      dataSharingPolicy: 'Extracted study-level data tables and meta-analysis forest plot scripts must be shared.',
      coverLetterChecklist: [
        'Confirm manuscript is a comprehensive Systematic Review or Meta-Analysis (no primary single-study reports)',
        'Provide PROSPERO registration number',
        'Select Hybrid zero-fee publication or optional Open Access'
      ],
      preprintPolicy: 'Accepts preprints posted prior to peer review.',
      authorPortalUrl: 'https://academic.oup.com/epirev'
    }
  },
  {
    id: 'epih-korea',
    title: 'Epidemiology and Health (epiH)',
    abbreviation: 'Epidemiol. Health',
    issn: '2092-7193',
    eissn: '2092-7193',
    publisher: 'Korean Society of Epidemiology',
    tier: 'Q1',
    sjrScore: 1.44,
    impactFactor: 3.8,
    fiveYearImpactFactor: 4.6,
    citeScore: 6.9,
    hIndex: 44,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Epidemiology & Field Surveillance',
    subjects: ['Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health', 'Infectious Diseases & Tropical Medicine'],
    country: 'Japan',
    region: 'Asia-Pacific',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 26,
    firstDecisionDays: 25,
    publicationTimeDays: 60,
    scopeSummary: 'High-tier Q1 Diamond Open Access epidemiology journal in the Asia-Pacific region charging $0 APC to international authors. Publishes original epidemiological studies, surveillance reports, cohort profiles, and statistical methodologies.',
    keyTopics: ['Asia-Pacific Epidemiology', 'Outbreak & Surveillance Reports', 'Chronic Disease Cohorts', 'Biostatistical Methods', 'Zero-APC Q1 Publishing'],
    impactHistory: [
      { year: 2021, jif: 3.2, citeScore: 4.8 },
      { year: 2022, jif: 5.9, citeScore: 7.4 },
      { year: 2023, jif: 4.2, citeScore: 7.1 },
      { year: 2024, jif: 3.9, citeScore: 6.9 },
      { year: 2025, jif: 3.8, citeScore: 6.9 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'SAGER (Sex and Gender Equity)'],
      wordLimitAbstract: 250,
      wordLimitMainText: '4,000 words (Original Articles) / 2,000 words (Brief Communications)',
      maxReferences: 45,
      maxTablesFigures: 6,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Mandatory standalone "Ethics Statement" subheading at the end of Methods or main text',
        'SAGER guideline adherence: disaggregate epidemiological outcomes by sex/gender or justify single-sex design',
        'Key Message box summarizing study objectives and public health impact'
      ],
      dataSharingPolicy: 'Data Availability Statement required prior to references.',
      coverLetterChecklist: [
        'Verify manuscript is anonymized for double-blind peer review',
        'Confirm inclusion of explicit Ethics Statement subheading',
        'Note zero APC policy funded by the Korean Society of Epidemiology'
      ],
      preprintPolicy: 'Accepts preprints with full disclosure in the cover letter.',
      authorPortalUrl: 'https://www.e-epih.org/'
    }
  },
  {
    id: 'eurosurveillance',
    title: 'Eurosurveillance',
    abbreviation: 'Euro Surveill.',
    issn: '1025-496X',
    eissn: '1560-7917',
    publisher: 'European Centre for Disease Prevention and Control (ECDC)',
    tier: 'Q1',
    sjrScore: 4.18,
    impactFactor: 9.9,
    fiveYearImpactFactor: 12.4,
    citeScore: 18.2,
    hIndex: 158,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Epidemiology & Field Surveillance',
    subjects: ['Epidemiology & Field Surveillance', 'Infectious Diseases & Tropical Medicine', 'Public, Environmental & Occupational Health'],
    country: 'Sweden',
    region: 'Europe',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 16,
    firstDecisionDays: 14,
    publicationTimeDays: 42,
    scopeSummary: 'Diamond open-access journal published by ECDC with zero publication or submission fees. Rapidly disseminates authoritative Rapid Communications (within 2-3 weeks), outbreak investigations, and communicable disease surveillance with European and global relevance.',
    keyTopics: ['Rapid Outbreak Communications', 'Communicable Disease Control', 'Vaccine Effectiveness', 'Cross-Border Threat Surveillance', 'AMR Monitoring'],
    impactHistory: [
      { year: 2021, jif: 6.3, citeScore: 12.4 },
      { year: 2022, jif: 21.3, citeScore: 22.8 },
      { year: 2023, jif: 19.0, citeScore: 21.5 },
      { year: 2024, jif: 10.6, citeScore: 18.9 },
      { year: 2025, jif: 9.9, citeScore: 18.2 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'ORION', 'PRISMA'],
      wordLimitAbstract: 250,
      wordLimitMainText: '1,500 words (Rapid Communications) / 3,500 words (Surveillance & Research)',
      maxReferences: 30,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Explicit Ethical Statement subheading detailing national public health mandate or ethics board approval',
        'Rapid Communications must address an ongoing or recently detected public health threat requiring immediate action',
        'UK English spelling required throughout'
      ],
      dataSharingPolicy: 'Genomic sequence IDs (GISAID/ENA/GenBank) mandatory before publication.',
      coverLetterChecklist: [
        'Explain relevance to European or international communicable disease prevention and control',
        'For Rapid Communications, justify why immediate rapid track review (48-72h) is needed',
        'Confirm zero APC diamond open access compliance'
      ],
      preprintPolicy: 'Permits preprint posting on medRxiv and bioRxiv.',
      authorPortalUrl: 'https://www.eurosurveillance.org/'
    }
  },
  {
    id: 'global-health-action',
    title: 'Global Health Action',
    abbreviation: 'Glob. Health Action',
    issn: '1654-9716',
    eissn: '1654-9880',
    publisher: 'Taylor & Francis (Umeå Centre for Global Health Research)',
    tier: 'Q2',
    sjrScore: 1.05,
    impactFactor: 2.6,
    fiveYearImpactFactor: 3.4,
    citeScore: 5.2,
    hIndex: 76,
    apcUsd: 2390,
    accessModel: 'Gold OA',
    waiverPolicy: 'Full HINARI / Research4Life A&B Waiver',
    subjectPrimary: 'Global & International Health Policy',
    subjects: ['Global & International Health Policy', 'Public, Environmental & Occupational Health', 'Oncology & Non-Communicable Diseases', 'Maternal, Child & Adolescent Health'],
    country: 'Sweden',
    region: 'Europe',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 34,
    firstDecisionDays: 39,
    publicationTimeDays: 84,
    scopeSummary: 'Focuses on bridging the know-do gap in global health action, particularly utilizing INDEPTH Health and Demographic Surveillance Systems (HDSS), climate change health impacts, NCD prevention in LMICs, and capacity building.',
    keyTopics: ['Know-Do Implementation Gap', 'Climate Change & Health', 'NCDs in LMICs', 'HDSS Longitudinal Data', 'Health Policy Action'],
    impactHistory: [
      { year: 2021, jif: 2.7, citeScore: 4.5 },
      { year: 2022, jif: 3.0, citeScore: 5.1 },
      { year: 2023, jif: 2.9, citeScore: 5.3 },
      { year: 2024, jif: 2.7, citeScore: 5.2 },
      { year: 2025, jif: 2.6, citeScore: 5.2 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'COREQ', 'PRISMA'],
      wordLimitAbstract: 300,
      wordLimitMainText: '4,500 words (Original Articles) / 3,000 words (Short Communications)',
      maxReferences: 45,
      maxTablesFigures: 6,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Paper Context box required (Main findings, Added knowledge, Global health action for policy/practice)',
        'Local institutional ethics approval and local co-investigator involvement required',
        'Responsible Editor and Reviewer names published on final article'
      ],
      dataSharingPolicy: 'Taylor & Francis Basic Data Sharing Policy; repository citation encouraged.',
      coverLetterChecklist: [
        'Include 100-word Paper Context box in manuscript file',
        'Specify actionable policy recommendations for global health practitioners',
        'Check Taylor & Francis Research4Life waiver list for corresponding author institution'
      ],
      preprintPolicy: 'Accepts preprints from all recognized servers.',
      authorPortalUrl: 'https://www.tandfonline.com/journals/zgha20'
    }
  },
  {
    id: 'ajtmh-astmh',
    title: 'American Journal of Tropical Medicine and Hygiene',
    abbreviation: 'Am. J. Trop. Med. Hyg.',
    issn: '0002-9637',
    eissn: '1476-1645',
    publisher: 'American Society of Tropical Medicine and Hygiene (ASTMH)',
    tier: 'Q2',
    sjrScore: 1.18,
    impactFactor: 2.3,
    fiveYearImpactFactor: 3.1,
    citeScore: 5.6,
    hIndex: 176,
    apcUsd: 2200,
    accessModel: 'Hybrid',
    waiverPolicy: '50% LMIC Discount',
    subjectPrimary: 'Infectious Diseases & Tropical Medicine',
    subjects: ['Infectious Diseases & Tropical Medicine', 'Epidemiology & Field Surveillance', 'Maternal, Child & Adolescent Health'],
    country: 'United States',
    region: 'North America',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central'],
    acceptanceRatePct: 38,
    firstDecisionDays: 31,
    publicationTimeDays: 74,
    scopeSummary: 'Official journal of ASTMH. Publishes field and laboratory research on malaria, arboviruses, parasitic diseases, enteric pathogens, tropical clinical medicine, and global travel medicine.',
    keyTopics: ['Malaria Elimination', 'Parasitology & Vector Biology', 'Tropical Clinical Case Reports', 'Enteric & Waterborne Pathogens', 'Travel Medicine'],
    impactHistory: [
      { year: 2021, jif: 2.3, citeScore: 4.4 },
      { year: 2022, jif: 3.7, citeScore: 5.8 },
      { year: 2023, jif: 3.3, citeScore: 5.9 },
      { year: 2024, jif: 2.5, citeScore: 5.7 },
      { year: 2025, jif: 2.3, citeScore: 5.6 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'CARE'],
      wordLimitAbstract: 250,
      wordLimitMainText: '4,000 words (Full Articles) / 1,500 words (Short Reports)',
      maxReferences: 40,
      maxTablesFigures: 5,
      referenceStyle: 'AMA 11th Edition',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Complete current postal address and email of all co-authors required at end of manuscript',
        'Animal welfare and human IRB protocol numbers must be stated in Methods',
        'ASTMH members and LMIC authors receive reduced page/publication charges'
      ],
      dataSharingPolicy: 'Sequence and clinical trial registration numbers required prior to review.',
      coverLetterChecklist: [
        'Specify full article vs Short Report (max 1,500 words, 2 figures/tables)',
        'Indicate ASTMH membership or LMIC institutional status for fee reduction',
        'Verify unstructured single-paragraph abstract (max 250 words)'
      ],
      preprintPolicy: 'Accepts submissions posted on medRxiv/bioRxiv.',
      authorPortalUrl: 'https://www.ajtmh.org/'
    }
  },
  {
    id: 'rsp-brazil',
    title: 'Revista de Saúde Pública',
    abbreviation: 'Rev. Saude Publica',
    issn: '0034-8910',
    eissn: '1518-8787',
    publisher: 'Universidade de São Paulo (FSP-USP)',
    tier: 'Q2',
    sjrScore: 0.92,
    impactFactor: 2.1,
    fiveYearImpactFactor: 2.8,
    citeScore: 4.3,
    hIndex: 94,
    apcUsd: 850,
    accessModel: 'Gold OA',
    waiverPolicy: 'Case-by-Case Institutional Waiver',
    subjectPrimary: 'Public, Environmental & Occupational Health',
    subjects: ['Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance', 'Health Economics & Systems Research'],
    country: 'Brazil',
    region: 'Latin America',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ', 'SciELO'],
    acceptanceRatePct: 22,
    firstDecisionDays: 45,
    publicationTimeDays: 110,
    scopeSummary: 'Premier Latin American public health and epidemiology journal published by the University of São Paulo. Publishes bilingual (English/Portuguese) original research on epidemiological surveillance, health policy, nutrition, and social inequality.',
    keyTopics: ['Latin American Public Health', 'SUS Health System', 'Nutritional Epidemiology', 'Arbovirus Surveillance', 'Urban Health Inequities'],
    impactHistory: [
      { year: 2021, jif: 2.0, citeScore: 3.5 },
      { year: 2022, jif: 2.9, citeScore: 4.4 },
      { year: 2023, jif: 2.4, citeScore: 4.5 },
      { year: 2024, jif: 2.2, citeScore: 4.4 },
      { year: 2025, jif: 2.1, citeScore: 4.3 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'SRQR'],
      wordLimitAbstract: 300,
      wordLimitMainText: '3,500 words (Original Articles) / 1,500 words (Brief Communications)',
      maxReferences: 30,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Descriptors must be selected strictly from DeCS (Health Sciences Descriptors) or MeSH',
        'ORCID iD mandatory for all co-authors at submission',
        'Ethics committee CAAE or international IRB approval number mandatory'
      ],
      dataSharingPolicy: 'Aligns with SciELO Open Science guidelines; encourages SciELO Data repository deposit.',
      coverLetterChecklist: [
        'Confirm descriptors match official MeSH/DeCS vocabulary',
        'Verify manuscript has ≤30 references and ≤5 tables/figures',
        'Include detailed CRediT author contribution statement'
      ],
      preprintPolicy: 'Actively supports SciELO Preprints and medRxiv.',
      authorPortalUrl: 'https://www.rsp.fsp.usp.br/'
    }
  },
  {
    id: 'ijmr-india',
    title: 'Indian Journal of Medical Research',
    abbreviation: 'Indian J. Med. Res.',
    issn: '0971-5916',
    eissn: '0975-9174',
    publisher: 'Indian Council of Medical Research (ICMR)',
    tier: 'Q2',
    sjrScore: 0.88,
    impactFactor: 2.7,
    fiveYearImpactFactor: 3.4,
    citeScore: 5.1,
    hIndex: 112,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'General & Internal Medicine',
    subjects: ['General & Internal Medicine', 'Infectious Diseases & Tropical Medicine', 'Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance'],
    country: 'India',
    region: 'Asia-Pacific',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 18,
    firstDecisionDays: 42,
    publicationTimeDays: 105,
    scopeSummary: 'One of the oldest continuously published biomedical and public health journals in Asia, funded by ICMR with zero submission or publication fees. Covers clinical medicine, infectious disease surveillance, public health programs, and health technology assessment.',
    keyTopics: ['Biomedical & Clinical Research', 'Tuberculosis & Antimicrobial Resistance', 'Public Health Surveillance', 'Maternal & Neonatal Health', 'Zero-APC Q2 SCIE'],
    impactHistory: [
      { year: 2021, jif: 2.3, citeScore: 4.1 },
      { year: 2022, jif: 5.3, citeScore: 6.2 },
      { year: 2023, jif: 4.2, citeScore: 5.8 },
      { year: 2024, jif: 2.9, citeScore: 5.3 },
      { year: 2025, jif: 2.7, citeScore: 5.1 }
    ],
    guidelines: {
      reportingStandards: ['CONSORT', 'STROBE', 'PRISMA', 'ICMR National Ethical Guidelines'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,500 words (Original Articles) / 1,500 words (Short Research Communications)',
      maxReferences: 35,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Signed IJMR Copyright & Author Declaration form required from all authors',
        'Clinical trials in India must be registered in CTRI (or WHO ICTRP internationally)',
        'Institutional Ethics Committee approval date and reference code mandatory'
      ],
      dataSharingPolicy: 'Raw data must be retained by authors and provided upon editorial or reader request.',
      coverLetterChecklist: [
        'Ensure blind manuscript file contains zero identifying author/institution metadata',
        'Upload separate Title Page with complete affiliations and acknowledgments',
        'Confirm zero APC diamond open access status'
      ],
      preprintPolicy: 'Permits non-commercial preprints if declared at submission.',
      authorPortalUrl: 'https://journals.lww.com/ijmr/'
    }
  },
  {
    id: 'wpro-wpsar',
    title: 'Western Pacific Surveillance and Response Journal',
    abbreviation: 'Western Pac. Surveill. Response J.',
    issn: '2094-7321',
    eissn: '2094-7313',
    publisher: 'World Health Organization Regional Office for the Western Pacific (WHO WPRO)',
    tier: 'Q3',
    sjrScore: 0.64,
    impactFactor: 1.5,
    fiveYearImpactFactor: 2.0,
    citeScore: 2.9,
    hIndex: 28,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Epidemiology & Field Surveillance',
    subjects: ['Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health', 'Infectious Diseases & Tropical Medicine'],
    country: 'Australia',
    region: 'Asia-Pacific',
    indexing: ['ESCI', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 48,
    firstDecisionDays: 28,
    publicationTimeDays: 70,
    scopeSummary: 'WHO-published Diamond Open Access journal dedicated to field epidemiology training programs (FETP), acute public health event responses, surveillance system evaluations, and disaster health management in the Asia-Pacific region.',
    keyTopics: ['FETP Field Outbreak Investigations', 'Surveillance System Evaluations', 'Disaster & Emergency Response', 'IHR (2005) Implementation', 'Zero-APC WHO Journal'],
    impactHistory: [
      { year: 2021, jif: 1.2, citeScore: 2.2 },
      { year: 2022, jif: 2.4, citeScore: 3.4 },
      { year: 2023, jif: 1.9, citeScore: 3.2 },
      { year: 2024, jif: 1.6, citeScore: 3.0 },
      { year: 2025, jif: 1.5, citeScore: 2.9 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CDC Surveillance Evaluation Guidelines', 'ORION'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,000 words (Outbreak Investigations & Surveillance Evaluations) / 2,000 words (Lessons from the Field)',
      maxReferences: 30,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Outbreak investigations conducted under national Ministry of Health public health response authority may declare ethics exemption with justification',
        'Specific article types tailored to FETP fellows: Outbreak Investigation Report, Surveillance Report, Surveillance System Evaluation',
        'Strict anonymization of manuscript text for double-blind review'
      ],
      dataSharingPolicy: 'Aggregated surveillance data must be presented clearly; line-list patient identifiers strictly prohibited.',
      coverLetterChecklist: [
        'Select exact field epidemiology article category (e.g. Surveillance System Evaluation vs Outbreak Investigation)',
        'State public health action taken as a direct result of the investigation',
        'Mention FETP affiliation if lead author is a Field Epidemiology fellow or graduate'
      ],
      preprintPolicy: 'Accepts preprints and conference abstracts from TEPHINET/SAFETYNET.',
      authorPortalUrl: 'https://ojs.wpro.who.int/'
    }
  },
  {
    id: 'pamj-africa',
    title: 'Pan African Medical Journal',
    abbreviation: 'Pan Afr. Med. J.',
    issn: '1937-8688',
    eissn: '1937-8688',
    publisher: 'African Field Epidemiology Network (AFENET)',
    tier: 'Q3',
    sjrScore: 0.42,
    impactFactor: 1.2,
    fiveYearImpactFactor: 1.5,
    citeScore: 2.3,
    hIndex: 62,
    apcUsd: 380,
    accessModel: 'Gold OA',
    waiverPolicy: 'Case-by-Case Institutional Waiver',
    subjectPrimary: 'Public, Environmental & Occupational Health',
    subjects: ['Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance', 'Infectious Diseases & Tropical Medicine', 'General & Internal Medicine'],
    country: 'Kenya',
    region: 'Africa & Middle East',
    indexing: ['ESCI', 'Scopus', 'MEDLINE', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 54,
    firstDecisionDays: 26,
    publicationTimeDays: 58,
    scopeSummary: 'Co-published with the African Field Epidemiology Network (AFENET). High-volume PubMed/Scopus-indexed open-access journal with ultra-low APC ($380) publishing clinical research, field epidemiology outbreak reports, and public health interventions across Africa and LMICs.',
    keyTopics: ['African Field Epidemiology', 'Outbreak & Surveillance Reports', 'Clinical Case Series', 'Immunization Coverage', 'Low-APC PubMed Indexed'],
    impactHistory: [
      { year: 2021, jif: 1.0, citeScore: 1.6 },
      { year: 2022, jif: 1.7, citeScore: 2.4 },
      { year: 2023, jif: 1.4, citeScore: 2.4 },
      { year: 2024, jif: 1.3, citeScore: 2.3 },
      { year: 2025, jif: 1.2, citeScore: 2.3 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'CARE', 'PRISMA'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,500 words (Research) / 1,500 words (Case Reports)',
      maxReferences: 30,
      maxTablesFigures: 6,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Mandatory "What is known about this topic" (max 3 bullets) and "What this study adds" (max 3 bullets) box',
        'National or institutional ethics clearance number required for all primary studies',
        'Accepts manuscripts in both English and French'
      ],
      dataSharingPolicy: 'Authors encouraged to share datasets via PAMJ or institutional repositories.',
      coverLetterChecklist: [
        'Include mandatory 3-bullet "What is known" and 3-bullet "What this study adds" section',
        'Verify table and figure legends are self-explanatory with place and year',
        'Check AFENET / FETP program sponsorship if applicable'
      ],
      preprintPolicy: 'Accepts preprints.',
      authorPortalUrl: 'https://www.panafrican-med-journal.com/'
    }
  },
  {
    id: 'kesmas-indonesia',
    title: 'Kesmas: Jurnal Kesehatan Masyarakat Nasional (National Public Health Journal)',
    abbreviation: 'Kesmas',
    issn: '1907-7505',
    eissn: '2460-0601',
    publisher: 'Faculty of Public Health, Universitas Indonesia',
    tier: 'Q3',
    sjrScore: 0.36,
    impactFactor: 1.1,
    fiveYearImpactFactor: 1.4,
    citeScore: 2.1,
    hIndex: 24,
    apcUsd: 350,
    accessModel: 'Gold OA',
    waiverPolicy: 'Case-by-Case Institutional Waiver',
    subjectPrimary: 'Public, Environmental & Occupational Health',
    subjects: ['Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance', 'Maternal, Child & Adolescent Health', 'Health Economics & Systems Research'],
    country: 'Indonesia',
    region: 'Asia-Pacific',
    indexing: ['ESCI', 'Scopus', 'DOAJ', 'SINTA 1'],
    acceptanceRatePct: 32,
    firstDecisionDays: 35,
    publicationTimeDays: 90,
    scopeSummary: 'Flagship Scopus Q3 and Web of Science ESCI-indexed public health journal in Southeast Asia published by Universitas Indonesia. Covers epidemiology, biostatistics, environmental health, occupational safety, reproductive health, and public health nutrition.',
    keyTopics: ['Southeast Asian Public Health', 'Stunting & Maternal Nutrition', 'Environmental & Occupational Health', 'Communicable Disease Control', 'Low-APC Scopus Indexed'],
    impactHistory: [
      { year: 2021, jif: 0.8, citeScore: 1.3 },
      { year: 2022, jif: 1.3, citeScore: 2.2 },
      { year: 2023, jif: 1.2, citeScore: 2.2 },
      { year: 2024, jif: 1.1, citeScore: 2.1 },
      { year: 2025, jif: 1.1, citeScore: 2.1 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,500 - 4,000 words',
      maxReferences: 40,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'At least 80% of references must be primary journal articles published within the last 10 years',
        'Ethics approval letter PDF must be uploaded as a Supplementary File during OJS submission',
        'Double-blind review: strip all author names and acknowledgments from main manuscript'
      ],
      dataSharingPolicy: 'Summary data must be reported in tables; raw data available upon editorial audit.',
      coverLetterChecklist: [
        'Verify ≥80% of citations are recent peer-reviewed journal articles (avoid excessive textbook or grey literature citations)',
        'Attach PDF scan of Institutional Ethics Committee certificate',
        'Ensure English proofreading quality meets international standards'
      ],
      preprintPolicy: 'Permits preprints with DOI declaration.',
      authorPortalUrl: 'https://scholarhub.ui.ac.id/kesmas/'
    }
  },
  {
    id: 'osong-phrp',
    title: 'Osong Public Health and Research Perspectives',
    abbreviation: 'Osong Public Health Res. Perspect.',
    issn: '2210-9099',
    eissn: '2233-6052',
    publisher: 'Korea Disease Control and Prevention Agency (KDCA)',
    tier: 'Q2',
    sjrScore: 0.96,
    impactFactor: 2.5,
    fiveYearImpactFactor: 3.1,
    citeScore: 5.4,
    hIndex: 42,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Public, Environmental & Occupational Health',
    subjects: ['Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance', 'Infectious Diseases & Tropical Medicine'],
    country: 'Japan',
    region: 'Asia-Pacific',
    indexing: ['ESCI', 'Scopus', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 35,
    firstDecisionDays: 24,
    publicationTimeDays: 56,
    scopeSummary: 'Official diamond open-access journal of the Korea Disease Control and Prevention Agency (KDCA) charging $0 APC. Focuses on national and international disease control programs, vaccine policy, epidemiological investigations, and laboratory diagnostics.',
    keyTopics: ['National Disease Control Programs', 'Outbreak Response & Surveillance', 'Vaccine Policy & Seroprevalence', 'Zero-APC Scopus Q2', 'Public Health Preparedness'],
    impactHistory: [
      { year: 2021, jif: 1.9, citeScore: 3.8 },
      { year: 2022, jif: 3.8, citeScore: 6.1 },
      { year: 2023, jif: 3.0, citeScore: 5.8 },
      { year: 2024, jif: 2.6, citeScore: 5.5 },
      { year: 2025, jif: 2.5, citeScore: 5.4 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'SAGER'],
      wordLimitAbstract: 250,
      wordLimitMainText: '4,000 words (Original Articles) / 2,000 words (Short Communications) / 1,500 words (Field Reports)',
      maxReferences: 50,
      maxTablesFigures: 6,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'HIGHLIGHTS box required (2-3 brief sentences summarizing main findings)',
        'IRB approval number or official public health investigation exemption code mandatory',
        'ORCID IDs required for all listed co-authors'
      ],
      dataSharingPolicy: 'Data Availability Statement mandatory at end of manuscript.',
      coverLetterChecklist: [
        'Include 2-3 sentence Highlights box on the title page',
        'Specify if manuscript is an Original Article, Short Communication, or Field Report',
        'Confirm zero APC diamond open access eligibility (free for all international authors)'
      ],
      preprintPolicy: 'Accepts preprints from medRxiv, bioRxiv, and SSRN.',
      authorPortalUrl: 'https://ophrp.org/'
    }
  },
  {
    id: 'jidc-developing',
    title: 'Journal of Infection in Developing Countries (JIDC)',
    abbreviation: 'J. Infect. Dev. Ctries.',
    issn: '1972-2680',
    eissn: '1972-2680',
    publisher: 'JIDC Non-Profit Organization',
    tier: 'Q3',
    sjrScore: 0.45,
    impactFactor: 1.4,
    fiveYearImpactFactor: 1.7,
    citeScore: 2.7,
    hIndex: 68,
    apcUsd: 420,
    accessModel: 'Gold OA',
    waiverPolicy: '50% LMIC Discount',
    subjectPrimary: 'Infectious Diseases & Tropical Medicine',
    subjects: ['Infectious Diseases & Tropical Medicine', 'Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health'],
    country: 'United Kingdom',
    region: 'Global / Multilateral',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'DOAJ'],
    acceptanceRatePct: 46,
    firstDecisionDays: 36,
    publicationTimeDays: 85,
    scopeSummary: 'SCIE and MEDLINE-indexed open-access journal specifically created by international scientists to support infectious disease researchers in developing countries with low, transparent sustainable fees and constructive peer mentoring.',
    keyTopics: ['LMIC Infectious Diseases', 'Clinical Microbiology & AMR', 'Hospital-Acquired Infections', 'Zoonoses & Parasitology', 'Affordable SCIE Indexed'],
    impactHistory: [
      { year: 2021, jif: 1.4, citeScore: 2.3 },
      { year: 2022, jif: 2.2, citeScore: 3.0 },
      { year: 2023, jif: 1.8, citeScore: 2.9 },
      { year: 2024, jif: 1.5, citeScore: 2.8 },
      { year: 2025, jif: 1.4, citeScore: 2.7 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'CLSI / EUCAST (Antimicrobial Susceptibility)'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,500 words (Original Articles) / 1,500 words (Short Communications)',
      maxReferences: 35,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Structured abstract with subheadings: Introduction, Methodology, Results, Conclusions',
        'Antimicrobial resistance studies must specify CLSI or EUCAST breakpoint edition year',
        'Local ethics committee approval and informed consent declaration'
      ],
      dataSharingPolicy: 'GenBank accession numbers required for molecular isolate studies.',
      coverLetterChecklist: [
        'Use exact JIDC abstract headings: Introduction, Methodology, Results, Conclusions',
        'Confirm CLSI/EUCAST quality control strains are named if reporting MIC/disk diffusion',
        'Verify World Bank country tier for reduced JIDC APC scale'
      ],
      preprintPolicy: 'Permits preprint submissions.',
      authorPortalUrl: 'https://jidc.org/'
    }
  },
  {
    id: 'outbreak-surveillance-jph',
    title: 'Journal of Public Health in Africa',
    abbreviation: 'J. Public Health Afr.',
    issn: '2038-9922',
    eissn: '2038-9930',
    publisher: 'Africa Centres for Disease Control and Prevention (Africa CDC)',
    tier: 'Q3',
    sjrScore: 0.48,
    impactFactor: 1.5,
    fiveYearImpactFactor: 1.8,
    citeScore: 2.5,
    hIndex: 26,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Global & International Health Policy',
    subjects: ['Global & International Health Policy', 'Epidemiology & Field Surveillance', 'Public, Environmental & Occupational Health', 'Infectious Diseases & Tropical Medicine'],
    country: 'South Africa',
    region: 'Africa & Middle East',
    indexing: ['ESCI', 'Scopus', 'PubMed Central', 'DOAJ'],
    acceptanceRatePct: 42,
    firstDecisionDays: 30,
    publicationTimeDays: 68,
    scopeSummary: 'Official diamond open-access journal of the Africa Centres for Disease Control and Prevention (Africa CDC). Publishes continental public health policy, epidemic intelligence, vaccine manufacturing, and health security research at zero APC.',
    keyTopics: ['Africa CDC Health Security', 'Epidemic Intelligence', 'Public Health Workforce', 'One Health Surveillance', 'Zero-APC Continental Journal'],
    impactHistory: [
      { year: 2021, jif: 1.1, citeScore: 1.8 },
      { year: 2022, jif: 2.1, citeScore: 2.8 },
      { year: 2023, jif: 1.8, citeScore: 2.7 },
      { year: 2024, jif: 1.6, citeScore: 2.6 },
      { year: 2025, jif: 1.5, citeScore: 2.5 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,500 words (Original Research) / 2,000 words (Field Reports)',
      maxReferences: 35,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Double-blind anonymization of main manuscript file',
        'Ethical clearance from national Ministry of Health or accredited institutional review board',
        'Alignment with New Public Health Order priorities encouraged'
      ],
      dataSharingPolicy: 'Supports open data sharing in accordance with Africa CDC data governance standards.',
      coverLetterChecklist: [
        'Confirm manuscript is blinded for peer review',
        'State clear public health policy implications for health ministries',
        'Note zero APC support via Africa CDC'
      ],
      preprintPolicy: 'Accepts preprints from AfricArXiv and medRxiv.',
      authorPortalUrl: 'https://publichealthinafrica.org/'
    }
  },
  {
    id: 'salud-publica-mexico',
    title: 'Salud Pública de México',
    abbreviation: 'Salud Publica Mex.',
    issn: '0036-3634',
    eissn: '1606-7916',
    publisher: 'Instituto Nacional de Salud Pública (INSP)',
    tier: 'Q2',
    sjrScore: 0.78,
    impactFactor: 2.0,
    fiveYearImpactFactor: 2.5,
    citeScore: 3.9,
    hIndex: 74,
    apcUsd: 0,
    accessModel: 'Diamond OA',
    waiverPolicy: '100% Free (No APC)',
    subjectPrimary: 'Public, Environmental & Occupational Health',
    subjects: ['Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance', 'Oncology & Non-Communicable Diseases', 'Health Economics & Systems Research'],
    country: 'Mexico',
    region: 'Latin America',
    indexing: ['SCIE', 'Scopus', 'MEDLINE', 'DOAJ', 'SciELO'],
    acceptanceRatePct: 25,
    firstDecisionDays: 40,
    publicationTimeDays: 95,
    scopeSummary: 'Diamond open-access SCIE and MEDLINE journal published by the National Institute of Public Health of Mexico (INSP) with zero APCs. Accepts English and Spanish manuscripts on chronic disease policy, fiscal food policies, environmental toxicology, and epidemiology.',
    keyTopics: ['Non-Communicable Disease Policy', 'Environmental & Nutritional Health', 'Health Systems Reform', 'Epidemiological Surveys', 'Zero-APC SCIE Journal'],
    impactHistory: [
      { year: 2021, jif: 2.1, citeScore: 3.4 },
      { year: 2022, jif: 2.8, citeScore: 4.1 },
      { year: 2023, jif: 2.4, citeScore: 4.0 },
      { year: 2024, jif: 2.1, citeScore: 3.9 },
      { year: 2025, jif: 2.0, citeScore: 3.9 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CONSORT', 'PRISMA', 'CHEERS'],
      wordLimitAbstract: 200,
      wordLimitMainText: '3,500 words (Original Articles) / 1,500 words (Brief Communications)',
      maxReferences: 35,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Bilingual abstract (English and Spanish) required; journal assists non-Spanish speakers',
        'Conflict of interest declaration and institutional ethics committee registration number mandatory',
        'Strict separation of Title Page and blinded main text'
      ],
      dataSharingPolicy: 'Supports open data repositories and reproducible statistical code.',
      coverLetterChecklist: [
        'Ensure abstract is ≤200 words structured into Objective, Materials and Methods, Results, Conclusions',
        'Confirm zero APC diamond open access policy',
        'Provide ORCID and institutional email for all authors'
      ],
      preprintPolicy: 'Accepts preprints posted on SciELO Preprints or medRxiv.',
      authorPortalUrl: 'https://saludpublica.mx/'
    }
  },
  {
    id: 'seajtmp-thailand',
    title: 'Southeast Asian Journal of Tropical Medicine and Public Health',
    abbreviation: 'Southeast Asian J. Trop. Med. Public Health',
    issn: '0125-1562',
    eissn: '2697-5718',
    publisher: 'SEAMEO TROPMED Network',
    tier: 'Q4',
    sjrScore: 0.21,
    impactFactor: 0.5,
    fiveYearImpactFactor: 0.7,
    citeScore: 1.1,
    hIndex: 61,
    apcUsd: 200,
    accessModel: 'Gold OA',
    waiverPolicy: 'Case-by-Case Institutional Waiver',
    subjectPrimary: 'Infectious Diseases & Tropical Medicine',
    subjects: ['Infectious Diseases & Tropical Medicine', 'Public, Environmental & Occupational Health', 'Epidemiology & Field Surveillance'],
    country: 'Thailand',
    region: 'Asia-Pacific',
    indexing: ['Scopus', 'MEDLINE', 'ASEAN Citation Index'],
    acceptanceRatePct: 62,
    firstDecisionDays: 35,
    publicationTimeDays: 80,
    scopeSummary: 'Regional journal of the SEAMEO Regional Tropical Medicine and Public Health Network. Ideal high-acceptance venue for descriptive regional epidemiology, baseline prevalence surveys, local vector studies, and district-level public health interventions.',
    keyTopics: ['Regional Baseline Surveys', 'Tropical Parasitology', 'District Public Health Programs', 'Food & Water Safety', 'High-Acceptance Scopus/MEDLINE'],
    impactHistory: [
      { year: 2021, jif: 0.6, citeScore: 1.2 },
      { year: 2022, jif: 0.7, citeScore: 1.3 },
      { year: 2023, jif: 0.6, citeScore: 1.2 },
      { year: 2024, jif: 0.5, citeScore: 1.1 },
      { year: 2025, jif: 0.5, citeScore: 1.1 }
    ],
    guidelines: {
      reportingStandards: ['STROBE', 'CARE'],
      wordLimitAbstract: 250,
      wordLimitMainText: '3,000 words',
      maxReferences: 30,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Single-Blind',
      ethicsRequirements: [
        'Local ethics committee approval certificate number stated in Materials and Methods',
        'Clear geographic and temporal description of study site in Title and Abstract',
        'Signed author agreement form'
      ],
      dataSharingPolicy: 'Standard summary tables within manuscript.',
      coverLetterChecklist: [
        'Highlight regional public health utility for Southeast Asian practitioners',
        'Ensure concise formatting with ≤5 tables/figures',
        'Confirm low $200 APC budget alignment'
      ],
      preprintPolicy: 'Accepts preprints.',
      authorPortalUrl: 'https://journal.seameotropmednetwork.org/'
    }
  }
];
