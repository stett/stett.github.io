var Tet = Tet || class {
    constructor(indices, vertices) {
        this.indices = indices;
        this.vertices = vertices;
        this.compute_normals();
        this.compute_indices();
        this.compute_stiffness();
    }

    compute_normals() {
        this.normals = [];
        for (var i = 0; i < 4; ++i) {
            var tri = this.get_tri(i);
            var a = this.vertices[tri[0]];
            var b = this.vertices[tri[1]];
            var c = this.vertices[tri[2]];
            var ab = new THREE.Vector3();
            var ac = new THREE.Vector3();
            var n = new THREE.Vector3();
            ab.subVectors(b, a);
            ac.subVectors(c, a);
            n.crossVectors(ac, ab);
            this.normals.push(n);
        }
    }

    compute_indices() {
        // If any normal is inverted, swap two
        // vertex indices and invert all of the normals.
        var a = this.get_vert(0, 0);
        var d = this.get_vert(0, 3);
        var n = this.get_norm(0);
        var ad = new THREE.Vector3();
        ad.subVectors(d, a);
        if (n.dot(ad) > 0) {
            var temp = this.indices[0];
            this.indices[0] = this.indices[1];
            this.indices[1] = temp;
            this.compute_normals();
        }
    }

    compute_stiffness() {
        this.stiffness = [
            [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ]
        ];

        //
        // TODO!
        //
    }

    get_tri(index) {
        return [
            this.indices[TetMeshBuilder.tetTris[index][0]],
            this.indices[TetMeshBuilder.tetTris[index][1]],
            this.indices[TetMeshBuilder.tetTris[index][2]],
            this.indices[TetMeshBuilder.tetTris[index][3]]];
    }

    get_vert(tri_index, vert_index) {
        var tri = this.get_tri(tri_index);
        return this.vertices[tri[vert_index]];
    }

    get_verts(tri_index) {
        return [
            this.get_vert(tri_index, 0),
            this.get_vert(tri_index, 1),
            this.get_vert(tri_index, 1)];
    }

    get_norm(index) {
        return this.normals[index];
    }

    make_face(index) {
        var tri = this.get_tri(index);
        return new THREE.Face3(tri[0], tri[1], tri[2]);
    }

    is_inside(point) {
        var inside = true;
        for (var i = 0; i < 4; ++i) {
            var ap = point - this.get_vert(i, 0);
            var n = this.get_normal(i);
            if (n.dot(ap) > 0) {
                inside = false;
                break;
            }
        }
        return inside;
    }
};

var Tetmesh = Tetmesh || class {
    constructor() {
        this.vertices = [];
        this.tetrahedra = [];
        this.stiffness = [];
    }

    add_tet(indices) {
        var tet = new Tet(indices, this.vertices);
        this.tetrahedra.push(tet);
        this.compute_stiffness();
    }

    is_inside(point) {
        for (var i = 0; i < this.tetrahedra.length; ++i) {
            if (this.tetrahedra.is_inside(point)) {
                return true;
            }
        }
        return false;
    }

    randomize() {

        // Add some verts
        for (var i = 0; i < 20; ++i) {
            var vert = [];
            for (var j = 0; j < 3; ++j) {
                vert.push(-15 + Math.floor(Math.random() * Math.floor(30)));
            }
            this.vertices.push(new THREE.Vector3(vert[0], vert[1], vert[2]));
        }

        // Add a couple tets
        this.add_tet([ 0, 1, 2, 3 ]);
    }

    compute_stiffness() {
        this.stiffness = [
            [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0 ],
            [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ]
        ];

        //
        // TODO!
        //
    }
};
