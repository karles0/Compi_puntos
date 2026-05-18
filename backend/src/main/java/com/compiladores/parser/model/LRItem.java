package com.compiladores.parser.model;

import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * An LR Item: a production with a "dot" position.
 * Example:  E -> E · + T   (lhs=E, rhs=[E,+,T], dotPos=1)
 *
 * For LR(1) items, a lookahead set is also carried.
 */
public class LRItem {

    private final String lhs;
    private final List<String> rhs;
    private final int dotPos;
    private final Set<String> lookaheads; // non-null for LR(1)/LALR(1)

    public LRItem(String lhs, List<String> rhs, int dotPos, Set<String> lookaheads) {
        this.lhs        = lhs;
        this.rhs        = rhs;
        this.dotPos     = dotPos;
        this.lookaheads = lookaheads;
    }

    /** Convenience constructor for LR(0)/SLR items (no lookahead). */
    public LRItem(String lhs, List<String> rhs, int dotPos) {
        this(lhs, rhs, dotPos, null);
    }

    // ─────────────────────────────────────────────────
    //  Query helpers
    // ─────────────────────────────────────────────────

    /** True if the dot is at the end of the production. */
    public boolean isComplete() {
        return dotPos >= rhs.size() || (rhs.size() == 1 && rhs.get(0).equals(Grammar.EPSILON));
    }

    /** Symbol immediately after the dot, or null if complete. */
    public String getSymbolAfterDot() {
        if (isComplete()) return null;
        return rhs.get(dotPos);
    }

    /** Returns a new item with the dot advanced by one position. */
    public LRItem advance() {
        return new LRItem(lhs, rhs, dotPos + 1, lookaheads == null ? null : new java.util.LinkedHashSet<>(lookaheads));
    }

    /** Returns a new item with the given lookahead set (for LR(1)). */
    public LRItem withLookaheads(Set<String> la) {
        return new LRItem(lhs, rhs, dotPos, la);
    }

    // ─────────────────────────────────────────────────
    //  Standard overrides
    // ─────────────────────────────────────────────────

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof LRItem item)) return false;
        return dotPos == item.dotPos
                && Objects.equals(lhs, item.lhs)
                && Objects.equals(rhs, item.rhs)
                && Objects.equals(lookaheads, item.lookaheads);
    }

    @Override
    public int hashCode() {
        // Exclude lookaheads from hashCode because they are mutated during closure,
        // which would otherwise corrupt HashSet buckets!
        return Objects.hash(lhs, rhs, dotPos);
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder(lhs).append(" -> ");
        for (int i = 0; i < rhs.size(); i++) {
            if (i == dotPos) sb.append("• ");
            sb.append(rhs.get(i)).append(" ");
        }
        if (dotPos >= rhs.size()) sb.append("•");
        if (lookaheads != null) {
            sb.append(", ").append(lookaheads);
        }
        return sb.toString().trim();
    }

    // ─────────────────────────────────────────────────
    //  Getters
    // ─────────────────────────────────────────────────

    public String getLhs()             { return lhs; }
    public List<String> getRhs()       { return rhs; }
    public int getDotPos()             { return dotPos; }
    public Set<String> getLookaheads(){ return lookaheads; }
}
