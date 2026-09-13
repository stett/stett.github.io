{% include js/quad-actor-common.js %}

var emptyMaterial = emptyMaterial || new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
var outlineMaterial = outlineMaterial || new THREE.LineBasicMaterial({ color: 0x000000 });
// Double sided, because the y-flipped camera reverses the quad winding.
var fillMaterial = fillMaterial || new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
var quadGeometry = quadGeometry || new THREE.PlaneGeometry(1, 1);
var outlineGeometry = outlineGeometry || new THREE.EdgesGeometry(quadGeometry);

// Text drawn to a canvas texture on a unit quad. The scene camera is y-flipped,
// so the quad is flipped back and drawn double sided.
function makeTextQuad(color) {
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    var texture = new THREE.CanvasTexture(canvas);
    var quad = new THREE.Mesh(quadGeometry, new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false }));
    quad.renderOrder = 1;
    quad.scale.set(0.9, -0.9, 1);
    quad.setText = function(text) {
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = color;
        ctx.font = "bold 34px 'Ubuntu Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 32, 32);
        texture.needsUpdate = true;
        quad.visible = true;
    };
    return quad;
}

var ParticleGridActor = ParticleGridActor || class extends DRAMA.Actor {
    constructor(sceneActor, size=8) {
        super();
        this.size = size;
        this.scene = sceneActor.scene;
        this.camera = sceneActor.camera;
        this.canvas = sceneActor.renderer.domElement;
        this.order = []; // cell ids, in the order they were clicked
        this.cells = [];
        this.labels = [];
        this.object = new THREE.Object3D();

        // Cells, indexed row-major with (0, 0) at the bottom left.
        for (var i = 0; i < size * size; ++i) {
            var x = this._x(i % size);
            var y = this._y(Math.floor(i / size));

            var cell = new THREE.Mesh(quadGeometry, emptyMaterial);
            cell.position.set(x, y, 0);
            cell.cellId = i;
            this.cells.push(cell);
            this.object.add(cell);

            var outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
            outline.position.set(x, y, 0);
            this.object.add(outline);

            var label = makeTextQuad("#fff");
            label.position.set(x, y, 0);
            label.visible = false;
            this.labels.push(label);
            this.object.add(label);
        }

        // Row and column indices.
        for (var i = 0; i < size; ++i) {
            var col = makeTextQuad("#000");
            col.position.set(this._x(i), this._y(-1), 0);
            col.setText(i);
            this.object.add(col);

            var row = makeTextQuad("#000");
            row.position.set(this._x(-1), this._y(i), 0);
            row.setText(i);
            this.object.add(row);
        }

        this.scene.add(this.object);

        this.raycaster = new THREE.Raycaster();
        var self = this;
        this.canvas.addEventListener("mousedown", function(event) { self._click(event); });
    }

    _x(col) { return col - (this.size - 1) * 0.5; }

    // The camera is y-flipped, so scene +y is down on screen.
    _y(row) { return (this.size - 1) * 0.5 - row; }

    _click(event) {
        var rect = this.canvas.getBoundingClientRect();
        var mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(mouse, this.camera);
        var hits = this.raycaster.intersectObjects(this.cells);
        if (hits.length) {
            this.toggle(hits[0].object.cellId);
        }
    }

    toggle(id) {
        var at = this.order.indexOf(id);
        if (at < 0) {
            if (this.order.length >= this.size * this.size) return;
            this.order.push(id);
        } else {
            this.order.splice(at, 1);
        }
        this._refresh();
    }

    _refresh() {
        for (var i = 0; i < this.cells.length; ++i) {
            this.cells[i].material = emptyMaterial;
            this.labels[i].visible = false;
        }
        for (var p = 0; p < this.order.length; ++p) {
            this.cells[this.order[p]].material = fillMaterial;
            this.labels[this.order[p]].setText(p);
        }
    }
}
