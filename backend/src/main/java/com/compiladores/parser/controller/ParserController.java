package com.compiladores.parser.controller;

import com.compiladores.parser.model.ParseRequest;
import com.compiladores.parser.model.ParseResult;
import com.compiladores.parser.service.ParserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller exposing all parser endpoints.
 *
 * Base path: /api/parser
 *
 * Endpoints:
 *   POST /api/parser/{type}          — Run a full parse (returns steps, table, AST, automaton)
 *   POST /api/parser/grammar/analyze — Compute FIRST/FOLLOW sets only
 *   POST /api/parser/grammar/validate — Validate grammar syntax and return metadata
 *   GET  /api/parser/health          — Health check
 */
@RestController
@RequestMapping("/parser")
@CrossOrigin(origins = "*")
public class ParserController {

    private final ParserService parserService;

    public ParserController(ParserService parserService) {
        this.parserService = parserService;
    }

    // ─────────────────────────────────────────────────
    //  Parse endpoints
    // ─────────────────────────────────────────────────

    /**
     * Run a full parse with the specified parser type.
     *
     * Path variable {type}: recursive_descent | ll1 | lr0 | slr1 | lalr1 | lr1
     *
     * Example: POST /api/parser/ll1
     * Body: { "grammarText": "E -> E + T | T\nT -> id", "inputString": "id + id" }
     */
    @PostMapping("/{type}")
    public ResponseEntity<?> parse(@PathVariable String type,
                                   @RequestBody ParseRequest request) {
        ParseResult result = parserService.parse(type, request);
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────
    //  Grammar analysis
    // ─────────────────────────────────────────────────

    /**
     * Compute FIRST and FOLLOW sets for the given grammar.
     * Does NOT require an input string.
     */
    @PostMapping("/grammar/analyze")
    public ResponseEntity<?> analyzeGrammar(@RequestBody ParseRequest request) {
        ParseResult result = parserService.analyzeGrammar(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Validate grammar text and return structural metadata.
     * Useful to display NT/Terminal counts before full parsing.
     */
    @PostMapping("/grammar/validate")
    public ResponseEntity<?> validateGrammar(@RequestBody ParseRequest request) {
        Map<String, Object> result = parserService.validateGrammar(request);
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────
    //  Health
    // ─────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "Parser Backend",
                "parsers", "recursive_descent, ll1, lr0, slr1, lalr1, lr1"
        ));
    }
}
