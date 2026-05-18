package com.compiladores.parser.model;

import java.util.List;

/**
 * Represents a single production rule: lhs -> rhs
 * Used as a numbered rule in parser tables and items.
 */
public class Production {

    private final int id;           // rule number (0-based)
    private final String lhs;       // left-hand side non-terminal
    private final List<String> rhs; // right-hand side symbols

    public Production(int id, String lhs, List<String> rhs) {
        this.id  = id;
        this.lhs = lhs;
        this.rhs = rhs;
    }

    public int getId()          { return id;  }
    public String getLhs()      { return lhs; }
    public List<String> getRhs(){ return rhs; }

    /** Returns a human-readable string, e.g.  "E -> E + T" */
    @Override
    public String toString() {
        return lhs + " -> " + String.join(" ", rhs);
    }
}
