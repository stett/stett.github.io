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

// Repaint every diagram canvas, redrawing text in the current colors and font.
function repaintThemedScenes() {
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
}

if (typeof themeWatched === "undefined") {
    var themeWatched = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
        colorCache = {};
        for (var m = 0; m < themedMaterials.length; ++m) {
            var themed = themedMaterials[m];
            themed.material.color.set(resolveColor(themed.color));
        }
        repaintThemedScenes();
    });
}

// Text is drawn from a glyph atlas: every printable ASCII character drawn once,
// in white, into one shared texture. A label is then just a quad per character,
// tinted with vertex colors. The diagrams rebuild all their labels on every
// click, and this way that never draws to a canvas or uploads a texture, which
// is slow everywhere and very slow in Safari.
var ATLAS_FIRST = 32;
var ATLAS_LAST = 126;
var ATLAS_COLS = 16;

// Atlas pixels per em. High enough that glyphs are drawn large and minified on
// screen, rather than magnified and blurry, even on a high DPI screen.
var ATLAS_FONT_PX = 64;

// Space around each glyph, so neighbors don't bleed in at the smaller mipmaps.
var ATLAS_PAD = 8;

var textAtlas = textAtlas || null;

function nextPowerOfTwo(value) {
    var pot = 1;
    while (pot < value) {
        pot *= 2;
    }
    return pot;
}

function drawTextAtlas(atlas) {
    var ctx = atlas.canvas.getContext("2d");
    var font = "bold " + ATLAS_FONT_PX + "px 'Ubuntu Mono', monospace";
    ctx.font = font;

    // Monospaced, so one advance serves every character.
    atlas.advance = ctx.measureText("M").width;
    atlas.cellWidth = Math.ceil(atlas.advance + ATLAS_PAD * 2);
    atlas.cellHeight = Math.ceil(ATLAS_FONT_PX * 1.25 + ATLAS_PAD * 2);
    var rows = Math.ceil((ATLAS_LAST - ATLAS_FIRST + 1) / ATLAS_COLS);

    // Power-of-two dimensions, so the atlas can be mipmapped.
    atlas.canvas.width = nextPowerOfTwo(ATLAS_COLS * atlas.cellWidth);
    atlas.canvas.height = nextPowerOfTwo(rows * atlas.cellHeight);

    // Resizing the canvas reset the context.
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    for (var c = ATLAS_FIRST; c <= ATLAS_LAST; ++c) {
        var i = c - ATLAS_FIRST;
        ctx.fillText(String.fromCharCode(c),
            (i % ATLAS_COLS) * atlas.cellWidth + ATLAS_PAD,
            (Math.floor(i / ATLAS_COLS) + 0.5) * atlas.cellHeight);
    }
    atlas.texture.needsUpdate = true;
}

function getTextAtlas() {
    if (textAtlas) {
        return textAtlas;
    }

    var canvas = document.createElement("canvas");
    var texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.generateMipmaps = true;
    textAtlas = {
        canvas: canvas,
        texture: texture,
        material: new THREE.MeshBasicMaterial({
            map: texture,
            vertexColors: THREE.VertexColors,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false })
    };
    drawTextAtlas(textAtlas);

    // The web font may still be loading, in which case the atlas was drawn in
    // the fallback. Redraw it, and every label, once the font arrives.
    if (document.fonts && document.fonts.load) {
        document.fonts.load("bold " + ATLAS_FONT_PX + "px 'Ubuntu Mono'").then(function() {
            drawTextAtlas(textAtlas);
            repaintThemedScenes();
        });
    }
    return textAtlas;
}

// A label, centered on its origin. fontHeight is in scene units; width and
// height are the size of the cell it sits in. Call quad.setText() for one
// color, or quad.setSpans([{ text, color }, ...]) for several.
function makeTextQuad(color, width=1, height=1, fontHeight=0.5) {
    var atlas = getTextAtlas();
    var quad = new THREE.Mesh(new THREE.BufferGeometry(), atlas.material);
    quad.renderOrder = 1;
    quad.scale.set(0.9, -0.9, 1);
    var lastSpans = null;
    quad.setSpans = function(spans) {
        lastSpans = spans;

        var text = "";
        var colors = [];
        for (var i = 0; i < spans.length; ++i) {
            var spanColor = new THREE.Color(resolveColor(spans[i].color || color));
            for (var j = 0; j < spans[i].text.length; ++j) {
                text += spans[i].text[j];
                colors.push(spanColor);
            }
        }

        // One quad per visible character, the run of them centered as a group.
        // The atlas canvas is uploaded flipped, so canvas rows run down from
        // v = 1, and the top of a glyph is +y here.
        var unit = fontHeight / ATLAS_FONT_PX;
        var cw = atlas.cellWidth;
        var ch = atlas.cellHeight;
        var aw = atlas.canvas.width;
        var ah = atlas.canvas.height;
        var x0 = -text.length * atlas.advance * unit * 0.5;
        var top = ch * unit * 0.5;
        var positions = [];
        var uvs = [];
        var vertexColors = [];
        var indices = [];
        for (var i = 0; i < text.length; ++i) {
            var code = text.charCodeAt(i);
            if (code == 32) {
                continue;
            }
            if (code < ATLAS_FIRST || code > ATLAS_LAST) {
                code = 63; // "?"
            }
            var cell = code - ATLAS_FIRST;
            var u0 = (cell % ATLAS_COLS) * cw / aw;
            var u1 = u0 + cw / aw;
            var v0 = 1 - Math.floor(cell / ATLAS_COLS) * ch / ah;
            var v1 = v0 - ch / ah;
            var left = x0 + (i * atlas.advance - ATLAS_PAD) * unit;
            var right = left + cw * unit;

            var base = positions.length / 3;
            positions.push(left, top, 0, right, top, 0, left, -top, 0, right, -top, 0);
            uvs.push(u0, v0, u1, v0, u0, v1, u1, v1);
            for (var k = 0; k < 4; ++k) {
                vertexColors.push(colors[i].r, colors[i].g, colors[i].b);
            }
            indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
        }

        var geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.addAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.addAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geometry.addAttribute("color", new THREE.Float32BufferAttribute(vertexColors, 3));
        quad.geometry.dispose();
        quad.geometry = geometry;
        quad.visible = true;
    };

    quad.setText = function(text) {
        quad.setSpans([{ text: String(text), color: color }]);
    };

    // Rebuild in the current colors and font. setSpans reveals the quad, so a
    // label that was hidden stays hidden.
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
// geometries until they are disposed. Materials are all shared, so they are
// left alone.
function disposeObject(object) {
    object.traverse(function(node) {
        if (node.geometry) {
            node.geometry.dispose();
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
