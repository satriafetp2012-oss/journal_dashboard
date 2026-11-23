import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  RotateCcw,
} from 'lucide-react';
import { HealthJournal, JournalTier, AccessModel, WaiverPolicy } from '../data/journals';

interface SpreadsheetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingJournals: HealthJournal[];
  onDatabaseUpdated: (
    updatedJournals: HealthJournal[],
    summary: { mode: 'merge' | 'replace'; addedCount: number; updatedCount: number; totalCount: number }
  ) => void;
}

function parseNumericField(raw: unknown, fallback: number): number {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const cleaned = String(raw)
    .replace(/[$,€£%\s]/g, '')
    .replace(/,/g, '.')
    .trim();
  if (cleaned.toLowerCase() === 'free' || cleaned.toLowerCase() === 'none' || cleaned === '-') {
    return 0;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function parseTierField(raw: unknown): JournalTier {
  const str = String(raw || '').trim().toUpperCase();
  if (str.includes('Q1') || str === '1' || str.includes('TIER 1')) return 'Q1';
  if (str.includes('Q2') || str === '2' || str.includes('TIER 2')) return 'Q2';
  if (str.includes('Q3') || str === '3' || str.includes('TIER 3')) return 'Q3';
  if (str.includes('Q4') || str === '4' || str.includes('TIER 4')) return 'Q4';
  return 'Q2';
}

function getColumnValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === target);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
      return row[matchedKey];
    }
  }
  // Substring fallback
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (target.length < 4) continue;
    const matchedKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
      return row[matchedKey];
    }
  }
  return undefined;
}

function mapSpreadsheetRowToJournal(row: Record<string, unknown>): Partial<HealthJournal> | null {
  const rawTitle = getColumnValue(row, [
    'Title',
    'Journal Title',
    'Journal Name',
    'Journal',
    'Source Title',
    'Publication',
    'Nama Jurnal',
  ]);

  if (!rawTitle || String(rawTitle).trim().length === 0) {
    return null;
  }

  const title = String(rawTitle).trim();
  const abbreviation = String(
    getColumnValue(row, ['Abbreviation', 'ISO Abbreviation', 'Abbr', 'Short Title']) || title.slice(0, 26)
  ).trim();
  const issn = String(
    getColumnValue(row, ['ISSN', 'Print ISSN', 'p-ISSN', 'ISSN-L']) || '2049-3630'
  ).trim();
  const eissn = String(
    getColumnValue(row, ['eISSN', 'e-ISSN', 'Online ISSN', 'Electronic ISSN']) || issn
  ).trim();
  const publisher = String(
    getColumnValue(row, ['Publisher', 'Publishing House', 'Penerbit', 'Organization']) ||
      'International Academic Press'
  ).trim();

  const tier = parseTierField(
    getColumnValue(row, ['Tier', 'Quartile', 'Best Quartile', 'SJR Best Quartile', 'JCR Quartile', 'Rank', 'Q'])
  );

  const impactFactor = parseNumericField(
    getColumnValue(row, ['JIF (2025)', 'JIF', 'Impact Factor', 'Journal Impact Factor', 'IF', '2-Year JIF']),
    1.8
  );

  const fiveYearImpactFactor = parseNumericField(
    getColumnValue(row, ['5-Year JIF', '5Y JIF', 'Five Year Impact Factor', '5-Yr IF']),
    Number((impactFactor * 1.2).toFixed(1))
  );

  const citeScore = parseNumericField(
    getColumnValue(row, ['CiteScore', 'Scopus CiteScore', 'CS']),
    Number((impactFactor * 1.7).toFixed(1))
  );

  const sjrScore = parseNumericField(
    getColumnValue(row, ['SJR', 'SJR Score', 'SCImago Journal Rank']),
    Number((impactFactor * 0.42).toFixed(2))
  );

  const hIndex = Math.round(
    parseNumericField(getColumnValue(row, ['H-Index', 'H Index', 'hindex']), 48)
  );

  const apcUsd = Math.round(
    parseNumericField(
      getColumnValue(row, ['APC (USD)', 'APC', 'APC USD', 'Publication Fee', 'Fee', 'Open Access Fee', 'Biaya APC']),
      0
    )
  );

  const rawAccess = String(
    getColumnValue(row, ['Access Model', 'Open Access', 'OA Model', 'Access']) || ''
  ).trim();
  const accessModel: AccessModel =
    rawAccess.toLowerCase().includes('diamond') || (apcUsd === 0 && !rawAccess.toLowerCase().includes('hybrid'))
      ? 'Diamond OA'
      : rawAccess.toLowerCase().includes('hybrid')
      ? 'Hybrid'
      : rawAccess.toLowerCase().includes('sub')
      ? 'Subscription'
      : 'Gold OA';

  const rawWaiver = String(
    getColumnValue(row, ['Waiver Policy', 'Waiver', 'LMIC Waiver', 'HINARI', 'Discount']) || ''
  ).trim();
  const waiverPolicy: WaiverPolicy =
    apcUsd === 0 || accessModel === 'Diamond OA'
      ? '100% Free (No APC)'
      : accessModel === 'Hybrid'
      ? 'Standard Subscription (Zero OA Fee)'
      : rawWaiver.toLowerCase().includes('50%')
      ? '50% LMIC Discount'
      : rawWaiver.toLowerCase().includes('case')
      ? 'Case-by-Case Institutional Waiver'
      : 'Full HINARI / Research4Life A&B Waiver';

  const subjectPrimary = String(
    getColumnValue(row, [
      'Primary Subject',
      'Subject',
      'Subject Category',
      'Discipline',
      'Category',
      'Field',
      'Bidang',
    ]) || 'Public, Environmental & Occupational Health'
  ).trim();

  const rawSubjects = getColumnValue(row, ['Subjects', 'All Subjects', 'Subcategories']);
  const subjects = rawSubjects
    ? String(rawSubjects)
        .split(/[;|,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [subjectPrimary];

  const country = String(
    getColumnValue(row, ['Country', 'Publisher Country', 'Negara', 'Nation']) || 'Switzerland'
  ).trim();

  const acceptanceRatePct = Math.round(
    parseNumericField(
      getColumnValue(row, ['Acceptance Rate (%)', 'Acceptance Rate', 'Accept Rate', 'Acceptance']),
      26
    )
  );

  const firstDecisionDays = Math.round(
    parseNumericField(
      getColumnValue(row, ['First Decision (Days)', 'First Decision', 'Decision Days', 'Review Speed', 'Turnaround']),
      28
    )
  );

  const publicationTimeDays = Math.round(
    parseNumericField(
      getColumnValue(row, ['Publication Time (Days)', 'Publication Days', 'Total Days']),
      firstDecisionDays * 2 + 15
    )
  );

  const scopeSummary = String(
    getColumnValue(row, ['Scope', 'Scope Summary', 'Aims and Scope', 'Description', 'Notes']) ||
      `Publishes peer-reviewed international research in ${subjectPrimary} and global public health.`
  ).trim();

  const rawIndexing = getColumnValue(row, ['Indexing', 'Databases', 'Indexed In']);
  const indexing = rawIndexing
    ? String(rawIndexing)
        .split(/[;|,/]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : ['Scopus', 'MEDLINE', 'DOAJ'];

  const rawStandards = getColumnValue(row, ['Reporting Standards', 'EQUATOR Checklists', 'Guidelines']);
  const reportingStandards = rawStandards
    ? String(rawStandards)
        .split(/[;|,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : ['STROBE', 'CONSORT', 'PRISMA'];

  const authorPortalUrl = String(
    getColumnValue(row, ['Portal URL', 'Author Portal', 'Website', 'URL', 'Link']) ||
      'https://www.equator-network.org/'
  ).trim();

  const wordLimitAbstract = Math.round(
    parseNumericField(getColumnValue(row, ['Abstract Word Limit', 'Abstract Limit']), 250)
  );

  const wordLimitMainText = String(
    getColumnValue(row, ['Main Text Limit', 'Word Limit', 'Manuscript Length']) ||
      '3,500 words (Original Articles)'
  ).trim();

  return {
    title,
    abbreviation,
    issn,
    eissn,
    publisher,
    tier,
    impactFactor,
    fiveYearImpactFactor,
    citeScore,
    sjrScore,
    hIndex,
    apcUsd,
    accessModel,
    waiverPolicy,
    subjectPrimary,
    subjects,
    country,
    indexing,
    acceptanceRatePct,
    firstDecisionDays,
    publicationTimeDays,
    scopeSummary,
    keyTopics: [subjectPrimary, country, `${tier} Health Journal`],
    guidelines: {
      reportingStandards,
      wordLimitAbstract,
      wordLimitMainText,
      maxReferences: 40,
      maxTablesFigures: 5,
      referenceStyle: 'Vancouver (Numbered)',
      blindingPolicy: 'Double-Blind',
      ethicsRequirements: [
        'Institutional Review Board (IRB) or National Ethics Committee approval number required in Methods',
        'Informed consent and declaration of competing interests mandatory',
      ],
      dataSharingPolicy: 'Mandatory Data Availability Statement prior to reference list.',
      coverLetterChecklist: [
        'Highlight public health relevance and international readership value',
        'Confirm compliance with reporting checklist and authorship criteria',
      ],
      preprintPolicy: 'Permits preprint submissions on medRxiv, bioRxiv, or SSRN.',
      authorPortalUrl,
    },
  };
}

export default function SpreadsheetImporterModal({
  isOpen,
  onClose,
  existingJournals,
  onDatabaseUpdated,
}: SpreadsheetImporterModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<Partial<HealthJournal>>>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const extractRowsFromSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) {
      setParseError(`Worksheet "${sheetName}" could not be read.`);
      return;
    }
    const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
    });

    if (rawJson.length === 0) {
      setParsedRows([]);
      setParseError('The selected sheet appears to be empty.');
      return;
    }

    const mapped = rawJson
      .map((r) => mapSpreadsheetRowToJournal(r))
      .filter((item): item is Partial<HealthJournal> => item !== null);

    if (mapped.length === 0) {
      setParsedRows([]);
      setParseError(
        'No valid journal rows found. Ensure your spreadsheet includes a "Title" or "Journal Name" column header.'
      );
      return;
    }

    setParseError(null);
    setParsedRows(mapped);
  };

  const handleFileBuffer = async (file: File) => {
    setParseError(null);
    setFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      setWorkbookRef(wb);
      setSheetNames(wb.SheetNames);
      const firstSheet = wb.SheetNames[0];
      setSelectedSheet(firstSheet);
      extractRowsFromSheet(wb, firstSheet);
    } catch (err) {
      setParsedRows([]);
      setParseError(
        err instanceof Error
          ? `Failed to parse spreadsheet: ${err.message}`
          : 'Unrecognized spreadsheet file format. Please upload a valid .xlsx, .xls, or .csv file.'
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileBuffer(file);
    }
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (workbookRef) {
      extractRowsFromSheet(workbookRef, newSheet);
    }
  };

  const downloadSampleTemplate = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        Title: 'Lancet Regional Health - Southeast Asia',
        Abbreviation: 'Lancet Reg. Health Southeast Asia',
        ISSN: '2772-3682',
        Publisher: 'Elsevier (Lancet Group)',
        Tier: 'Q1',
        'JIF (2025)': 5.2,
        '5-Year JIF': 5.8,
        CiteScore: 8.4,
        SJR: 1.85,
        'APC (USD)': 3300,
        'Access Model': 'Gold OA',
        'Waiver Policy': 'Full HINARI / Research4Life A&B Waiver',
        'Primary Subject': 'Global & International Health Policy',
        Country: 'United Kingdom',
        'Acceptance Rate (%)': 17,
        'First Decision (Days)': 21,
        'Reporting Standards': 'STROBE; CONSORT; PRISMA',
        Scope:
          'Publishes high-impact clinical, epidemiological, and health policy research advancing health outcomes across Southeast Asia.',
        'Portal URL': 'https://www.thelancet.com/journals/lansea/home',
      },
      {
        Title: 'Tropical Medicine and Health',
        Abbreviation: 'Trop. Med. Health',
        ISSN: '1348-8945',
        Publisher: 'Springer Nature (Japanese Society of Tropical Medicine)',
        Tier: 'Q1',
        'JIF (2025)': 3.6,
        '5-Year JIF': 4.1,
        CiteScore: 6.5,
        SJR: 1.28,
        'APC (USD)': 2190,
        'Access Model': 'Gold OA',
        'Waiver Policy': 'Full HINARI / Research4Life A&B Waiver',
        'Primary Subject': 'Infectious Diseases & Tropical Medicine',
        Country: 'Japan',
        'Acceptance Rate (%)': 33,
        'First Decision (Days)': 27,
        'Reporting Standards': 'STROBE; CONSORT; PRISMA',
        Scope:
          'Official journal of the Japanese Society of Tropical Medicine covering tropical infectious diseases, parasitology, and global health.',
        'Portal URL': 'https://tropmedhealth.biomedcentral.com/',
      },
      {
        Title: 'Journal of Epidemiology',
        Abbreviation: 'J. Epidemiol.',
        ISSN: '0917-5040',
        Publisher: 'Japan Epidemiological Association',
        Tier: 'Q1',
        'JIF (2025)': 3.7,
        '5-Year JIF': 4.5,
        CiteScore: 7.2,
        SJR: 1.49,
        'APC (USD)': 0,
        'Access Model': 'Diamond OA',
        'Waiver Policy': '100% Free (No APC)',
        'Primary Subject': 'Epidemiology & Field Surveillance',
        Country: 'Japan',
        'Acceptance Rate (%)': 21,
        'First Decision (Days)': 26,
        'Reporting Standards': 'STROBE; CONSORT; PRISMA',
        Scope:
          'Publishes original epidemiological research, cohort profiles, and chronic/infectious disease surveillance across Asia and globally.',
        'Portal URL': 'https://www.jstage.jst.go.jp/browse/jea/',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Health_Journals');
    XLSX.writeFile(
      wb,
      format === 'xlsx' ? 'globalhealth_journal_import_template.xlsx' : 'globalhealth_journal_import_template.csv',
      { bookType: format === 'xlsx' ? 'xlsx' : 'csv' }
    );
  };

  const handleCommitDatabaseUpdate = async () => {
    if (parsedRows.length === 0) return;
    setIsApplying(true);
    setParseError(null);
    try {
      const response = await fetch('/api/journals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journals: parsedRows,
          mode: importMode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update journal database.');
      }
      onDatabaseUpdated(data.journals, data.summary);
      onClose();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error updating database on server.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetDefaultCatalog = async () => {
    setIsResetting(true);
    setParseError(null);
    try {
      const response = await fetch('/api/journals/reset', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok && data.journals) {
        onDatabaseUpdated(data.journals, {
          mode: 'replace',
          addedCount: data.journals.length,
          updatedCount: 0,
          totalCount: data.journals.length,
        });
        onClose();
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to reset database.');
    } finally {
      setIsResetting(false);
    }
  };

  // Determine how many rows will update existing vs add new in Merge mode
  const matchPreviewCounts = parsedRows.reduce(
    (acc, row) => {
      const cleanTitle = (row.title || '').trim().toLowerCase();
      const cleanIssn = (row.issn || '').trim().toLowerCase();
      const exists = existingJournals.some(
        (ex) =>
          ex.title.trim().toLowerCase() === cleanTitle ||
          (cleanIssn && cleanIssn !== '2049-3630' && (ex.issn.toLowerCase() === cleanIssn || ex.eissn.toLowerCase() === cleanIssn))
      );
      if (exists) acc.updates += 1;
      else acc.additions += 1;
      return acc;
    },
    { additions: 0, updates: 0 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-teal-800 dark:text-teal-400">
              Batch Database Synchronization · Excel (.xlsx / .xls) &amp; CSV
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display mt-0.5">
              Import &amp; Update Health Journal Database from Spreadsheet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload an `.xlsx`, `.xls`, or `.csv` file (including exported catalog files or custom SCImago/JCR sheets) to batch-update or expand the active journal directory and AI recommendation engine.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Download & Database Reset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Need a ready-to-fill spreadsheet schema?
            </span>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('xlsx')}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download .XLSX Template
            </button>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('csv')}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300/70 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download .CSV Template
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDefaultCatalog}
            disabled={isResetting}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isResetting ? 'Restoring...' : 'Restore Default Seed Catalog'}
          </button>
        </div>

        {/* File Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-teal-700 bg-teal-50/40 dark:bg-teal-950/30'
              : 'border-slate-300 dark:border-slate-700 hover:border-teal-700 dark:hover:border-teal-500 bg-[#FAF8F5]/60 dark:bg-slate-950/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileSpreadsheet className="w-9 h-9 mx-auto text-teal-800 dark:text-teal-400 mb-2.5" />
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {fileName ? `Loaded File: ${fileName}` : 'Click to select or drag and drop an .XLSX, .XLS, or .CSV file'}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Automatically maps columns: Title / Journal Name, Tier / Quartile (Q1–Q4), JIF / Impact Factor, CiteScore, SJR, APC (USD), Access Model, Waiver Policy, Subject, Country, ISSN, Acceptance Rate, and First Decision Days.
          </p>
        </div>

        {/* Error Display */}
        {parseError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2.5 text-xs text-red-800 dark:text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{parseError}</div>
          </div>
        )}

        {/* Parsed Preview & Import Configuration */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            {/* Controls: Sheet Selector & Merge vs Replace Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex flex-wrap items-center gap-4">
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Worksheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                    >
                      {sheetNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                    {parsedRows.length}
                  </span>{' '}
                  <span className="text-slate-600 dark:text-slate-400">
                    valid journals parsed ({matchPreviewCounts.additions} new · {matchPreviewCounts.updates} matching existing ISSN/Title)
                  </span>
                </div>
              </div>

              {/* Update Mode Segmented Control */}
              <div className="inline-flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    importMode === 'merge'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Merge &amp; Update Existing
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    importMode === 'replace'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Replace Entire Database
                </button>
              </div>
            </div>

            {/* Preview Table of First 10 Rows */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Previewing Imported Records (showing up to 10 of {parsedRows.length})</span>
                <span className="font-mono text-[11px]">
                  Mode: {importMode === 'merge' ? 'Upsert by ISSN / Title' : 'Full Catalog Overwrite'}
                </span>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-500">
                      <th className="py-2 px-3">Title &amp; ISSN</th>
                      <th className="py-2 px-2">Tier</th>
                      <th className="py-2 px-2 text-right">JIF</th>
                      <th className="py-2 px-2 text-right">CiteScore</th>
                      <th className="py-2 px-3 text-right">APC (USD)</th>
                      <th className="py-2 px-3">Primary Subject</th>
                      <th className="py-2 px-3">Country</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                          <div>{row.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {row.issn} · {row.publisher}
                          </div>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-teal-800 dark:text-teal-400">
                          {row.tier}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {Number(row.impactFactor || 0).toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {Number(row.citeScore || 0).toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {row.apcUsd === 0 ? '$0 Free' : `$${Number(row.apcUsd || 0).toLocaleString()}`}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                          {row.subjectPrimary}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {row.country}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            All imported journals become immediately searchable and available to the Gemini Manuscript Matcher.
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || isApplying}
              onClick={handleCommitDatabaseUpdate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating Database...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  {importMode === 'merge'
                    ? `Merge & Update Database (${parsedRows.length} rows)`
                    : `Replace Database (${parsedRows.length} rows)`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
