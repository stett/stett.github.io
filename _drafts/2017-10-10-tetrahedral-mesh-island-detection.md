---
title: Detecting Islands in Tetrahedral Meshes
layout: post
tags: []
comments: true
---

<iframe width="100%" height="300" src="https://www.youtube.com/embed/BwP3SIjHfZw" frameborder="0" allowfullscreen></iframe>

I am beginning work on an FEM based model for deforming and fracturing physics objects. Such a model requires that objects to be composed of assemblies of tetrahedrons (theoretically FEM could work on more complex element shapes than the tetrahedron, but I will make no such attempt :P).

## Data Structure ##

In an effort to keep things real-time and prepare for GPU parallelization, I have required that my tetrahedral mesh implementation keep node and tetrahedron memory in _mostly_ contiguous arrays. This will make GPU data binding more feasible later on.

For mesh traversal, some adjacency information is needed between tetrahedrons. I have seen two methods used for this. One is to link nodes to tetrahedra, but this would require either that each node to contain dynamic data (a list of pointers to the elements which contain them), or that the number of tetrahedra per node is limited.

The other method is to track tetrahedron face adjacencies. Since each tetrahedron has at most four face-adjacencies, tetrahedron and node data can still be packed tightly in memory with a predictable stride.


