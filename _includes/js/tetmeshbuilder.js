//
// Dear lord, please save my soul from the evils of this damned spaghetti.
// For I knoweth the horrors of this code which I have brought up with my
// own hands, yet I hath done nothing to correct it.
//

{% include js/sceneactor.js %}
{% include js/tetmesh.js %}

var TetMeshBuilder = TetMeshBuilder || {

    //
    // Data
    //

    pointGeometry: new THREE.SphereGeometry( .5, 32, 32 ),
    pointMaterial: new THREE.MeshBasicMaterial({ color: 0x000000 }),
    pointMaterialAddActive: new THREE.MeshBasicMaterial({ color: 0x00addf }),
    pointMaterialSplitActive: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    tetMaterial: new THREE.MeshNormalMaterial(),
    tetMaterialPreview: new THREE.MeshBasicMaterial({ color: 0x777777, wireframe: true }),
    tetmesh: null,
    tetmeshMouse: new THREE.Vector2(),
    tetmeshScene: null,
    tetTris: [
        [0, 1, 3, 2], // The last index is the point which is NOT included in each tri.
        [0, 2, 1, 3],
        [0, 3, 2, 1],
        [1, 2, 3, 0]
    ],

    //
    // Callbacks
    //

    onTetAdded: function() {},
    onTetRemoved: function() {},

    //
    // Data structures
    //


    TetmeshActor: class extends DRAMA.Actor {
        constructor(scene, camera, tetmesh, mouse) {
            super();
            this.scene = scene;
            this.camera = camera;
            this.mouseInteraction = false;
            this.mouse = mouse;
            this.obj = null;
            this.preview_obj = null;
            this.active_point = null;
            this.tetmesh = null;
            this.active_indices = null;
            this.set_tetmesh(tetmesh);
        }

        set_tetmesh(tetmesh) {
            this.tetmesh = tetmesh;

            if (this.obj != null) {
                this.scene.remove(this.obj);
            }

            this.obj = new THREE.Object3D();
            this.add_points = [];

            // Add new points
            {
                var points_obj = new THREE.Object3D();
                for (var i = 0; i < this.tetmesh.vertices.length; ++i) {
                    var vert = this.tetmesh.vertices[i];
                    var mesh = new THREE.Mesh(TetMeshBuilder.pointGeometry, TetMeshBuilder.pointMaterial);
                    mesh.position.set(vert.x, vert.y, vert.z);
                    mesh.index = i;
                    points_obj.add(mesh);

                    // The first four points belong to a tet already, so don't add them
                    if (i > 3) {
                        this.add_points.push(mesh);
                    }
                }
                this.obj.add(points_obj);
            }

            // Add new tets
            {
                var tetGeo = new THREE.Geometry();
                for (var i = 0; i < this.tetmesh.vertices.length; ++i) {
                    tetGeo.vertices.push(this.tetmesh.vertices[i]);
                }
                for (var i = 0; i < this.tetmesh.tetrahedra.length; ++i) {
                    var tet = this.tetmesh.tetrahedra[i];
                    for (var j = 0; j < 4; ++j) {
                        tetGeo.faces.push(tet.make_face(j));
                    }
                }

                tetGeo.computeBoundingSphere();
                tetGeo.computeFaceNormals();
                var mesh = new THREE.Mesh(tetGeo, TetMeshBuilder.tetMaterial);
                this.obj.add(mesh);
            }

            this.scene.add(this.obj);
        }

        set_active_point(new_active_point) {

            // De-color the current active point
            if (this.active_point) {
                this.active_point.material = TetMeshBuilder.pointMaterial;
            }

            // Delete the old preview tet 3js obj
            if (this.preview_obj != null) {
                this.obj.remove(this.preview_obj);
            }

            // Select the new active point
            this.active_point = new_active_point;
            if (!this.active_point) {
                return;
            }

            // Color the current active point
            this.active_point.material = TetMeshBuilder.pointMaterialAddActive;

            // Figure out which face this point will be extending.
            // We pick the "closest" one which faces the point.
            this.active_indices = [];
            {
                var active_index = this.active_point.index;
                var max_proj = -1;
                for (var i = 0; i < this.tetmesh.tetrahedra.length; ++i) {
                    var tet = this.tetmesh.tetrahedra[i];
                    for (var j = 0; j < 4; ++j) {
                        var tri = tet.get_tri(j);
                        var n = tet.get_norm(j).normalize();
                        var a = this.tetmesh.vertices[tri[0]];
                        var p = this.tetmesh.vertices[active_index];
                        var ap = new THREE.Vector3();
                        ap.subVectors(p, a);
                        var proj = n.dot(ap);

                        if (0 < proj && proj > max_proj) {
                            max_proj = proj;
                            this.active_indices = [ tri[0], tri[1], tri[2], active_index];
                        }
                    }
                }
            }

            // Make a new preview tet 3js obj
            {
                var tetGeo = new THREE.Geometry();
                for (var i = 0; i < this.tetmesh.vertices.length; ++i) {
                    tetGeo.vertices.push(this.tetmesh.vertices[i]);
                }
                for (var i = 0; i < 4; ++i) {
                    var tri = [this.active_indices[TetMeshBuilder.tetTris[i][0]], this.active_indices[TetMeshBuilder.tetTris[i][1]], this.active_indices[TetMeshBuilder.tetTris[i][2]] ];
                    tetGeo.faces.push(new THREE.Face3(tri[0], tri[1], tri[2]));
                }
                tetGeo.computeBoundingSphere();
                this.preview_obj = new THREE.Mesh(tetGeo, TetMeshBuilder.tetMaterialPreview);
                this.obj.add(this.preview_obj);
            }
        }

        add_active_tet() {
            if (this.active_point) {

                // Add the geometry to the tetmesh and the 3js obj
                {
                    this.tetmesh.add_tet(this.active_indices);
                    var tet = this.tetmesh.tetrahedra[this.tetmesh.tetrahedra.length - 1];
                    var tetGeo = new THREE.Geometry();
                    for (var i = 0; i < this.tetmesh.vertices.length; ++i) {
                        tetGeo.vertices.push(this.tetmesh.vertices[i]);
                    }
                    for (var i = 0; i < 4; ++i) {
                        var tri = [this.active_indices[TetMeshBuilder.tetTris[i][0]], this.active_indices[TetMeshBuilder.tetTris[i][1]], this.active_indices[TetMeshBuilder.tetTris[i][2]] ];
                        tetGeo.faces.push(new THREE.Face3(tri[0], tri[1], tri[2]));
                    }
                    tetGeo.computeBoundingSphere();
                    tetGeo.computeFaceNormals();
                    var mesh = new THREE.Mesh(tetGeo, TetMeshBuilder.tetMaterial);
                    this.obj.add(mesh);
                }

                // remove from the add points list so it won't be cast against any more
                {
                    var old_idx = 0;
                    for (; old_idx < this.add_points.length; ++old_idx) {
                        if (this.add_points[old_idx] == this.active_point) {
                            break;
                        }
                    }
                    this.add_points.splice(old_idx, 1);
                }

                // Run the add-tet callback
                TetMeshBuilder.onTetAdded();
            }
        }

        update() {
            var multiplier = this.mouseInteraction ? 0.1 : 1.0;
            this.obj.rotation.x += 0.01 * multiplier;
            this.obj.rotation.y += 0.005 * multiplier;
            this.obj.rotation.z += 0.001 * multiplier;

            // Raycast to each point, "activate" the first one
            var raycaster = new THREE.Raycaster();
            raycaster.setFromCamera( this.mouse, this.camera );
            var intersects = raycaster.intersectObjects(this.add_points, true);
            if (intersects.length > 0) {
                this.set_active_point(intersects[0].object);
            } else {
                this.set_active_point(null);
            }
        }
    },

    onReady: function(container) {

        // Add a scene
        TetMeshBuilder.tetmeshScene = new SceneActor(container, 20);
        DRAMA.add(TetMeshBuilder.tetmeshScene);

        // Add some tetmesh data
        var tetmesh = new Tetmesh();
        tetmesh.randomize();
        TetMeshBuilder.tetmesh = tetmesh;

        // Add an actor to control & display the tetmesh
        var tetmeshActor = new TetMeshBuilder.TetmeshActor(
            TetMeshBuilder.tetmeshScene.scene,
            TetMeshBuilder.tetmeshScene.camera,
            tetmesh,
            TetMeshBuilder.tetmeshMouse);
        DRAMA.add(tetmeshActor);

        // Add some interactions for the tetmesh actor... this
        // raycasts into the mesh if mouse is over the element area,
        // and tries to add a tetrahedron when a click occurs.
        container.mouseenter(function() { tetmeshActor.mouseInteraction = true; });
        container.mouseleave(function() { tetmeshActor.mouseInteraction = false; });
        container.mousemove(function(e) {
            // calculate mouse position in normalized device coordinates
            // (-1 to +1) for both components
            var rect = container[0].getBoundingClientRect();
            TetMeshBuilder.tetmeshMouse.x = ( (event.clientX - rect.left) / container.width() ) * 2 - 1;
            TetMeshBuilder.tetmeshMouse.y = -( (event.clientY - rect.top) / container.height() ) * 2 + 1;
        });
        container.mousedown(function(e) {
            tetmeshActor.add_active_tet();
        });
    }
};
