import React, { useState, useEffect } from 'react';
import { Clock, Play, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  grammar: string;
  input: string;
  parserType: string;
  accepted: boolean;
  hasConflicts: boolean;
  conflictCount: number;
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
}

const PARSER_LABELS: Record<string, string> = {
  recursive_descent: 'Descenso Recursivo',
  ll1: 'LL(1)',
  lr0: 'LR(0)',
  slr1: 'SLR(1)',
  lalr1: 'LALR(1)',
  lr1: 'LR(1)',
};

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  return `hace ${diffH}h`;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, onRestore, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  // Re-render every 30s to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const hasEntries = entries.length > 0;

  return (
    <div className="glass-panel overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-gray-300">Historial</span>
          {hasEntries && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/25">
              {entries.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasEntries && isOpen && (
            <button
              onClick={e => { e.stopPropagation(); onClear(); }}
              className="flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-red-500/10"
              title="Limpiar historial"
            >
              <Trash2 className="w-3 h-3" />
              Limpiar
            </button>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Entry list */}
      {isOpen && (
        <div className="border-t border-white/5 max-h-[320px] overflow-y-auto">
          {!hasEntries ? (
            <div className="px-4 py-6 text-center text-gray-600 text-xs">
              Aún no hay análisis en el historial.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="group flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => onRestore(entry)}
                  title="Click para restaurar esta gramática"
                >
                  {/* Status icon */}
                  <div className="mt-0.5 shrink-0">
                    {entry.accepted && !entry.hasConflicts ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : entry.hasConflicts ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                        {PARSER_LABELS[entry.parserType] ?? entry.parserType}
                      </span>
                      <span className="text-[10px] text-gray-600">{timeAgo(entry.timestamp)}</span>
                    </div>
                    <p className="font-mono text-xs text-gray-400 truncate leading-relaxed">
                      {entry.grammar.split('\n')[0]}
                      {entry.grammar.includes('\n') ? ' …' : ''}
                    </p>
                    {entry.input && (
                      <p className="font-mono text-[10px] text-gray-600 truncate mt-0.5">
                        ↳ <span className="text-gray-500">{entry.input}</span>
                      </p>
                    )}
                    {entry.hasConflicts && (
                      <p className="text-[10px] text-amber-500/80 mt-0.5">
                        {entry.conflictCount} conflicto{entry.conflictCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Restore button */}
                  <button
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
                    onClick={e => { e.stopPropagation(); onRestore(entry); }}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Usar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
