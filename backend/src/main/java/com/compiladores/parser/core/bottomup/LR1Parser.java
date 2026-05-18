package com.compiladores.parser.core.bottomup;

import com.compiladores.parser.core.FirstFollowCalculator;
import com.compiladores.parser.core.GrammarParser;
import com.compiladores.parser.model.*;
import com.compiladores.parser.model.ParseResult.*;

import java.util.*;

/**
 * Canonical LR(1) Parser.
 *
 * Builds the LR(1) automaton using LR(1) items (with lookahead sets).
 * Each state is a set of LR(1) items  [A -> α • β, a].
 *
 * This is the most powerful of the LR parsers; it can handle every
 * deterministic CFL. The trade-off is potentially very many states.
 */
public class LR1Parser extends LRParserBase {



    // LR(1) states are sets of LR(1) items (with lookaheads)
    private List<Set<LRItem>> lr1States = new ArrayList<>();
    private List<Map<String, Integer>> lr1Transitions = new ArrayList<>();

    public ParseResult parse(ParseRequest request) {
        grammar = GrammarParser.parse(request.getGrammarText());
        if (request.getStartSymbol() != null && !request.getStartSymbol().isBlank()) {
            grammar.setStartSymbol(request.getStartSymbol().trim());
        }

        augmentAndNumber(grammar);
        FirstFollowCalculator ff = new FirstFollowCalculator(grammar);

        ParseResult result = new ParseResult();

        buildLR1Automaton(ff);
        buildTables(result);

        result.setFirstSets(ff.getAllFirstSets());
        result.setFollowSets(ff.getAllFollowSets());
        result.setAutomaton(buildAutomatonData());
        result.setTable(serializeTables());

        return driveParser(request.getInputString(), result);
    }

    // ─────────────────────────────────────────────────
    //  LR(1) Automaton
    // ─────────────────────────────────────────────────

    private void buildLR1Automaton(FirstFollowCalculator ff) {
        lr1States.clear();
        lr1Transitions.clear();

        // Seed item: [S' -> • S, $]
        Production augProd = productions.get(0);
        LRItem seed = new LRItem(augProd.getLhs(), augProd.getRhs(), 0, new LinkedHashSet<>(Set.of(Grammar.EOF)));
        Set<LRItem> s0 = lr1Closure(Set.of(seed), ff);

        lr1States.add(s0);
        lr1Transitions.add(new LinkedHashMap<>());

        Queue<Integer> worklist = new ArrayDeque<>();
        worklist.add(0);

        int stateLoopCount = 0;
        while (!worklist.isEmpty()) {
            stateLoopCount++;
            if (stateLoopCount % 50 == 0) {
                System.out.println("[LR1 Debug] buildLR1Automaton loops: " + stateLoopCount + ", lr1States size: " + lr1States.size() + ", worklist size: " + worklist.size());
            }

            int idx = worklist.poll();
            Set<LRItem> state = lr1States.get(idx);

            Set<String> symbols = new LinkedHashSet<>();
            for (LRItem item : state) {
                String sym = item.getSymbolAfterDot();
                if (sym != null) symbols.add(sym);
            }

            for (String sym : symbols) {
                Set<LRItem> next = lr1Goto(state, sym, ff);
                if (next.isEmpty()) continue;

                int targetIdx = findLR1State(next);
                if (targetIdx == -1) {
                    targetIdx = lr1States.size();
                    lr1States.add(next);
                    lr1Transitions.add(new LinkedHashMap<>());
                    worklist.add(targetIdx);
                }
                lr1Transitions.get(idx).put(sym, targetIdx);
            }
        }
    }

    /**
     * LR(1) closure: propagates lookaheads through epsilon productions.
     */
    private Set<LRItem> lr1Closure(Set<LRItem> items, FirstFollowCalculator ff) {
        Set<LRItem> result = new LinkedHashSet<>(items);
        Queue<LRItem> worklist = new ArrayDeque<>(items);

        int closureLoopCount = 0;
        while (!worklist.isEmpty()) {
            closureLoopCount++;
            if (closureLoopCount > 10000) {
                System.out.println("[LR1 Debug] ERROR: lr1Closure is likely infinite looping! items size: " + result.size());
                break; // break to avoid hanging the entire server
            }

            LRItem item = worklist.poll();
            String B = item.getSymbolAfterDot();
            if (B == null || !grammar.isNonTerminal(B)) continue;

            // beta = symbols after B in the item
            List<String> rhs   = item.getRhs();
            int          bPos  = item.getDotPos() + 1;
            List<String> beta  = rhs.subList(bPos, rhs.size());

            for (LRItem la : item.getLookaheads() != null
                    ? item.getLookaheads().stream().map(t -> {
                        List<String> seq = new ArrayList<>(beta);
                        seq.add(t);
                        return new Object[]{ ff.firstOfSequence(seq) };
                    }).map(o -> new LRItem("", List.of(), 0, Set.of()) { // dummy lambda trick
                    }).toList()
                    : List.<LRItem>of()) {
                // handled below
            }

            // Compute FIRST(beta a) for each lookahead a
            Set<String> newLookaheads = new LinkedHashSet<>();
            for (String a : item.getLookaheads() == null ? Set.of(Grammar.EOF) : item.getLookaheads()) {
                List<String> seq = new ArrayList<>(beta);
                seq.add(a);
                Set<String> first = ff.firstOfSequence(seq);
                for (String t : first) {
                    if (!t.equals(Grammar.EPSILON)) newLookaheads.add(t);
                }
                if (first.contains(Grammar.EPSILON)) newLookaheads.add(a);
            }

            for (Production prod : productionsFor(B)) {
                LRItem newItem = new LRItem(prod.getLhs(), prod.getRhs(), 0,
                        new LinkedHashSet<>(newLookaheads));

                // Merge lookaheads if item (ignoring lookaheads) already exists
                boolean added = mergeOrAdd(result, newItem);
                if (added) worklist.add(newItem);
            }
        }
        return result;
    }

    private boolean mergeOrAdd(Set<LRItem> set, LRItem newItem) {
        for (LRItem existing : set) {
            if (existing.getLhs().equals(newItem.getLhs())
                    && existing.getRhs().equals(newItem.getRhs())
                    && existing.getDotPos() == newItem.getDotPos()) {
                // merge lookaheads
                return existing.getLookaheads().addAll(newItem.getLookaheads());
            }
        }
        return set.add(newItem);
    }

    private Set<LRItem> lr1Goto(Set<LRItem> items, String symbol, FirstFollowCalculator ff) {
        Set<LRItem> kernel = new LinkedHashSet<>();
        for (LRItem item : items) {
            if (symbol.equals(item.getSymbolAfterDot())) {
                kernel.add(item.advance());
            }
        }
        return kernel.isEmpty() ? Set.of() : lr1Closure(kernel, ff);
    }

    private int findLR1State(Set<LRItem> items) {
        outer:
        for (int i = 0; i < lr1States.size(); i++) {
            Set<LRItem> state = lr1States.get(i);
            if (state.size() != items.size()) continue;
            for (LRItem item : items) {
                if (!state.contains(item)) continue outer;
            }
            return i;
        }
        return -1;
    }

    // ─────────────────────────────────────────────────
    //  Table construction
    // ─────────────────────────────────────────────────

    private void buildTables(ParseResult result) {
        actionTable = new LinkedHashMap<>();
        gotoTable   = new LinkedHashMap<>();

        for (int i = 0; i < lr1States.size(); i++) {
            actionTable.put(i, new LinkedHashMap<>());
            gotoTable.put(i, new LinkedHashMap<>());
        }

        for (int i = 0; i < lr1States.size(); i++) {
            for (Map.Entry<String, Integer> e : lr1Transitions.get(i).entrySet()) {
                String sym = e.getKey();
                int    dst = e.getValue();
                if (grammar.isNonTerminal(sym)) {
                    gotoTable.get(i).put(sym, dst);
                } else {
                    actionTable.get(i).put(sym, "s" + dst);
                }
            }
        }

        for (int i = 0; i < lr1States.size(); i++) {
            for (LRItem item : lr1States.get(i)) {
                if (!item.isComplete()) continue;

                if (item.getLhs().equals(augStart)) {
                    actionTable.get(i).put(Grammar.EOF, "acc");
                    continue;
                }

                int prodId = findProductionId(item.getLhs(), item.getRhs());
                for (String la : item.getLookaheads()) {
                    String reduceAction = "r" + prodId;
                    String existing = actionTable.get(i).get(la);
                    if (existing != null && !existing.equals(reduceAction)) {
                        String conflictType = existing.startsWith("s") ? "Shift/Reduce" : "Reduce/Reduce";
                        result.getConflicts().add(conflictType + " en estado " + i + " con símbolo '" + la + "' (Acciones: " + existing + " y " + reduceAction + ")");
                        if (!existing.contains(reduceAction)) {
                            actionTable.get(i).put(la, existing + "/" + reduceAction);
                        }
                    } else {
                        actionTable.get(i).put(la, reduceAction);
                    }
                }
            }
        }
    }



    // ─────────────────────────────────────────────────
    //  Serialization helpers
    // ─────────────────────────────────────────────────

    private AutomatonData buildAutomatonData() {
        List<AutomatonState>      astStates = new ArrayList<>();
        List<AutomatonTransition> astTrans  = new ArrayList<>();
        for (int i = 0; i < lr1States.size(); i++) {
            List<String> itemStrings = lr1States.get(i).stream()
                    .map(LRItem::toString).toList();
            astStates.add(new AutomatonState(i, itemStrings));
        }
        for (int i = 0; i < lr1Transitions.size(); i++) {
            for (Map.Entry<String, Integer> e : lr1Transitions.get(i).entrySet()) {
                astTrans.add(new AutomatonTransition(i, e.getValue(), e.getKey()));
            }
        }
        return new AutomatonData(astStates, astTrans);
    }
}
