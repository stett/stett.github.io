{% include js/particle-quad-common.js %}
{% include js/radix-tree.js %}

// One cell per morton key, holding the index of the octree leaf node that key's
// data hangs off of.
var LeafParentsActor = LeafParentsActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=1.2) {
        super();
        this.sceneActor = sceneActor;
        this.cellWidth = cellWidth;
        this.object = null;
        this.set_keys([]);
    }

    set_keys(keys) {
        if (this.object) {
            this.sceneActor.scene.remove(this.object);
            disposeObject(this.object);
        }

        var cw = this.cellWidth;
        this.object = new THREE.Object3D();
        var object = this.object;

        function colX(i) {
            return (i - (keys.length - 1) * 0.5) * cw;
        }

        function addText(x, y, text, width=cw) {
            var quad = makeTextQuad("#000", width, 1);
            quad.position.set(x, y, 0);
            quad.setText(text);
            object.add(quad);
        }

        // Every radix node fills in the entries for whichever of its children
        // are leaves.
        var arrays = radixTreeArrays(keys);
        var leaf_parents = [];
        for (var i = 0; i < arrays.nodes.length; ++i) {
            compute_leaf_octree_parent(arrays.nodes, arrays.offsets, i, leaf_parents);
        }

        for (var i = 0; i < keys.length; ++i) {
            var outline = makeOutline(cw, 1);
            outline.position.set(colX(i), 0, 0);
            object.add(outline);
            addText(colX(i), 0, leaf_parents[i] === undefined ? "-" : leaf_parents[i]);

            // The camera is y-flipped, so -y is above the cells on screen.
            addText(colX(i), -0.9, i);
        }

        // Row labels, to the left of each row.
        var labelWidth = 5.8;
        var labelX = colX(0) - cw * 0.5 - 0.2 - labelWidth * 0.5;
        if (keys.length > 0) {
            addText(labelX, -0.9, "radix leaf index", labelWidth);
            addText(labelX, 0, "octree leaf index", labelWidth);
        }

        // Center everything in the view, from the top of the index digits and
        // the left of the row labels to the bottom of the row.
        var left = labelX - labelWidth * 0.5;
        var right = colX(keys.length - 1) + cw * 0.5;
        var top = -0.9 - 0.25;
        var bottom = 0.5;
        this.object.position.set(-(left + right) * 0.5, -(top + bottom) * 0.5, 0);
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);
    }
}
