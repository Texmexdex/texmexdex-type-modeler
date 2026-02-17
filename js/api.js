/**
 * TeXmExDeX Type Modeler - API Client
 * Handles communication with HuggingFace Space backend (Gradio 5.x compatible)
 */

class API {
    constructor(baseUrl = null) {
        // Auto-detect HF Space URL or use localhost for development
        this.baseUrl = baseUrl || this._detectBaseUrl();
        // Default to /gradio_api which is standard for Gradio 5+ on HF Spaces
        this.apiPrefix = '/gradio_api';
        this.isConnected = false;
        this.fnIndex = {};
        this.sessionHash = this._generateSessionHash();
    }

    _detectBaseUrl() {
        // Check if we're on HF Spaces
        const hostname = window.location.hostname;

        if (hostname.includes('huggingface.co') || hostname.includes('hf.space')) {
            // We're on HF Spaces, use the Gradio API
            return window.location.origin;
        }

        // Default to HF Space URL when deployed
        return 'https://texmexdex-texmexdex-type-modeler.hf.space';
    }

    _generateSessionHash() {
        return Math.random().toString(36).substring(2, 15);
    }

    /**
     * Initialize by fetching the API config
     */
    async init() {
        try {
            const response = await fetch(`${this.baseUrl}/config`);
            if (response.ok) {
                const config = await response.json();

                // Store API prefix if present (common in Gradio 5.x)
                if (config.api_prefix) {
                    this.apiPrefix = config.api_prefix;
                    console.log('Using API prefix:', this.apiPrefix);
                }

                // Build function index map from config
                if (config.components) {
                    // Gradio 5.x config structure
                    this.isConnected = true;
                }
                return true;
            }
        } catch (error) {
            console.log('Config fetch failed, defaulting to /gradio_api');
            this.apiPrefix = '/gradio_api';
        }
        return true; // Assume success even if config fails, as we have a default
    }

    /**
     * Check backend connection
     */
    async checkConnection() {
        if (!this.isConnected) {
            await this.init();
        }
        return this.isConnected;
    }

    /**
     * Send a chat message to generate code
     */
    async chatToCode(message, history = [], currentCode = '') {
        console.log('=== chatToCode CALLED ===');
        console.log('Message:', message);
        console.log('Base URL:', this.baseUrl);
        console.log('API Prefix:', this.apiPrefix);

        try {
            console.log('Calling _callGradio5 with fn_name: chat_to_code');
            const response = await this._callGradio5('chat_to_code', [message, history, currentCode]);
            console.log('_callGradio5 returned:', response);

            return {
                success: true,
                code: response[0],
                status: response[1],
                history: response[2]
            };
        } catch (error) {
            console.error('Chat API error:', error);
            console.error('Error stack:', error.stack);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate mesh from code
     */
    async generateMesh(code, params = {}) {
        try {
            const paramsJson = JSON.stringify(params);
            const response = await this._callGradio5('generate_mesh', [code, paramsJson]);

            // Gradio 5.x returns file outputs as objects with 'url' or 'path'
            let meshUrl = response[0];
            if (meshUrl && typeof meshUrl === 'object') {
                // Extract URL from Gradio file object
                meshUrl = meshUrl.url || meshUrl.path || null;
                // If it's a relative path, make it absolute
                if (meshUrl && !meshUrl.startsWith('http')) {
                    meshUrl = `${this.baseUrl}${meshUrl.startsWith('/') ? '' : '/'}${meshUrl}`;
                }
            }

            console.log('Mesh URL:', meshUrl);  // Debug logging

            return {
                success: meshUrl !== null,
                meshUrl: meshUrl,
                status: response[1],
                meshInfo: response[2]
            };
        } catch (error) {
            console.error('Mesh generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Parse parameters from code
     */
    async parseParameters(code) {
        try {
            const response = await this._callGradio5('parse_parameters', [code]);
            const params = JSON.parse(response[0] || '{}');
            return {
                success: true,
                params: params,
                status: response[1]
            };
        } catch (error) {
            console.error('Parse error:', error);
            return {
                success: false,
                error: error.message,
                params: {}
            };
        }
    }

    /**
     * Validate code
     */
    async validateCode(code) {
        try {
            const response = await this._callGradio5('validate_code', [code]);

            // Parse warnings JSON string
            let warnings = [];
            try {
                if (response[1]) {
                    warnings = JSON.parse(response[1]);
                }
            } catch (e) {
                console.warn('Failed to parse warnings JSON:', e);
                warnings = [];
            }

            return {
                success: true,
                message: response[0],
                warnings: warnings
            };
        } catch (error) {
            console.error('Validation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Auto-fix code issues
     */
    async autoFixCode(code) {
        try {
            const response = await this._callGradio5('auto_fix_code', [code]);

            // Parse fixes JSON string
            let fixes = [];
            try {
                if (response[2]) {
                    fixes = JSON.parse(response[2]);
                }
            } catch (e) {
                console.warn('Failed to parse fixes JSON:', e);
                fixes = [];
            }

            return {
                success: true,
                fixedCode: response[0],
                status: response[1],
                fixes: fixes
            };
        } catch (error) {
            console.error('Auto-fix error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Export STL
     */
    async exportSTL(code, params = {}) {
        try {
            const paramsJson = JSON.stringify(params);
            const response = await this._callGradio5('export_stl', [code, paramsJson]);

            // Gradio 5.x returns file outputs as objects
            let fileUrl = response[0];
            if (fileUrl && typeof fileUrl === 'object') {
                fileUrl = fileUrl.url || fileUrl.path || null;
                if (fileUrl && !fileUrl.startsWith('http')) {
                    fileUrl = `${this.baseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
                }
            }

            return {
                success: fileUrl !== null,
                fileUrl: fileUrl,
                status: response[1]
            };
        } catch (error) {
            console.error('Export error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get component template
     */
    async getComponentTemplate(componentType, params = {}) {
        try {
            const paramsJson = JSON.stringify(params);
            const response = await this._callGradio5('get_component_template', [componentType, paramsJson]);

            return {
                success: true,
                code: response[0],
                description: response[1]
            };
        } catch (error) {
            console.error('Component template error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Call Gradio 5.x API using queue/join pattern
     */
    async _callGradio5(fnName, args) {
        console.log('=== _callGradio5 START ===');
        console.log('Function name:', fnName);
        console.log('Arguments:', args);

        // Ensure connection is initialized
        await this.checkConnection();
        console.log('Connection check done, isConnected:', this.isConnected);

        // Step 1: Submit to queue
        const submitUrl = `${this.baseUrl}${this.apiPrefix}/queue/join`;
        console.log('Submitting to:', submitUrl);

        const requestBody = {
            data: args,
            fn_index: this._getFnIndex(fnName),
            session_hash: this.sessionHash
        };
        console.log('Request body:', JSON.stringify(requestBody));

        const submitResponse = await fetch(submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Submit response status:', submitResponse.status, submitResponse.statusText);

        if (!submitResponse.ok) {
            console.log('Queue/join failed, falling back to legacy...');
            // Fallback: try the old /api/predict endpoint  
            return await this._callGradioLegacy(fnName, args);
        }

        const submitResult = await submitResponse.json();
        console.log('Submit result:', submitResult);
        const eventId = submitResult.event_id;

        // Step 2: Poll for result using SSE or data endpoint
        const resultUrl = `${this.baseUrl}${this.apiPrefix}/queue/data?session_hash=${this.sessionHash}`;

        // Use EventSource if needed, but fetch usually works for polling if Gradio supports it
        // Note: fetch for SSE needs careful handling. 
        // Gradio 5 usually supports GET /queue/data?session_hash=... which returns an event stream

        const resultResponse = await fetch(resultUrl);

        if (!resultResponse.ok) {
            throw new Error(`Queue data error: ${resultResponse.status}`);
        }

        // Parse SSE response
        const reader = resultResponse.body.getReader();
        const decoder = new TextDecoder();
        let result = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.msg === 'process_completed' && data.output) {
                            result = data.output.data;
                            reader.cancel();
                            break;
                        }
                    } catch (e) {
                        // Continue parsing
                    }
                }
            }

            if (result) break;
        }

        if (!result) {
            throw new Error('No result received from queue');
        }

        this.isConnected = true;
        return result;
    }

    /**
     * Legacy Gradio API call (fallback)
     */
    async _callGradioLegacy(fnName, args) {
        const url = `${this.baseUrl}${this.apiPrefix}/api/predict`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: args,
                fn_index: this._getFnIndex(fnName)
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        this.isConnected = true;

        return result.data;
    }

    /**
     * Get function index from name (maps to button click handlers)
     */
    _getFnIndex(fnName) {
        // These indices correspond to the order of .click() handlers in app.py
        const indexMap = {
            'chat_to_code': 0,       // send_btn.click and msg_input.submit
            'parse_parameters': 2,    // parse_btn.click
            'generate_mesh': 3,       // generate_btn.click
            'export_stl': 4,          // export_btn.click
            'get_component_template': 5, // get_template_btn.click
            'validate_code': 6,       // validate_btn.click
            'auto_fix_code': 7        // fix_btn.click
        };
        return indexMap[fnName] ?? 0;
    }

    /**
     * Check backend connection
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/config`);
            this.isConnected = response.ok;
            return this.isConnected;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Download file from URL
     */
    async downloadFile(url, filename) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Component library data (for offline/fallback use)
const COMPONENT_LIBRARY = {
    fasteners: [
        { id: 'metric_bolt', name: 'Metric Bolt', icon: '🔩' },
        { id: 'hex_bolt', name: 'Hex Bolt', icon: '🔩' },
        { id: 'phillips_bolt', name: 'Phillips Bolt', icon: '🔩' },
        { id: 'metric_nut', name: 'Metric Nut', icon: '🔩' }
    ],
    gears: [
        { id: 'spur_gear', name: 'Spur Gear', icon: '⚙️' },
        { id: 'planetary_gearset', name: 'Planetary Gear', icon: '⚙️' }
    ],
    pulleys: [
        { id: 'gt2_pulley', name: 'GT2 Pulley', icon: '🎡' },
        { id: 'gt3_pulley', name: 'GT3 Pulley', icon: '🎡' }
    ],
    mounts: [
        { id: 'nema17_mount', name: 'NEMA 17 Mount', icon: '🔧' },
        { id: '775_motor_mount', name: '775 Motor Mount', icon: '🔧' }
    ],
    couplings: [
        { id: 'shaft_coupling_d', name: 'D-Shaft Coupling', icon: '🔗' },
        { id: 'shaft_coupling_rigid', name: 'Rigid Coupling', icon: '🔗' },
        { id: 'bearing_housing_608', name: '608 Bearing Housing', icon: '⭕' },
        { id: 'bearing_housing_625', name: '625 Bearing Housing', icon: '⭕' }
    ]
};

// Global API instance
const api = new API();
