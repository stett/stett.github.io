---
title: GPU Constraint Solver - Part 2
subtitle: Improving Stability with an Augmented Lagrangian Method
layout: post
comments: false
math: true
---

In the [previous part]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}), a basic Jacobi iteration was derived for a system of constraints. The [Jacobi method](https://en.wikipedia.org/wiki/Jacobi_method) was chosen for its suitability for parallelism on the GPU, which allowed me to scale up my simulation to 100k bodies and constraints in real time.

In that derivation I showed that constraint violation which is introduced by numeric drift is not resolved by the physically derived iteration, which solves $\dot C(X) = 0$, but not $C(X) = 0$. To address this, a control factor $\beta$ is introduced, $\dot C(X) = -\beta C(X)$. This updated ODE theoretically will cause the process to exponentially converge to $C(X) = 0$, but depending on the specifics of the constraint $C(X)$, the time step $h$, and the value of $\beta$, this can inject energy and therefore instability into the system.