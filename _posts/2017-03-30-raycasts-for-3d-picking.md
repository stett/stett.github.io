---
title: Physics Engine, Week 10 - 3D Picking With Raycasts
layout: post
tags: [physics]
comments: true
---

Raycasting existed in my engine since week 2, but today I finally used it to add a debug spring constraint between the mouse and clicked rigidbodies.

<iframe width="100%" height="300" src="https://www.youtube.com/embed/8ZiuQ8AAdcI" frameborder="0" allowfullscreen></iframe>

More importantly, I've re-written my Projected Gauss Seidel MLCP solver about four times now, and I'm finally getting kind of close to something I like. My goal is to have a constraint system where each constraint can house multiple rows in the Jacobian (in other words, a "constraint" can describe more than one constrained degree of freedom).

In the video above, friction is disabled, but there is a slight damping force. Also, the little white dots which appear along the rays indicate interference with the cube's broad-phase AABB tree.
