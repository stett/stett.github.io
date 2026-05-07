---
title: GPU Constraint Solver - Part 2
subtitle: Improving Stability with a Position-Level Solve
layout: post
comments: false
math: true
---

In the [Part 1]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}), a basic Jacobi iteration was derived for a system of constraints. The [Jacobi method](https://en.wikipedia.org/wiki/Jacobi_method) was chosen for its suitability for parallelism on the GPU, which allowed me to scale up my simulation to 100k bodies and constraints in real time.

The last section of Part 1, I introduced the Buamgarte term to correct for constraint drift. However, this factor requires tuning. It can result in overly relaxed constraints if it's too low, and can make the system unstable if it's too high. In this part, I'll introduce a positional correction strategy, a projection step, to address the instabilities.

<!-- excerpt -->

We noted before that position-level constraints are only physically enforced through impulses at the velocity level through the Lagrange equations of motion. In theory, constraint violation is a non-physical state, and constraint drift is only introduced by numerical imprecision. Therefore, our strategy for correcting constraint drift shouldn't need to concern itself with physical energies.

{% comment %}
Strategies like [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf) use a newton step on to find the zeroes of the mass-norm ($\lVert X - X^* \rVert_M$) of the constraint violation in order to 
{% endcomment %}

We want to enforce $C(X) = 0$ at the position level. A good iterative choice for finding the roots of a function is to use the [Newton-Raphson method](https://en.wikipedia.org/wiki/Newton%27s_method). For a scalar function of a scalar $f(x)$, this method says

$$
x^{k+1} = x^k - \frac{f(x^k)}{f'(x^{k})}
$$

We have a function which takes a $N_B$-vector and gives an $N_C$-vector. Recalling our identities for $J$, this iteration becomes

$$\begin{align}
X^{k+1} &= X^k - \left( \frac{\partial C}{\partial X}\right )^{-1} C(X)\\
&= X^k - J^+ C(X)
\end{align}$$

Because $J$ is not invertible in the general case, I'm using the [psuedo-inverse](https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse), which is denoted $J^+$. The pseudo-inverse is defined as

$$
J^+ = J^T (J J^T)^{−1}
$$

Recalling the jacobians $J_\ell$ of a ball joint to be

$$
J_\ell =
    \begin{bmatrix}
        I_3 & -\left[R(q_{i\ell}) r^0_\ell\right]_\times & -I_3 & \left[R(q_{j\ell}) r^1_\ell\right]_\times
    \end{bmatrix}
$$

...

Relying on the identity for skew symmetric matrices,

$$\begin{align}
\left[r\right]_\times^2 &= r r^T - \lVert r \rVert^2 I_3\\
\end{align}$$

we have

$$\begin{align}
J_\ell J_\ell^T
    &= 2 I_3 + \left[R(q_{i\ell}) r^0_\ell\right]_\times^2 + \left[R(q_{j\ell}) r^1_\ell\right]_\times^2\\

    &= \left(2 - \lVert r^0_\ell \rVert^2 - \lVert r^1_\ell \rVert^2 \right) I_3 \\&+
    R(q_{i\ell}) \left(r^0_\ell {r^0_\ell}^T\right) R(q_{i\ell})^T  \\&+
    R(q_{j\ell}) \left(r^1_\ell {r^1_\ell}^T\right) R(q_{j\ell})^T \\

\end{align}$$