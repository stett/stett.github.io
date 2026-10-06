{% include js/particle-quad-common.js %}
{% include js/quadtree-bounds-actor.js %}

// The input grid, where clicking a cell toggles a particle in it. Rather than
// the cells, it draws the quadtree built from the particles, as in the final
// bounds diagram, with the particles numbered by their order in the input.
var ParticleGridActor = ParticleGridActor || class extends DRAMA.Actor {
    constructor(sceneActor, size=8, onchange=function(particles) {}, max=10) {
        super();
        this.size = size;
        this.onchange = onchange;
        this.max = Math.min(max, size * size);
        this.sceneActor = sceneActor;
        this.scene = sceneActor.scene;
        this.camera = sceneActor.camera;
        this.canvas = sceneActor.renderer.domElement;
        this.order = []; // cell ids, in the order they were clicked
        this.cells = [];
        this.particles = [];
        this.tree = null;
        this.object = new THREE.Object3D();

        // Cells, indexed row-major with (0, 0) at the bottom left. They are
        // never drawn, but they are what the clicks land on.
        for (var i = 0; i < size * size; ++i) {
            var x = this._x(i % size);
            var y = this._y(Math.floor(i / size));

            var cell = makeQuad(emptyMaterial);
            cell.position.set(x, y, 0);
            cell.cellId = i;
            this.cells.push(cell);
            this.object.add(cell);
        }

        // Moved onto whichever cell the mouse is over. renderOrder puts it
        // above the cells and below the text, which is at 1.
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
        this._show([]);

        this.raycaster = new THREE.Raycaster();
        var self = this;
        this.canvas.addEventListener("mousedown", function(event) { self._click(event); });
        this.canvas.addEventListener("mousemove", function(event) { self._hover(event); });
        this.canvas.addEventListener("mouseleave", function() { self._unhover(); });
    }

    _show(particles) {
        if (this.tree) {
            this.object.remove(this.tree);
            disposeObject(this.tree);
        }
        this.tree = makeQuadtreeBounds(particles, this.size);
        this.object.add(this.tree);
        this.sceneActor.invalidate();
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
            if (!this.hover.visible || !this.hover.position.equals(cell.position)) {
                this.sceneActor.invalidate();
            }
            this.hover.position.copy(cell.position);
            this.hover.visible = true;
            this.canvas.style.cursor = "pointer";
        } else {
            this._unhover();
        }
    }

    _unhover() {
        if (this.hover.visible) {
            this.sceneActor.invalidate();
        }
        this.hover.visible = false;
        this.canvas.style.cursor = "";
    }

    // Replace the particles with the given [x, y] cells, in that order.
    place(cells) {
        this.order = [];
        for (var i = 0; i < cells.length && this.order.length < this.max; ++i) {
            var id = cells[i][0] + cells[i][1] * this.size;
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
        var particles = [];
        for (var p = 0; p < this.order.length; ++p) {
            particles.push({ x: this.order[p] % this.size, y: Math.floor(this.order[p] / this.size) });
        }
        this.particles = particles;
        this._show(particles);
        this.onchange(particles);
    }
}
