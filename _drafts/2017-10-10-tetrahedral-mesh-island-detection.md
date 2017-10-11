---
title: Detecting Islands in Tetrahedral Meshes
layout: post
tags: []
comments: true
---

In the following video a teapot made from 149210 tetrahedra is generated from a regular surface-bounded mesh. Fifty tetrahedra are removed each frame. After each removal the mesh is traversed in search of "islands" - groups of adjacent tetrahedra which share no faces with other groups - which are indicated by color.

<iframe width="100%" height="300" src="https://www.youtube.com/embed/BwP3SIjHfZw" frameborder="0" allowfullscreen></iframe>

I am beginning work on an FEM based model for deforming and fracturing physics objects. Such a model requires that objects to be composed of assemblies of tetrahedrons (theoretically FEM could work on more complex element shapes than the tetrahedron, but I will make no such attempt :P).

## Data Structure ##

In an effort to keep things real-time and prepare for GPU parallelization, I have required that my tetrahedral mesh implementation keep node and tetrahedron memory in _mostly_ contiguous arrays. This will make GPU data binding more feasible later on.

For mesh traversal, some adjacency information is needed between tetrahedrons. I have seen two methods used for this. One is to link nodes to tetrahedra, but this would require either that each node to contain dynamic data (a list of pointers to the elements which contain them), or that the number of tetrahedra per node is limited.

The other method is to track tetrahedron face adjacencies. Since each tetrahedron has at most four face-adjacencies, tetrahedron and node data can still be packed tightly in memory with a predictable stride.

## Algorithms ##

Removal of a tetrahedron is simple, and can be done in constant time. The removal of tetrahedron `i` is performed by moving the last tetrahedron (indexed by `n-1` where `n` is the number of tetrahedra) into slot `i`, and correcting it's neighboring tetrahedra' adjacencies. This can be done in constant time.

Traversing the structure for the detection and removal of an island is fairly straight forward. I use a stack rather than recursion, and record the indexes of traversed tetraheda and nodes using two large bitmasks.

When a node is copied into a new mesh, it's index will have changed, and so the indexes stored in each copied tetrahedron which references that node must also change. A simple array of integers, constructed during node-copy, can be used to map the old indexes to the new ones.

Tetrahedron indexes will also change. The same index-mapping method is used to update tetrahedron neighbors in the new mesh.

Each of the traversal/island removal phases has a complexity of `O(N)` where `N` is the number of nodes.


