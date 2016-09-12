---
title: Unity-esque Infinite Resolution Grid Plane
layout: post
category: status
tags: [graphics, wip]
comments: true
---

I've been using [Unity](https://unity3d.com/) a lot at work this Summer, and today I decided to take a stab at implementing my own infinite-resolution grid plane (or whatever you might call it) like the one in Unity's scene view.

My first approach has been to use the modulus operator on the uv-coordinates of a quad multiplied by some power of an integer (in my case 5), where the power is equal to some function of the fragment's depth value. What a mouthful.

Anyway, it ain't pretty, but here's what I've got so far:

![Infinite Resolution Plane]({{ site.url }}/assets/inf-res-plane-0.png)

Clearly, my shader is not yet correctly choosing a grid "power" based on depth. It's kind of a neat effect to see the transitions in grid resolution between phases, but at the moment it is way too exaggerated. Once I've got this problem wrangled, I'll post my solution.