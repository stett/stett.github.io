---
title: Global Implicit Solver
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

Lo rem Ip sum, mother fucker.

<div class="container-3js" id="{{ page.title | slugify }}-global-implicit-solver" style="height:300px;">
</div>

<script type="text/javascript">
{% include js/global-implicit-solver.js %}

$(document).ready(function() {

    //var Solver = new GlobalImplicitSolver($("#{{ page.title | slugify }}-global-implicit-solver"));
    DRAMA.add(new GlobalImplicitSolver($("#{{ page.title | slugify }}-global-implicit-solver")));

    /*
    const myScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    });

    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const cube = new THREE.Mesh( geometry, material );
    myScene.add( cube );

    camera.position.z = 5;
    */
});

</script>