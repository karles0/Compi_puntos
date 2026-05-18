package com.compiladores.parser.core;

import com.compiladores.parser.model.Grammar;

import java.util.*;

/**
 * Parses raw grammar text into a {@link Grammar} object.
 *
 * Supported formats:
 *   E  -> E + T | T          (pipe-separated alternatives on one line)
 *   E  → E + T | T           (arrow variant)
 *   T  ::= T * F | F         (BNF variant)
 *
 * Epsilon can be written as: ε  or  eps  or  epsilon  (case-insensitive)
 */
public class GrammarParser {

    private static final String EPSILON = Grammar.EPSILON;

    /**
     * Parses the given grammar text and returns a {@link Grammar} instance.
     *
     * @param text raw grammar text
     * @return parsed Grammar
     * @throws IllegalArgumentException if the text is empty or malformed
     */
    public static Grammar parse(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Grammar text cannot be empty.");
        }

        Grammar grammar = new Grammar();

        String[] lines = text.split("\\r?\\n");
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("//") || line.startsWith("#")) continue;

            // Split on -> or → or ::=
            String[] parts = line.split("->|→|::=", 2);
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid production rule: '" + rawLine + "'");
            }

            String lhs = parts[0].trim();
            if (lhs.isEmpty()) {
                throw new IllegalArgumentException("Left-hand side cannot be empty in: '" + rawLine + "'");
            }

            // Each alternative separated by |
            String[] alternatives = parts[1].split("\\|");
            for (String alt : alternatives) {
                List<String> rhs = tokenizeRhs(alt.trim());
                grammar.addProduction(lhs, rhs);
            }
        }

        if (grammar.getNonTerminals().isEmpty()) {
            throw new IllegalArgumentException("No valid productions found in grammar text.");
        }

        return grammar;
    }

    /**
     * Tokenizes the right-hand side of a production into a list of symbols.
     * Handles multi-character terminals/non-terminals separated by whitespace.
     * Normalizes epsilon variants to {@link Grammar#EPSILON}.
     */
    private static List<String> tokenizeRhs(String rhs) {
        if (rhs.isEmpty()) return List.of(EPSILON);

        String[] tokens = rhs.trim().split("\\s+");
        List<String> result = new ArrayList<>();
        for (String token : tokens) {
            result.add(normalizeEpsilon(token));
        }
        return result;
    }

    private static String normalizeEpsilon(String token) {
        if (token.equals("ε") || token.equalsIgnoreCase("eps") || token.equalsIgnoreCase("epsilon")) {
            return EPSILON;
        }
        return token;
    }
}
