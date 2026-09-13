// Shared pieces for the particle grid/array diagrams. The SceneActor camera is
// y-flipped, so quads are flipped back and drawn double sided.

var emptyMaterial = emptyMaterial || new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
var fillMaterial = fillMaterial || new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
var outlineMaterial = outlineMaterial || new THREE.LineBasicMaterial({ color: 0x000000 });

// A quad whose texture is a canvas the text is drawn into. Call quad.setText().
function makeTextQuad(color, width=1, height=1) {
    var canvas = document.createElement("canvas");
    canvas.width = 64 * width;
    canvas.height = 64 * height;
    var texture = new THREE.CanvasTexture(canvas);
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false }));
    quad.renderOrder = 1;
    quad.scale.set(0.9, -0.9, 1);
    quad.setText = function(text) {
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = color;
        ctx.font = "bold 34px 'Ubuntu Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        texture.needsUpdate = true;
        quad.visible = true;
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
