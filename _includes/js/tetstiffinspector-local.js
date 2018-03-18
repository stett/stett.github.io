{% include js/sceneactor.js %}
{% include js/tetmesh.js %}
{% include js/matrix-list-quad-actor.js %}

var TetStiffInspectorLocal = TetStiffInspectorLocal || {

    scene: null,
    tetmesh: null,
    //matrixQuadActor: null,
    matrixListQuadActor: null,

    onReady: function(container, tetmesh) {

        // Add the scene actor
        TetStiffInspectorLocal.scene = new SceneActor(container, 20);
        DRAMA.add(TetStiffInspectorLocal.scene);

        // Add a matrix quad to the scene
        //TetStiffInspectorLocal.matrixQuadActor = new MatrixQuadActor(TetStiffInspectorLocal.scene.scene);
        TetStiffInspectorLocal.matrixListQuadActor = new MatrixListQuadActor(TetStiffInspectorLocal.scene.scene);
        DRAMA.add(TetStiffInspectorLocal.matrixListQuadActor);

        // Connect the tetmesh
        TetStiffInspectorLocal.tetmesh = tetmesh;
    },

    generateMatrix: function() {
        TetStiffInspectorLocal.matrixListQuadActor.clear_matrices();
        for (var i = 0; i < TetStiffInspectorLocal.tetmesh.tetrahedra.length; ++i) {
            var matrix = TetStiffInspectorLocal.tetmesh.tetrahedra[i].stiffness;
            TetStiffInspectorLocal.matrixListQuadActor.add_matrix(matrix);
        }

        var heightTarget = (TetStiffInspectorLocal.matrixListQuadActor.height/2)+1;
        var widthTarget = (TetStiffInspectorLocal.matrixListQuadActor.width/2);
        TetStiffInspectorLocal.scene.cameraHeightTarget = Math.max(
            heightTarget,
            widthTarget * TetStiffInspectorLocal.scene.aspect);
        TetStiffInspectorLocal.scene.camera.position.x = widthTarget/2;
    }
};