import { useState } from 'react';
import axios from 'axios';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import type { HistoryEntry } from './components/HistoryPanel';
import type { ParseResult } from './types';
import './App.css';

function App() {
  const [grammarText, setGrammarText]   = useState("E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id");
  const [inputString, setInputString]   = useState("id + id * id");
  const [parserType, setParserType]     = useState("ll1");
  const [result, setResult]             = useState<ParseResult | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [history, setHistory]           = useState<HistoryEntry[]>([]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
      const response = await axios.post(
        `${apiUrl}/parser/${parserType}`,
        { grammarText, inputString }
      );
      const data: ParseResult = response.data;
      setResult(data);

      // Push to history
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        grammar: grammarText,
        input: inputString,
        parserType,
        accepted: data.accepted,
        hasConflicts: (data.conflicts?.length ?? 0) > 0,
        conflictCount: data.conflicts?.length ?? 0,
      };
      setHistory(prev => [entry, ...prev].slice(0, 50)); // keep last 50

    } catch (error: any) {
      console.error(error);
      const errResult: ParseResult = {
        accepted: false,
        errorMessage:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Error de conexión con el backend.',
        steps: [],
        table: null,
        ast: null,
        derivation: null,
        automaton: null,
        firstSets: null,
        followSets: null,
        conflicts: [],
      };
      setResult(errResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = (entry: HistoryEntry) => {
    setGrammarText(entry.grammar);
    setInputString(entry.input);
    setParserType(entry.parserType);
  };

  return (
    <div className="app-container">
      <div className="left-panel">
        {/* Header */}
        <div className="header glass-panel p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h1>Syntax Parser Studio</h1>
            </div>
          </div>
          <p>Herramienta interactiva para análisis sintáctico: Descenso Recursivo, LL(1), LR(0), SLR(1), LALR(1) y LR(1).</p>
        </div>

        {/* Input Panel */}
        <div className="glass-panel p-5 flex-1 flex flex-col">
          <InputPanel
            grammarText={grammarText}
            setGrammarText={setGrammarText}
            inputString={inputString}
            setInputString={setInputString}
            parserType={parserType}
            setParserType={setParserType}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
          />
        </div>

        {/* History Panel */}
        <HistoryPanel
          entries={history}
          onRestore={handleRestore}
          onClear={() => setHistory([])}
        />
      </div>

      <div className="right-panel">
        <ResultsPanel result={result} parserType={parserType} />
      </div>
    </div>
  );
}

export default App;
