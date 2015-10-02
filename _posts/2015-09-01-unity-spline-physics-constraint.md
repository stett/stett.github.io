---
title: Constraining Physics Along A Spline In Unity
layout: post
tags: unity
comments: true
---

Recently I had cause to constrain physics forces along a spline in Unity. In my first attempt, my approach was to constrain the position so that it was to constrain an object's velocity by projecting it along the closest tangent on the spline, and to set the position to closest point on the spline after updating phyiscs.

This approach is a hack, and is frought with error. The cases are few where you should *continuously* be setting low-order physics properties (position, velocity) on an object which is already governed by a physics engine (maybe I'll talk about why later).

Fortunately, Unity provides the [ConfigurableJoint](http://docs.unity3d.com/Manual/class-ConfigurableJoint.html), although by itself this is not quite enough. What we need is a ConfigurableJoint which can be tweaked to get the client however high he or she wishes with a good Indica / Sativa balance. Terrible joke. Moving on.

What we *actually* need is a ConfigurableJoint which will lock itself to motion along a straight line - this line is must be updated every step to be tangent to the closest point on the spline. Once this joint is in place, the actuation of the object itself is left up to the physics engine so that it may remain consistent.

So I added two behaviors, one called SplineData, and one called SplineConstraint, which takes a reference to an instance of SplineData. SplineConstraint creates a ConfigurableJoint on its gameObject, and updates it every step to keep it locked into place.

The code is [here](https://github.com/stett/unity-physics-splines/tree/e37a267d8b962517d958c7b31ca50655604d665f) on github. The result? Nice, consistent physics, but constrained along a spline:

<iframe width="400" height="315" src="https://www.youtube.com/embed/qiUhr-Hkic0" frameborder="0" allowfullscreen></iframe>
