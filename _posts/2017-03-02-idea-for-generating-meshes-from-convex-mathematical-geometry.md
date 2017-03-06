---
title: Generating Quick & Dirty Meshes From Convex Mathematical Geometry
layout: post
tags: [physics, graphics]
comments: true
---

Last week I worked on an implementation of the [GJK](https://en.wikipedia.org/wiki/Gilbert%E2%80%93Johnson%E2%80%93Keerthi_distance_algorithm) and [EPA](http://www.dyn4j.org/2010/05/epa-expanding-polytope-algorithm/) agorithms using purely mathematical volumes. Each shape is defined only by a `find_furthest` (or `get_support`) function, which returns its extent in a direction.

While this is a nice and useful way to define geometry for those particular interference algorithms, it would be really nice to be able to actually *see* the geometry for debugging. To do this, a mesh approximation must be generated using only a `find_furthest` function.

My idea is to use an algorithm similar to an [icosphere generator](https://schneide.wordpress.com/2016/07/15/generating-an-icosphere-in-c/). I start with an icosahedron and push each vertex to the extents of the object. On each iteration, subdivide any triangles which have some minium area (or in which any two of the vertexes are beyond some threshold distance to each other), and combine any vertexes which are within a threshold distance of each other. The idea is to quickly generate a mesh which fills in high-detail areas with more polygons and leaves planar areas simple.

![A Meshed Minkowski Sum]({{ site.url }}/assets/convex-geometric-volumes.png)

In this shot, three different geometries were meshed using this method - they are drawn using white wireframes. A cube, a sphere, and a sphere-swept cube (which is just the [Minkowski sum](https://en.wikipedia.org/wiki/Minkowski_addition) of the two). The wireframe for the plain old sphere is mostly masked by its non-debug mesh in this picture :P

Here are a few more.

![Some interfering objects]({{ site.url }}/assets/sphere-swept-shapes.png)

#### Notes:

* The `find_furthest(direction)` functions are fairly simple, especially with the convention that `direction` is given in the space of the object. For a point primitive, for example, `find_furthest` will always return the origin. For a line segment, it will always return one of the endpoints (whichever is most aligned with `direction`). For a sphere, it will return a vector of the length of its radius, aligned with `direction`.

* Minkowski sums are easily obtained by simply adding the results of the `find_furthest` functions of two primitives.
