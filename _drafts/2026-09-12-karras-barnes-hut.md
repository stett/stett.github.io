---
title: Interactive Parallel Octree Construction
layout: post
tags: [project, physics]
jquery: true
threejs: true
dramaschool: true
---

The purpose of this post is to interactively demonstrate the construction of an octree structure using purely parallel methods. This is largely based on the classic [Karras 2012](https://dl.acm.org/doi/10.5555/2383795.2383801) paper. I've modified it slightly to accomadate a particular octree data format which works well for faster traversal.

In that paper, the octree construction phase is packed into 2 paragraphs. In order to really clearly understand the entire tree construction process - from morton encoding, to radix tree construction, to building the final octree - I found myself writing up many 8x8 plots of points which I expected to exhibit edge cases and stepping through the algorithm and its memory transformations on paper.

In order to check my understanding, I made this little interactive test implementation to help me understand exactly what buffers I'll need to allocate for each stage, and how their memory will be laid out.

---


<style>
div.container-3js canvas {
    background-color: #000;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    position: static;
}

#{{ page.title | slugify }}-particle-grid {
    height: 400px;
}
</style>

<div class="container-3js" id="{{ page.title | slugify }}-particle-grid"></div>

The grid above represents a region of discretized space, where each 1x1 cell can either be empty or occupied by a particle. Click a cell to toggle it between occupied and empty states.

Changes will be reflected in the memory diagrams below, illustrating how memory transforms through every step of the parallel construction of a quadtree.

<script type="text/javascript">

{% include js/sceneactor.js %}
{% include js/particle-grid-actor.js %}

$(document).ready(function() {
    var container = $("#{{ page.title | slugify }}-particle-grid");
    var scene = new SceneActor(container, 5);
    DRAMA.add(scene);
    DRAMA.add(new ParticleGridActor(scene, 8));
});

</script>
