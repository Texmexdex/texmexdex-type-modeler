/**
 * TeXmExDeX Type Modeler - 3D Viewer
 * Three.js-based CAD viewport with measurement tools
 */

class Viewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentMesh = null;
        this.gridHelper = null;
        this.axisHelper = null;

        this.settings = {
            showGrid: true,
            showAxes: true,
            wireframe: false,
            backgroundColor: 0x0a0a0f
        };

        this._init();
    }

    _init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.settings.backgroundColor);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(50, 50, 50);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;

        // Lighting
        this._setupLighting();

        // Grid
        this._setupGrid();

        // Axis helper
        this.axisHelper = new THREE.AxesHelper(20);
        this.scene.add(this.axisHelper);

        // Handle resize
        window.addEventListener('resize', () => this._onResize());

        // Start animation loop
        this._animate();
    }

    _setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
        rimLight.position.set(0, -50, 50);
        this.scene.add(rimLight);
    }

    _setupGrid() {
        // Main grid
        this.gridHelper = new THREE.GridHelper(100, 100, 0x2a2a3a, 0x1a1a24);
        this.scene.add(this.gridHelper);

        // Major grid lines
        const majorGrid = new THREE.GridHelper(100, 10, 0x3a3a4a, 0x3a3a4a);
        this.scene.add(majorGrid);
    }

    _onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Load GLB mesh from URL
     */
    async loadGLB(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();

            loader.load(
                url,
                (gltf) => {
                    // Remove old mesh
                    if (this.currentMesh) {
                        this.scene.remove(this.currentMesh);
                        this.currentMesh.traverse((child) => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => m.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        });
                    }

                    // Add new mesh
                    this.currentMesh = gltf.scene;

                    // Apply material
                    this.currentMesh.traverse((child) => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0x3b82f6,
                                metalness: 0.3,
                                roughness: 0.7,
                                wireframe: this.settings.wireframe
                            });
                        }
                    });

                    this.scene.add(this.currentMesh);
                    this._centerAndFitCamera();

                    resolve(this._getMeshInfo());
                },
                undefined,
                (error) => {
                    console.error('GLB load error:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Load mesh from blob/file
     */
    async loadFromBlob(blob) {
        const url = URL.createObjectURL(blob);
        try {
            const result = await this.loadGLB(url);
            return result;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Center camera on mesh and fit view
     */
    _centerAndFitCamera() {
        if (!this.currentMesh) return;

        const box = new THREE.Box3().setFromObject(this.currentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2;

        this.camera.position.set(cameraZ, cameraZ, cameraZ);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }

    /**
     * Get mesh info
     */
    _getMeshInfo() {
        if (!this.currentMesh) return null;

        let vertexCount = 0;
        let faceCount = 0;

        this.currentMesh.traverse((child) => {
            if (child.isMesh && child.geometry) {
                vertexCount += child.geometry.attributes.position.count;
                if (child.geometry.index) {
                    faceCount += child.geometry.index.count / 3;
                } else {
                    faceCount += child.geometry.attributes.position.count / 3;
                }
            }
        });

        const box = new THREE.Box3().setFromObject(this.currentMesh);
        const size = box.getSize(new THREE.Vector3());

        return {
            vertices: vertexCount,
            faces: Math.floor(faceCount),
            dimensions: {
                x: size.x.toFixed(2),
                y: size.y.toFixed(2),
                z: size.z.toFixed(2)
            }
        };
    }

    /**
     * Reset camera view
     */
    resetView() {
        if (this.currentMesh) {
            this._centerAndFitCamera();
        } else {
            this.camera.position.set(50, 50, 50);
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    /**
     * Toggle wireframe mode
     */
    toggleWireframe() {
        this.settings.wireframe = !this.settings.wireframe;

        if (this.currentMesh) {
            this.currentMesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.wireframe = this.settings.wireframe;
                }
            });
        }

        return this.settings.wireframe;
    }

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.settings.showGrid = !this.settings.showGrid;
        this.gridHelper.visible = this.settings.showGrid;
        return this.settings.showGrid;
    }

    /**
     * Show a demo cube (for testing)
     */
    showDemoCube() {
        const geometry = new THREE.BoxGeometry(20, 20, 20);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            metalness: 0.3,
            roughness: 0.7
        });

        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
        }

        this.currentMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.currentMesh);
        this._centerAndFitCamera();
    }

    /**
     * Create a placeholder mesh for preview
     */
    showPlaceholder(type = 'bolt') {
        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
        }

        const group = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            metalness: 0.3,
            roughness: 0.7
        });

        switch (type) {
            case 'bolt':
                // Head
                const head = new THREE.Mesh(
                    new THREE.CylinderGeometry(6, 6, 5, 6),
                    material
                );
                head.position.y = 17.5;
                group.add(head);

                // Shaft
                const shaft = new THREE.Mesh(
                    new THREE.CylinderGeometry(4, 4, 30, 32),
                    material
                );
                group.add(shaft);
                break;

            case 'gear':
                const gear = new THREE.Mesh(
                    new THREE.CylinderGeometry(15, 15, 8, 32),
                    material
                );
                group.add(gear);
                break;

            default:
                const box = new THREE.Mesh(
                    new THREE.BoxGeometry(20, 20, 20),
                    material
                );
                group.add(box);
        }

        this.currentMesh = group;
        this.scene.add(this.currentMesh);
        this._centerAndFitCamera();
    }

    /**
     * Clear the current mesh
     */
    clearMesh() {
        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            this.currentMesh = null;
        }
    }

    /**
     * Get current mesh dimensions formatted
     */
    getDimensionsString() {
        const info = this._getMeshInfo();
        if (!info) return 'No mesh loaded';

        return `${info.dimensions.x} × ${info.dimensions.y} × ${info.dimensions.z} mm`;
    }
}

// Global viewer instance
let viewer = null;
