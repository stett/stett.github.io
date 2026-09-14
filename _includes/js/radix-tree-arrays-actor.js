{% include js/particle-quad-common.js %}
{% include js/radix-tree.js %}

// A row of cells per radix tree array, one cell per internal node.
var RadixTreeArraysActor = RadixTreeArraysActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=2.4, rowPitch=1.25) {
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

        var rows = [
            { label: "children", text: function(node, i) {
                return "(" + (node.leaf_child0 ? "" : "*") + node.index_child0 + "," +
                    (node.leaf_child1 ? "" : "*") + node.index_child1 + ")";
            } },
            { label: "parents", text: function(node, i) {
                return parents[i] === undefined ? "-" : "*" + parents[i];
            } },
            { label: "octree_internals", text: function(node, i) {
                return node.octree_internals;
            } },
            { label: "octree_children", text: function(node, i) {
                return node.octree_children;
            } }
        ];

        // Row labels, to the left of each row.
        var labelWidth = 5.5;
        var labelX = colX(0) - cw * 0.5 - 0.2 - labelWidth * 0.5;

        for (var r = 0; r < rows.length; ++r) {
            var y = r * this.rowPitch;
            if (count > 0) {
                addText(labelX, y, labelWidth, rows[r].label);
            }
            for (var i = 0; i < count; ++i) {
                var outline = makeOutline(cw, 1);
                outline.position.set(colX(i), y, 0);
                object.add(outline);
                addText(colX(i), y, cw, rows[r].text(nodes[i], i));
            }
        }

        // The camera is y-flipped, so -y is above the cells on screen.
        for (var i = 0; i < count; ++i) {
            addText(colX(i), -0.9, cw, i);
        }

        // Center everything in the view, from the top of the index digits and
        // the left of the row labels to the bottom of the last row.
        var left = labelX - labelWidth * 0.5;
        var right = colX(count - 1) + cw * 0.5;
        var top = -0.9 - 0.25;
        var bottom = (rows.length - 1) * this.rowPitch + 0.5;
        this.object.position.set(-(left + right) * 0.5, -(top + bottom) * 0.5, 0);
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);
    }
}
