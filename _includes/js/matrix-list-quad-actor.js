{% include js/matrix-quad-actor.js %}

var MatrixListQuadActor = MatrixListQuadActor || class extends DRAMA.Actor {
    constructor(scene) {
        super();
        this.scene = scene;
        this.matrix_actors = [];
        this.height = 0;
        this.width = 0;
    }

    clear_matrices() {
        // TODO: Make sure this removes from scene...
        for (var i = 0; i < this.matrix_actors.length; ++i) {
            DRAMA.remove(this.matrix_actors[i]);
        }
        this.matrix_actors = [];
        this.width = 0;
        this.height = 0;
    }

    add_matrix(matrix) {

        // Determine a position for this matrix
        var padding = .25;
        var position = new THREE.Vector3(0, 0, 0);
        for (var i = 0; i < this.matrix_actors.length; ++i) {
            position.x += this.matrix_actors[i].width;
            position.x += padding;
        }

        // Make the actor
        var actor = new MatrixQuadActor(this.scene, matrix, position);
        this.matrix_actors.push(actor);
        DRAMA.add(actor);

        // Update width & height
        this.height = Math.max(this.height, actor.height);
        this.width += actor.width + padding;
    }
}
