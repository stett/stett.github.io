var TetStiffInspector = TetStiffInspector || {

    SceneActor: class extends DRAMA.Actor {
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
    },

    onReady: function(container, tetmesh) {

    }
};