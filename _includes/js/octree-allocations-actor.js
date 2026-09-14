{% include js/particle-quad-common.js %}
{% include js/radix-tree.js %}

// How many octree nodes each radix node allocates, the exclusive prefix sum of
// those counts - the offset each radix node's octree nodes start at - and the
// resulting total, which is the sum plus one for the root node.
var OctreeAllocationsActor = OctreeAllocationsActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=1.2, rowPitch=1.25) {
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

        function addCell(x, y, text) {
            var outline = makeOutline(cw, 1);
            outline.position.set(x, y, 0);
            object.add(outline);
            addText(x, y, cw, text);
        }

        // Sum the octree nodes each radix node needs, then exclusively prefix
        // sum them. The root node is not covered by any radix node.
        var counts = [];
        var offsets = [];
        var sum = 0;
        for (var i = 0; i < count; ++i) {
            var node = radixTreeNode(keys, i);
            counts.push(node.quadtree_internals + node.quadtree_leaves);
            offsets.push(sum);
            sum += counts[i];
        }

        var rows = [
            { label: "counts", values: counts },
            { label: "offsets", values: offsets }
        ];

        var labelWidth = 3;
        var labelX = colX(0) - cw * 0.5 - 0.2 - labelWidth * 0.5;

        for (var r = 0; r < rows.length; ++r) {
            var y = r * this.rowPitch;
            if (count > 0) {
                addText(labelX, y, labelWidth, rows[r].label);
            }
            for (var i = 0; i < count; ++i) {
                addCell(colX(i), y, rows[r].values[i]);

                // The camera is y-flipped, so -y is above the cells on screen.
                if (r == 0) {
                    addText(colX(i), -0.9, cw, i);
                }
            }
        }

        // The last value of the prefix sum runs past the end of the array, so
        // its cell is dashed.
        var sumX = colX(count - 1) + cw + 0.2;
        if (count > 0) {
            var sumOutline = makeDashedOutline(cw, 1);
            sumOutline.position.set(sumX, this.rowPitch, 0);
            object.add(sumOutline);
            addText(sumX, this.rowPitch, cw, sum);
        }

        // The total, on its own row.
        var totalY = rows.length * this.rowPitch;
        if (count > 0) {
            addText(labelX, totalY, labelWidth, "total");
            addText(colX(0), totalY, cw, sum + 1);
        }

        // Center everything in the view, from the top of the index digits and
        // the left of the row labels to the bottom of the last row.
        var left = labelX - labelWidth * 0.5;
        var right = sumX + cw * 0.5;
        var top = -0.9 - 0.25;
        var bottom = totalY + 0.5;
        this.object.position.set(-(left + right) * 0.5, -(top + bottom) * 0.5, 0);
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);
    }
}
