---
title: Physics Engine - Week 7
layout: post
tags: [physics]
comments: true
---

At about week 7, I've decided to start logging the progress I make on this project, so that when it's done I can look back on how far I've come and feel like a proud father. It'll be so great.

So far the features I have are:

1. Dynamic AABB tree for broad phase interference.
2. GJK for narrow phase.
3. EPA for contact point generation.
4. Simple persistent contact manifolds.
5. Bad ass debug drawing.
6. Support for any convex mathematical geometry that you can describe with a `find_furthest` function.
7. Time control - the user can step forward (or backwards, up to a point) with perfect reproducibility.

<iframe width="100%" height="300" src="https://www.youtube.com/embed/DdGNYKwLcNQ" frameborder="0" allowfullscreen></iframe>

All those yellow and blue lines indicate the barycentric coordinates that are used to reconstruct contact points on the hulls of interfering objects. At the moment, the blue contact point is actually the one which is chosen to do the response impulse computation.

Next I gotta stress test all this stuff. I know my intersection cache and dynamic AABB tree can handle several hundred interfering objects without breaking a sweat, but I haven't profiled huge scenes like that since adding EPA or contact manifolds. EPA is a huge pain in the ass, and I'm betting that's gonna be my new bottleneck, which means it'll be time for some cladding.