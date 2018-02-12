---
title: Tetmesh Builder
layout: post
tags: [math, physics]
comments: false
math: false
jquery: true
threejs: true
dramaschool: true
---

<style>
div.container-3js canvas {
    background-color: #000;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    position: static;
}

div.centered {
    text-align: center;
}

</style>


In a simulation of solid mechanics, the shape of an object is usually discretized into geometric regions which share faces and nodes. Especially in FEM, it is common to use tetrahedra for the element shape due to the simple interpolating functions that result.

The following widget allows you to make simple tweaks to a random tetrahedral mesh. By clicking unconnected nodes, you can add tetrahedra to the mesh.

<div class="container-3js" id="{{ page.title | slugify }}-tetmesh" style="height:300px;"></div>

A network of connected nodes represents the tetrahedral regions of a solid object. The connectivity of the network along with the material properties of the object determine the physical reaction to stresses and strains.

The stress/strain relationship between every pair of nodes can be represented as a square, symmetric matrix, called the _stiffness matrix_. The purpose of the WebGL demos in this article are to visually demonstrate how changing the connectivity of a tetrahedral mesh changes the matrix representation of the stiffness matrix.

<script type="text/javascript">

//
// Dear lord, please save my soul. I knoweth the horrors of this code
// which I have brought up, yet I have done nothing to correct it.
//

var TetmeshBuilder = function() {

    //
    // Data Structures
    //

    var tet_tris = [
        [0, 1, 3, 2], // The last index is the point which is NOT included in each tri.
        [0, 2, 1, 3],
        [0, 3, 2, 1],
        [1, 2, 3, 0]
    ];

    class Tet {
        constructor(indices, vertices) {
            this.indices = indices;
            this.vertices = vertices;
            this.compute_normals();

            // If any normal is inverted, swap two
            // vertex indices and invert all of the normals.
            {
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

        get_tri(index) {
            return [
                this.indices[tet_tris[index][0]],
                this.indices[tet_tris[index][1]],
                this.indices[tet_tris[index][2]],
                this.indices[tet_tris[index][3]]];
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
    }

    class Tetmesh {
        constructor() {
            this.vertices = [];
            this.tetrahedra = [];
        }

        add_tet(indices) {
            var tet = new Tet(indices, this.vertices);
            this.tetrahedra.push(tet);
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
    }


    //
    // Actors
    //

    class SceneActor extends DRAMA.Actor {
        constructor(container, height=5, perspective=false) {
            super();
            this.container = container;
            var containerWidth = container.width();
            var containerHeight = container.height();
            this.aspect = containerWidth / containerHeight;
            this.cameraHeight = height;
            this.cameraHeightTarget = height;
            this.scene = new THREE.Scene();

            if (perspective) {
                this.camera = new THREE.PerspectiveCamera(45, this.aspect, 0.1, 1000);
            } else {
                this.camera = new THREE.OrthographicCamera( -height*this.aspect, height*this.aspect, -height, height, 1, 1000);
            }

            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize( containerWidth, containerHeight );
            this.renderer.setClearColor(0xFCFAF7, 1);
            this.camera.position.z = 50;
            container.get(0).appendChild( this.renderer.domElement );
        }

        update() {
            this.cameraHeight += (this.cameraHeightTarget - this.cameraHeight) * 0.1;
            this.camera.left = -this.cameraHeight * this.aspect;
            this.camera.right = this.cameraHeight * this.aspect;
            this.camera.top = -this.cameraHeight;
            this.camera.bottom = this.cameraHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.render( this.scene, this.camera );
        }
    }

    var pointGeometry = new THREE.SphereGeometry( .5, 32, 32 );
    var pointMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    var pointMaterialAddActive = new THREE.MeshBasicMaterial({ color: 0x00addf });
    var pointMaterialSplitActive = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var tetMaterial = new THREE.MeshNormalMaterial();
    var tetMaterialPreview = new THREE.MeshBasicMaterial({ color: 0x777777, wireframe: true });

    class TetmeshActor extends DRAMA.Actor {
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
                for (var i = 0; i < tetmesh.vertices.length; ++i) {
                    var vert = tetmesh.vertices[i];
                    var mesh = new THREE.Mesh(pointGeometry, pointMaterial);
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
                for (var i = 0; i < tetmesh.vertices.length; ++i) {
                    tetGeo.vertices.push(tetmesh.vertices[i]);
                }
                for (var i = 0; i < tetmesh.tetrahedra.length; ++i) {
                    var tet = tetmesh.tetrahedra[i];
                    for (var j = 0; j < 4; ++j) {
                        tetGeo.faces.push(tet.make_face(j));
                    }
                }

                tetGeo.computeBoundingSphere();
                tetGeo.computeFaceNormals();
                var mesh = new THREE.Mesh(tetGeo, tetMaterial);
                this.obj.add(mesh);
            }

            this.scene.add(this.obj);
        }

        set_active_point(new_active_point) {

            // De-color the current active point
            if (this.active_point) {
                this.active_point.material = pointMaterial;
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
            this.active_point.material = pointMaterialAddActive;

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
                    var tri = [this.active_indices[tet_tris[i][0]], this.active_indices[tet_tris[i][1]], this.active_indices[tet_tris[i][2]] ];
                    tetGeo.faces.push(new THREE.Face3(tri[0], tri[1], tri[2]));
                }
                tetGeo.computeBoundingSphere();
                this.preview_obj = new THREE.Mesh(tetGeo, tetMaterialPreview);
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
                        var tri = [this.active_indices[tet_tris[i][0]], this.active_indices[tet_tris[i][1]], this.active_indices[tet_tris[i][2]] ];
                        tetGeo.faces.push(new THREE.Face3(tri[0], tri[1], tri[2]));
                    }
                    tetGeo.computeBoundingSphere();
                    tetGeo.computeFaceNormals();
                    var mesh = new THREE.Mesh(tetGeo, tetMaterial);
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
    }

    //
    // Global Data (shhh! don't tell anyone)
    //


    // Scene references
    var tetmeshMouse = new THREE.Vector2();
    var tetmeshScene;

    //
    // Interaction callbacks
    //

    //
    // Set up scenes
    //

    {
        var container = $("#{{ page.title | slugify }}-tetmesh");
        tetmeshScene = new SceneActor(container, 20);
        DRAMA.add(tetmeshScene);
        var tetmesh = new Tetmesh();
        tetmesh.randomize();
        var tetmeshActor = new TetmeshActor(
            tetmeshScene.scene,
            tetmeshScene.camera,
            tetmesh,
            tetmeshMouse);
        DRAMA.add(tetmeshActor);
        container.mouseenter(function() { tetmeshActor.mouseInteraction = true; });
        container.mouseleave(function() { tetmeshActor.mouseInteraction = false; });
        container.mousemove(function(e) {
            // calculate mouse position in normalized device coordinates
            // (-1 to +1) for both components
            var rect = container[0].getBoundingClientRect();
            tetmeshMouse.x = ( (event.clientX - rect.left) / container.width() ) * 2 - 1;
            tetmeshMouse.y = -( (event.clientY - rect.top) / container.height() ) * 2 + 1;
        });
        container.mousedown(function(e) {
            tetmeshActor.add_active_tet();
        });
    }
}

$(document).ready(TetmeshBuilder);

</script>
