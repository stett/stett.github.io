---
title: GPU Constraint Solver - Part 2
subtitle: Improving Stability with a Position-Level Solve
layout: post
comments: false
math: true
---

In [Part 1]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}), I derived a basic Jacobi iteration for a system of constraints. The [Jacobi method](https://en.wikipedia.org/wiki/Jacobi_method) was chosen for its suitability for parallelism on the GPU, which allowed me to scale up my simulation to 100k bodies and constraints in real time.

In the last section of Part 1, I introduced the Baumgarte term to correct for constraint drift. However, this factor requires tuning. Too low a value yields overly relaxed constraints; too high a value makes the system unstable. The deeper issue is structural: Baumgarte correction operates in velocity space, where the stabilization gain interacts with mass, timestep, and constraint topology simultaneously. In this part, I'll introduce a positional correction strategy — a projection step — that operates directly on the constraint manifold, eliminating this coupling.

<!-- excerpt -->

We noted before that position-level constraints are physically enforced only via impulses at the velocity level, as dictated by the Lagrange equations of motion. In theory, constraint violation is a non-physical state, and constraint drift is only introduced by numerical imprecision. Therefore, our strategy for correcting constraint drift need not account for physical energies.

{% comment %}
Strategies like [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf) use a newton step on to find the zeroes of the mass-norm ($\lVert X - X^* \rVert_M$) of the constraint violation in order to 
{% endcomment %}

---
## Glossary of Terms

This article introduces new symbols in addition to those from [Part 1]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}).

| $\Delta X$ | Positional correction per Newton step, $\Delta X = X^{k+1} - X^k$ |
| $\gamma$ | Lagrange multiplier for the position solve, $\gamma \in \mathbb{R}^{3N_c}$ |
| $\gamma_\ell$ | Position multiplier for constraint $\ell$ (3-vector) |
| $s$ | Inner Jacobi iteration index (position solve only) |
| $A$ | In this article: the mass-free Delassus matrix $JJ^T \in \mathbb{R}^{3N_c \times 3N_c}$ (contrast with $JM^{-1}J^T$ from Part 1) |
| $D$ | Block-diagonal part of $JJ^T$ |

---

## Derivation
### The Newton Step

We want to enforce $C(X) = 0$ at the position level. A good iterative choice for finding the roots of a function is to use the [Newton-Raphson method](https://en.wikipedia.org/wiki/Newton%27s_method). For a scalar function of a scalar $f(x)$, this method says

$$
x^{k+1} = x^k - \frac{f(x^k)}{f'(x^{k})}
$$

We have a function that takes an $N_b$-dimensional vector and returns an $N_c$-dimensional vector. Recalling our identities for $J$, this iteration becomes

$$\begin{align}
X^{k+1} &= X^k - \left( \frac{\partial C}{\partial X} \right)^{-1} C(X^k)\\
\end{align}$$

However, $C$ and $X$ have different dimensions, so $\frac{\partial C}{\partial X}$ is a non-square matrix and cannot be inverted directly. Instead, we linearize $C(X^k + \Delta X) \approx 0$ around $X^k$, where $\Delta X = X^{k+1} - X^k$, and identify the linearization coefficient as $J$.

$$\begin{align}
J \Delta X^k &= -C(X^k)
\tag{1}
\end{align}$$

### Minimizing Positional Correction

The system in $(1)$ is underdetermined - that is, $\Delta X^k$ is the vector of variables for the system, and there are many values which may satisfy it. One way to approach such a system is to minimize $\Delta X^k$ using a new system of Lagrange multipliers. This is natural because it should provide the smallest change in $X$ which brings the system closer to $C(X) = 0$.

From this point on, we are talking about solving for the $\Delta X$ in a single Newton-Raphson iteration for solving $C(X) = 0$. It would be cumbersome to keep the iteration superscript $k$ around for every variable in the sections that follow — especially since we will soon introduce a nested iteration — so I will drop the $k$ superscripts for now.

We reconsider $(1)$ as a constraint on the minimization of $\lVert \Delta X \rVert^2$. Taking $\gamma$ to be a new vector of $N_c$ undetermined multipliers, we have a new Lagrangian

$$\begin{align}
L_X &= \lVert \Delta X \rVert^2 + 2\gamma^T \left( J \Delta X + C(X) \right)
\end{align}$$

I've added a factor of $2$ to $\gamma$ to avoid carrying a factor of $\tfrac{1}{2}$ in equation $(2)$. Since $\gamma$ is an undetermined multiplier, it can freely absorb constant factors.

To minimize this, we set $\nabla_{\Delta X} = 0$.

$$\begin{align}
0 &= \frac{\partial L_X}{\partial \Delta X}\\
&= 2 \Delta X + 2 J^T \gamma\\
\Delta X &= -J^T \gamma
\tag{2}
\end{align}$$

Substituting this back into the constraint equation $(1)$, we get the "inner" system.

$$\begin{align}
J J^T \gamma &= C(X)
\tag{3}
\end{align}$$

We will need to solve this for $\gamma$, which can then be substituted into $(2)$ in order to obtain $\Delta X$, the positional correction for this Newton step.

Note that because we used the neighbor-only approximation to decouple each $\gamma_\ell$, this system reduces to a single closed-form update per constraint — no inner iteration is required.

### The Jacobi Step

To solve the system in $(3)$, we form our new Jacobi step. Note that this is now a _second_ iterative layer within our algorithm: the outer loop is the Newton-Raphson iteration over $X$, and this inner loop solves for $\gamma$ at each Newton step. We use $s$ for this inner iteration index to distinguish it from the Newton iteration $k$.

Following the same process as in [part 1]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}), we come to the following iterative update rule for $\gamma$.

$$\begin{align}
\gamma^{s+1} &= D^{-1} \left(b - A \gamma^s \right) + \gamma^s
\tag{4}
\end{align}$$

where $A = J J^T$, $D$ is the matrix of diagonal blocks of $A$, and $b = C(X)$.

### Exploiting Sparsity Once Again

We now follow the exact steps from part one in order to compose a parallelizable update for $\gamma$. Using the same subscript notation as before, we'll call $\gamma_\ell$ the portion of $\gamma$ which corresponds to constraint $\ell$.

Making the same neighbor-only approximation when computing $\left(J J^T\right)_{\ell\ell}$, we start by computing an expression for the residual at constraint $\ell$.

$$\begin{align}
b_\ell - \left(A \gamma^s\right)_\ell &= C_\ell(X) - J_\ell J_\ell^T \gamma^s_\ell
\end{align}$$

We now plug this into $(4)$. Recognizing that $D_{\ell\ell} = A_{\ell\ell} = J_\ell J_\ell^T$, we have

$$\begin{align}
\gamma^{s+1}_\ell &= A_{\ell\ell}^{-1} \left(C_\ell(X) - J_\ell J_\ell^T \gamma^s_\ell \right) + \gamma^s_\ell\\
&= A_{\ell\ell}^{-1} C_\ell(X) - \gamma^s_\ell + \gamma^s_\ell\\
&= A_{\ell\ell}^{-1} C_\ell(X)
\end{align}$$

The $\gamma^s_\ell$ terms cancel exactly, leaving a closed-form update. We now have our new multiplier values for each constraint. For each body, we need to consider each constraint's contribution to the positional delta, in the same way as we did for the velocity.

$$\begin{align}
\Delta X^{s+1} = -\sum_\ell J_\ell^T \gamma^{s+1}_\ell
\end{align}$$


We have now derived an iterative position-correction strategy that reuses the existing structures of our velocity solver. As mentioned in the opening, it was an intentional choice not to consider energies in this derivation. Constraint violation is a non-physical state — just as the links of an unbroken chain must remain connected regardless of the load they carry, the position correction need not respect the energy balance of the bodies it moves.

More precisely, this solve minimizes $\lVert \Delta X \rVert^2$ (Euclidean distance in configuration space) rather than $\lVert \Delta X \rVert^2_M$ (mass-weighted distance). Because the correction is distributed equally across degrees of freedom regardless of body mass, the position solve is naturally suited to high mass-ratio systems — the mass-free Delassus matrix $JJ^T$ makes the correction mass-agnostic by design.

If we are less concerned with high mass ratios and wish to avoid allocating additional buffers for the new mass-free Delassus matrices ($JJ^T$ rather than $JM^{-1}J^T$), we could just as well reuse our previously computed $A_{\ell\ell} = \left(J M^{-1} J^T\right)_{\ell}$ matrices.

## Algorithm

I have moved through this derivation more quickly than in Part 1, since the position solve shares so much structure with the velocity solve. The final step is to integrate it into our previous algorithm. There are a number of approaches we could take, but for now I will start with the simplest: solve for position, and _then_ solve for velocity, with the most accurate possible linearization of the equations of motion at each stage. Later I may experiment with interleaved approaches, where position and velocity corrections are applied simultaneously, potentially reducing the total number of iterations needed for both to converge.

Let's begin by defining our new data structures, assuming the continuing presence of those defined in part 1.
```c++
vec3 position_multiplier[NC];
mat3 position_delassus_inv[NC];
```

And I'll rewrite the high-level algorithm as well, integrating the position update.
```c++
void update(float dt) {

    // recompute the constraint topology mappings
    // this is NOT a parallel algorithm, and should run once per topological update.
    if (/* topology has changed */) {
        compute_connectivity();
    }

    // update world space rotational inertia tensors
    parallel_for (int ib : body_indices)
        compute_inertia(ib);


    for (int iter = 0; iter < NPI; ++iter) {

        // since the position and orientation change on every iteration, the jacobians
        // and delassus inverses need to be recomputed as well, in order to
        // appropriately update undetermined multipliers for the position update.
        parallel_for (int ic : constraint_indices) {
            compute_violation(ic);
            compute_jacobian(ic);
            compute_position_delassus_inv(ic);
            update_position_multipliers(ic);
        }

        // adjust body positions for this iteration
        parallel_for (int ib : body_indices)
            update_position_delta(ib);
    }

    // update constraint violation, Jacobian matrix, and Delassus matrix for the
    // velocity solve.
    parallel_for (int ic : constraint_indices) {
        compute_jacobian(ic);
        compute_velocity_delassus_inv(ic);
    }

    // integrate forces to get "free" velocities
    parallel_for (int ib : body_indices)
        compute_free_velocity(ib, dt);

    // begin Jacobi velocity iterations
    for (int iter = 0; iter < NVI; ++iter) {

        // update lagrange multipliers (gather)
        parallel_for (int ic : constraint_indices)
            update_multipliers(ic, dt);

        // update velocities (scatter)
        parallel_for (int ib : body_indices)
            update_velocities(ib, dt);
    }

    // integrate velocities
    parallel_for (int ib : body_indices)
        compute_positions(ib);
}
```

Here's how the new and updated compute kernels may look.
```c++
void compute_position_delassus_inv(ic) {
    mat3 jw0 = jacobian[ic].w0;
    mat3 jw1 = jacobian[ic].w1;
    mat3 A_ll = (jw0 * jw0) - (jw1 * jw1);
    delassus_inv[ic] = inverse(A_ll);
}

void compute_position_multipliers(ic) {
    int b0 = ib0[ic];
    int b1 = ib1[ic];
    position_multiplier[ic] = position_delassus_inv * violation[ic];
}

void compute_position_delta(ib) {
    int start = ic0[ib];
    int end = ic0[ib + 1]; // sentinel ic0[NB] = NC*2 makes this safe for the last body
    for (int iic = start; iic < end; ++iic) {
        int ic = constraint_list[iic];
        bool is_body0 = (ib == ib0[ic]);
        mat3 jx = is_body0 ? mat3(1.0) : mat3(-1.0);
        mat3 jw = is_body0 ? jacobian[ic].w0 : jacobian[ic].w1;
        pos_delta[ib] = -(jx + jw) * position_multiplier[ic];
    }
}
```