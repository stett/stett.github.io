// The prefix padded out to a full key width, with dashes for unset bits.
function prefixDashes(prefix, bits=6) {
    while (prefix.length < bits) {
        prefix += "-";
    }
    return prefix;
}

// Stub. The radix tree node covering internal node index i, derived from the
// sorted morton keys. There are keys.length - 1 internal nodes.
function radixTreeNode(keys, i) {
    return {
        prefix_str: "",
        child0_index: i,
        child1_index: i+1,
        child0_leaf: false,
        child1_leaf: false,
        range_end: keys.length - 1,
        range_dir: 1,
        cpl_parent: 0,
        cpl_depth: 0,
        oct_internal_nodes: 0,
        oct_leaf_nodes: 0
    };
}
