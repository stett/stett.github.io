// Shared pieces for the particle grid/array diagrams. The SceneActor camera is
// y-flipped, so quads are flipped back and drawn double sided.

var emptyMaterial = emptyMaterial || new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
var fillMaterial = fillMaterial || new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
var outlineMaterial = outlineMaterial || new THREE.LineBasicMaterial({ color: 0x000000 });

// Canvas pixels per scene unit. High enough that glyphs are drawn large and
// minified on screen, rather than magnified and blurry.
var TEXT_RESOLUTION = 512;

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
    quad.setSpans = function(spans) {
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
            ctx.fillStyle = spans[i].color || color;
            ctx.fillText(spans[i].text, x, canvas.height * 0.5);
            x += ctx.measureText(spans[i].text).width;
        }

        texture.needsUpdate = true;
        quad.visible = true;
    };

    quad.setText = function(text) {
        quad.setSpans([{ text: String(text), color: color }]);
    };
    return quad;
}

// Rebuilt diagrams have to free their own GPU resources: three.js holds onto
// geometries and textures until they are disposed. Shared materials (the ones
// without a canvas texture of their own) are left alone.
function disposeObject(object) {
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

// One source for the red, so canvas text and line materials cannot drift apart.
var RED = RED || new THREE.Color(0xcc0000);
var RED_CSS = RED_CSS || "#" + RED.getHexString();

var X_COLOR = RED_CSS;
var Y_COLOR = "#00aa00";

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
