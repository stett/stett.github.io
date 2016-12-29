---
title: Finding The "Change In Rotation" Quaternion (plus a springy demo with boxes!)
layout: post
tags: [math, physics]
comments: true
---

[ INSERT VIDEO ]

When working with numeric rigid body physics simulations in 2D, it's as straightforward to update the rotation of a body as it is its linear position. In 3D, it's not *difficult* per se, but it can be much less immediately clear how to go about it, particularly if your basic transform is stored as a quaternion. This was a sticking point for me when developing the demo in the video above.

Below I'll derive the change-in matrix, and then the change-in quaternion. The methods are analogical 