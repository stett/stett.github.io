---
title: Detecting Islands in Tetrahedral Meshes
layout: post
tags: []
comments: true
---

<iframe width="100%" height="300" src="https://www.youtube.com/embed/BwP3SIjHfZw" frameborder="0" allowfullscreen></iframe>

I am beginning work on an FEM based model for deforming and fracturing physics objects. Such a model requires that objects to be composed of assemblies of tetrahedrons (theoretically FEM could work on more complex element shapes than the tetrahedron, but I will make no such attempt :P).

In an effort to keep things real-time and prepare for GPU parallelization, I have required that my tetrahedral mesh implementation keep node and tetrahedron memory in contiguous arrays.
