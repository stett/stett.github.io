{% include js/quad-actor-common.js %}

var MatrixQuadActor = MatrixQuadActor || class extends DRAMA.Actor {
    constructor(scene, matrix=[], position=new THREE.Vector3(0, 0, 0)) {
        super();
        this.scene = scene;
        this.object = null;
        this.height = 0;
        this.set_matrix(matrix, position);
    }

    destructor() {
        console.log("DESTRUCTOR");
        if (this.object) {
            this.scene.remove(this.object);
        }
    }

    _generate_obj(matrix, offset=new THREE.Vector3(0, 0, 0), scale=1) {
        var object = new THREE.Object3D();
        for (var i = 0; i < matrix.length; ++i) {
            for (var j = 0; j < matrix.length; ++j) {
                var value = matrix[i][j];
                var mesh;
                var pos = new THREE.Vector3(
                    offset.x + (i - ((matrix.length - 1) * 0.5)) * scale,
                    offset.y + (j - ((matrix.length - 1) * 0.5)) * scale,
                    0);

                // If the value is a sub-matrix
                if (value.length) {
                    mesh = this._generate_obj(value, pos, scale/value.length);

                // If the value is just a single value
                } else {
                    var material = i == j ? diagMaterial : value == 0 ? zeroMaterial : nonzeroMaterial;
                    mesh = new THREE.Mesh( cellGeometry, material );
                    mesh.position.set(pos.x, pos.y, pos.z);
                    mesh.scale.set(scale, scale, 1);
                }

                object.add(mesh);
            }
        }

        return object;
    }

    set_matrix(matrix, position=new THREE.Vector3(0,0,0)) {

        if (this.object) {
            this.scene.remove(this.object);
        }

        this.height = matrix.length;// / 2;
        this.width = matrix.length;// / 2;
        this.object = this._generate_obj(matrix, position);
        this.scene.add( this.object );
    }
}
