---
name: Exact global coupling for augmented Lagrangian position correction
description: Idea for computing the full inter-constraint coupling term in the augmented Lagrangian GPU solver at O(N) cost, using the existing scatter/gather kernel structure
type: project
---

In the augmented Lagrangian Jacobi solver, the per-constraint update is:

$$\lambda_\ell^{k+1} = \lambda_\ell^k + h^{-1}A_{\ell\ell}^{-1}J_\ell V^k + \mu C_\ell(X)$$

The $\mu C_\ell(X)$ term comes from a diagonal block approximation: $(AC(X))_\ell \approx A_{\ell\ell}C_\ell(X)$, dropping cross-constraint coupling in the position correction.

**Why:** $A_{\ell m} = J_\ell M^{-1}J_m^T$ is nonzero only when constraints $\ell$ and $m$ share a body — $A$ is as sparse as the constraint graph (block-tridiagonal for a chain). So the exact term $(AC(X))_\ell = J_\ell M^{-1}J^T C(X)$ can be computed at O(N_c) cost with two passes already present in the algorithm:

1. **Violation scatter pass** (run once per timestep, before the iteration loop — same structure as the velocity pass but with $C_m(X)$ in place of $\lambda_m$): for each body, accumulate
   $$p_i = M_i^{-1}\sum_{m:\, i \in \{i_m, j_m\}} J_m^T C_m(X)$$
2. **Gather in the lambda pass**: read $p_{i_\ell}$ and $p_{j_\ell}$ and compute $J_\ell p = J_\ell M^{-1}J^T C(X)$ exactly.

$C(X)$ is fixed for the entire iteration loop (violation at timestep start), so the scatter only runs once. The existing CSR structure handles both passes identically.

**Result:** replaces the diagonal-only $\mu C_\ell(X)$ with the exact $\mu(AC(X))_\ell$, coupling each constraint's position correction to its graph neighbors. Converges to the true augmented Lagrangian solution rather than the decoupled approximation.

**Why:** Worth exploring as a potential stability/accuracy improvement, especially for stiff chains or dense constraint graphs. Cost: one extra O(N_c) pass per timestep.
