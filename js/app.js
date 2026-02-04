/**
 * TeXmExDeX Type Modeler - Main Application
 * Coordinates all components
 */

class App {
    constructor() {
        this.currentParams = {};
        this.currentCode = '';

        // Initialize components
        this._initComponents();
        this._setupEventListeners();
        this._checkBackendConnection();
    }

    _initComponents() {
        // Initialize viewer
        viewer = new Viewer('viewport-container');

        // Initialize editor
        editor = new Editor('code-container');

        // Initialize chat
        chat = new Chat();

        // Show demo cube initially
        viewer.showDemoCube();
    }

    _setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this._switchTab(e.target.dataset.tab));
        });

        // Viewport controls
        document.getElementById('btn-reset-view').addEventListener('click', () => {
            viewer.resetView();
            this._showToast('View reset', 'success');
        });

        document.getElementById('btn-wireframe').addEventListener('click', (e) => {
            const isWireframe = viewer.toggleWireframe();
            e.target.classList.toggle('active', isWireframe);
            this._showToast(isWireframe ? 'Wireframe on' : 'Wireframe off', 'success');
        });

        document.getElementById('btn-grid').addEventListener('click', (e) => {
            const showGrid = viewer.toggleGrid();
            e.target.classList.toggle('active', showGrid);
        });

        // Header actions
        document.getElementById('btn-library').addEventListener('click', () => {
            this._openLibraryModal();
        });

        document.getElementById('btn-export').addEventListener('click', () => {
            this._exportSTL();
        });

        // Code panel actions
        document.getElementById('btn-parse').addEventListener('click', () => {
            this._parseParameters();
        });

        document.getElementById('btn-validate').addEventListener('click', () => {
            this._validateCode();
        });

        document.getElementById('btn-copy-code').addEventListener('click', () => {
            this._copyCode();
        });

        document.getElementById('btn-regenerate').addEventListener('click', () => {
            this._regenerateMesh();
        });

        // Modal
        document.getElementById('modal-close').addEventListener('click', () => {
            this._closeLibraryModal();
        });

        document.getElementById('modal-library').addEventListener('click', (e) => {
            if (e.target.id === 'modal-library') {
                this._closeLibraryModal();
            }
        });

        // Library category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this._loadLibraryCategory(e.target.dataset.category);
            });
        });

        // Listen for mesh generation events
        document.addEventListener('generateMesh', (e) => {
            this._generateMesh(e.detail.code);
        });

        // Listen for code changes
        document.addEventListener('codeChanged', (e) => {
            this.currentCode = e.detail.code;
        });

        // Transform controls
        this._setupTransformControls();
    }

    _setupTransformControls() {
        // Position sliders
        ['x', 'y', 'z'].forEach(axis => {
            const slider = document.getElementById(`pos-${axis}`);
            const valueDisplay = document.getElementById(`pos-${axis}-val`);

            if (slider) {
                slider.addEventListener('input', () => {
                    const val = parseFloat(slider.value);
                    valueDisplay.textContent = val;
                    this._updatePosition();
                });
            }
        });

        // Rotation sliders
        ['x', 'y', 'z'].forEach(axis => {
            const slider = document.getElementById(`rot-${axis}`);
            const valueDisplay = document.getElementById(`rot-${axis}-val`);

            if (slider) {
                slider.addEventListener('input', () => {
                    const val = parseFloat(slider.value);
                    valueDisplay.textContent = val + '°';
                    this._updateRotation();
                });
            }
        });

        // Reset transform button
        const resetBtn = document.getElementById('btn-reset-transform');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this._resetTransform());
        }
    }

    _updatePosition() {
        const x = parseFloat(document.getElementById('pos-x').value);
        const y = parseFloat(document.getElementById('pos-y').value);
        const z = parseFloat(document.getElementById('pos-z').value);
        viewer.setPosition(x, y, z);
    }

    _updateRotation() {
        const x = parseFloat(document.getElementById('rot-x').value);
        const y = parseFloat(document.getElementById('rot-y').value);
        const z = parseFloat(document.getElementById('rot-z').value);
        viewer.setRotation(x, y, z);
    }

    _resetTransform() {
        // Reset position
        ['x', 'y', 'z'].forEach(axis => {
            const slider = document.getElementById(`pos-${axis}`);
            const valueDisplay = document.getElementById(`pos-${axis}-val`);
            slider.value = 0;
            valueDisplay.textContent = '0';
        });

        // Reset rotation
        ['x', 'y', 'z'].forEach(axis => {
            const slider = document.getElementById(`rot-${axis}`);
            const valueDisplay = document.getElementById(`rot-${axis}-val`);
            slider.value = 0;
            valueDisplay.textContent = '0°';
        });

        viewer.setPosition(0, 0, 0);
        viewer.setRotation(0, 0, 0);
        this._showToast('Transform reset', 'success');
    }

    async _checkBackendConnection() {
        const connected = await api.checkConnection();
        if (!connected) {
            this._showToast('Backend not connected - using offline mode', 'warning');
        } else {
            this._updateViewportInfo('Connected to backend');
        }
    }

    _switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `tab-${tabName}`);
        });

        // Trigger editor layout if switching to code tab
        if (tabName === 'code' && editor) {
            editor.layout();
        }
    }

    async _generateMesh(code = null) {
        const codeToUse = code || (editor ? editor.getCode() : '');
        if (!codeToUse) {
            this._showToast('No code to execute', 'error');
            return;
        }

        this._showLoading(true);
        this._updateViewportInfo('Generating mesh...');

        try {
            const result = await api.generateMesh(codeToUse, this.currentParams);

            this._showLoading(false);

            if (result.success && result.meshUrl) {
                await viewer.loadGLB(result.meshUrl);
                this._updateViewportInfo(result.meshInfo);
                this._showToast('Mesh generated!', 'success');

                // Parse parameters for the UI
                this._parseParameters();
            } else {
                this._updateViewportInfo(result.status || 'Generation failed');
                this._showToast(result.error || 'Mesh generation failed', 'error');
            }
        } catch (error) {
            this._showLoading(false);
            this._updateViewportInfo('Error');
            this._showToast(`Error: ${error.message}`, 'error');
        }
    }

    async _parseParameters() {
        const code = editor ? editor.getCode() : '';
        if (!code) return;

        try {
            const result = await api.parseParameters(code);

            if (result.success && Object.keys(result.params).length > 0) {
                this.currentParams = this._getDefaultParamValues(result.params);
                this._renderParameters(result.params);
            }
        } catch (error) {
            console.error('Parse error:', error);
        }
    }

    _getDefaultParamValues(params) {
        const values = {};
        for (const [key, spec] of Object.entries(params)) {
            if (Array.isArray(spec) && spec.length >= 1) {
                values[key] = spec[0];
            } else {
                values[key] = spec;
            }
        }
        return values;
    }

    _renderParameters(params) {
        const container = document.getElementById('params-container');
        container.innerHTML = '';

        for (const [key, spec] of Object.entries(params)) {
            const [defaultVal, minVal, maxVal] = Array.isArray(spec) ? spec : [spec, 0, spec * 2];

            const group = document.createElement('div');
            group.className = 'param-group';

            group.innerHTML = `
                <div class="param-label">
                    <span>${this._formatParamName(key)}</span>
                    <span class="param-value" id="value-${key}">${defaultVal}</span>
                </div>
                <input 
                    type="range" 
                    class="param-slider" 
                    id="param-${key}"
                    min="${minVal}" 
                    max="${maxVal}" 
                    value="${defaultVal}"
                    step="${(maxVal - minVal) / 100}"
                >
            `;

            container.appendChild(group);

            // Add event listener
            const slider = group.querySelector(`#param-${key}`);
            const valueDisplay = group.querySelector(`#value-${key}`);

            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueDisplay.textContent = value.toFixed(2);
                this.currentParams[key] = value;
            });
        }
    }

    _formatParamName(name) {
        return name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    async _regenerateMesh() {
        const code = editor ? editor.getCode() : '';
        await this._generateMesh(code);
    }

    async _validateCode() {
        const code = editor ? editor.getCode() : '';
        if (!code) return;

        try {
            const result = await api.validateCode(code);

            if (result.success) {
                if (result.isValid) {
                    editor.clearMarkers();
                    this._showToast(result.message, 'success');
                } else {
                    this._showToast(result.message, 'error');
                }

                if (result.warnings && result.warnings.length > 0) {
                    result.warnings.forEach((warning, i) => {
                        editor.setWarning(1, warning);
                    });
                }
            }
        } catch (error) {
            this._showToast(`Validation error: ${error.message}`, 'error');
        }
    }

    _copyCode() {
        const code = editor ? editor.getCode() : '';
        navigator.clipboard.writeText(code).then(() => {
            this._showToast('Code copied to clipboard', 'success');
        }).catch(() => {
            this._showToast('Failed to copy', 'error');
        });
    }

    async _exportSTL() {
        const code = editor ? editor.getCode() : '';
        if (!code) {
            this._showToast('No code to export', 'error');
            return;
        }

        this._showToast('Generating STL...', 'info');

        try {
            const result = await api.exportSTL(code, this.currentParams);

            if (result.success && result.fileUrl) {
                await api.downloadFile(result.fileUrl, 'model.stl');
                this._showToast('STL downloaded!', 'success');
            } else {
                this._showToast(result.error || 'Export failed', 'error');
            }
        } catch (error) {
            this._showToast(`Export error: ${error.message}`, 'error');
        }
    }

    _openLibraryModal() {
        document.getElementById('modal-library').classList.add('active');
        this._loadLibraryCategory('fasteners');
    }

    _closeLibraryModal() {
        document.getElementById('modal-library').classList.remove('active');
    }

    _loadLibraryCategory(category) {
        const container = document.getElementById('library-items');
        container.innerHTML = '';

        const items = COMPONENT_LIBRARY[category] || [];

        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'library-item';
            itemEl.innerHTML = `
                <div class="library-item-icon">${item.icon}</div>
                <div class="library-item-name">${item.name}</div>
            `;

            itemEl.addEventListener('click', () => {
                this._loadComponent(item.id);
            });

            container.appendChild(itemEl);
        });
    }

    async _loadComponent(componentId) {
        this._closeLibraryModal();
        this._showToast('Loading component...', 'info');

        try {
            const result = await api.getComponentTemplate(componentId);

            if (result.success && result.code) {
                editor.setCode(result.code);
                this._showToast(result.description || 'Component loaded', 'success');

                // Generate mesh
                await this._generateMesh(result.code);
            } else {
                this._showToast(result.error || 'Failed to load component', 'error');
            }
        } catch (error) {
            this._showToast(`Error: ${error.message}`, 'error');
        }
    }

    _showLoading(show) {
        const loading = document.getElementById('viewport-loading');
        loading.classList.toggle('active', show);
    }

    _updateViewportInfo(text) {
        document.getElementById('viewport-info').textContent = text;
    }

    _showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const iconEl = toast.querySelector('.toast-icon');
        const msgEl = toast.querySelector('.toast-message');

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        iconEl.textContent = icons[type] || icons.info;
        msgEl.textContent = message;

        toast.className = 'toast active ' + type;

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
