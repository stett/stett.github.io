---
title: Physics Engine, Week 5 - Dynamic AABB Tree
layout: post
tags: [physics]
comments: true
---

This is a retro-active post on the state of my physics engine (from a few weeks ago), because progress since week 7 has been pretty minimal due to crunch time at work.

Here's something I didn't show in the last video:

<iframe width="100%" height="300" src="https://www.youtube.com/embed/D0Ag8vO0TeM" frameborder="0" allowfullscreen></iframe>

It's a bit difficult to see the outlines due to the quality of the video, but in it I show the borders of a dynamic AABB structure, based somewhat on the method described by [Randy Gaul](http://www.randygaul.net/2013/08/06/dynamic-aabb-tree/).

And here's a short technical description of how indexing and padding work in the tree. Maybe I'll come back later with more details.

Each node in the AABB tree has a unique index. When nodes are removed, instead of clearing the data,
the erased node's index is removed from a list of active indexes. When an object is added to the tree, the
index of the leaf node which is is stored in will be returned. This index is stored on the object and used to update the node's bounding box and to query the tree for intersections.

Leaf nodes are padded by some small amount, and the function in the tree which is used to update the
bounding box of a leaf node will return true if the new un-padded bounding box is not contained in the padded node. This will limit the number of broad-phase interference queries which take place per frame; the tree will be queried for intersections and the intersection cache entry (see Intersection Cache section below) for the object in question will be updated only if the update method returns true.