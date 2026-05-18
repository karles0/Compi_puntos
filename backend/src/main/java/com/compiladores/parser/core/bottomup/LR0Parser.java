package com.compiladores.parser.core.bottomup;

import com.compiladores.parser.core.FirstFollowCalculator;
import com.compiladores.parser.core.GrammarParser;
import com.compiladores.parser.model.*;
import com.compiladores.parser.model.ParseResult.*;

import java.util.*;

/**
 * LR(0) Parser.
 *
 * Builds the LR(0) automaton and ACTION/GOTO tables.
 * ACTION rules (no lookahead):
 *   - Shift  on any terminal when the item has a dot before that terminal.
 *   - Reduce on any terminal/EOF when item is complete.
 *   - Accept when state contains  S' -> S •  and lookahead is $.
 *
 * Conflicts (shift-reduce, reduce-reduce) are reported.
 */
public class LR0Parser extends LRParserBase {

    public ParseResult parse(ParseRequest request) {
        grammar = GrammarParser.parse(request.getGrammarText());
        if (request.getStartSymbol() != null && !request.getStartSymbol().isBlank()) {
            grammar.setStartSymbol(request.getStartSymbol().trim());
        }

        augmentAndNumber(grammar);
        buildLR0Automaton();
        FirstFollowCalculator ff = new FirstFollowCalculator(grammar);
        
        ParseResult result = new ParseResult();
        buildTables(result);

        result.setFirstSets(ff.getAllFirstSets());
        result.setFollowSets(ff.getAllFollowSets());
        result.setAutomaton(buildAutomatonData());
        result.setTable(serializeTables());

        return driveParser(request.getInputString(), result);
    }

    // ─────────────────────────────────────────────────
    //  Table construction
    // ─────────────────────────────────────────────────

    private void buildTables(ParseResult result) {
        actionTable = new LinkedHashMap<>();
        gotoTable   = new LinkedHashMap<>();

        for (int i = 0; i < states.size(); i++) {
            actionTable.put(i, new LinkedHashMap<>());
            gotoTable.put(i, new LinkedHashMap<>());
        }

        // GOTO entries from automaton transitions
        for (int i = 0; i < states.size(); i++) {
            for (Map.Entry<String, Integer> e : transitions.get(i).entrySet()) {
                String sym = e.getKey();
                int    dst = e.getValue();
                if (grammar.isNonTerminal(sym)) {
                    gotoTable.get(i).put(sym, dst);
                } else {
                    // Shift
                    actionTable.get(i).put(sym, "s" + dst);
                }
            }
        }

        // Reduce / Accept from complete items
        for (int i = 0; i < states.size(); i++) {
            for (LRItem item : states.get(i)) {
                if (!item.isComplete()) continue;

                if (item.getLhs().equals(augStart)) {
                    // Accept
                    actionTable.get(i).put(Grammar.EOF, "acc");
                } else {
                    int prodId = findProductionId(item.getLhs(), item.getRhs());
                    String reduceAction = "r" + prodId;
                    // LR(0): reduce on ALL terminals and EOF
                    List<String> allTerminals = new ArrayList<>(grammar.getTerminals());
                    allTerminals.add(Grammar.EOF);
                    for (String t : allTerminals) {
                        // Check for conflict
                        String existing = actionTable.get(i).get(t);
                        if (existing != null && !existing.equals(reduceAction)) {
                            String conflictType = existing.startsWith("s") ? "Shift/Reduce" : "Reduce/Reduce";
                            result.getConflicts().add(conflictType + " en estado " + i + " con símbolo '" + t + "' (Acciones: " + existing + " y " + reduceAction + ")");
                        } else {
                            actionTable.get(i).put(t, reduceAction);
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
