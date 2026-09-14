{% include js/particle-quad-common.js %}
{% include js/radix-tree.js %}

var RANGE_COLOR = RED_CSS;
var rangeMaterial = rangeMaterial || new THREE.LineBasicMaterial({ color: RED });

// A horizontal arrow from one x to another, as a shaft plus two head strokes.
function makeArrow(from, to, head=0.3) {
    var dir = to < from ? -1 : 1;
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(from, 0, 0), new THREE.Vector3(to, 0, 0));
    geometry.vertices.push(new THREE.Vector3(to, 0, 0), new THREE.Vector3(to - dir * head, -head * 0.7, 0));
    geometry.vertices.push(new THREE.Vector3(to, 0, 0), new THREE.Vector3(to - dir * head, head * 0.7, 0));
    return new THREE.LineSegments(geometry, rangeMaterial);
}

// A vertical dotted line, dotted in from the top and bottom of a cell so that
// it does not run through the text and arrow in the middle of it.
function makeDottedLine(halfHeight=0.45, inner=0.22, dashes=2) {
    var geometry = new THREE.Geometry();
    var step = (halfHeight - inner) / (dashes * 2 - 1);
    for (var i = 0; i < dashes; ++i) {
        var y = inner + i * 2 * step;
        geometry.vertices.push(new THREE.Vector3(0, y, 0), new THREE.Vector3(0, y + step, 0));
        geometry.vertices.push(new THREE.Vector3(0, -y, 0), new THREE.Vector3(0, -y - step, 0));
    }
    return new THREE.LineSegments(geometry, rangeMaterial);
}

// The sorted morton keys along the top, then one row per radix tree node: its
// node index, its binary prefix, and a cell spanning the range of keys the node
// covers, with an arrow for the direction the range runs in and a dotted line
// at the split between its two children.
var RadixTreeSplitActor = RadixTreeSplitActor || class extends DRAMA.Actor {
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

        // Center of the column holding key j.
        function colX(j) {
            return (j - (keys.length - 1) * 0.5) * cw;
        }

        function addText(x, y, width, text, color) {
            var quad = makeTextQuad(color, width, 1);
            quad.position.set(x, y, 0);
            quad.setText(text);
            object.add(quad);
        }

        // The keys themselves, with their indices above.
        for (var j = 0; j < keys.length; ++j) {
            var outline = makeOutline(cw, 1);
            outline.position.set(colX(j), 0, 0);
            object.add(outline);
            addText(colX(j), 0, cw, toKeyBits(keys[j]), "#000");

            // The camera is y-flipped, so -y is above the cell on screen.
            addText(colX(j), -0.9, cw, j, "#000");
        }

        // The node index, to the left of each node's range.
        var gap = 0.2;
        var prefixWidth = 2.5;
        var indexWidth = 1.5;
        var indexX = colX(0) - cw * 0.5 - gap - indexWidth * 0.5;

        for (var i = 0; i < count; ++i) {
            var y = (i + 1) * this.rowPitch;
            var node = radixTreeNode(keys, i);

            addText(indexX, y, indexWidth, "*" + i, "#000");

            // The span of keys the node covers.
            var first = node.index_min;
            var last = node.index_max;
            var center = (colX(first) + colX(last)) * 0.5;
            var range = makeOutline((last - first + 1) * cw, 1);
            range.position.set(center, y, 0);
            object.add(range);

            // The node's common prefix, at the end of the range the node's own
            // key sits at, with the arrow running from it out to the far end.
            var dir = node.range_dir < 0 ? -1 : 1;
            var head = dir > 0 ? colX(last) + cw * 0.5 : colX(first) - cw * 0.5;
            addText(colX(i), y, prefixWidth, "[" + prefixDashes(node.prefix_str) + "]", RANGE_COLOR);

            var arrow = makeArrow(colX(i) + dir * (cw * 0.4 + 0.1), head - dir * 0.3);
            arrow.position.set(0, y, 0);
            object.add(arrow);

            // The split between the node's two children.
            var split = makeDottedLine();
            split.position.set(colX(node.index_child0) + cw * 0.5, y, 0);
            object.add(split);
        }

        // Center everything in the view, from the top of the index digits and
        // the left of the node index column to the bottom of the last row.
        var left = indexX - indexWidth * 0.5;
        var right = colX(keys.length - 1) + cw * 0.5;
        var top = -0.9 - 0.25;
        var bottom = count * this.rowPitch + 0.5;
        this.object.position.set(-(left + right) * 0.5, -(top + bottom) * 0.5, 0);
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);
    }
}
