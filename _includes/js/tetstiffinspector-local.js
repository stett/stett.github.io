{% include js/sceneactor.js %}
{% include js/tetmesh.js %}
{% include js/matrix-quad-actor.js %}

var TetStiffInspectorLocal = TetStiffInspectorLocal || {

    scene: null,
    tetmesh: null,
    matrixQuadActor: null,

    onReady: function(container, tetmesh) {

        // Add the scene actor
        TetStiffInspectorLocal.scene = new SceneActor(container, 20);
        DRAMA.add(TetStiffInspectorLocal.scene);

        // Add a matrix quad to the scene
        TetStiffInspectorLocal.matrixQuadActor = new MatrixQuadActor(TetStiffInspectorLocal.scene.scene);
        DRAMA.add(TetStiffInspectorLocal.matrixQuadActor);

        // Connect the tetmesh
        TetStiffInspectorLocal.tetmesh = tetmesh;
    },

    generateMatrix: function() {
        TetStiffInspectorLocal.matrixQuadActor.set_matrix(TetStiffInspectorLocal.tetmesh.tetrahedra[0].stiffness);
        TetStiffInspectorLocal.scene.cameraHeightTarget = TetStiffInspectorLocal.matrixQuadActor.height+1;
    }
};