package com.compiladores.parser.model;

import java.util.List;

/**
 * DTO for parse requests coming from the frontend.
 *
 * grammarText format (one rule per line):
 *   E -> E + T | T
 *   T -> T * F | F
 *   F -> ( E ) | id
 *
 * inputString: the token stream to validate, tokens separated by spaces.
 *   Example: "id + id * id"
 */
public class ParseRequest {

    /** Raw grammar text as typed by the user. */
    private String grammarText;

    /** Space-separated input tokens to validate. */
    private String inputString;

    /** Start symbol override (optional; defaults to first NT in grammar). */
    private String startSymbol;

    public String getGrammarText()                      { return grammarText; }
    public void   setGrammarText(String grammarText)    { this.grammarText = grammarText; }

    public String getInputString()                      { return inputString; }
    public void   setInputString(String inputString)    { this.inputString = inputString; }

    public String getStartSymbol()                      { return startSymbol; }
    public void   setStartSymbol(String startSymbol)    { this.startSymbol = startSymbol; }
}
