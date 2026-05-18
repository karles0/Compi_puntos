package com.compiladores.parser.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Represents a Context-Free Grammar (CFG).
 * Productions are stored as: NonTerminal -> List<List<String>>
 * Each inner List<String> is one alternative (right-hand side).
 * The special symbol "ε" represents epsilon (empty production).
 */
public class Grammar {

    /** Maps each non-terminal to its list of productions (alternatives). */
    private final Map<String, List<List<String>>> productions = new LinkedHashMap<>();

    /** Start symbol of the grammar. */
    private String startSymbol;

    /** Special epsilon symbol. */
    public static final String EPSILON = "ε";

    /** End-of-input marker used in parsing tables. */
    public static final String EOF = "$";

    // ─────────────────────────────────────────────────
    //  Construction helpers
    // ─────────────────────────────────────────────────

    /** Add a production rule.  Creates the NT entry if absent. */
    public void addProduction(String nonTerminal, List<String> rhs) {
        productions.computeIfAbsent(nonTerminal, k -> new ArrayList<>()).add(rhs);
        if (startSymbol == null) {
            startSymbol = nonTerminal;   // first NT seen becomes start symbol
        }
    }

    // ─────────────────────────────────────────────────
    //  Query helpers
    // ─────────────────────────────────────────────────

    public boolean isNonTerminal(String symbol) {
        return productions.containsKey(symbol);
    }

    public boolean isTerminal(String symbol) {
        return !isNonTerminal(symbol) && !symbol.equals(EOF);
    }

    public List<List<String>> getProductions(String nonTerminal) {
        return productions.getOrDefault(nonTerminal, List.of());
    }

    public List<String> getNonTerminals() {
        return new ArrayList<>(productions.keySet());
    }

    public List<String> getTerminals() {
        List<String> terminals = new ArrayList<>();
        for (Map.Entry<String, List<List<String>>> entry : productions.entrySet()) {
            for (List<String> rhs : entry.getValue()) {
                for (String sym : rhs) {
                    if (!sym.equals(EPSILON) && isTerminal(sym) && !terminals.contains(sym)) {
                        terminals.add(sym);
                    }
                }
            }
        }
        return terminals;
    }

    public Map<String, List<List<String>>> getAllProductions() {
        return productions;
    }

    // ─────────────────────────────────────────────────
    //  Getters / Setters
    // ─────────────────────────────────────────────────

    public String getStartSymbol() { return startSymbol; }
    public void setStartSymbol(String startSymbol) { this.startSymbol = startSymbol; }
}
