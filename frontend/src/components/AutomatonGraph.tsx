import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  Background,
  Controls,
  MiniMap,
  Panel,
  type NodeProps,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { AutomatonData } from '../types';
import {
  Play, Pause, SkipBack, SkipForward, StepBack, StepForward, Maximize2, Minimize2, ChevronDown, ChevronRight
} from 'lucide-react';

/* ── Custom Node for LR States ── */
const LRStateNode = ({ data, isConnectable }: NodeProps) => {
  const { id, items, isInitial, isNewest } = data as {
    id: number;
    items: string[];
    isInitial: boolean;
    isNewest: boolean;
  };

  const stroke = isNewest ? '#22d3ee' : isInitial ? '#818cf8' : '#4338ca';
  const fill = isNewest ? 'rgba(34,211,238,0.1)' : isInitial ? 'rgba(99,102,241,0.15)' : 'rgba(30,27,75,0.85)';
  const textColor = isNewest ? '#a5f3fc' : isInitial ? '#e0e7ff' : '#c7d2fe';

  return (
    <div
      className="rounded-lg shadow-xl"
      style={{
        background: fill,
        border: `2px solid ${stroke}`,
        minWidth: 150,
        boxShadow: isNewest ? '0 0 15px rgba(34,211,238,0.2)' : 'none',
      }}
    >
      {/* Target Handle (Left) */}
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#6366f1' }} />

      <div className="px-3 py-1.5 border-b" style={{ borderColor: `${stroke}55` }}>
        <h4 className="text-xs font-bold text-center font-mono" style={{ color: textColor }}>
          I{id} {isInitial && '★'}
        </h4>
      </div>
      <div className="px-3 py-2 space-y-0.5">
        {items.map((item, idx) => (
          <div key={idx} className="text-[10px] font-mono" style={{ color: 'rgba(196,181,253,0.8)' }}>
            {item}
          </div>
        ))}
      </div>

      {/* Source Handle (Right) */}
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#6366f1' }} />
    </div>
  );
};

const nodeTypes = {
  lrState: LRStateNode,
};

/* ── Dagre Layout Function ── */
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    // estimate size based on items count
    const itemsCount = (node.data.items as string[])?.length || 1;
    const height = 30 + (itemsCount * 18);
    dagreGraph.setNode(node.id, { width: 170, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 170 / 2,
        y: nodeWithPosition.y - (30 + ((node.data.items as string[])?.length || 1) * 18) / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

/* ── Main Graph Component ── */

const SIM_THRESHOLD = 25;
const SPEEDS = [
  { label: '0.5×', ms: 1600 },
  { label: '1×', ms: 900 },
  { label: '2×', ms: 450 },
  { label: '4×', ms: 200 },
];

const AutomatonGraphInner: React.FC<{ automaton: AutomatonData | null }> = ({ automaton }) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [showStates, setShowStates] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simMode, setSimMode] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simPlaying, setSimPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  const canSimulate = !!automaton && automaton.states.length <= SIM_THRESHOLD;
  const total = automaton?.states.length ?? 0;

  // Initialize Layout
  useEffect(() => {
    if (!automaton) return;

    // We generate all edges and nodes first, layout them, then slice by simStep
    const allNodes: Node[] = automaton.states.map((state) => ({
      id: state.id.toString(),
      type: 'lrState',
      position: { x: 0, y: 0 },
      data: {
        id: state.id,
        items: state.items,
        isInitial: state.id === automaton.states[0]?.id,
        isNewest: false,
      },
    }));

    // Group transitions by from/to to prevent overlapping edges
    const edgeMap = new Map<string, string[]>();
    for (const t of automaton.transitions) {
      const key = `${t.from}-${t.to}`;
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key)!.push(t.symbol);
    }

    const allEdges: Edge[] = [];
    for (const [key, symbols] of edgeMap) {
      const [from, to] = key.split('-');
      allEdges.push({
        id: `e${from}-${to}`,
        source: from,
        target: to,
        label: symbols.join(', '),
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(129,140,248,0.7)' },
        style: { stroke: 'rgba(129,140,248,0.55)', strokeWidth: 1.5 },
        labelStyle: { fill: '#a5b4fc', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 },
        labelBgStyle: { fill: '#0a0818', fillOpacity: 0.8 },
      });
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(allNodes, allEdges);

    // Apply Simulation state filtering
    const count = simMode ? simStep : total;
    const visibleNodeIds = new Set(automaton.states.slice(0, count).map(s => s.id.toString()));

    const currentNodes = layoutedNodes.filter(n => visibleNodeIds.has(n.id)).map((n, idx) => ({
      ...n,
      data: {
        ...n.data,
        isNewest: simMode && idx === count - 1,
      }
    }));

    const currentEdges = layoutedEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

    setNodes(currentNodes);
    setEdges(currentEdges);
  }, [automaton, simMode, simStep, total, setNodes, setEdges]);

  // Playback Logic
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSimPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (!automaton) return;
    setSimPlaying(true);
    intervalRef.current = setInterval(() => {
      setSimStep(prev => {
        if (prev >= total) { stopPlayback(); return prev; }
        return prev + 1;
      });
    }, SPEEDS[speedIdx].ms);
  }, [automaton, total, speedIdx, stopPlayback]);

  useEffect(() => {
    if (simStep >= total && simPlaying) stopPlayback();
  }, [simStep, total, simPlaying, stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  // Reset when automaton changes
  useEffect(() => { stopPlayback(); setSimStep(0); setSimMode(false); }, [automaton, stopPlayback]);

  const togglePlay = () => {
    if (simPlaying) { stopPlayback(); return; }
    if (simStep >= total) setSimStep(0);
    startPlayback();
  };

  if (!automaton) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <p className="text-sm font-medium text-gray-400 mb-1">Sin datos de autómata</p>
      <p className="text-xs text-gray-600 text-center max-w-xs">
        Solo los parsers <span className="text-purple-400">Bottom-Up</span> generan un autómata LR.
      </p>
    </div>
  );

  const graphH = isFullscreen ? 'calc(100vh - 130px)' : '520px';
  const currentStateId = simMode && simStep > 0 ? automaton.states[simStep - 1]?.id : null;
  const currentState = currentStateId != null ? automaton.states.find(s => s.id === currentStateId) : null;

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-4 z-[60] flex flex-col bg-[#06060b] rounded-xl p-4 shadow-2xl' : ''}`}>
      {/* ── Simulation Panel ── */}
      {canSimulate && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-semibold text-cyan-300">Simulación paso a paso</span>
              {simMode && (
                <span className="text-[10px] text-cyan-500/70 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                  {simStep}/{total} estados
                </span>
              )}
            </div>
            {!simMode ? (
              <button onClick={() => { setSimStep(0); setSimMode(true); }}
                className="flex items-center gap-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/25 px-3 py-1.5 rounded-lg transition-colors">
                <Play className="w-3.5 h-3.5 fill-current" /> Iniciar
              </button>
            ) : (
              <button onClick={() => { stopPlayback(); setSimMode(false); setSimStep(0); }}
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-white/5 transition-colors">
                Salir
              </button>
            )}
          </div>

          {simMode && (
            <>
              {/* Progress bar */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${(simStep / total) * 100}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => { stopPlayback(); setSimStep(0); }} disabled={simStep === 0}
                  className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Inicio">
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { stopPlayback(); setSimStep(s => Math.max(0, s - 1)); }} disabled={simStep === 0}
                  className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Anterior">
                  <StepBack className="w-3.5 h-3.5" />
                </button>
                <button onClick={togglePlay}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${simPlaying ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'}`}>
                  {simPlaying ? <><Pause className="w-3.5 h-3.5 fill-current" />Pausar</> : <><Play className="w-3.5 h-3.5 fill-current" />{simStep >= total ? 'Reiniciar' : 'Play'}</>}
                </button>
                <button onClick={() => { stopPlayback(); setSimStep(s => Math.min(total, s + 1)); }} disabled={simStep >= total}
                  className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Siguiente">
                  <StepForward className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { stopPlayback(); setSimStep(total); }} disabled={simStep >= total}
                  className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Final">
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-600">Vel.</span>
                  <select value={speedIdx} onChange={e => setSpeedIdx(Number(e.target.value))}
                    className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-1 text-gray-300 focus:outline-none">
                    {SPEEDS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Current state info */}
              {currentState && (
                <div className="bg-black/30 rounded-lg p-2.5 border border-cyan-500/10">
                  <p className="text-[10px] text-cyan-400 font-semibold mb-1.5 uppercase tracking-wider">
                    Estado I{currentState.id} añadido
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {automaton.transitions.filter(t => t.from === currentState.id).map((t, i) => (
                      <span key={i} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${/^[A-Z]/.test(t.symbol) ? 'bg-purple-500/15 text-purple-300 border-purple-500/20' : 'bg-blue-500/15 text-blue-300 border-blue-500/20'}`}>
                        {t.symbol} → I{t.to}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {simStep === 0 && (
                <p className="text-xs text-gray-600 text-center">Presiona Play o avanza manualmente</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Graph Panel ── */}
      <div className={`relative border border-white/10 rounded-lg bg-black/20 overflow-hidden flex flex-col ${isFullscreen ? 'flex-1' : ''}`}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Autómata LR (React Flow)</span>
            <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
              {simMode ? `${simStep}/` : ''}{total} estados · {automaton.transitions.length} trans.
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsFullscreen(f => !f)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-colors">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* React Flow Area */}
        <div style={{ height: graphH }} className="relative bg-[#06060b]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            colorMode="dark"
            nodesConnectable={false} // Disable user drawing new edges
          >
            <Background color="#1e1b4b" gap={16} size={1} />
            <Controls className="!bg-black/50 !border-white/10 !fill-gray-400" />
            <MiniMap
              nodeColor={(n) => n.data?.isInitial ? '#818cf8' : n.data?.isNewest ? '#22d3ee' : '#4338ca'}
              maskColor="rgba(0, 0, 0, 0.7)"
              className="!bg-[#0a0818] !border-white/10"
            />
            <Panel position="top-center" className="text-[10px] text-gray-500 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              💡 Puedes arrastrar los estados libremente. Las flechas se actualizarán solas.
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* ── States Table ── */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <button onClick={() => setShowStates(s => !s)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            {showStates ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Tabla de Estados
          </span>
          <span className="text-[10px] text-gray-600">{total} estados</span>
        </button>
        {showStates && (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-gray-300 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-20 font-semibold text-center">Estado</th>
                  <th className="p-3 font-semibold">Ítems LR</th>
                  <th className="p-3 w-48 font-semibold">Transiciones</th>
                </tr>o
              </thead>
              <tbody className="divide-y divide-white/5">
                {automaton.states.map((state, idx) => {
                  const trans = automaton.transitions.filter(t => t.from === state.id);
                  return (
                    <tr key={state.id} className={`hover:bg-white/[0.02] ${idx === 0 ? 'bg-indigo-500/5' : ''}`}>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold text-sm border ${idx === 0 ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/40' : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'}`}>I{state.id}</span>
                        {idx === 0 && <div className="text-[9px] text-indigo-400 mt-0.5">inicial</div>}
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {state.items.map((item, i) => <div key={i} className="font-mono text-xs text-gray-400">{item}</div>)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1.5">
                          {trans.length === 0 ? <span className="text-[11px] text-gray-600 italic">sin transiciones</span>
                            : trans.map((t, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-semibold border ${/^[A-Z]/.test(t.symbol) ? 'bg-purple-500/20 text-purple-300 border-purple-500/20' : 'bg-blue-500/20 text-blue-300 border-blue-500/20'}`}>{t.symbol}</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-gray-400 font-medium font-mono">I{t.to}</span>
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const AutomatonGraph = ({ automaton }: { automaton: AutomatonData | null }) => (
  <ReactFlowProvider>
    <AutomatonGraphInner automaton={automaton} />
  </ReactFlowProvider>
);
