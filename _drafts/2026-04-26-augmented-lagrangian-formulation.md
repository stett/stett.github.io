---
title: GPU Constraint Solver - Part ?
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
0 &= M \dot V - F + J^T \lambda - \mu J^T C(X)
\end{align}$$

After time discretization, we have

$$\begin{align}
M V_{n+1} + h J^T \lambda - h \mu J^T C(X) &= M V^*\\
J V_{n+1} &= 0
\end{align}$$

First we solve the system for $V_{n+1}$.

$$\begin{align}
M V_{n+1} + h J^T \lambda - h \mu J^T C(X) &= M V^*\\
V_{n+1} &= V^* - h M^{-1} J^T \lambda + h \mu M^{-1} J^T C(X)
\end{align}$$

Now we plug this into our second equation to get a linear system in $\lambda$.

$$\begin{align}
0 &= J V_{n+1}\\
&= J V^* - h J M^{-1} J^T \lambda + h \mu J M^{-1} J^T C(X)\\
J M^{-1} J^T \lambda &= h^{-1} J V^* + \mu J M^{-1} J^T C(X)
\end{align}$$

Now our linear system is

$$\begin{align}
A \lambda &= b\\
A &= J M^{-1} J^T\\
b &= h^{-1} J V^* + \mu J M^{-1} J^T C(X)\\
&= h^{-1} J V^* + \mu A C(X)\\
\end{align}$$

Finally we must decompose $A$ for our Jacobi step. Taking $D$ and $E$ to be the diagonal and off-diagonal parts of $A$, and skipping steps that were covered earlier, we have

$$\begin{align}
A &= D + E\\
\lambda^{k+1} &= D^{-1}(b - A \lambda^k) + \lambda^k
\end{align}$$

Remember that $D$ is made up of the diagonal blocks of $A_{\ell\ell} = J_\ell M^{-1} J_\ell^T$. To get the iteration for $\lambda_\ell$, we start by substituting prior definitions into $b_\ell - (A \lambda^k)_\ell$.


The $\ell$-th block of $AC(X)$ is $\sum_m A_{\ell m}C_m(X)$, coupling constraint $\ell$ to all neighboring constraints through shared bodies. Consistent with the per-constraint Jacobi update we derived in part 1, we drop the off-diagonal terms, keeping only $A_{\ell\ell}C_\ell(X)$.

$$\begin{align}
b_\ell - (A \lambda^k)_\ell &= h^{-1} J_\ell V^* + \mu A_{\ell\ell} C_\ell(X) - J_\ell M^{-1} J^T \lambda^k\\
&= h^{-1} J_\ell \left( V^k + h M^{-1} J^T \lambda^k \right) + \mu A_{\ell\ell} C_\ell(X) - J_\ell M^{-1} J^T \lambda^k\\
&= h^{-1} J_\ell V^k + \mu A_{\ell\ell} C_\ell(X)
\end{align}$$

Then the multiplier iteration for constraint $\ell$ is

$$\begin{align}
\lambda_\ell^{k+1} &= \lambda_\ell^k + A_{\ell\ell}^{-1}\left( b_\ell - (A \lambda^k)_\ell \right)\\
&= \lambda_\ell^k + A_{\ell\ell}^{-1}\left( h^{-1} J_\ell V^k + \mu A_{\ell\ell} C_\ell(X) \right)\\
&= \lambda_\ell^k + h^{-1} A_{\ell\ell}^{-1} J_\ell V^k + \mu C_\ell(X)
\end{align}$$

And the velocity iteration is the same as before

$$
\begin{align}
V^{k+1} &= V^* - hM^{-1}\sum_\ell J_\ell^T \lambda_\ell^{k+1}
\end{align}
$$

Comparing this to our expression for $\lambda_\ell^{k+1}$ when we used a Baumgarte correction term, we can see that we have replaced $h^{-1} A_{\ell\ell}^{-1} \beta$ with $\mu$. In our new formulation, the drift correction is now uniform across all constraints, without prefering ones with higher inertia. This in itself could potentially be useful to make tuning of $\mu$ a little bit easier and more general. The tradeoff is that we lose the known boundary which we had for $\beta$ for smooth convergence (however as we have seen, even within those bounds solutions may be unstable).

However, there's an additional advantage here. In augmented Lagrangian methods, $\mu$ does not need to be a constant - it just needs to be greater than zero in order to improve the convexity of the constraint. It typically starts small in order to reduce the chances that a solver iteration overshoots, and is increased with each iteration as the solver approches a minimum. The amount by which it is increased per iteration may be any amount. I'll take a page out of the recent [AVBD](https://graphics.cs.utah.edu/research/projects/avbd/Augmented_VBD-SIGGRAPH25_RTL.pdf) paper, and suggest increasing $\mu$ by an amount per constraint which scales with the corresponding constraint violation.

The updated $\lambda$ and $\mu$ iterations are

$$\begin{align}
\lambda_\ell^{k+1} &= \lambda_\ell^k + h^{-1} A_{\ell\ell}^{-1} J_\ell V^k + \mu_\ell^k C_\ell(X)\\
\mu_\ell^{k+1} &= \mu_\ell^k + \beta \left| C_\ell(X) \right|\\
\end{align}$$

where $\beta$ is now repurposed as a parameter which controls the growth rate of $\mu$.

$$\begin{align}
\end{align}$$
