package com.compiladores.parser.service;

import com.compiladores.parser.core.FirstFollowCalculator;
import com.compiladores.parser.core.GrammarParser;
import com.compiladores.parser.core.bottomup.*;
import com.compiladores.parser.core.topdown.LL1Parser;
import com.compiladores.parser.core.topdown.RecursiveDescentParser;
import com.compiladores.parser.model.*;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Orchestration service for all parser operations.
 * Delegates to the appropriate parser class based on the requested type.
 */
@Service
public class ParserService {

    // Top-Down
    private final RecursiveDescentParser recursiveDescentParser = new RecursiveDescentParser();
    private final LL1Parser              ll1Parser              = new LL1Parser();

    // Bottom-Up
    private final LR0Parser   lr0Parser   = new LR0Parser();
    private final SLR1Parser  slr1Parser  = new SLR1Parser();
    private final LALR1Parser lalr1Parser = new LALR1Parser();
    private final LR1Parser   lr1Parser   = new LR1Parser();

    // ─────────────────────────────────────────────────
    //  Dispatcher
    // ─────────────────────────────────────────────────

    /**
     * Dispatches a parse request to the correct parser.
     *
     * @param parserType one of: recursive_descent, ll1, lr0, slr1, lalr1, lr1
     * @param request    the grammar + input string request
     * @return ParseResult with steps, table, AST, automaton, etc.
     */
    public ParseResult parse(String parserType, ParseRequest request) {
        return switch (parserType.toLowerCase().trim()) {
            case "recursive_descent", "rd" -> recursiveDescentParser.parse(request);
            case "ll1"                      -> ll1Parser.parse(request);
            case "lr0"                      -> lr0Parser.parse(request);
            case "slr1", "slr"             -> slr1Parser.parse(request);
            case "lalr1", "lalr"           -> lalr1Parser.parse(request);
            case "lr1"                      -> lr1Parser.parse(request);
            default -> throw new IllegalArgumentException(
                    "Tipo de parser desconocido: '" + parserType + "'. " +
                    "Valores válidos: recursive_descent, ll1, lr0, slr1, lalr1, lr1");
        };
    }

    // ─────────────────────────────────────────────────
    //  Grammar analysis (FIRST / FOLLOW only)
    // ─────────────────────────────────────────────────

    /**
     * Parses the grammar and returns only FIRST and FOLLOW sets.
     * Useful for the frontend to display sets before running a full parse.
     */
    public ParseResult analyzeGrammar(ParseRequest request) {
        Grammar grammar = GrammarParser.parse(request.getGrammarText());
        if (request.getStartSymbol() != null && !request.getStartSymbol().isBlank()) {
            grammar.setStartSymbol(request.getStartSymbol().trim());
        }

        FirstFollowCalculator ff = new FirstFollowCalculator(grammar);

        ParseResult result = new ParseResult();
        result.setFirstSets(ff.getAllFirstSets());
        result.setFollowSets(ff.getAllFollowSets());
        result.setAccepted(true);
        return result;
    }

    // ─────────────────────────────────────────────────
    //  Grammar validation
    // ─────────────────────────────────────────────────

    /**
     * Validates grammar text and returns structured info about the grammar:
     * terminals, non-terminals, productions list.
     */
    public Map<String, Object> validateGrammar(ParseRequest request) {
        Grammar grammar = GrammarParser.parse(request.getGrammarText());
        return Map.of(
                "valid",           true,
                "startSymbol",     grammar.getStartSymbol(),
                "nonTerminals",    grammar.getNonTerminals(),
                "terminals",       grammar.getTerminals(),
                "productionCount", grammar.getAllProductions().values().stream()
                        .mapToInt(java.util.List::size).sum()
        );
    }
}
