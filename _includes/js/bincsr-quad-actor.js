{% include js/quad-actor-common.js %}

var BinCSRQuadActor = BinCSRQuadActor || class extends DRAMA.Actor {
    constructor(scene, bincsr) {
        super();
        this.scene = scene;
        this.ptr_obj = null;
        this.dia_obj = null;
        this.col_obj = null;
        this.val_obj = null;
        this.ptr_curves = [];
        this.set_bincsr(bincsr);
    }

    set_bincsr(bincsr) {
        if (this.ptr_obj != null) { this.scene.remove(this.ptr_obj); this.ptr_obj = null; }
        if (this.dia_obj != null) { this.scene.remove(this.dia_obj); this.dia_obj = null; }
        if (this.col_obj != null) { this.scene.remove(this.col_obj); this.col_obj = null; }
        if (this.val_obj != null) { this.scene.remove(this.val_obj); this.val_obj = null; }
        while (this.ptr_curves.length > 0) {
            var curve = this.ptr_curves.pop();
            this.scene.remove(curve);
        }
        this.ptr_obj = new THREE.Object3D();
        this.dia_obj = new THREE.Object3D();
        this.col_obj = new THREE.Object3D();
        this.val_obj = new THREE.Object3D();

        this.bincsr = bincsr;

        var dia_y = 4;
        var ptr_y = 2;
        var val_y = -4;

        var val_meshes = [];

        // Generate meshes
        for (var i = 0; i < bincsr.val.length; ++i) {
            var val = bincsr.val[i];
            var material = val == 0 ? zeroMaterial : nonzeroMaterial;

            // val
            {
                var mesh = new THREE.Mesh( cellGeometry, material );
                mesh.position.set(i - (bincsr.val.length/2), val_y, 0);
                this.val_obj.add(mesh);
                val_meshes.push(mesh);
            }

            // col
            //{
            //    var mesh = new THREE.Mesh( cellGeometry, material );
            //    mesh.position.set(i - (bincsr.val.length/2), val_y, 0);
            //    this.val_obj.add(mesh);
            //}
        }

        for (var row = 0; row < bincsr.ptr.length; ++row) {

            {
                // dia
                var mesh = new THREE.Mesh( cellGeometry, diagMaterial );
                mesh.position.set(row - (bincsr.ptr.length/2), dia_y, 0);
                this.dia_obj.add(mesh);
            }

            {
                // ptr
                var mesh = new THREE.Mesh( cellGeometry, ptrMaterial );
                mesh.position.set(row - (bincsr.ptr.length/2), ptr_y, 0);
                this.ptr_obj.add(mesh);

                // arrow
                var index = bincsr.ptr[row];
                if (index < val_meshes.length) {
                    var pos = mesh.position;
                    var pos0 = new THREE.Vector3(pos.x, pos.y - .5, pos.z);
                    var pos1 = new THREE.Vector3(pos.x, pos.y - 1, pos.z);
                    pos = val_meshes[index].position;
                    var pos2 = new THREE.Vector3(pos.x, pos.y + 1, pos.z);
                    var pos3 = new THREE.Vector3(pos.x, pos.y + .5, pos.z);
                    var points = [ pos0, pos1, pos2, pos3 ];
                    var curve_geometry = new THREE.BufferGeometry().setFromPoints(points);
                    var curve_object = new THREE.Line(curve_geometry, curveMaterial);
                    this.ptr_curves.push(curve_object);
                    this.scene.add(curve_object);
                }
            }
        }

        this.scene.add( this.val_obj );
        this.scene.add( this.col_obj );
        this.scene.add( this.ptr_obj );
        this.scene.add( this.dia_obj );
    }

    update() {}
};
