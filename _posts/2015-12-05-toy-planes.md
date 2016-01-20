---
title: Toy Planes
layout: post
tags: [project, school, c, c++, opengl]
comments: true
---

In classic DigiPen throwing-people-in-the-deep-end-to-see-if-they-can-swim style, I had an assignment which required me to build a basic game engine from scratch, and then a game to demonstrate it's capabilities, in a little less than half a semester.

In this video you can watch me play a bit of the game. In it, I shoot down a few pixely planes with rockets and machinegun before getting hit by a missile from a helicopter. The more damaged I become, the more difficult it is to control, and I eventually crash and burn. I highly recommend upping the quality to 480p at least, in order ot really see what's going on.

<iframe width="420" height="360" src="https://www.youtube.com/embed/aA3th1K6wno" frameborder="0" allowfullscreen></iframe>

I spent the majority of my time working on a system to sort draw calls. The game involves a massive number of large, partially transparent particles (smoke trails). Moreover, these particles are distributed all over the 3D playing field, and only look good if they're sorted properly - it looks really wierd when a plane flies underneath pillars of smoke which are far below it. Because I wanted to use alpha blending for nice-looking clouds of smoke, using the alpha test to populate the depth buffer wasn't an option.

I ended up using a draw call "bucketing" concept proposed by [Christer Ericson](http://realtimecollisiondetection.net/blog/?page_id=2) a few years back [on his blog](http://realtimecollisiondetection.net/blog/?p=86). The concept is to make the sorting operation extremely simple (no indirection) while packing the information required to make a draw call into the smallest possible space for fast swapping.
