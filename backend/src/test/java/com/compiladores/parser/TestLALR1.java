package com.compiladores.parser;

import com.compiladores.parser.core.bottomup.LALR1Parser;
import com.compiladores.parser.model.ParseRequest;
import com.compiladores.parser.model.ParseResult;

public class TestLALR1 {
    public static void main(String[] args) {
        System.out.println("Starting LALR1...");
        ParseRequest req = new ParseRequest();
        req.setGrammarText("E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id");
        req.setInputString("id + id * id");
        req.setStartSymbol("E");
        
        LALR1Parser parser = new LALR1Parser();
        ParseResult res = parser.parse(req);
        System.out.println("Accepted: " + res.isAccepted());
    }
}
