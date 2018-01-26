---
title: Rigidbody Physics Engine - Log 5 - Box Stacking
layout: post
tags: [physics]
comments: true
---

Feels good to finally have some stacked boxes!

<iframe width="100%" height="300" src="https://www.youtube.com/embed/TNd6TusoSto" frameborder="0" allowfullscreen></iframe>

The biggest, most obvious missing factor is friction. That is next on the agenda - should come almost for free when I refactor my PGS block solver (yet again :|).

There are many optimizations needed still in order to get more interesting interactions going. My PGS (constraint resolution) implementation is still fairly slow and currently the tightest bottleneck. Close second place is EPA (contact generation), which is due to get spruced up soon anyway.
