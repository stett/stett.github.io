{% include js/particle-quad-common.js %}
{% include js/radix-tree.js %}

// A row of cells per radix tree array, one cell per internal node.
var RadixTreeArraysActor = RadixTreeArraysActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=3, rowPitch=1.25) {
        super();
        this.sceneActor = sceneActor;
        this.cellWidth = cellWidth;
        this.rowPitch = rowPitch;
        this.object = null;
        this.set_keys([]);
    }

    set_keys(keys) {
        if (this.object) {
            this.sceneActor.scene.remove(this.object);
            disposeObject(this.object);
        }

        var cw = this.cellWidth;
        var count = Math.max(0, keys.length - 1);
        this.object = new THREE.Object3D();
        var object = this.object;

        function colX(i) {
            return (i - (count - 1) * 0.5) * cw;
        }

        function addText(x, y, width, text) {
            var quad = makeTextQuad("#000", width, 1);
            quad.position.set(x, y, 0);
            quad.setText(text);
            object.add(quad);
        }

        // Every node has to be built before the parents array is complete.
        var parents = [];
        var nodes = [];
        for (var i = 0; i < count; ++i) {
            nodes.push(radixTreeNode(keys, i, parents));
        }

        for (var i = 0; i < count; ++i) {
            var node = nodes[i];

            var childOutline = makeOutline(cw, 1);
            childOutline.position.set(colX(i), 0, 0);
            object.add(childOutline);
            addText(colX(i), 0, cw,
                "(" + (node.leaf_child0 ? "" : "*") + node.index_child0 + "," +
                (node.leaf_child1 ? "" : "*") + node.index_child1 + ")");

            var parentOutline = makeOutline(cw, 1);
            parentOutline.position.set(colX(i), this.rowPitch, 0);
            object.add(parentOutline);
            addText(colX(i), this.rowPitch, cw,
                parents[i] === undefined ? "-" : "*" + parents[i]);

            // The camera is y-flipped, so -y is above the cell on screen.
            addText(colX(i), -0.9, cw, i);
        }

        // Row labels, to the left of each row.
        var labelWidth = 3;
        var labelX = colX(0) - cw * 0.5 - 0.2 - labelWidth * 0.5;
        if (count > 0) {
            addText(labelX, 0, labelWidth, "children");
            addText(labelX, this.rowPitch, labelWidth, "parents");
        }

        // Center everything in the view, from the top of the index digits and
        // the left of the row labels to the bottom of the last row.
        var left = labelX - labelWidth * 0.5;
        var right = colX(count - 1) + cw * 0.5;
        var top = -0.9 - 0.25;
        var bottom = this.rowPitch + 0.5;
        this.object.position.set(-(left + right) * 0.5, -(top + bottom) * 0.5, 0);
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);
    }
}
