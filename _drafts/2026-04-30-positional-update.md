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

---
## Glossary of Terms

TODO

---

## Derivation
### The Newton Step

We want to enforce $C(X) = 0$ at the position level. A good iterative choice for finding the roots of a function is to use the [Newton-Raphson method](https://en.wikipedia.org/wiki/Newton%27s_method). For a scalar function of a scalar $f(x)$, this method says

$$
x^{k+1} = x^k - \frac{f(x^k)}{f'(x^{k})}
$$

We have a function which takes a $N_B$-vector and gives an $N_C$-vector. Recalling our identities for $J$, this iteration becomes

$$\begin{align}
X^{k+1} &= X^k - \left( \frac{\partial C}{\partial X} \right)^{-1} C(X^k)\\
\end{align}$$

However, we know that the dimensions of $C$ and $X$ are not the same - the gradient in that expression will not be invertable. Therefore, we rearrange this in terms of $\Delta X = X^{k+1} - X^k$, take the gradient to the other side, and identify it as $J$.

$$\begin{align}
J \Delta X^k &= -C(X^k)
\tag{1}
\end{align}$$

### Minimizing Positional Correction

The system in $(1)$ is underdetermined - that is, $\Delta X^k$ is the vector of variables for the system, and there are many values which may satisfy it. One way to approach such a system is to minimize $\Delta X^k$ using a new system of Lagrange multipliers. This is natural because it should provide the smallest change in $X$ which brings the system closer to $C(X) = 0$.

From this point on, we are talking about solving for the $\Delta X$ in a single Newton-Raphson iteration for solving $C(X) = 0$. It would be cumbersome to keep the iteration superscript $k$ around for ever variable in the sections that follow (especially since we will soon be introducing a nested iteration), and so I will drop the $k$ superscripts for now.

We reconsider $(1)$ as a constraint on the minimization of $\lVert \Delta X \rVert^2$. Taking $\gamma$ to be a new vector of $N_C$ undetermined multipliers, we have a new Lagrangian

$$\begin{align}
L_X &= \lVert \Delta X \rVert^2 + 2\gamma^T \left( J \Delta X + C(X) \right)
\end{align}$$

I've added a factor of $2$ to $\gamma$ in order to cancel out a factor in the upcoming derivation. This is valid because $\gamma$ is just an undetermined multiplier, and can "absorb" the factor of $1/2$, simplifying our equations.

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

We will need to solve this for $\gamma$, which can then be substituted into $(2)$ in order to 

### The Jacobi Step

To solve the system in $(3)$, we form our new Jacobi step. To help keep the reader oriented, this is now a _second_ iterative layer to our solution algorithm for finding the roots of $C(X)$.

Following the same process which we did in [part 1]({% post_url 2026-04-17-gpu-jacobi-solver-for-rigid-body-point-constraints %}), we come to the following iterative update rule for $\gamma$.

$$\begin{align}
\gamma^{l+1} &= D^{-1} \left(b - A \gamma^l \right) + \gamma^l
\tag{4}
\end{align}$$

where $A = J J^T$, $D$ is the matrix of diagonal blocks of $A$, and $b = 2 C(X)$.

### Exploiting Sparsity Once Again

We now follow the exact steps from part one in order to compose a parallelizeable update for $\gamma$. Using the same subscript notation as before, we'll call $\gamma_\ell$ the portion of $\gamma$ which corresponds to constraint $\ell$.

Making the same neighbor-only approximation when computing $\left(J J^T\right)_{\ell\ell}$, I'll start by computing an expression for the residual at constraint $\ell$.

$$\begin{align}
b_\ell - \left(A \gamma^l\right)_\ell &= C_\ell(X) - J_\ell J_\ell^T \gamma^l_\ell
\end{align}$$

We now plug this into $(4)$. Recognizing that $D_{\ell\ell} = A_{\ell\ell} = J_\ell J_\ell^T$, we have

$$\begin{align}
\gamma^{l+1}_\ell &= A_{\ell\ell}^{-1} \left(C_\ell(X) - J_\ell J_\ell^T \gamma^l_\ell \right) + \gamma^l_\ell\\
&= 2 A_{\ell\ell}^{-1} C_\ell(X)
\end{align}$$

We now have our new multiplier values for each constraint on this iteration. For each body, we need to consider each constraints contribution to the positional delta, in exactly the same manner that we did for the velocity.

$$\begin{align}
\Delta X^{l+1} = -\sum_\ell J_\ell^T \gamma^{l+1}_\ell
\end{align}$$


We have now developed an iterative strategy which can use the existing structures of our velocity solver to solve for position as well. As mentioned in the opening of this article, it was an intentional choice not to consider energies in this derivation, because violation of any constraint is "non-physical" - if the links of a chain are not broken, they should no more separate from each other than the heavy load on the end of the chain.

In fact, if we want to be able to solve systems with high mass ratios, we may well prefer a zero-energy position solve like this. However if we are less concerned with high mass ratios and wish to avoid taking up more buffers with our new, massless delassus matrices, we could just as well use our previously computed $A_{\ell\ell} = \left(J M^{-1} J^T\right)_{\ell}$ matrices.

## Algorithm

I've rushed through this derivation a bit faster than the velocity solve because it shares many similarities. The final step now is to integrate it into our previous algorithm. There are a number of approaches that we could take, but for now I will start with the following overall idea of solving for position, and _then_ solving for velocity, with the most accurate possible linearization of the equations of motion. Later I may experiment with interleaved approaches which may reduce iteration count.

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
            update_positions(ib);
    }

    // update constraint violation, Jacobian matrix, and Delassus matrix for the
    // velocity solve.
    parallel_for (int ic : constraint_indices) {
        compute_violation(ic);
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