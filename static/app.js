// Core app state
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');
const modelEl = document.getElementById('model');
const systemEl = document.getElementById('system');
const clearBtn = document.getElementById('clear');
const exportBtn = document.getElementById('export');
const sessionsEl = document.getElementById('sessions');
const statusEl = document.getElementById('status');
const newChatBtn = document.getElementById('newChat');

const STORAGE_KEY = 'chat_sessions_v1';
const VOTES_KEY = 'model_votes_v1';
const PROMPTS_KEY = 'saved_prompts_v1';
let sessions = [];
let currentSessionId = null;
let abortController = null;
let requestTimeout = null;
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes for multiple models
let uploadedFiles = []; // Array of uploaded files for current conversation
let previousModels = []; // Store previous model selection for "back to comparison"

// Markdown renderer - simple and safe
function renderMarkdown(text) {
  if (!text) return '';
  let html = text;
  
  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks (``` ... ```)
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.slice(3, -3).trim();
    return '<pre><code>' + code + '</code></pre>';
  });
  
  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold (**...** or __...__) 
  html = html.replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  
  // Italic (*...* or _..._)
  html = html.replace(/\*([^\*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// Storage functions
function loadSessions(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    sessions = raw ? JSON.parse(raw) : [];
  } catch(e) {
    console.error('localStorage error:', e);
    sessions = [];
  }
}

function saveSessions(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch(e) {
    console.error('localStorage save error:', e);
  }
}

function makeId(){
  return Math.random().toString(36).slice(2, 10);
}

// Theme management
function initTheme(){
  const savedTheme = localStorage.getItem('theme-preference') || 'light-mode';
  applyTheme(savedTheme);
}

function applyTheme(theme){
  const html = document.documentElement;
  html.className = theme;
  const themeBtn = document.getElementById('themeToggle');
  if(themeBtn){
    themeBtn.textContent = theme === 'dark-mode' ? '☀️' : '🌙';
  }
  localStorage.setItem('theme-preference', theme);
}

function toggleTheme(){
  const html = document.documentElement;
  const currentTheme = html.className || 'light-mode';
  const newTheme = currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
  applyTheme(newTheme);
}

// ========== FEATURE UTILITIES ==========

// Feature 1: Copy to clipboard
async function copyToClipboard(text, buttonEl){
  try {
    await navigator.clipboard.writeText(text);
    const originalHTML = buttonEl.innerHTML;
    buttonEl.innerHTML = '✓ Copied!';
    buttonEl.style.color = 'var(--success)';
    setTimeout(() => {
      buttonEl.innerHTML = originalHTML;
      buttonEl.style.color = '';
    }, 2000);
  } catch(err) {
    showHelperText('⚠️ Failed to copy to clipboard');
    setTimeout(hideHelperText, 3000);
  }
}

// Feature 2: Continue with single model
function continueWithModel(modelName){
  // Store previous selection
  previousModels = Array.from(modelEl.selectedOptions).map(o => o.value);
  
  // Select only this model
  Array.from(modelEl.options).forEach(opt => {
    opt.selected = opt.value === modelName;
  });
  updateModelBadge();
  
  // Save to session
  if(currentSessionId) {
    const s = sessions.find(x => x.id === currentSessionId);
    if(s) {
      s.models = [modelName];
      s.previousModels = previousModels;
      s.updatedAt = Date.now();
      saveSessions();
    }
  }
  
  // Show banner
  showSingleModelBanner(modelName);
  showHelperText(`✓ Now chatting with ${modelName} only`);
  setTimeout(hideHelperText, 3000);
}

function showSingleModelBanner(modelName){
  let banner = document.getElementById('singleModelBanner');
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'singleModelBanner';
    banner.className = 'single-model-banner';
    const mainArea = document.querySelector('.main-area');
    if(mainArea) mainArea.insertBefore(banner, mainArea.firstChild);
  }
  banner.innerHTML = `
    <span>ℹ️ Single model mode: <strong>${modelName}</strong></span>
    <button onclick="backToComparisonMode()" class="btn btn-sm btn-outline-primary">← Back to Comparison Mode</button>
  `;
  banner.style.display = 'flex';
}

function hideSingleModelBanner(){
  const banner = document.getElementById('singleModelBanner');
  if(banner) banner.style.display = 'none';
}

window.backToComparisonMode = function(){
  const s = sessions.find(x => x.id === currentSessionId);
  if(s && s.previousModels && s.previousModels.length > 0){
    Array.from(modelEl.options).forEach(opt => {
      opt.selected = s.previousModels.includes(opt.value);
    });
    updateModelBadge();
    s.models = s.previousModels;
    s.updatedAt = Date.now();
    saveSessions();
    hideSingleModelBanner();
    showHelperText('✓ Switched back to comparison mode');
    setTimeout(hideHelperText, 3000);
  }
};

// Feature 3: Regenerate response
async function regenerateResponse(modelName, originalPrompt, bubbleId){
  const s = sessions.find(x => x.id === currentSessionId);
  if(!s) return;
  
  const bubble = document.getElementById(bubbleId);
  if(!bubble) return;
  
  // Store previous response
  const previousContent = bubble.textContent || bubble.innerHTML;
  
  // Show loading
  bubble.innerHTML = '<span class="loading-spinner">⏳</span> Regenerating...';
  
  const currentSystem = s.system || systemEl.value;
  
  const payload = {
    message: originalPrompt,
    history: s.history.filter(h => h.role === 'system' || h.role === 'user'),
    system: currentSystem,
    model: modelName
  };
  
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    if(!res.ok) throw new Error('Regeneration failed');
    
    const data = await res.json();
    const newResponse = data.assistant || 'No response';
    
    bubble.innerHTML = renderMarkdown(newResponse);
    
    // Update metrics if available
    const metricsId = bubbleId.replace('bubble-', 'metrics-');
    const metricsDiv = document.getElementById(metricsId);
    if(metricsDiv && data.metrics){
      const tps = data.metrics.tokens_per_sec || 0;
      metricsDiv.textContent = data.metrics.tokens + ' tok • ' + data.metrics.duration.toFixed(2) + 's • ' + tps.toFixed(1) + ' t/s [Regenerated]';
      metricsDiv.style.display = 'block';
      metricsDiv.style.opacity = '1';
    }
    
    showHelperText('✓ Response regenerated');
    setTimeout(hideHelperText, 2000);
  } catch(err) {
    bubble.innerHTML = 'Error regenerating: ' + err.message;
    showHelperText('⚠️ Failed to regenerate response');
    setTimeout(hideHelperText, 3000);
  }
}

// Feature 4: Voting system
function loadVotes(){
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) {
    return {};
  }
}

function saveVote(sessionId, messageId, modelName, vote){
  const votes = loadVotes();
  const key = `${sessionId}-${messageId}-${modelName}`;
  votes[key] = {sessionId, messageId, modelName, vote, timestamp: Date.now()};
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

function getVote(sessionId, messageId, modelName){
  const votes = loadVotes();
  const key = `${sessionId}-${messageId}-${modelName}`;
  return votes[key]?.vote || null;
}

function getModelVoteStats(modelName){
  const votes = loadVotes();
  let upCount = 0, downCount = 0;
  Object.values(votes).forEach(v => {
    if(v.modelName === modelName){
      if(v.vote === 'up') upCount++;
      if(v.vote === 'down') downCount++;
    }
  });
  return {upCount, downCount};
}

function handleVote(sessionId, messageId, modelName, voteType, buttonEl){
  const currentVote = getVote(sessionId, messageId, modelName);
  const newVote = currentVote === voteType ? null : voteType;
  saveVote(sessionId, messageId, modelName, newVote);
  
  // Update UI
  const container = buttonEl.closest('.vote-container');
  if(container){
    const upBtn = container.querySelector('.vote-up');
    const downBtn = container.querySelector('.vote-down');
    if(upBtn && downBtn){
      upBtn.classList.toggle('voted', newVote === 'up');
      downBtn.classList.toggle('voted', newVote === 'down');
    }
  }
  
  // Show feedback
  const stats = getModelVoteStats(modelName);
  const total = stats.upCount + stats.downCount;
  if(total > 0){
    showHelperText(`✓ You've liked this model ${stats.upCount} times`);
    setTimeout(hideHelperText, 2000);
  }
}

// Feature 5: Prompt library
function loadPrompts(){
  try {
    const raw = localStorage.getItem(PROMPTS_KEY);
    if(raw) return JSON.parse(raw);
    
    // Default prompts
    return [
      {id: '1', name: 'Explain like I\'m 5', prompt: 'Explain this like I\'m 5 years old:', category: 'Quick'},
      {id: '2', name: 'Summarize in bullets', prompt: 'Summarize this in 3 bullet points:', category: 'Quick'},
      {id: '3', name: 'Write Python code', prompt: 'Write Python code to', category: 'Code'},
      {id: '4', name: 'Find bugs', prompt: 'Find bugs in this code:', category: 'Code'},
      {id: '5', name: 'Translate to Spanish', prompt: 'Translate this to Spanish:', category: 'Quick'}
    ];
  } catch(e) {
    return [];
  }
}

function savePrompts(prompts){
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

function saveCurrentPrompt(){
  const currentText = inputEl.value.trim();
  if(!currentText) {
    showHelperText('⚠️ No text to save');
    setTimeout(hideHelperText, 2000);
    return;
  }
  
  const name = prompt('Enter a name for this prompt:', currentText.slice(0, 30) + '...');
  if(!name) return;
  
  const prompts = loadPrompts();
  const newPrompt = {
    id: Date.now().toString(),
    name: name,
    prompt: currentText,
    category: 'Custom',
    createdAt: Date.now()
  };
  prompts.push(newPrompt);
  savePrompts(prompts);
  
  showHelperText('✓ Prompt saved');
  setTimeout(hideHelperText, 2000);
  renderPromptDropdown();
}

function loadPromptIntoInput(prompt){
  inputEl.value = prompt;
  inputEl.focus();
  const dropdown = document.getElementById('promptDropdown');
  if(dropdown) dropdown.style.display = 'none';
}

function renderPromptDropdown(){
  let dropdown = document.getElementById('promptDropdown');
  if(!dropdown){
    dropdown = document.createElement('div');
    dropdown.id = 'promptDropdown';
    dropdown.className = 'prompt-dropdown';
    const inputArea = document.querySelector('.input-area');
    if(inputArea) inputArea.insertBefore(dropdown, inputArea.firstChild);
  }
  
  const prompts = loadPrompts();
  const categories = [...new Set(prompts.map(p => p.category))];
  
  let html = '<div class="prompt-dropdown-header">📚 Saved Prompts</div>';
  
  categories.forEach(cat => {
    const catPrompts = prompts.filter(p => p.category === cat);
    if(catPrompts.length > 0){
      html += `<div class="prompt-category">${cat}</div>`;
      catPrompts.forEach(p => {
        html += `<div class="prompt-item" onclick="loadPromptIntoInput('${p.prompt.replace(/'/g, "\\'")}')">
          <span>${p.name}</span>
        </div>`;
      });
    }
  });
  
  html += '<div class="prompt-dropdown-footer"><button onclick="managePrompts()" class="btn btn-sm btn-outline-secondary">⚙️ Manage Prompts</button></div>';
  
  dropdown.innerHTML = html;
}

window.managePrompts = function(){
  showConfirmDialog(
    'Clear all custom prompts? (Default prompts will remain)',
    () => {
      const prompts = loadPrompts().filter(p => p.category !== 'Custom');
      savePrompts(prompts);
      renderPromptDropdown();
      showHelperText('✓ Custom prompts cleared');
      setTimeout(hideHelperText, 2000);
    }
  );
};

// Feature 6: File upload
function handleFileUpload(file){
  if(!file) return;
  
  // Check file size
  const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if(file.size > maxSize){
    showHelperText(`⚠️ File too large. Max ${maxSize / 1024 / 1024}MB`);
    setTimeout(hideHelperText, 3000);
    return;
  }
  
  const fileId = 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const fileObj = {
    id: fileId,
    name: file.name,
    type: file.type,
    size: file.size,
    content: null
  };
  
  const reader = new FileReader();
  
  if(file.type.startsWith('image/')){
    reader.onload = (e) => {
      fileObj.content = e.target.result;
      uploadedFiles.push(fileObj);
      renderFilesList();
      showHelperText(`✓ File "${file.name}" attached`);
      setTimeout(hideHelperText, 2000);
    };
    reader.readAsDataURL(file);
  } else {
    reader.onload = (e) => {
      fileObj.content = e.target.result;
      uploadedFiles.push(fileObj);
      renderFilesList();
      showHelperText(`✓ File "${file.name}" attached`);
      setTimeout(hideHelperText, 2000);
    };
    reader.readAsText(file);
  }
  
  // Clear the input so the same file can be selected again
  const fileInput = document.getElementById('fileInput');
  if(fileInput) fileInput.value = '';
}

function renderFilesList(){
  let container = document.getElementById('filesListContainer');
  if(!container){
    container = document.createElement('div');
    container.id = 'filesListContainer';
    container.className = 'files-list-container';
    const inputWrapper = document.querySelector('.input-wrapper');
    if(inputWrapper) inputWrapper.parentNode.insertBefore(container, inputWrapper);
  }
  
  if(uploadedFiles.length === 0){
    container.style.display = 'none';
    return;
  }
  
  const isCollapsed = container.classList.contains('collapsed');
  
  container.style.display = 'block';
  let html = `
    <div class="files-list-header" onclick="toggleFilesList()">
      <span>📎 Attached Files (${uploadedFiles.length})</span>
      <span class="collapse-icon">${isCollapsed ? '▼' : '▲'}</span>
    </div>
  `;
  
  if(!isCollapsed) {
    html += '<div class="files-list-items">';
    
    uploadedFiles.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      const fileIcon = file.type.startsWith('image/') ? '🖼️' : '📄';
      html += `
        <div class="file-item" id="${file.id}">
          <span class="file-icon">${fileIcon}</span>
          <span class="file-name" title="${file.name}">${file.name}</span>
          <span class="file-size">${sizeKB} KB</span>
          <button class="file-remove-btn" onclick="event.stopPropagation(); removeFile('${file.id}')" title="Remove file">✕</button>
        </div>
      `;
    });
    
    html += '</div>';
    html += '<button class="clear-all-files-btn" onclick="clearAllFiles()" title="Clear all files">Clear All</button>';
  }
  
  container.innerHTML = html;
}

window.toggleFilesList = function(){
  const container = document.getElementById('filesListContainer');
  if(!container) return;
  container.classList.toggle('collapsed');
  renderFilesList();
};

window.removeFile = function(fileId){
  uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
  renderFilesList();
  showHelperText('✓ File removed');
  setTimeout(hideHelperText, 2000);
};

window.clearAllFiles = function(){
  if(uploadedFiles.length === 0) return;
  showConfirmDialog(
    `Remove all ${uploadedFiles.length} attached files?`,
    () => {
      uploadedFiles = [];
      renderFilesList();
      showHelperText('✓ All files cleared');
      setTimeout(hideHelperText, 2000);
    }
  );
};

// Feature 7: Custom confirmation dialog
function showConfirmDialog(message, onConfirm, onCancel) {
  let modal = document.getElementById('confirmModal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'confirm-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="confirm-modal-content">
      <div class="confirm-modal-header">
        <h3>⚠️ Confirm Action</h3>
      </div>
      <div class="confirm-modal-body">
        <p>${message}</p>
      </div>
      <div class="confirm-modal-footer">
        <button id="confirmCancel" class="btn btn-outline-secondary">Cancel</button>
        <button id="confirmOk" class="btn btn-danger">Confirm</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
  
  document.getElementById('confirmOk').onclick = () => {
    modal.style.display = 'none';
    if(onConfirm) onConfirm();
  };
  
  document.getElementById('confirmCancel').onclick = () => {
    modal.style.display = 'none';
    if(onCancel) onCancel();
  };
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if(e.target === modal) {
      modal.style.display = 'none';
      if(onCancel) onCancel();
    }
  };
  
  // Close on Escape
  const escapeHandler = (e) => {
    if(e.key === 'Escape') {
      modal.style.display = 'none';
      if(onCancel) onCancel();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Feature 8: Ollama Model Manager
let availableOllamaModels = [];
let installedModels = [];

async function openModelManager() {
  let modal = document.getElementById('modelManagerModal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'modelManagerModal';
    modal.className = 'model-manager-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="model-manager-content">
      <div class="model-manager-header">
        <h2>🤖 Ollama Model Manager</h2>
        <button onclick="closeModelManager()" class="close-btn">✕</button>
      </div>
      <div class="model-manager-body">
        <div class="model-manager-tabs">
          <button class="tab-btn active" onclick="switchModelTab('installed')">Installed Models</button>
          <button class="tab-btn" onclick="switchModelTab('available')">Available Models</button>
        </div>
        <div id="installedModelsTab" class="tab-content active">
          <div class="loading-state">Loading installed models...</div>
        </div>
        <div id="availableModelsTab" class="tab-content">
          <div class="model-search">
            <input type="text" id="modelSearchInput" placeholder="Search models..." onkeyup="filterAvailableModels()" />
          </div>
          <div class="loading-state">Loading available models...</div>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
  
  // Load installed models
  await loadInstalledModels();
  
  // Load available models
  await loadAvailableModels();
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if(e.target === modal) closeModelManager();
  };
}

window.closeModelManager = function() {
  const modal = document.getElementById('modelManagerModal');
  if(modal) modal.style.display = 'none';
  // Reload model dropdown
  loadModels();
};

window.switchModelTab = function(tab) {
  const tabs = document.querySelectorAll('.model-manager-tabs .tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(t => t.classList.remove('active'));
  contents.forEach(c => c.classList.remove('active'));
  
  if(tab === 'installed') {
    tabs[0].classList.add('active');
    document.getElementById('installedModelsTab').classList.add('active');
  } else {
    tabs[1].classList.add('active');
    document.getElementById('availableModelsTab').classList.add('active');
  }
};

async function loadInstalledModels() {
  const container = document.getElementById('installedModelsTab');
  if(!container) return;
  
  try {
    const response = await fetch('/api/models');
    const data = await response.json();
    installedModels = data.models || [];
    
    if(installedModels.length === 0) {
      container.innerHTML = '<div class="empty-state">No models installed. Browse available models to download.</div>';
      return;
    }
    
    let html = '<div class="models-grid">';
    installedModels.forEach(model => {
      html += `
        <div class="model-card installed">
          <div class="model-card-header">
            <h4>✅ ${model}</h4>
          </div>
          <div class="model-card-actions">
            <button class="btn btn-sm btn-danger" onclick="deleteModel('${model}')" title="Delete model">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch(err) {
    container.innerHTML = '<div class="error-state">❌ Failed to load installed models: ' + err.message + '</div>';
  }
}

async function loadAvailableModels() {
  const container = document.getElementById('availableModelsTab');
  if(!container) return;
  
  // Comprehensive list of popular Ollama models
  availableOllamaModels = [
    // Llama family
    {name: 'llama3.2:1b', description: 'Meta Llama 3.2 1B - Fast and efficient', size: '1.3 GB'},
    {name: 'llama3.2:3b', description: 'Meta Llama 3.2 3B - Balanced performance', size: '2.0 GB'},
    {name: 'llama3.3:70b', description: 'Meta Llama 3.3 70B - Most capable', size: '40 GB'},
    {name: 'llama3.1:8b', description: 'Meta Llama 3.1 8B - Great all-rounder', size: '4.7 GB'},
    {name: 'llama3.1:70b', description: 'Meta Llama 3.1 70B - Very capable', size: '40 GB'},
    {name: 'llama2:7b', description: 'Meta Llama 2 7B - Previous generation', size: '3.8 GB'},
    {name: 'llama2:13b', description: 'Meta Llama 2 13B - More capable', size: '7.4 GB'},
    
    // Qwen family
    {name: 'qwen2.5:0.5b', description: 'Qwen 2.5 0.5B - Ultra fast', size: '0.4 GB'},
    {name: 'qwen2.5:1.5b', description: 'Qwen 2.5 1.5B - Very fast', size: '1.0 GB'},
    {name: 'qwen2.5:3b', description: 'Qwen 2.5 3B - Great for coding', size: '1.9 GB'},
    {name: 'qwen2.5:7b', description: 'Qwen 2.5 7B - Balanced', size: '4.7 GB'},
    {name: 'qwen2.5:14b', description: 'Qwen 2.5 14B - Strong performance', size: '9.0 GB'},
    {name: 'qwen2.5:32b', description: 'Qwen 2.5 32B - Very capable', size: '19 GB'},
    {name: 'qwen2.5:72b', description: 'Qwen 2.5 72B - Top tier', size: '41 GB'},
    {name: 'qwen2.5-coder:7b', description: 'Qwen 2.5 Coder 7B - Specialized coding', size: '4.7 GB'},
    
    // Microsoft Phi family
    {name: 'phi3:mini', description: 'Microsoft Phi-3 Mini - Compact 3.8B', size: '2.3 GB'},
    {name: 'phi3:medium', description: 'Microsoft Phi-3 Medium 14B', size: '7.9 GB'},
    {name: 'phi3.5:latest', description: 'Microsoft Phi-3.5 - Latest version', size: '2.2 GB'},
    {name: 'phi4:latest', description: 'Microsoft Phi-4 14B - Newest model', size: '8.5 GB'},
    
    // Google Gemma family
    {name: 'gemma2:2b', description: 'Google Gemma 2 2B - Fast', size: '1.6 GB'},
    {name: 'gemma2:9b', description: 'Google Gemma 2 9B - Capable', size: '5.5 GB'},
    {name: 'gemma2:27b', description: 'Google Gemma 2 27B - Very capable', size: '16 GB'},
    {name: 'gemma:7b', description: 'Google Gemma 7B - First generation', size: '5.0 GB'},
    
    // Mistral family
    {name: 'ministral-3:3b', description: 'Mistral 3B - Small and efficient', size: '1.8 GB'},
    {name: 'mistral:7b', description: 'Mistral 7B - Great all-rounder', size: '4.1 GB'},
    {name: 'mistral-small:latest', description: 'Mistral Small 22B - Strong model', size: '13 GB'},
    {name: 'mistral-large:latest', description: 'Mistral Large 123B - Flagship', size: '69 GB'},
    {name: 'mixtral:8x7b', description: 'Mixtral 8x7B MoE - Very capable', size: '26 GB'},
    {name: 'mixtral:8x22b', description: 'Mixtral 8x22B MoE - Top tier', size: '80 GB'},
    
    // DeepSeek family
    {name: 'deepseek-r1:1.5b', description: 'DeepSeek-R1 1.5B - Reasoning model', size: '1.1 GB'},
    {name: 'deepseek-r1:7b', description: 'DeepSeek-R1 7B - Strong reasoning', size: '4.7 GB'},
    {name: 'deepseek-r1:8b', description: 'DeepSeek-R1 8B - Best reasoning', size: '4.9 GB'},
    {name: 'deepseek-r1:14b', description: 'DeepSeek-R1 14B - Advanced reasoning', size: '9.0 GB'},
    {name: 'deepseek-r1:32b', description: 'DeepSeek-R1 32B - Very strong', size: '19 GB'},
    {name: 'deepseek-r1:70b', description: 'DeepSeek-R1 70B - Top reasoning', size: '40 GB'},
    {name: 'deepseek-coder:6.7b', description: 'DeepSeek Coder 6.7B - Coding expert', size: '3.8 GB'},
    {name: 'deepseek-v3:latest', description: 'DeepSeek-V3 - Latest generation', size: '127 GB'},
    
    // Code Llama
    {name: 'codellama:7b', description: 'Code Llama 7B - Coding specialist', size: '3.8 GB'},
    {name: 'codellama:13b', description: 'Code Llama 13B - Advanced coding', size: '7.4 GB'},
    {name: 'codellama:34b', description: 'Code Llama 34B - Expert coding', size: '19 GB'},
    {name: 'codellama:70b', description: 'Code Llama 70B - Top tier coding', size: '39 GB'},
    
    // Vision models
    {name: 'llava:7b', description: 'LLaVA 7B - Vision + Language', size: '4.7 GB'},
    {name: 'llava:13b', description: 'LLaVA 13B - Advanced vision', size: '8.0 GB'},
    {name: 'llava:34b', description: 'LLaVA 34B - Expert vision', size: '20 GB'},
    {name: 'llava-phi3:latest', description: 'LLaVA-Phi3 - Compact vision model', size: '2.9 GB'},
    {name: 'bakllava:latest', description: 'BakLLaVA - Vision model', size: '4.7 GB'},
    
    // Other popular models
    {name: 'orca2:latest', description: 'Microsoft Orca 2 - Reasoning model', size: '3.8 GB'},
    {name: 'neural-chat:latest', description: 'Intel Neural Chat 7B', size: '4.1 GB'},
    {name: 'starling-lm:latest', description: 'Starling LM 7B - RLHF trained', size: '4.1 GB'},
    {name: 'openchat:latest', description: 'OpenChat 7B - Fine-tuned', size: '4.1 GB'},
    {name: 'solar:latest', description: 'Solar 10.7B - Upstage model', size: '6.1 GB'},
    {name: 'yi:6b', description: 'Yi 6B - Chinese + English', size: '3.5 GB'},
    {name: 'yi:34b', description: 'Yi 34B - Large bilingual model', size: '19 GB'},
    {name: 'command-r:35b', description: 'Cohere Command R 35B - RAG optimized', size: '20 GB'},
    {name: 'command-r-plus:104b', description: 'Cohere Command R+ 104B - Top tier', size: '59 GB'},
    
    // Embedding models
    {name: 'nomic-embed-text', description: 'Text embeddings model', size: '274 MB'},
    {name: 'mxbai-embed-large', description: 'Large embedding model', size: '669 MB'},
    {name: 'all-minilm', description: 'Small embedding model', size: '23 MB'},
  ];
  
  renderAvailableModels(availableOllamaModels);
}

function renderAvailableModels(models, includeSearch = true) {
  const container = document.getElementById('availableModelsTab');
  if(!container) return;
  
  // Clear loading state
  const loadingState = container.querySelector('.loading-state');
  if(loadingState) {
    loadingState.remove();
  }
  
  // Only render search input if it doesn't exist or if explicitly requested
  let searchInput = document.getElementById('modelSearchInput');
  if(includeSearch && !searchInput) {
    const searchHtml = `
      <div class="model-search">
        <input type="text" id="modelSearchInput" placeholder="🔍 Search models..." onkeyup="filterAvailableModels()" />
      </div>
    `;
    container.insertAdjacentHTML('afterbegin', searchHtml);
  }
  
  // Remove existing grid if present
  let existingGrid = container.querySelector('.models-grid');
  if(existingGrid) {
    existingGrid.remove();
  }
  
  let html = '<div class="models-grid">';
  models.forEach(model => {
    const isInstalled = installedModels.includes(model.name);
    html += `
      <div class="model-card ${isInstalled ? 'installed' : 'available'}">
        <div class="model-card-header">
          <h4>${isInstalled ? '✅' : '📦'} ${model.name}</h4>
          <span class="model-size">${model.size}</span>
        </div>
        <p class="model-description">${model.description}</p>
        <div class="model-card-actions">
          ${isInstalled 
            ? '<span class="installed-badge">Installed</span>' 
            : `<button class="btn btn-sm btn-primary" onclick="downloadModel('${model.name}')" title="Download model">⬇️ Download</button>`
          }
        </div>
        <div id="progress-${model.name.replace(/[^a-z0-9]/gi, '')}" class="download-progress" style="display:none;">
          <div class="progress-bar"></div>
          <span class="progress-text">Downloading...</span>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.insertAdjacentHTML('beforeend', html);
}

window.filterAvailableModels = function() {
  const searchInput = document.getElementById('modelSearchInput');
  if(!searchInput) return;
  
  const query = searchInput.value.toLowerCase();
  const filtered = availableOllamaModels.filter(m => 
    m.name.toLowerCase().includes(query) || 
    m.description.toLowerCase().includes(query)
  );
  
  renderAvailableModels(filtered, false); // Don't re-render search input
};

window.downloadModel = async function(modelName) {
  const safeId = modelName.replace(/[^a-z0-9]/gi, '');
  const progressDiv = document.getElementById(`progress-${safeId}`);
  const button = event.target;
  
  if(progressDiv) progressDiv.style.display = 'block';
  if(button) button.disabled = true;
  
  try {
    const response = await fetch('/api/pull_model', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({model: modelName})
    });
    
    if(!response.ok) throw new Error('Failed to start download');
    
    // Poll for completion
    let attempts = 0;
    const checkInterval = setInterval(async () => {
      attempts++;
      if(attempts > 120) { // 2 minutes timeout
        clearInterval(checkInterval);
        if(progressDiv) {
          progressDiv.innerHTML = '<span class="error-text">⚠️ Download timeout. Check Ollama logs.</span>';
        }
        return;
      }
      
      const modelsResponse = await fetch('/api/models');
      const data = await modelsResponse.json();
      
      if(data.models && data.models.includes(modelName)) {
        clearInterval(checkInterval);
        if(progressDiv) {
          progressDiv.innerHTML = '<span class="success-text">✅ Downloaded successfully!</span>';
        }
        showHelperText(`✅ ${modelName} downloaded successfully!`);
        setTimeout(hideHelperText, 3000);
        
        // Reload installed models
        await loadInstalledModels();
        await loadAvailableModels();
      }
    }, 1000);
    
  } catch(err) {
    if(progressDiv) {
      progressDiv.innerHTML = '<span class="error-text">❌ ' + err.message + '</span>';
    }
    showHelperText('⚠️ Failed to download model');
    setTimeout(hideHelperText, 3000);
  }
};

window.deleteModel = function(modelName) {
  showConfirmDialog(
    `Are you sure you want to delete the model "${modelName}"? This cannot be undone.`,
    async () => {
      try {
        const response = await fetch('/api/delete_model', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({model: modelName})
        });
        
        if(!response.ok) throw new Error('Failed to delete model');
        
        showHelperText(`✅ ${modelName} deleted successfully!`);
        setTimeout(hideHelperText, 3000);
        
        // Reload models
        await loadInstalledModels();
        await loadAvailableModels();
      } catch(err) {
        showHelperText('⚠️ Failed to delete model: ' + err.message);
        setTimeout(hideHelperText, 3000);
      }
    }
  );
};

// Session management
function createSession(){
  const DEFAULT_SYSTEM = 'You are a sharp teacher like Richard Feynman.';
  
  const s = {
    id: makeId(),
    title: 'New Chat',
    history: [{role: 'system', content: DEFAULT_SYSTEM}],
    draft: '',
    system: DEFAULT_SYSTEM,
    models: [],
    updatedAt: Date.now(),
    autoNamed: false
  };
  sessions.unshift(s);
  currentSessionId = s.id;
  
  // Reset UI to defaults - no model selected
  systemEl.value = DEFAULT_SYSTEM;
  Array.from(modelEl.options).forEach(opt => {
    opt.selected = false;
  });
  updateModelBadge();
  inputEl.value = '';
  hideHelperText();
  
  // Clear uploaded files for new session
  uploadedFiles = [];
  renderFilesList();
  
  saveSessions();
  renderSessionsList();
  renderMessages();
}

function selectSession(id){
  const s = sessions.find(x => x.id === id);
  if(!s) return;
  persistDraft();
  currentSessionId = id;
  
  // Restore system prompt
  systemEl.value = s.system || 'You are a sharp teacher like Richard Feynman.';
  
  // Restore model selection
  const savedModels = s.models || [];
  Array.from(modelEl.options).forEach(opt => {
    opt.selected = savedModels.includes(opt.value);
  });
  updateModelBadge();
  
  // Clear uploaded files when switching sessions
  uploadedFiles = [];
  renderFilesList();
  
  renderSessionsList();
  renderMessages();
}

function deleteSession(id){
  showConfirmDialog(
    'Delete this conversation? This cannot be undone.',
    () => {
      const idx = sessions.findIndex(x => x.id === id);
      if(idx === -1) return;
      sessions.splice(idx, 1);
      if(sessions.length === 0) createSession();
      else {
        currentSessionId = sessions[0].id;
      }
      saveSessions();
      renderSessionsList();
      renderMessages();
    }
  );
}

function persistDraft(){
  if(!currentSessionId) return;
  const s = sessions.find(x => x.id === currentSessionId);
  if(!s) return;
  s.draft = inputEl.value;
  s.system = systemEl.value;
  s.models = Array.from(modelEl.selectedOptions).map(o => o.value) || [];
  s.updatedAt = Date.now();
  saveSessions();
}

// UI Rendering
function renderSessionsList(){
  sessionsEl.innerHTML = '';
  sessions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'session-item';
    if(s.id === currentSessionId) item.classList.add('active');
    
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.gap = '0.5rem';
    titleContainer.style.flexGrow = '1';
    
    const title = document.createElement('span');
    title.textContent = s.title || 'New Chat';
    title.style.cursor = 'pointer';
    title.style.flexGrow = '1';
    title.className = 'session-title';
    title.dataset.sessionId = s.id;
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-outline-secondary session-edit-btn';
    editBtn.textContent = '✎';
    editBtn.style.padding = '0.25rem 0.5rem';
    editBtn.style.fontSize = '0.75rem';
    editBtn.title = 'Rename conversation';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineEdit(s.id, title);
    });
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-outline-danger';
    delBtn.textContent = '✕';
    delBtn.style.padding = '0.25rem 0.5rem';
    delBtn.style.fontSize = '0.75rem';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(s.id);
    });
    
    title.addEventListener('click', () => selectSession(s.id));
    titleContainer.appendChild(title);
    titleContainer.appendChild(editBtn);
    
    item.appendChild(titleContainer);
    item.appendChild(delBtn);
    sessionsEl.appendChild(item);
  });
}

function startInlineEdit(id, titleElement){
  const s = sessions.find(x => x.id === id);
  if(!s) return;
  
  const currentText = s.title || 'New Chat';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.className = 'session-title-edit';
  input.style.flexGrow = '1';
  input.style.padding = '0.25rem';
  input.style.border = '2px solid var(--primary)';
  input.style.borderRadius = '4px';
  input.style.background = 'var(--bg-primary)';
  input.style.color = 'var(--text-primary)';
  
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '✓';
  confirmBtn.className = 'btn btn-sm btn-outline-primary';
  confirmBtn.style.padding = '0.25rem 0.5rem';
  confirmBtn.style.fontSize = '0.75rem';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕';
  cancelBtn.className = 'btn btn-sm btn-outline-secondary';
  cancelBtn.style.padding = '0.25rem 0.5rem';
  cancelBtn.style.fontSize = '0.75rem';
  
  const saveEdit = () => {
    const newName = input.value.trim();
    if(newName){
      s.title = newName;
      s.updatedAt = Date.now();
      saveSessions();
    }
    renderSessionsList();
  };
  
  const cancelEdit = () => {
    renderSessionsList();
  };
  
  confirmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    saveEdit();
  });
  
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cancelEdit();
  });
  
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if(e.key === 'Enter') saveEdit();
    if(e.key === 'Escape') cancelEdit();
  });
  
  const container = titleElement.parentElement;
  container.innerHTML = '';
  container.appendChild(input);
  container.appendChild(confirmBtn);
  container.appendChild(cancelBtn);
  
  input.focus();
  input.select();
}

function autoNameSession(sessionId, userMessage){
  const s = sessions.find(x => x.id === sessionId);
  if(!s || s.autoNamed || s.title !== 'New Chat') return;
  
  const shortName = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
  s.title = shortName;
  s.autoNamed = true;
  s.updatedAt = Date.now();
  saveSessions();
  renderSessionsList();
}

function showHelperText(message){
  let helper = document.getElementById('helperText');
  if(!helper){
    helper = document.createElement('div');
    helper.id = 'helperText';
    helper.className = 'helper-text';
    const inputArea = document.querySelector('.input-area');
    if(inputArea) inputArea.insertBefore(helper, inputArea.firstChild);
  }
  helper.textContent = message;
  helper.style.display = 'block';
}

function hideHelperText(){
  const helper = document.getElementById('helperText');
  if(helper) helper.style.display = 'none';
}

function renderMessages(){
  const s = sessions.find(x => x.id === currentSessionId);
  if(!s) return;
  
  // Clear all messages
  messagesEl.innerHTML = '';
  
  // Group assistant messages by timestamp to detect arena responses
  let i = 0;
  while(i < (s.history || []).length) {
    const m = s.history[i];
    
    if(m.role === 'user') {
      // Render user message
      append('user', m.content || '');
      i++;
    } else if(m.role === 'assistant') {
      // Check if this is part of an arena group (multiple models with same timestamp)
      const currentTime = m.timestamp || i;
      const arenaGroup = [];
      
      // Collect all consecutive assistant messages with model field
      while(i < s.history.length && s.history[i].role === 'assistant' && s.history[i].model) {
        arenaGroup.push(s.history[i]);
        i++;
      }
      
      // If we found multiple models, render as arena
      if(arenaGroup.length > 1) {
        const arenaContainer = document.createElement('div');
        arenaContainer.className = 'arena-container';
        
        arenaGroup.forEach((resp, idx) => {
          const col = document.createElement('div');
          col.className = 'arena-col';
          
          const hdr = document.createElement('div');
          hdr.className = 'arena-hdr';
          hdr.textContent = resp.model;
          col.appendChild(hdr);
          
          const metricsDiv = document.createElement('div');
          metricsDiv.className = 'arena-metrics';
          if(resp.metrics) {
            const tps = resp.metrics.tokens_per_sec || 0;
            metricsDiv.textContent = resp.metrics.tokens + ' tok • ' + resp.metrics.duration.toFixed(2) + 's • ' + tps.toFixed(1) + ' t/s';
            metricsDiv.style.display = 'block';
          } else {
            metricsDiv.style.display = 'none';
          }
          col.appendChild(metricsDiv);
          
          const respDiv = document.createElement('div');
          respDiv.className = 'arena-response';
          
          const bubble = document.createElement('div');
          bubble.className = 'bubble';
          bubble.innerHTML = renderMarkdown(resp.content || '');
          respDiv.appendChild(bubble);
          col.appendChild(respDiv);
          
          arenaContainer.appendChild(col);
        });
        
        messagesEl.appendChild(arenaContainer);
      } else if(arenaGroup.length === 1) {
        // Single assistant in what we thought was arena, render normally
        const resp = arenaGroup[0];
        append('assistant', resp.content || '', resp.model, resp.metrics);
      } else {
        // No model field, render as single response
        if(m && m.role === 'assistant') {
          append('assistant', m.content || '', m.model, m.metrics);
          i++;
        }
      }
    } else {
      i++;
    }
  }
  
  inputEl.value = s.draft || '';
}

function append(role, text, modelName = null, metrics = null){
  const d = document.createElement('div');
  d.className = 'msg ' + (role === 'user' ? 'user' : 'assistant');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const uniqueId = 'bubble-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  bubble.id = uniqueId;
  
  if(role === 'assistant') {
    bubble.innerHTML = renderMarkdown(text);
    
    // Add action buttons for assistant responses
    const actionBar = document.createElement('div');
    actionBar.className = 'response-actions';
    actionBar.style.marginTop = '0.5rem';
    actionBar.style.display = 'flex';
    actionBar.style.gap = '0.5rem';
    actionBar.style.flexWrap = 'wrap';
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.title = 'Copy response';
    copyBtn.onclick = function() {
      copyToClipboard(document.getElementById(uniqueId).textContent, this);
    };
    actionBar.appendChild(copyBtn);
    
    // Regenerate button (only if we have the model name)
    if(modelName) {
      const regenBtn = document.createElement('button');
      regenBtn.className = 'action-btn';
      regenBtn.innerHTML = '🔄 Regen';
      regenBtn.title = 'Regenerate response';
      regenBtn.onclick = function() {
        const s = sessions.find(x => x.id === currentSessionId);
        if(s && s.history.length > 0) {
          // Find the last user message
          for(let i = s.history.length - 1; i >= 0; i--) {
            if(s.history[i].role === 'user') {
              regenerateResponse(modelName, s.history[i].content, uniqueId);
              break;
            }
          }
        }
      };
      actionBar.appendChild(regenBtn);
    }
    
    // Vote buttons
    const messageId = uniqueId;
    const currentVote = modelName ? getVote(currentSessionId, messageId, modelName) : null;
    
    const voteUpBtn = document.createElement('button');
    voteUpBtn.className = 'vote-btn vote-up' + (currentVote === 'up' ? ' voted' : '');
    voteUpBtn.innerHTML = '👍';
    voteUpBtn.title = 'Like this response';
    voteUpBtn.onclick = function() {
      handleVote(currentSessionId, messageId, modelName || 'default', 'up', this);
    };
    actionBar.appendChild(voteUpBtn);
    
    const voteDownBtn = document.createElement('button');
    voteDownBtn.className = 'vote-btn vote-down' + (currentVote === 'down' ? ' voted' : '');
    voteDownBtn.innerHTML = '👎';
    voteDownBtn.title = 'Dislike this response';
    voteDownBtn.onclick = function() {
      handleVote(currentSessionId, messageId, modelName || 'default', 'down', this);
    };
    actionBar.appendChild(voteDownBtn);
    
    d.appendChild(bubble);
    d.appendChild(actionBar);
    
    // Add metrics if available
    if(metrics) {
      const metricsDiv = document.createElement('div');
      metricsDiv.className = 'response-metrics';
      metricsDiv.style.fontSize = '0.85em';
      metricsDiv.style.opacity = '0.7';
      metricsDiv.style.marginTop = '0.25rem';
      const tps = metrics.tokens_per_sec || 0;
      metricsDiv.textContent = '📊 ' + metrics.tokens + ' tok • ' + metrics.duration.toFixed(2) + 's • ' + tps.toFixed(1) + ' t/s';
      d.appendChild(metricsDiv);
    }
  } else {
    bubble.textContent = text;
    d.appendChild(bubble);
  }
  
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Chat
async function send(){
  const msg = inputEl.value.trim();
  if(!msg) return;
  
  const s = sessions.find(x => x.id === currentSessionId);
  if(!s) {
    createSession();
    return;
  }
  
  // Auto-name session based on first message
  if(!s.autoNamed && s.title === 'New Chat') {
    autoNameSession(s.id, msg);
  }
  
  // Get selected models FIRST
  const selected = Array.from(modelEl.selectedOptions).map(o => o.value);
  if(selected.length === 0) {
    showHelperText('⚠️ Please select at least one model before sending');
    setTimeout(hideHelperText, 3000);
    return;
  }
  
  // Append user message after model check passes
  s.history.push({role: 'user', content: msg});
  append('user', msg);
  
  // Add file content if uploaded
  let finalMessage = msg;
  if(uploadedFiles.length > 0){
    finalMessage += '\n\n--- Attached Files ---';
    uploadedFiles.forEach(file => {
      if(file.type.startsWith('image/')){
        finalMessage += `\n[Image: ${file.name}]\nBase64: ${file.content}`;
      } else {
        finalMessage += `\n\nFile: ${file.name}\n\`\`\`\n${file.content}\n\`\`\``;
      }
    });
    // Note: Files remain attached for the conversation, user can manually remove them
  }
  
  inputEl.value = '';
  s.draft = '';
  const models = selected;
  
  // Ensure system prompt is current in the session history
  // Use s.system (the session's saved system prompt) not systemEl.value (current UI)
  // This prevents overwriting when switching tabs while response is pending
  const currentSystem = s.system || systemEl.value;
  if(s.history.length === 0 || s.history[0].role !== 'system') {
    s.history.unshift({role: 'system', content: currentSystem});
  } else if(s.history[0].content !== currentSystem) {
    s.history[0].content = currentSystem;
  }
  s.system = currentSystem;
  
  // Setup abort controller
  abortController = new AbortController();
  
  // Change button to Stop
  sendBtn.disabled = false;
  sendBtn.textContent = 'Stop';
  sendBtn.classList.add('btn-stop');
  sendBtn.dataset.mode = 'stop';
  
  // Show helper text
  if(models.length > 1) {
    showHelperText('⏳ Generating responses... This may take a moment with multiple models');
  } else {
    showHelperText('⏳ Generating response...');
  }
  
  // Setup timeout
  requestTimeout = setTimeout(() => {
    if(abortController) {
      abortController.abort();
      showHelperText('⚠️ Request timed out after 90 seconds');
      setTimeout(hideHelperText, 5000);
    }
  }, REQUEST_TIMEOUT_MS);
  
  const streamMode = document.getElementById('streamMode') && document.getElementById('streamMode').checked;
  
  try {
    // Determine if arena mode (multiple models) or single
    const isArena = models.length > 1;
    
    const payload = {
      message: finalMessage,
      history: s.history,
      system: currentSystem
    };
    
    if(isArena) {
      payload.models = models;
    } else {
      payload.model = models[0];
    }
    
    // Create arena container if multiple models
    let arenaContainer = null;
    let metricsMap = {};
    let bubbleIds = {}; // Map model name to unique bubble ID
    
    if(isArena){
      const containerTimestamp = Date.now() + Math.random(); // Unique identifier for this message
      arenaContainer = document.createElement('div');
      arenaContainer.className = 'arena-container';
      messagesEl.appendChild(arenaContainer);
      
      models.forEach((m, idx) => {
        const col = document.createElement('div');
        col.className = 'arena-col';
        const uniqueSuffix = containerTimestamp + '-' + m.replace(/[^a-z0-9]/gi, '');
        col.id = 'col-' + uniqueSuffix;
        
        const hdr = document.createElement('div');
        hdr.className = 'arena-hdr';
        hdr.innerHTML = `
          <span class="arena-model-name">${m}</span>
          <div class="arena-actions">
            <button class="arena-btn" onclick="copyToClipboard(document.getElementById('bubble-${uniqueSuffix}').textContent, this)" title="Copy response">
              📋 Copy
            </button>
            <button class="arena-btn" onclick="continueWithModel('${m}')" title="Use only this model">
              ⚡ Use
            </button>
            <button class="arena-btn" onclick="regenerateResponse('${m}', '${msg.replace(/'/g, "\\'")}', 'bubble-${uniqueSuffix}')" title="Regenerate response">
              🔄 Regen
            </button>
          </div>
        `;
        hdr.id = 'hdr-' + uniqueSuffix;
        col.appendChild(hdr);
        
        const metricsDiv = document.createElement('div');
        metricsDiv.className = 'arena-metrics';
        metricsDiv.id = 'metrics-' + uniqueSuffix;
        metricsDiv.style.display = 'none';
        col.appendChild(metricsDiv);
        
        const respDiv = document.createElement('div');
        respDiv.className = 'arena-response';
        respDiv.id = 'resp-' + uniqueSuffix;
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = '<span class="loading-spinner">⏳</span> Generating...';
        bubble.id = 'bubble-' + uniqueSuffix;
        bubbleIds[m] = 'bubble-' + uniqueSuffix;
        respDiv.appendChild(bubble);
        col.appendChild(respDiv);
        
        // Add voting buttons
        const voteDiv = document.createElement('div');
        voteDiv.className = 'vote-container';
        const messageId = 'msg-' + uniqueSuffix;
        const currentVote = getVote(currentSessionId, messageId, m);
        voteDiv.innerHTML = `
          <button class="vote-btn vote-up ${currentVote === 'up' ? 'voted' : ''}" onclick="handleVote('${currentSessionId}', '${messageId}', '${m}', 'up', this)" title="Like this response">
            👍
          </button>
          <button class="vote-btn vote-down ${currentVote === 'down' ? 'voted' : ''}" onclick="handleVote('${currentSessionId}', '${messageId}', '${m}', 'down', this)" title="Dislike this response">
            👎
          </button>
        `;
        col.appendChild(voteDiv);
        
        arenaContainer.appendChild(col);
        metricsMap[m] = {tokens: 0, startTime: null, firstTokenTime: null, fullText: '', metrics: null};
      });
    }
    
    if(streamMode && isArena){
      // Streaming arena mode
      const resp = await fetch('/api/stream_chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        signal: abortController.signal
      });
      
      if(!resp.ok) throw new Error('Stream error: ' + resp.status);
      
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while(true){
        const {value, done} = await reader.read();
        if(done) break;
        
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];
        
        for(let i = 0; i < lines.length - 1; i++){
          const line = lines[i].trim();
          if(!line) continue;
          
          try {
            const obj = JSON.parse(line);
            const m = obj.model;
            const safe_m = m.replace(/[^a-z0-9]/gi, '');
            
            if(obj.type === 'token'){
              if(!metricsMap[m].startTime) {
                metricsMap[m].startTime = performance.now();
                // Show metrics placeholder immediately on first token
                const metricsId = bubbleIds[m] ? bubbleIds[m].replace('bubble-', 'metrics-') : null;
                const metricsDiv = metricsId ? document.getElementById(metricsId) : null;
                if(metricsDiv) {
                  metricsDiv.innerHTML = '<span class="loading-spinner">⏱️</span> Calculating metrics...';
                  metricsDiv.style.display = 'block';
                  metricsDiv.style.opacity = '0.6';
                }
              }
              if(!metricsMap[m].firstTokenTime) metricsMap[m].firstTokenTime = performance.now();
              
              metricsMap[m].fullText += obj.token || '';
              metricsMap[m].tokens += (obj.token || '').split(/\s+/).filter(Boolean).length;
              
              const bubbleId = bubbleIds[m];
              const bubble = document.getElementById(bubbleId);
              if(bubble) {
                bubble.innerHTML = renderMarkdown(metricsMap[m].fullText);
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
            }
            else if(obj.type === 'metrics'){
              const metricsId = bubbleIds[m] ? bubbleIds[m].replace('bubble-', 'metrics-') : null;
              const metricsDiv = metricsId ? document.getElementById(metricsId) : null;
              if(metricsDiv && obj.metrics){
                const ftt = obj.metrics.first_token_time || 0;
                const tps = obj.metrics.tokens_per_sec || 0;
                metricsDiv.textContent = obj.metrics.tokens + ' tok • ' + ftt.toFixed(2) + 's 1st • ' + tps.toFixed(1) + ' t/s';
                metricsDiv.style.display = 'block';
                metricsDiv.style.opacity = '1';
              }
              // Store metrics in metricsMap for history
              if(metricsMap[m]) {
                metricsMap[m].metrics = obj.metrics;
              }
            }
            else if(obj.type === 'error'){
              const bubbleId = bubbleIds[m];
              const bubble = document.getElementById(bubbleId);
              if(bubble) bubble.textContent = 'Error: ' + obj.error;
            }
          } catch(e) {}
        }
      }
      
      // Save to history with metrics
      models.forEach(m => {
        s.history.push({role: 'assistant', content: metricsMap[m].fullText, model: m, metrics: metricsMap[m].metrics});
      });
    }
    else if(streamMode){
      // Streaming single model mode
      const resp = await fetch('/api/stream_chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        signal: abortController.signal
      });
      
      if(!resp.ok) throw new Error('Stream error: ' + resp.status);
      
      let fullText = '';
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      // Create a new assistant message div for streaming
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'msg assistant';
      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'bubble';
      assistantBubble.textContent = '';
      assistantMsg.appendChild(assistantBubble);
      messagesEl.appendChild(assistantMsg);
      
      while(true){
        const {value, done} = await reader.read();
        if(done) break;
        
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];
        
        for(let i = 0; i < lines.length - 1; i++){
          const line = lines[i].trim();
          if(!line) continue;
          
          try {
            const obj = JSON.parse(line);
            if(obj.type === 'token'){
              fullText += obj.token || '';
              assistantBubble.innerHTML = renderMarkdown(fullText);
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          } catch(e) {}
        }
      }
      
      // After streaming completes, add action buttons
      const modelName = models[0];
      const uniqueId = 'bubble-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      assistantBubble.id = uniqueId;
      
      // Add action buttons
      const actionBar = document.createElement('div');
      actionBar.className = 'response-actions';
      actionBar.style.marginTop = '0.5rem';
      actionBar.style.display = 'flex';
      actionBar.style.gap = '0.5rem';
      actionBar.style.flexWrap = 'wrap';
      
      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-btn';
      copyBtn.innerHTML = '📋 Copy';
      copyBtn.title = 'Copy response';
      copyBtn.onclick = function() {
        copyToClipboard(document.getElementById(uniqueId).textContent, this);
      };
      actionBar.appendChild(copyBtn);
      
      // Regenerate button
      const regenBtn = document.createElement('button');
      regenBtn.className = 'action-btn';
      regenBtn.innerHTML = '🔄 Regen';
      regenBtn.title = 'Regenerate response';
      regenBtn.onclick = function() {
        regenerateResponse(modelName, msg, uniqueId);
      };
      actionBar.appendChild(regenBtn);
      
      // Vote buttons
      const messageId = uniqueId;
      const currentVote = getVote(currentSessionId, messageId, modelName);
      
      const voteUpBtn = document.createElement('button');
      voteUpBtn.className = 'vote-btn vote-up' + (currentVote === 'up' ? ' voted' : '');
      voteUpBtn.innerHTML = '👍';
      voteUpBtn.title = 'Like this response';
      voteUpBtn.onclick = function() {
        handleVote(currentSessionId, messageId, modelName, 'up', this);
      };
      actionBar.appendChild(voteUpBtn);
      
      const voteDownBtn = document.createElement('button');
      voteDownBtn.className = 'vote-btn vote-down' + (currentVote === 'down' ? ' voted' : '');
      voteDownBtn.innerHTML = '👎';
      voteDownBtn.title = 'Dislike this response';
      voteDownBtn.onclick = function() {
        handleVote(currentSessionId, messageId, modelName, 'down', this);
      };
      actionBar.appendChild(voteDownBtn);
      
      assistantMsg.appendChild(actionBar);
      
      s.history.push({role: 'assistant', content: fullText, model: modelName});
    }
    else {
      // Non-streaming mode (current implementation)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        signal: abortController.signal
      });
      
      if(!res.ok){
        append('assistant', 'Error: ' + res.status);
      } else {
        const data = await res.json();
        if(data.error){
          append('assistant', 'Error: ' + data.error);
        } else if(data.results){
          // Arena mode: multiple model responses
          models.forEach((m, idx) => {
            const respText = data.results[m] ? data.results[m].assistant : 'Error: ' + (data.errors && data.errors[m] || 'no response');
            const metrics = data.results[m] ? data.results[m].metrics : null;
            const bubbleId = bubbleIds[m];
            const bubble = document.getElementById(bubbleId);
            if(bubble) {
              bubble.innerHTML = renderMarkdown(respText);
            }
            
            // Display metrics immediately if available
            const metricsId = bubbleId.replace('bubble-', 'metrics-');
            const metricsDiv = document.getElementById(metricsId);
            if(metricsDiv) {
              if(metrics) {
                const tps = metrics.tokens_per_sec || 0;
                metricsDiv.textContent = metrics.tokens + ' tok • ' + metrics.duration.toFixed(2) + 's • ' + tps.toFixed(1) + ' t/s';
                metricsDiv.style.display = 'block';
                metricsDiv.style.opacity = '1';
              } else {
                // Show calculating if no metrics yet
                metricsDiv.innerHTML = '<span class="loading-spinner">⏱️</span> Calculating metrics...';
                metricsDiv.style.display = 'block';
                metricsDiv.style.opacity = '0.6';
              }
            }
            
            // Store with metrics in history
            s.history.push({role: 'assistant', content: respText, model: m, metrics: metrics});
          });
        } else {
          // Single model response
          const assistant = data.assistant || '(no response)';
          const modelName = models[0]; // Single model name
          append('assistant', assistant, modelName, data.metrics);
          if(data.history) s.history = data.history;
          else {
            // Store with metrics and model name if available
            s.history.push({role: 'assistant', content: assistant, model: modelName, metrics: data.metrics});
          }
        }
      }
    }
    
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch(err){
    if(err.name === 'AbortError') {
      // Clear any 'Generating...' bubbles in all modes
      // Method 1: Use bubbleIds if available (arena mode)
      if(bubbleIds && Object.keys(bubbleIds).length > 0) {
        Object.values(bubbleIds).forEach(bubbleId => {
          const bubble = document.getElementById(bubbleId);
          if(bubble) {
            // Check if it has generating text or spinner
            const hasGenerating = bubble.innerHTML.includes('Generating') || 
                                  bubble.innerHTML.includes('⏳') ||
                                  bubble.innerHTML.includes('loading-spinner');
            if(hasGenerating) {
              bubble.innerHTML = '⛔ Generation stopped by user';
              bubble.style.fontStyle = 'italic';
              bubble.style.opacity = '0.7';
            }
          }
        });
      } else {
        // Method 2: Find all bubbles with generating text (single mode or fallback)
        const allBubbles = document.querySelectorAll('.bubble');
        let foundGenerating = false;
        allBubbles.forEach(bubble => {
          const hasGenerating = bubble.innerHTML.includes('Generating') || 
                                bubble.innerHTML.includes('⏳') ||
                                bubble.innerHTML.includes('loading-spinner');
          if(hasGenerating) {
            bubble.innerHTML = '⛔ Generation stopped by user';
            bubble.style.fontStyle = 'italic';
            bubble.style.opacity = '0.7';
            foundGenerating = true;
          }
        });
        
        // If no generating bubbles found, add stopped message
        if(!foundGenerating) {
          append('assistant', '⛔ Generation stopped by user');
        }
      }
      showHelperText('Generation cancelled');
      setTimeout(hideHelperText, 3000);
    } else {
      append('assistant', 'Error: ' + err.message);
      showHelperText('⚠️ Error: ' + err.message);
      setTimeout(hideHelperText, 5000);
    }
  } finally {
    // Clear timeout
    if(requestTimeout) {
      clearTimeout(requestTimeout);
      requestTimeout = null;
    }
    
    // Reset button
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    sendBtn.classList.remove('btn-stop');
    sendBtn.dataset.mode = 'send';
    
    // Hide helper text after a delay
    setTimeout(hideHelperText, 2000);
    
    abortController = null;
    s.updatedAt = Date.now();
    saveSessions();
  }
}

// Stop function for cancel button
function stopGeneration(){
  if(abortController) {
    abortController.abort();
  }
}

// Event listeners
sendBtn.addEventListener('click', () => {
  if(sendBtn.dataset.mode === 'stop') {
    stopGeneration();
  } else {
    send();
  }
});
inputEl.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') send();
});
inputEl.addEventListener('input', () => {
  if(currentSessionId){
    const s = sessions.find(x => x.id === currentSessionId);
    if(s) {
      s.draft = inputEl.value;
      s.updatedAt = Date.now();
      saveSessions();
    }
  }
});

clearBtn.addEventListener('click', () => {
  const s = sessions.find(x => x.id === currentSessionId);
  if(!s) return;
  showConfirmDialog(
    'Clear all messages in this conversation?',
    () => {
      s.history = [{role: 'system', content: systemEl.value}];
      s.draft = '';
      s.updatedAt = Date.now();
      saveSessions();
      renderMessages();
    }
  );
});

exportBtn.addEventListener('click', () => {
  const s = sessions.find(x => x.id === currentSessionId);
  if(!s) return;
  
  const filename = (s.title || 'chat') + '.json';
  const blob = new Blob([JSON.stringify(s, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  
  if(statusEl){
    statusEl.style.display = 'block';
    statusEl.innerHTML = `✅ Exported as <strong>${filename}</strong>`;
    setTimeout(() => statusEl.style.display = 'none', 3000);
  }
});

newChatBtn.addEventListener('click', () => {
  persistDraft();
  createSession();
});

// Update model badge when selection changes
modelEl.addEventListener('change', () => {
  updateModelBadge();
  // Save model selection to current session
  if(currentSessionId) {
    const s = sessions.find(x => x.id === currentSessionId);
    if(s) {
      s.models = Array.from(modelEl.selectedOptions).map(o => o.value) || [];
      s.updatedAt = Date.now();
      saveSessions();
    }
  }
});

// Save system prompt changes to current session
systemEl.addEventListener('change', () => {
  if(currentSessionId) {
    const s = sessions.find(x => x.id === currentSessionId);
    if(s) {
      s.system = systemEl.value;
      s.updatedAt = Date.now();
      saveSessions();
    }
  }
});

systemEl.addEventListener('input', () => {
  if(currentSessionId) {
    const s = sessions.find(x => x.id === currentSessionId);
    if(s) {
      s.system = systemEl.value;
      s.updatedAt = Date.now();
      saveSessions();
    }
  }
});

// Stream toggle visual feedback
const streamToggle = document.getElementById('streamMode');
if(streamToggle) {
  const updateStreamLabel = () => {
    const label = document.querySelector('label[for="streamMode"]');
    if(label) {
      label.textContent = streamToggle.checked ? 'Stream responses: ON' : 'Stream responses: OFF';
    }
  };
  
  streamToggle.addEventListener('change', updateStreamLabel);
  // Initialize label
  updateStreamLabel();
}

// Load models
function loadModels(){
  fetch('/api/models')
    .then(r => r.json())
    .then(j => {
      if(j.models && j.models.length){
        modelEl.innerHTML = '';
        j.models.forEach(m => {
          const o = document.createElement('option');
          o.value = m;
          o.textContent = m;
          modelEl.appendChild(o);
        });
      } else {
        modelEl.innerHTML = '<option disabled>No models found</option>';
      }
    })
    .catch(err => {
      console.error('Model load error:', err);
      modelEl.innerHTML = '<option disabled>Error loading models</option>';
    });
}

// Model selection feedback
function updateModelBadge() {
  const selected = Array.from(modelEl.selectedOptions);
  const badge = document.getElementById('modelBadge');
  if(badge){
    if(selected.length > 1) {
      badge.textContent = selected.length + ' selected';
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter or Alt+Enter: Send message
    if((e.ctrlKey || e.altKey) && e.key === 'Enter') {
      e.preventDefault();
      if(sendBtn.dataset.mode === 'stop') {
        stopGeneration();
      } else {
        send();
      }
    }
    
    // Ctrl+N: New conversation
    if(e.ctrlKey && e.key === 'n' && !e.shiftKey) {
      e.preventDefault();
      persistDraft();
      createSession();
    }
    
    // Ctrl+K: Focus on model selector
    if(e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      modelEl.focus();
    }
    
    // Escape: Cancel generation or close any open dialogs
    if(e.key === 'Escape') {
      if(sendBtn.dataset.mode === 'stop') {
        stopGeneration();
      }
      // Close any inline editing
      const editInputs = document.querySelectorAll('.session-title-edit');
      if(editInputs.length > 0) {
        renderSessionsList();
      }
    }
  });
});

// Make functions globally accessible for HTML onclick handlers
window.handleFileUpload = handleFileUpload;
window.saveCurrentPrompt = saveCurrentPrompt;
window.renderPromptDropdown = renderPromptDropdown;
window.loadPromptIntoInput = loadPromptIntoInput;
window.openModelManager = openModelManager;
window.closeModelManager = closeModelManager;
window.switchModelTab = switchModelTab;
window.filterAvailableModels = filterAvailableModels;
window.downloadModel = downloadModel;
window.deleteModel = deleteModel;
window.copyToClipboard = copyToClipboard;
window.continueWithModel = continueWithModel;
window.regenerateResponse = regenerateResponse;
window.handleVote = handleVote;

function init(){
  console.log('Initializing app...');
  loadSessions();
  console.log('Sessions loaded:', sessions.length);
  if(sessions.length === 0) {
    console.log('Creating first session');
    createSession();
  }
  else {
    currentSessionId = sessions[0].id;
    const s = sessions[0];
    
    // Restore system prompt from saved session
    systemEl.value = s.system || 'You are a sharp teacher like Richard Feynman.';
    
    // Restore model selection
    const savedModels = s.models || [];
    Array.from(modelEl.options).forEach(opt => {
      opt.selected = savedModels.includes(opt.value);
    });
    updateModelBadge();
    
    renderSessionsList();
    renderMessages();
  }
  loadModels();
  console.log('App initialized');
}

// Wait for DOM to be ready
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

