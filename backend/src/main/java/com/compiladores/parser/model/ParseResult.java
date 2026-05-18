package com.compiladores.parser.model;

import java.util.List;
import java.util.Map;

/**
 * Generic parse result returned by every parser endpoint.
 * Contains:
 *  - accepted:     whether the string was accepted
 *  - steps:        list of step descriptions (for step-by-step display)
 *  - table:        parsing table (if applicable), serialized as a nested map
 *  - ast:          Abstract Syntax Tree in JSON-friendly form
 *  - derivation:   list of sentential forms (derivation tree)
 *  - automaton:    LR automaton states and transitions (for Bottom-Up parsers)
 *  - errorMessage: human-readable error if not accepted
 */
public class ParseResult {

    private boolean accepted;
    private String  errorMessage;

    // Step-by-step trace
    private List<ParseStep> steps;

    // Table data (ACTION/GOTO for LR; LL(1) table)
    private Object table;

    // Abstract Syntax Tree node (recursive)
    private ASTNode ast;

    // Derivation tree (list of sentential forms)
    private List<String> derivation;

    // LR Automaton (states + transitions)
    private AutomatonData automaton;

    // FIRST and FOLLOW sets (useful for LL(1))
    private Map<String, List<String>> firstSets;
    private Map<String, List<String>> followSets;

    // Conflicts found during table construction
    private List<String> conflicts = new java.util.ArrayList<>();

    // ─────────────────────────────────────────────────
    //  Inner classes
    // ─────────────────────────────────────────────────

    /** A single step in the parse trace. */
    public static class ParseStep {
        private String stack;       // current parse stack
        private String input;       // remaining input
        private String action;      // action taken
        private String description; // human-readable explanation

        public ParseStep(String stack, String input, String action, String description) {
            this.stack       = stack;
            this.input       = input;
            this.action      = action;
            this.description = description;
        }

        public String getStack()       { return stack; }
        public String getInput()       { return input; }
        public String getAction()      { return action; }
        public String getDescription() { return description; }
    }

    /** A node in the Abstract Syntax Tree / Derivation Tree. */
    public static class ASTNode {
        private String label;           // symbol name
        private boolean terminal;       // leaf or internal node
        private String value;           // token value (for terminals)
        private List<ASTNode> children; // child nodes

        public ASTNode(String label, boolean terminal, String value, List<ASTNode> children) {
            this.label    = label;
            this.terminal = terminal;
            this.value    = value;
            this.children = children;
        }

        public String getLabel()           { return label; }
        public boolean isTerminal()        { return terminal; }
        public String getValue()           { return value; }
        public List<ASTNode> getChildren() { return children; }
    }

    /** LR Automaton: states (item sets) and transitions. */
    public static class AutomatonData {
        private List<AutomatonState>      states;
        private List<AutomatonTransition> transitions;

        public AutomatonData(List<AutomatonState> states, List<AutomatonTransition> transitions) {
            this.states      = states;
            this.transitions = transitions;
        }

        public List<AutomatonState>      getStates()      { return states; }
        public List<AutomatonTransition> getTransitions() { return transitions; }
    }

    public static class AutomatonState {
        private int          id;
        private List<String> items; // string representations of LR items

        public AutomatonState(int id, List<String> items) {
            this.id    = id;
            this.items = items;
        }

        public int          getId()    { return id; }
        public List<String> getItems() { return items; }
    }

    public static class AutomatonTransition {
        private int    from;
        private int    to;
        private String symbol;

        public AutomatonTransition(int from, int to, String symbol) {
            this.from   = from;
            this.to     = to;
            this.symbol = symbol;
        }

        public int    getFrom()   { return from; }
        public int    getTo()     { return to; }
        public String getSymbol() { return symbol; }
    }

    // ─────────────────────────────────────────────────
    //  Getters / Setters
    // ─────────────────────────────────────────────────

    public boolean isAccepted()                              { return accepted; }
    public void    setAccepted(boolean accepted)             { this.accepted = accepted; }

    public String  getErrorMessage()                         { return errorMessage; }
    public void    setErrorMessage(String errorMessage)      { this.errorMessage = errorMessage; }

    public List<ParseStep> getSteps()                        { return steps; }
    public void            setSteps(List<ParseStep> steps)   { this.steps = steps; }

    public Object getTable()                                 { return table; }
    public void   setTable(Object table)                     { this.table = table; }

    public ASTNode getAst()                                  { return ast; }
    public void    setAst(ASTNode ast)                       { this.ast = ast; }

    public List<String> getDerivation()                      { return derivation; }
    public void         setDerivation(List<String> d)        { this.derivation = d; }

    public AutomatonData getAutomaton()                      { return automaton; }
    public void          setAutomaton(AutomatonData a)       { this.automaton = a; }

    public Map<String, List<String>> getFirstSets()          { return firstSets; }
    public void setFirstSets(Map<String, List<String>> f)    { this.firstSets = f; }

    public Map<String, List<String>> getFollowSets()         { return followSets; }
    public void setFollowSets(Map<String, List<String>> f)   { this.followSets = f; }

    public List<String> getConflicts()                       { return conflicts; }
    public void setConflicts(List<String> conflicts)         { this.conflicts = conflicts; }
}
