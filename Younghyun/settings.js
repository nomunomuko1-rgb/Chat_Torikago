// ========================================
// Settings Page JavaScript
// ========================================

// DOM Elements
const saveBtn = document.getElementById('save-settings');
const apiProvider = document.getElementById('api-provider');
const apiKey = document.getElementById('api-key');
const toggleApiKey = document.getElementById('toggle-api-key');
const modelName = document.getElementById('model-name');
const systemPrompt = document.getElementById('system-prompt');
const loadPromptFile = document.getElementById('load-prompt-file');
const promptFileInput = document.getElementById('prompt-file-input');
const addKnowledgeFile = document.getElementById('add-knowledge-file');
const knowledgeFileInput = document.getElementById('knowledge-file-input');
const knowledgeFilesList = document.getElementById('knowledge-files');
const selectBgImage = document.getElementById('select-bg-image');
const clearBgImage = document.getElementById('clear-bg-image');
const bgImageInput = document.getElementById('bg-image-input');
const bgPreview = document.getElementById('bg-preview');
const bgOpacity = document.getElementById('bg-opacity');
const opacityValue = document.getElementById('opacity-value');
const exportHistory = document.getElementById('export-history');
const importHistory = document.getElementById('import-history');
const clearHistory = document.getElementById('clear-history');
const historyFileInput = document.getElementById('history-file-input');

// Storage keys
const STORAGE_KEYS = {
    API_PROVIDER: 'torikago_api_provider',
    API_KEY: 'torikago_api_key',
    MODEL_NAME: 'torikago_model_name',
    SYSTEM_PROMPT: 'torikago_system_prompt',
    KNOWLEDGE_FILES: 'torikago_knowledge_files',
    BG_IMAGE: 'torikago_bg_image',
    BG_OPACITY: 'torikago_bg_opacity',
    CONVERSATION: 'torikago_conversation'
};

// Knowledge files storage
let knowledgeFiles = [];

// ========================================
// Toast Notification
// ========================================

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// Load Settings
// ========================================

function loadSettings() {
    // API Settings
    const savedProvider = localStorage.getItem(STORAGE_KEYS.API_PROVIDER);
    if (savedProvider) apiProvider.value = savedProvider;

    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (savedApiKey) apiKey.value = savedApiKey;

    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL_NAME);
    if (savedModel) modelName.value = savedModel;

    // System Prompt
    const savedPrompt = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    if (savedPrompt) systemPrompt.value = savedPrompt;

    // Knowledge Files
    const savedFiles = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_FILES);
    if (savedFiles) {
        knowledgeFiles = JSON.parse(savedFiles);
        renderKnowledgeFiles();
    }

    // Background
    const savedBgImage = localStorage.getItem(STORAGE_KEYS.BG_IMAGE);
    if (savedBgImage) {
        bgPreview.style.backgroundImage = `url(${savedBgImage})`;
        bgPreview.classList.add('has-image');
    }

    const savedOpacity = localStorage.getItem(STORAGE_KEYS.BG_OPACITY);
    if (savedOpacity) {
        bgOpacity.value = savedOpacity;
        opacityValue.textContent = savedOpacity;
    }
}

// ========================================
// Save Settings
// ========================================

function saveSettings() {
    // Debug: Check what we're saving
    console.log('=== SAVE SETTINGS ===');
    console.log('API Key element:', apiKey);
    console.log('API Key value:', apiKey.value);
    console.log('API Key value length:', apiKey.value.length);

    try {
        localStorage.setItem(STORAGE_KEYS.API_PROVIDER, apiProvider.value);
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.value);
        localStorage.setItem(STORAGE_KEYS.MODEL_NAME, modelName.value);
        localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, systemPrompt.value);
        localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_FILES, JSON.stringify(knowledgeFiles));
        localStorage.setItem(STORAGE_KEYS.BG_OPACITY, bgOpacity.value);

        // Verify save
        const savedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        console.log('Saved API Key length:', savedKey?.length || 0);
        console.log('Save successful!');

        showToast('設定を保存しました');
    } catch (error) {
        console.error('Save error:', error);
        showToast('保存に失敗しました: ' + error.message, 'error');
    }
}

// ========================================
// API Key Visibility Toggle
// ========================================

toggleApiKey.addEventListener('click', () => {
    const type = apiKey.type === 'password' ? 'text' : 'password';
    apiKey.type = type;
});

// ========================================
// System Prompt File Loading
// ========================================

loadPromptFile.addEventListener('click', () => {
    promptFileInput.click();
});

promptFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        systemPrompt.value = event.target.result;
        showToast(`${file.name} を読み込みました`);
    };
    reader.readAsText(file);
});

// ========================================
// Knowledge Files
// ========================================

function renderKnowledgeFiles() {
    if (knowledgeFiles.length === 0) {
        knowledgeFilesList.innerHTML = '<div class="empty-files">ファイルが追加されていません</div>';
        return;
    }

    knowledgeFilesList.innerHTML = knowledgeFiles.map((file, index) => `
        <div class="file-item">
            <span class="file-item-name">📄 ${file.name}</span>
            <button class="file-item-remove" data-index="${index}">✕</button>
        </div>
    `).join('');

    // Add remove listeners
    knowledgeFilesList.querySelectorAll('.file-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            knowledgeFiles.splice(index, 1);
            renderKnowledgeFiles();
        });
    });
}

addKnowledgeFile.addEventListener('click', () => {
    knowledgeFileInput.click();
});

knowledgeFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            knowledgeFiles.push({
                name: file.name,
                content: event.target.result
            });
            renderKnowledgeFiles();
        };
        reader.readAsText(file);
    });

    showToast(`${files.length}件のファイルを追加しました`);
});

// ========================================
// Background Image
// ========================================

selectBgImage.addEventListener('click', () => {
    bgImageInput.click();
});

bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target.result;
        bgPreview.style.backgroundImage = `url(${dataUrl})`;
        bgPreview.classList.add('has-image');
        localStorage.setItem(STORAGE_KEYS.BG_IMAGE, dataUrl);
        showToast('背景画像を設定しました');
    };
    reader.readAsDataURL(file);
});

clearBgImage.addEventListener('click', () => {
    bgPreview.style.backgroundImage = '';
    bgPreview.classList.remove('has-image');
    localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    showToast('背景画像をクリアしました');
});

bgOpacity.addEventListener('input', () => {
    opacityValue.textContent = bgOpacity.value;
});

// ========================================
// Conversation History
// ========================================

exportHistory.addEventListener('click', () => {
    const history = localStorage.getItem(STORAGE_KEYS.CONVERSATION);
    if (!history) {
        showToast('エクスポートする履歴がありません', 'error');
        return;
    }

    const blob = new Blob([history], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `torikago_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('履歴をエクスポートしました');
});

importHistory.addEventListener('click', () => {
    historyFileInput.click();
});

historyFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            JSON.parse(event.target.result); // Validate JSON
            localStorage.setItem(STORAGE_KEYS.CONVERSATION, event.target.result);
            showToast('履歴をインポートしました');
        } catch {
            showToast('無効なファイル形式です', 'error');
        }
    };
    reader.readAsText(file);
});

clearHistory.addEventListener('click', () => {
    if (confirm('会話履歴を削除しますか？この操作は取り消せません。')) {
        localStorage.removeItem(STORAGE_KEYS.CONVERSATION);
        showToast('履歴をクリアしました');
    }
});

// ========================================
// Save Button
// ========================================

saveBtn.addEventListener('click', saveSettings);

// ========================================
// Initialize
// ========================================

loadSettings();
