import {StepShell} from '~/components/grant-form/step-shell';
import {inputClass} from '~/components/grant-form/types';
import {canImportWishlist} from '~/lib/wishlist';

export const WishlistImportStep = ({
  importError,
  importIndeterminate,
  importPercent,
  importStatus,
  importing,
  onBack,
  onImport,
  onUrlChange,
  onXlsxChange,
  wishlistUrl,
  xlsxFile,
}: {
  importError: string | null;
  importIndeterminate: boolean;
  importPercent: number;
  importStatus: string;
  importing: boolean;
  onBack: () => void;
  onImport: () => void;
  onUrlChange: (value: string) => void;
  onXlsxChange: (file: File | null) => void;
  wishlistUrl: string;
  xlsxFile: File | null;
}) => (
  <StepShell
    description="Paste a public Amazon list URL, or upload the .xlsx from Amazon’s More → Download list. The list must be public."
    title="Import your Amazon wishlist"
  >
    <label className="font-body block text-sm font-medium text-charcoal">
      Amazon wishlist URL
      <input
        className={inputClass}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder="https://www.amazon.com/hz/wishlist/ls/…"
        value={wishlistUrl}
      />
    </label>

    <div>
      <p className="font-body text-sm font-medium text-charcoal">
        Amazon Download list spreadsheet
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <label
          className={`btn btn-secondary cursor-pointer gap-2 ${importing ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            disabled={importing}
            onChange={(event) => onXlsxChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path
              d="M8 10.5V3.5M8 3.5L5.5 6M8 3.5L10.5 6M3 12.5h10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
            />
          </svg>
          {xlsxFile ? 'Change file' : 'Upload .xlsx'}
        </label>
        {xlsxFile ? <span className="font-body text-sm text-gray-600">{xlsxFile.name}</span> : null}
      </div>
      <p className="font-body mt-1 text-xs text-gray-500">
        On Amazon, open the list, choose More, then Download list. Use the .xlsx if the URL import
        finds nothing.
      </p>
    </div>

    {importError ? (
      <p className="text-sm text-red-700" role="alert">
        {importError}
      </p>
    ) : null}

    {importing ? (
      <div aria-live="polite" role="status">
        <p className="font-body text-sm text-charcoal">{importStatus}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-warm-white ring-1 ring-eagle-blue/15">
          {importIndeterminate ? (
            <div className="import-bar-indeterminate h-full w-1/3 rounded-full bg-eagle-blue" />
          ) : (
            <div
              className="h-full rounded-full bg-eagle-blue transition-[width] duration-300 ease-out"
              style={{width: `${Math.max(8, importPercent)}%`}}
            />
          )}
        </div>
      </div>
    ) : null}

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <button className="btn btn-secondary" disabled={importing} onClick={onBack} type="button">
        Back
      </button>
      <button
        className="btn btn-primary"
        disabled={importing || (!canImportWishlist(wishlistUrl) && !xlsxFile)}
        onClick={onImport}
        type="button"
      >
        {importing ? 'Importing…' : 'Import list'}
      </button>
    </div>
  </StepShell>
);
