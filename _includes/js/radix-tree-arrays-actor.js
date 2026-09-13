{% include js/particle-quad-common.js %}

// Stub. The radix tree node covering internal node index i, derived from the
// sorted morton keys. There are keys.length - 1 internal nodes.
function radixTreeNode(keys, i) {
    return { child0: 0, child1: 0 };
}

// One row of cells, one per internal radix tree node, showing its children.
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

        var count = Math.max(0, keys.length - 1);

        this.object = new THREE.Object3D();
        for (var i = 0; i < count; ++i) {
            var x = (i - (count - 1) * 0.5) * this.cellWidth;
            var node = radixTreeNode(keys, i);

            var outline = makeOutline(this.cellWidth, 1);
            outline.position.set(x, 0, 0);
            this.object.add(outline);

            var children = makeTextQuad("#000", this.cellWidth, 1);
            children.position.set(x, 0, 0);
            children.setText("(" + node.child0 + "," + node.child1 + ")");
            this.object.add(children);

            // The camera is y-flipped, so -y is above the cell on screen.
            var index = makeTextQuad("#000", this.cellWidth, 1);
            index.position.set(x, -0.9, 0);
            index.setText(i);
            this.object.add(index);
        }

        // Center the rows vertically in the view: from the top of the index
        // digits down to the bottom edge of the last row.
        var top = -0.9 - 0.25;
        var bottom = 0.5;
        this.object.position.y = -(top + bottom) * 0.5;
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        // Fit the whole row in view.
        var halfWidth = count * this.cellWidth * 0.5 + 0.5;
        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15, halfWidth / this.sceneActor.aspect);
    }
}
