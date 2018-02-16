{% include js/quad-actor-common.js %}

var MatrixQuadActor = MatrixQuadActor || class extends DRAMA.Actor {
    constructor(scene, matrix=[[]]) {
        super();
        this.scene = scene;
        this.object = null;
        this.height = 0;
        this.set_matrix(matrix);
    }

    set_matrix(matrix) {
        if (this.object) {
            this.scene.remove(this.object);
        }

        this.object = new THREE.Object3D();
        this.height = matrix.length / 2;
        for (var i = 0; i < matrix.length; ++i) {
            for (var j = 0; j < matrix.length; ++j) {
                var value = matrix[i][j];
                var material = i == j ? diagMaterial : value == 0 ? zeroMaterial : nonzeroMaterial;
                var mesh = new THREE.Mesh( cellGeometry, material );
                mesh.position.set(i - (matrix.length/2), j - (matrix.length/2), 0);
                this.object.add(mesh);
            }
        }

        this.scene.add( this.object );
    }
}
