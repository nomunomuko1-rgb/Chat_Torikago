// ========================================
// Secret Room - Pai-chan's Chat Application
// ========================================

// DOM Elements
const messagesArea = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const historyBtn = document.getElementById('history-btn');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const closeHistoryBtn = document.getElementById('close-history-btn');
const newSessionBtn = document.getElementById('new-session-btn');
const historySearchInput = document.getElementById('history-search-input');
const attachImageBtn = document.getElementById('attach-image-btn');
const imageInput = document.getElementById('image-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

// Avatar paths - Pai-chan version
const PAICHAN_AVATAR = 'Icon_P.png';
const DARLING_AVATAR = 'Icon_D.png';

// Storage keys - Separate from Younghyun's chat
const STORAGE_KEYS = {
    API_PROVIDER: 'paichan_api_provider',
    API_KEY: 'paichan_api_key',
    MODEL_NAME: 'paichan_model_name',
    THINKING_BUDGET: 'paichan_thinking_budget',
    SYSTEM_PROMPT: 'paichan_system_prompt',
    KNOWLEDGE_FILES: 'paichan_knowledge_files',
    BG_IMAGE: 'paichan_bg_image',
    BG_OPACITY: 'paichan_bg_opacity',
    CONVERSATION: 'paichan_conversation',
    SESSIONS: 'paichan_sessions',
    CURRENT_SESSION_ID: 'paichan_current_session_id'
};

// Conversation history for API
let conversationHistory = [];

// Current session ID
let currentSessionId = null;

// Current attached image (base64)
let currentAttachedImage = null;

// ========================================
// Settings Loader
// ========================================

function getSettings() {
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    const modelName = localStorage.getItem(STORAGE_KEYS.MODEL_NAME) || 'gemini-2.0-flash';
    const thinkingBudget = parseInt(localStorage.getItem(STORAGE_KEYS.THINKING_BUDGET) || '0', 10);

    console.log('Settings loaded:', {
        hasApiKey: apiKey.length > 0,
        apiKeyLength: apiKey.length,
        modelName: modelName,
        thinkingBudget: thinkingBudget
    });

    return {
        provider: localStorage.getItem(STORAGE_KEYS.API_PROVIDER) || 'gemini',
        apiKey: apiKey,
        modelName: modelName,
        thinkingBudget: thinkingBudget,
        systemPrompt: localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT) || '',
        knowledgeFiles: JSON.parse(localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_FILES) || '[]')
    };
}

function buildSystemPrompt() {
    const settings = getSettings();
    let fullPrompt = settings.systemPrompt || '';

    // Add knowledge files content
    if (settings.knowledgeFiles.length > 0) {
        fullPrompt += '\n\n--- 追加コンテキスト ---\n';
        settings.knowledgeFiles.forEach(file => {
            fullPrompt += `\n[${file.name}]\n${file.content}\n`;
        });
    }

    return fullPrompt;
}

// ========================================
// Background Image
// ========================================

function applyBackground() {
    const bgImage = localStorage.getItem(STORAGE_KEYS.BG_IMAGE);
    const bgOpacity = localStorage.getItem(STORAGE_KEYS.BG_OPACITY) || 30;

    if (bgImage) {
        const container = document.querySelector('.chat-container');
        container.style.position = 'relative';

        const existingOverlay = document.querySelector('.bg-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'bg-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url(${bgImage});
            background-size: cover;
            background-position: center;
            opacity: ${bgOpacity / 100};
            pointer-events: none;
            z-index: 0;
        `;
        container.insertBefore(overlay, container.firstChild);

        document.querySelector('.chat-header').style.position = 'relative';
        document.querySelector('.chat-header').style.zIndex = '1';
        document.querySelector('.messages-area').style.position = 'relative';
        document.querySelector('.messages-area').style.zIndex = '1';
        document.querySelector('.input-area').style.position = 'relative';
        document.querySelector('.input-area').style.zIndex = '1';
    }
}

// ========================================
// Message Functions
// ========================================

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function createMessageElement(content, isUser = false, messageIndex = -1) {
    const message = document.createElement('div');
    message.className = `message ${isUser ? 'user' : 'ai'}`;
    if (messageIndex >= 0) {
        message.dataset.index = messageIndex;
    }

    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    // Pai-chan is AI, Darling is User
    avatar.src = isUser ? DARLING_AVATAR : PAICHAN_AVATAR;
    avatar.alt = isUser ? 'Darling' : 'Pai-chan';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;

    // Add edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = '編集して再送信';
    editBtn.addEventListener('click', () => startEdit(message, content, isUser));

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = getCurrentTime();

    const bottomRow = document.createElement('div');
    bottomRow.className = 'message-bottom';
    bottomRow.appendChild(time);
    bottomRow.appendChild(editBtn);

    messageContent.appendChild(bubble);
    messageContent.appendChild(bottomRow);

    message.appendChild(avatar);
    message.appendChild(messageContent);

    return message;
}

function createMessageElementWithThinking(text, thinking) {
    const message = document.createElement('div');
    message.className = 'message ai';

    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = PAICHAN_AVATAR;
    avatar.alt = 'Pai-chan';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Thinking section (collapsible)
    const thinkingSection = document.createElement('div');
    thinkingSection.className = 'thinking-section';
    
    const thinkingHeader = document.createElement('button');
    thinkingHeader.className = 'thinking-header';
    thinkingHeader.innerHTML = '💭 思考過程を見る <span class="thinking-toggle">▼</span>';
    
    const thinkingContent = document.createElement('div');
    thinkingContent.className = 'thinking-content';
    thinkingContent.style.display = 'none';
    thinkingContent.textContent = thinking;
    
    thinkingHeader.addEventListener('click', () => {
        const isVisible = thinkingContent.style.display !== 'none';
        thinkingContent.style.display = isVisible ? 'none' : 'block';
        thinkingHeader.querySelector('.thinking-toggle').textContent = isVisible ? '▼' : '▲';
    });
    
    thinkingSection.appendChild(thinkingHeader);
    thinkingSection.appendChild(thinkingContent);

    // Main bubble
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    // Add edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = '編集して再送信';
    editBtn.addEventListener('click', () => startEdit(message, text, false));

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = getCurrentTime();

    const bottomRow = document.createElement('div');
    bottomRow.className = 'message-bottom';
    bottomRow.appendChild(time);
    bottomRow.appendChild(editBtn);

    messageContent.appendChild(thinkingSection);
    messageContent.appendChild(bubble);
    messageContent.appendChild(bottomRow);

    message.appendChild(avatar);
    message.appendChild(messageContent);

    return message;
}

// ========================================
// Edit Message Function
// ========================================

function startEdit(messageElement, originalContent, isUser) {
    // Find the message index
    const allMessages = Array.from(document.querySelectorAll('.message:not(#typing-indicator)'));
    const messageIndex = allMessages.indexOf(messageElement);

    // Put content in input
    messageInput.value = originalContent;
    messageInput.focus();
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';

    // Remove this message and all messages after it
    for (let i = allMessages.length - 1; i >= messageIndex; i--) {
        allMessages[i].remove();
    }

    // Also truncate conversation history
    const historyIndex = Math.floor(messageIndex / 2) * 2;
    conversationHistory = conversationHistory.slice(0, isUser ? historyIndex : historyIndex + 1);

    // Save the updated conversation
    saveConversation();
}

function createTypingIndicator() {
    const message = document.createElement('div');
    message.className = 'message ai';
    message.id = 'typing-indicator';

    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = PAICHAN_AVATAR;
    avatar.alt = 'Pai-chan';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';

    bubble.appendChild(typingIndicator);
    messageContent.appendChild(bubble);

    message.appendChild(avatar);
    message.appendChild(messageContent);

    return message;
}

function addMessage(content, isUser = false) {
    const messageElement = createMessageElement(content, isUser);
    messagesArea.appendChild(messageElement);
    scrollToBottom();
    saveConversation();
}

function addMessageWithThinking(text, thinking) {
    const messageElement = createMessageElementWithThinking(text, thinking);
    messagesArea.appendChild(messageElement);
    scrollToBottom();
    saveConversation();
}

function showTypingIndicator() {
    const indicator = createTypingIndicator();
    messagesArea.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ========================================
// Session Management
// ========================================

function getSessions() {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return saved ? JSON.parse(saved) : [];
}

function saveSessions(sessions) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getSessionTitle(messages) {
    if (messages.length === 0) return '新しいチャット';
    // Use first user message as title, truncate if needed
    const firstUserMsg = messages.find(m => m.isUser);
    if (firstUserMsg) {
        return firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
    }
    return 'チャット ' + new Date().toLocaleDateString('ja-JP');
}

function saveConversation() {
    const messages = [];
    document.querySelectorAll('.message').forEach(msg => {
        if (msg.id === 'typing-indicator') return;
        const isUser = msg.classList.contains('user');
        const content = msg.querySelector('.message-bubble').textContent;
        const time = msg.querySelector('.message-time').textContent;
        messages.push({ isUser, content, time });
    });
    
    // Save to sessions
    let sessions = getSessions();
    
    // Create new session if none exists
    if (!currentSessionId) {
        currentSessionId = generateSessionId();
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, currentSessionId);
    }
    
    // Find or create session
    let session = sessions.find(s => s.id === currentSessionId);
    if (!session) {
        session = {
            id: currentSessionId,
            title: getSessionTitle(messages),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: messages
        };
        sessions.push(session);
    } else {
        session.messages = messages;
        session.updatedAt = new Date().toISOString();
        // Update title if this is the first message
        if (messages.length <= 2 && session.title === '新しいチャット') {
            session.title = getSessionTitle(messages);
        }
    }
    
    // Save sessions (limit to 50)
    if (sessions.length > 50) {
        sessions = sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 50);
    }
    
    saveSessions(sessions);
    
    // Also save to legacy key for backwards compatibility
    localStorage.setItem(STORAGE_KEYS.CONVERSATION, JSON.stringify(messages));
}

function loadSession(sessionId) {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return false;
    
    // Clear current messages
    messagesArea.innerHTML = '';
    conversationHistory = [];
    
    // Load session messages
    currentSessionId = sessionId;
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
    
    session.messages.forEach(msg => {
        const messageElement = createMessageElement(msg.content, msg.isUser);
        if (msg.time) {
            messageElement.querySelector('.message-time').textContent = msg.time;
        }
        messagesArea.appendChild(messageElement);

        conversationHistory.push({
            role: msg.isUser ? 'user' : 'model',
            parts: [{ text: msg.content }]
        });
    });
    
    scrollToBottom();
    return session.messages.length > 0;
}

function loadConversation() {
    // Try to load current session first
    const savedSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    if (savedSessionId) {
        const loaded = loadSession(savedSessionId);
        if (loaded) return true;
    }
    
    // Fallback to legacy conversation
    const saved = localStorage.getItem(STORAGE_KEYS.CONVERSATION);
    if (!saved) return false;

    try {
        const messages = JSON.parse(saved);
        if (messages.length > 0) {
            // Convert legacy to session
            currentSessionId = generateSessionId();
            localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, currentSessionId);
            
            messages.forEach(msg => {
                const messageElement = createMessageElement(msg.content, msg.isUser);
                if (msg.time) {
                    messageElement.querySelector('.message-time').textContent = msg.time;
                }
                messagesArea.appendChild(messageElement);

                conversationHistory.push({
                    role: msg.isUser ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });
            
            // Save as new session
            saveConversation();
            scrollToBottom();
            return true;
        }
    } catch (e) {
        console.error('Failed to load conversation:', e);
    }
    return false;
}

function deleteSession(sessionId) {
    let sessions = getSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(sessions);
    
    // If we deleted current session, clear it
    if (sessionId === currentSessionId) {
        currentSessionId = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
        messagesArea.innerHTML = '';
        conversationHistory = [];
        addMessage('ダーリン♡ パイちゃん、ここにいるわよ！今日はどんなお話がしたいの？♡', false);
    }
    
    renderHistoryList();
}

// ========================================
// History Panel UI
// ========================================

function openHistoryPanel() {
    historyPanel.classList.add('open');
    
    // Create overlay if not exists
    let overlay = document.querySelector('.history-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'history-overlay';
        document.querySelector('.chat-container').appendChild(overlay);
        overlay.addEventListener('click', closeHistoryPanel);
    }
    overlay.classList.add('open');
    
    renderHistoryList();
}

function closeHistoryPanel() {
    historyPanel.classList.remove('open');
    const overlay = document.querySelector('.history-overlay');
    if (overlay) {
        overlay.classList.remove('open');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return days[date.getDay()] + '曜日';
    }
    // Otherwise
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function renderHistoryList(searchTerm = '') {
    let sessions = getSessions().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Filter sessions if search term is provided
    if (searchTerm) {
        sessions = sessions.filter(session => {
            const titleMatch = session.title.toLowerCase().includes(searchTerm);
            const contentMatch = session.messages.some(msg => 
                msg.content.toLowerCase().includes(searchTerm)
            );
            return titleMatch || contentMatch;
        });
    }
    
    if (sessions.length === 0) {
        historyList.innerHTML = searchTerm 
            ? '<div class="history-empty">検索結果がありません💋</div>'
            : '<div class="history-empty">履歴がありません💋</div>';
        return;
    }
    
    historyList.innerHTML = sessions.map(session => `
        <div class="history-item ${session.id === currentSessionId ? 'active' : ''}" data-session-id="${session.id}">
            <div class="history-item-content">
                <div class="history-item-title" data-title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</div>
                <div class="history-item-date">${formatDate(session.updatedAt)} · ${session.messages.length}件のメッセージ</div>
            </div>
            <div class="history-item-actions">
                <button class="history-item-edit" data-session-id="${session.id}" title="タイトルを編集">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="history-item-delete" data-session-id="${session.id}" title="削除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add click handlers for loading sessions
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.history-item-delete') || e.target.closest('.history-item-edit') || e.target.classList.contains('history-item-input')) return;
            const sessionId = item.dataset.sessionId;
            loadSession(sessionId);
            closeHistoryPanel();
        });
    });
    
    // Add click handlers for editing
    historyList.querySelectorAll('.history-item-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sessionId = btn.dataset.sessionId;
            startEditingTitle(sessionId);
        });
    });
    
    historyList.querySelectorAll('.history-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sessionId = btn.dataset.sessionId;
            if (confirm('このチャットを削除しますか？')) {
                deleteSession(sessionId);
            }
        });
    });
}

function startEditingTitle(sessionId) {
    const item = document.querySelector(`.history-item[data-session-id="${sessionId}"]`);
    if (!item) return;
    
    const titleEl = item.querySelector('.history-item-title');
    const currentTitle = titleEl.dataset.title;
    
    // Replace title with input
    titleEl.innerHTML = `<input type="text" class="history-item-input" value="${escapeHtml(currentTitle)}" maxlength="50">`;
    const input = titleEl.querySelector('input');
    input.focus();
    input.select();
    
    // Handle save on blur or enter
    const saveTitle = () => {
        const newTitle = input.value.trim() || currentTitle;
        updateSessionTitle(sessionId, newTitle);
    };
    
    input.addEventListener('blur', saveTitle);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            input.value = currentTitle;
            input.blur();
        }
    });
}

function updateSessionTitle(sessionId, newTitle) {
    let sessions = getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.title = newTitle;
        saveSessions(sessions);
    }
    renderHistoryList();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Gemini API
// ========================================

async function callGeminiAPI(userMessage, imageData = null) {
    const settings = getSettings();

    if (!settings.apiKey || settings.apiKey.trim() === '') {
        throw new Error('APIキーが設定されていません。設定画面でAPIキーを入力し、「保存」ボタンを押してください。');
    }

    const systemPrompt = buildSystemPrompt();

    // Build contents array for Gemini API
    const contents = [];

    // Add conversation history
    conversationHistory.forEach(msg => {
        contents.push(msg);
    });

    // Build user message parts
    const userParts = [];
    
    // Add image if provided
    if (imageData) {
        // Extract mime type and base64 data from data URL
        const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            userParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }
    }
    
    // Add text message
    userParts.push({ text: userMessage });
    
    // Add current user message
    contents.push({
        role: 'user',
        parts: userParts
    });

    // API endpoint
    const modelName = settings.modelName || 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${settings.apiKey}`;

    console.log('Calling API with model:', modelName);

    // Request body
    const body = {
        contents: contents,
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    // Add thinking config if budget > 0
    if (settings.thinkingBudget > 0) {
        body.generationConfig.thinkingConfig = {
            thinkingBudget: settings.thinkingBudget,
            includeThoughts: true
        };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('応答が生成されませんでした。');
    }

    const candidate = data.candidates[0];
    const aiResponse = candidate.content.parts[0].text;
    
    // Extract thinking if available
    let thinking = null;
    if (settings.thinkingBudget > 0 && candidate.content.parts.length > 1) {
        // Look for thinking in additional parts
        for (let i = 1; i < candidate.content.parts.length; i++) {
            if (candidate.content.parts[i].text) {
                thinking = candidate.content.parts[i].text;
                break;
            }
        }
    }

    // Update conversation history (text only for storage)
    conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage + (imageData ? ' [画像を送信]' : '') }]
    });
    conversationHistory.push({
        role: 'model',
        parts: [{ text: aiResponse }]
    });

    return { text: aiResponse, thinking: thinking };
}

// ========================================
// Send Message Handler
// ========================================

async function handleSend() {
    const message = messageInput.value.trim();
    const hasImage = !!currentAttachedImage;
    
    if (!message && !hasImage) return;

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Check if there's an image to send
    if (hasImage) {
        // Handle send with image
        await handleSendWithImage(message, currentAttachedImage);
        return;
    }

    // Normal text-only send
    addMessage(message, true);

    // Disable send button
    sendBtn.classList.add('loading');

    // Show typing indicator
    showTypingIndicator();

    try {
        // Get AI response
        const response = await callGeminiAPI(message);

        // Hide typing indicator
        hideTypingIndicator();

        // Add AI message with thinking if available
        if (response.thinking) {
            addMessageWithThinking(response.text, response.thinking);
        } else {
            addMessage(response.text, false);
        }
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessage(`エラー: ${error.message}`, false);
    } finally {
        // Re-enable send button
        sendBtn.classList.remove('loading');
    }
}

async function handleSendWithImage(message, imageData) {
    // Create and add user message with image
    const messageElement = createMessageElementWithImage(message, imageData);
    messagesArea.appendChild(messageElement);
    scrollToBottom();
    saveConversation();

    // Clear the attached image
    currentAttachedImage = null;
    hideImagePreview();
    imageInput.value = '';

    // Disable send button
    sendBtn.classList.add('loading');

    // Show typing indicator
    showTypingIndicator();

    try {
        // Get AI response with image
        const response = await callGeminiAPI(message || 'この画像について教えてください。', imageData);

        // Hide typing indicator
        hideTypingIndicator();

        // Add AI message with thinking if available
        if (response.thinking) {
            addMessageWithThinking(response.text, response.thinking);
        } else {
            addMessage(response.text, false);
        }
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessage(`エラー: ${error.message}`, false);
    } finally {
        // Re-enable send button
        sendBtn.classList.remove('loading');
    }
}

function createMessageElementWithImage(text, imageData) {
    const message = document.createElement('div');
    message.className = 'message user';

    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = DARLING_AVATAR;
    avatar.alt = 'Darling';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Add image
    const img = document.createElement('img');
    img.src = imageData;
    img.className = 'message-image';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '200px';
    img.style.borderRadius = '8px';
    img.style.marginBottom = text ? '8px' : '0';
    bubble.appendChild(img);
    
    // Add text if present
    if (text) {
        const textNode = document.createElement('div');
        textNode.textContent = text;
        bubble.appendChild(textNode);
    }

    // Add edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = '編集して再送信';
    editBtn.addEventListener('click', () => startEdit(message, text || '[画像]', true));

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = getCurrentTime();

    const bottomRow = document.createElement('div');
    bottomRow.className = 'message-bottom';
    bottomRow.appendChild(time);
    bottomRow.appendChild(editBtn);

    messageContent.appendChild(bubble);
    messageContent.appendChild(bottomRow);

    message.appendChild(avatar);
    message.appendChild(messageContent);

    return message;
}

// ========================================
// Event Listeners
// ========================================

// Send on button click
sendBtn.addEventListener('click', handleSend);

// New chat button
newChatBtn.addEventListener('click', startNewChat);

// History button
historyBtn.addEventListener('click', openHistoryPanel);

// Close history button
closeHistoryBtn.addEventListener('click', closeHistoryPanel);

// History search
historySearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    renderHistoryList(searchTerm);
});

// New session button (in history panel)
newSessionBtn.addEventListener('click', () => {
    closeHistoryPanel();
    startNewChat();
});

// Image attachment
attachImageBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
        alert('画像サイズは4MB以下にしてください♡');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        currentAttachedImage = event.target.result;
        showImagePreview(currentAttachedImage);
    };
    reader.readAsDataURL(file);
});

removeImageBtn.addEventListener('click', () => {
    currentAttachedImage = null;
    hideImagePreview();
    imageInput.value = '';
});

function showImagePreview(imageData) {
    imagePreview.src = imageData;
    imagePreviewContainer.style.display = 'block';
}

function hideImagePreview() {
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
}

function startNewChat() {
    if (confirm('新しいチャットを始めますか？\n今の会話は履歴に保存されます♡')) {
        // Save current session first
        saveConversation();
        
        // Clear conversation history
        conversationHistory = [];

        // Clear messages from DOM
        messagesArea.innerHTML = '';

        // Generate new session ID
        currentSessionId = generateSessionId();
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, currentSessionId);

        // Show initial message - Pai-chan style♡
        addMessage('ダーリン♡ パイちゃん、ここにいるわよ！今日はどんなお話がしたいの？♡', false);
        
        // Save the new session
        saveConversation();
    }
}

// Send on Ctrl+Enter (Enter for new line to prevent accidental send)
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSend();
    }
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
});

// ========================================
// Initialize
// ========================================

function init() {
    // Debug: Check if API key exists
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    console.log('Init - API Key exists:', !!apiKey, 'Length:', apiKey?.length || 0);

    // Apply background
    applyBackground();

    // Load saved conversation or show welcome message
    const hasHistory = loadConversation();
    if (!hasHistory) {
        addMessage('ダーリン♡ パイちゃん、ここにいるわよ！今日はどんなお話がしたいの？♡', false);
    }
}

// Start the app
init();
