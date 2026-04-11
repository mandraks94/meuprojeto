(function() {
    'use strict';
    console.log("[IG Tools] Extensão carregada no contexto da página.");

    function initScript() {
        if (window.location.href.includes("instagram.com")) {
            const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;

            // Helper para Cookie
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            }

            function getDeviceId() {
                const cookie = getCookie('ig_did');
                return cookie ? cookie : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
            }

            let cachedRolloutHash = "";
            function getRolloutHash() {
                if (cachedRolloutHash) return cachedRolloutHash;
                try {
                    if (window.__p && window.__p.rollout_hash) {
                        cachedRolloutHash = window.__p.rollout_hash;
                        return cachedRolloutHash;
                    }
                    const scripts = document.querySelectorAll("script");
                    for (let i = 0; i < scripts.length; i++) {
                        const text = scripts[i].innerText;
                        if (text.includes('"rollout_hash"')) {
                            const match = text.match(/"rollout_hash":"([a-z0-9]+)"/);
                            if (match) {
                                cachedRolloutHash = match[1];
                                return cachedRolloutHash;
                            }
                        }
                    }
                } catch (e) {}
                return "1";
            }

            let cachedWWWClaim = "0";
            function getWWWClaim() {
                if (cachedWWWClaim && cachedWWWClaim !== "" && cachedWWWClaim !== "0") return cachedWWWClaim;
                try {
                    const claim = window.__p?.www_claim ||
                                  window._sharedData?.config?.viewer?.www_claim ||
                                  window.__cu?.www_claim ||
                                  window.__v?.www_claim ||
                                  window.__DTS?.www_claim ||
                                  window._sharedData?.config?.viewer?.www_claim;

                    if (claim && claim !== "0" && claim !== "") {
                        cachedWWWClaim = claim;
                        return cachedWWWClaim;
                    }
                } catch (e) {}
                return "0";
            }

            function getApiHeaders() {
                return {
                    "X-IG-App-ID": "936619743392459",
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest",
                    "X-ASBD-ID": "129477",
                    "X-Instagram-AJAX": getRolloutHash(),
                    "X-IG-WWW-Claim": getWWWClaim(),
                    "Content-Type": "application/x-www-form-urlencoded",
                };
            }

            async function getUserId(username) {
                try {
                    const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                        headers: { 'X-IG-App-ID': '936619743392459' }
                    });
                    const data = await response.json();
                    return data.data?.user?.id;
                } catch (e) {
                    console.error("Erro ao obter ID:", e);
                    return null;
                }
            }

            function showToast(message) {
                const toast = document.createElement('div');
                toast.innerText = message;
                toast.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; z-index: 2147483647; font-size: 14px; pointer-events: none; transition: opacity 0.5s;";
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 500);
                }, 3000);
            }

            if (!window._anonymousInterceptorInstalled) {
                window._anonymousInterceptorInstalled = true;
                const originalOpen = XMLHttpRequest.prototype.open;
                const originalSend = XMLHttpRequest.prototype.send;

                XMLHttpRequest.prototype.open = function(method, url) {
                    this._url = url;
                    return originalOpen.apply(this, arguments);
                };

                XMLHttpRequest.prototype.send = function(body) {
                    if (this._url && (this._url.includes('seen') || this._url.includes('/stories/reel/seen') || this._url.includes('/api/v1/stories/reel/seen'))) {
                        let isAnon = false;
                        try {
                            const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                            if (saved) isAnon = saved.anonymousStories;
                        } catch(e) {}

                        if (isAnon) {
                            console.log("%c[IG Tools] Bloqueado visto (XHR)", "color: orange;");
                            showToast("👁️ Story visto anonimamente!");
                            return;
                        }
                    }
                    return originalSend.apply(this, arguments);
                };

                const originalFetch = window.fetch;
                window.fetch = async function(input, init) {
                    let urlString = '';
                    if (typeof input === 'string') urlString = input;
                    else if (input instanceof URL) urlString = input.toString();
                    else if (input && input.url) urlString = input.url;

                    if (urlString && (urlString.includes('/stories/reel/seen') || urlString.includes('/api/v1/stories/reel/seen'))) {
                        let isAnon = false;
                        try {
                            const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                            if (saved) isAnon = saved.anonymousStories;
                        } catch(e) {}

                        if (isAnon) {
                            console.log("%c[IG Tools] Bloqueado visto (Fetch)", "color: orange;");
                            showToast("👁️ Story visto anonimamente!");
                            return new Response(JSON.stringify({status: 'ok'}), {status: 200});
                        }
                    }
                    return originalFetch.apply(this, arguments);
                };

                if (navigator.sendBeacon) {
                    const originalSendBeacon = navigator.sendBeacon;
                    navigator.sendBeacon = function(url, data) {
                        if (url && (url.includes('/stories/reel/seen') || url.includes('/api/v1/stories/reel/seen'))) {
                            let isAnon = false;
                            try {
                                const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                                if (saved && saved.anonymousStories) return true;
                            } catch(e) {}
                        }
                        return originalSendBeacon.apply(this, arguments);
                    };
                }
            }

            const dbHelper = {
                db: null,
                openDB: function() {
                    return new Promise((resolve, reject) => {
                        const request = indexedDB.open('InstagramToolsDB', 8);
                        request.onupgradeneeded = (event) => {
                            const db = event.target.result;
                            if (!db.objectStoreNames.contains('closeFriends')) db.createObjectStore('closeFriends', { keyPath: 'id', autoIncrement: true });
                            if (!db.objectStoreNames.contains('hiddenStory')) db.createObjectStore('hiddenStory', { keyPath: 'id', autoIncrement: true });
                            if (!db.objectStoreNames.contains('muted')) db.createObjectStore('muted', { keyPath: 'id', autoIncrement: true });
                            if (!db.objectStoreNames.contains('unfollowHistory')) db.createObjectStore('unfollowHistory', { keyPath: 'username' });
                            if (!db.objectStoreNames.contains('followers')) db.createObjectStore('followers', { keyPath: 'id', autoIncrement: true });
                            if (!db.objectStoreNames.contains('following')) db.createObjectStore('following', { keyPath: 'id', autoIncrement: true });
                            if (!db.objectStoreNames.contains('exceptions')) db.createObjectStore('exceptions', { keyPath: 'username' });
                            if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
                            if (!db.objectStoreNames.contains('userCategories')) db.createObjectStore('userCategories', { keyPath: 'username' });
                        };
                        request.onsuccess = (event) => { this.db = event.target.result; resolve(this.db); };
                        request.onerror = (event) => { reject(event.target.error); };
                    });
                },
                saveCache: async function(storeName, data) {
                    if (!this.db) await this.openDB();
                    const transaction = this.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    await new Promise((resolve) => {
                        const clearRequest = store.clear();
                        clearRequest.onsuccess = () => resolve();
                        clearRequest.onerror = () => resolve();
                    });
                    const dataArray = Array.from(data);
                    const isObject = dataArray.length > 0 && typeof dataArray[0] === 'object';
                    const record = { id: 1, usernames: isObject ? dataArray.map(u => u.username) : dataArray };
                    if (isObject) record.users = dataArray;
                    await new Promise((resolve, reject) => {
                        const addRequest = store.put(record);
                        addRequest.onsuccess = () => resolve();
                        addRequest.onerror = (event) => reject(event.target.error);
                    });
                },
                loadCache: async function(storeName) {
                    if (!this.db) await this.openDB();
                    const transaction = this.db.transaction([storeName], 'readonly');
                    const store = transaction.objectStore(storeName);
                    return new Promise((resolve) => {
                        const request = store.getAll();
                        request.onsuccess = () => {
                            const results = request.result;
                            if (results.length > 0) {
                                const res = results[0];
                                const set = new Set(res.usernames);
                                if (res.users) set.details = new Map(res.users.map(u => [u.username, u]));
                                resolve(set);
                            } else resolve(null);
                        };
                        request.onerror = () => resolve(null);
                    });
                },
                saveUnfollowHistory: async function(userData) {
                    if (!this.db) await this.openDB();
                    const transaction = this.db.transaction(['unfollowHistory'], 'readwrite');
                    const store = transaction.objectStore('unfollowHistory');
                    return new Promise((resolve, reject) => {
                        const request = store.put(userData);
                        request.onsuccess = () => resolve();
                        request.onerror = (event) => reject(event.target.error);
                    });
                },
                deleteUnfollowHistory: async function(usernames) {
                    if (!this.db) await this.openDB();
                    const transaction = this.db.transaction(['unfollowHistory'], 'readwrite');
                    const store = transaction.objectStore('unfollowHistory');
                    return new Promise((resolve) => {
                        let count = 0;
                        if (usernames.length === 0) resolve();
                        usernames.forEach(u => {
                            const req = store.delete(u);
                            req.onsuccess = () => { count++; if(count === usernames.length) resolve(); };
                            req.onerror = () => { count++; if(count === usernames.length) resolve(); };
                        });
                    });
                },
                loadUnfollowHistory: async function() {
                    if (!this.db) await this.openDB();
                    const transaction = this.db.transaction(['unfollowHistory'], 'readonly');
                    const store = transaction.objectStore('unfollowHistory');
                    return new Promise((resolve) => {
                        const request = store.getAll();
                        request.onsuccess = () => {
                            const sorted = request.result.sort((a, b) => new Date(b.unfollowDate) - new Date(a.unfollowDate));
                            resolve(sorted);
                        };
                        request.onerror = () => resolve([]);
                    });
                },
                saveException: async function(username) {
                    if (!this.db) await this.openDB();
                    const tx = this.db.transaction(['exceptions'], 'readwrite');
                    tx.objectStore('exceptions').put({ username: username });
                },
                loadExceptions: async function() {
                    if (!this.db) await this.openDB();
                    const tx = this.db.transaction(['exceptions'], 'readonly');
                    const store = tx.objectStore('exceptions');
                    return new Promise(resolve => {
                        const req = store.getAll();
                        req.onsuccess = () => resolve(new Set(req.result.map(i => i.username)));
                        req.onerror = () => resolve(new Set());
                    });
                },
                saveCategory: async function(category) {
                    if (!this.db) await this.openDB();
                    const tx = this.db.transaction(['categories'], 'readwrite');
                    tx.objectStore('categories').put(category);
                    return tx.complete;
                },
                loadCategories: async function() {
                    if (!this.db) await this.openDB();
                    const tx = this.db.transaction(['categories'], 'readonly');
                    return new Promise(resolve => {
                        const req = tx.objectStore('categories').getAll();
                        req.onsuccess = () => resolve(req.result.sort((a, b) => a.name.localeCompare(b.name)));
                        req.onerror = () => resolve([]);
                    });
                },
                deleteCategory: async function(categoryId) {
                    if (!this.db) await this.openDB();
                    const tx = this.db.transaction(['categories', 'userCategories'], 'readwrite');
                    tx.objectStore('categories').delete(categoryId);
                    const userStore = tx.objectStore('userCategories');
                    const cursorReq = userStore.openCursor();
                    cursorReq.onsuccess = e => {
                        const cursor = e.target.result;
                        if (cursor) {
                            const user = cursor.value;
                            const updatedCategories = user.categories.filter(c => c !== categoryId);
                            if (updatedCategories.length < user.categories.length) {
                                user.categories = updatedCategories;
                                cursor.update(user);
                            }
                            cursor.continue();
                        }
                    };
                },
                saveUserCategories: async function(username, categoryIds) {
                    if (!this.db) await this.openDB();
                    const tx = this.db.transaction(['userCategories'], 'readwrite');
                    tx.objectStore('userCategories').put({ username: username.toLowerCase(), categories: categoryIds });
                },
                loadAllUserCategories: async function() {
                    if (!this.db) await this.openDB();
                    const tx = this.db.transaction(['userCategories'], 'readonly');
                    return new Promise(resolve => {
                        const req = tx.objectStore('userCategories').getAll();
                        req.onsuccess = () => {
                            const map = new Map();
                            req.result.forEach(item => { if (item.username) map.set(item.username.toLowerCase(), item.categories); });
                            resolve(map);
                        };
                        req.onerror = () => resolve(new Map());
                    });
                }
            };

            // --- LÓGICA DE CONFIGURAÇÕES ---
            function loadSettings() {
                const defaults = { darkMode: false, rgbBorder: false, language: 'pt-BR', unfollowDelay: 5000, itemsPerPage: 10, requestDelay: 250, requestBatchSize: 50, maxRequests: 0, anonymousStories: false, useApi: true };
                try {
                    const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                    return { ...defaults, ...saved };
                } catch (e) { return defaults; }
            }

            const translations = {
                'pt-BR': { likes: 'Curtidas', comments: 'Comentários', blocked: 'Bloqueados', messages: 'Mensagens', notFollowingBack: 'Não segue de volta', following: 'Seguindo', closeFriends: 'Amigos Próximos', hideStory: 'Ocultar Story', mutedAccounts: 'Contas Silenciadas', interactions: 'Interações', reelsMenu: 'Menu de Reels', downloadStory: 'Baixar Story', engagement: 'Engajamento', settings: 'Configurações', darkMode: 'Modo Escuro', rgbBorder: 'Borda RGB', shortcuts: 'Atalhos', parameters: 'Parâmetros', language: 'Idioma', anonymousStories: 'Stories Anônimo', useApi: 'Usar API (Rápido)' },
                'en-US': { likes: 'Likes', comments: 'Comments', blocked: 'Blocked', messages: 'Messages', notFollowingBack: 'Not Following Back', following: 'Following', closeFriends: 'Close Friends', hideStory: 'Hide Story', mutedAccounts: 'Muted Accounts', interactions: 'Interactions', reelsMenu: 'Reels Menu', downloadStory: 'Download Story', engagement: 'Engagement', settings: 'Settings', darkMode: 'Dark Mode', rgbBorder: 'RGB Border', shortcuts: 'Shortcuts', parameters: 'Parameters', language: 'Language', anonymousStories: 'Anonymous Stories', useApi: 'Use API (Fast)' },
                'es-ES': { likes: 'Me gusta', comments: 'Comentarios', blocked: 'Bloqueados', messages: 'Mensajes', notFollowingBack: 'No te sigue', following: 'Siguiendo', closeFriends: 'Mejores Amigos', hideStory: 'Ocultar Historia', mutedAccounts: 'Cuentas Silenciadas', interactions: 'Interacciones', reelsMenu: 'Menú de Reels', downloadStory: 'Descargar Historia', engagement: 'Compromiso', settings: 'Configuración', darkMode: 'Modo Oscuro', rgbBorder: 'Borde RGB', shortcuts: 'Atajos', parameters: 'Parámetros', language: 'Idioma', anonymousStories: 'Historias Anónimas', useApi: 'Usar API (Rápido)' },
                'fr-FR': { likes: 'J\'aime', comments: 'Commentaires', blocked: 'Bloqués', messages: 'Messages', notFollowingBack: 'Ne suit pas en retour', following: 'Abonnements', closeFriends: 'Amis Proches', hideStory: 'Masquer Story', mutedAccounts: 'Comptes Muets', interactions: 'Interactions', reelsMenu: 'Menu Reels', downloadStory: 'Télécharger Story', engagement: 'Engagement', settings: 'Paramètres', darkMode: 'Mode Sombre', rgbBorder: 'Bordure RGB', shortcuts: 'Raccourcis', parameters: 'Paramètres', language: 'Langue', anonymousStories: 'Stories Anonymes', useApi: 'Utiliser API (Rapide)' },
                'it-IT': { likes: 'Mi piace', comments: 'Commenti', blocked: 'Bloccati', messages: 'Messaggi', notFollowingBack: 'Non ti segue', following: 'Seguiti', closeFriends: 'Amici Più Stretti', hideStory: 'Nascondi Storia', mutedAccounts: 'Account Silenziati', interactions: 'Interazioni', reelsMenu: 'Menu Reels', downloadStory: 'Scarica Storia', engagement: 'Coinvolgimento', settings: 'Impostazioni', darkMode: 'Modalità Scura', rgbBorder: 'Bordo RGB', shortcuts: 'Scorciatoie', parameters: 'Parametri', language: 'Lingua', anonymousStories: 'Storie Anonime', useApi: 'Usa API (Veloce)' },
                'de-DE': { likes: 'Gefällt mir', comments: 'Kommentare', blocked: 'Blockiert', messages: 'Nachrichten', notFollowingBack: 'Folgt não zurück', following: 'Abonniert', closeFriends: 'Engste Freunde', hideStory: 'Story verbergen', mutedAccounts: 'Stummgeschaltete', interactions: 'Interaktionen', reelsMenu: 'Reels Menü', downloadStory: 'Story herunterladen', engagement: 'Engagement', settings: 'Einstellungen', darkMode: 'Dunkelmodus', rgbBorder: 'RGB-Rand', shortcuts: 'Verknüpfungen', parameters: 'Parameter', language: 'Sprache', anonymousStories: 'Anonyme Stories', useApi: 'API verwenden (Schnell)' }
            };

            function getText(key) {
                const lang = loadSettings().language || 'pt-BR';
                return translations[lang]?.[key] || translations['pt-BR'][key] || key;
            }

            function saveSettings(newSettings) {
                const current = loadSettings();
                const updated = { ...current, ...newSettings };
                localStorage.setItem('instagramToolsSettings_v2', JSON.stringify(updated));
            }

            function toggleDarkMode(enabled) {
                document.body.classList.toggle('dark-mode', enabled);
            }

            function toggleRgbBorder(enabled) {
                const elements = document.querySelectorAll('.submenu-modal, .assistive-menu');
                elements.forEach(el => el.classList.toggle('rgb-border-effect', enabled));
            }

            function toggleAnonymousStories(enabled) {
                const btn = document.getElementById("settingsAnonymousStoriesBtn");
                if (btn) btn.style.background = enabled ? '#4c5c75' : '';
            }

            function toggleUseApi(enabled) {
                const btn = document.getElementById("settingsUseApiBtn");
                if (btn) btn.style.background = enabled ? '#4c5c75' : '';
            }

            function applyInitialSettings() {
                const settings = loadSettings();
                toggleDarkMode(settings.darkMode);
                toggleRgbBorder(settings.rgbBorder);
                toggleAnonymousStories(settings.anonymousStories);
                toggleUseApi(settings.useApi);
            }

            // --- LÓGICA PARA ATALHOS ---
            function getShortcuts() {
                try {
                    const saved = JSON.parse(localStorage.getItem('instagram_shortcuts_v2'));
                    return Array.isArray(saved) ? saved : [];
                } catch (e) { return []; }
            }

            function saveShortcuts(shortcuts) {
                localStorage.setItem('instagram_shortcuts_v2', JSON.stringify(shortcuts));
            }

            function formatShortcutForDisplay(shortcut) {
                if (!shortcut || !shortcut.key) return '';
                const parts = [];
                if (shortcut.ctrlKey) parts.push('Ctrl');
                if (shortcut.altKey) parts.push('Alt');
                if (shortcut.shiftKey) parts.push('Shift');
                parts.push(shortcut.key.toUpperCase());
                return parts.join(' + ');
            }

            function executeXPathClick(xpath) {
                try {
                    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    const element = result.singleNodeValue;
                    if (element) { element.click(); return true; }
                    return false;
                } catch (error) { return false; }
            }

            function initShortcutListener() {
                if (document.body.dataset.shortcutsInitialized) return;
                document.body.dataset.shortcutsInitialized = 'true';
                document.addEventListener('keydown', (event) => {
                    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) return;
                    if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;
                    const shortcuts = getShortcuts();
                    const shortcut = shortcuts.find(s => s.key.toLowerCase() === event.key.toLowerCase() && !!s.ctrlKey === event.ctrlKey && !!s.altKey === event.altKey && !!s.shiftKey === event.shiftKey);
                    if (shortcut) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (shortcut.xpath) executeXPathClick(shortcut.xpath);
                        else if (shortcut.link) window.location.href = shortcut.link;
                    }
                });
            }

            // --- COMANDOS DE VOZ ---
            const voiceControl = {
                recognition: null,
                isListening: false,
                commands: [],
                init: function() {
                    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    this.recognition = new SpeechRecognition();
                    this.recognition.continuous = true;
                    this.recognition.lang = loadSettings().language || 'pt-BR';
                    this.recognition.onresult = (event) => {
                        const last = event.results.length - 1;
                        const command = event.results[last][0].transcript.trim().toLowerCase();
                        this.executeCommand(command);
                    };
                    this.recognition.onend = () => { if (this.isListening) try { this.recognition.start(); } catch(e) {} };
                    this.loadCommands();
                    if (localStorage.getItem('instagram_voice_enabled') === 'true') {
                        try { this.start(); } catch(e) {}
                    }
                },
                loadCommands: function() {
                    const defaults = [
                        { phrase: "baixar story", action: "downloadStory", description: "Baixa o story atual" },
                        { phrase: "abrir configurações", action: "openSettings", description: "Abre configurações" }
                    ];
                    try {
                        const saved = JSON.parse(localStorage.getItem('instagram_voice_commands'));
                        this.commands = saved || defaults;
                    } catch (e) { this.commands = defaults; }
                },
                saveCommands: function() { localStorage.setItem('instagram_voice_commands', JSON.stringify(this.commands)); },
                start: function() {
                    if (!this.recognition) this.init();
                    if (this.recognition && !this.isListening) {
                        try { this.recognition.start(); this.isListening = true; localStorage.setItem('instagram_voice_enabled', 'true'); } catch(e) {}
                    }
                },
                stop: function() {
                    if (this.recognition && this.isListening) { this.recognition.stop(); this.isListening = false; localStorage.setItem('instagram_voice_enabled', 'false'); }
                },
                toggle: function() { if (this.isListening) this.stop(); else this.start(); return this.isListening; },
                executeCommand: function(transcript) {
                    const cmd = this.commands.find(c => transcript.includes(c.phrase.toLowerCase()));
                    if (cmd) {
                        switch(cmd.action) {
                            case 'downloadStory': baixarStoryAtual(); break;
                            case 'openSettings': abrirModalConfiguracoes(); break;
                        }
                    }
                }
            };

            // --- DOWNLOADER ---
            async function downloadMedia(url, filename) {
                try {
                    if (url.startsWith('data:')) {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        link.click();
                        return;
                    }
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                } catch (error) { window.open(url, '_blank'); }
            }

            function baixarStoryAtual() {
                if (!window.location.href.includes('/stories/')) return;
                const isVisible = (el) => {
                    const rect = el.getBoundingClientRect();
                    return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
                };
                const video = Array.from(document.querySelectorAll('video')).find(isVisible);
                if (video && video.src) {
                    downloadMedia(video.src, `story_${Date.now()}.mp4`);
                    return;
                }
                const img = Array.from(document.querySelectorAll('section img')).find(i => isVisible(i) && i.height > 500);
                if (img && img.src) {
                    downloadMedia(img.srcset ? img.srcset.split(',').pop().trim().split(' ')[0] : img.src, `story_${Date.now()}.jpg`);
                }
            }

            function addFeedDownloadButtons() {
                const observer = new MutationObserver(() => {
                    const articles = document.querySelectorAll('article:not([data-download-processed])');
                    articles.forEach(article => {
                        article.setAttribute('data-download-processed', 'true');
                        const containers = article.querySelectorAll('div._aagv, div[role="presentation"]');
                        containers.forEach(container => {
                            if (container.querySelector('.feed-download-btn')) return;
                            const btn = document.createElement('button');
                            btn.innerHTML = '⬇️';
                            btn.className = 'feed-download-btn';
                            btn.style.cssText = "position:absolute;top:15px;left:15px;z-index:100;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;";
                            btn.onclick = (e) => {
                                e.preventDefault(); e.stopPropagation();
                                const media = container.querySelector('video, img');
                                if (media) downloadMedia(media.src, `ig_media_${Date.now()}.${media.tagName === 'VIDEO' ? 'mp4' : 'jpg'}`);
                            };
                            container.appendChild(btn);
                        });
                    });
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }

            // --- UI & MENUS ---
            function injectMenu() {
                if (document.getElementById("instagramToolsSidebarBtn")) return;
                const sidebar = document.querySelector('div.x78zum5.xaw8158.xh8yej3') || document.querySelector('div[role="navigation"]');
                if (!sidebar) return;

                const btnContainer = document.createElement('div');
                btnContainer.innerHTML = `
                    <a id="instagramToolsSidebarBtn" href="#" style="display:flex;align-items:center;padding:12px;text-decoration:none;color:inherit;">
                        <div style="width:24px;height:24px;margin-right:12px;">⚙️</div>
                        <span class="ig-tools-text">IG Tools Pro</span>
                    </a>
                `;
                
                const menu = document.createElement('div');
                menu.id = "assistiveTouchMenu";
                menu.className = "assistive-menu";
                menu.style.cssText = "position:fixed;display:none;flex-direction:column;gap:10px;z-index:9999;background:white;padding:15px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.2);width:250px;";
                menu.innerHTML = `
                    <button id="navLikes" style="width:100%;padding:10px;text-align:left;border:none;background:none;cursor:pointer;">❤️ ${getText('likes')}</button>
                    <button id="navFollowers" style="width:100%;padding:10px;text-align:left;border:none;background:none;cursor:pointer;">👥 ${getText('notFollowingBack')}</button>
                    <button id="navFollowing" style="width:100%;padding:10px;text-align:left;border:none;background:none;cursor:pointer;">🏃 ${getText('following')}</button>
                    <button id="navSettings" style="width:100%;padding:10px;text-align:left;border:none;background:none;cursor:pointer;">⚙️ ${getText('settings')}</button>
                `;

                document.body.appendChild(menu);
                sidebar.appendChild(btnContainer);

                btnContainer.onclick = (e) => {
                    e.preventDefault();
                    const isVisible = menu.style.display === 'flex';
                    menu.style.display = isVisible ? 'none' : 'flex';
                    const rect = btnContainer.getBoundingClientRect();
                    menu.style.left = (rect.right + 10) + 'px';
                    menu.style.top = rect.top + 'px';
                };

                document.getElementById('navLikes').onclick = () => window.location.href = '/your_activity/interactions/likes/';
                document.getElementById('navSettings').onclick = () => { menu.style.display='none'; abrirModalConfiguracoes(); };
                document.getElementById('navFollowers').onclick = () => { menu.style.display='none'; iniciarProcessoNaoSegueDeVolta(); };
            }

            function abrirModalConfiguracoes() {
                const settings = loadSettings();
                const div = document.createElement("div");
                div.className = "submenu-modal";
                div.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:10px;z-index:10000;box-shadow:0 0 20px rgba(0,0,0,0.5);color:black;";
                div.innerHTML = `
                    <h3>Configurações</h3>
                    <label><input type="checkbox" id="setAnon" ${settings.anonymousStories ? 'checked' : ''}> Stories Anônimo</label><br><br>
                    <label><input type="checkbox" id="setDark" ${settings.darkMode ? 'checked' : ''}> Modo Escuro</label><br><br>
                    <button id="saveSet" style="background:#0095f6;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">Salvar</button>
                    <button onclick="this.parentElement.remove()" style="margin-left:10px;">Fechar</button>
                `;
                document.body.appendChild(div);
                document.getElementById('saveSet').onclick = () => {
                    const s = { anonymousStories: document.getElementById('setAnon').checked, darkMode: document.getElementById('setDark').checked };
                    saveSettings(s);
                    applyInitialSettings();
                    div.remove();
                };
            }

            // --- ANÁLISE DE SEGUIDORES ---
            async function iniciarProcessoNaoSegueDeVolta() {
                const appID = '936619743392459';
                const username = window.location.pathname.split('/').filter(Boolean)[0];
                if (!username) return alert("Vá para um perfil primeiro.");

                showToast("Iniciando análise... Isso pode levar tempo.");
                const res = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                const profile = await res.json();
                const uid = profile.data.user.id;
                
                // Lógica de extração simplificada para extensão
                const fetchList = async (type) => {
                    const list = new Set();
                    let nextId = '';
                    let hasNext = true;
                    while(hasNext) {
                        const r = await fetch(`https://www.instagram.com/api/v1/friendships/${uid}/${type}/?count=50&max_id=${nextId}`, { headers: { 'X-IG-App-ID': appID } });
                        const d = await r.json();
                        d.users.forEach(u => list.add(u.username));
                        nextId = d.next_max_id;
                        hasNext = !!nextId;
                        if (list.size > 500) break; // Limite de segurança para exemplo
                    }
                    return list;
                };

                const followers = await fetchList('followers');
                const following = await fetchList('following');
                const dontFollowBack = [...following].filter(u => !followers.has(u));
                
                alert(`Análise concluída!\nSeguidores: ${followers.size}\nSeguindo: ${following.size}\nNão te seguem de volta: ${dontFollowBack.length}`);
                console.log("Não seguem de volta:", dontFollowBack);
            }

            // --- INICIALIZAÇÃO ---
            dbHelper.openDB().then(() => {
                applyInitialSettings();
                initShortcutListener();
                addFeedDownloadButtons();
                voiceControl.init();
                setInterval(injectMenu, 2000);
            });
        }
    }

    const observer = new MutationObserver(() => {
        if (window.location.href.includes("instagram.com")) initScript();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    initScript();
})();