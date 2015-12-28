---
title: A(nother) Subtle Danger Of Macro Expansion
layout: post
tags: [c, c++]
comments: true
---

It has been said ad nauseam that macros ought to be avoided, [some times with good reason](http://stackoverflow.com/questions/14041453/why-are-preprocessor-macros-evil-and-what-are-the-alternatives). But it was only through the pain and suffering which is the unfortunate prerequisite of internalized good practice that I have come to believe the following truism:

> No [argument](https://gcc.gnu.org/onlinedocs/cpp/Macro-Arguments.html) of a [function-like preprocessor macro](https://gcc.gnu.org/onlinedocs/cpp/Function-like-Macros.html) should ever modify state.

It is essential either to follow this principal, or to remember that in macro expansion, the expressions used as arguments will be copied first, and evaluated last. If a macro uses the same argument twice, and the argument includes a state change (eg. `x++` or perhaps another macro), then the state change will be evaluated twice.