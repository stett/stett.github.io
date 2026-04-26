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
.pl-controls {
    display: inline-block;
    text-align: left;
    margin: 0.5em 0;
}
.pl-controls label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin: 0.3em 0;
}
.pl-controls .pl-label {
    display: inline-block;
    width: 10em;
    text-align: right;
}
.pl-controls .pl-val {
    display: inline-block;
    width: 2.5em;
    text-align: left;
}
</style>

I spent this weekend fascinated by the interesting patterns that can emerge from the [Particle Life](https://particle-life.com/) algorithm by Jeffrey Ventrella. While this algorithm needs no new implementations (there are many!) I decided to use it as an exercise in WebGL programming.

<div class="particle-life-embed">
    <iframe id="particle-life-iframe" src="{{ site.url }}/render-particle-life"></iframe>
</div>

<div style="text-align: center;">
<div class="pl-controls">
<label><span class="pl-label">Seed</span><input type="range" id="pl-seed" min="0" max="100" value="42"><span id="pl-seed-val" class="pl-val">42</span></label>
<label><span class="pl-label">Colors</span><input type="range" id="pl-colors" min="1" max="20" value="10"><span id="pl-colors-val" class="pl-val">10</span></label>
<label><span class="pl-label">sqrt(Particles)</span><input type="range" id="pl-shape" min="8" max="200" value="80"><span id="pl-shape-val" class="pl-val">80</span></label>
<label><span class="pl-label">Clear buffer</span><input type="checkbox" id="pl-clear" checked></label>
</div>
</div>

<a id="pl-fullscreen" href="{{ site.url }}/render-particle-life">Full screen</a>

<script>
(function() {
  var iframe = document.getElementById('particle-life-iframe');
  var seedEl = document.getElementById('pl-seed');
  var colorsEl = document.getElementById('pl-colors');
  var shapeEl = document.getElementById('pl-shape');
  var clearEl = document.getElementById('pl-clear');
  var fullscreenLink = document.getElementById('pl-fullscreen');
  function send() {
    document.getElementById('pl-seed-val').textContent = seedEl.value;
    document.getElementById('pl-colors-val').textContent = colorsEl.value;
    document.getElementById('pl-shape-val').textContent = shapeEl.value;
    iframe.contentWindow.postMessage({
      type: 'particle-life-config',
      seed: parseInt(seedEl.value),
      numColors: parseInt(colorsEl.value),
      shapeSize: parseInt(shapeEl.value),
      clearBuffer: clearEl.checked
    }, '*');
  }
  function updateLink() {
    fullscreenLink.href = '{{ site.url }}/render-particle-life?seed=' + seedEl.value +
      '&colors=' + colorsEl.value + '&shape=' + shapeEl.value +
      (clearEl.checked ? '' : '&clear=0');
  }
  seedEl.addEventListener('input', function() { send(); updateLink(); });
  colorsEl.addEventListener('input', function() { send(); updateLink(); });
  shapeEl.addEventListener('input', function() { send(); updateLink(); });
  clearEl.addEventListener('change', function() {
    iframe.contentWindow.postMessage({ type: 'particle-life-clear-buffer', clearBuffer: clearEl.checked }, '*');
    updateLink();
  });
  updateLink();
  var iframeEl = document.getElementById('particle-life-iframe');
  iframeEl.addEventListener('load', function() {
    iframeEl.contentWindow.postMessage({ type: 'particle-life-bg', bgColor: [252/255, 250/255, 247/255] }, '*');
  });
})();
</script>

<!-- excerpt -->


The algorithm assigns each particle a type and defines an interaction matrix — a random NxN table of attraction/repulsion strengths between type pairs. Each step, every particle sums up forces from all others based on distance and type, producing emergent flocking and clustering behavior from a handful of scalar values.

I wanted to write this as a potential submission to [ArtBlocks](https://www.artblocks.io/), which does not support WebGPU - instead artists are required to create renders using WebGL. This poses a fun constraint, which is the lack of support for compute shaders.

To run the simulation entirely on the GPU, all particle state — position and velocity — is encoded as floating-point textures (via `OES_texture_float`). Each simulation step dispatches a full-screen quad pass whose fragment shader reads the current state textures and writes updated values back to a framebuffer. The draw pass then reads particle positions directly from texture to set `gl_Position`, using UV coordinates as the per-particle index. This is not a novel method, but it's a fun, somewhat archaic implementation.

The current implementation performs O(N²) particle interactions per step — each of the N GPU threads loops over all N particles. The next step to scale up would be to add a GPU-based acceleration structure like spatial hashing or Barnes-Hut, reducing this to O(N log N).



