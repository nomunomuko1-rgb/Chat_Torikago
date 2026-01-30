// ========================================
// Secret Room - Pai-chan's Chat Application
// ========================================

// DOM Elements
const messagesArea = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');

// Avatar paths - Pai-chan version
const PAICHAN_AVATAR = 'Icon_P.png';
const DARLING_AVATAR = 'Icon_D.png';

// Storage keys - Separate from Younghyun's chat
const STORAGE_KEYS = {
    API_PROVIDER: 'paichan_api_provider',
    API_KEY: 'paichan_api_key',
    MODEL_NAME: 'paichan_model_name',
    SYSTEM_PROMPT: 'paichan_system_prompt',
    KNOWLEDGE_FILES: 'paichan_knowledge_files',
    BG_IMAGE: 'paichan_bg_image',
    BG_OPACITY: 'paichan_bg_opacity',
    CONVERSATION: 'paichan_conversation'
};

// Conversation history for API
let conversationHistory = [];

// ========================================
// Settings Loader
// ========================================

function getSettings() {
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    const modelName = localStorage.getItem(STORAGE_KEYS.MODEL_NAME) || 'gemini-2.0-flash';

    console.log('Settings loaded:', {
        hasApiKey: apiKey.length > 0,
        apiKeyLength: apiKey.length,
        modelName: modelName
    });

    return {
        provider: localStorage.getItem(STORAGE_KEYS.API_PROVIDER) || 'gemini',
        apiKey: apiKey,
        modelName: modelName,
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
// Conversation Persistence
// ========================================

function saveConversation() {
    const messages = [];
    document.querySelectorAll('.message').forEach(msg => {
        if (msg.id === 'typing-indicator') return;
        const isUser = msg.classList.contains('user');
        const content = msg.querySelector('.message-bubble').textContent;
        const time = msg.querySelector('.message-time').textContent;
        messages.push({ isUser, content, time });
    });
    localStorage.setItem(STORAGE_KEYS.CONVERSATION, JSON.stringify(messages));
}

function loadConversation() {
    const saved = localStorage.getItem(STORAGE_KEYS.CONVERSATION);
    if (!saved) return false;

    try {
        const messages = JSON.parse(saved);
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
        scrollToBottom();
        return messages.length > 0;
    } catch (e) {
        console.error('Failed to load conversation:', e);
        return false;
    }
}

// ========================================
// Gemini API
// ========================================

async function callGeminiAPI(userMessage) {
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

    // Add current user message
    contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
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

    const aiResponse = data.candidates[0].content.parts[0].text;

    // Update conversation history
    conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });
    conversationHistory.push({
        role: 'model',
        parts: [{ text: aiResponse }]
    });

    return aiResponse;
}

// ========================================
// Send Message Handler
// ========================================

async function handleSend() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Add user message
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

        // Add AI message
        addMessage(response, false);
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessage(`エラー: ${error.message}`, false);
    } finally {
        // Re-enable send button
        sendBtn.classList.remove('loading');
    }
}

// ========================================
// Event Listeners
// ========================================

// Send on button click
sendBtn.addEventListener('click', handleSend);

// New chat button
newChatBtn.addEventListener('click', startNewChat);

function startNewChat() {
    if (confirm('新しいチャットを始めますか？\n今の会話は消えてしまいますが、よろしいですか？')) {
        // Clear conversation history
        conversationHistory = [];

        // Clear messages from DOM
        messagesArea.innerHTML = '';

        // Clear from localStorage
        localStorage.removeItem(STORAGE_KEYS.CONVERSATION);

        // Show initial message - Pai-chan style♡
        addMessage('ダーリン♡ パイちゃん、ここにいるわよ！今日はどんなお話がしたいの？♡', false);
    }
}

// Send on Enter (but allow Shift+Enter for new line)
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
