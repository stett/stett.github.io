{% include js/particle-quad-common.js %}

// A horizontal row of quads, one per particle, labelled with the grid cell the
// particle occupies.
var ParticleArrayActor = ParticleArrayActor || class extends DRAMA.Actor {
    constructor(sceneActor, cellWidth=2) {
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

            // The camera is y-flipped, so -y is above the cell on screen.
            var index = makeTextQuad("#000", this.cellWidth, 1);
            index.position.set(x, -1.6, 0);
            index.setText(i);
            this.object.add(index);
        }
        // Caption, between the cells and the row of indices above them.
        var caption = makeTextQuad("#000", 6, 1);
        caption.scale.set(0.55, -0.55, 1);
        caption.position.set(0, -0.85, 0);
        caption.setText("particle positions");
        this.object.add(caption);

        // Center the cells, caption and indices vertically in the view.
        this.object.position.y = 0.8;
        this.sceneActor.scene.add(this.object);

        // Fit the whole row in view.
        var halfWidth = particles.length * this.cellWidth * 0.5 + 0.5;
        this.sceneActor.cameraHeightTarget = Math.max(1.4, halfWidth / this.sceneActor.aspect);
    }
}
