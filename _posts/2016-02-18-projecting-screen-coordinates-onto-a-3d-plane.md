---
title: Projecting Screen Coordinates Onto A 3D Plane
layout: post
tags: [math, graphics, 3d]
comments: true
math: true
---

Before the OpenGL programmable pipeline, there was a nice little function called [`gluUnProject`](http://nehe.gamedev.net/article/using_gluunproject/16013/) which could be used to conveniently turn screen coordinates into 3D coordinates. But in many respects the OpenGL programmable pipeline leaves the programmer to do much of the mathematical work. In this post I'll work through the math used to project the mouse's coordinates onto an arbitrary plane in 3D, using [raycasting](https://en.wikipedia.org/wiki/Ray_casting).

Note that in my code I'll use vector and matrix structures and operations from the [glm](http://glm.g-truc.net/0.9.7/index.html) math libraries. For code clarity, I've left out the `glm::` scope resolution where applicable.


### The Inverse View and Projection Transform

On the graphics card, all visible coordinates are represented in [homogeneous space](https://en.wikipedia.org/wiki/Homogeneous_coordinates), which is bounded in three dimensions on $$\left[-1,1\right]$$. So in homogeneous "screen" coordinates a point on the screen $$\left(x_s,y_s\right)$$ is a straight line segment along the z-axis.

On the graphics card, the near clipping plane maps to $$z=0$$ and the far clipping plane to $$z=1$$. So our strategy is to transform the points $$\vec{p_0}=\left(x_s,y_s,0\right)$$ and $$\vec{p_1}=\left(x_s,y_s,1\right)$$ from homogeneous coordinates to world coordinates, cast a ray from $$\vec{p_0}$$ to $$\vec{p_1}$$, and find its intersection with the plane.

We begin by getting the inverse of the matrix transform $$T$$ from world to homogeneous spaces, which is the combination of the camera's orientation and the projection matrix. After we apply this matrix to a point, we will perform the [homogeneous division](http://www.tomdalling.com/blog/modern-opengl/explaining-homogenous-coordinates-and-projective-geometry/).

The following code sample is a function to convert from homogeneous screen coordinates to world space, given the perspective and view transform matrices.

{% highlight c++ %}
void homogeneous_to_world(vec3 &world, const vec3 &homogeneous, const mat4 &projection, const mat4 &view)
{
    mat4 transform = inverse(projection * view);
    vec4 _world = transform * vec4(homogeneous, 1.0f);
    world = vec3(_world) * (1.0f / _world.w);
}
{% endhighlight %}


### Intersection of a Ray with a Plane

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

{% highlight c++ %}
bool project_screen_onto_plane(vec3 &point, const vec2 &screen, const vec3 &plane_point, const vec3 &plane_normal, const mat4 &projection, const mat4 &view)
{
    vec3 ray_origin, ray_end;
    homogeneous_to_world(ray_origin, vec3(screen, 0.0f), projection, view);
    homogeneous_to_world(ray_end, vec3(screen, 1.0f), projection, view);

    vec3 ray_normal = normalize(ray_end - ray_origin);
    float t = dot(plane_point - ray_origin, plane_normal) / dot(ray_normal, plane_normal);
    point = ray_origin + t * ray_normal;

    return t >= 0.0f;
}
{% endhighlight %}


### A Simple Use Case

Finally, let's consider the case where we want to conver the mouse's position on the window to it's position on the xy-plane. This is a common need for 2D games. Before we actually can use our `project_screen_onto_plane` method, we've got to convert the mouse from the OS-provided window coordinates to the corresponding homogeneous coordinates. Thankfully, this is as simple as mapping one rectangle onto another. Mouse coordinates will typically be such that $$(0,0)$$ is the top-left corner of the window.

{% highlight c++ %}
void mouse_on_xy_plane(vec3 &mouse_world, int mouse_x, int mouse_y, int window_width, int window_height, const mat4 &projection, const mat4 &view)
{
    vec2 screen;
    screen.x = 2.0f * (float)mouse_x / (float)window_width - 1.0f;
    screen.y = 1.0f - 2.0f * (float)mouse_y / window_height;
    project_screen_to_plane(mouse_world, screen, vec3(0.0f), vec3(0.0f, 0.0f, 1.0f), projection, view);
}
{% endhighlight %}