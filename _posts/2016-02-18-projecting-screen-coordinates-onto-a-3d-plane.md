---
title: Projecting Screen Coordinates Onto A 3D Plane
layout: post
tags: [math, graphics, 3d]
comments: true
math: true
---

Before the OpenGL programmable pipeline, there was a nice little function called [`gluUnProject`](http://nehe.gamedev.net/article/using_gluunproject/16013/) which could be used to conveniently turn screen coordinates into 3D coordinates. But in many respsects the OpenGL programmable pipeline leaves the programmer to do much of the mathematical work. In this post I'll work through the math used to project the mouse's coordinates onto an arbitrary plane in 3D, using [raycasting](https://en.wikipedia.org/wiki/Ray_casting).

Note that in my code I'll use vector and matrix structures and operations from the [glm](http://glm.g-truc.net/0.9.7/index.html) math libraries. For code clarity, I've left out the `glm::` scope resolution where applicable.


## The Inverse View and Projection Transform

On the graphics card, all visible coordinates are represented in homogeneous coordinates, a bounded volume $$\left[-1,1\right]\times\left[-1,1\right]\times\left[-1,1\right]$$. So in homogeneous "screen" coordinates a point on the screen $$\left(x_s,y_s\right)$$ is a straight line segment along the z-axis.

On the graphics card, the near clipping plane maps to $$z=0$$ and the far clipping plane to $$z=1$$. So our strategy is to transform the points $$\vec{p_0}=\left(x_s,y_s,0\right)$$ and $$\vec{p_1}=\left(x_s,y_s,1\right)$$ from homogeneous coordinates to world coordinates, cast a ray from $$\vec{p_0}$$ to $$\vec{p_1}$$, and find its intersection with the plane.

We begin by getting the inverse of the matrix transform $$T$$ from world to homogeneous spaces. One step that OpenGL *does* take care of for us when we are sending vertices to the screen is the [homogeneous division](https://en.wikipedia.org/wiki/Homogeneous_coordinates). After applying $$T$$, OpenGL will multiply each vector by its fourth element $$w$$, which is the first step in converting to homogeneous coordinates. To reverse this, as our final step in converting from homogeneous to world coordinates, we will divide by $$w$$.

The following code sample is a function to convert from homogeneous screen coordinates to world space, given the perspective and view transform matrices.

    void homo_to_world(vec3 &world, const vec3 &homo, const mat4 &projection, const mat4 &view)
    {
        mat4 transform = inverse(projection * view);
        vec4 _world = transform * vec4(homo, 1.0f);
        world *= (1.0f / _world.w);
    }


## Intersection of a Ray with a Plane

At this point we're able to get screen points in world space at arbitrary distances from the eye. What we really want is to find the specific point which intersects with the xy-plane, or an any arbitrary plane.

To do this, we'll find the intersection of the ray which starts at point $$\vec{a}$$ in the direction $$\hat{n}$$ with the plane which includes the point $$\vec{b}$$ and has the surface normal $$\hat{m}$$.

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

Note that $$t < 0$$ indicates that the ray projects away from the plane.

This is enough to construct a function which will give us the world coordinates of a screen point projected onto a plane, given a point on the plane and the surface normal.

    bool project_screen_to_plane(vec3 point, const vec2 &screen, const vec3 &plane_point, const vec3 &plane_normal, const mat4 &projection, const mat4 &view)
    {
        vec3 p0, p1;
        homo_to_world(p0, vec3(screen, 0.0f), projection, view);
        homo_to_world(p1, vec3(screen, 0.0f), projection, view);

        glm::vec3 ray_normal = glm::normalize(ray_end - ray_origin);
        float t = dot(plane_point - ray_origin, plane_normal) / dot(ray_normal, plane_normal);
        point = ray_origin + t * ray_normal;

        return t >= 0.0f;
    }