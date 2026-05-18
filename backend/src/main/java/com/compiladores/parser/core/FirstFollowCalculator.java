package com.compiladores.parser.core;

import com.compiladores.parser.model.Grammar;

import java.util.*;

/**
 * Computes FIRST and FOLLOW sets for a given CFG.
 *
 * Algorithm follows the standard textbook definition (Aho, Lam, Sethi, Ullman).
 */
public class FirstFollowCalculator {

    private final Grammar grammar;
    private final Map<String, Set<String>> firstSets  = new LinkedHashMap<>();
    private final Map<String, Set<String>> followSets = new LinkedHashMap<>();

    public FirstFollowCalculator(Grammar grammar) {
        this.grammar = grammar;
        computeFirst();
        computeFollow();
    }

    // ─────────────────────────────────────────────────
    //  FIRST
    // ─────────────────────────────────────────────────

    /**
     * Computes FIRST(X) for all non-terminals X.
     * FIRST(X) = set of terminals that can begin a string derived from X.
     */
    private void computeFirst() {
        // Initialize empty sets
        for (String nt : grammar.getNonTerminals()) {
            firstSets.put(nt, new LinkedHashSet<>());
        }

        boolean changed = true;
        while (changed) {
            changed = false;
            for (String nt : grammar.getNonTerminals()) {
                for (List<String> rhs : grammar.getProductions(nt)) {
                    Set<String> added = firstOfSequence(rhs);
                    if (firstSets.get(nt).addAll(added)) changed = true;
                }
            }
        }
    }

    /**
     * Returns FIRST of a sequence of symbols (e.g., the RHS of a production).
     */
    public Set<String> firstOfSequence(List<String> symbols) {
        Set<String> result = new LinkedHashSet<>();

        for (String sym : symbols) {
            if (sym.equals(Grammar.EPSILON)) {
                result.add(Grammar.EPSILON);
                break;
            } else if (sym.equals(Grammar.EOF) || grammar.isTerminal(sym)) {
                result.add(sym);
                break;  // terminal does not derive ε
            } else {
                // sym is a non-terminal
                Set<String> firstSym = firstSets.getOrDefault(sym, Set.of());
                result.addAll(firstSym);
                result.remove(Grammar.EPSILON);
                if (!firstSym.contains(Grammar.EPSILON)) {
                    break;  // sym cannot derive ε → stop
                }
                // else continue to next symbol
            }
        }

        // If all symbols can derive ε, add ε to result
        boolean allNullable = symbols.stream().allMatch(s ->
                s.equals(Grammar.EPSILON)
                || (!grammar.isTerminal(s) && firstSets.getOrDefault(s, Set.of()).contains(Grammar.EPSILON))
        );
        if (allNullable) result.add(Grammar.EPSILON);

        return result;
    }

    // ─────────────────────────────────────────────────
    //  FOLLOW
    // ─────────────────────────────────────────────────

    /**
     * Computes FOLLOW(A) for all non-terminals A.
     * FOLLOW(A) = set of terminals that can appear immediately to the right of A.
     */
    private void computeFollow() {
        for (String nt : grammar.getNonTerminals()) {
            followSets.put(nt, new LinkedHashSet<>());
        }
        // Start symbol always has $ in FOLLOW
        followSets.get(grammar.getStartSymbol()).add(Grammar.EOF);

        boolean changed = true;
        while (changed) {
            changed = false;
            for (Map.Entry<String, List<List<String>>> entry : grammar.getAllProductions().entrySet()) {
                String lhs = entry.getKey();
                for (List<String> rhs : entry.getValue()) {
                    for (int i = 0; i < rhs.size(); i++) {
                        String sym = rhs.get(i);
                        if (!grammar.isNonTerminal(sym)) continue;

                        // beta = rhs[i+1 .. end]
                        List<String> beta = rhs.subList(i + 1, rhs.size());

                        Set<String> firstBeta = beta.isEmpty()
                                ? new LinkedHashSet<>(Set.of(Grammar.EPSILON))
                                : firstOfSequence(beta);

                        // Add FIRST(beta) - {ε} to FOLLOW(sym)
                        for (String t : firstBeta) {
                            if (!t.equals(Grammar.EPSILON)) {
                                if (followSets.get(sym).add(t)) changed = true;
                            }
                        }

                        // If ε ∈ FIRST(beta), add FOLLOW(lhs) to FOLLOW(sym)
                        if (firstBeta.contains(Grammar.EPSILON)) {
                            if (followSets.get(sym).addAll(followSets.get(lhs))) changed = true;
                        }
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────────────
    //  Public accessors
    // ─────────────────────────────────────────────────

    public Set<String> getFirst(String nonTerminal) {
        return firstSets.getOrDefault(nonTerminal, Set.of());
    }

    public Set<String> getFollow(String nonTerminal) {
        return followSets.getOrDefault(nonTerminal, Set.of());
    }

    /** Returns all FIRST sets as an ordered map (NT -> sorted list). */
    public Map<String, List<String>> getAllFirstSets() {
        Map<String, List<String>> result = new LinkedHashMap<>();
        firstSets.forEach((k, v) -> result.put(k, new ArrayList<>(v)));
        return result;
    }

    /** Returns all FOLLOW sets as an ordered map (NT -> sorted list). */
    public Map<String, List<String>> getAllFollowSets() {
        Map<String, List<String>> result = new LinkedHashMap<>();
        followSets.forEach((k, v) -> result.put(k, new ArrayList<>(v)));
        return result;
    }
}
