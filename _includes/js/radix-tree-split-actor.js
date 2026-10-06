{% include js/particle-quad-common.js %}
{% include js/radix-tree.js %}

var RANGE_COLOR = redColor;
var rangeMaterial = rangeMaterial ||
    themedMaterial(new THREE.LineBasicMaterial({}), redColor);

// A horizontal arrow from one x to another, as a shaft plus two head strokes.
function makeArrow(from, to, head=0.3) {
    var dir = to < from ? -1 : 1;
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(from, 0, 0), new THREE.Vector3(to, 0, 0));
    geometry.vertices.push(new THREE.Vector3(to, 0, 0), new THREE.Vector3(to - dir * head, -head * 0.7, 0));
    geometry.vertices.push(new THREE.Vector3(to, 0, 0), new THREE.Vector3(to - dir * head, head * 0.7, 0));
    return new THREE.LineSegments(geometry, rangeMaterial);
}

// A vertical arrow from one y to another, in the same style as makeArrow.
function makeVArrow(from, to, material=outlineMaterial, head=0.25) {
    var dir = to < from ? -1 : 1;
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, from, 0), new THREE.Vector3(0, to, 0));
    geometry.vertices.push(new THREE.Vector3(0, to, 0), new THREE.Vector3(-head * 0.7, to - dir * head, 0));
    geometry.vertices.push(new THREE.Vector3(0, to, 0), new THREE.Vector3(head * 0.7, to - dir * head, 0));
    return new THREE.LineSegments(geometry, material);
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

// The sorted morton keys along the top, then the radix tree nodes: each node
// index, its binary prefix, and a cell spanning the range of keys the node
// covers, with an arrow for the direction the range runs in and a dotted line
// at the split between its two children.
//
// In index order there is one row per node, in array order. In tree order the
// rows collapse by depth, so every node at a depth shares a row and the longer
// ranges sit above the shorter ones they split into.
var RadixTreeSplitActor = RadixTreeSplitActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=2.4, rowPitch=1.9) {
        super();
        this.sceneActor = sceneActor;
        this.cellWidth = cellWidth;
        this.rowPitch = rowPitch;
        this.object = null;
        this.tree_order = false;
        this.set_keys([]);
    }

    // Returns the order settled on, so a caller can label a button with it.
    set_order(tree_order) {
        tree_order = !!tree_order;
        if (tree_order != this.tree_order) {
            this.tree_order = tree_order;
            this._layout(false);
        }
        return this.tree_order;
    }

    toggle_order() {
        return this.set_order(!this.tree_order);
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
        this.groups = [];
        this.rowLabels = [];

        // Center of the column holding key j.
        function colX(j) {
            return (j - (keys.length - 1) * 0.5) * cw;
        }

        function addText(parent, x, y, width, text, color) {
            var quad = makeTextQuad(color, width, 1);
            quad.position.set(x, y, 0);
            quad.setText(text);
            parent.add(quad);
            return quad;
        }

        // The keys themselves, with their indices above.
        for (var j = 0; j < keys.length; ++j) {
            var outline = makeOutline(cw, 1);
            outline.position.set(colX(j), 0, 0);
            object.add(outline);
            addText(object, colX(j), 0, cw, toKeyBits(keys[j]), fgColor);

            // The camera is y-flipped, so -y is above the cell on screen.
            addText(object, colX(j), -0.9, cw, j, fgColor);
        }

        // The node index, to the left of each node's range.
        var gap = 0.2;
        var prefixWidth = 2.5;
        var indexWidth = 1.5;
        var indexX = colX(0) - cw * 0.5 - gap - indexWidth * 0.5;

        // Every node has to be built before the parents array is complete.
        var parents = [];
        var nodes = [];
        for (var i = 0; i < count; ++i) {
            nodes.push(radixTreeNode(keys, i, parents));
        }

        // Everything belonging to a node sits at the same height, so it goes in
        // a group and a change of order only has to move the group.
        for (var i = 0; i < count; ++i) {
            var node = nodes[i];
            var group = new THREE.Object3D();
            object.add(group);
            this.groups.push(group);

            group.indexLabel = addText(group, indexX, 0, indexWidth, "*" + i, fgColor);

            // The span of keys the node covers.
            var first = node.index_min;
            var last = node.index_max;
            var center = (colX(first) + colX(last)) * 0.5;
            var range = makeOutline((last - first + 1) * cw, 1);
            range.position.set(center, 0, 0);
            group.add(range);

            // The node's common prefix, at the end of the range the node's own
            // key sits at, with the arrow running from it out to the far end.
            var dir = node.range_dir < 0 ? -1 : 1;
            var head = dir > 0 ? colX(last) + cw * 0.5 : colX(first) - cw * 0.5;
            addText(group, colX(i), 0, prefixWidth,
                "[" + prefixDashes(node.prefix_str) + "]", RANGE_COLOR);

            var arrow = makeArrow(colX(i) + dir * (cw * 0.4 + 0.1), head - dir * 0.3);
            group.add(arrow);

            // The split between the node's two children.
            var split = makeDottedLine();
            split.position.set(colX(node.index_child0) + cw * 0.5, 0, 0);
            group.add(split);
        }

        // Depth by walking the parent links up to the root, which is node 0.
        var depths = [];
        for (var i = 0; i < count; ++i) {
            var depth = 0;
            for (var at = i; at != 0 && parents[at] !== undefined; at = parents[at]) {
                ++depth;
            }
            depths.push(depth);
        }

        var treeRows = [];
        for (var i = 0; i < count; ++i) {
            while (treeRows.length <= depths[i]) {
                treeRows.push([]);
            }
            treeRows[depths[i]].push(i);
        }

        // A tree order row holds a set of nodes rather than one, so it is
        // labelled with the set. Right aligned into the column the index labels
        // sit in, which keeps every other column in the same place in both
        // orders and leaves the movement between them vertical.
        var setWidth = indexWidth;
        var setTexts = [];
        for (var d = 0; d < treeRows.length; ++d) {
            var text = "(" + treeRows[d].map(function(i) { return "*" + i; }).join(", ") + ")";
            setTexts.push(text);
            setWidth = Math.max(setWidth, text.length * 0.33 + 0.3);
        }

        var setX = indexX + indexWidth * 0.5 - setWidth * 0.5;
        for (var d = 0; d < treeRows.length; ++d) {
            var label = addText(object, setX, 0, setWidth, setTexts[d], fgColor);
            label.visible = false;
            this.rowLabels.push(label);
        }

        this.arrows = new THREE.Object3D();
        object.add(this.arrows);

        this.keys = keys;
        this.count = count;
        this.nodes = nodes;
        this.depths = depths;
        this.treeRows = treeRows;
        this.colX = colX;
        this.indexX = indexX;
        this.indexWidth = indexWidth;
        this.setX = setX;
        this.setWidth = setWidth;

        this.sceneActor.scene.add(this.object);
        this._layout(true);
    }

    // Put every row at the height the current order wants it at. immediate
    // snaps there, otherwise update() slides into it.
    _layout(immediate) {
        var tree = this.tree_order;
        var rowPitch = this.rowPitch;

        for (var i = 0; i < this.count; ++i) {
            var group = this.groups[i];
            group.targetY = ((tree ? this.depths[i] : i) + 1) * rowPitch;
            group.indexLabel.visible = !tree;
            if (immediate) {
                group.position.y = group.targetY;
            }
        }

        for (var d = 0; d < this.rowLabels.length; ++d) {
            this.rowLabels[d].visible = tree;
            this.rowLabels[d].position.y = (d + 1) * rowPitch;
        }

        // Center everything in the view, from the top of the index digits and
        // the left of the row label column to the bottom of the last row.
        var rows = tree ? this.treeRows.length : this.count;
        var left = tree ? this.setX - this.setWidth * 0.5
                        : this.indexX - this.indexWidth * 0.5;
        var right = this.colX(this.keys.length - 1) + this.cellWidth * 0.5;
        var top = -0.9 - 0.25;
        var bottom = rows * rowPitch + 0.5;

        this.targetX = -(left + right) * 0.5;
        this.targetY = -(top + bottom) * 0.5;
        if (immediate) {
            this.object.position.set(this.targetX, this.targetY, 0);
        }

        this.contentHeight = bottom - top;
        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);

        this.arrowsStale = true;
        this.sceneActor.invalidate();
        if (immediate) {
            this._buildArrows();
        } else {
            this.arrows.visible = false;
        }
    }

    // The child arrows span the gap between two rows, so they cannot slide with
    // either one and are rebuilt once the rows have stopped moving.
    _buildArrows() {
        var arrows = this.arrows;
        for (var i = arrows.children.length - 1; i >= 0; --i) {
            var old = arrows.children[i];
            arrows.remove(old);
            disposeObject(old);
        }

        var self = this;
        function rowY(i) {
            return ((self.tree_order ? self.depths[i] : i) + 1) * self.rowPitch;
        }

        function addChildArrow(parent, child) {
            var dir = rowY(child) > rowY(parent) ? 1 : -1;
            var arrow = makeVArrow(rowY(parent) + dir * 0.5, rowY(child) - dir * 0.5);
            arrow.position.set(self.colX(child), 0, 0);
            arrows.add(arrow);
        }

        // Arrows to whichever children are internal nodes, pointing at the row
        // that holds them. Leaf children are keys in the top row.
        for (var i = 0; i < this.count; ++i) {
            var node = this.nodes[i];
            if (!node.leaf_child0) {
                addChildArrow(i, node.index_child0);
            }
            if (!node.leaf_child1) {
                addChildArrow(i, node.index_child1);
            }
        }

        arrows.visible = true;
        this.arrowsStale = false;
        this.sceneActor.invalidate();
    }

    update() {
        if (!this.object) {
            return;
        }

        var ease = 0.18;
        var epsilon = 0.002;
        var settled = true;

        for (var i = 0; i < this.groups.length; ++i) {
            var group = this.groups[i];
            var dy = group.targetY - group.position.y;
            if (Math.abs(dy) > epsilon) {
                group.position.y += dy * ease;
                settled = false;
            } else {
                group.position.y = group.targetY;
            }
        }

        // The label column is wider in tree order, so the diagram recenters by
        // that much as the rows move.
        var dx = this.targetX - this.object.position.x;
        var dy = this.targetY - this.object.position.y;
        if (Math.abs(dx) > epsilon || Math.abs(dy) > epsilon) {
            this.object.position.x += dx * ease;
            this.object.position.y += dy * ease;
            settled = false;
        } else {
            this.object.position.x = this.targetX;
            this.object.position.y = this.targetY;
        }

        if (!settled) {
            this.sceneActor.invalidate();
        }

        if (settled && this.arrowsStale) {
            this._buildArrows();
        }
    }
}
