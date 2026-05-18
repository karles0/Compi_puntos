export interface ParseStep {
  stack: string;
  input: string;
  action: string;
  description: string;
}

export interface AutomatonState {
  id: number;
  items: string[];
}

export interface AutomatonTransition {
  from: number;
  to: number;
  symbol: string;
}

export interface AutomatonData {
  states: AutomatonState[];
  transitions: AutomatonTransition[];
}

export interface ASTNode {
  label: string;
  terminal: boolean;
  value: string | null;
  children: ASTNode[] | null;
}

export interface ParseResult {
  accepted: boolean;
  errorMessage: string | null;
  steps: ParseStep[];
  table: any; // Dynamic table
  ast: ASTNode | null;
  derivation: string[] | null;
  automaton: AutomatonData | null;
  firstSets: Record<string, string[]> | null;
  followSets: Record<string, string[]> | null;
  conflicts: string[];
}
