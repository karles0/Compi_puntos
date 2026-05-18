import React, { useState, useCallback } from 'react';
import { Keyboard } from 'lucide-react';

interface CustomKeyboardProps {
  onKeyPress: (key: string) => void;
  targetLabel?: string;
}

interface KeyDef {
  label: string;
  value: string;
  tooltip?: string;
  className?: string;
  wide?: boolean;
}

const KEY_GROUPS: { title: string; keys: KeyDef[] }[] = [
  {
    title: 'Símbolos Formales',
    keys: [
      { label: 'ε', value: 'ε', tooltip: 'Epsilon (producción vacía)', className: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300 hover:from-emerald-500/30 hover:to-emerald-600/20 hover:border-emerald-400/50 ring-emerald-500/20' },
      { label: '→', value: ' -> ', tooltip: 'Flecha de producción', className: 'bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300 hover:from-indigo-500/30 hover:to-indigo-600/20 hover:border-indigo-400/50' },
      { label: '|', value: ' | ', tooltip: 'Alternativa (OR)', className: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-amber-600/20 hover:border-amber-400/50' },
      { label: '$', value: '$', tooltip: 'Fin de entrada (EOF)', className: 'bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300 hover:from-pink-500/30 hover:to-pink-600/20 hover:border-pink-400/50' },
      { label: "'", value: "'", tooltip: 'Prima (ej: S\')', className: 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20' },
    ]
  },
  {
    title: 'Agrupadores',
    keys: [
      { label: '(', value: '( ', tooltip: 'Paréntesis abre' },
      { label: ')', value: ' )', tooltip: 'Paréntesis cierra' },
      { label: '{', value: '{ ', tooltip: 'Llave abre' },
      { label: '}', value: ' }', tooltip: 'Llave cierra' },
      { label: '[', value: '[ ', tooltip: 'Corchete abre' },
      { label: ']', value: ' ]', tooltip: 'Corchete cierra' },
    ]
  },
  {
    title: 'Operadores',
    keys: [
      { label: '+', value: '+', tooltip: 'Suma / Cerradura positiva' },
      { label: '*', value: '*', tooltip: 'Multiplicación / Cerradura Kleene' },
      { label: '-', value: '-', tooltip: 'Resta' },
      { label: '/', value: '/', tooltip: 'División' },
      { label: '=', value: '=', tooltip: 'Asignación' },
    ]
  },
  {
    title: 'Tokens Comunes',
    keys: [
      { label: 'id', value: 'id', tooltip: 'Identificador', className: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20' },
      { label: 'num', value: 'num', tooltip: 'Número', className: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20' },
      { label: 'if', value: 'if', tooltip: 'Palabra reservada if' },
      { label: 'then', value: 'then', tooltip: 'Palabra reservada then' },
      { label: 'else', value: 'else', tooltip: 'Palabra reservada else' },
    ]
  },
  {
    title: 'Controles',
    keys: [
      { label: '⌫', value: '__BACKSPACE__', tooltip: 'Borrar carácter', className: 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20 hover:border-red-400/30' },
      { label: '↵', value: '\n', tooltip: 'Nueva línea', className: 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400/30' },
      { label: '␣', value: ' ', tooltip: 'Espacio', className: 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10', wide: true },
    ]
  }
];

export const CustomKeyboard: React.FC<CustomKeyboardProps> = ({ onKeyPress, targetLabel }) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handlePress = useCallback((key: KeyDef) => {
    setPressedKey(key.label);
    onKeyPress(key.value);
    setTimeout(() => setPressedKey(null), 150);
  }, [onKeyPress]);

  return (
    <div className="mt-3">
      {/* Header toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-200 transition-colors w-full"
      >
        <Keyboard className="w-3.5 h-3.5" />
        <span>Teclado Virtual</span>
        {targetLabel && (
          <span className="text-indigo-400 normal-case tracking-normal font-medium ml-1">
            → {targetLabel}
          </span>
        )}
        <span className="ml-auto text-[10px] text-gray-500">
          {isExpanded ? '▲ Ocultar' : '▼ Mostrar'}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          {KEY_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 pl-0.5">
                {group.title}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.keys.map((key) => (
                  <button
                    key={key.label + key.value}
                    type="button"
                    title={key.tooltip}
                    onClick={() => handlePress(key)}
                    className={`
                      ${key.wide ? 'px-6' : 'px-2.5'} py-1.5 rounded-md font-mono text-sm font-medium
                      border transition-all duration-150
                      ${pressedKey === key.label ? 'scale-90' : 'scale-100'}
                      ${key.className || 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'}
                      active:scale-90
                      shadow-sm hover:shadow-md
                    `}
                  >
                    {key.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
