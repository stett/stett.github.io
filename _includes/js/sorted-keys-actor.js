{% include js/particle-quad-common.js %}

// Two rows: the morton keys from step 0 in sorted order, and a reverse map from
// each sorted slot back to the index of the particle it came from.
var SortedKeysActor = SortedKeysActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=3, rowPitch=1.25) {
        super();
        this.sceneActor = sceneActor;
        this.cellWidth = cellWidth;
        this.rowPitch = rowPitch;
        this.object = null;
        this.set_particles([]);
    }

    set_particles(particles) {
        if (this.object) {
            this.sceneActor.scene.remove(this.object);
        }

        // Sort the particle indices by the morton key of the cell they occupy.
        var sorted = [];
        for (var i = 0; i < particles.length; ++i) {
            sorted.push(i);
        }
        sorted.sort(function(a, b) {
            return toMorton(particles[a].x, particles[a].y) - toMorton(particles[b].x, particles[b].y);
        });

        this.object = new THREE.Object3D();
        for (var i = 0; i < sorted.length; ++i) {
            var x = (i - (sorted.length - 1) * 0.5) * this.cellWidth;
            var particle = particles[sorted[i]];

            var keyOutline = makeOutline(this.cellWidth, 1);
            keyOutline.position.set(x, 0, 0);
            this.object.add(keyOutline);

            var key = makeTextQuad("#000", this.cellWidth, 1);
            key.position.set(x, 0, 0);
            key.setText(toMortonBits(particle.x, particle.y));
            this.object.add(key);

            // The index the key came from, in the row below.
            var mapOutline = makeOutline(this.cellWidth, 1);
            mapOutline.position.set(x, this.rowPitch, 0);
            this.object.add(mapOutline);

            var map = makeTextQuad("#000", this.cellWidth, 1);
            map.position.set(x, this.rowPitch, 0);
            map.setText(sorted[i]);
            this.object.add(map);

            // The camera is y-flipped, so -y is above the cell on screen.
            var index = makeTextQuad("#000", this.cellWidth, 1);
            index.position.set(x, -0.9, 0);
            index.setText(i);
            this.object.add(index);
        }

        // Center the rows vertically in the view: from the top of the index
        // digits down to the bottom edge of the last row.
        var top = -0.9 - 0.25;
        var bottom = this.rowPitch + 0.5;
        this.object.position.y = -(top + bottom) * 0.5;
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        // Fit the whole row in view.
        var halfWidth = sorted.length * this.cellWidth * 0.5 + 0.5;
        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15, halfWidth / this.sceneActor.aspect);
    }
}
