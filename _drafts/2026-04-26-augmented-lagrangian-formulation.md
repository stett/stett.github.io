---
title: GPU Constraint Solver - Part 2
subtitle: Improving Stability with an Augmented Lagrangian Method
layout: post
comments: false
math: true
---

In the [previous part]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}), a basic Jacobi iteration was derived for a system of constraints. The [Jacobi method](https://en.wikipedia.org/wiki/Jacobi_method) was chosen for its suitability for parallelism on the GPU, which allowed me to scale up my simulation to 100k bodies and constraints in real time.

In this part, I'll rederive the iteration using an [augmented Lagrangian method](https://en.wikipedia.org/wiki/Augmented_Lagrangian_method), which will improve the stability of the solve.

<!-- excerpt -->

In the derivation of part 1 I showed that constraint violation which is introduced by numeric drift is not resolved by the physically derived iteration, which solves $\dot C(X) = 0$, but not $C(X) = 0$. To address this, a control factor $\beta$ is introduced, $\dot C(X) = -\beta C(X)$. This updated ODE theoretically will cause the process to exponentially converge to $C(X) = 0$, but depending on the specifics of the constraint $C(X)$, the time step $h$, and the value of $\beta$, this can inject energy and therefore instability into the system.

TODO: Add rationale!... for now, i'll just start with the agumented Lagrangian and compute.

The augmented Lagrangian is

$$\begin{align}
L &= K - U - \lambda C(X) + \frac{1}{2}\mu C^2(X)\\
&= \frac{1}{2}V^T M V - U(X) - \lambda C(X) + \frac{1}{2}\mu C^2(X)
\end{align}$$

This trickles through our derivation, starting with the equation of motion.

$$\begin{align}
0 &= M \dot V - F + J^T \lambda - \mu C(X)
\end{align}$$

After time discretization, we have

$$\begin{align}
M V_{n+1} + h J^T \lambda - h \mu C(X) &= M V^*\\
J V_{n+1} &= 0
\end{align}$$

First we solve the system for $V_{n+1}$.

$$\begin{align}
M V_{n+1} + h J^T \lambda - h \mu C(X) &= M V^*\\
V_{n+1} &= V^* - h M^{-1} J^T \lambda + h \mu C(X)
\end{align}$$

Now we plug this into our second equation to get a linear system in $\lambda$.

$$\begin{align}
0 &= J V_{n+1}\\
&= J V^* - h J M^{-1} J^T \lambda + h \mu J C(X)\\
J M^{-1} J^T \lambda &= h^{-1} J V^* + \mu J C(X)
\end{align}$$

Now our linear system is

$$\begin{align}
A \lambda &= b\\
A &= J M^{-1} J^T\\
b &= h^{-1} J V^* - \mu J C(X)
\end{align}$$

Finally we must decompose $A$ for our Jacobi step. Taking $D$ and $E$ to be the diagonal and off-diagonal parts of $A$, and skipping steps that were covered earlier, we have

$$\begin{align}
A &= D + E\\
\lambda^{k+1} &= D^{-1}(b - A \lambda^k) + \lambda^k
\end{align}$$

Remember that $D$ is made up of the diagonal blocks of $A_{\ell\ell} = J_\ell M^{-1} J_\ell^T$. To get the iteration for $\lambda_\ell$, we start by substituting prior definitions into $b_\ell - (A \lambda^k)_\ell$.


$$\begin{align}
b_\ell - (A \lambda^k)_\ell &= h^{-1} J_\ell V^* - \mu J_\ell C(X) - J_\ell M^{-1} J_\ell^T \lambda_\ell^k\\
&= h^{-1} J_\ell \left( V^k + h M^{-1} J_\ell^T \lambda^k \right) - \mu J_\ell C(X) - J_\ell M^{-1} J_\ell^T \lambda_\ell^k\\
&= h^{-1} J_\ell V^k + \mu J_\ell C(X)
\end{align}$$

Then the multiplier for constraint $\ell$, is

$$\begin{align}
\lambda_\ell^{k+1} &= \lambda_\ell^k + A_{\ell\ell}^{-1}\left( b_\ell - (A \lambda^k)_\ell \right)\\
&= \lambda_\ell^k + A_{\ell\ell}^{-1}\left( h^{-1} J_\ell V^k + \mu J_\ell C(X) \right)
\end{align}$$


$$\begin{align}
\end{align}$$

$$\begin{align}
\end{align}$$
