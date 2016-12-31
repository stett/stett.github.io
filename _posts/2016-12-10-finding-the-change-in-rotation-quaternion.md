---
title: Finding The "Change In Rotation" Quaternion (plus a springy demo with boxes!)
layout: post
tags: [math, physics]
comments: true
math: true
---

When working with numeric rigid body physics simulations in 2D, it's as straightforward to update the rotation of a body as it is its linear position. In 3D, it's not *difficult* per se, but it can be much less immediately clear how to go about it, particularly if your basic transform is stored as a quaternion. This was a sticking point for me when developing the demo in the video above.

Below I'll derive the change-in matrix, and then the change-in quaternion. The methods result in similar performance when used with the matching rotation representation. Note that I'm only developing this mathematically for explicit, Euler integrators, although it could be pretty simply adapted to other forms of integration.

### Matrix

If the positions of a vertex in local and world space are $$\vec{q}$$ and $$\vec{r}$$, and the center of rotation of the body to which it belongs is $$\vec{c}$$, then they are related by

$$
\[
\vec{r}\left(t\right)=R\left(t\right)\vec{q}+\vec{c}\left(t\right)
\]
$$

where $$R\left(t\right)$$ is the rotation matrix of the body. The linear
velocity of the vertex $$\dot{\vec{r}}$$ is easy to find, and involves
a term $$\dot{R}$$, which is the ``change-in'' matrix which we're
looking for. Recall that the linear velocity of a point on a rotating
body is also given by the cross product of the angular velocity $$\omega\left(t\right)$$
with it's position relative to the center of rotation and making use
of the [cross product matrix](https://en.wikipedia.org/wiki/Cross\_product\#Conversion\_to\_matrix\_multiplication),
$$\dot{R}$$ can be quickly identified.

$$
\begin{eqnarray*}
\dot{\vec{r}}\left(t\right) & = & \dot{R}\left(t\right)\vec{q}+\dot{\vec{c}}\left(t\right)\\
 & = & \omega\left(t\right)\times R\left(t\right)\vec{q}+\dot{\vec{c}}\left(t\right)\\
 & = & \left[\omega\left(t\right)\right]_{\times}R\left(t\right)\vec{q}+\dot{\vec{c}}\left(t\right)
\end{eqnarray*}
$$