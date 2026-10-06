// Shared pieces for the particle grid/array diagrams. The SceneActor camera is
// y-flipped, so quads are flipped back and drawn double sided.

// The diagrams take their foreground and background from the same custom
// properties the stylesheet defines, so they follow the OS light/dark
// preference exactly instead of keeping a second copy of the palette here.
var colorCache = colorCache || {};

function cssColor(name, fallback) {
    if (!(name in colorCache)) {
        var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        colorCache[name] = value || fallback;
    }
    return colorCache[name];
}

// Passed around as functions rather than strings, so a quad drawn once still
// picks up a later switch of the preference.
function fgColor() { return cssColor("--content-fg", "#291700"); }
function bgColor() { return cssColor("--content-bg", "#FCFAF7"); }

// One source for the accents, so canvas text and line materials cannot drift
// apart. Both are lifted in dark mode; see the stylesheet.
function redColor() { return cssColor("--accent-red", "#cc0000"); }
function greenColor() { return cssColor("--accent-green", "#00aa00"); }
function blueColor() { return cssColor("--accent-blue", "#00ADDF"); }

function resolveColor(color) {
    return typeof color === "function" ? color() : color;
}

// Materials hold a color of their own rather than reading one per draw, so they
// are tracked and repainted on a preference switch.
var themedMaterials = themedMaterials || [];

function themedMaterial(material, color) {
    material.color.set(resolveColor(color));
    themedMaterials.push({ material: material, color: color });
    return material;
}

var emptyMaterial = emptyMaterial || new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
var fillMaterial = fillMaterial ||
    themedMaterial(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), fgColor);
var outlineMaterial = outlineMaterial ||
    themedMaterial(new THREE.LineBasicMaterial({}), fgColor);

// The wash over the cell the mouse is on. Coplanar with the cell it covers, so
// it is drawn without depth rather than fighting for it, and it sits between
// the cells and the labels.
var hoverMaterial = hoverMaterial || themedMaterial(new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false }), blueColor);

// SceneActor registers here when these diagrams are on the page, so a live
// switch of the preference can repaint every canvas.
var themedScenes = themedScenes || [];

function registerThemedScene(sceneActor) {
    themedScenes.push(sceneActor);
}

if (typeof themeWatched === "undefined") {
    var themeWatched = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
        colorCache = {};
        for (var m = 0; m < themedMaterials.length; ++m) {
            var themed = themedMaterials[m];
            themed.material.color.set(resolveColor(themed.color));
        }
        for (var i = 0; i < themedScenes.length; ++i) {
            var sceneActor = themedScenes[i];
            sceneActor.renderer.setClearColor(bgColor(), 1);
            sceneActor.invalidate();
            sceneActor.scene.traverse(function(node) {
                if (node.refreshColors) {
                    node.refreshColors();
                }
            });
        }
    });
}

// Canvas pixels per scene unit. High enough that glyphs are drawn large and
// minified on screen, rather than magnified and blurry, even on a high DPI
// screen. Every label is its own texture and the diagrams rebuild all of them
// on each click, so this is also most of what a click costs.
var TEXT_RESOLUTION = 128;

function nextPowerOfTwo(value) {
    var pot = 1;
    while (pot < value) {
        pot *= 2;
    }
    return pot;
}

// A quad whose texture is a canvas the text is drawn into. fontHeight is in
// scene units. Call quad.setText() for one color, or
// quad.setSpans([{ text, color }, ...]) for several.
function makeTextQuad(color, width=1, height=1, fontHeight=0.5) {
    var canvas = document.createElement("canvas");
    canvas.width = nextPowerOfTwo(TEXT_RESOLUTION * width);
    canvas.height = nextPowerOfTwo(TEXT_RESOLUTION * height);
    // Mipmapped, so the minified glyphs are filtered rather than aliased. That
    // needs power-of-two canvas dimensions, which the draw below corrects for.
    var texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.generateMipmaps = true;
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false }));
    quad.renderOrder = 1;
    quad.scale.set(0.9, -0.9, 1);
    var lastSpans = null;
    quad.setSpans = function(spans) {
        lastSpans = spans;
        var ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // The canvas was rounded up to a power of two, so it is stretched onto
        // the quad horizontally. Draw into a square-pixel space of the same
        // height and pre-stretch it by the same amount, so text is not squashed.
        var pixelsPerUnit = canvas.height / height;
        var logicalWidth = pixelsPerUnit * width;
        ctx.setTransform(canvas.width / logicalWidth, 0, 0, 1, 0, 0);
        ctx.font = "bold " + (fontHeight * pixelsPerUnit) + "px 'Ubuntu Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        // Center the spans as a group.
        var total = 0;
        for (var i = 0; i < spans.length; ++i) {
            total += ctx.measureText(spans[i].text).width;
        }
        var x = (logicalWidth - total) * 0.5;
        for (var i = 0; i < spans.length; ++i) {
            ctx.fillStyle = resolveColor(spans[i].color || color);
            ctx.fillText(spans[i].text, x, canvas.height * 0.5);
            x += ctx.measureText(spans[i].text).width;
        }

        texture.needsUpdate = true;
        quad.visible = true;
    };

    quad.setText = function(text) {
        quad.setSpans([{ text: String(text), color: color }]);
    };

    // Redraw in the current colors. setSpans reveals the quad, so a label that
    // was hidden stays hidden.
    quad.refreshColors = function() {
        if (lastSpans) {
            var wasVisible = quad.visible;
            quad.setSpans(lastSpans);
            quad.visible = wasVisible;
        }
    };
    return quad;
}

// Rebuilt diagrams have to free their own GPU resources: three.js holds onto
// geometries and textures until they are disposed. Shared materials (the ones
// without a canvas texture of their own) are left alone.
//
// Disposal waits until the replacement has been drawn. Disposing every text
// material at once releases the shader program they share, and the
// replacements would then recompile it in every renderer on the next frame.
var pendingDisposals = pendingDisposals || [];

function disposeObject(object) {
    if (pendingDisposals.length == 0) {
        requestAnimationFrame(function() {
            requestAnimationFrame(disposePending);
        });
    }
    pendingDisposals.push(object);
}

function disposePending() {
    var objects = pendingDisposals.splice(0);
    for (var i = 0; i < objects.length; ++i) {
        disposeNow(objects[i]);
    }
}

function disposeNow(object) {
    object.traverse(function(node) {
        if (node.geometry) {
            node.geometry.dispose();
        }
        if (node.material && node.material.map) {
            node.material.map.dispose();
            node.material.dispose();
        }
    });
}

function makeQuad(material, width=1, height=1) {
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function makeOutline(width=1, height=1) {
    return new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height)), outlineMaterial);
}

// A dashed rectangle, for cells which are not really part of an array.
function makeDashedOutline(width=1, height=1, dash=0.12) {
    var geometry = new THREE.Geometry();
    var hw = width * 0.5;
    var hh = height * 0.5;

    function edge(x0, y0, x1, y1) {
        var length = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
        var dashes = Math.max(1, Math.round(length / (dash * 2)));
        var step = length / dashes;
        var dx = (x1 - x0) / length;
        var dy = (y1 - y0) / length;
        for (var i = 0; i < dashes; ++i) {
            var a = i * step;
            var b = a + step * 0.5;
            geometry.vertices.push(
                new THREE.Vector3(x0 + dx * a, y0 + dy * a, 0),
                new THREE.Vector3(x0 + dx * b, y0 + dy * b, 0));
        }
    }

    edge(-hw, -hh, hw, -hh);
    edge(hw, -hh, hw, hh);
    edge(hw, hh, -hw, hh);
    edge(-hw, hh, -hw, -hh);
    return new THREE.LineSegments(geometry, outlineMaterial);
}

var X_COLOR = redColor;
var Y_COLOR = greenColor;

function toBits(value, bits=3) {
    var s = value.toString(2);
    while (s.length < bits) {
        s = "0" + s;
    }
    return s;
}

// The coordinate bits interleaved from the most significant down, x first.
function toMorton(x, y, bits=3) {
    var key = 0;
    for (var i = 0; i < bits; ++i) {
        key |= ((x >> i) & 1) << (2 * i + 1);
        key |= ((y >> i) & 1) << (2 * i);
    }
    return key;
}

// A morton key as a bit string.
function toKeyBits(key, bits=6) {
    var s = key.toString(2);
    while (s.length < bits) { s = "0" + s; }
    if (s.length > bits) { s = s.substring(0, bits); }
    return s;
}

// The particles' morton keys sorted ascending, each paired with the index of
// the particle it came from.
function sortedMortonKeys(particles) {
    var entries = [];
    for (var i = 0; i < particles.length; ++i) {
        entries.push({ index: i, key: toMorton(particles[i].x, particles[i].y) });
    }
    entries.sort(function(a, b) { return a.key - b.key; });
    return entries;
}

// Morton code text spans, each bit kept in its axis color.
function toMortonSpans(x, y, bits=3) {
    var xb = toBits(x, bits);
    var yb = toBits(y, bits);
    var spans = [];
    for (var i = 0; i < bits; ++i) {
        spans.push({ text: xb[i], color: X_COLOR });
        spans.push({ text: yb[i], color: Y_COLOR });
    }
    return spans;
}
