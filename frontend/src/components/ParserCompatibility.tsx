import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ParserCompatibilityProps {
  parserType: string;
  accepted: boolean;
  conflicts: string[];
  errorMessage: string | null;
}

interface ParserInfo {
  id: string;
  name: string;
  fullName: string;
  type: 'topdown' | 'bottomup';
  description: string;
  power: number; // 1 = least powerful, 6 = most powerful
}

const PARSER_HIERARCHY: ParserInfo[] = [
  {
    id: 'recursive_descent',
    name: 'Descenso Recursivo',
    fullName: 'Recursive Descent (sin backtracking)',
    type: 'topdown',
    description: 'Parser Top-Down que usa FIRST sets para predecir producciones. No maneja recursión izquierda directa.',
    power: 1,
  },
  {
    id: 'll1',
    name: 'LL(1)',
    fullName: 'LL(1) Predictive Parser',
    type: 'topdown',
    description: 'Parser Top-Down basado en tabla. Usa 1 token de lookahead. La tabla M[A,a] no debe tener conflictos.',
    power: 2,
  },
  {
    id: 'lr0',
    name: 'LR(0)',
    fullName: 'LR(0) Canonical',
    type: 'bottomup',
    description: 'Parser Bottom-Up más simple. Reduce sin mirar el lookahead, generando muchos conflictos Shift/Reduce.',
    power: 3,
  },
  {
    id: 'slr1',
    name: 'SLR(1)',
    fullName: 'Simple LR(1)',
    type: 'bottomup',
    description: 'Usa FOLLOW sets para restringir reducciones. Resuelve muchos conflictos LR(0) pero no todos.',
    power: 4,
  },
  {
    id: 'lalr1',
    name: 'LALR(1)',
    fullName: 'Look-Ahead LR(1)',
    type: 'bottomup',
    description: 'Fusiona estados LR(1) con el mismo core. Usado por herramientas como YACC/Bison. Potencia intermedia.',
    power: 5,
  },
  {
    id: 'lr1',
    name: 'LR(1)',
    fullName: 'LR(1) Canonical',
    type: 'bottomup',
    description: 'Parser Bottom-Up más potente. Cada ítem tiene lookahead explícito. Más estados pero sin ambigüedad falsa.',
    power: 6,
  },
];

const getConflictExplanation = (conflicts: string[]): { type: string; explanation: string }[] => {
  const explanations: { type: string; explanation: string }[] = [];
  
  const hasShiftReduce = conflicts.some(c => c.includes('Shift/Reduce'));
  const hasReduceReduce = conflicts.some(c => c.includes('Reduce/Reduce'));

  if (hasShiftReduce) {
    explanations.push({
      type: 'Shift/Reduce',
      explanation: 'Un conflicto Shift/Reduce ocurre cuando el parser no puede decidir si desplazar (leer el siguiente token) o reducir (aplicar una regla de producción). Esto indica que la gramática es ambigua para este tipo de parser. Un parser más potente (ej: SLR(1) → LALR(1) → LR(1)) podría resolver este conflicto.',
    });
  }

  if (hasReduceReduce) {
    explanations.push({
      type: 'Reduce/Reduce',
      explanation: 'Un conflicto Reduce/Reduce ocurre cuando el parser puede aplicar dos reglas de producción diferentes en el mismo estado y lookahead. Este tipo de conflicto es más severo e indica ambigüedad en la gramática que puede requerir reestructuración.',
    });
  }

  return explanations;
};

export const ParserCompatibility: React.FC<ParserCompatibilityProps> = ({
  parserType,
  accepted,
  conflicts,
  errorMessage,
}) => {
  const currentParser = PARSER_HIERARCHY.find(p => p.id === parserType);
  const hasConflicts = conflicts && conflicts.length > 0;
  const conflictExplanations = hasConflicts ? getConflictExplanation(conflicts) : [];

  return (
    <div className="space-y-5">
      {/* Current Parser Status */}
      <div className={`p-4 rounded-lg border ${
        accepted && !hasConflicts
          ? 'bg-emerald-500/8 border-emerald-500/20'
          : hasConflicts
            ? 'bg-amber-500/8 border-amber-500/20'
            : 'bg-red-500/8 border-red-500/20'
      }`}>
        <div className="flex items-start gap-3">
          {accepted && !hasConflicts ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          ) : hasConflicts ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          )}
          <div>
            <h3 className={`font-semibold text-sm ${
              accepted && !hasConflicts ? 'text-emerald-300' : hasConflicts ? 'text-amber-300' : 'text-red-300'
            }`}>
              {accepted && !hasConflicts 
                ? `La gramática es compatible con ${currentParser?.name || parserType}`
                : hasConflicts
                  ? `La gramática NO pertenece estrictamente a ${currentParser?.name || parserType}`
                  : `Error al analizar con ${currentParser?.name || parserType}`
              }
            </h3>
            {hasConflicts && (
              <p className="text-sm text-gray-400 mt-1">
                Se detectaron <span className="font-semibold text-amber-300">{conflicts.length}</span> conflicto{conflicts.length > 1 ? 's' : ''} durante la construcción de la tabla.
              </p>
            )}
            {errorMessage && !hasConflicts && (
              <p className="text-sm text-gray-400 mt-1">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Explanations */}
      {conflictExplanations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            ¿Por qué no pertenece a este parser?
          </h4>
          {conflictExplanations.map((exp, i) => (
            <div key={i} className="bg-black/20 rounded-lg border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  exp.type === 'Shift/Reduce' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {exp.type}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{exp.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Conflicts */}
      {hasConflicts && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Conflictos Específicos</h4>
          <div className="bg-black/20 rounded-lg border border-white/5 p-3 max-h-[200px] overflow-y-auto">
            <ul className="space-y-1.5">
              {conflicts.map((conflict, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs font-mono text-gray-400">
                  <span className="text-red-400 shrink-0 mt-0.5">•</span>
                  <span>{conflict}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Parser Hierarchy */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          Jerarquía de Parsers
          <span className="text-[10px] font-normal text-gray-500">(de menos a más potente)</span>
        </h4>
        <div className="space-y-1">
          {PARSER_HIERARCHY.map((parser, idx) => {
            const isCurrent = parser.id === parserType;
            const isMorePowerful = currentParser ? parser.power > currentParser.power : false;

            return (
              <div key={parser.id}>
                {/* Type separator */}
                {idx === 0 && (
                  <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5 pl-2">
                    Top-Down
                  </div>
                )}
                {idx === 2 && (
                  <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1.5 mt-3 pl-2">
                    Bottom-Up
                  </div>
                )}

                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isCurrent 
                    ? 'bg-indigo-500/15 border border-indigo-500/30' 
                    : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                }`}>
                  {/* Power indicator */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5, 6].map(level => (
                      <div
                        key={level}
                        className={`w-1.5 h-3 rounded-sm ${
                          level <= parser.power
                            ? isCurrent
                              ? 'bg-indigo-400'
                              : isMorePowerful
                                ? 'bg-emerald-500/40'
                                : 'bg-gray-600'
                            : 'bg-gray-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Parser name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isCurrent ? 'text-indigo-300' : 'text-gray-400'
                      }`}>
                        {parser.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 uppercase tracking-wider">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">{parser.description}</p>
                  </div>

                  {/* Status for current */}
                  {isCurrent && (
                    <div>
                      {accepted && !hasConflicts ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : hasConflicts ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  )}

                  {/* Suggestion arrow for more powerful parsers */}
                  {hasConflicts && isMorePowerful && (
                    <span className="text-[10px] text-emerald-500/60 font-medium">
                      Probar ↗
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
