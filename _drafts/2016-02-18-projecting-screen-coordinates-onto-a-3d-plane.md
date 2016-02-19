---
title: Projecting Screen Coordinates Onto A 3D Plane
layout: post
tags: [math, graphics, 3d]
comments: true
math: true
---

## Brief

Before the OpenGL programmable pipeline, there was a nice little function called [`gluUnProject`](http://nehe.gamedev.net/article/using_gluunproject/16013/) which could be used to conveniently turn screen coordinates into 3D coordinates. But in many respsects the OpenGL programmable pipeline leaves the programmer to do much of the mathematical work. In this post I'll work through the math used to project the mouse's coordinates onto an arbitrary plane in 3D, using [raycasting](https://en.wikipedia.org/wiki/Ray_casting).


## Intersection of a Ray with a Plane

First we'll find the intersection of the ray which starts at point $$\vec{a}$$ in the direction $$\hat{n}$$ with the plane which includes the point $$\vec{b}$$ and has the surface normal $$\hat{m}$$.

Then a point along the ray $$\vec{p}$$ and a point on the plane $$\vec{q}$$ are described by the following equations.

$$
\begin{align*}
    \vec{p} &= \vec{a} + t \hat{n}\\
    0 &= \left( \vec{q} - \vec{b} \right) \cdot \hat{m}
\end{align*}
$$

When the ray intersects the plane, we will have $$\vec{p} = \vec{q}$$. To find the point of intersection $$\vec{p_0}$$, we apply this substitution, solve for t, and plug the result back into the ray equation.

$$
\begin{align*}
    0 &= \left( \vec{a} + t \hat{n} - \vec{b} \right) \cdot \hat{m}\\
      &= \left( \vec{a} - \vec{b} \right) \cdot \hat{m} + t \hat{n} \cdot \hat{m}\\
    t &= \frac{\left( \vec{b} - \vec{a} \right) \cdot \hat{m}}{ \hat{n} - \hat{m} }
\end{align*}
$$


## The Homogeneous Multiplication

