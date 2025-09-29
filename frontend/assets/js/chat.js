// EduAssist - Chatbot Functionality

// Authentication check
function checkAuthentication() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(user);
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuthentication();
    if (!user) return;
});

(function() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const contentList = document.getElementById('content-list');
    const sessionInfo = document.getElementById('session-info');
    const newChatBtn = document.getElementById('new-chat');
    const clearChatBtn = document.getElementById('clear-chat');

    let currentSessionId = null;
    let messageCount = 0;
    let selectedContent = null;

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        loadContent();
        setupEventListeners();
    });

    function setupEventListeners() {
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        newChatBtn.addEventListener('click', startNewChat);
        clearChatBtn.addEventListener('click', clearChat);
    }

    // Load available content
    async function loadContent() {
        try {
            const response = await fetch('http://localhost:8000/api/processed-content');
            const data = await response.json();
            const content = data.content || [];
            
            if (content.length === 0) {
                contentList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-file"></i></div>
                        <p>No content available</p>
                        <small>Upload files to start chatting</small>
                    </div>
                `;
                return;
            }

            contentList.innerHTML = content.map(item => `
                <div class="content-item selectable" onclick="selectContent('${item.path}', this)">
                    <div class="content-info">
                        <h4>${item.name}</h4>
                        <p>${(item.size / 1024).toFixed(1)} KB • ${item.type}</p>
                        <small>${new Date(item.processedDate || Date.now()).toLocaleDateString()}</small>
                    </div>
                    <div class="selection-indicator">✓</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    // Send message
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessage('user', message);
        chatInput.value = '';
        
        // Show typing indicator
        const typingId = addTypingIndicator();
        
        try {
            const response = await fetch('http://localhost:8000/api/chatbot/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    message: message,
                    selectedContent: selectedContent
                })
            });

            const result = await response.json();
            
            // Remove typing indicator
            removeTypingIndicator(typingId);
            
            // Add bot response
            if (result.message && result.message.content) {
                addMessage('bot', result.message.content, result.message.sources || [], result.message.suggestions || []);
            } else {
                addMessage('bot', 'Sorry, I encountered an error. Please try again.');
            }
            
            if (!currentSessionId) {
                currentSessionId = result.sessionId;
                // Create a more user-friendly session name
                const sessionNumber = Math.floor(Math.random() * 1000) + 1;
                const sessionDate = new Date().toLocaleDateString();
                sessionInfo.textContent = `Chat Session #${sessionNumber} - ${sessionDate}`;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            removeTypingIndicator(typingId);
            addMessage('bot', 'Sorry, I encountered an error. Please try again.');
        }
    }

    // Add message to chat
    function addMessage(type, content, sources = [], suggestions = []) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        
        const avatar = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        const messageContent = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <p>${content}</p>
                ${sources.length > 0 ? `
                    <div class="message-sources">
                        <h4>Sources:</h4>
                        ${[...new Set(sources.map(source => source.title))].map(filename => `
                            <div class="source-item">
                                <span class="source-filename"><i class="fas fa-file"></i> ${filename}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${suggestions.length > 0 ? `
                    <div class="message-suggestions">
                        ${suggestions.map(suggestion => `
                            <span class="suggestion-tag" onclick="sendSuggestion('${suggestion}')">${suggestion}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        messageEl.innerHTML = messageContent;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Add typing indicator
    function addTypingIndicator() {
        const typingId = 'typing-' + Date.now();
        const typingEl = document.createElement('div');
        typingEl.id = typingId;
        typingEl.className = 'message bot';
        typingEl.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span>AI is thinking</span>
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return typingId;
    }

    // Remove typing indicator
    function removeTypingIndicator(typingId) {
        const typingEl = document.getElementById(typingId);
        if (typingEl) {
            typingEl.remove();
        }
    }

    // Start new chat
    function startNewChat() {
        currentSessionId = null;
        // Generate a new session name
        const sessionNumber = Math.floor(Math.random() * 1000) + 1;
        const sessionDate = new Date().toLocaleDateString();
        sessionInfo.textContent = `New Chat Session #${sessionNumber} - ${sessionDate}`;
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-content">
                    <h3>👋 Welcome to your AI Educational Assistant!</h3>
                    <p>I'm here to help you understand and explore your uploaded content. You can ask me:</p>
                    <ul>
                        <li>📖 "Explain the main concepts in this document"</li>
                        <li>🔍 "What are the key points about [topic]?"</li>
                        <li>❓ "How does [concept] work?"</li>
                        <li><i class="fas fa-file-alt"></i> "Summarize the important information"</li>
                    </ul>
                    <p>Try asking me anything about your uploaded materials!</p>
                </div>
            </div>
        `;
    }

    // Clear chat
    function clearChat() {
        if (confirm('Are you sure you want to clear the chat?')) {
            startNewChat();
        }
    }

    // Select content for chatbot queries
    window.selectContent = function(contentPath, element) {
        // Remove previous selection
        document.querySelectorAll('.content-item.selectable').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        element.classList.add('selected');
        selectedContent = contentPath;
        
        // Show selection feedback
        showMessage(`Selected content for queries: ${element.querySelector('h4').textContent}`, 'info');
    };

    // Send suggestion
    window.sendSuggestion = function(suggestion) {
        chatInput.value = suggestion;
        sendMessage();
    };

    // Clear chat
    window.clearChat = function() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = `
            <div class="message ai-message">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <div style="width: 32px; height: 32px; background: var(--primary-500); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem;"><i class="fas fa-robot"></i></div>
                    <div style="flex: 1;">
                        <div style="background: white; padding: 1rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);">
                            <p style="margin: 0 0 0.75rem 0; font-weight: 500;">Hello! I'm your AI assistant. I can help you with:</p>
                            <ul style="margin: 0; padding-left: 1.5rem; color: var(--neutral-600);">
                                <li><i class="fas fa-file"></i> Summarizing your content</li>
                                <li><i class="fas fa-search"></i> Explaining key concepts</li>
                                <li><i class="fas fa-brain"></i> Creating quizzes</li>
                                <li><i class="fas fa-question-circle"></i> Answering questions</li>
                            </ul>
                            <p style="margin: 0.75rem 0 0 0; color: var(--neutral-600);">What would you like to know?</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Reset selected content
        selectedContent = null;
        document.querySelectorAll('.content-item.selectable').forEach(item => {
            item.classList.remove('selected');
        });
        
        showMessage('Chat cleared! Select content to get specific answers.', 'info');
    };

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Sample query function
    window.sendSampleQuery = function(query) {
        chatInput.value = query;
        sendMessage();
    };
})();
