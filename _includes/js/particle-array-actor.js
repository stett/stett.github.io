{% include js/particle-quad-common.js %}

// A horizontal row of quads, one per particle, labelled with the grid cell the
// particle occupies, over a row of the same coordinates in binary.
var ParticleArrayActor = ParticleArrayActor || class extends DRAMA.Actor {
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

        this.object = new THREE.Object3D();
        for (var i = 0; i < particles.length; ++i) {
            var x = (i - (particles.length - 1) * 0.5) * this.cellWidth;

            var outline = makeOutline(this.cellWidth, 1);
            outline.position.set(x, 0, 0);
            this.object.add(outline);

            var label = makeTextQuad("#000", this.cellWidth, 1);
            label.position.set(x, 0, 0);
            label.setText("(" + particles[i].x + "," + particles[i].y + ")");
            this.object.add(label);

            // The 3 bit binary form of each coordinate, in the row below.
            var binOutline = makeOutline(this.cellWidth, 1);
            binOutline.position.set(x, this.rowPitch, 0);
            this.object.add(binOutline);

            var bits = makeTextQuad("#000", this.cellWidth, 1);
            bits.position.set(x, this.rowPitch, 0);
            bits.setSpans([
                { text: "(" },
                { text: toBits(particles[i].x), color: X_COLOR },
                { text: "," },
                { text: toBits(particles[i].y), color: Y_COLOR },
                { text: ")" }]);
            this.object.add(bits);

            // The interleaved bits, in the row below that.
            var mortonOutline = makeOutline(this.cellWidth, 1);
            mortonOutline.position.set(x, this.rowPitch * 2, 0);
            this.object.add(mortonOutline);

            var morton = makeTextQuad("#000", this.cellWidth, 1);
            morton.position.set(x, this.rowPitch * 2, 0);
            morton.setSpans(toMortonSpans(particles[i].x, particles[i].y));
            this.object.add(morton);

            // The camera is y-flipped, so -y is above the cell on screen.
            var index = makeTextQuad("#000", this.cellWidth, 1);
            index.position.set(x, -0.9, 0);
            index.setText(i);
            this.object.add(index);
        }
        // Center the rows vertically in the view: from the top of the index
        // digits down to the bottom edge of the last row.
        var top = -0.9 - 0.25;
        var bottom = this.rowPitch * 2 + 0.5;
        this.object.position.y = -(top + bottom) * 0.5;
        this.contentHeight = bottom - top;
        this.sceneActor.scene.add(this.object);

        // Fit the whole row in view.
        var halfWidth = particles.length * this.cellWidth * 0.5 + 0.5;
        this.sceneActor.cameraHeightTarget = Math.max(
            this.contentHeight * 0.5 + 0.15, halfWidth / this.sceneActor.aspect);
    }
}
