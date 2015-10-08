---
title: Simple Fluid Dynamics in a 2D Tile Based Platformer
layout: post
tags: [homework, c, opengl]
comments: true
thumbnail: /assets/blood-1.png
---

![Bloody Mess!]({{ site.url }}/assets/blood-1.png)


This one may have been a bit of overkill...

I was given an assignment to write a 2D platformer, optionally with "extra features". So for my extra features I wrote a simple fluid dynamics simulator and made the enemy's drop copious amounts of persistent blood when they die.

I can't post the code since it was a school project, but I can describe the general strategy. It looks cool, and it's really very simple.

1) For each game tile slot, allocate an array of `N` elements (where `N` is the resolution of the fluid), each of which is an array of two `float`s. Each of these elements is a fluid "particle", and the two values are its vertical position and velocity

2) Each update step, accelerate each particle towards the average position of its neighbors. To facilitate "dripping", I also check to see if the collision cell below this fluid cell is open and the fluid array inside this cell is dropped the the one below. The result is that a pool of fluid on a ledge with drip to the surface below when it reaches the edge.


Game elements which should interact with the fluid can either set the position or velocity of the fluid at any point on the screen. 
