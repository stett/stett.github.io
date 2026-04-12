---
title: Particle Life in WebGL
layout: post
tags: [art]
comments: true
---

<style>
.particle-life-embed {
    position: relative;
    width: 100%;
    height: 400px;
    border: none;
    margin: 1em 0;
}
.particle-life-embed iframe {
    width: 100%;
    height: 100%;
    border: none;
}
</style>

I spent this weekend fascinating over the interesting patterns that can emerge from the [Particle Life](https://particle-life.com/) algorithm by Jeffrey Ventrella. While this algorithm needs no new implementations (there are many!) I decided to use it as an exercise in Web GPU programming.

Having become spoiled by modern GPU APIs with programmable pipelines and fully custom buffer formats, it was fun to recall the old days of working within the confines of a texture buffer.

<div class="particle-life-embed">
    <iframe src="{{ site.url }}/render-particle-life"></iframe>
</div>

[Full screen]({{ site.url }}/render-particle-life)