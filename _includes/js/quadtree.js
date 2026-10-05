{% include js/particle-quad-common.js %}
{% include js/radix-tree.js %}

// A node in the linear quadtree. child is the first of the node's children and
// next is the sibling after it, so the children of a node are walked by
// following child once and then next until it runs out. -1 is "none".
function quadtreeNode()
{
    return { parent: -1, child: -1, next: -1, is_leaf: false };
}

// Get the first octree node index, given a radix node's key range
function compute_first_octree_node(arrays, i_radix)
{
    // traverse the radix tree down to the first node that resolved a level,
    // or a leaf node if it didn't resolve anything.
    while (
        arrays.nodes[i_radix].quadtree_internals == 0 &&
        arrays.nodes[i_radix].leaf_child0 == false)
    {
        i_radix = arrays.nodes[i_radix].index_child0;
    }

    // either it resolved a level, and its chain begins the range, or it resolved
    // none and its own first leaf begins the range.
    return (arrays.nodes[i_radix].quadtree_internals > 0)
        ? 1 + arrays.offsets[i_radix]
        : arrays.leaf_parents[arrays.nodes[i_radix].index_child0];

}

// Get the octree index corresponding to one of a radix node's children.
// i_child indexes the keys when that child is a leaf and the radix nodes when
// it is not, which only the parent knows, so it is passed in.
function compute_octree_child(arrays, i_child, is_leaf)
{
    return is_leaf
        ? arrays.leaf_parents[i_child]
        : compute_first_octree_node(arrays, i_child);
}

// Find the first quadree node index corresponding to a radix node's index range.
// If this radix node resolves to a quadtree level, this will be the first
// quadtree node in the chain. Otherwise, this will be the index of the leaf node.
function compute_quadtree_first_node(radix_nodes, leaf_parents, offsets, i_radix)
{
    // traverse the radix tree down to the first radix node in the range that resolved a level,
    // or to a leaf if none did
    //var radix_node = radix_nodes[i_radix];
    while (
        radix_nodes[i_radix].quadtree_internals == 0 &&
        radix_nodes[i_radix].leaf_child0 == false)
    {
        i_radix = radix_nodes[i_radix].index_child0;
    }

    // either it resolved a level and its chain begins the range, or it didn't and its
    // first leaf begins the range.
    var radix_node = radix_nodes[i_radix];
    if (radix_node.quadtree_internals > 0)
    {
        return 1 + offsets[i_radix];
    }
    else
    {
        return leaf_parents[radix_node.index_child0]
    }
}

// Find the common quadtree node "next" index for the radix nodes in range which ends with
// i_radix_last
function compute_quadtree_next(keys, radix_nodes, leaf_parents, offsets, i_key_last)
{
    // if we've gone past the end of the keys, "next" is the root which signals "finished"
    var i_radix_next = i_key_last + 1;
    if (i_radix_next >= keys.length)
    {
        return 0;
    }

    // a radix node's index is one of the ends of its range. so i_radix < index_last
    // means the range of the radix node at i_radix 
    if (i_radix_next < radix_nodes.length && i_radix_next < radix_nodes[i_radix_next].index_last)
    {
        return compute_quadtree_first_node(radix_nodes, leaf_parents, offsets, i_radix_next);
    }
    else
    {
        return leaf_parents[i_radix_next];
    }
}

// Compute the level of depth of the first quadtree node in the chain of quadtree
// nodes produced by the range starting with a particular radix node.
function compute_quadtree_top_level(keys, radix_nodes, i_radix)
{
    var radix_node = radix_nodes[i_radix];
    var i_split = Math.abs(radix_node.index_child0);
    var i_quadtree_last_node = Math.floor(compute_cpl(keys, i_split, i_split + 1) / 2);
    var i_quadtree_first_node = i_quadtree_last_node - radix_node.quadtree_internals + 1;
    return i_quadtree_first_node;
}

// Find the index of the quadtree node which is the parent of the chain of quadtree nodes
// which are spanned by a radix node's range.
function compute_quadtree_parent(radix_nodes, radix_parents, offsets, i_radix)
{
    // radix node 0 covers every key, so its chain begins at level 1 and hangs
    // straight from the root. It has no radix parent to consult.
    if (i_radix == 0)
    {
        return 0;
    }

    // traverse up the radix tree, past any ancestors which resolved to no octree level,
    // thus producing no internal octree nodes.
    var i_radix_parent = radix_parents[i_radix];
    while (i_radix_parent > 0 && radix_nodes[i_radix_parent].quadtree_internals == 0)
    {
        i_radix_parent = radix_parents[i_radix_parent];
    }

    // the parent is the last internal quadtree node of the ancestor radix-node's chain
    // of quadtree nodes. if the radix node resolves to zero internal quadtree nodes,
    // this is the root.
    var radix_parent_quadtree_internals = radix_nodes[i_radix_parent].quadtree_internals;
    if (radix_parent_quadtree_internals > 0)
    {
        return offsets[i_radix_parent] + radix_parent_quadtree_internals;
    }
    else
    {
        return 0;
    }
}

// find the child of the last quadtree node in a chain of nodes which were
// resolved by the radix node which is the parent of i_radix_child.
//
// for every i_radix_child except for the first one (ie at index 0), this will
// simply be a lookup into leaf_parents.
function compute_quadtree_child(radix_nodes, offsets, leaf_parents, i_radix_child, radix_child_is_leaf)
{
    if (radix_child_is_leaf)
    {
        return leaf_parents[i_radix_child];
    }
    else
    {
        return compute_quadtree_first_node(radix_nodes, leaf_parents, offsets, i_radix_child);
    }
}

// The bounds of the quadtree cell at level i_level which contains key, in the
// unit square. Each level down reads the next two bits of the key, x then y,
// and appends one to each axis' cell index. Level 0 leaves both indices at 0,
// which is the whole square - the root.
function compute_quadtree_bounds(i_level, key, bits=6)
{
    var modulus = 2;
    var group_mask = (1 << modulus) - 1;

    var index = [0, 0];
    for (var l = 1; l <= i_level; ++l)
    {
        var group = (key >> (bits - modulus * l)) & group_mask;
        for (var axis = 0; axis < modulus; ++axis)
        {
            index[axis] = (index[axis] << 1) | ((group >> (modulus - 1 - axis)) & 1);
        }
    }

    var cell_size = Math.pow(2, -i_level);

    var center = [];
    for (var axis = 0; axis < modulus; ++axis)
    {
        center.push((index[axis] + 0.5) * cell_size);
    }
    return { center: center, half_extent: 0.5 * cell_size };
}

// Fill in the quadtree nodes which radix node i_radix is responsible for. Every
// radix node owns a run of the quadtree array - the run starting at its entry
// in the offsets array - so one call per radix node covers the whole tree and
// the calls are independent of each other.
//
// Not written yet; the nodes are left at their defaults.
function compute_quadtree_nodes(keys, radix_nodes, offsets, parents, leaf_parents, i_radix, quadtree_nodes)
{
    var radix_node = radix_nodes[i_radix];

    // if this radix node produced zero octree nodes, early out
    var node_count_total = radix_node.quadtree_internals + radix_node.quadtree_leaves;
    if (node_count_total == 0)
    {
        return;
    }

    // get the first octree node index
    var offset = offsets[i_radix];
    var i_node_0 = 1 + offset;

    // every node of this chain covers the same key range, so one escape serves them all.
    // in other words, they all share the same "next"
    var i_next = compute_quadtree_next(keys, radix_nodes, leaf_parents, offsets, radix_node.index_max);

    // this radix node's level - its chain ends there and its leafs sit one below it
    var i_level = compute_quadtree_top_level(keys, radix_nodes, i_radix);

    // populate the intermediate nodes
    for (var i_internal = 0; i_internal < radix_node.quadtree_internals; ++i_internal)
    {
        var i_node = i_node_0 + i_internal;

        var quad_node = quadtree_nodes[i_node];

        // the first internal node's parent is the parent of the whole chain.
        // the rest of the parent's of nodes in the chain are just the preceding node.
        if (i_internal == 0)
        {
            quad_node.parent = compute_quadtree_parent(radix_nodes, parents, offsets, i_radix);
        }
        else
        {
            quad_node.parent = i_node - 1;
        }

        // already computed once, outside the loop. all elements of the chain have the
        // same "next" since they have no same-level siblings.
        quad_node.next = i_next;

        // every node in the chain until the last one has one child, which is just the
        // next node in the chain. the last node may point to a totally different block
        if (i_internal + 1 < radix_node.quadtree_internals)
        {
            quad_node.child = i_node + 1;
        }
        else
        {
            quad_node.child = compute_quadtree_child(radix_nodes, offsets, leaf_parents, radix_node.index_child0, radix_node.leaf_child0);
        }

        // these nodes are intermediate - none of them are leaves
        quad_node.is_leaf = false;

        quad_node.bounds = compute_quadtree_bounds(i_level + i_internal, keys[radix_node.index_max]);
    }

    // the leafs hang from the deepest node of the chain, or from whatever is above
    // the block when this radix node resolved no level of its own
    var i_leaf_parent = (radix_node.quadtree_internals > 0)
        ? i_node_0 + radix_node.quadtree_internals - 1
        : compute_quadtree_parent(radix_nodes, parents, offsets, i_radix);

    // both children of a radix node sit one level below the end of its chain, on
    // either side of the split that defines it
    var i_leaf_level = i_level + radix_node.quadtree_internals;

    // populate corresponding leaf nodes after the internals
    for (var i_child = 0; i_child < 2; ++i_child)
    {
        // if the child is not a leaf, continue - this leaf will get its own block
        //
        // NOTE: we start with child1 for some reason in the c++ implementation...
        // not sure if that's significant.
        var leaf_child = i_child ? radix_node.leaf_child1 : radix_node.leaf_child0;
        if (!leaf_child)
        {
            continue;
        }

        // get the index of the radix key which corresponds to this leaf
        var i_key = i_child ? radix_node.index_child1 : radix_node.index_child0;

        // get the quadtree node which is the parent of the leaf
        var i_quad_node = leaf_parents[i_key];
        var quad_node = quadtree_nodes[i_quad_node];

        // all of these leaf nodes have the same parent, computed outside the loop
        quad_node.parent = i_leaf_parent;

        // a leaf's range is the single key, so its escape is the range starting at
        // the next one - the same rule the chain uses
        quad_node.next = compute_quadtree_next(keys, radix_nodes, leaf_parents, offsets, i_key);

        // for leaf nodes, the child index indicates an index into the original keys array
        quad_node.child = i_key;

        // 
        quad_node.is_leaf = true;

        quad_node.bounds = compute_quadtree_bounds(i_leaf_level, keys[i_key]);
    }
}

// The whole quadtree node array. Its length is the total from the allocation
// step: one node per unit of every radix node's count, plus the root.
function quadtreeNodes(keys)
{
    var arrays = radixTreeArrays(keys);
    var total = arrays.nodes.length > 0 ? arrays.sum + 1 : 0;

    var nodes = [];
    for (var i = 0; i < total; ++i)
    {
        nodes.push(quadtreeNode());
    }

    // populate the root node
    if (total > 0)
    {
        var quad_root = nodes[0];
        var radix_root = arrays.nodes[0];
        quad_root.is_leaf = false;
        quad_root.parent = 0;
        quad_root.next = 0;
        quad_root.child
            = (radix_root.quadtree_internals > 0)
            ? (1 + arrays.offsets[0])
            : compute_octree_child(arrays, radix_root.index_child0, radix_root.leaf_child0);
    }

    // populate quadtree nodes corresponding to each radix node
    for (var i = 0; i < arrays.nodes.length; ++i)
    {
        compute_quadtree_nodes(keys, arrays.nodes, arrays.offsets, arrays.parents, arrays.leaf_parents, i, nodes);
    }

    return nodes;
}

// The node array split into the groups that share a parent, ordered by depth.
// The root is alone in the first group. Each group after that is the children
// of an internal node from an earlier group, found by following its child once
// and then next until next reaches the parent's own next. Any node the walk
// never reaches gets a group of its own at the end, so it still shows up in
// the diagram with its own parent as the row label.
function quadtreeSiblingGroups(nodes)
{
    var groups = [];
    if (nodes.length == 0)
    {
        return groups;
    }

    var visited = [];
    for (var i = 0; i < nodes.length; ++i)
    {
        visited.push(false);
    }

    groups.push([0]);
    visited[0] = true;

    // groups is appended to while it is walked, so this is breadth first
    for (var g = 0; g < groups.length; ++g)
    {
        for (var j = 0; j < groups[g].length; ++j)
        {
            var parent = nodes[groups[g][j]];

            // a leaf's child is a key index, not a node
            if (parent.is_leaf)
            {
                continue;
            }

            // stop at a visited node too, so a bad link can't loop forever
            var group = [];
            var i_child = parent.child;
            while (i_child >= 0 && i_child < nodes.length && !visited[i_child])
            {
                visited[i_child] = true;
                group.push(i_child);
                if (nodes[i_child].next == parent.next)
                {
                    break;
                }
                i_child = nodes[i_child].next;
            }

            if (group.length > 0)
            {
                groups.push(group);
            }
        }
    }

    for (var i = 0; i < nodes.length; ++i)
    {
        if (!visited[i])
        {
            groups.push([i]);
        }
    }

    return groups;
}
