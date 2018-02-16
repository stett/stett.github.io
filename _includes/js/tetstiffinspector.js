{% include js/sceneactor.js %}
{% include js/tetmesh.js %}

var TetStiffInspector = TetStiffInspector || {

    scene: null,
    tetmesh: null,

    onReady: function(container, tetmesh) {

        // Add the scene actor
        TetStiffInspector.scene = new SceneActor(container, 20);
        DRAMA.add(TetStiffInspector.scene);

        // Connect the tetmesh
        TetStiffInspector.tetmesh = tetmesh;
    }
};