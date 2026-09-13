// Shared pieces for the particle grid/array diagrams. The SceneActor camera is
// y-flipped, so quads are flipped back and drawn double sided.

var emptyMaterial = emptyMaterial || new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
var fillMaterial = fillMaterial || new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
var outlineMaterial = outlineMaterial || new THREE.LineBasicMaterial({ color: 0x000000 });

// Canvas pixels per scene unit. High enough that glyphs are drawn large and
// minified on screen, rather than magnified and blurry.
var TEXT_RESOLUTION = 256;

// A quad whose texture is a canvas the text is drawn into. fontHeight is in
// scene units. Call quad.setText() for one color, or
// quad.setSpans([{ text, color }, ...]) for several.
function makeTextQuad(color, width=1, height=1, fontHeight=0.5) {
    var canvas = document.createElement("canvas");
    canvas.width = TEXT_RESOLUTION * width;
    canvas.height = TEXT_RESOLUTION * height;
    var texture = new THREE.CanvasTexture(canvas);

    // The canvas is not power-of-two sized, so skip mipmaps rather than let
    // three.js rescale it.
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false }));
    quad.renderOrder = 1;
    quad.scale.set(0.9, -0.9, 1);
    quad.setSpans = function(spans) {
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold " + (fontHeight * TEXT_RESOLUTION) + "px 'Ubuntu Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        // Center the spans as a group.
        var total = 0;
        for (var i = 0; i < spans.length; ++i) {
            total += ctx.measureText(spans[i].text).width;
        }
        var x = (canvas.width - total) * 0.5;
        for (var i = 0; i < spans.length; ++i) {
            ctx.fillStyle = spans[i].color || color;
            ctx.fillText(spans[i].text, x, canvas.height / 2);
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

function makeQuad(material, width=1, height=1) {
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function makeOutline(width=1, height=1) {
    return new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height)), outlineMaterial);
}
