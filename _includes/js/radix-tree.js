{% include js/particle-quad-common.js %}

// The prefix padded out to a full key width, with dashes for unset bits.
function prefixDashes(prefix, bits=6) {
    while (prefix.length < bits) {
        prefix += "-";
    }
    return prefix;
}

function compute_cpl(keys, i0, i1)
{
    if (i1 < 0 || i1 >= keys.length)
    {
        return -1;
    }

    // left shift by 26 because we're only using 6 out of 32 bits
    k0 = keys[i0] << 26;
    k1 = keys[i1] << 26;
    return Math.clz32(k0 ^ k1);
}

function compute_sign(x)
{
    return (x > 0) - (x < 0);
}

function compute_range_dir(keys, i)
{
    d0 = compute_cpl(keys, i, i+1);
    d1 = compute_cpl(keys, i, i-1);
    return compute_sign(d0 - d1);
}

function compute_range_len(keys, i, range_dir, cpl_parent)
{
    var lmax = 2;
    while (compute_cpl(keys, i, i + (lmax * range_dir)) > cpl_parent)
    {
        lmax <<= 1;
    }

    var div = 2;
    var t = 0;
    var l = 0;
    do {
        t = Math.trunc(lmax / div);
        div <<= 1;
        if (compute_cpl(keys, i, i + ((l + t) * range_dir)) > cpl_parent)
        {
            l += t;
        }
    } while (t > 1);

    // return the range length
    return l;
}

function compute_range_split(keys, i, range_dir, range_len, cpl_depth)
{
    var div = 2;
    var t = 0;
    var s = 0;
    do
    {
        t = Math.trunc((range_len + div - 1) / div);
        div <<= 1;
        if (compute_cpl(keys, i, i + ((s + t) * range_dir)) > cpl_depth)
        {
            s += t;
        }
    } while (t > 1);

    // return the split position
    return i + (s * range_dir) + Math.min(range_dir, 0);
}

function compute_internal_count(cpl_depth, cpl_parent)
{
    var octree_levels = Math.trunc(cpl_depth / 2);
    var octree_levels_parent = Math.trunc(Math.max(cpl_parent, 0) / 2);
    return octree_levels - octree_levels_parent;
}

// build radix tree node data. if a parents array is given, each child which is
// an internal node has its parent entry filled in.
function radixTreeNode(keys, i, parents)
{
    var node = {};
    node.range_dir = compute_range_dir(keys, i);
    node.cpl_parent = compute_cpl(keys, i, i - node.range_dir);
    node.range_len = compute_range_len(keys, i, node.range_dir, node.cpl_parent);
    node.index_last = i + (node.range_len * node.range_dir);
    node.index_min = Math.min(i, node.index_last);
    node.index_max = Math.max(i, node.index_last);
    node.cpl_depth = compute_cpl(keys, i, node.index_last);
    node.prefix_str = toKeyBits(keys[i]).substring(0, node.cpl_depth);
    node.index_child0 = compute_range_split(keys, i, node.range_dir, node.range_len, node.cpl_depth);
    node.index_child1 = node.index_child0 + 1;
    node.leaf_child0 = (node.index_child0 == node.index_min);
    node.leaf_child1 = (node.index_child1 == node.index_max);
    node.quadtree_internals = compute_internal_count(node.cpl_depth, node.cpl_parent);
    node.quadtree_leaves = node.leaf_child0 + node.leaf_child1;

    if (parents)
    {
        if (!node.leaf_child0)
        {
            parents[node.index_child0] = i;
        }
        if (!node.leaf_child1)
        {
            parents[node.index_child1] = i;
        }
    }

    console.log(node);
    return node;
}
