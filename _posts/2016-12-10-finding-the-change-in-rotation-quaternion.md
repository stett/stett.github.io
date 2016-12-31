---
title: Finding The "Change In Rotation" Quaternion (plus a springy demo with boxes!)
layout: post
tags: [math, physics]
comments: true
math: true
---

[ INSERT VIDEO ]

When working with numeric rigid body physics simulations in 2D, it's as straightforward to update the rotation of a body as it is its linear position. In 3D, it's not *difficult* per se, but it can be much less immediately clear how to go about it, particularly if your basic transform is stored as a quaternion. This was a sticking point for me when developing the demo in the video above.

Below I'll derive the change-in matrix, and then the change-in quaternion. The methods result in similar performance when used with the matching rotation representation. Note that I'm only developing this mathematically for explicit, Euler integrators, although it could be pretty simply adapted to other forms of integration.

Matrix
------

If the positions of a vertex in local and world space are $$\vec{q}$$ and $$\vec{r}$$, and the center of rotation of the body to which it belongs is $$\vec{c}$$, then they are related by