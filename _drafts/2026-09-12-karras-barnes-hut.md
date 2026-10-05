---
title: Interactive Parallel Quadtree Construction
layout: post
tags: [project, physics]
jquery: true
threejs: true
dramaschool: true
math: true
---

<style>
div.container-3js canvas {
    background-color: var(--content-bg);
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    position: static;
}

.container-label {
    margin-block-end: 0;
    font-style: italic;
}

#{{ page.title | slugify }}-particle-grid {
    height: 350px;
}

#{{ page.title | slugify }}-particle-array {
    height: 150px;
}

#{{ page.title | slugify }}-sorted-keys {
    height: 120px;
}

#{{ page.title | slugify }}-radix-tree-split {
    height: 320px;
}

#{{ page.title | slugify }}-leaf-parents {
    height: 100px;
}

#{{ page.title | slugify }}-octree-allocations {
    height: 220px;
}

#{{ page.title | slugify }}-radix-tree-arrays {
    height: 220px;
}

#{{ page.title | slugify }}-quadtree-nodes {
    height: 380px;
}

#{{ page.title | slugify }}-quadtree-bounds {
    height: 350px;
}

div.diagram-controls {
    text-align: center;
    margin-top: 4px;
}

div.diagram-controls button {
    font-family: 'Ubuntu Mono';
    font-size: 11pt;
    color: var(--content-fg);
    background: none;
    border: 1px dashed var(--content-rule);
    border-radius: 2px;
    padding: 3px 10px;
    cursor: pointer;
}

div.diagram-controls button:hover {
    color: var(--accent-blue);
    border-color: var(--accent-blue);
}
</style>

<script>
// Interaction callbacks
var interactUpdateParticles;

// Shared between the excerpt, which creates it, and the rest of the post,
// which wires it to the diagrams.
var particleGridActor;
</script>

The purpose of this post is to interactively demonstrate the construction of an octree structure using purely parallel methods. This is largely based on the classic [Karras 2012](https://dl.acm.org/doi/10.5555/2383795.2383801) paper. I've modified it slightly to accommodate a particular octree data format which works well for faster traversal, with the ultimate goal of fully parallelizing [my n-body implementation]({% post_url 2025-02-24-nbody-262k %}).

<video width="100%" controls>
  <source src="{{ '/assets/video/parallel-octree.mp4' | relative_url }}" type="video/mp4">
</video>

In Karras' paper, the octree construction phase is packed into two paragraphs. In order to really clearly understand the entire tree construction process - from Morton encoding to radix tree construction and building the final octree - I found myself writing up many 8x8 plots of points which I expected to exhibit edge cases and stepping through the algorithm and its memory transformations on paper.

In order to check my understanding of each stage of the algorithm, I made this little interactive reference implementation of a parallelizable quadtree builder. This demonstrates construction of a quadtree, but the extension of the concept to octrees in three dimensions doesn't significantly change the algorithm in any way.

<div class="container-3js" id="{{ page.title | slugify }}-particle-grid"></div>

<script type="text/javascript">

// The grid is part of the excerpt, so it has to set itself up: the script at
// the bottom of the post is not included on the home page. It forwards changes
// to interactUpdateParticles once the rest of the post has defined it.

{% include js/sceneactor.js %}
{% include js/particle-grid-actor.js %}

$(document).ready(function() {
    var container = $("#{{ page.title | slugify }}-particle-grid");
    var scene = new SceneActor(container, 5);
    DRAMA.add(scene);
    particleGridActor = new ParticleGridActor(scene, 8, function(particles) {
        if (interactUpdateParticles) {
            interactUpdateParticles(particles);
        }
    });
    DRAMA.add(particleGridActor);

    // Start with a few particles already placed.
    particleGridActor.randomize(5, 1);
});

</script>

<!-- excerpt -->

The square above is a region of space, sparsely populated by particles in any order. Each cell is a point in space which is most finely representable given a certain number of bits. In this case we limit ourselves to just 3 bits for simplicity, so the x and y coordinates are each integers in the range $[0,8)$.

Click anywhere to add or remove a particle from a point in space. This widget supports up to 10 particles, so if you add an 11th, the 1st particle will be removed and all indices will be updated. You should see the quadtree structure update in real time, demonstrating the algorithm which this article will describe in the following steps.

Changes made above will be reflected in the memory diagrams below, illustrating how memory transforms through every step of the construction of a quadtree. Crucially, each step of this algorithm can be executed in parallel. Some of them lend themselves well to the use of SIMD primitives, but any of them can be done using SIMT (i.e., GPU kernels).

This article, the algorithm it describes, and the [C++ implementation](https://github.com/stett/nbody) are all still a work in progress.

<h4>Step 0: Morton Encoding</h4>

The array containing particle positions is our input vector. For each entry, a Morton key will be generated by interleaving the bits of the binary representation for the $x$ and $y$ coordinates.

This process is trivially parallel and has complexity $O\(N\)$ in the number of particles.

<div class="container-3js" id="{{ page.title | slugify }}-particle-array"></div>

<h4>Step 1: Morton Key Sort</h4>

Sorting an array of Morton keys puts them into an order where spatial proximity correlates with proximity in address space. Because we may also have data other than positions associated with leaf nodes, we will simultaneously produce a reverse map - an array of indices back into the original particle positions array.

A [Radix Sort](https://en.wikipedia.org/wiki/Radix_sort) can be used here, which is also $O\(N\)$.

<div class="container-3js" id="{{ page.title | slugify }}-sorted-keys"></div>

<h4>Step 2: Radix Tree Construction</h4>

Each of the $N$ Morton keys is a leaf node in a radix tree which has $N-1$ internal nodes. Each internal node in a radix tree represents a splitting index - given a range of keys which share a common prefix, the splitting point for that range is the point at which the next most significant bit past the common prefix begins to differ. For example, if you have a range containing the keys `0:110001`, `1:110010`, and `2:111001`, the common prefix is `11` and the splitting point would be between elements 1 and 2 because that is where the bit just past the prefix changes from `0` to `1`.

The node splitting pattern is illustrated in the following diagram. The first row shows the leaf nodes of the radix tree - i.e. the sorted Morton keys from the diagram above. The subsequent rows show the prefixes, ranges, and split positions for each of the internal radix tree nodes.

<div class="container-3js" id="{{ page.title | slugify }}-radix-tree-split"></div>

<div class="diagram-controls">
    <button type="button" id="{{ page.title | slugify }}-radix-tree-split-order">index order</button>
</div>

The following arrays are the radix node data, which will be fed into the next step for construction of the octree structure. Internal node indices are prefixed with an `*`. Other indices refer to leaves (the sorted Morton key array).

The `quad_internals` and `quad_leaves` values indicate the number of internal and leaf _quadtree_ nodes that will be emitted by each radix node. Karras uses only the first of these two numbers, but I'll need the second as well for the linear quadtree format that I'll construct in the final step.

<div class="container-3js" id="{{ page.title | slugify }}-radix-tree-arrays"></div>

It's possible that for some applications the `parents` array is not actually necessary. However, for a Barnes-Hut implementation a bottom-up traversal of the tree is needed in order to populate each node with total mass data from child nodes. Parent indices are needed for bottom-up traversal.

<h4>Step 3: Quadtree/Octree Allocation</h4>

The number of nodes in the quadtree that we will produce does not have a simple relationship to the number of radix nodes or keys, unlike every other buffer described up to this point. From the `quad_internals` and `quad_leaves` arrays, we know how many octree nodes to allocate per each radix tree node. To get the total, we first compute the sum `quad_internals + quad_leaves`, and then the exclusive prefix sum on the result.

The entries of the resulting buffer will be the offsets into the quadtree node array for each radix node. The last value (plus one, for the root node) will indicate the total number of quadtree nodes to allocate.

<div class="container-3js" id="{{ page.title | slugify }}-octree-allocations"></div>

<h4>Step 4: Create Leaf Node Map</h4>

This is an intermediate step to create an index map from the leaves/keys array into the quadtree nodes array. Each key corresponds to a leaf node in the quadtree. It's necessary to keep these indices around so that leaf nodes can be inserted into the correct locations in the final quadtree structure. It is also useful for bottom up traversals of the tree starting with the leaf nodes, as we will need to do for Barnes-Hut.

<div class="container-3js" id="{{ page.title | slugify }}-leaf-parents"></div>

<h4>Step 5: Construct Quadtree/Octree</h4>

The quadtree nodes themselves. The array is as long as the `total` from step 3, and each node holds the index of its `parent`, its first `child`, and the "escape index", `next`. `next` carries two meanings - in the case that a node has a sibling that follows it, `next` will be the index of that sibling. Otherwise, if the node is the last child of its parent, `next` will equal its parent's `next`.

`next` is referred to as the escape index because a node's `next` is used to escape a branch of the tree when a traversal decides not to go any deeper. For example when a node's mass approximation is "good enough" in a Barnes-Hut implementation, the `next` pointer can be used to jump to the next branch and skip the whole subtree.

In index order the nodes are laid out in array order. In tree order they are laid out one row per depth, with each group of siblings kept together beneath its parent. Leaf nodes are drawn with a dashed outline.

<div class="container-3js" id="{{ page.title | slugify }}-quadtree-nodes"></div>

<div class="diagram-controls">
    <button type="button" id="{{ page.title | slugify }}-quadtree-nodes-order">index order</button>
</div>

Each Morton key contains enough information to reconstruct the bounds of each node of the quadtree, down to the corresponding leaf. For intermediate nodes, a subset of the bits of the Morton key are needed. For a quadtree, each pair of bits corresponds to a bounds. The most significant two bits will be the outermost bounds, and the least significant two bits will be the innermost bounds - every pair of bits in between is a level in the quadtree. The first bit in a pair is the x-axis, in our case - zero means left half, one means right half. The second bit indicates bottom or top. Every pair of bits is the subdivision of the previous pair's bounds.

These node bounds are not shown in the memory diagram above, but they're computed and stored in the quadtree nodes during the quadtree construction of step 5, alongside the parent, next, and child indices.

Finally, we've produced the quadtree of bounds that was rendered at the top of this article. Each internal node is split into its four quadrants, and each leaf is outlined with a dashed line. Particles are indicated by their circled indices into the original particle array.

<div class="container-3js" id="{{ page.title | slugify }}-quadtree-bounds"></div>

Though complex and subtle in its implementation, every step of this quadtree/octree construction can be done in parallel.

<h4>Final Notes</h4>

In this article I described each part of the algorithm in English, and purposefully avoided getting into the weeds on implementation subtleties. I wrote this originally as an aid to myself to help debug edge-cases while writing the implementation which I used to generate the n-body simulation which is shown in the video at the front of the article.

*This algorithm is not fully complete yet* - as can be seen from the index/tree orderings in the final construction of the quadtree, the escape-pointer quadtree structure is not optimal. A regular traversal can cause cache misses because the nodes are not sorted into depth-first-search (DFS) order, which is the order that this structure typically benefits the most from.

While building the n-body simulation, I've gone through many iterations and compared profiles. Putting the tree construction into this form benefits massively from parallelization and use of SIMD, but the cost of traversal increases significantly due to the loss of DFS ordering in the final structure.

Besides just optimization of memory access, DFS ordering of the quadtree/octree could potentially allow removal of the `parent` and `child` indices since the first child of a node would always immediately follow its parent in memory. A bottom up traversal would be a scan from right to left, and a top down traversal would be a scan from left to right. This would be a significant savings in memory usage, while further improving cache friendliness.

I'm currently exploring adding another parallel sort step into this algorithm which will result in a DFS-ordered structure. Careful profiling and attention to memory layout is essential so that each new step in this algorithm is an overall improvement in performance for my use case.

<script type="text/javascript">

{% include js/sceneactor.js %}
{% include js/particle-grid-actor.js %}
{% include js/particle-array-actor.js %}
{% include js/sorted-keys-actor.js %}
{% include js/radix-tree-split-actor.js %}
{% include js/radix-tree-arrays-actor.js %}
{% include js/octree-allocations-actor.js %}
{% include js/leaf-parents-actor.js %}
{% include js/quadtree-nodes-actor.js %}
{% include js/quadtree-bounds-actor.js %}

$(document).ready(function() {

    // Actor references
    var particleArrayActor;
    var sortedKeysActor;
    var radixTreeSplitActor;
    var radixTreeArraysActor;
    var octreeAllocationsActor;
    var leafParentsActor;
    var quadtreeNodesActor;
    var quadtreeBoundsActor;

    //
    // Interaction callbacks
    //

    interactUpdateParticles = function(particles) {
        particleArrayActor.set_particles(particles);
        sortedKeysActor.set_particles(particles);
        radixTreeSplitActor.set_keys(sortedKeysActor.keys);
        radixTreeArraysActor.set_keys(sortedKeysActor.keys);
        octreeAllocationsActor.set_keys(sortedKeysActor.keys);
        leafParentsActor.set_keys(sortedKeysActor.keys);
        quadtreeNodesActor.set_keys(sortedKeysActor.keys);
        quadtreeBoundsActor.set_particles(particles);
    }

    //
    // Set up scenes
    //

    {
        var container = $("#{{ page.title | slugify }}-particle-array");
        var scene = new SceneActor(container, 2);
        DRAMA.add(scene);
        particleArrayActor = new ParticleArrayActor(scene);
        DRAMA.add(particleArrayActor);
    }

    {
        var container = $("#{{ page.title | slugify }}-sorted-keys");
        var scene = new SceneActor(container, 2);
        DRAMA.add(scene);
        sortedKeysActor = new SortedKeysActor(scene);
        DRAMA.add(sortedKeysActor);
    }

    {
        var container = $("#{{ page.title | slugify }}-radix-tree-split");
        var scene = new SceneActor(container, 5.9);
        DRAMA.add(scene);
        radixTreeSplitActor = new RadixTreeSplitActor(scene);
        DRAMA.add(radixTreeSplitActor);

        // The button reads as the order currently on screen, not the one a
        // click would switch to.
        $("#{{ page.title | slugify }}-radix-tree-split-order").click(function() {
            $(this).text(radixTreeSplitActor.toggle_order() ? "tree order" : "index order");
        });
    }

    {
        var container = $("#{{ page.title | slugify }}-radix-tree-arrays");
        var scene = new SceneActor(container, 2);
        DRAMA.add(scene);
        radixTreeArraysActor = new RadixTreeArraysActor(scene);
        DRAMA.add(radixTreeArraysActor);
    }

    {
        var container = $("#{{ page.title | slugify }}-octree-allocations");
        var scene = new SceneActor(container, 2.2);
        DRAMA.add(scene);
        octreeAllocationsActor = new OctreeAllocationsActor(scene);
        DRAMA.add(octreeAllocationsActor);
    }

    {
        var container = $("#{{ page.title | slugify }}-leaf-parents");
        var scene = new SceneActor(container, 1);
        DRAMA.add(scene);
        leafParentsActor = new LeafParentsActor(scene);
        DRAMA.add(leafParentsActor);
    }

    {
        var container = $("#{{ page.title | slugify }}-quadtree-nodes");
        var scene = new SceneActor(container, 3);
        DRAMA.add(scene);
        quadtreeNodesActor = new QuadtreeNodesActor(scene);
        DRAMA.add(quadtreeNodesActor);

        $("#{{ page.title | slugify }}-quadtree-nodes-order").click(function() {
            $(this).text(quadtreeNodesActor.toggle_order() ? "tree order" : "index order");
        });
    }

    {
        var container = $("#{{ page.title | slugify }}-quadtree-bounds");
        var scene = new SceneActor(container, 5);
        DRAMA.add(scene);
        quadtreeBoundsActor = new QuadtreeBoundsActor(scene);
        DRAMA.add(quadtreeBoundsActor);
    }

    // The grid placed its starting particles before this ran, so catch the
    // diagrams up with them.
    interactUpdateParticles(particleGridActor.particles);
});

</script>
