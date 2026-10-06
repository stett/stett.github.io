{% include js/particle-quad-common.js %}
{% include js/quadtree.js %}

// A circle outline, as segments so it can share the line materials.
function makeCircleOutline(radius=0.5, segments=40) {
    var geometry = new THREE.Geometry();
    for (var i = 0; i < segments; ++i) {
        var a0 = (i / segments) * 2 * Math.PI;
        var a1 = ((i + 1) / segments) * 2 * Math.PI;
        geometry.vertices.push(
            new THREE.Vector3(Math.cos(a0) * radius, Math.sin(a0) * radius, 0),
            new THREE.Vector3(Math.cos(a1) * radius, Math.sin(a1) * radius, 0));
    }
    return new THREE.LineSegments(geometry, outlineMaterial);
}

// The quadtree drawn as the space it divides, the same square as the particle
// grid, built into a fresh object. Every internal node is crossed into its four
// quadrants, and every leaf is a dashed outline of its bounds. The nodes and
// leaf outlines are drawn from the bounds stored on the nodes. Each key gets a
// circle on the grid cell it came from, holding the index of its particle in
// the original input rather than its index in the sorted keys, so it matches
// the particle grid.
function makeQuadtreeBounds(particles, size=8) {
    var object = new THREE.Object3D();

    // Bounds are in the unit square with y up. The camera is y-flipped, so
    // scene +y is down on screen, and this lands every bounds on the same
    // cells as the particle grid.
    function sceneX(x) { return (x - 0.5) * size; }
    function sceneY(y) { return (0.5 - y) * size; }

    var lines = new THREE.Geometry();
    function segment(x0, y0, x1, y1) {
        lines.vertices.push(
            new THREE.Vector3(sceneX(x0), sceneY(y0), 0),
            new THREE.Vector3(sceneX(x1), sceneY(y1), 0));
    }

    // The root is the whole square, and has no bounds of its own stored.
    var root = makeOutline(size, size);
    object.add(root);

    // The sort pairs each key with the particle it came from, which is the
    // map back from a key index to the original input.
    var entries = sortedMortonKeys(particles);
    var keys = entries.map(function(entry) { return entry.key; });

    var nodes = quadtreeNodes(keys);
    for (var i = 0; i < nodes.length; ++i) {
        var node = nodes[i];
        var bounds = i == 0 ? { center: [0.5, 0.5], half_extent: 0.5 } : node.bounds;
        if (!bounds) {
            continue;
        }
        var cx = bounds.center[0];
        var cy = bounds.center[1];
        var h = bounds.half_extent;

        if (!node.is_leaf) {
            // The cross through the middle splits the node into its quadrants.
            // Its outline is already drawn, by the root or the parent's cross.
            segment(cx - h, cy, cx + h, cy);
            segment(cx, cy - h, cx, cy + h);
            continue;
        }

        // Inset a little so the dashes don't sit on top of the solid lines
        // of the crosses around them.
        var inset = 0.1;
        var outline = makeDashedOutline(h * 2 * size - inset * 2, h * 2 * size - inset * 2);
        outline.position.set(sceneX(cx), sceneY(cy), 0);
        object.add(outline);

        // A leaf's child is the index of its key. The leaf's bounds can be
        // any size, so the circle goes on the key's own cell instead - the
        // bounds at the deepest level, where every cell is one grid square.
        var levels = Math.round(Math.log2(size));
        var cell = compute_quadtree_bounds(levels, keys[node.child], levels * 2);
        var x = sceneX(cell.center[0]);
        var y = sceneY(cell.center[1]);

        var circle = makeCircleOutline(0.4);
        circle.position.set(x, y, 0);
        object.add(circle);

        var label = makeTextQuad(fgColor);
        label.position.set(x, y, 0);
        label.setText(entries[node.child].index);
        object.add(label);
    }

    object.add(new THREE.LineSegments(lines, outlineMaterial));
    return object;
}

var QuadtreeBoundsActor = QuadtreeBoundsActor || class extends DRAMA.Actor {
    constructor(sceneActor, size=8) {
        super();
        this.sceneActor = sceneActor;
        this.size = size;
        this.object = null;
        this.set_particles([]);
    }

    set_particles(particles) {
        if (this.object) {
            this.sceneActor.scene.remove(this.object);
            disposeObject(this.object);
        }
        this.object = makeQuadtreeBounds(particles, this.size);
        this.sceneActor.scene.add(this.object);
        this.sceneActor.invalidate();
    }
}
