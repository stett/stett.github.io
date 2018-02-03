---
title: The BIN-CSR Sparse Matrix Format
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

#original-matrix {
    height: 200px;
}

#bin-csr-intermediate {
    height: 256px;
}

#bin-csr {
    height: 200px;
}

div.centered {
    text-align: center;
}

</style>

The BIN-CSR format is a sparse, symmetric matrix format, originally described by Daniel Weber et. al [in their 2012 paper](http://onlinelibrary.wiley.com/doi/10.1111/j.1467-8659.2012.03227.x/full) on GPU data structures. BIN-CSR is suitable for applications which use massively parallelized matrix operations, like some GPU-based [finite element method](https://en.wikipedia.org/wiki/Finite_element_method) solvers.

The WebGL demos on this page aim to demonstrate the construction of a BIN-CSR matrix in an interactive way.

The following is a dramatically over-engineered representation of our original matrix. Drag the slider to change the dimensions of the matrix.

<div class="container-3js" id="original-matrix"></div>
<div class="centered">
<input type="range" min="1" max="32" step="1" value="8" oninput="interactResizeMatrix(this.value)">
</div>

The elements of this matrix are packed into padded _bins_. Each bin contains a set number of rows worth of data. The number of rows contained in a bin is called the _bin width_. The following is an illustration of bin data packing. The slider can be used to adjust the bin width.

<div class="container-3js" id="bin-csr-intermediate"></div>
<div class="centered">
<input type="range" min="1" max="32" step="1" value="3" oninput="interactResizeBin(this.value)">
</div>

The diagonal elements of the matrix are stored separately, to enable fast [_preconditioning_](https://en.wikipedia.org/wiki/Preconditioner) of the matrix. Preconditioning is a step which allows for faster convergence when performing a system solving method like the [conjugate gradient method](https://en.wikipedia.org/wiki/Conjugate_gradient_method), which is the target application for this format.

The above visual shows the theoretical grouping of the data. The actual layout of the data in memory is optimized for [coallesced memory access on the GPU](https://mc.stanford.edu/cgi-bin/images/0/0a/M02_4.pdf). In actuality, the data is stored in four separate arrays, visualized here:

<div class="container-3js" id="bin-csr"></div>

<script type="text/javascript">

//
// BIN-CSR Data Structures
//

class BinIntermediate {
    constructor() {
        this.val = [];
        this.col = [];
        this.length = 0;
    }
}

class BinCSRIntermediate {
    constructor(width, matrix=[[]]) {
        this.width = width;
        this.set_matrix(matrix);
    }

    set_matrix(matrix) {

        this.bins = [];
        this.diag = [];
        this.size = matrix.length;

        // Add each row to its bin
        var bin_index = -1;
        for (var row = 0; row < matrix.length; ++row) {

            // Make a new bin if needed
            if (row % this.width == 0) {
                ++bin_index;
                this.bins.push(new BinIntermediate());
            }

            // Add the data to the bin
            var bin = this.bins[bin_index];
            var vals = [];
            var cols = [];
            for (var col = 0; col < matrix.length; ++col) {
                var val = matrix[row][col];
                if (row == col) {
                    this.diag.push(val);
                } else if (val != 0) {
                    vals.push(val);
                    cols.push(col);
                }
            }

            bin.val.push(vals);
            bin.col.push(cols);
            bin.length = Math.max(bin.length, vals.length);
        }
    }
}

class BinCSR {
    constructor(width, inter) {
        this.set_inter(inter);
    }

    set_inter(inter) {
        this.width = inter.width;
        this.ptr = [];
        this.col = [];
        this.val = [];
        this.dia = [];

        // Initialize the ptr array, with a zero for each row.
        // Also, do the diagonals while we're at it.
        for (var i = 0; i < inter.rows; ++i) {
            this.ptr.push(0);
            this.dia.push(inter.diag[i]);
        }

        // Add bin data to arrays
        for (var bin_index = 0; bin_index < inter.bins.length; ++bin_index) {
            var bin = inter.bins[bin_index];

            for (var row_local = 0; row_local < bin.val.length; ++row_local) {
                var row = (bin * this.width) + row_local;

                for (var i = 0; i < bin.length; ++i) {
                    var index = row + (i * this.width);
                    var val = i < bin.val[row_local].length ? bin.val[row_local][i] : 0;
                    var col = i < bin.col[row_local].length ? bin.col[row_local][i] : 0;

                    // Pad the val and col arrays
                    while (this.val.length < index + 1) { this.val.push(0); }
                    while (this.col.length < index + 1) { this.col.push(0); }

                    // Insert the data
                    this.val[index] = val;
                    this.col[index] = val;
                }
            }
        }
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

var cellGeometry = new THREE.BoxGeometry( 1, 1, .01 );
var zeroMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );
var nonzeroMaterial = new THREE.MeshBasicMaterial( { color: 0x000000 } );
var diagMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

class MatrixQuadActor extends Actor {
    constructor(scene, matrix=[[]]) {
        super();
        this.scene = scene;
        this.object = null;
        this.height = 0;
        this.staystill = false;
        this.set_matrix(matrix);
    }

    set_matrix(matrix) {
        if (this.object) {
            this.scene.remove(this.object);
        }

        this.object = new THREE.Object3D();
        this.rotation = 0;
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

    update() {
        /*
        if (this.staystill == false) {
            this.rotation += 0.015;
            var axis = new THREE.Vector3(1, 1, 0).normalize();
            var quat = new THREE.Quaternion().setFromAxisAngle( axis, this.rotation );
            this.object.rotation.setFromQuaternion( quat );
        } else {
            this.rotation = 0;
            var quatTarget = new THREE.Quaternion().set(0, 0, 0, 1).normalize();
            THREE.Quaternion.slerp(this.object.quaternion, quatTarget, this.object.quaternion, 0.1);
        }
        */
    }
}

class BinCSRIntermediateQuadActor extends Actor {
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

class BinCSRQuadActor extends Actor {
    constructor(scene, bincsr) {
        super();
        this.scene = scene;
        this.set_bincsr(bincsr);
    }

    set_bincsr(bincsr) {
        this.bincsr = bincsr;
    }

    update() {}
};

//
// Global Data (shhh! don't tell anyone)
//

var matrix = [
    [1, 1, 0, 2, 0, 0, 4, 0],
    [1, 2, 0, 3, 3, 0, 2, 0],
    [0, 0, 3, 3, 5, 8, 6, 9],
    [2, 3, 3, 4, 3, 0, 0, 0],
    [0, 3, 5, 3, 5, 0, 0, 0],
    [0, 0, 8, 0, 0, 6, 2, 1],
    [4, 2, 6, 0, 0, 2, 7, 0],
    [0, 0, 9, 0, 0, 1, 0, 8]
];
var matrix_size = 8;
var sparsity = 0.2;
var bin_size = 3;
var matrixQuadActor;
var bincsrIntermediate = new BinCSRIntermediate(bin_size, matrix);
var bincsrIntermediateQuadActor;
var bincsr = new BinCSR(bin_size, bincsrIntermediate);
var originalMatrixScene;
var bincsrIntermediateScene;
var bincsrScene;

//
// Interaction callbacks
//

function interactResizeMatrix(size) {
    matrix_size = size;
    interactUpdateMatrix();
}

function interactResizeBin(size) {
    bin_size = size;
    interactUpdateMatrix();
}

function interactUpdateMatrix() {

    // Resize the matrix with random values.
    while (matrix_size < matrix.length) {
        matrix.pop();
        for (var i = 0; i < matrix.length; ++i) {
            matrix[i].pop();
        }
    }
    while (matrix_size > matrix.length) {
        var new_row = [];
        for (var i = 0; i < matrix.length; ++i) {
            var dice = Math.random();
            var val = dice < sparsity ? 1 + Math.floor(Math.random() * Math.floor(9)) : 0;
            matrix[i].push(val);
            new_row.push(val);
        }
        new_row.push(1 + Math.floor(Math.random() * Math.floor(8)));
        matrix.push(new_row);
    }

    // Update the actors in the world with the new matrix
    matrixQuadActor.set_matrix(matrix);
    bincsrIntermediate = new BinCSRIntermediate(bin_size, matrix);
    bincsrIntermediateQuadActor.set_inter(bincsrIntermediate);

    // Update the scene cameras to contain the entire quads
    originalMatrixScene.cameraHeightTarget = matrixQuadActor.height+1;
    bincsrIntermediateScene.cameraHeightTarget = (bincsrIntermediateQuadActor.height/2)+1;
}

$(document).ready(function() {

    //
    // Set up scenes
    //

    {
        var container = $("#original-matrix");
        originalMatrixScene = new SceneActor(container, 5);
        actors.push(originalMatrixScene);
        matrixQuadActor = new MatrixQuadActor(originalMatrixScene.scene, matrix);
        container.mouseenter(function() { matrixQuadActor.staystill = true; });
        container.mouseleave(function() { matrixQuadActor.staystill = false; });
        actors.push(matrixQuadActor);
    }

    {
        var container = $("#bin-csr-intermediate");
        bincsrIntermediateScene = new SceneActor(container, 8);
        actors.push(bincsrIntermediateScene);
        bincsrIntermediateQuadActor = new BinCSRIntermediateQuadActor(bincsrIntermediateScene.scene, bincsrIntermediate);
        actors.push(bincsrIntermediateQuadActor);
    }

    {
        var container = $("#bin-csr");
        bincsrScene = new SceneActor(container);
        actors.push(bincsrScene);
        bincsrQuadActor = new BinCSRQuadActor(bincsrScene.scene, bincsr);
        actors.push(bincsrQuadActor);
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
