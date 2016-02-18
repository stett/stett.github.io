---
title: Projecting Screen Coordinates Onto A 3D Plane
layout: post
tags: [math, graphics, 3d]
comments: true
math: true
---

## Brief

Before the OpenGL programmable pipeline, there was a nice little function called [`gluUnProject`](http://nehe.gamedev.net/article/using_gluunproject/16013/) which could be used to conveniently turn screen coordinates into 3D coordinates. But in the programmable pipeline, in many respsects, OpenGL leaves the programmer to do much of the mathematical work. In this post I'll work through the math used to project the mouse's coordinates onto an arbitrary plane in 3D, using [raycasting](https://en.wikipedia.org/wiki/Ray_casting).


## Intersection of a Ray with a Plane

First we'll find the intersection of the ray which starts at point \[\vec{a}\] in the direction \[\hat{n}\] with the plane which includes the point \[\vec{b}\] and has the surface normal \[\hat{m}\]