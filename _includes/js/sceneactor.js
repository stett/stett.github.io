//
// Actors
//

var SceneActor = SceneActor || class extends DRAMA.Actor {
    // options.onDemand renders only after invalidate() or while the camera is
    // still easing, for diagrams that sit still most of the time. Their actors
    // have to call invalidate() whenever they change the scene.
    // options.pixelRatio renders at that many device pixels per CSS pixel.
    constructor(container, height=5, perspective=false, options={}) {
        super();
        this.onDemand = !!options.onDemand;
        this.dirty = true;
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
        this.renderer.setPixelRatio(options.pixelRatio || 1);
        this.renderer.setSize( containerWidth, containerHeight );
        this.camera.position.z = 50;
        container.get(0).appendChild( this.renderer.domElement );

        // Diagrams that define a themed palette (see particle-quad-common.js)
        // clear to the page background and repaint on a preference switch.
        // Everywhere else the original light background is kept.
        if (typeof bgColor === "function") {
            this.renderer.setClearColor(bgColor(), 1);
            registerThemedScene(this);
        } else {
            this.renderer.setClearColor(0xFCFAF7, 1);
        }
    }

    invalidate() {
        this.dirty = true;
    }

    update() {
        var dh = this.cameraHeightTarget - this.cameraHeight;
        if (!this.onDemand) {
            this.cameraHeight += dh * 0.1;
        } else if (Math.abs(dh) >= 0.0005) {
            this.cameraHeight += dh * 0.1;
            this.dirty = false;
        } else if (dh != 0 || this.dirty) {
            // Snap the last sliver of the ease, so the camera settles exactly
            // and the scene can stop rendering.
            this.cameraHeight = this.cameraHeightTarget;
            this.dirty = false;
        } else {
            return;
        }
        this.camera.left = -this.cameraHeight * this.aspect;
        this.camera.right = this.cameraHeight * this.aspect;
        this.camera.top = -this.cameraHeight;
        this.camera.bottom = this.cameraHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.render( this.scene, this.camera );
    }
};
