//
// Actors
//

var SceneActor = SceneActor || class extends DRAMA.Actor {
    // options.onDemand renders only after invalidate() or while the camera is
    // still easing, for diagrams that sit still most of the time. Their actors
    // have to call invalidate() whenever they change the scene.
    // options.pixelRatio renders at that many device pixels per CSS pixel.
    // options.shared renders through one WebGL context shared by every shared
    // scene on the page, copying each frame into the scene's own 2D canvas.
    // Browsers cap the number of live WebGL contexts per page (mobile Chrome
    // at 8) and drop the oldest past that, so posts with many diagrams need it.
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
        this.camera.position.z = 50;

        var pixelRatio = options.pixelRatio || 1;
        if (options.shared) {
            this.renderer = null;
            this.canvas = document.createElement("canvas");
            this.canvas.width = Math.round(containerWidth * pixelRatio);
            this.canvas.height = Math.round(containerHeight * pixelRatio);
            this.canvas.style.width = containerWidth + "px";
            this.canvas.style.height = containerHeight + "px";
            this.context = this.canvas.getContext("2d");
        } else {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setPixelRatio(pixelRatio);
            this.renderer.setSize( containerWidth, containerHeight );
            this.canvas = this.renderer.domElement;
        }
        container.get(0).appendChild( this.canvas );

        // Diagrams that define a themed palette (see particle-quad-common.js)
        // clear to the page background and repaint on a preference switch.
        // Everywhere else the original light background is kept.
        if (typeof bgColor === "function") {
            this.setClearColor(bgColor());
            registerThemedScene(this);
        } else {
            this.setClearColor(0xFCFAF7);
        }
    }

    // The one renderer behind every shared scene, made on first use. It works
    // in device pixels and only ever grows, each scene drawing into its
    // top-left corner (this version of three measures viewport and scissor y
    // from the top).
    static sharedRenderer() {
        if (!SceneActor._sharedRenderer) {
            var renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(1);
            renderer.setScissorTest(true);
            renderer.setSize(1, 1, false);
            renderer.sizeX = 1;
            renderer.sizeY = 1;
            SceneActor._sharedRenderer = renderer;
        }
        return SceneActor._sharedRenderer;
    }

    setClearColor(color) {
        this.clearColor = color;
        if (this.renderer) {
            this.renderer.setClearColor(color, 1);
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

        if (this.renderer) {
            this.renderer.render( this.scene, this.camera );
        } else {
            this._renderShared();
        }
    }

    _renderShared() {
        var renderer = SceneActor.sharedRenderer();
        var w = this.canvas.width;
        var h = this.canvas.height;
        if (renderer.sizeX < w || renderer.sizeY < h) {
            renderer.sizeX = Math.max(renderer.sizeX, w);
            renderer.sizeY = Math.max(renderer.sizeY, h);
            renderer.setSize(renderer.sizeX, renderer.sizeY, false);
        }
        renderer.setViewport(0, 0, w, h);
        renderer.setScissor(0, 0, w, h);
        renderer.setClearColor(this.clearColor, 1);
        renderer.render(this.scene, this.camera);

        // Copy before returning to the browser, while the drawing buffer still
        // holds this frame.
        this.context.drawImage(renderer.domElement, 0, 0, w, h, 0, 0, w, h);
    }
};
