---
title: Rigidbody Physics Engine - Log 7 - Cached Constraint Results
layout: post
tags: [physics]
comments: true
---

<iframe width="100%" height="300" src="https://www.youtube.com/embed/fMWOUx76eNs?t=40s" frameborder="0" allowfullscreen></iframe>


The Jenga tower on the left uses a warm starting technique which begins the MLCP solver with the results from the previous frame. The tower on the right begins from zero each frame.

It's not shown here, but after a full five minutes of running, the left tower still hasn't collapsed. The right tower collapses in around 50 seconds.

Warm starting helps in frame-coherent situations like this because the MLCP solver is built to iteratively converge on a solution, but has a finite number of allowed iterations. With lots of stacking, the iterations get truncated before a full solution is reached. If the solver is warm-started, each frame the final solution will be closer to the correct one in a highly coherent scene.
