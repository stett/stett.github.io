{% include js/particle-quad-common.js %}

function toBits(value, bits=3) {
    var s = value.toString(2);
    while (s.length < bits) {
        s = "0" + s;
    }
    return s;
}

// A horizontal row of quads, one per particle, labelled with the grid cell the
// particle occupies, over a row of the same coordinates in binary.
var ParticleArrayActor = ParticleArrayActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=4) {
        super();
        this.sceneActor = sceneActor;
        this.cellWidth = cellWidth;
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
            binOutline.position.set(x, 1, 0);
            this.object.add(binOutline);

            var bits = makeTextQuad("#000", this.cellWidth, 1);
            bits.position.set(x, 1, 0);
            bits.setSpans([
                { text: "(" },
                { text: toBits(particles[i].x), color: "#c00" },
                { text: "," },
                { text: toBits(particles[i].y), color: "#0a0" },
                { text: ")" }]);
            this.object.add(bits);

            // The camera is y-flipped, so -y is above the cell on screen.
            var index = makeTextQuad("#000", this.cellWidth, 1);
            index.position.set(x, -0.9, 0);
            index.setText(i);
            this.object.add(index);
        }
        // Center the rows vertically in the view. The index glyphs fill about
        // half of their quad, so the drawn content runs from -1.14 (top of the
        // digits) to 1.5 (bottom of the binary row).
        this.object.position.y = -0.18;
        this.sceneActor.scene.add(this.object);

        // Fit the whole row in view.
        var halfWidth = particles.length * this.cellWidth * 0.5 + 0.5;
        this.sceneActor.cameraHeightTarget = Math.max(1.45, halfWidth / this.sceneActor.aspect);
    }
}
