{% include js/particle-quad-common.js %}
{% include js/quadtree.js %}

// The quadtree node array, as many cells as the total from the allocation step,
// laid out one row per sibling group. Each cell holds the node's parent, child
// and next links, and leaf nodes are drawn dashed.
var QuadtreeNodesActor = QuadtreeNodesActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=2.4, rowPitch=2.2, cols=4) {
        super();
        this.sceneActor = sceneActor;
        this.cellWidth = cellWidth;
        this.rowPitch = rowPitch;
        this.cols = cols;
        this.object = null;
        this.set_keys([]);
    }

    set_keys(keys) {
        if (this.object) {
            this.sceneActor.scene.remove(this.object);
            disposeObject(this.object);
        }

        var cw = this.cellWidth;
        var cols = this.cols;
        this.object = new THREE.Object3D();
        var object = this.object;

        // Every row starts at the same x, so the column is the position within
        // the sibling group rather than within the row.
        function colX(j) {
            return (j - (cols - 1) * 0.5) * cw;
        }

        function addText(x, y, width, text) {
            var quad = makeTextQuad(fgColor, width, 1);
            quad.position.set(x, y, 0);
            quad.setText(text);
            object.add(quad);
        }

        function link(value) {
            // undefined while the construction pass is still unwritten.
            return (value === undefined || value < 0) ? "-" : value;
        }

        var nodes = quadtreeNodes(keys);
        var groups = quadtreeSiblingGroups(nodes);

        var labelWidth = 4.5;
        var labelX = colX(0) - cw * 0.5 - 0.2 - labelWidth * 0.5;
        var rowPitch = this.rowPitch;

        for (var r = 0; r < groups.length; ++r) {
            var y = r * rowPitch;
            addText(labelX, y, labelWidth, r == 0 ?
                "root" : "parent " + link(nodes[groups[r][0]].parent));

            for (var j = 0; j < groups[r].length; ++j) {
                var i = groups[r][j];
                var node = nodes[i];

                // Leaves are inset a little so two of them side by side don't
                // share a dashed edge.
                var inset = 0.1;
                var outline = node.is_leaf ?
                    makeDashedOutline(cw - inset * 2, 1 - inset * 2) : makeOutline(cw, 1);
                outline.position.set(colX(j), y, 0);
                object.add(outline);

                addText(colX(j), y, cw, "(" + link(node.parent) + "," +
                    link(node.child) + "," + link(node.next) + ")");

                // The camera is y-flipped, so -y is above the cell on screen.
                addText(colX(j), y - 0.9, cw, i);
            }
        }

        // Center everything in the view, from the top of the first row's index
        // digits and the left of the row labels to the bottom of the last row.
        var left = labelX - labelWidth * 0.5;
        var right = colX(cols - 1) + cw * 0.5;
        var top = -0.9 - 0.25;
        var bottom = Math.max(0, groups.length - 1) * rowPitch + 0.5;
        this.object.position.set(-(left + right) * 0.5, -(top + bottom) * 0.5, 0);
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);
    }
}
