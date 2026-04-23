---
title: A Minimal GPU Jacobi Solver for Rigid Body Point Constraints
layout: post
comments: false
math: true
---

This post contains my derivation notes for the Jacobi iteration of a system of spherical rigid bodies constrained together in a chain by "point" constraints (ie. ball joints) - ie. a pearl necklace :). I've been working on a little framework project for comparing different GPU based physics solvers, and this is meant to be a solver/scene which can function as a baseline by which to compare the stability and performance of various solvers.

I'm sticking with a specific, very simple constraint type for the scope of this derivation for concreteness, and so that it can immediately map to an actual simulation.

The result? A _mostly_ stable chain of heavy looking beads:

---
## Glossary of Terms

This table lists every mathematical symbol used in the derivation that follows.

| $$N_b$$ | Number of rigid bodies in the system |
| $$N_c$$ | Number of constraints |
| $$h$$ | Timestep (delta time) |
| $$n$$ | Current timestep index |
| $$k$$ | Jacobi iteration index |
| $$\ell$$ | Constraint index |
| $$i, j$$ | Body indices (generic) |
| $$i_\ell, j_\ell$$ | Indices of the two bodies connected by constraint $$\ell$$ |
| $$x_i$$ | World-space position of body $$i$$ |
| $$q_i$$ | Unit quaternion orientation of body $$i$$ |
| $$\dot x_i$$ | Linear velocity of body $$i$$ |
| $$\omega_i$$ | Angular velocity of body $$i$$ (world space) |
| $$m_i$$ | Scalar (linear) mass of body $$i$$ |
| $$I_i$$ | World-space rotational inertia tensor of body $$i$$ |
| $$R(q)$$ | Rotation operator: rotates a vector by unit quaternion $$q$$ |
| $$[v]_\times$$ | Cross-product matrix of $$v$$, satisfying $$[v]_\times u = v \times u$$ |
| $$\otimes$$ | Quaternion multiplication |
| $$X$$ | System configuration state, $$X \in \mathbb{R}^{7N_b}$$ |
| $$V$$ | Generalized velocity vector, $$V \in \mathbb{R}^{6N_b}$$ |
| $$M$$ | Block-diagonal generalized mass matrix, $$M \in \mathbb{R}^{6N_b \times 6N_b}$$ |
| $$F$$ | Generalized force vector |
| $$L$$ | Lagrangian, $$L = K - U$$ |
| $$K$$ | Kinetic energy |
| $$U$$ | Potential energy |
| $$r^0_\ell, r^1_\ell$$ | Local-space attachment points of constraint $$\ell$$ on bodies $$i_\ell$$ and $$j_\ell$$ |
| $$c_\ell$$ | Constraint function for constraint $$\ell$$ (3-vector) |
| $$C(X)$$ | Full constraint vector (stack of all $$c_\ell$$), $$C \in \mathbb{R}^{3N_c}$$ |
| $$J$$ | Constraint Jacobian, $$J \in \mathbb{R}^{3N_c \times 6N_b}$$, defined by $$\dot C = JV$$ |
| $$J_\ell$$ | Rows of $$J$$ for constraint $$\ell$$, $$J_\ell \in \mathbb{R}^{3 \times 6N_b}$$ |
| $$\lambda$$ | Lagrange multiplier vector, $$\lambda \in \mathbb{R}^{3N_c}$$ |
| $$\lambda_\ell$$ | Lagrange multiplier for constraint $$\ell$$ (3-vector) |
| $$\lambda^k$$ | Lagrange multiplier estimate at Jacobi iteration $$k$$ |
| $$V^*$$ | Free velocity: velocity after force integration, before constraint solve |
| $$V^k$$ | Velocity estimate at Jacobi iteration $$k$$ |
| $$A$$ | Delassus matrix, $$A = JM^{-1}J^T \in \mathbb{R}^{3N_c \times 3N_c}$$ |
| $$A_{\ell\ell}$$ | Diagonal $$3 \times 3$$ block of $$A$$ for constraint $$\ell$$ |
| $$b$$ | Constraint RHS vector, $$b = h^{-1}JV^* \in \mathbb{R}^{3N_c}$$ |
| $$D$$ | Block-diagonal part of $$A$$ (Jacobi splitting) |
| $$E$$ | Off-block-diagonal part of $$A$$ (Jacobi splitting) |

---
## Derivation
### Definitions

We will start by defining our terms. In a system with $$N_b$$ rigid bodies, the $$i$$th body will have a position $$x_i$$ and quaternion rotation $$q_i$$. Its linear and angular velocities are $$\dot x_i$$ and $$\omega_i$$.

The configuration and velocity states of the system are

$$\begin{align}
X &= \begin{bmatrix} x_0 & q_0 & x_1 & q_1 & \dots & x_{N_b-1} & q_{N_b-1} \end{bmatrix}^T\\
V &= \begin{bmatrix} \dot x_0 & \omega_0 & \dot x_1 & \omega_1 & \dots & \dot x_{N_b-1} & \omega_{N_b-1} \end{bmatrix}^T
\end{align}$$

$$X \in \mathbb{R}^{7N_b}$$ uses unit quaternions for rotation (7 components per body). $$V \in \mathbb{R}^{6N_b}$$ is the generalized velocity (6 components per body), using angular velocity $$\omega_i$$ rather than $$\dot q_i$$. Note that $$V \neq \dot X$$ — they live in spaces of different dimension. $$V$$ is an element of the tangent space of the configuration manifold, not of $$\mathbb{R}^{7N_b}$$. The relationship between $$\dot q_i$$ and $$\omega_i$$ is

$$
\dot q_i = \tfrac{1}{2}q_i \otimes (0, \omega_i)
$$

where $$\omega_i$$ is embedded as a pure quaternion. This is used for position integration but does not appear in the constraint solve.

We'll also define the operation $$R(q)$$ to be the operation which rotates a vector by the rotation represented by the unit quaternion $$q$$.

Now let's say there are $$N_c$$ constraints. The $$\ell$$th constraint references two bodies via indices $$i_\ell$$ and $$j_\ell$$, and "pins" their local-space attachment points $$r^0_\ell$$ and $$r^1_\ell$$ together

$$\begin{align}
c_\ell(x_{i_\ell},q_{i_\ell},x_{j_\ell},q_{j_\ell}) &= x_{i_\ell} - x_{j_\ell} + R(q_{i_\ell})r^0_\ell - R(q_{j_\ell})r^1_\ell\\
&= 0
\end{align}$$

Then the full constraint vector of the system is the stack of all $$c_\ell$$

$$
C(X) = \begin{bmatrix} c_0 & c_1 & \dots & c_{N_c-1} \end{bmatrix}^T = 0
$$

We define the _constraint Jacobian_ $$J$$, a $$3N_c \times 6N_b$$ matrix, by the relation

$$
\dot C = J V
$$

Note that $$J \neq \frac{\partial C}{\partial X}$$ in the strict sense: since $$X \in \mathbb{R}^{7N_b}$$ and $$V \in \mathbb{R}^{6N_b}$$ have different dimensions, no such equality is possible. Instead, $$J$$ is the Jacobian in the tangent space of the configuration manifold — obtained by differentiating $$C$$ directly with respect to time and reading off the $$V$$ coefficients.

Since $$C(X) = 0$$ must hold for all time, $$\dot C = 0$$, giving the velocity-level constraint

$$
J V = 0
$$

$$J$$ is sparse — every block of 3 rows corresponds to one constraint, and the $$\ell$$th block $$J_\ell$$ is a $$3 \times 6N_b$$ matrix with only 12 nonzero columns (the 6-DOF blocks for bodies $$i_\ell$$ and $$j_\ell$$). We compute those columns by differentiating $$c_\ell$$ with respect to time and reading off the velocity coefficients.

$$\begin{align}
\dot c_\ell &= \dot x_{i_\ell} - \dot x_{j_\ell} + \omega_{i_\ell} \times R(q_{i_\ell}) r^0_\ell - \omega_{j_\ell} \times R(q_{j_\ell}) r^1_\ell\\
&= \dot x_{i_\ell} - \dot x_{j_\ell} - R(q_{i_\ell}) r^0_\ell \times \omega_{i_\ell} + R(q_{j_\ell}) r^1_\ell \times \omega_{j_\ell}\\
\end{align}$$

From this expression, we can split out the velocities and infer the constraint Jacobian

$$\begin{align}
\dot c_\ell &=
    \begin{bmatrix}
        I_3 & -\left[R(q_{i_\ell}) r^0_\ell\right]\times & -I_3 & \left[R(q_{j_\ell}) r^1_\ell\right]\times
    \end{bmatrix}
    \begin{bmatrix}
        \dot x_{i_\ell} \\ \omega_{i_\ell} \\ \dot x_{j_\ell} \\ \omega_{j_\ell}
    \end{bmatrix}\\
&= J_\ell V_\ell
\end{align}$$

where $$V_\ell = \begin{bmatrix} \dot x_{i_\ell}^T & \omega_{i_\ell}^T & \dot x_{j_\ell}^T & \omega_{j_\ell}^T \end{bmatrix}^T \in \mathbb{R}^{12}$$ is the velocity state of the two bodies involved in constraint $$\ell$$, in the same interleaved order as the global $$V$$.

Here I'm using the syntax $$[v]\times$$ to represent the cross-product matrix, defined by $$[v]\times u = v \times u$$.

Therefore

$$
J_\ell =
    \begin{bmatrix}
        I_3 & -\left[R(q_{i_\ell}) r^0_\ell\right]\times & -I_3 & \left[R(q_{j_\ell}) r^1_\ell\right]\times
    \end{bmatrix}
$$

### Equations of Motion

Recalling the Lagrangian $$L$$ as

$$\begin{align}
L &= K - U\\
&= \frac{1}{2}V^T M V - U(X)
\end{align}$$

where $$M \in \mathbb{R}^{6N_b \times 6N_b}$$ is the block-diagonal generalized mass matrix, with blocks $$m_i I_3$$ for linear inertia and the world-space inertia tensor $$I_i$$ for angular inertia.

Constraints are enforced by adding a generalized constraint force $$J^T\lambda$$ to the equations of motion, where $$\lambda \in \mathbb{R}^{3N_c}$$ are the Lagrange multipliers representing constraint impulses. Since $$J$$ is defined in the tangent space of the configuration manifold (rather than as $$\frac{\partial C}{\partial X}$$ literally), the constraint force term $$\left(\frac{\partial C}{\partial X}\right)^T\lambda$$ in the Euler-Lagrange equation is equivalent to $$J^T\lambda$$ when both are evaluated in this tangent space. The constrained Euler-Lagrange equation is then

$$\begin{align}
0 &= \frac{d}{dt}\frac{\partial L}{\partial V} - \frac{\partial L}{\partial X} + J^T\lambda\\
&= M\dot V - F + J^T\lambda
\end{align}$$

where $$F = -\frac{\partial U}{\partial X}$$ is the total force on the system.

### Discretizing Time

We now discretize the equations of motion over the time domain by introducing $$h$$, the "delta time", and let $$n$$ denote the current timestep index. The acceleration of the system $$\ddot X$$ then becomes

$$
\dot V = \left(V_{n+1} - V_n\right)h^{-1}
$$

We treat force integration and constraint solving as separate passes by defining the free velocity $$V^* = V_n + hM^{-1}F$$, i.e. the velocity after applying forces but before enforcing constraints. When $$F$$ does not depend on velocity, this splitting introduces no additional error beyond the first-order time discretization already present.

Then the equation of motion becomes a system of $$6N_b$$ equations with $$6N_b + 3N_c$$ unknowns. The unknowns are $$V_{n+1} \in \mathbb{R}^{6N_b}$$, the velocity state, and $$\lambda \in \mathbb{R}^{3N_c}$$, the constraint multipliers (3 per constraint, one per scalar constraint equation).

$$
MV_{n+1} + hJ^T\lambda = MV^*
$$

Closing the system with the discretized velocity constraint $$JV_{n+1} = 0$$ enforces the constraint at the velocity level only — it does not directly enforce $$C(X) = 0$$, so position-level drift can accumulate over time. This gives $$6N_b + 3N_c$$ equations in $$6N_b + 3N_c$$ unknowns, which can be written as the block matrix system

$$
\begin{bmatrix} M & hJ^T \\ J & 0 \end{bmatrix}
\begin{bmatrix} V_{n+1} \\ \lambda \end{bmatrix}
=
\begin{bmatrix} MV^* \\ 0 \end{bmatrix}
$$

We'll solve the first equation for $$V_{n+1}$$, and substitute the result into the second equation, and rearrange to find $$\lambda$$.

First, solve equation one for $$V_{n+1}$$.

$$\begin{align}
MV_{n+1} + hJ^T\lambda &= MV^*\\
V_{n+1} &= V^* - hM^{-1}J^T\lambda
\end{align}$$

Now, plug this into equation 2 and rearrange to get a linear system in $$\lambda$$.

$$\begin{align}
J V_{n+1} &= 0\\
J V^* - hJM^{-1}J^T\lambda &= 0\\
JM^{-1}J^T\lambda &= h^{-1}J V^*\\
\end{align}$$

To simplify things, we define $$A$$ and $$b$$

$$\begin{align}
A &= JM^{-1}J^T\\
b &= h^{-1}J V^*
\end{align}$$

so that our system becomes

$$\begin{align}
A\lambda &= b\\
\end{align}$$

The matrix $$A$$ is known as the _Delassus matrix_ and represents the compliance of the system in constraint space - how much constraint velocity changes in response to a unit constraint impulse. It is effectively the inverse inertia in constraint space.

### The Jacobi Step

The Jacobi method is an iterative numeric method for solving linear systems. We choose this as our starting point because it is well suited for parallelization. The method begins by breaking $$A$$ into its block-diagonal and off-block-diagonal parts, $$D$$ and $$E$$, where $$D$$ consists of the $$3\times 3$$ diagonal blocks $$A_{\ell\ell}$$.

$$\begin{align}
A &= D + E
\end{align}$$

We then plug this into the original equation and rearrange so that $$\lambda$$ appears on both sides, but so that it is alone on one side and so that the only inverse is of the diagonal matrix on the other side.

$$\begin{align}
\left(D+E\right)\lambda &= b\\
D\lambda &= b - E\lambda\\
\lambda &= D^{-1}\left(b - E\lambda\right)
\end{align}$$

This is just a rearrangement of our original equation, but we can interpret it as a recurrence relation. That is, the $$\lambda$$ on the _left_ side is the "new" value and the $$\lambda$$ on the _right_ side is the "previous". At iteration $$k$$, this recurrence relation looks like

$$\begin{align}
\lambda^{k+1} &= D^{-1} \left( b - E \lambda^k \right)\\
\end{align}$$

Now, we eliminate $$E$$ by substituting back in our equation for $$A$$.

$$\begin{align}
\lambda^{k+1} &= D^{-1} \left( b - \left( A - D \right) \lambda^k \right)\\
&= D^{-1}\left( b - A\lambda^k \right) + \lambda^k
\end{align}$$

The innermost expression $$b - A\lambda^k$$ is known as the "residual". Intuitively, $$b$$ is the constraint violation of the free velocity and $$A\lambda^k$$ is the correction the current impulse estimate would produce, so the residual is the remaining violation that $$\lambda^k$$ has not yet accounted for — the iteration converges when it reaches zero.

### Using Sparsity for Parallelism

Since each $$c_\ell$$ is a 3D vector equation (a difference between two positions), $$A$$ has dimensions $$3N_c \times 3N_c$$ with $$3\times 3$$ blocks. $$A$$ is sparse, containing nonzero blocks only where constraints share a body. We now devise an update for the $$\ell$$th block $$\lambda_\ell$$, which is a 3-vector. Each $$\lambda_\ell$$ can be updated independently, so the Jacobi iteration can be done in a parallel manner.

The diagonal blocks of $$D$$ are $$A_{\ell\ell} = J_\ell M^{-1} J_\ell^T$$, where $$A_{\ell\ell}$$ are $$3\times 3$$ matrices. Although $$J_\ell$$ and $$M^{-1}$$ both depend on orientation and change each timestep, they are fixed for the duration of a single solve. So $$A_{\ell\ell}^{-1}$$ can be precomputed once per timestep, before the iteration loop begins. The full, global $$A$$ matrix never needs to be formed. Note that $$J_\ell$$ is technically a $$3 \times 6N_b$$ matrix, where we typically only store the $$12$$ of the $$6N_b$$ columns which are nonzero, the 6-DOF blocks for bodies $$i_\ell$$ and $$j_\ell$$.

We also track the velocity estimate across iterations, writing $$V^k$$ for the velocity implied by the current iterate $$\lambda^k$$, initialized as $$V^0 = V^*$$.

Recalling the definitions for $$A$$ and $$b$$, the per-constraint update is then

$$\begin{align}
\lambda_\ell^{k+1} &= \lambda_\ell^k + A_{\ell\ell}^{-1}(b_\ell - (A\lambda^k)_\ell)\\
&= \lambda_\ell^k + A_{\ell\ell}^{-1} \cdot h^{-1} J_\ell V^k
\end{align}$$

where $$V^k = V^* - hM^{-1}J^T\lambda^k$$. The second line follows from the identity $$b_\ell - (A\lambda^k)_\ell = h^{-1}J_\ell V^k$$, which can be verified by substituting the definitions of $$A$$, $$b$$, and $$V^k$$. Since $$J_\ell$$ is nonzero only for bodies $$i_\ell$$ and $$j_\ell$$, each thread only needs to read the velocities of those two bodies.

The challenge is that $$V^k$$ requires summing impulse contributions from all constraints touching each body. Each Jacobi iteration splits naturally into two kernel passes, initializing with $$V^0 = V^*$$:

1. **Lambda pass** (one thread per constraint): read $$V^k$$ for bodies $$i_\ell$$ and $$j_\ell$$, produce $$\lambda_\ell^{k+1}$$
2. **Velocity pass** (one thread per body): accumulate $$V^{k+1} = V^* - hM^{-1}\sum_\ell J_\ell^T \lambda_\ell^{k+1}$$

### Connectivity

The velocity pass only needs to sum over constraints touching each body, not all constraints. To make this efficient, we precompute a flat array of constraint indices sorted by body, so that each body's connected constraints are contiguous. Each body stores a single integer offset marking where its section begins. Each constraint appears twice — once per body it connects. This structure is built once per topological change, not per frame.

---
## Algorithm
Let's begin by defining our data. We have the following structs and buffers. Note that even though the Jacobian should be a 3x12 matrix, we only store two 3x3 matrices. This is because in the way that we have formulated the point constraint, the two 3x3 matrices corresponding to positions are always just the identity matrix, and can be dropped entirely from our representation.
```c++
struct Jacobian
{
    mat3 w0;
    mat3 w1;
};

// per body data
int ic0[NB + 1]; // index to the first element in the constraint list; ic0[NB] is a sentinel equal to NC*2
vec3 pos[NB];
quat rot[NB];
vec3 lin_vel[NB];
vec3 ang_vel[NB];
vec3 lin_vel_delta[NB]; // the working lin vel delta during jacobi iterations
vec3 ang_vel_delta[NB]; // the working ang vel delta during jacobi iterations
float lin_mass[NB];
float lin_mass_inv[NB];
mat3 ang_mass_local[NB];
mat3 ang_mass[NB];
mat3 ang_mass_inv[NB];

// per constraint data
int ib0[NC]; // index of body 0
int ib1[NC]; // index of body 1
vec3 r0[NC]; // offset in body 0 local space
vec3 r1[NC]; // offset in body 1 local space
vec3 multiplier[NC];
Jacobian jacobian[NC];
mat3 delassus_inv[NC];
int constraint_list[NC * 2] // constraint indices, ordered by body
```

At a high level, the algorithm to do a time step looks like this:
```c++
void update(float dt) {

    // recompute the constraint topolgy mappings
    // this is NOT a parallel algorithm, and should run once per topological update.
    if (/* topology has changed */) {
        compute_connectivity();
    }

    // update world space rotational inertia tensors
    parallel_for (int ib : body_indices)
        compute_inertia(ib);
    
    // integrate forces to get "free" velocities
    parallel_for (int ib : body_indices)
        compute_free_velocity(ib, dt);
    
    // update constraint Jacobian and Delassus matrices
    parallel_for (int ic : constraint_indices)
        compute_jacobian_and_delassus(ic);
    
    // note: at this point we could zero out the multipliers before iterating,
    // but convergence will generally improve if we "warm-start" the system
    // with the values from the previous frame.
    
    // begin Jacobi iterations
    for (int iter = 0; iter < NI; ++iter) {
        
        // update lagrange multipliers (gather)
        parallel_for (int ic : constraint_indices)
            update_multipliers(ic, dt);
        
        // update velocities (scatter)
        parallel_for (int ib : body_indices)
            update_velocity(ib, dt);
    }
    
    // integrate velocities
    parallel_for (int ib : body_indices)
        compute_positions(ib);
}
```

First I'll break run the sequential connectivity builder which should change only when there's a topological change.
```c++
void compute_connectivity() {

    // clear the number of constraints per body.
    // this is a scratch array which we'll reuse
    int ncs[NB];
    for (int ib = 0; ib < NB; ++ib)
        ncs[ib] = 0;
        
    // increment constraint count for each body in each constraint
    for (int ic = 0; ic < NC; ++ic) {
        ++ncs[ib0[ic]];
        ++ncs[ib1[ic]];
    }

    // compute index of first constraint in each body's constraint list.
    // the first constraint for each body will be one after the last constraint
    // of the previous body.
    ic0[0] = 0;
    for (int ib = 1; ib <= NB; ++ib)
        ic0[ib] = ic0[ib-1] + ncs[ib-1]; // ic0[NB] = NC*2 serves as a sentinel

    // clear the constraint per body count - we'll reuse this now
    for (int ib = 0; ib < NB; ++ib)
        ncs[ib] = 0;

    // fill constraint lists
    for (int ic = 0; ic < NC; ++ic) {
        constraint_list[ic0[ib0[ic]] + (ncs[ib0[ic]]++)] = ic;
        constraint_list[ic0[ib1[ic]] + (ncs[ib1[ic]]++)] = ic;
    }
}
```

Now we'll break down each step which runs as a compute kernel
```c++
void compute_inertia(int ib) {

    // if geometry changed, update lin_mass and ang_mass
    //...

    // update inverse mass
    lin_mass_inv[ib] = 1.f / lin_mass[ib];

    // update global rotational inertia tensor: I_world = R * I_body * R^T
    mat3 R = to_mat3(rot[ib]);
    ang_mass[ib] = R * ang_mass_local[ib] * transpose(R);
    ang_mass_inv[ib] = inverse(ang_mass[ib]);
}

void compute_free_velocity(int ib, float dt) {

    // these integrations are separable, and it may be desireable
    // to swap out different methods of integration for each in the
    // case that forces are position-dependent or require higher
    // precision. For example, we may want an integrator which does
    // not fully lose the nonlinear rotation terms.
    lin_vel[ib] += lin_integrate(lin_acc[ib], dt);
    ang_vel[ib] += ang_integrate(ang_acc[ib], dt);
    
    // clear the velocity deltas, in preparation for jacobi iterations
    lin_vel_delta[ib] = vec3(0.0f);
    ang_vel_delta[ib] = vec3(0.0f);
}

void compute_jacobian_and_delassus(int ic) {

    // set up the Jacobian matrix for this constraint in the current orientations
    mat3 jw0 = -cross_mat(to_mat3(rot[ib0[ic]]) * r0[ic]);
    mat3 jw1 =  cross_mat(to_mat3(rot[ib1[ic]]) * r1[ic]);
    jacobian[ic].w0 = jw0;
    jacobian[ic].w1 = jw1;
    
    // set up the Delassus matrix A_ll = J_l M^-1 J_l^T and store its inverse.
    // the angular terms are jw * I^-1 * jw^T = -jw * I^-1 * jw since jw^T = -jw
    // (jw is skew-symmetric), so they are subtracted.
    mat3 A_ll
        = mat3(lin_mass_inv[ib0[ic]] + lin_mass_inv[ib1[ic]])
        - (jw0 * ang_mass_inv[ib0[ic]] * jw0)
        - (jw1 * ang_mass_inv[ib1[ic]] * jw1);
    delassus_inv[ic] = inverse(A_ll);
}

void update_multipliers(int ic, float dt) {

    // get current body velocities
    int b0 = ib0[ic];
    int b1 = ib1[ic];
    vec3 lin_vel0 = lin_vel[b0] + lin_vel_delta[b0];
    vec3 lin_vel1 = lin_vel[b1] + lin_vel_delta[b1];
    vec3 ang_vel0 = ang_vel[b0] + ang_vel_delta[b0];
    vec3 ang_vel1 = ang_vel[b1] + ang_vel_delta[b1];

    // compute constraint velocity: J_l * X_dot = (v0 - v1) + jw0*w0 + jw1*w1
    vec3 constraint_vel
        = (lin_vel0 - lin_vel1)
        + (jacobian[ic].w0 * ang_vel0)
        + (jacobian[ic].w1 * ang_vel1);

    // increment the multiplier: lambda += A_ll^-1 * h^-1 * J_l * X_dot
    multiplier[ic] += delassus_inv[ic] * constraint_vel * (1.f/dt);
}

void update_velocities(int ib, float dt) {

    // initially clear the velocity deltas
    lin_vel_delta[ib] = vec3(0.f);
    ang_vel_delta[ib] = vec3(0.f);
    
    // iterate over this body's constraints using the CSR structure.
    // ic0[ib] is the start index, ic0[ib+1] is the start of the next body (used as end).
    int start = ic0[ib];
    int end = ic0[ib + 1]; // sentinel ic0[NB] = NC*2 makes this safe for the last body

    for (int iic = start; iic < end; ++iic) {
        int ic = constraint_list[iic];
        bool is_body0 = (ib == ib0[ic]);

        // angular Jacobian block for this body
        mat3 jw = is_body0 ? jacobian[ic].w0 : jacobian[ic].w1;

        // linear delta: -h * m^-1 * lambda for body 0, +h * m^-1 * lambda for body 1
        // (from the +I_3 and -I_3 blocks in J_l, transposed)
        if (is_body0)
            lin_vel_delta[ib] -= dt * lin_mass_inv[ib] * multiplier[ic];
        else
            lin_vel_delta[ib] += dt * lin_mass_inv[ib] * multiplier[ic];

        // angular delta: +h * I^-1 * jw * lambda for both bodies
        // (jw^T = -jw, so -h * I^-1 * jw^T * lambda = +h * I^-1 * jw * lambda)
        ang_vel_delta[ib] += dt * ang_mass_inv[ib] * jw * multiplier[ic];
    }
}
```
