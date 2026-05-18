package com.compiladores.parser.core.bottomup;

import com.compiladores.parser.model.Grammar;
import com.compiladores.parser.model.LRItem;
import com.compiladores.parser.model.ParseResult;
import com.compiladores.parser.model.ParseResult.*;
import com.compiladores.parser.model.Production;

import java.util.*;

/**
 * Base class for all LR parsers.
 *
 * Provides:
 *  - Production numbering (augmented grammar)
 *  - Closure and GOTO computation for LR(0) items
 *  - State (item-set) construction
 *  - Helper utilities shared by LR(0), SLR(1), LALR(1), LR(1)
 */
public abstract class LRParserBase {

    // ── Augmented grammar data ─────────────────────────────────────────────
    protected Grammar           grammar;
    protected List<Production>  productions;   // numbered, augmented
    protected String            augStart;      // S' (augmented start)

    // ── LR Automaton ───────────────────────────────────────────────────────
    // Each state is a set of LR items
    protected List<Set<LRItem>>         states      = new ArrayList<>();
    // transitions[stateId][symbol] = targetStateId
    protected List<Map<String, Integer>> transitions = new ArrayList<>();

    protected Map<Integer, Map<String, String>>  actionTable;
    protected Map<Integer, Map<String, Integer>> gotoTable;

    // ─────────────────────────────────────────────────
    //  Initialization
    // ─────────────────────────────────────────────────

    /**
     * Augments the grammar (adds S' -> S) and numbers all productions.
     */
    protected void augmentAndNumber(Grammar g) {
        this.grammar = g;
        this.productions = new ArrayList<>();
        String candidate = g.getStartSymbol() + "'";
        while (g.getNonTerminals().contains(candidate)) {
            candidate += "'";
        }
        this.augStart = candidate;

        // Production 0: augStart -> S
        productions.add(new Production(0, augStart, List.of(g.getStartSymbol())));

        int id = 1;
        for (String nt : g.getNonTerminals()) {
            for (List<String> rhs : g.getProductions(nt)) {
                productions.add(new Production(id++, nt, rhs));
            }
        }
    }

    // ─────────────────────────────────────────────────
    //  CLOSURE  (LR(0) items only)
    // ─────────────────────────────────────────────────

    /**
     * Computes the closure of a set of LR(0) items.
     */
    protected Set<LRItem> closure(Set<LRItem> items) {
        Set<LRItem> result = new LinkedHashSet<>(items);
        Queue<LRItem> worklist = new ArrayDeque<>(items);

        while (!worklist.isEmpty()) {
            LRItem item = worklist.poll();
            String B = item.getSymbolAfterDot();
            if (B == null || !grammar.isNonTerminal(B)) continue;

            for (Production prod : productionsFor(B)) {
                LRItem newItem = new LRItem(prod.getLhs(), prod.getRhs(), 0);
                if (result.add(newItem)) worklist.add(newItem);
            }
        }
        return result;
    }

    /**
     * Computes GOTO(I, X) for an LR(0) item set I and symbol X.
     */
    protected Set<LRItem> goto0(Set<LRItem> items, String symbol) {
        Set<LRItem> kernel = new LinkedHashSet<>();
        for (LRItem item : items) {
            if (symbol.equals(item.getSymbolAfterDot())) {
                kernel.add(item.advance());
            }
        }
        return kernel.isEmpty() ? Set.of() : closure(kernel);
    }

    // ─────────────────────────────────────────────────
    //  State construction  (LR(0))
    // ─────────────────────────────────────────────────

    /**
     * Builds the full LR(0) automaton: item sets + transitions.
     * Subclasses may override to build LR(1) automata instead.
     */
    protected void buildLR0Automaton() {
        states.clear();
        transitions.clear();

        // State 0: closure of {S' -> • S}
        Production augProd = productions.get(0);
        LRItem     seed    = new LRItem(augProd.getLhs(), augProd.getRhs(), 0);
        Set<LRItem> s0     = closure(Set.of(seed));

        states.add(s0);
        transitions.add(new LinkedHashMap<>());

        Queue<Integer> worklist = new ArrayDeque<>();
        worklist.add(0);

        while (!worklist.isEmpty()) {
            int idx   = worklist.poll();
            Set<LRItem> state = states.get(idx);

            Set<String> symbols = new LinkedHashSet<>();
            for (LRItem item : state) {
                String sym = item.getSymbolAfterDot();
                if (sym != null) symbols.add(sym);
            }

            for (String sym : symbols) {
                Set<LRItem> next = goto0(state, sym);
                if (next.isEmpty()) continue;

                int targetIdx = findState(next);
                if (targetIdx == -1) {
                    targetIdx = states.size();
                    states.add(next);
                    transitions.add(new LinkedHashMap<>());
                    worklist.add(targetIdx);
                }
                transitions.get(idx).put(sym, targetIdx);
            }
        }
    }

    // ─────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────

    protected List<Production> productionsFor(String nt) {
        List<Production> result = new ArrayList<>();
        for (Production p : productions) {
            if (p.getLhs().equals(nt)) result.add(p);
        }
        return result;
    }

    /**
     * Finds a state index by item-set equality. Returns -1 if not found.
     */
    protected int findState(Set<LRItem> items) {
        for (int i = 0; i < states.size(); i++) {
            if (states.get(i).equals(items)) return i;
        }
        return -1;
    }

    /**
     * Returns the production number for a given LHS and RHS.
     */
    protected int findProductionId(String lhs, List<String> rhs) {
        for (Production p : productions) {
            if (p.getLhs().equals(lhs) && p.getRhs().equals(rhs)) return p.getId();
        }
        return -1;
    }

    /**
     * Formats the entire stack (state/symbol pairs) as a string.
     */
    protected String formatStack(Deque<Integer> stateStack, Deque<String> symbolStack) {
        List<Integer> states = new ArrayList<>(stateStack);
        List<String>  syms   = new ArrayList<>(symbolStack);
        Collections.reverse(states);
        Collections.reverse(syms);

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < states.size(); i++) {
            sb.append(states.get(i));
            if (i < syms.size()) sb.append(" ").append(syms.get(i)).append(" ");
        }
        return sb.toString().trim();
    }

    protected List<String> tokenize(String input) {
        if (input == null || input.isBlank()) return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(input.trim().split("\\s+")));
    }

    // ─────────────────────────────────────────────────
    //  Parse driver (Shared across bottom-up parsers)
    // ─────────────────────────────────────────────────

    protected ParseResult driveParser(String inputStr, ParseResult result) {
        List<String> input = tokenize(inputStr);
        input.add(Grammar.EOF);

        List<ParseStep> steps = new ArrayList<>();
        Deque<Integer>  stateStack  = new ArrayDeque<>();
        Deque<String>   symbolStack = new ArrayDeque<>();
        Deque<ASTNode>  astStack    = new ArrayDeque<>();
        
        stateStack.push(0);
        int ip = 0;

        while (true) {
            int    state   = stateStack.peek();
            String current = input.get(ip);
            String stackStr = formatStack(stateStack, symbolStack);
            String inpStr   = String.join(" ", input.subList(ip, input.size()));

            String action = actionTable.getOrDefault(state, Map.of()).get(current);

            if (action == null) {
                steps.add(new ParseStep(stackStr, inpStr, "ERROR",
                        "No hay acción en ACTION[" + state + "][" + current + "]"));
                result.setAccepted(false);
                String msg = "Error de sintaxis en '" + current + "'";
                if (result.getConflicts() != null && !result.getConflicts().isEmpty()) {
                    msg += "\n\n⚠️ NOTA: La gramática presenta " + result.getConflicts().size() + " conflictos, por lo que no pertenece estrictamente a esta clase de parser.";
                }
                result.setErrorMessage(msg);
                result.setSteps(steps);
                return result;
            }

            if (action.equals("acc")) {
                steps.add(new ParseStep(stackStr, inpStr, "ACCEPT", "Cadena aceptada ✓"));
                result.setAccepted(true);
                if (result.getConflicts() != null && !result.getConflicts().isEmpty()) {
                    result.setErrorMessage("⚠️ ATENCIÓN: La cadena fue aceptada debido a la resolución por defecto (Shift > Reduce), pero la gramática presenta " + result.getConflicts().size() + " conflictos, por lo que NO pertenece estrictamente a esta clase de parser.");
                }
                result.setSteps(steps);
                if (!astStack.isEmpty()) {
                    ASTNode root = astStack.pop();
                    result.setAst(root);
                    List<String> derivation = new ArrayList<>();
                    buildRightmostDerivation(root, derivation);
                    result.setDerivation(derivation);
                }
                return result;
            }

            if (action.startsWith("s")) {
                int nextState = Integer.parseInt(action.substring(1));
                steps.add(new ParseStep(stackStr, inpStr, "SHIFT",
                        "Desplazar '" + current + "', ir a estado " + nextState));
                symbolStack.push(current);
                stateStack.push(nextState);
                astStack.push(new ASTNode(current, true, current, null));
                ip++;
            } else if (action.startsWith("r")) {
                int prodId = Integer.parseInt(action.substring(1));
                Production prod = productions.get(prodId);
                boolean isEpsilon = prod.getRhs().get(0).equals(Grammar.EPSILON);
                int popCount = isEpsilon ? 0 : prod.getRhs().size();

                steps.add(new ParseStep(stackStr, inpStr, "REDUCE",
                        "Reducir por regla " + prodId + ": " + prod));

                List<ASTNode> children = new ArrayList<>();
                for (int i = 0; i < popCount; i++) {
                    stateStack.pop();
                    if (!symbolStack.isEmpty()) symbolStack.pop();
                    if (!astStack.isEmpty()) children.add(0, astStack.pop());
                }
                
                if (isEpsilon) {
                    children.add(new ASTNode(Grammar.EPSILON, true, Grammar.EPSILON, null));
                }

                int topState = stateStack.peek();
                Integer gotoState = gotoTable.getOrDefault(topState, Map.of()).get(prod.getLhs());
                if (gotoState == null) {
                    result.setAccepted(false);
                    result.setErrorMessage("Error en GOTO[" + topState + "][" + prod.getLhs() + "]");
                    result.setSteps(steps);
                    return result;
                }
                symbolStack.push(prod.getLhs());
                stateStack.push(gotoState);
                astStack.push(new ASTNode(prod.getLhs(), false, null, children));
            }
        }
    }

    private void buildRightmostDerivation(ASTNode root, List<String> derivation) {
        List<ASTNode> currentForm = new ArrayList<>();
        currentForm.add(root);
        derivation.add(nodesToString(currentForm));

        while (true) {
            int rightmostNtIdx = -1;
            for (int i = currentForm.size() - 1; i >= 0; i--) {
                ASTNode node = currentForm.get(i);
                if (!node.isTerminal() && node.getChildren() != null && !node.getChildren().isEmpty()) {
                    rightmostNtIdx = i;
                    break;
                }
            }

            if (rightmostNtIdx == -1) break;

            ASTNode ntNode = currentForm.remove(rightmostNtIdx);
            
            List<ASTNode> toInsert = new ArrayList<>();
            for (ASTNode child : ntNode.getChildren()) {
                if (!child.getLabel().equals(Grammar.EPSILON)) {
                    toInsert.add(new ASTNode(child.getLabel(), child.isTerminal(), child.getValue(), child.getChildren()));
                }
            }
            currentForm.addAll(rightmostNtIdx, toInsert);
            
            String formStr = nodesToString(currentForm);
            if (formStr.isEmpty()) formStr = Grammar.EPSILON;
            derivation.add(formStr);
        }
    }

    private String nodesToString(List<ASTNode> nodes) {
        List<String> labels = new ArrayList<>();
        for (ASTNode n : nodes) {
            labels.add(n.getLabel());
        }
        return String.join(" ", labels);
    }

    // ─────────────────────────────────────────────────
    //  Serialization helpers
    // ─────────────────────────────────────────────────

    protected Map<String, Object> serializeTables() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("action", actionTable);
        res.put("goto",   gotoTable);
        res.put("productions", productions.stream().map(p -> p.getId() + ": " + p).toList());
        return res;
    }
}
