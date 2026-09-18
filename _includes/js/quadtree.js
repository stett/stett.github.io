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
    //while (
    //    arrays.nodes[i_radix].quadtree_internals == 0
    //    arrays.nodes[i_radix].child0_index)
}

// Get the octree index corresponding to a radix node index
function compute_octree_child(arrays, i_octree_or_leaf)
{
    var is_leaf = arrays.nodes[i_radix].is_leaf
    return is_leaf
        ? arrays.leaf_parents[i_radix]
        : compute_first_octree_node(arrays, i_radix);
}

// Fill in the quadtree nodes which radix node i_radix is responsible for. Every
// radix node owns a run of the quadtree array - the run starting at its entry
// in the offsets array - so one call per radix node covers the whole tree and
// the calls are independent of each other.
//
// Not written yet; the nodes are left at their defaults.
function compute_quadtree_nodes(keys, radix_nodes, parents, i_radix, quadtree_nodes)
{
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
    var node = nodes[0];
    node.parent = 0;
    node.next = 0;
    node.child
        = (arrays.nodes[0].quadtree_internals > 0)
        ? (1 + arrays.offsets[0])
        : compute_octree_child(arrays, arrays.nodes[0].index_child0);

    // populate quadtree nodes corresponding to each radix node
    for (var i = 0; i < arrays.nodes.length; ++i)
    {
        compute_quadtree_nodes(keys, arrays.nodes, arrays.parents, i, nodes);
    }

    return nodes;
}

// The node array split into the groups that share a parent. The root is alone
// in the first group and the rest follow in allocation order, four to a group.
// Once compute_quadtree_nodes is written this should walk child and next
// instead, which will also order the groups by depth.
function quadtreeSiblingGroups(nodes)
{
    var groups = [];
    for (var i = 0; i < nodes.length; ++i)
    {
        if (i == 0 || (i - 1) % 4 == 0)
        {
            groups.push([]);
        }
        groups[groups.length - 1].push(i);
    }
    return groups;
}
