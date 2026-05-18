package com.compiladores.parser.core.bottomup;

import com.compiladores.parser.core.FirstFollowCalculator;
import com.compiladores.parser.core.GrammarParser;
import com.compiladores.parser.model.*;
import com.compiladores.parser.model.ParseResult.*;

import java.util.*;

/**
 * LALR(1) Parser.
 *
 * Strategy: Build the canonical LR(1) automaton, then MERGE states that
 * have the same LR(0) core (same items ignoring lookaheads).
 * The merged states keep the union of lookahead sets.
 *
 * This produces fewer states than canonical LR(1) while still being more
 * powerful than SLR(1).
 */
public class LALR1Parser extends LRParserBase {

    // Intermediate LR(1) structures (before merging)
    private List<Set<LRItem>>          lr1States      = new ArrayList<>();
    private List<Map<String, Integer>> lr1Transitions = new ArrayList<>();

    // After merging: LALR states
    private List<Set<LRItem>>          lalrStates      = new ArrayList<>();
    private List<Map<String, Integer>> lalrTransitions = new ArrayList<>();

    // Maps LR(1) state index -> LALR state index
    private Map<Integer, Integer> stateMap = new HashMap<>();

    public ParseResult parse(ParseRequest request) {
        grammar = GrammarParser.parse(request.getGrammarText());
        if (request.getStartSymbol() != null && !request.getStartSymbol().isBlank()) {
            grammar.setStartSymbol(request.getStartSymbol().trim());
        }

        augmentAndNumber(grammar);
        FirstFollowCalculator ff = new FirstFollowCalculator(grammar);

        ParseResult result = new ParseResult();

        buildLR1Automaton(ff);
        mergeLALR();
        buildTables(result);

        result.setFirstSets(ff.getAllFirstSets());
        result.setFollowSets(ff.getAllFollowSets());
        result.setAutomaton(buildAutomatonData());
        result.setTable(serializeTables());

        return driveParser(request.getInputString(), result);
    }

    // ─────────────────────────────────────────────────
    //  LR(1) Automaton (reused from LR1Parser logic)
    // ─────────────────────────────────────────────────

    private void buildLR1Automaton(FirstFollowCalculator ff) {
        lr1States.clear();
        lr1Transitions.clear();
        lalrStates.clear();
        lalrTransitions.clear();
        stateMap.clear();

        Production augProd = productions.get(0);
        LRItem seed = new LRItem(augProd.getLhs(), augProd.getRhs(), 0, new LinkedHashSet<>(Set.of(Grammar.EOF)));
        Set<LRItem> s0 = lr1Closure(new LinkedHashSet<>(Set.of(seed)), ff);

        lr1States.add(s0);
        lr1Transitions.add(new LinkedHashMap<>());

        Queue<Integer> worklist = new ArrayDeque<>();
        worklist.add(0);

        while (!worklist.isEmpty()) {
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

    private Set<LRItem> lr1Closure(Set<LRItem> items, FirstFollowCalculator ff) {
        Set<LRItem> result = new LinkedHashSet<>(items);
        Queue<LRItem> worklist = new ArrayDeque<>(items);

        while (!worklist.isEmpty()) {
            LRItem item = worklist.poll();
            String B = item.getSymbolAfterDot();
            if (B == null || !grammar.isNonTerminal(B)) continue;

            List<String> beta = item.getRhs().subList(item.getDotPos() + 1, item.getRhs().size());

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
            if (lr1States.get(i).size() != items.size()) continue;
            for (LRItem item : items) {
                if (!lr1States.get(i).contains(item)) continue outer;
            }
            return i;
        }
        return -1;
    }

    // ─────────────────────────────────────────────────
    //  LALR Merging
    // ─────────────────────────────────────────────────

    /**
     * Groups LR(1) states by their LR(0) core and merges lookaheads.
     */
    private void mergeLALR() {
        // Group states by core (items ignoring lookaheads)
        Map<String, List<Integer>> coreGroups = new LinkedHashMap<>();
        for (int i = 0; i < lr1States.size(); i++) {
            String core = computeCore(lr1States.get(i));
            coreGroups.computeIfAbsent(core, k -> new ArrayList<>()).add(i);
        }

        // Build LALR states
        Map<Integer, Integer> lr1ToLalr = new HashMap<>();
        int lalrIdx = 0;
        for (List<Integer> group : coreGroups.values()) {
            // Merge all states in the group
            Set<LRItem> merged = mergeStates(group);
            lalrStates.add(merged);
            lalrTransitions.add(new LinkedHashMap<>());
            for (int lr1Idx : group) {
                lr1ToLalr.put(lr1Idx, lalrIdx);
            }
            lalrIdx++;
        }

        // Rebuild transitions
        for (int i = 0; i < lr1States.size(); i++) {
            int lalrFrom = lr1ToLalr.get(i);
            for (Map.Entry<String, Integer> e : lr1Transitions.get(i).entrySet()) {
                int lalrTo = lr1ToLalr.get(e.getValue());
                lalrTransitions.get(lalrFrom).put(e.getKey(), lalrTo);
            }
        }

        stateMap = lr1ToLalr;
    }

    private String computeCore(Set<LRItem> items) {
        List<String> cores = new ArrayList<>();
        for (LRItem item : items) {
            cores.add(item.getLhs() + "->" + item.getRhs() + "," + item.getDotPos());
        }
        Collections.sort(cores);
        return String.join("|", cores);
    }

    private Set<LRItem> mergeStates(List<Integer> indices) {
        // Collect all items and merge lookaheads for items with same core
        Map<String, LRItem> coreMap = new LinkedHashMap<>();
        for (int idx : indices) {
            for (LRItem item : lr1States.get(idx)) {
                String key = item.getLhs() + "|" + item.getRhs() + "|" + item.getDotPos();
                if (!coreMap.containsKey(key)) {
                    coreMap.put(key, new LRItem(item.getLhs(), item.getRhs(), item.getDotPos(),
                            new LinkedHashSet<>(item.getLookaheads() == null ? Set.of() : item.getLookaheads())));
                } else {
                    if (item.getLookaheads() != null) {
                        coreMap.get(key).getLookaheads().addAll(item.getLookaheads());
                    }
                }
            }
        }
        return new LinkedHashSet<>(coreMap.values());
    }

    // ─────────────────────────────────────────────────
    //  Table construction
    // ─────────────────────────────────────────────────

    private void buildTables(ParseResult result) {
        actionTable = new LinkedHashMap<>();
        gotoTable   = new LinkedHashMap<>();

        for (int i = 0; i < lalrStates.size(); i++) {
            actionTable.put(i, new LinkedHashMap<>());
            gotoTable.put(i, new LinkedHashMap<>());
        }

        for (int i = 0; i < lalrStates.size(); i++) {
            for (Map.Entry<String, Integer> e : lalrTransitions.get(i).entrySet()) {
                String sym = e.getKey();
                int    dst = e.getValue();
                if (grammar.isNonTerminal(sym)) {
                    gotoTable.get(i).put(sym, dst);
                } else {
                    actionTable.get(i).put(sym, "s" + dst);
                }
            }
        }

        for (int i = 0; i < lalrStates.size(); i++) {
            for (LRItem item : lalrStates.get(i)) {
                if (!item.isComplete()) continue;

                if (item.getLhs().equals(augStart)) {
                    actionTable.get(i).put(Grammar.EOF, "acc");
                    continue;
                }

                int prodId = findProductionId(item.getLhs(), item.getRhs());
                if (item.getLookaheads() != null) {
                    for (String la : item.getLookaheads()) {
                        String reduceAction = "r" + prodId;
                        String existing = actionTable.get(i).get(la);
                        if (existing != null && !existing.equals(reduceAction)) {
                            String conflictType = existing.startsWith("s") ? "Shift/Reduce" : "Reduce/Reduce";
                            result.getConflicts().add(conflictType + " en estado " + i + " con símbolo '" + la + "' (Acciones: " + existing + " y " + reduceAction + ")");
                        } else {
                            actionTable.get(i).put(la, reduceAction);
                        }
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
        for (int i = 0; i < lalrStates.size(); i++) {
            List<String> itemStrings = lalrStates.get(i).stream()
                    .map(LRItem::toString).toList();
            astStates.add(new AutomatonState(i, itemStrings));
        }
        for (int i = 0; i < lalrTransitions.size(); i++) {
            for (Map.Entry<String, Integer> e : lalrTransitions.get(i).entrySet()) {
                astTrans.add(new AutomatonTransition(i, e.getValue(), e.getKey()));
            }
        }
        return new AutomatonData(astStates, astTrans);
    }
}
