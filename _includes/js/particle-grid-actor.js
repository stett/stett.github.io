{% include js/particle-quad-common.js %}

// Small seeded PRNG returning floats in [0, 1), a stand-in for Math.random.
function mulberry32(seed) {
    return function() {
        seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

var ParticleGridActor = ParticleGridActor || class extends DRAMA.Actor {
    constructor(sceneActor, size=8, onchange=function(particles) {}, max=10) {
        super();
        this.size = size;
        this.onchange = onchange;
        this.max = Math.min(max, size * size);
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

            var label = makeTextQuad(bgColor);
            label.position.set(x, y, 0);
            label.visible = false;
            this.labels.push(label);
            this.object.add(label);
        }

        // Moved onto whichever cell the mouse is over. renderOrder puts it
        // above the cells and below the labels, which are at 1.
        this.hover = makeQuad(hoverMaterial);
        this.hover.renderOrder = 0.5;
        this.hover.visible = false;
        this.object.add(this.hover);

        // Row and column indices.
        for (var i = 0; i < size; ++i) {
            var col = makeTextQuad(fgColor);
            col.position.set(this._x(i), this._y(-1), 0);
            col.setText(i);
            this.object.add(col);

            var row = makeTextQuad(fgColor);
            row.position.set(this._x(-1), this._y(i), 0);
            row.setText(i);
            this.object.add(row);
        }

        // The index labels only sit along two sides, so shift the grid to keep
        // the whole diagram centered in the view.
        this.object.position.y = -0.37;
        this.scene.add(this.object);

        this.raycaster = new THREE.Raycaster();
        var self = this;
        this.canvas.addEventListener("mousedown", function(event) { self._click(event); });
        this.canvas.addEventListener("mousemove", function(event) { self._hover(event); });
        this.canvas.addEventListener("mouseleave", function() { self._unhover(); });
    }

    _x(col) { return col - (this.size - 1) * 0.5; }

    // The camera is y-flipped, so scene +y is down on screen.
    _y(row) { return (this.size - 1) * 0.5 - row; }

    _pick(event) {
        var rect = this.canvas.getBoundingClientRect();
        var mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(mouse, this.camera);
        var hits = this.raycaster.intersectObjects(this.cells);
        return hits.length ? hits[0].object : null;
    }

    _click(event) {
        var cell = this._pick(event);
        if (cell) {
            this.toggle(cell.cellId);
        }
    }

    // The cells are the only thing on the canvas worth clicking, so the cursor
    // and the highlight both track whether one is under the pointer.
    _hover(event) {
        var cell = this._pick(event);
        if (cell) {
            this.hover.position.copy(cell.position);
            this.hover.visible = true;
            this.canvas.style.cursor = "pointer";
        } else {
            this._unhover();
        }
    }

    _unhover() {
        this.hover.visible = false;
        this.canvas.style.cursor = "";
    }

    // Occupy count distinct random cells, in random order. Passing a seed
    // makes the layout repeatable across page loads.
    randomize(count, seed) {
        var random = seed === undefined ? Math.random : mulberry32(seed);
        count = Math.min(count, this.max);
        while (this.order.length < count) {
            var id = Math.floor(random() * this.size * this.size);
            if (this.order.indexOf(id) < 0) {
                this.order.push(id);
            }
        }
        this._refresh();
    }

    toggle(id) {
        var at = this.order.indexOf(id);
        if (at < 0) {
            this.order.push(id);

            // Past the cap, the oldest particle drops off and the rest shift down.
            if (this.order.length > this.max) {
                this.order.shift();
            }
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
