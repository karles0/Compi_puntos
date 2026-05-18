package com.compiladores.parser.core.bottomup;

import com.compiladores.parser.core.FirstFollowCalculator;
import com.compiladores.parser.core.GrammarParser;
import com.compiladores.parser.model.*;
import com.compiladores.parser.model.ParseResult.*;

import java.util.*;

/**
 * SLR(1) Parser.
 *
 * Extends LR(0) by restricting REDUCE entries to terminals in FOLLOW(A).
 * This resolves many LR(0) shift-reduce and reduce-reduce conflicts.
 *
 * Table construction:
 *  - Use the LR(0) automaton (same states).
 *  - REDUCE A -> α  only for terminals a where a ∈ FOLLOW(A).
 */
public class SLR1Parser extends LRParserBase {

    public ParseResult parse(ParseRequest request) {
        grammar = GrammarParser.parse(request.getGrammarText());
        if (request.getStartSymbol() != null && !request.getStartSymbol().isBlank()) {
            grammar.setStartSymbol(request.getStartSymbol().trim());
        }

        augmentAndNumber(grammar);
        buildLR0Automaton();   // reuse LR(0) automaton

        FirstFollowCalculator ff = new FirstFollowCalculator(grammar);
        ParseResult result = new ParseResult();
        buildTables(ff, result);

        result.setFirstSets(ff.getAllFirstSets());
        result.setFollowSets(ff.getAllFollowSets());
        result.setAutomaton(buildAutomatonData());
        result.setTable(serializeTables());

        return driveParser(request.getInputString(), result);
    }

    // ─────────────────────────────────────────────────
    //  Table construction
    // ─────────────────────────────────────────────────

    private void buildTables(FirstFollowCalculator ff, ParseResult result) {
        actionTable = new LinkedHashMap<>();
        gotoTable   = new LinkedHashMap<>();

        for (int i = 0; i < states.size(); i++) {
            actionTable.put(i, new LinkedHashMap<>());
            gotoTable.put(i, new LinkedHashMap<>());
        }

        // Transitions -> shift / goto
        for (int i = 0; i < states.size(); i++) {
            for (Map.Entry<String, Integer> e : transitions.get(i).entrySet()) {
                String sym = e.getKey();
                int    dst = e.getValue();
                if (grammar.isNonTerminal(sym)) {
                    gotoTable.get(i).put(sym, dst);
                } else {
                    actionTable.get(i).put(sym, "s" + dst);
                }
            }
        }

        // Complete items -> reduce (SLR: only on FOLLOW)
        for (int i = 0; i < states.size(); i++) {
            for (LRItem item : states.get(i)) {
                if (!item.isComplete()) continue;

                if (item.getLhs().equals(augStart)) {
                    actionTable.get(i).put(Grammar.EOF, "acc");
                    continue;
                }

                int prodId = findProductionId(item.getLhs(), item.getRhs());
                Set<String> follow = ff.getFollow(item.getLhs());

                for (String t : follow) {
                    String reduceAction = "r" + prodId;
                    String existing = actionTable.get(i).get(t);
                    if (existing != null && !existing.equals(reduceAction)) {
                        String conflictType = existing.startsWith("s") ? "Shift/Reduce" : "Reduce/Reduce";
                        result.getConflicts().add(conflictType + " en estado " + i + " con símbolo '" + t + "' (Acciones: " + existing + " y " + reduceAction + ")");
                        if (!existing.contains(reduceAction)) {
                            actionTable.get(i).put(t, existing + "/" + reduceAction);
                        }
                    } else {
                        actionTable.get(i).put(t, reduceAction);
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
        for (int i = 0; i < states.size(); i++) {
            List<String> itemStrings = new ArrayList<>();
            for (LRItem item : states.get(i)) itemStrings.add(item.toString());
            astStates.add(new AutomatonState(i, itemStrings));
        }
        for (int i = 0; i < transitions.size(); i++) {
            for (Map.Entry<String, Integer> e : transitions.get(i).entrySet()) {
                astTrans.add(new AutomatonTransition(i, e.getValue(), e.getKey()));
            }
        }
        return new AutomatonData(astStates, astTrans);
    }
}
