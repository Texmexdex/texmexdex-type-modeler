/**
 * TeXmExDeX Type Modeler - Code Editor
 * Monaco Editor integration
 */

class Editor {
    constructor(containerId) {
        this.containerId = containerId;
        this.editor = null;
        this.currentCode = '';
        this.isReady = false;

        this._init();
    }

    _init() {
        // Configure Monaco loader
        require.config({
            paths: {
                'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
            }
        });

        // Load Monaco
        require(['vs/editor/editor.main'], () => {
            this._createEditor();
        });
    }

    _createEditor() {
        const container = document.getElementById(this.containerId);

        // Define custom theme
        monaco.editor.defineTheme('texmexdex-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '606070', fontStyle: 'italic' },
                { token: 'keyword', foreground: '8b5cf6' },
                { token: 'string', foreground: '10b981' },
                { token: 'number', foreground: 'f59e0b' },
                { token: 'function', foreground: '3b82f6' },
            ],
            colors: {
                'editor.background': '#12121a',
                'editor.foreground': '#f0f0f5',
                'editor.lineHighlightBackground': '#1e1e2a',
                'editorCursor.foreground': '#3b82f6',
                'editor.selectionBackground': '#3b82f640',
                'editorLineNumber.foreground': '#606070',
            }
        });

        // Create editor
        this.editor = monaco.editor.create(container, {
            value: this._getDefaultCode(),
            language: 'python',
            theme: 'texmexdex-dark',
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 10, bottom: 10 },
        });

        this.isReady = true;

        // Listen for changes
        this.editor.onDidChangeModelContent(() => {
            this.currentCode = this.editor.getValue();
            this._onCodeChange();
        });
    }

    _getDefaultCode() {
        return `import trimesh
import numpy as np

# [PARAMETERS]
parameters = {
    'size': (20.0, 5.0, 100.0),
    'height': (20.0, 5.0, 100.0),
}

def generate(params):
    size = params['size']
    height = params['height']
    
    mesh = trimesh.creation.box([size, size, height])
    
    return mesh
`;
    }

    _onCodeChange() {
        // Dispatch custom event for code changes
        const event = new CustomEvent('codeChanged', {
            detail: { code: this.currentCode }
        });
        document.dispatchEvent(event);
    }

    /**
     * Set editor content
     */
    setCode(code) {
        if (this.editor) {
            this.editor.setValue(code);
            this.currentCode = code;
        } else {
            // Editor not ready yet, wait and retry
            setTimeout(() => this.setCode(code), 100);
        }
    }

    /**
     * Get editor content
     */
    getCode() {
        return this.editor ? this.editor.getValue() : this.currentCode;
    }

    /**
     * Add error marker to editor
     */
    setError(lineNumber, message) {
        if (!this.editor) return;

        const model = this.editor.getModel();
        monaco.editor.setModelMarkers(model, 'errors', [{
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: model.getLineMaxColumn(lineNumber),
            message: message,
            severity: monaco.MarkerSeverity.Error
        }]);
    }

    /**
     * Add warning marker
     */
    setWarning(lineNumber, message) {
        if (!this.editor) return;

        const model = this.editor.getModel();
        const existingMarkers = monaco.editor.getModelMarkers({ resource: model.uri });

        monaco.editor.setModelMarkers(model, 'warnings', [
            ...existingMarkers,
            {
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: model.getLineMaxColumn(lineNumber),
                message: message,
                severity: monaco.MarkerSeverity.Warning
            }
        ]);
    }

    /**
     * Clear all markers
     */
    clearMarkers() {
        if (!this.editor) return;

        const model = this.editor.getModel();
        monaco.editor.setModelMarkers(model, 'errors', []);
        monaco.editor.setModelMarkers(model, 'warnings', []);
    }

    /**
     * Focus the editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    /**
     * Resize editor
     */
    layout() {
        if (this.editor) {
            this.editor.layout();
        }
    }

    /**
     * Format document
     */
    format() {
        if (this.editor) {
            this.editor.getAction('editor.action.formatDocument').run();
        }
    }
}

// Global editor instance
let editor = null;
