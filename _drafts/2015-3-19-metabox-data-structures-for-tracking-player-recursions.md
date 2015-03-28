---
title: MetaBox - Data Structures For Tracking Player Recursions
layout: post
tags: [data-structures, c++]
comments: true
---

## The Idea

When I worked on [MetaVoxel](http://metavoxelgame.com/), a feature which we never implemented due to implementation weirdness was the recursive MetaVoxel component. Several reasons for this. It seemed too difficult to implement well and consistently. Anyway, it's such a completely non-physical idea to throw into a game full of already bizarre and confusing concepts.

But the idea is too cool not to pursue, or at least think about. So here I am, thinking about it :)

## Non-Recursive Representation

Okay. So if there were such a thing as a box which contained a scaled down link to itself by some physical weirdness explainable by no one but Kip Thorne, what kind of rules would it make sense for such a thing to follow? Better: what rules would make for a fun game, and how could we structurally represent it in data?

The most natural way to approach the concept of a non-recursive meta-box is a tree structure. If box `A` contains boxes `B` and `C`, and `C` contains `D` and `E` (and let's also throw in `F` for good measure), then we get something like:

        A
       / \
      B   C
         / \
        D   E
       /
      F

The box nodes are represented by a simple structure like this:

    struct Box {
        Box* parent;
        list<Box*> children;
        ...
    };

The player starts somewhere in the tree, traversing it to progress through the game. Easy peasy. Let's throw a wrench in it.

## Recursive Representation

Now let's say that `C` contains a recursive link to itself. The link is not a "copy" because it literally represents box `C`. Yet it's distinct, so let's give it its own name, say `C'`. This is like the idea that a single thing simultaneously has multiple, distinct physical representations. Makes no sense, but funny. The tree above becomes something like the following.

        A
       / \
      B   C-C'
         / \
        D   E
       /
      F

Forget fancy inheritance trees. Let's just add a member to the `Box` struct which marks it as recursive or not.

    struct Box {
        Box* parent;
        list<Box*> children;
        bool recursive;
        ...
    };

## Traversing the Tree

The first trick is storing the order of the player's traversal, in order to know where to place them in the tree when they initiate a transition. With recursive box nodes, it's a bit more tricky than just keeping track of the current node.

Let's start by representing the player's traversal of the tree as a stack. They start in `A`, and begin to descend through the right branch, recursing twice in `C` and then going into `D` and `E`. Then the stack may look like this:

    traversal = A, C, C', C', D, E;

Now, when the player leaves `E`, `E` is popped from the stack, and we can see that he should end up in `D`. Likewise, he leaves `D` and ends up in `C'`, which is `C`, and so on. This stack contains all we need to know to trace the traversal of the player through our tree.

But there's a better way to do it. If we give the tree nodes pointers to their parents, then we have no need for all the non-recursive elements in the stack. But since the top of the stack no longer represents the current box, we need to keep track of that as well. So the same traversal above could be stored like this:

    current = E;
    traversal = C', C';

The function for entering a child box adds to the `traversal` stack on the condition that the child is recursive, and sets `current` on the condition that it's not. Something like this:

    void push_box(child) {
        if (child.recursive) {
            traversal.push_back(child);
        } else {
            current = child;
        }
    }

But what we're really looking for is a consistent way of placing the player as they leave boxes.
