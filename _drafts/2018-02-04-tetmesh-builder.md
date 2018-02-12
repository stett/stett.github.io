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

The stress/strain relationship between every pair of nodes can be represented as a square, symmetric matrix, called the _stiffness matrix_. The purpose of the WebGL demos in this article are to visually demonstrate how changing the connectivity of a tetrahedral mesh changes the matrix representation of the stiffness matrix.

<script src="{{ site.url }}/assets/js/tetmeshbuilder.js"></script>

<script>
$(document).ready(function() {
    TetMeshBuilder.onReady();
});
</script>
