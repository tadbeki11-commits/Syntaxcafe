import React, { useState, useEffect } from 'react';
import { FiMapPin, FiHome, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface TableSelectionMenuProps {
  allTables: any[];
  selectedTable: string;
  onSelectTable: (table: string) => void;
  forceTableSelection?: boolean;
}

const TableSelectionMenu: React.FC<TableSelectionMenuProps> = ({
  allTables,
  selectedTable,
  onSelectTable,
  forceTableSelection = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Sync input value when selectedTable changes from parent (e.g. selected takeaway or cleared)
  useEffect(() => {
    if (selectedTable === 'takeaway' || selectedTable === 'beu' || !selectedTable) {
      setInputValue('');
      setIsValid(null);
    } else {
      setInputValue(selectedTable);
      setIsValid(true);
    }
  }, [selectedTable]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setInputValue(val);

    if (!val) {
      setIsValid(null);
      onSelectTable('');
      return;
    }

    // Validate if the input matches any existing table number in allTables
    const match = allTables.find((t) => String(t.number) === val);
    if (match) {
      setIsValid(true);
      onSelectTable(val);
    } else {
      setIsValid(false);
      // We clear the selected state in parent if input becomes invalid
      onSelectTable('');
    }
  };

  const availableTablesText = allTables
    .map((t) => t.number)
    .sort((a, b) => a - b)
    .join(', ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 shadow-sm backdrop-blur-md sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-warning shadow-sm">
              <FiMapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">Dining Setup</h2>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                {forceTableSelection
                  ? 'A table number is required to create an order'
                  : 'Select a table or switch to Take Away / Beu'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end md:gap-3 flex-1 min-w-0">
            {!forceTableSelection && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectTable(selectedTable === 'takeaway' ? '' : 'takeaway')}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all duration-200 active:scale-95 shrink-0 whitespace-nowrap ${
                    selectedTable === 'takeaway'
                      ? 'border-transparent bg-foreground/90 text-background shadow-md'
                      : 'border-border bg-background text-foreground/80 hover:bg-muted/30'
                  }`}
                >
                  <FiHome className="h-4 w-4" />
                  <span>Take Away</span>
                  {selectedTable === 'takeaway' && (
                    <span className="ml-1 flex h-2 w-2 relative">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTable(selectedTable === 'beu' ? '' : 'beu')}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all duration-200 active:scale-95 shrink-0 whitespace-nowrap ${
                    selectedTable === 'beu'
                      ? 'border-transparent bg-info text-info-foreground shadow-md'
                      : 'border-border bg-background text-foreground/80 hover:bg-muted/30'
                  }`}
                >
                  <FiHome className="h-4 w-4" />
                  <span>Beu</span>
                  {selectedTable === 'beu' && (
                    <span className="ml-1 flex h-2 w-2 relative">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-info/80 opacity-75 animate-ping"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-info"></span>
                    </span>
                  )}
                </button>
              </>
            )}

            <div className="relative w-full md:max-w-xs">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Table
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Table #"
                  value={inputValue}
                  onChange={handleInputChange}
                  disabled={selectedTable === 'takeaway' || selectedTable === 'beu'}
                  className={`h-10 w-full rounded-xl border bg-background px-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:ring-2 ${
                    selectedTable === 'takeaway' || selectedTable === 'beu'
                      ? 'cursor-not-allowed border-border bg-muted text-muted-foreground/60'
                      : isValid === true
                      ? 'border-emerald-500/70 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-500/15'
                      : isValid === false
                      ? 'border-rose-500/70 text-rose-700 focus:border-rose-500 focus:ring-rose-500/15'
                      : 'border-border text-foreground/90 focus:border-amber-400 focus:ring-amber-400/15'
                  }`}
                />

                {selectedTable !== 'takeaway' && (
                  <div className="pointer-events-none absolute right-3 flex items-center">
                    {isValid === true && <FiCheck className="h-4 w-4 text-emerald-500" />}
                    {isValid === false && <FiAlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />}
                  </div>
                )}
              </div>

              {selectedTable !== 'takeaway' && (
                <div className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {isValid === false ? (
                    <span className="text-rose-500">Invalid. Try: {availableTablesText || 'None loaded'}</span>
                  ) : isValid === true ? (
                    <span className="text-emerald-600">Valid table selected</span>
                  ) : (
                    <span>Available: {availableTablesText || 'None'}</span>
                  )}
                </div>
              )}
            </div>

            {selectedTable && (
              <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 shadow-sm shrink-0 whitespace-nowrap">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                {selectedTable === 'takeaway' ? 'Active: Take Away' : selectedTable === 'beu' ? 'Active: Beu' : `Active: Table #${selectedTable}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSelectionMenu;


