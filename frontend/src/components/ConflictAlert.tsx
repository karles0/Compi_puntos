import React from 'react';
import { AlertTriangle, XCircle, ShieldAlert, Info } from 'lucide-react';

interface ConflictAlertProps {
  accepted: boolean;
  errorMessage: string | null;
  conflicts: string[];
}

export const ConflictAlert: React.FC<ConflictAlertProps> = ({ accepted, errorMessage, conflicts }) => {
  if (accepted && conflicts.length === 0) return null;
  if (!errorMessage && conflicts.length === 0) return null;

  const isError = !accepted;
  const hasConflicts = conflicts.length > 0;

  return (
    <div className="space-y-3 mb-5">
      {/* Main Status */}
      {(errorMessage || !accepted) && (
        <div className={`p-4 rounded-lg border flex gap-3 items-start backdrop-blur-sm ${
          isError 
            ? 'bg-red-500/8 border-red-500/20 text-red-200' 
            : 'bg-amber-500/8 border-amber-500/20 text-amber-200'
        }`}>
          <div className="mt-0.5 shrink-0">
            {isError ? <XCircle className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
          </div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-sm mb-1 ${isError ? 'text-red-400' : 'text-amber-400'}`}>
              {isError ? 'Cadena Rechazada' : 'Advertencia del Parser'}
            </h3>
            
            {errorMessage && (
              <div className="text-sm whitespace-pre-wrap font-medium opacity-90 leading-relaxed">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflicts Detail */}
      {hasConflicts && (
        <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/15">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h4 className="font-semibold text-sm text-amber-300">
              {conflicts.length} Conflicto{conflicts.length > 1 ? 's' : ''} Detectado{conflicts.length > 1 ? 's' : ''}
            </h4>
          </div>

          {/* Educational tip */}
          <div className="flex items-start gap-2 mb-3 bg-indigo-500/8 border border-indigo-500/15 rounded-md p-3">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[12px] text-indigo-300/80 leading-relaxed">
              Los conflictos indican que la gramática no puede ser analizada de forma determinista por este parser. 
              Consulta la pestaña <strong>"Compatibilidad"</strong> para ver explicaciones detalladas y sugerencias de parsers más potentes.
            </p>
          </div>

          <ul className="space-y-1.5 max-h-[150px] overflow-y-auto">
            {conflicts.map((conflict, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-amber-200/70">
                <span className={`shrink-0 mt-1 px-1.5 py-0 rounded text-[10px] font-bold ${
                  conflict.includes('Shift/Reduce') 
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {conflict.includes('Shift/Reduce') ? 'S/R' : 'R/R'}
                </span>
                <span className="font-mono leading-relaxed">{conflict}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
