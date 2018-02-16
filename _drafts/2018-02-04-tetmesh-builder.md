---
title: Tetmesh Builder
layout: post
tags: [math, physics]
comments: false
math: false
jquery: true
threejs: true
dramaschool: true
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

div.centered {
    text-align: center;
}

</style>

In a simulation of solid mechanics, the shape of an object is usually discretized into geometric regions which share faces and nodes. Especially in FEM, it is common to use tetrahedra for the element shape due to the simple interpolating functions that result.

A network of connected nodes represents the tetrahedral regions of a solid object. The connectivity of the network along with the material properties of the object determine the physical reaction to stresses and strains.

The following widget allows you to make simple tweaks to a random tetrahedral mesh. By clicking unconnected nodes, you can add tetrahedra to the mesh.

<div class="container-3js" id="tetmeshbuilder-tetmesh" style="height:300px;"></div>

The stress/strain relationship between every pair of nodes can be represented as a sparse, square, symmetric matrix, called the _global stiffness matrix_. The linearly approximated stiffness of each tetrahedron is represented by a 12x12 _local stiffness matrix_. The following widget illustrates the local stiffness matrices for each of the tetrahedra in the mesh above.

<div class="container-3js" id="tetmeshbuilder-tetstiffinspector-local" style="height:300px;"></div>

<div class="container-3js" id="tetmeshbuilder-tetstiffinspector-global" style="height:300px;"></div>

<br>

<script>
{% include js/tetmeshbuilder.js %}
{% include js/tetstiffinspector-local.js %}
{% include js/tetstiffinspector-global.js %}

// Attach the tetmesh builder & stiffness inspector to the correct elements
$(document).ready(function() {

    // Create widgets in html elements
    TetMeshBuilder.onReady($("#tetmeshbuilder-tetmesh"));
    TetStiffInspectorLocal.onReady($("#tetmeshbuilder-tetstiffinspector-local"), TetMeshBuilder.tetmesh);
    TetStiffInspectorGlobal.onReady($("#tetmeshbuilder-tetstiffinspector-global"), TetMeshBuilder.tetmesh);

    // Attach widgets with callbacks
    var updateMatrices = function() {
        TetStiffInspectorLocal.generateMatrix();
        TetStiffInspectorGlobal.generateMatrix();
    };
    TetMeshBuilder.onTetAdded = updateMatrices;
    updateMatrices();
});
</script>
