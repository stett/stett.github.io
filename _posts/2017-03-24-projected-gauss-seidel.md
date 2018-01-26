---
title: Rigidbody Physics Engine - Log 3 - MLCP Solver
layout: post
tags: [physics]
comments: true
---

This week I worked on building a solver for the (mixed) linear complementarity problem. I used the Projected Gauss Seidel iterative method, following [Catto's famous 2005 paper](http://www.bulletphysics.com/ftp/pub/test/physics/papers/IterativeDynamics.pdf).

To test it out, I've started with a hard-coded normal constraint against the ground plane. No friction or restitution factors yet, but it's super exciting to see it working!

<iframe width="100%" height="300" src="https://www.youtube.com/embed/g9SDhTBHgMc" frameborder="0" allowfullscreen></iframe>
