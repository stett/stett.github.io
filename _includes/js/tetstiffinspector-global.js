{% include js/sceneactor.js %}
{% include js/tetmesh.js %}
{% include js/matrix-quad-actor.js %}

var TetStiffInspectorGlobal = TetStiffInspectorGlobal || {

    scene: null,
    tetmesh: null,
    matrixQuadActor: null,

    onReady: function(container, tetmesh) {

        // Add the scene actor
        TetStiffInspectorGlobal.scene = new SceneActor(container, 20);
        DRAMA.add(TetStiffInspectorGlobal.scene);

        // Add a matrix quad to the scene
        TetStiffInspectorGlobal.matrixQuadActor = new MatrixQuadActor(TetStiffInspectorGlobal.scene.scene);
        DRAMA.add(TetStiffInspectorGlobal.matrixQuadActor);

        // Connect the tetmesh
        TetStiffInspectorGlobal.tetmesh = tetmesh;
    },

    generateMatrix: function() {
        TetStiffInspectorGlobal.matrixQuadActor.set_matrix(TetStiffInspectorGlobal.tetmesh.stiffness);
        TetStiffInspectorGlobal.scene.cameraHeightTarget = TetStiffInspectorGlobal.matrixQuadActor.height+1;
    }
};