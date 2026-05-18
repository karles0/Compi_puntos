import React, { useState } from 'react';
import { ParseTable } from './ParseTable';
import { AutomatonGraph } from './AutomatonGraph';
import { ConflictAlert } from './ConflictAlert';
import { ASTViewer } from './ASTViewer';
import { ParserCompatibility } from './ParserCompatibility';
import type { ParseResult } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Table, Cpu, ListOrdered, Hash, TreePine, Shield } from 'lucide-react';

interface ResultsPanelProps {
  result: ParseResult | null;
  parserType: string;
}

type TabType = 'table' | 'automaton' | 'steps' | 'firstfollow' | 'ast' | 'compatibility';

const TAB_CONFIG = [
  { id: 'steps' as TabType, label: 'Pasos', icon: ListOrdered },
  { id: 'table' as TabType, label: 'Tabla', icon: Table },
  { id: 'automaton' as TabType, label: 'Autómata', icon: Cpu },
  { id: 'firstfollow' as TabType, label: 'FIRST / FOLLOW', icon: Hash },
  { id: 'ast' as TabType, label: 'AST', icon: TreePine },
  { id: 'compatibility' as TabType, label: 'Compatibilidad', icon: Shield },
];

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, parserType }) => {
  const [activeTab, setActiveTab] = useState<TabType>('steps');

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 border border-white/5 rounded-xl bg-gray-900/20 backdrop-blur-sm p-8">
        <div className="w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center animate-float">
          <svg className="w-10 h-10 text-indigo-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-400 mb-1">Esperando análisis</p>
        <p className="text-xs text-gray-600 text-center max-w-xs">
          Introduce una gramática, selecciona un parser y presiona <strong className="text-indigo-400">"Analizar"</strong> para ver los resultados.
        </p>
      </div>
    );
  }

  const hasConflicts = result.conflicts && result.conflicts.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-900/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Status Bar */}
      <div className={`flex items-center gap-3 px-5 py-3 border-b ${result.accepted && !hasConflicts
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : hasConflicts
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-red-500/20 bg-red-500/5'
        }`}>
        {result.accepted && !hasConflicts ? (
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        ) : hasConflicts ? (
          <Shield className="w-5 h-5 text-amber-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <span className={`text-sm font-semibold ${result.accepted && !hasConflicts ? 'text-emerald-300' : hasConflicts ? 'text-amber-300' : 'text-red-300'
          }`}>
          {result.accepted && !hasConflicts
            ? 'Cadena Aceptada ✓'
            : hasConflicts
              ? `Aceptada con ${result.conflicts.length} conflicto${result.conflicts.length > 1 ? 's' : ''}`
              : 'Cadena Rechazada ✗'
          }
        </span>
        <span className="ml-auto text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          {parserType.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto">
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          // Show notification dot on compatibility tab when there are conflicts
          const showDot = tab.id === 'compatibility' && hasConflicts;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/8'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {showDot && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'steps' && (
              <div>
                <ConflictAlert
                  accepted={result.accepted}
                  errorMessage={result.errorMessage}
                  conflicts={result.conflicts || []}
                />
                {result.steps && result.steps.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-300 sticky top-0">
                        <tr>
                          <th className="p-3 w-12 text-center font-semibold text-gray-500">#</th>
                          <th className="p-3 font-semibold">
                            <span className="font-mono text-indigo-300/80">Pila</span>
                          </th>
                          <th className="p-3 font-semibold">
                            <span className="font-mono text-pink-300/80">Entrada</span>
                          </th>
                          <th className="p-3 font-semibold w-24">Acción</th>
                          <th className="p-3 font-semibold">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {result.steps.map((step, idx) => {
                          const isAccept = step.action === 'ACCEPT';
                          const isError = step.action === 'ERROR';

                          return (
                            <tr
                              key={idx}
                              className={`transition-colors ${isAccept ? 'bg-emerald-500/5' : isError ? 'bg-red-500/5' : 'hover:bg-white/[0.02]'
                                }`}
                            >
                              <td className="p-3 text-center text-gray-600 text-xs font-mono">{idx + 1}</td>
                              <td className="p-3 font-mono text-xs text-indigo-200/80 max-w-[200px] truncate" title={step.stack}>
                                {step.stack}
                              </td>
                              <td className="p-3 font-mono text-xs text-pink-200/80 max-w-[150px] truncate" title={step.input}>
                                {step.input}
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${step.action === 'SHIFT' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                                  step.action === 'REDUCE' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                    step.action === 'ACCEPT' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                      step.action === 'EXPAND' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' :
                                        step.action === 'MATCH' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
                                          step.action === 'EPSILON' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                            step.action === 'ERROR' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                              'bg-white/5 text-gray-400 border border-white/10'
                                  }`}>
                                  {step.action}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-gray-400 max-w-[300px]">
                                <span className="truncate block" title={step.description}>{step.description}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No hay pasos de análisis disponibles.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'table' && <ParseTable tableData={result.table} />}

            {activeTab === 'automaton' && <AutomatonGraph automaton={result.automaton} />}

            {activeTab === 'firstfollow' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-indigo-400 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Conjuntos FIRST
                  </h3>
                  <div className="bg-black/20 rounded-lg p-4 border border-white/5 space-y-2">
                    {result.firstSets ? Object.entries(result.firstSets).map(([nt, set]) => (
                      <div key={nt} className="flex items-start gap-2">
                        <span className="font-mono text-sm font-semibold text-purple-300 min-w-[40px]">{nt}</span>
                        <span className="text-gray-600 text-sm">=</span>
                        <span className="text-sm text-gray-300 font-mono">
                          {'{ '}
                          {set.map((s, i) => (
                            <span key={i}>
                              <span className={`${s === 'ε' ? 'text-emerald-400' : s === '$' ? 'text-pink-400' : 'text-cyan-300'}`}>
                                {s}
                              </span>
                              {i < set.length - 1 && <span className="text-gray-600">, </span>}
                            </span>
                          ))}
                          {' }'}
                        </span>
                      </div>
                    )) : (
                      <span className="text-gray-500 text-sm">No disponibles</span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-pink-400 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Conjuntos FOLLOW
                  </h3>
                  <div className="bg-black/20 rounded-lg p-4 border border-white/5 space-y-2">
                    {result.followSets ? Object.entries(result.followSets).map(([nt, set]) => (
                      <div key={nt} className="flex items-start gap-2">
                        <span className="font-mono text-sm font-semibold text-purple-300 min-w-[40px]">{nt}</span>
                        <span className="text-gray-600 text-sm">=</span>
                        <span className="text-sm text-gray-300 font-mono">
                          {'{ '}
                          {set.map((s, i) => (
                            <span key={i}>
                              <span className={`${s === '$' ? 'text-pink-400' : 'text-cyan-300'}`}>
                                {s}
                              </span>
                              {i < set.length - 1 && <span className="text-gray-600">, </span>}
                            </span>
                          ))}
                          {' }'}
                        </span>
                      </div>
                    )) : (
                      <span className="text-gray-500 text-sm">No disponibles</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ast' && (
              <ASTViewer ast={result.ast} derivation={result.derivation} />
            )}

            {activeTab === 'compatibility' && (
              <ParserCompatibility
                parserType={parserType}
                accepted={result.accepted}
                conflicts={result.conflicts || []}
                errorMessage={result.errorMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
