---
title: Simple 2D Waves With FFTs
layout: post
tags: [project, c++]
comments: true
---

The 2D wave equation can be solved by summing up an infinite number of sines and cosines. This can be approximated quite quickly by a finite number of sinusoids over a large discrete grid using Fast Fourier Transforms in order to produce water-like height fields.

<iframe width="420" height="315" src="https://www.youtube.com/embed/d7emScLBD14" frameborder="0" allowfullscreen></iframe>

In this short demo, I used Perlin noise to generate the initial waveform and a custom multithreaded FFT implementation. The colors in the video represent the complex phase at each grid point.