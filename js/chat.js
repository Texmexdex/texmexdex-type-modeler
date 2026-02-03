/**
 * TeXmExDeX Type Modeler - Chat Interface
 * Handles chat messages and conversation history
 */

class Chat {
    constructor() {
        this.history = [];
        this.container = document.getElementById('chat-messages');
        this.welcomeEl = document.querySelector('.chat-welcome');
        this.inputEl = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('btn-send');

        this._setupEventListeners();
    }

    _setupEventListeners() {
        // Send button
        this.sendBtn.addEventListener('click', () => this._handleSend());

        // Enter to send (Shift+Enter for newline)
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleSend();
            }
        });

        // Quick prompts
        document.querySelectorAll('.quick-prompt').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                this.inputEl.value = prompt;
                this._handleSend();
            });
        });
    }

    async _handleSend() {
        const message = this.inputEl.value.trim();
        if (!message) return;

        // Clear input
        this.inputEl.value = '';

        // Hide welcome message
        if (this.welcomeEl) {
            this.welcomeEl.style.display = 'none';
        }

        // Add user message
        this._addMessage(message, 'user');

        // Show typing indicator
        const typingId = this._showTyping();

        try {
            // Call API
            const currentCode = editor ? editor.getCode() : '';
            const result = await api.chatToCode(message, this.history, currentCode);

            // Remove typing indicator
            this._removeTyping(typingId);

            if (result.success) {
                // Update history
                this.history = result.history || [];

                // Add assistant response
                this._addMessage(result.status, 'assistant');

                // Update code editor
                if (result.code && editor) {
                    editor.setCode(result.code);
                }

                // Trigger mesh generation
                if (result.code) {
                    document.dispatchEvent(new CustomEvent('generateMesh', {
                        detail: { code: result.code }
                    }));
                }
            } else {
                this._addMessage(`Error: ${result.error}`, 'assistant', true);
            }
        } catch (error) {
            this._removeTyping(typingId);
            this._addMessage(`Connection error: ${error.message}`, 'assistant', true);
        }
    }

    _addMessage(text, type, isError = false) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${type}`;
        if (isError) messageEl.classList.add('error');
        messageEl.textContent = text;

        this.container.appendChild(messageEl);
        this._scrollToBottom();
    }

    _showTyping() {
        const id = 'typing-' + Date.now();
        const typingEl = document.createElement('div');
        typingEl.className = 'chat-message assistant typing';
        typingEl.id = id;
        typingEl.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;

        this.container.appendChild(typingEl);
        this._scrollToBottom();

        return id;
    }

    _removeTyping(id) {
        const typingEl = document.getElementById(id);
        if (typingEl) {
            typingEl.remove();
        }
    }

    _scrollToBottom() {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    /**
     * Clear chat history
     */
    clear() {
        this.history = [];
        this.container.innerHTML = '';
        if (this.welcomeEl) {
            this.welcomeEl.style.display = 'block';
        }
    }

    /**
     * Add a system message
     */
    addSystemMessage(text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message system';
        messageEl.textContent = text;

        this.container.appendChild(messageEl);
        this._scrollToBottom();
    }
}

// Add typing animation styles dynamically
const typingStyles = document.createElement('style');
typingStyles.textContent = `
    .chat-message.typing {
        display: flex;
        gap: 4px;
        padding: 16px;
    }
    
    .typing-dot {
        width: 8px;
        height: 8px;
        background: var(--text-muted);
        border-radius: 50%;
        animation: typingBounce 1.4s infinite ease-in-out;
    }
    
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }
    
    .chat-message.error {
        background: var(--accent-error) !important;
        color: white;
    }
    
    .chat-message.system {
        background: var(--bg-elevated);
        color: var(--text-muted);
        text-align: center;
        font-size: 0.75rem;
        padding: 8px;
        margin: 8px 0;
    }
`;
document.head.appendChild(typingStyles);

// Global chat instance
let chat = null;
