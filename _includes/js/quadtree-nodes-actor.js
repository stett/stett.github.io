{% include js/particle-quad-common.js %}
{% include js/quadtree.js %}

// The quadtree node array, as many cells as the total from the allocation step.
// Each cell holds the node's parent, child and next links, and leaf nodes are
// drawn dashed.
//
// In index order the cells run in array order, wrapped a fixed number to a row.
// In tree order there is one row per depth, each a little smaller than the one
// above it. Siblings sit together in a block, and each block is placed as close
// to under its parent as the blocks to its left allow. A red bracket over each
// block runs a line up to the parent the block shares.
var treeLinkMaterial = treeLinkMaterial ||
    themedMaterial(new THREE.LineBasicMaterial({}), redColor);

var QuadtreeNodesActor = QuadtreeNodesActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=2.4, rowPitch=2.2, cols=4, shrink=0.85, treeGap=0.6) {
        super();
        this.sceneActor = sceneActor;
        this.cellWidth = cellWidth;
        this.rowPitch = rowPitch;
        this.cols = cols;
        this.shrink = shrink;
        this.treeGap = treeGap;
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
        var cols = this.cols;
        this.object = new THREE.Object3D();
        var object = this.object;
        this.cells = [];

        // Every row starts at the same x, so the column is the position within
        // the row rather than the node's index.
        function colX(j) {
            return (j - (cols - 1) * 0.5) * cw;
        }

        function addText(parent, x, y, width, text) {
            var quad = makeTextQuad(fgColor, width, 1);
            quad.position.set(x, y, 0);
            quad.setText(text);
            parent.add(quad);
            return quad;
        }

        function link(value) {
            return (value === undefined || value < 0) ? "-" : value;
        }

        var nodes = quadtreeNodes(keys);
        var groups = quadtreeSiblingGroups(nodes);

        // Everything belonging to a node moves together, so it goes in a group
        // and a change of order only has to move the group.
        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            var cell = new THREE.Object3D();
            object.add(cell);
            this.cells.push(cell);

            // Leaves are inset a little so two of them side by side don't
            // share a dashed edge.
            var inset = 0.1;
            var outline = node.is_leaf ?
                makeDashedOutline(cw - inset * 2, 1 - inset * 2) : makeOutline(cw, 1);
            cell.add(outline);

            addText(cell, 0, 0, cw, "(" + link(node.parent) + "," +
                link(node.child) + "," + link(node.next) + ")");

            // The camera is y-flipped, so -y is above the cell on screen.
            addText(cell, 0, -0.9, cw, i);

            cell.indexX = colX(i % cols);
            cell.indexRow = Math.floor(i / cols);
        }

        // Each group sits one row below its parent's. The walk is breadth first,
        // so a group's parent is always placed before the group is. A node the
        // walk never reached may not have a placed parent, which leaves its group
        // orphaned for now.
        var depths = [0];
        var groupDepths = [0];
        var groupOf = [0];
        var deepest = 0;
        for (var g = 1; g < groups.length; ++g) {
            var parent = nodes[groups[g][0]].parent;
            var depth = (depths[parent] === undefined || depths[parent] < 0) ? -1 : depths[parent] + 1;
            groupDepths.push(depth);
            for (var j = 0; j < groups[g].length; ++j) {
                depths[groups[g][j]] = depth;
                groupOf[groups[g][j]] = g;
            }
            deepest = Math.max(deepest, depth);
        }

        // Orphans go on rows past the bottom of the tree, still one below their
        // parent when the parent is itself an orphan, so they keep the same
        // parents-above-children shape. Any other orphan starts at the first row
        // past the tree. A pass that places nothing means the rest are parents of
        // each other in a cycle, and they start there too.
        function placeGroup(g, depth) {
            groupDepths[g] = depth;
            for (var j = 0; j < groups[g].length; ++j) {
                depths[groups[g][j]] = depth;
            }
        }
        var orphans = [];
        for (var g = 0; g < groups.length; ++g) {
            if (groupDepths[g] < 0) {
                orphans.push(g);
            }
        }
        var wasOrphan = groupDepths.map(function(depth) { return depth < 0; });
        var firstOrphanRow = deepest + 1;
        while (orphans.length > 0) {
            var waiting = [];
            for (var k = 0; k < orphans.length; ++k) {
                var g = orphans[k];
                var pg = groupOf[nodes[groups[g][0]].parent];
                if (pg === undefined || pg == g || !wasOrphan[pg]) {
                    placeGroup(g, firstOrphanRow);
                } else if (groupDepths[pg] >= 0) {
                    placeGroup(g, groupDepths[pg] + 1);
                } else {
                    waiting.push(g);
                }
            }
            if (waiting.length == orphans.length) {
                for (var k = 0; k < waiting.length; ++k) {
                    placeGroup(waiting[k], firstOrphanRow);
                }
                waiting = [];
            }
            orphans = waiting;
        }
        var treeRows = 1 + Math.max.apply(null, groupDepths);

        // Every row is shrunk from the one above it, and rows are spaced by the
        // average of the two sizes so the gap between them shrinks along with them.
        // The pitch has a little extra over index order to make room for the
        // brackets and the lines up to the parents.
        var treePitch = this.rowPitch + this.treeGap;
        var rowScales = [];
        var rowYs = [];
        for (var d = 0; d < treeRows; ++d) {
            rowScales.push(Math.pow(this.shrink, d));
            rowYs.push(d == 0 ? 0 :
                rowYs[d - 1] + treePitch * (rowScales[d - 1] + rowScales[d]) * 0.5);
        }

        // Place the blocks a row at a time, left to right in walk order, which is
        // also the order of their parents in the row above. Each block centers
        // under its parent unless that would overlap the block before it, in
        // which case it is pushed right.
        var rowRight = [];
        for (var g = 0; g < groups.length; ++g) {
            var d = groupDepths[g];
            var scale = rowScales[d];
            var width = groups[g].length * cw * scale;
            var gap = 0.5 * scale;

            var parentCell = this.cells[nodes[groups[g][0]].parent];
            var center = (g == 0 || !parentCell || parentCell.treeX === undefined) ? 0 : parentCell.treeX;
            var left = center - width * 0.5;
            if (rowRight[d] !== undefined) {
                left = Math.max(left, rowRight[d] + gap);
            }
            rowRight[d] = left + width;

            for (var j = 0; j < groups[g].length; ++j) {
                var cell = this.cells[groups[g][j]];
                cell.treeX = left + (j + 0.5) * cw * scale;
                cell.treeY = rowYs[d];
                cell.treeScale = scale;
            }
        }

        // The extent of the tree, to center it in the view.
        var treeLeft = this.cells.length > 0 ? Infinity : 0;
        var treeRight = this.cells.length > 0 ? -Infinity : 0;
        for (var i = 0; i < this.cells.length; ++i) {
            var cell = this.cells[i];
            treeLeft = Math.min(treeLeft, cell.treeX - cw * 0.5 * cell.treeScale);
            treeRight = Math.max(treeRight, cell.treeX + cw * 0.5 * cell.treeScale);
        }

        // A bracket over each block of siblings, just above the block's index
        // digits, with a line from its middle up to the bottom of the parent. A
        // parent pushed off to one side of the block gets its line run to the
        // nearer end of the bracket instead. Only a parent on the row just above
        // gets a line, which leaves out orphans whose parent is up in the tree.
        var links = new THREE.Geometry();
        function segment(x0, y0, x1, y1) {
            links.vertices.push(new THREE.Vector3(x0, y0, 0), new THREE.Vector3(x1, y1, 0));
        }
        for (var g = 1; g < groups.length; ++g) {
            var parentCell = this.cells[nodes[groups[g][0]].parent];
            var parent = nodes[groups[g][0]].parent;
            if (!parentCell || depths[parent] + 1 != groupDepths[g]) {
                continue;
            }

            var first = this.cells[groups[g][0]];
            var last = this.cells[groups[g][groups[g].length - 1]];
            var scale = first.treeScale;
            var inset = 0.15 * scale;
            var bracketLeft = first.treeX - cw * 0.5 * scale + inset;
            var bracketRight = last.treeX + cw * 0.5 * scale - inset;
            var bracketY = first.treeY - 1.25 * scale;
            var tick = 0.15 * scale;

            segment(bracketLeft, bracketY + tick, bracketLeft, bracketY);
            segment(bracketLeft, bracketY, bracketRight, bracketY);
            segment(bracketRight, bracketY, bracketRight, bracketY + tick);

            var parentBottom = parentCell.treeY + 0.5 * parentCell.treeScale;
            var joinX = Math.min(Math.max(parentCell.treeX, bracketLeft), bracketRight);
            segment(parentCell.treeX, parentBottom, joinX, bracketY);
        }
        this.links = new THREE.LineSegments(links, treeLinkMaterial);
        object.add(this.links);

        this.colX = colX;
        this.indexRows = Math.ceil(nodes.length / cols);
        this.treeLeft = treeLeft;
        this.treeRight = treeRight;
        this.treeBottom = rowYs[treeRows - 1] + 0.5 * rowScales[treeRows - 1];

        this.sceneActor.scene.add(this.object);
        this._layout(true);
    }

    // Put every cell where the current order wants it. immediate snaps there,
    // otherwise update() slides into it.
    _layout(immediate) {
        var tree = this.tree_order;
        var rowPitch = this.rowPitch;

        for (var i = 0; i < this.cells.length; ++i) {
            var cell = this.cells[i];
            cell.targetX = tree ? cell.treeX : cell.indexX;
            cell.targetY = tree ? cell.treeY : cell.indexRow * rowPitch;
            cell.targetScale = tree ? cell.treeScale : 1;
            if (immediate) {
                cell.position.set(cell.targetX, cell.targetY, 0);
                cell.scale.set(cell.targetScale, cell.targetScale, 1);
            }
        }

        // The links are drawn where the tree order puts the cells, so they wait
        // for the cells to get there and are hidden while anything moves.
        this.links.visible = immediate && tree;
        this.sceneActor.invalidate();

        // Center everything in the view, from the top of the first row's index
        // digits and the left of the leftmost cell to the bottom of the last row.
        var left = tree ? this.treeLeft : this.colX(0) - this.cellWidth * 0.5;
        var right = tree ? this.treeRight : this.colX(this.cols - 1) + this.cellWidth * 0.5;
        var top = -0.9 - 0.25;
        var bottom = tree ? this.treeBottom : Math.max(0, this.indexRows - 1) * rowPitch + 0.5;

        this.targetX = -(left + right) * 0.5;
        this.targetY = -(top + bottom) * 0.5;
        if (immediate) {
            this.object.position.set(this.targetX, this.targetY, 0);
        }

        this.contentHeight = bottom - top;
        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15,
            ((right - left) * 0.5 + 0.5) / this.sceneActor.aspect);
    }

    update() {
        if (!this.object) {
            return;
        }

        var ease = 0.18;
        var epsilon = 0.002;

        var settled = true;

        function approach(object, targetX, targetY) {
            var dx = targetX - object.position.x;
            var dy = targetY - object.position.y;
            if (Math.abs(dx) > epsilon || Math.abs(dy) > epsilon) {
                object.position.x += dx * ease;
                object.position.y += dy * ease;
                settled = false;
            } else {
                object.position.x = targetX;
                object.position.y = targetY;
            }
        }

        for (var i = 0; i < this.cells.length; ++i) {
            var cell = this.cells[i];
            approach(cell, cell.targetX, cell.targetY);

            var ds = cell.targetScale - cell.scale.x;
            var scale = cell.targetScale;
            if (Math.abs(ds) > epsilon) {
                scale = cell.scale.x + ds * ease;
                settled = false;
            }
            cell.scale.set(scale, scale, 1);
        }

        // The two orders have different extents, so the diagram recenters as
        // the cells move.
        approach(this.object, this.targetX, this.targetY);

        // The links move with the object rather than the cells, so the whole
        // diagram recentering doesn't have to finish before they show.
        if (!settled) {
            this.sceneActor.invalidate();
        } else if (this.tree_order && !this.links.visible) {
            this.links.visible = true;
            this.sceneActor.invalidate();
        }
    }
}
