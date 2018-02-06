---
title: Tetmesh Builder
layout: post
tags: [math, physics]
comments: false
math: false
jquery: true
threejs: true
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

<div class="container-3js" id="{{ page.title | slugify }}-tetmesh" style="height:300px;"></div>

<script type="text/javascript">

//
// Data Structures
//

class Tetmesh {
    constructor() {
        this.vertices = [];
        this.tetrahedra = [];
    }

    add_tet(tet) {

        var tris = [
            [0, 3, 1, 2], // The last element in each triangle array is
            [0, 1, 2, 3], // the index of the EXCLUDED point!
            [0, 2, 3, 1],
            [1, 3, 2, 0]
        ];

        for (var i = 0; i < 4; ++i) {

            // Get the normal of this triangle, and project the excluded
            // point onto it. If they have a positive projection, then the
            // face is inverted. We can fix this by swapping any two points
            // in the tetrahedron that are included in this face.
            var tri = tris[i];
            console.log(tri);
            console.log(this.vertices);
            console.log(this.vertices[tri[0]]);
            var a = this.vertices[tri[0]];
            var b = this.vertices[tri[1]];
            var c = this.vertices[tri[2]];
            var d = this.vertices[tri[3]];
            var ab = b - a;
            var ac = c - a;
            var ad = d - a;
            var n = new THREE.Vector3();
            n.crossVectors(ac, ab);
            if (n.dot(ad) > 0) {
                var tmp = tet[tri[0]];
                tet[tri[0]] = tet[tri[1]];
                tet[tri[1]] = tmp;
            }
        }

        this.tetrahedra.push(tet);
    }

    randomize() {

        // Add some verts
        for (var i = 0; i < 20; ++i) {
            var vert = [];
            for (var j = 0; j < 3; ++j) {
                vert.push(-15 + Math.floor(Math.random() * Math.floor(30)));
            }
            this.vertices.push(vert);
        }

        // Add a couple tets
        this.add_tet([ 0, 1, 2, 3 ]);
        //this.tetrahedra.push([0, 1, 2, 3]);
        /*
        {
            vert = this.vertices[3];
            var a = new THREE.Vector3(vert[0], vert[1], vert[2]);
            vert = this.vertices[1];
            var b = new THREE.Vector3(vert[0], vert[1], vert[2]);
            vert = this.vertices[2];
            var c = new THREE.Vector3(vert[0], vert[1], vert[2]);
            vert = this.vertices[0];
            var d = new THREE.Vector3(vert[0], vert[1], vert[2]);
            var vect = new THREE.Vector3(vert[0], vert[1], vert[2]);
            var ba = a - b;
            var bc = c - b;
            var n = ba.cross(bc);
            var side = n.dot(d - a) > 0;
            for (var i = 1; i < this.vertices.length; ++i) {
                vert = this.vertices[i];
                var this_side = n.dot(vert - a) > 0;
                if (side != this_side) {
                    this.vertices.push(vert);
                    break;
                }
            }
        }
        */
    }
}

//
// Actors
//

class Actor {
    update() {}
}

var actors = [];

class SceneActor extends Actor {
    constructor(container, height=5) {
        super();
        this.container = container;
        var containerWidth = container.width();
        var containerHeight = container.height();
        this.aspect = containerWidth / containerHeight;
        this.cameraHeight = height;
        this.cameraHeightTarget = height;
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera( -height*this.aspect, height*this.aspect, -height, height, 1, 1000);
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
var pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
var tetMaterial = new THREE.MeshNormalMaterial();//{ side: THREE.DoubleSide });

class TetmeshActor extends Actor {
    constructor(scene, tetmesh) {
        super();
        this.scene = scene;
        this.tetmesh = tetmesh;
        this.set_tetmesh(tetmesh);
        this.mouseInteraction = false;
        this.obj;
    }

    set_tetmesh(tetmesh) {
        this.tetmesh = tetmesh;
        this.obj = new THREE.Object3D();

        // Delete existing point data
        if (this.points_obj != null) {
            this.scene.remove(this.points_obj);
        }

        if (this.tets_obj != null) {
            this.scene.remove(this.tets_obj);
        }

        // Add new points
        {
            var points_obj = new THREE.Object3D();
            for (var i = 0; i < tetmesh.vertices.length; ++i) {
                var vert = tetmesh.vertices[i];
                var mesh = new THREE.Mesh(pointGeometry, pointMaterial);
                mesh.position.set(vert[0], vert[1], vert[2]);
                points_obj.add(mesh);
            }
            this.obj.add(points_obj);
        }

        // Add new tets
        {
            var tetGeo = new THREE.Geometry();
            for (var i = 0; i < tetmesh.vertices.length; ++i) {
                var vert = tetmesh.vertices[i];
                var vect = new THREE.Vector3(vert[0], vert[1], vert[2]);
                tetGeo.vertices.push(vect);
                console.log(vect);
            }
            for (var i = 0; i < tetmesh.tetrahedra.length; ++i) {
                var tet = tetmesh.tetrahedra[i];
                console.log(tet);
                tetGeo.faces.push(new THREE.Face3(tet[0], tet[3], tet[1]));
                tetGeo.faces.push(new THREE.Face3(tet[0], tet[1], tet[2]));
                tetGeo.faces.push(new THREE.Face3(tet[0], tet[2], tet[3]));
                tetGeo.faces.push(new THREE.Face3(tet[1], tet[3], tet[2]));
            }
            tetGeo.computeBoundingSphere();
            tetGeo.computeFaceNormals();
            var mesh = new THREE.Mesh(tetGeo, tetMaterial);
            this.obj.add(mesh);
        }

        this.scene.add(this.obj);
    }

    update() {
        var multiplier = this.mouseInteraction ? 0.1 : 1.0;
        this.obj.rotation.x += 0.01 * multiplier;
        this.obj.rotation.y += 0.005 * multiplier;
        this.obj.rotation.z += 0.001 * multiplier;
    }
}

//
// Global Data (shhh! don't tell anyone)
//

// Scene references
var tetmeshScene;

//
// Interaction callbacks
//

$(document).ready(function() {

    //
    // Set up scenes
    //

    {
        var container = $("#{{ page.title | slugify }}-tetmesh");
        tetmeshScene = new SceneActor(container, 20);
        actors.push(tetmeshScene);
        var tetmesh = new Tetmesh();
        tetmesh.randomize();
        var tetmeshActor = new TetmeshActor(tetmeshScene.scene, tetmesh);
        actors.push(tetmeshActor);
        container.mouseenter(function() { tetmeshActor.mouseInteraction = true; });
        container.mouseleave(function() { tetmeshActor.mouseInteraction = false; });
    }

    //
    // Loop
    //

    var update = function () {
        requestAnimationFrame( update );
        for (var i = 0, len = actors.length; i < len; ++i) {
            actors[i].update();
        }
    };

    update();
});
</script>
