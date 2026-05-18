package com.compiladores.parser;

import com.compiladores.parser.core.bottomup.LR1Parser;
import com.compiladores.parser.model.ParseRequest;
import com.compiladores.parser.model.ParseResult;

public class TestLR1 {
    public static void main(String[] args) {
        System.out.println("Starting LR1...");
        ParseRequest req = new ParseRequest();
        req.setGrammarText("E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id");
        req.setInputString("id + id * id");
        req.setStartSymbol("E");
        
        LR1Parser parser = new LR1Parser();
        ParseResult res = parser.parse(req);
        System.out.println("Accepted: " + res.isAccepted());
    }
}
