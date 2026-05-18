import React from 'react';

interface ParseTableProps {
  tableData: any;
}

export const ParseTable: React.FC<ParseTableProps> = ({ tableData }) => {
  if (!tableData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-400">No hay datos de tabla disponibles</p>
        <p className="text-xs text-gray-600 mt-1">Ejecuta un análisis para ver la tabla sintáctica.</p>
      </div>
    );
  }

  // Detect LL(1) table format: it's a flat object { NT: { terminal: "production string" } }
  // vs LR format: { action: {...}, goto: {...}, productions: [...] }
  const isLR = tableData.action !== undefined && tableData.goto !== undefined;
  
  if (!isLR) {
    // LL(1) Table: tableData is { NT: { terminal: "NT → X Y Z" } }
    const nonTerminals = Object.keys(tableData);
    if (nonTerminals.length === 0) return null;

    // Collect all terminals from all rows
    const terminalSet = new Set<string>();
    nonTerminals.forEach(nt => {
      Object.keys(tableData[nt] || {}).forEach(t => terminalSet.add(t));
    });
    const terminals = Array.from(terminalSet).sort();

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tabla LL(1)</span>
          <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
            M[No-Terminal, Terminal]
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/10 text-gray-300">
              <tr>
                <th className="p-3 font-semibold border-r border-white/10 sticky left-0 bg-[#0d0d18] z-10 min-w-[60px]">
                  <span className="text-indigo-300">M</span>
                </th>
                {terminals.map((t: string) => (
                  <th key={t} className="p-3 font-semibold font-mono text-cyan-300 text-center min-w-[120px]">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {nonTerminals.map((nt: string) => (
                <tr key={nt} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-semibold text-purple-300 border-r border-white/10 sticky left-0 bg-[#0d0d18] font-mono">
                    {nt}
                  </td>
                  {terminals.map((t: string) => {
                    const cell = tableData[nt]?.[t];
                    const hasContent = cell && cell.trim() !== '';
                    return (
                      <td key={t} className="p-3 font-mono text-center">
                        {hasContent ? (
                          <span className="text-sm text-gray-300 bg-indigo-500/8 px-2 py-1 rounded border border-indigo-500/15">
                            {cell}
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // LR Table Rendering (ACTION and GOTO)
  const { action, goto: gotoData, productions } = tableData;
  if (!action || !gotoData) return null;

  const states = Object.keys(action).map(Number).sort((a, b) => a - b);
  const actionSymbols = Array.from(new Set(states.flatMap(s => Object.keys(action[s] || {})))).sort();
  const gotoSymbols = Array.from(new Set(states.flatMap(s => Object.keys(gotoData[s] || {})))).sort();

  const getActionBadge = (act: string) => {
    if (!act) return null;
    if (act.startsWith('s')) {
      return (
        <span className="inline-flex items-center bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded text-xs font-semibold font-mono border border-blue-500/20">
          {act}
        </span>
      );
    }
    if (act.startsWith('r')) {
      return (
        <span className="inline-flex items-center bg-red-500/15 text-red-400 px-2 py-0.5 rounded text-xs font-semibold font-mono border border-red-500/20" title={productions ? productions.find((p: string) => p.startsWith(act.substring(1) + ':')) : undefined}>
          {act}
        </span>
      );
    }
    if (act === 'acc') {
      return (
        <span className="inline-flex items-center bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold font-mono border border-emerald-500/20 animate-pulse-glow">
          {act}
        </span>
      );
    }
    return <span className="text-gray-400 text-xs">{act}</span>;
  };

  return (
    <div className="space-y-3">
      {/* Header with legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tabla ACTION/GOTO</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-blue-500/40"></span>
            <span className="text-gray-500">Shift</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-red-500/40"></span>
            <span className="text-gray-500">Reduce</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-500/40"></span>
            <span className="text-gray-500">Accept</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-purple-500/40"></span>
            <span className="text-gray-500">Goto</span>
          </span>
        </div>
      </div>

      {/* Productions reference */}
      {productions && productions.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
            📋 Producciones numeradas ({productions.length})
          </summary>
          <div className="mt-2 bg-black/20 rounded-lg border border-white/5 p-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {productions.map((p: string, i: number) => (
              <div key={i} className="font-mono text-xs text-gray-400">{p}</div>
            ))}
          </div>
        </details>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/5 border-b border-white/10 text-gray-300">
            <tr>
              <th rowSpan={2} className="p-3 font-semibold border-r border-white/10 sticky left-0 bg-[#0d0d18] z-20 text-center align-middle min-w-[60px]">
                Estado
              </th>
              {actionSymbols.length > 0 && (
                <th colSpan={actionSymbols.length} className="p-2 font-semibold text-center border-r border-white/10 border-b text-blue-300/80 text-xs uppercase tracking-wider">
                  ACTION
                </th>
              )}
              {gotoSymbols.length > 0 && (
                <th colSpan={gotoSymbols.length} className="p-2 font-semibold text-center border-b border-white/10 text-purple-300/80 text-xs uppercase tracking-wider">
                  GOTO
                </th>
              )}
            </tr>
            <tr>
              {actionSymbols.map(sym => (
                <th key={`act-${sym}`} className="p-2 font-semibold font-mono text-cyan-300 text-center border-r border-white/5 bg-white/[0.02] text-xs">
                  {sym}
                </th>
              ))}
              {gotoSymbols.map(sym => (
                <th key={`goto-${sym}`} className="p-2 font-semibold font-mono text-purple-300 text-center bg-white/[0.02] text-xs">
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {states.map(state => (
              <tr key={state} className="hover:bg-white/[0.02] group">
                <td className="p-2.5 font-semibold text-gray-300 border-r border-white/10 sticky left-0 bg-[#0d0d18] z-10 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-white/5 text-xs font-bold">
                    {state}
                  </span>
                </td>
                {actionSymbols.map(sym => (
                  <td key={`act-val-${sym}`} className="p-2 font-mono text-center border-r border-white/5">
                    {getActionBadge(action[state]?.[sym])}
                  </td>
                ))}
                {gotoSymbols.map(sym => (
                  <td key={`goto-val-${sym}`} className="p-2 font-mono text-center">
                    {gotoData[state]?.[sym] !== undefined && gotoData[state]?.[sym] !== null ? (
                      <span className="bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded text-xs font-semibold border border-purple-500/20">
                        {gotoData[state][sym]}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
