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
import { HealthJournal, JournalTier, AccessModel, SubmissionGuidelines } from '../data/journals';
import { fmtNum, fmtApc } from '../lib/format';
import { buildNormalizedJournal, catalogRowId, loadCatalogFile, mergeIntoCatalog } from '../lib/normalize';

// A parsed spreadsheet row. Unknown values stay null/empty: nothing is invented here or on the server.
export type ImportRow = Omit<Partial<HealthJournal>, 'guidelines'> & { guidelines?: Partial<SubmissionGuidelines> };


interface SpreadsheetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingJournals: HealthJournal[];
  onDatabaseUpdated: (
    updatedJournals: HealthJournal[],
    summary: { mode: 'merge' | 'replace'; addedCount: number; updatedCount: number; totalCount: number }
  ) => void;
}

/** Number from a cell, or null when the cell is empty, "-", "NA" or otherwise not a number. */
function parseNumericField(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  const cleaned = String(raw)
    .replace(/[$€£%\s]/g, '')
    .replace(/,/g, '')
    .trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** APC: like parseNumericField, but words such as "free" / "no APC" mean 0. */
function parseApcField(raw: unknown): number | null {
  if (typeof raw === 'string' && /\bfree\b|no apc|^none$/i.test(raw.trim())) return 0;
  return parseNumericField(raw);
}

function splitList(raw: unknown, separators = /[;|]/): string[] {
  return raw === null || raw === undefined || raw === ''
    ? []
    : String(raw)
        .split(separators)
        .map((x) => x.trim())
        .filter(Boolean);
}

function parseTierField(raw: unknown): JournalTier {
  const str = String(raw || '').trim().toUpperCase();
  if (str.includes('Q1') || str === '1' || str.includes('TIER 1')) return 'Q1';
  if (str.includes('Q2') || str === '2' || str.includes('TIER 2')) return 'Q2';
  if (str.includes('Q3') || str === '3' || str.includes('TIER 3')) return 'Q3';
  if (str.includes('Q4') || str === '4' || str.includes('TIER 4')) return 'Q4';
  return 'NR'; // not ranked / not reported
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

export function mapSpreadsheetRowToJournal(row: Record<string, unknown>): ImportRow | null {
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

  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
  const title = String(rawTitle).trim();
  const abbreviation = str(getColumnValue(row, ['Abbreviation', 'ISO Abbreviation', 'Abbr', 'Short Title']));

  // One ISSN cell may hold "print, electronic"
  const issnParts = splitList(getColumnValue(row, ['ISSN', 'Print ISSN', 'p-ISSN', 'ISSN-L']), /[,;]/);
  const issn = issnParts[0] || '';
  const eissn = str(getColumnValue(row, ['eISSN', 'e-ISSN', 'Online ISSN', 'Electronic ISSN'])) || issnParts[1] || issn;
  const publisher = str(getColumnValue(row, ['Publisher', 'Publishing House', 'Penerbit', 'Organization']));

  const tier = parseTierField(
    getColumnValue(row, ['Tier', 'Quartile', 'Best Quartile', 'SJR Best Quartile', 'JCR Quartile', 'Rank', 'Q'])
  );

  const impactFactor = parseNumericField(
    getColumnValue(row, ['JIF (2025)', 'JIF', 'Impact Factor', 'Journal Impact Factor', 'IF', '2-Year JIF'])
  );
  const fiveYearImpactFactor = parseNumericField(
    getColumnValue(row, ['5-Year JIF', '5Y JIF', 'Five Year Impact Factor', '5-Yr IF'])
  );
  const citeScore = parseNumericField(getColumnValue(row, ['CiteScore', 'Scopus CiteScore', 'CS']));
  const sjrScore = parseNumericField(getColumnValue(row, ['SJR', 'SJR Score', 'SCImago Journal Rank']));
  const hIndex = parseNumericField(getColumnValue(row, ['H-Index', 'H Index', 'hindex']));
  const apcRaw = parseApcField(
    getColumnValue(row, ['APC (USD)', 'APC', 'APC USD', 'Publication Fee', 'Fee', 'Open Access Fee', 'Biaya APC'])
  );
  const apcUsd = apcRaw === null ? null : Math.round(apcRaw);

  const rawAccess = str(getColumnValue(row, ['Access Model', 'Open Access', 'OA Model', 'Access'])).toLowerCase();
  const accessModel: AccessModel = rawAccess.includes('diamond')
    ? 'Diamond OA'
    : rawAccess.includes('hybrid')
    ? 'Hybrid'
    : rawAccess.includes('sub')
    ? 'Subscription'
    : rawAccess.includes('gold') || rawAccess.includes('open')
    ? 'Gold OA'
    : apcUsd === 0
    ? 'Diamond OA'
    : 'Gold OA';

  // Waiver text is kept exactly as written in the spreadsheet.
  const rawWaiver = str(getColumnValue(row, ['Waiver Policy', 'Waiver', 'LMIC Waiver', 'HINARI', 'Discount']));
  const waiverPolicy = rawWaiver || (apcUsd === 0 || accessModel === 'Diamond OA' ? '100% Free (No APC)' : '');

  // "Epidemiology; Public Health" -> primary = first, subjects = all
  const subjectList = splitList(
    getColumnValue(row, ['Primary Subject', 'Subject', 'Subject Category', 'Discipline', 'Category', 'Field', 'Bidang'])
  );
  const extraSubjects = splitList(getColumnValue(row, ['Subjects', 'All Subjects', 'Subcategories']));
  const subjects = Array.from(new Set([...subjectList, ...extraSubjects]));
  const subjectPrimary = subjects[0] || '';

  const country = str(getColumnValue(row, ['Country', 'Publisher Country', 'Negara', 'Nation']));

  const acceptanceRatePct = parseNumericField(
    getColumnValue(row, ['Acceptance Rate (%)', 'Acceptance Rate', 'Accept Rate', 'Acceptance'])
  );
  const firstDecisionDays = parseNumericField(
    getColumnValue(row, ['First Decision (Days)', 'First Decision', 'Decision Days', 'Review Speed', 'Turnaround'])
  );
  const publicationTimeDays = parseNumericField(
    getColumnValue(row, ['Publication Time (Days)', 'Publication Days', 'Total Days'])
  );

  const scopeSummary = str(getColumnValue(row, ['Scope', 'Scope Summary', 'Aims and Scope', 'Description', 'Notes']));
  const indexing = splitList(getColumnValue(row, ['Indexing', 'Databases', 'Indexed In']), /[;|,/]/);
  const reportingStandards = splitList(getColumnValue(row, ['Reporting Standards', 'EQUATOR Checklists', 'Guidelines']), /[;|,]/);
  const authorPortalUrl = str(getColumnValue(row, ['Portal URL', 'Author Portal', 'Website', 'URL', 'Link']));
  const wordLimitAbstract = parseNumericField(getColumnValue(row, ['Abstract Word Limit', 'Abstract Limit']));
  const wordLimitMainText = str(getColumnValue(row, ['Main Text Limit', 'Word Limit', 'Manuscript Length']));

  const guidelines: Partial<SubmissionGuidelines> = {};
  if (reportingStandards.length) guidelines.reportingStandards = reportingStandards;
  if (authorPortalUrl) guidelines.authorPortalUrl = authorPortalUrl;
  if (wordLimitAbstract !== null) guidelines.wordLimitAbstract = Math.round(wordLimitAbstract);
  if (wordLimitMainText) guidelines.wordLimitMainText = wordLimitMainText;

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
    hIndex: hIndex === null ? null : Math.round(hIndex),
    apcUsd,
    accessModel,
    waiverPolicy,
    subjectPrimary,
    subjects,
    country,
    indexing,
    acceptanceRatePct,
    firstDecisionDays: firstDecisionDays === null ? null : Math.round(firstDecisionDays),
    publicationTimeDays: publicationTimeDays === null ? null : Math.round(publicationTimeDays),
    scopeSummary,
    guidelines,
  };
}

/** Reads a response body as JSON without throwing on HTML / text error pages. */
async function readJsonSafely(response: Response): Promise<any | null> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [parseError, setParseError] = useState<string | null>(null);
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
      .filter((item): item is ImportRow => item !== null);

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

  // Applies the spreadsheet in this browser. The live site is static (no server), so this lasts
  // until the page is reloaded. "Download catalog.json" makes it permanent.
  const handleCommitDatabaseUpdate = () => {
    if (parsedRows.length === 0) return;
    setParseError(null);
    if (importMode === 'replace') {
      const journals = parsedRows.map((row, i) =>
        buildNormalizedJournal({ ...row, id: catalogRowId(String(row.title), i) }, i)
      );
      onDatabaseUpdated(journals, { mode: 'replace', addedCount: journals.length, updatedCount: 0, totalCount: journals.length });
    } else {
      const merged = mergeIntoCatalog(existingJournals, parsedRows);
      onDatabaseUpdated(merged.journals, {
        mode: 'merge',
        addedCount: merged.addedCount,
        updatedCount: merged.updatedCount,
        totalCount: merged.journals.length,
      });
    }
    onClose();
  };

  /**
   * Downloads the catalog file to upload to GitHub as public/catalog.json.
   * Replace mode: the file holds exactly the spreadsheet's journals.
   * Merge mode: the file holds the current catalog with the spreadsheet merged in.
   */
  const handleDownloadCatalogFile = () => {
    if (parsedRows.length === 0) return;
    const rows: Array<Record<string, unknown>> =
      importMode === 'replace'
        ? parsedRows.map((row, i) => ({ id: catalogRowId(String(row.title), i), ...row }))
        : mergeIntoCatalog(existingJournals, parsedRows).journals.map((j, i) => ({ ...j, id: catalogRowId(j.title, i) }));
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'catalog.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Discards changes made in this browser and reloads the saved catalog file (/catalog.json).
  const handleResetDefaultCatalog = async () => {
    setIsResetting(true);
    setParseError(null);
    try {
      const catalog = await loadCatalogFile();
      if (!catalog) throw new Error('Could not load the saved catalog file (/catalog.json).');
      onDatabaseUpdated(catalog, { mode: 'replace', addedCount: catalog.length, updatedCount: 0, totalCount: catalog.length });
      onClose();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to reload the saved catalog.');
    } finally {
      setIsResetting(false);
    }
  };

  // Determine how many rows will update existing vs add new in Merge mode
  const matchPreviewCounts = parsedRows.reduce(
    (acc, row) => {
      const cleanTitle = (row.title || '').trim().toLowerCase();
      const issns = [row.issn, row.eissn].map((x) => (x || '').trim().toLowerCase()).filter(Boolean);
      const exists = existingJournals.some(
        (ex) =>
          ex.title.trim().toLowerCase() === cleanTitle ||
          issns.some((x) => x === (ex.issn || '').toLowerCase() || x === (ex.eissn || '').toLowerCase())
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
            {isResetting ? 'Reloading...' : 'Reload Saved Catalog'}
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
            Automatically maps columns: Title / Journal Name, Tier / Quartile (Q1–Q4), JIF / Impact Factor, CiteScore, SJR, APC (USD), Access Model, Waiver Policy, Subject, Country, ISSN, Acceptance Rate, and First Decision Days. Empty cells stay empty: missing metrics are shown as “—”, never estimated.
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
                          {fmtNum(row.impactFactor)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {fmtNum(row.citeScore)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {fmtApc(row.apcUsd)}
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
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 max-w-md">
            <strong>Preview</strong> applies the spreadsheet in this browser until you reload. To make it{' '}
            <strong>permanent</strong>, download <span className="font-mono">catalog.json</span> and upload it to GitHub
            as <span className="font-mono">public/catalog.json</span> (replacing the old one). Vercel redeploys in about a minute.
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
              disabled={parsedRows.length === 0}
              onClick={handleCommitDatabaseUpdate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {importMode === 'merge' ? `Preview Merge (${parsedRows.length} rows)` : `Preview Replace (${parsedRows.length} rows)`}
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0}
              onClick={handleDownloadCatalogFile}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download catalog.json
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
