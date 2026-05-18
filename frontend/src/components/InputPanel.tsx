import React, { useRef, useState } from 'react';
import { Play, BookOpen, ChevronDown, Zap } from 'lucide-react';
import { CustomKeyboard } from './CustomKeyboard';

interface InputPanelProps {
  grammarText: string;
  setGrammarText: (val: string) => void;
  inputString: string;
  setInputString: (val: string) => void;
  parserType: string;
  setParserType: (val: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

interface GrammarExample {
  name: string;
  description: string;
  grammar: string;
  input: string;
  recommended: string;
}

const GRAMMAR_EXAMPLES: GrammarExample[] = [
  {
    name: 'Aritmética Simple',
    description: 'Expresiones con +, * y paréntesis',
    grammar: 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id',
    input: 'id + id * id',
    recommended: 'slr1',
  },
  {
    name: 'Gramática LL(1)',
    description: 'Sin recursión izquierda, compatible con LL(1)',
    grammar: "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id",
    input: 'id + id * id',
    recommended: 'll1',
  },
  {
    name: 'Gramática Simple S',
    description: 'Gramática básica con doble A',
    grammar: 'S -> A A\nA -> a A | a',
    input: 'a a a',
    recommended: 'lr0',
  },
  {
    name: 'If-Then-Else',
    description: 'Estructura condicional (ambigua)',
    grammar: 'S -> if E then S else S | if E then S | a\nE -> b',
    input: 'if b then a else a',
    recommended: 'lalr1',
  },
  {
    name: 'Listas',
    description: 'Lista de elementos separados por comas',
    grammar: 'L -> L , E | E\nE -> id | num',
    input: 'id , num , id',
    recommended: 'slr1',
  },
  {
    name: 'Paréntesis Balanceados',
    description: 'Gramática que genera paréntesis anidados',
    grammar: 'S -> ( S ) S | ε',
    input: '( ( ) ) ( )',
    recommended: 'lr1',
  },
  {
    name: 'Ambigua (No LL/LR)',
    description: 'Gramática altamente ambigua. Falla en analizadores deterministas.',
    grammar: 'E -> E + E | E * E | id',
    input: 'id + id * id',
    recommended: 'lr1',
  },
];

const PARSER_OPTIONS = [
  { value: 'recursive_descent', label: 'Descenso Recursivo', type: 'topdown', icon: '↓' },
  { value: 'll1', label: 'LL(1)', type: 'topdown', icon: '↓' },
  { value: 'lr0', label: 'LR(0)', type: 'bottomup', icon: '↑' },
  { value: 'slr1', label: 'SLR(1)', type: 'bottomup', icon: '↑' },
  { value: 'lalr1', label: 'LALR(1)', type: 'bottomup', icon: '↑' },
  { value: 'lr1', label: 'LR(1)', type: 'bottomup', icon: '↑' },
];

export const InputPanel: React.FC<InputPanelProps> = ({
  grammarText,
  setGrammarText,
  inputString,
  setInputString,
  parserType,
  setParserType,
  onAnalyze,
  isLoading
}) => {
  const grammarRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeField, setActiveField] = useState<'grammar' | 'input'>('grammar');
  const [showExamples, setShowExamples] = useState(false);

  const currentParserOption = PARSER_OPTIONS.find(p => p.value === parserType);
  const isTopDown = currentParserOption?.type === 'topdown';

  const handleKeyPress = (key: string) => {
    if (key === '__BACKSPACE__') {
      if (activeField === 'grammar') {
        if (grammarRef.current) {
          const start = grammarRef.current.selectionStart;
          const end = grammarRef.current.selectionEnd;
          if (start === end && start > 0) {
            const newVal = grammarText.substring(0, start - 1) + grammarText.substring(end);
            setGrammarText(newVal);
            setTimeout(() => {
              grammarRef.current?.focus();
              grammarRef.current?.setSelectionRange(start - 1, start - 1);
            }, 0);
          } else if (start !== end) {
            const newVal = grammarText.substring(0, start) + grammarText.substring(end);
            setGrammarText(newVal);
            setTimeout(() => {
              grammarRef.current?.focus();
              grammarRef.current?.setSelectionRange(start, start);
            }, 0);
          }
        }
      } else {
        if (inputRef.current) {
          const start = inputRef.current.selectionStart || 0;
          const end = inputRef.current.selectionEnd || 0;
          if (start === end && start > 0) {
            const newVal = inputString.substring(0, start - 1) + inputString.substring(end);
            setInputString(newVal);
            setTimeout(() => {
              inputRef.current?.focus();
              inputRef.current?.setSelectionRange(start - 1, start - 1);
            }, 0);
          } else if (start !== end) {
            const newVal = inputString.substring(0, start) + inputString.substring(end);
            setInputString(newVal);
            setTimeout(() => {
              inputRef.current?.focus();
              inputRef.current?.setSelectionRange(start, start);
            }, 0);
          }
        }
      }
      return;
    }

    if (activeField === 'grammar') {
      if (grammarRef.current) {
        const start = grammarRef.current.selectionStart;
        const end = grammarRef.current.selectionEnd;
        const newValue = grammarText.substring(0, start) + key + grammarText.substring(end);
        setGrammarText(newValue);
        setTimeout(() => {
          grammarRef.current?.focus();
          grammarRef.current?.setSelectionRange(start + key.length, start + key.length);
        }, 0);
      } else {
        setGrammarText(grammarText + key);
      }
    } else {
      if (inputRef.current) {
        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;
        const newValue = inputString.substring(0, start) + key + inputString.substring(end);
        setInputString(newValue);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(start + key.length, start + key.length);
        }, 0);
      } else {
        setInputString(inputString + key);
      }
    }
  };

  const loadExample = (example: GrammarExample) => {
    setGrammarText(example.grammar);
    setInputString(example.input);
    setParserType(example.recommended);
    setShowExamples(false);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Parser Type Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo de Parser</label>
          <span className={`parser-badge ${isTopDown ? 'parser-badge-topdown' : 'parser-badge-bottomup'}`}>
            <Zap className="w-3 h-3" />
            {isTopDown ? 'Top-Down' : 'Bottom-Up'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PARSER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setParserType(opt.value)}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all border ${
                parserType === opt.value
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.06] hover:border-white/10 hover:text-gray-300'
              }`}
            >
              <span className="text-[10px] opacity-60 mr-1">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grammar Input */}
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gramática</label>
          <div className="relative">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              <BookOpen className="w-3 h-3" />
              Ejemplos
              <ChevronDown className={`w-3 h-3 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
            </button>
            {showExamples && (
              <div className="example-dropdown-menu animate-fade-in">
                {GRAMMAR_EXAMPLES.map((ex, idx) => (
                  <div
                    key={idx}
                    className="example-dropdown-item"
                    onClick={() => loadExample(ex)}
                  >
                    <div className="text-sm font-medium text-gray-200">{ex.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{ex.description}</div>
                    <div className="text-[10px] text-indigo-400/60 mt-0.5 font-mono">
                      Recomendado: {ex.recommended.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <textarea
          ref={grammarRef}
          value={grammarText}
          onChange={(e) => setGrammarText(e.target.value)}
          onFocus={() => setActiveField('grammar')}
          className={`flex-1 bg-gray-900/50 border rounded-lg p-3 text-white font-mono text-[13px] outline-none transition-all resize-none min-h-[200px] leading-relaxed ${
            activeField === 'grammar'
              ? 'border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.08)]'
              : 'border-white/10 hover:border-white/15'
          }`}
          placeholder={"E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id"}
        />
      </div>

      {/* Input String */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cadena de Entrada</label>
        <input
          ref={inputRef}
          type="text"
          value={inputString}
          onChange={(e) => setInputString(e.target.value)}
          onFocus={() => setActiveField('input')}
          className={`bg-gray-900/50 border rounded-lg p-3 text-white font-mono text-[13px] outline-none transition-all ${
            activeField === 'input'
              ? 'border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.08)]'
              : 'border-white/10 hover:border-white/15'
          }`}
          placeholder="id + id * id"
        />
      </div>

      {/* Custom Keyboard */}
      <CustomKeyboard
        onKeyPress={handleKeyPress}
        targetLabel={activeField === 'grammar' ? 'Gramática' : 'Cadena'}
      />

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        disabled={isLoading || !grammarText.trim()}
        className="mt-1 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_30px_rgba(99,102,241,0.4)] active:scale-[0.98]"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Play className="w-5 h-5" fill="currentColor" />
        )}
        <span>{isLoading ? 'Analizando...' : 'Analizar Gramática'}</span>
      </button>
    </div>
  );
};
