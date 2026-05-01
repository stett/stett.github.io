---
title: GPU Constraint Solver - Part 2
subtitle: Improving Stability with an Augmented Lagrangian Method
layout: post
comments: false
math: true
---

In the [Part 1]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}), a basic Jacobi iteration was derived for a system of constraints. The [Jacobi method](https://en.wikipedia.org/wiki/Jacobi_method) was chosen for its suitability for parallelism on the GPU, which allowed me to scale up my simulation to 100k bodies and constraints in real time.

The last section of Part 1, I introduced the Buamgarte term to correct for constraint drift. However, this factor requires tuning. It can result in overly relaxed constraints if it's too low, and can make the system unstable if it's too high. In this part, I'll introduce a positional correction term to address the instabilities 

<!-- excerpt -->