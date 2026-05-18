import React, { useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import type { ASTNode } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Expand } from 'lucide-react';

interface ASTViewerProps {
  ast: ASTNode | null;
  derivation: string[] | null;
}

/* ───────────────────────────────────────
   Tree layout algorithm
   Assigns (x, y) to every node so that:
   - root is centered
   - children are spread below their parent
   - no subtrees overlap
─────────────────────────────────────── */

interface LayoutNode {
  id: string;
  label: string;
  value?: string;
  terminal: boolean;
  x: number;   // center x
  y: number;   // center y
  width: number;
  children: LayoutNode[];
  parentId?: string;
}

const NODE_W = 80;        // node box width
const NODE_H = 36;        // node box height
const H_GAP = 16;         // horizontal gap between sibling boxes
const V_GAP = 60;         // vertical gap between levels

/** Recursively compute the minimum width a subtree needs */
function subtreeWidth(node: ASTNode): number {
  if (!node.children || node.children.length === 0) return NODE_W;
  const childrenTotal = node.children.reduce(
    (sum, c) => sum + subtreeWidth(c), 0
  ) + H_GAP * (node.children.length - 1);
  return Math.max(NODE_W, childrenTotal);
}

let _idCounter = 0;

function buildLayout(
  node: ASTNode,
  cx: number,
  cy: number,
  depth: number,
  parentId?: string
): LayoutNode {
  const id = `n${_idCounter++}`;
  const layout: LayoutNode = {
    id,
    label: node.label,
    value: node.value ?? undefined,
    terminal: !!node.terminal,
    x: cx,
    y: cy,
    width: subtreeWidth(node),
    children: [],
    parentId,
  };

  if (node.children && node.children.length > 0) {
    const childWidths = node.children.map(subtreeWidth);
    const totalChildrenWidth =
      childWidths.reduce((a, b) => a + b, 0) +
      H_GAP * (node.children.length - 1);
    let childX = cx - totalChildrenWidth / 2;
    const childY = cy + NODE_H + V_GAP;

    node.children.forEach((child, i) => {
      const cw = childWidths[i];
      layout.children.push(
        buildLayout(child, childX + cw / 2, childY, depth + 1, id)
      );
      childX += cw + H_GAP;
    });
  }

  return layout;
}

/** Flatten layout tree to arrays of nodes + edges */
function flattenLayout(root: LayoutNode): { nodes: LayoutNode[]; edges: { from: LayoutNode; to: LayoutNode }[] } {
  const nodes: LayoutNode[] = [];
  const edges: { from: LayoutNode; to: LayoutNode }[] = [];
  const map = new Map<string, LayoutNode>();

  const visit = (n: LayoutNode) => {
    nodes.push(n);
    map.set(n.id, n);
    n.children.forEach(c => {
      edges.push({ from: n, to: c });
      visit(c);
    });
  };
  visit(root);
  return { nodes, edges };
}

/* ───────────────────────────────────────
   SVG Tree renderer
─────────────────────────────────────── */

const TreeSVG: React.FC<{ ast: ASTNode }> = ({ ast }) => {
  _idCounter = 0;
  const layoutRoot = useMemo(() => buildLayout(ast, 0, 0, 0), [ast]);
  const { nodes, edges } = useMemo(() => flattenLayout(layoutRoot), [layoutRoot]);

  // compute bounding box
  const minX = Math.min(...nodes.map(n => n.x - NODE_W / 2)) - 32;
  const minY = Math.min(...nodes.map(n => n.y - NODE_H / 2)) - 32;
  const maxX = Math.max(...nodes.map(n => n.x + NODE_W / 2)) + 32;
  const maxY = Math.max(...nodes.map(n => n.y + NODE_H / 2)) + 32;
  const svgW = maxX - minX;
  const svgH = maxY - minY;

  const tx = (x: number) => x - minX;
  const ty = (y: number) => y - minY;

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(139,92,246,0.5)" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const x1 = tx(e.from.x);
        const y1 = ty(e.from.y) + NODE_H / 2;
        const x2 = tx(e.to.x);
        const y2 = ty(e.to.y) - NODE_H / 2;
        const cy1 = y1 + (y2 - y1) * 0.5;
        const cy2 = y1 + (y2 - y1) * 0.5;
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
            fill="none"
            stroke="rgba(139,92,246,0.35)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const cx = tx(n.x);
        const cy = ty(n.y);
        const rx = NODE_W / 2;
        const ry = NODE_H / 2;
        const isRoot = !n.parentId;

        if (n.terminal) {
          // Terminal → rounded pill / ellipse
          return (
            <g key={n.id}>
              <ellipse
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill="rgba(16,185,129,0.12)"
                stroke={isRoot ? '#10b981' : 'rgba(16,185,129,0.45)'}
                strokeWidth={isRoot ? 2 : 1.5}
              />
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#6ee7b7"
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                {n.label.length > 9 ? n.label.slice(0, 8) + '…' : n.label}
              </text>
            </g>
          );
        } else {
          // Non-Terminal → rectangle
          return (
            <g key={n.id}>
              <rect
                x={cx - rx}
                y={cy - ry}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                ry={6}
                fill={isRoot ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)'}
                stroke={isRoot ? '#818cf8' : 'rgba(99,102,241,0.5)'}
                strokeWidth={isRoot ? 2 : 1.5}
              />
              {isRoot && (
                <rect
                  x={cx - rx}
                  y={cy - ry}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  ry={6}
                  fill="none"
                  stroke="rgba(129,140,248,0.3)"
                  strokeWidth={4}
                />
              )}
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isRoot ? '#e0e7ff' : '#c4b5fd'}
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                {n.label.length > 9 ? n.label.slice(0, 8) + '…' : n.label}
              </text>
            </g>
          );
        }
      })}
    </svg>
  );
};

/* ───────────────────────────────────────
   Main ASTViewer
─────────────────────────────────────── */

export const ASTViewer: React.FC<ASTViewerProps> = ({ ast, derivation }) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const treeHeight = isFullscreen ? 'calc(100vh - 160px)' : '480px';

  return (
    <div className="space-y-5">
      {/* ── AST Graph ── */}
      <div>
        {/* Legend */}
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-base font-semibold text-indigo-400">Árbol de Sintaxis (AST)</h3>
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-8 h-3.5 rounded-sm bg-indigo-500/20 border border-indigo-500/40" />
              No-Terminal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-8 h-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/40" style={{ borderRadius: '999px' }} />
              Terminal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-8 h-3.5 rounded-sm bg-indigo-500/30 border-2 border-indigo-400/70" />
              Raíz
            </span>
          </div>
        </div>

        {/* Panel */}
        <div className={`relative border border-white/10 rounded-lg bg-black/20 overflow-hidden flex flex-col ${isFullscreen ? 'fixed inset-4 z-[60] bg-[#06060b] rounded-xl' : ''
          }`}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02] shrink-0">
            <span className="text-xs font-semibold text-gray-400">Árbol de Derivación</span>
            <div className="flex items-center gap-1">
              <button onClick={() => transformRef.current?.zoomIn()} title="Acercar"
                className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => transformRef.current?.zoomOut()} title="Alejar"
                className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-colors">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => transformRef.current?.resetTransform()} title="Restablecer"
                className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button onClick={() => setIsFullscreen(f => !f)}
                title={isFullscreen ? 'Salir' : 'Pantalla completa'}
                className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-colors">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Hint */}
          <div className="text-[10px] text-gray-600 text-center py-1 border-b border-white/[0.03] shrink-0">
            🖱️ Arrastra · Rueda del ratón para zoom · Doble clic para centrar
          </div>

          {/* Zoomable area */}
          <div
            style={{ height: treeHeight }}
            className="relative overflow-hidden bg-gradient-to-br from-[#06060b] to-[#0a0818]"
          >
            {!ast ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                No hay datos del AST disponibles.
              </div>
            ) : (
              <TransformWrapper
                ref={transformRef}
                initialScale={0.85}
                minScale={0.1}
                maxScale={5}
                wheel={{ step: 0.08 }}
                doubleClick={{ mode: 'reset' }}
                centerOnInit
                limitToBounds={false}
              >
                {({ zoomIn, zoomOut }) => (
                  <>
                    <TransformComponent
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      contentStyle={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px' }}
                    >
                      <TreeSVG ast={ast} />
                    </TransformComponent>

                    {/* Floating controls */}
                    <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
                      <button onClick={() => zoomIn()}
                        className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors border border-white/10">
                        +
                      </button>
                      <button onClick={() => zoomOut()}
                        className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors border border-white/10">
                        −
                      </button>
                      <button onClick={() => transformRef.current?.resetTransform()}
                        className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
                        title="Restablecer">
                        <Expand className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </TransformWrapper>
            )}
          </div>
        </div>

        {/* Fullscreen backdrop */}
        {isFullscreen && (
          <div className="fixed inset-0 bg-black/80 z-[50]" onClick={() => setIsFullscreen(false)} />
        )}
      </div>

      {/* ── Derivation ── */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-pink-400">Derivación</h3>
        {derivation && derivation.length > 0 ? (
          <div className="bg-black/20 rounded-lg border border-white/5 p-4 overflow-x-auto max-h-[300px] overflow-y-auto">
            <div className="space-y-1">
              {derivation.map((d, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="text-[10px] font-mono text-gray-600 min-w-[24px] text-right pt-1">{i + 1}</span>
                  <span className="text-gray-500 text-sm pt-0.5">{i === 0 ? '  ' : '⇒'}</span>
                  <code className="font-mono text-sm text-gray-300 group-hover:text-white transition-colors py-0.5 flex-1">{d}</code>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-black/20 rounded-lg border border-white/5 p-6 text-center text-gray-500 text-sm">
            No hay datos de derivación disponibles.
          </div>
        )}
      </div>
    </div>
  );
};
