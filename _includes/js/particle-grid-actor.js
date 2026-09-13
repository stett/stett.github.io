{% include js/particle-quad-common.js %}

var ParticleGridActor = ParticleGridActor || class extends DRAMA.Actor {
    constructor(sceneActor, size=8, onchange=function(particles) {}) {
        super();
        this.size = size;
        this.onchange = onchange;
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

            var cell = makeQuad(emptyMaterial);
            cell.position.set(x, y, 0);
            cell.cellId = i;
            this.cells.push(cell);
            this.object.add(cell);

            var outline = makeOutline();
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

    // Occupy count distinct random cells, in random order.
    randomize(count) {
        count = Math.min(count, this.size * this.size);
        while (this.order.length < count) {
            var id = Math.floor(Math.random() * this.size * this.size);
            if (this.order.indexOf(id) < 0) {
                this.order.push(id);
            }
        }
        this._refresh();
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
        var particles = [];
        for (var p = 0; p < this.order.length; ++p) {
            this.cells[this.order[p]].material = fillMaterial;
            this.labels[this.order[p]].setText(p);
            particles.push({ x: this.order[p] % this.size, y: Math.floor(this.order[p] / this.size) });
        }
        this.onchange(particles);
    }
}
