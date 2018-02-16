{% include js/quad-actor-common.js %}

var BinCSRIntermediateQuadActor = BinCSRIntermediateQuadActor || class extends DRAMA.Actor {
    constructor(scene, inter) {
        super();
        this.scene = scene;
        this.bin_object = null;
        this.diag_object = null;
        this.height = 0;
        this.set_inter(inter);
    }

    set_inter(inter) {

        if (this.bin_object != null) {
            this.scene.remove(this.bin_object);
        }

        if (this.diag_object != null) {
            this.scene.remove(this.diag_object);
        }

        this.inter = inter;
        this.bin_object = new THREE.Object3D();
        this.diag_object = new THREE.Object3D();

        // Determine the total dimensions
        this.width = 0;
        this.height = inter.bins.length - 1;
        for (var bin_index = 0; bin_index < inter.bins.length; ++bin_index) {
            bin = inter.bins[bin_index];
            this.height += bin.val.length;
            this.width = Math.max(this.width, Math.min(inter.width, bin.length));
        }

        // Build up the bin and diag objects
        //this.height = Number(inter.bins.length) * (1 + Number(inter.width));
        for (var bin_index = 0; bin_index < inter.bins.length; ++bin_index) {
            var bin = inter.bins[bin_index];

            // Make a bunch of fucking cubes
            for (var row_local = 0; row_local < bin.val.length; ++row_local) {
                var row = (bin_index * inter.width) + row_local;

                // Add the diagonal element
                {
                    var mesh = new THREE.Mesh( cellGeometry, diagMaterial );
                    mesh.position.set(-this.width/2, bin_index + row - (this.height/2), 0);
                    this.diag_object.add(mesh);
                }

                // Add elements to the bin
                for (var i = 0; i < bin.length; ++i) {
                    var material = i < bin.val[row_local].length ? nonzeroMaterial : zeroMaterial;
                    var mesh = new THREE.Mesh( cellGeometry, material );
                    mesh.position.set(i + 2 - (this.width/2), bin_index + row - (this.height/2), 0);
                    this.bin_object.add(mesh);
                }
            }
        }
        this.scene.add( this.bin_object );
        this.scene.add( this.diag_object );
    }

    update() {}
}
