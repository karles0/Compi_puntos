package com.compiladores.parser.core.topdown;

import com.compiladores.parser.core.FirstFollowCalculator;
import com.compiladores.parser.core.GrammarParser;
import com.compiladores.parser.model.Grammar;
import com.compiladores.parser.model.ParseRequest;
import com.compiladores.parser.model.ParseResult;
import com.compiladores.parser.model.ParseResult.*;

import java.util.*;

/**
 * Recursive Descent (Top-Down) Parser.
 *
 * Simulates a recursive descent parse without actually using Java recursion
 * so we can capture each step clearly. Instead we use an explicit prediction
 * stack and record every expand / match / error action.
 *
 * The parser is LL-style: it uses FIRST sets to choose which production to
 * expand, with no backtracking (it reports an error on ambiguity / mismatch).
 */
public class RecursiveDescentParser {

    /**
     * Parses the given request and returns a {@link ParseResult}.
     */
    public ParseResult parse(ParseRequest request) {
        Grammar grammar = GrammarParser.parse(request.getGrammarText());

        // Override start symbol if provided
        if (request.getStartSymbol() != null && !request.getStartSymbol().isBlank()) {
            grammar.setStartSymbol(request.getStartSymbol().trim());
        }

        FirstFollowCalculator ff = new FirstFollowCalculator(grammar);
        List<String> input = tokenize(request.getInputString());
        input.add(Grammar.EOF);

        ParseResult result = new ParseResult();
        result.setFirstSets(ff.getAllFirstSets());
        result.setFollowSets(ff.getAllFollowSets());

        List<ParseStep> steps = new ArrayList<>();
        List<String> derivation = new ArrayList<>();
        Deque<ASTNode> nodeStack = new ArrayDeque<>();

        // Parse stack: mixture of terminals and non-terminals
        Deque<String> stack = new ArrayDeque<>();
        stack.push(Grammar.EOF);
        stack.push(grammar.getStartSymbol());

        // AST root
        ASTNode root = new ASTNode(grammar.getStartSymbol(), false, null, new ArrayList<>());
        nodeStack.push(root);

        int ip = 0; // input pointer
        int stepCount = 0;
        final int MAX_STEPS = 50;

        derivation.add(grammar.getStartSymbol());

        while (!stack.isEmpty()) {
            if (++stepCount > MAX_STEPS) {
                List<ParseStep> truncatedSteps = new ArrayList<>(steps.subList(0, Math.min(10, steps.size())));
                truncatedSteps.add(new ParseStep("...", "...", "ABORT", "Análisis abortado por bucle infinito"));
                List<String> truncatedDeriv = new ArrayList<>(derivation.subList(0, Math.min(10, derivation.size())));
                truncatedDeriv.add("...");
                return buildError(result, truncatedSteps, truncatedDeriv,
                        "Error: Límite de iteraciones excedido. La gramática podría tener recursión por la izquierda infinita o ser excesivamente ambigua.");
            }
            String top = stack.peek();
            String current = input.get(ip);

            String stackStr = stackToString(stack);
            String inputStr = inputToString(input, ip);

            if (top.equals(Grammar.EOF) && current.equals(Grammar.EOF)) {
                steps.add(new ParseStep(stackStr, inputStr, "ACCEPT", "Cadena aceptada ✓"));
                result.setAccepted(true);
                result.setAst(root);
                result.setDerivation(derivation);
                result.setSteps(steps);
                return result;
            }

            if (top.equals(Grammar.EOF)) {
                steps.add(new ParseStep(stackStr, inputStr, "ERROR",
                        "Fin de pila pero aún hay entrada: '" + current + "'"));
                return buildError(result, steps, derivation,
                        "Error: fin de pila con entrada restante '" + current + "'");
            }

            if (grammar.isTerminal(top)) {
                // Match action
                if (top.equals(current)) {
                    steps.add(new ParseStep(stackStr, inputStr, "MATCH",
                            "Coincidencia de terminal: '" + top + "'"));
                    stack.pop();
                    if (!nodeStack.isEmpty()) {
                        ASTNode node = nodeStack.pop();
                        // mark as matched terminal
                    }
                    ip++;
                } else {
                    steps.add(new ParseStep(stackStr, inputStr, "ERROR",
                            "Se esperaba '" + top + "' pero se encontró '" + current + "'"));
                    return buildError(result, steps, derivation,
                            "Error de sintaxis: se esperaba '" + top + "', se encontró '" + current + "'");
                }
            } else {
                // Non-terminal: predict production using FIRST sets
                List<String> chosen = predictProduction(grammar, ff, top, current);

                if (chosen == null) {
                    steps.add(new ParseStep(stackStr, inputStr, "ERROR",
                            "No hay producción para '" + top + "' con lookahead '" + current + "'"));
                    return buildError(result, steps, derivation,
                            "Error: sin producción para " + top + " con lookahead '" + current + "'");
                }

                String productionStr = top + " → " + String.join(" ", chosen);
                steps.add(new ParseStep(stackStr, inputStr, "EXPAND", productionStr));

                stack.pop();
                ASTNode parent = nodeStack.pop();
                
                if (!chosen.get(0).equals(Grammar.EPSILON)) {
                    List<ASTNode> children = new ArrayList<>();
                    for (int i = chosen.size() - 1; i >= 0; i--) {
                        String sym = chosen.get(i);
                        boolean isTerm = grammar.isTerminal(sym);
                        ASTNode child = new ASTNode(sym, isTerm, isTerm ? sym : null,
                                isTerm ? null : new ArrayList<>());
                        children.add(0, child);
                        stack.push(sym);
                        nodeStack.push(child);
                    }
                    if (parent != null && parent.getChildren() != null) {
                        parent.getChildren().addAll(children);
                    }
                } else {
                    steps.add(new ParseStep(stackStr, inputStr, "EPSILON",
                            top + " deriva en ε (vacío)"));
                }

                // Update derivation
                derivation.add(deriveCurrentForm(stack, input, ip));
            }
        }

        // If we reach here, something went wrong
        return buildError(result, steps, derivation, "Error: pila vacía sin aceptar.");
    }

    // ─────────────────────────────────────────────────
    // Prediction logic
    // ─────────────────────────────────────────────────

    /**
     * Chooses a production for the non-terminal {@code nt} given the current
     * lookahead {@code lookahead} using FIRST (and FOLLOW for ε-productions).
     */
    private List<String> predictProduction(Grammar g, FirstFollowCalculator ff,
            String nt, String lookahead) {
        for (List<String> rhs : g.getProductions(nt)) {
            Set<String> first = ff.firstOfSequence(rhs);
            if (first.contains(lookahead))
                return rhs;
            if (first.contains(Grammar.EPSILON) && ff.getFollow(nt).contains(lookahead)) {
                return rhs;
            }
        }
        return null;
    }

    // ─────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────

    private List<String> tokenize(String input) {
        if (input == null || input.isBlank())
            return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(input.trim().split("\\s+")));
    }

    private String stackToString(Deque<String> stack) {
        List<String> list = new ArrayList<>(stack);
        Collections.reverse(list);
        return String.join(" ", list);
    }

    private String inputToString(List<String> input, int ip) {
        return String.join(" ", input.subList(ip, input.size()));
    }

    /**
     * Construye la forma sentencial actual de la derivación por la izquierda:
     *   [terminales ya consumidos]  +  [contenido de la pila, del tope al fondo, sin EOF]
     *
     * Antes este método solo mostraba la pila invertida (sin terminales matched
     * y con el tope a la derecha), por eso la "derivación" no coincidía con la
     * derivación por la izquierda estándar.
     */
    private String deriveCurrentForm(Deque<String> stack, List<String> input, int ip) {
        StringBuilder sb = new StringBuilder();

        // 1) Terminales ya consumidos (prefijo emitido de la entrada)
        for (int i = 0; i < ip; i++) {
            String tok = input.get(i);
            if (tok.equals(Grammar.EOF)) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(tok);
        }

        // 2) Símbolos pendientes en la pila: tope -> fondo (omitiendo EOF).
        //    En ArrayDeque, iterar es head -> tail, es decir, tope -> fondo,
        //    que es justo el orden en que aparecen en la forma sentencial.
        for (String s : stack) {
            if (s.equals(Grammar.EOF)) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(s);
        }

        return sb.toString();
    }

    private ASTNode findOrCreateParent(ASTNode root, String label) {
        // Simple DFS to find the rightmost non-terminal node with given label
        // that has no children yet (i.e., not yet expanded)
        return findLeafNT(root, label);
    }

    private ASTNode findLeafNT(ASTNode node, String label) {
        if (!node.isTerminal() && node.getLabel().equals(label)
                && (node.getChildren() == null || node.getChildren().isEmpty())) {
            return node;
        }
        if (node.getChildren() != null) {
            for (ASTNode child : node.getChildren()) {
                ASTNode found = findLeafNT(child, label);
                if (found != null)
                    return found;
            }
        }
        return null;
    }

    private ParseResult buildError(ParseResult result, List<ParseStep> steps,
            List<String> derivation, String msg) {
        result.setAccepted(false);
        result.setErrorMessage(msg);
        result.setSteps(steps);
        result.setDerivation(derivation);
        return result;
    }
}
