---
title: The Change-In-Rotation Quaternion
layout: post
tags: [math, physics]
comments: true
math: true
---

When working with numeric rigid body physics simulations in 2D, it's as straightforward to update the rotation of a body as it is its linear position. In 3D, it's not *difficult* per se, but it can be much less immediately clear how to go about it, particularly if your basic transform is stored as a quaternion.

The matrix and quaternion methods result in similar performance when used with the corresponding representation of 3D rotations, but it's useful to be familiar with both so that you don't end up doing unnecessary conversions between quaternion and matrix representations.

<iframe width="100%" height="315" src="https://www.youtube.com/embed/iN3QMKPdZw0" frameborder="0" allowfullscreen></iframe>

### Matrix

If the positions of a vertex in local and world space are $$\vec{q}$$ and $$\vec{r}$$, and the center of rotation of the body to which it belongs is $$\vec{c}$$, then they are related by

$$
\vec{r}\left(t\right)=R\left(t\right)\vec{q}+\vec{c}\left(t\right)
$$

where $$R\left(t\right)$$ is the rotation matrix of the body. The linear
velocity of the vertex $$\dot{\vec{r}}$$ is easy to find, and involves
a term $$\dot{R}$$, which is the ``change-in'' matrix which we're
looking for. Recall that the linear velocity of a point on a rotating
body is also given by the cross product of the angular velocity $$\omega\left(t\right)$$
with it's position relative to the center of rotation and making use
of the [cross product matrix](https://en.wikipedia.org/wiki/Cross_product#Conversion_to_matrix_multiplication),
$$\dot{R}$$ can be quickly identified.

$$
\begin{eqnarray*}
\dot{\vec{r}}\left(t\right) & = & \dot{R}\left(t\right)\vec{q}+\dot{\vec{c}}\left(t\right)\\
 & = & \omega\left(t\right)\times R\left(t\right)\vec{q}+\dot{\vec{c}}\left(t\right)\\
 & = & \left[\omega\left(t\right)\right]_{\times}R\left(t\right)\vec{q}+\dot{\vec{c}}\left(t\right)
\end{eqnarray*}
$$

Where $$\left[\omega\left(t\right)\right]_{\times}$$ is the cross product
matrix of $$\omega\left(t\right)$$. Then $$\dot{R}\left(t\right)=\left[\omega\left(t\right)\right]_{\times}R\left(t\right)$$,
and the integration step to update the rotation matrix is pretty simple:

$$
\begin{eqnarray*}
R\left(t+\Delta t\right) & = & R\left(t\right)+\Delta t\dot{R}\left(t\right)\\
 & = & R\left(t\right)+\left[\omega\left(t\right)\right]_{\times}R\left(t\right)
\end{eqnarray*}
$$

In a program using [GLM](http://glm.g-truc.net/0.9.8/index.html),
this is what the code for the final update step might look like.

{% highlight c++ %}
rotation += glm::matrixCross4(angular_velocity * dt) * rotation;
{% endhighlight %}

### Quaternion

We'll develop the quaternion solution in essentially the same way,
taking $$Q\left(t\right)$$ to be the rotation quaternion of the body.
Remember that to [orient a point with a quaternion](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation#Orientation)
the point is reinterpreted as a quaternion with a zero scalar value
and it is multiplied by the rotation on one side and its conjugate
on the other.

$$
\vec{r}\left(t\right)=Q\left(t\right)\vec{q}Q^{-1}\left(t\right)+\vec{c}\left(t\right)
$$

An equivalent operation to the angular velocity cross product which
we used to find the change-in matrix is the [angle-axis formula
for quaternions](https://en.wikipedia.org/wiki/Axis%E2%80%93angle_representation#Unit_quaternions). Then the change-in quaternion can be found by similar identification.

$$
\begin{eqnarray*}
\dot{\vec{r}}\left(t\right) & = & \dot{Q}\left(t\right)\left(Q\left(t\right)\vec{q}\right)\dot{Q}^{-1}\left(t\right)+\vec{c}\left(t\right)\\
 & = & Q_{\times}\left(\vec{\omega}\Delta t\right)\left(Q\left(t\right)\vec{q}\right)Q_{\times}^{-1}\left(\vec{\omega}\Delta t\right)+\vec{c}\left(t\right)
\end{eqnarray*}
$$

where $$Q_{\times}$$ represents the angle-axis quaternion, whose scalar
and vector parts are given by

$$
Q_{\times}\left(\vec{\omega}\Delta t\right)=\left[\cos\left(\frac{\left|\vec{\omega}\right|}{2}\Delta t\right),\frac{\vec{\omega}}{\left|\vec{\omega}\right|}\sin\left(\frac{\left|\vec{\omega}\right|}{2}\Delta t\right)\right]
$$

Then the quaternion rotation update step would be

$$
Q\left(t+\Delta t\right)=Q\left(t\right)+Q_{\times}\left(\vec{\omega}\Delta t\right)Q\left(t\right)
$$

And this is what the code for the final rotation update using quaternions
might look like.

{% highlight c++ %}
float angle = glm::length(angular_velocity);
glm::vec3 axis = angular_velocity / angle;
glm::quat axis_angle(glm::cos(angle * 0.5f), axis * glm::sin(angle * 0.5f));
rotation = normalize(rotation + axis_angle * rotation);
{% endhighlight %}