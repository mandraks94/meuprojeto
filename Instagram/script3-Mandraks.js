// ==UserScript==
// @name         Instagram Tools_8
// @description  Adds download buttons to Instagram stories
// @author       You
// @version      1.0
// @match        https://www.instagram.com/*
// @grant        none
// ==/UserScript==

        (function() {
            'use strict';

            function initScript() {
                if (window.location.href.includes("instagram.com")) {
                    const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;

                    // Helper para IndexedDB
                    const dbHelper = {
                        db: null,
                        openDB: function() {
                            return new Promise((resolve, reject) => {
                                const request = indexedDB.open('InstagramToolsDB', 6);
                                request.onupgradeneeded = (event) => {
                                    const db = event.target.result;
                                    if (!db.objectStoreNames.contains('closeFriends')) {
                                        db.createObjectStore('closeFriends', { keyPath: 'id', autoIncrement: true });
                                    }
                                    if (!db.objectStoreNames.contains('hiddenStory')) {
                                        db.createObjectStore('hiddenStory', { keyPath: 'id', autoIncrement: true });
                                    }
                                    if (!db.objectStoreNames.contains('muted')) {
                                        db.createObjectStore('muted', { keyPath: 'id', autoIncrement: true });
                                    }
                                    if (!db.objectStoreNames.contains('unfollowHistory')) {
                                        db.createObjectStore('unfollowHistory', { keyPath: 'username' });
                                    }
                                    if (!db.objectStoreNames.contains('followers')) {
                                        db.createObjectStore('followers', { keyPath: 'id', autoIncrement: true });
                                    }
                                    if (!db.objectStoreNames.contains('following')) {
                                        db.createObjectStore('following', { keyPath: 'id', autoIncrement: true });
                                    }
                                    if (!db.objectStoreNames.contains('followers')) {
                                        db.createObjectStore('followers', { keyPath: 'id', autoIncrement: true });
                                    }
                                    if (!db.objectStoreNames.contains('following')) {
                                        db.createObjectStore('following', { keyPath: 'id', autoIncrement: true });
                                    }
                                    if (!db.objectStoreNames.contains('exceptions')) {
                                        db.createObjectStore('exceptions', { keyPath: 'username' });
                                    }
                                };
                                request.onsuccess = (event) => {
                                    this.db = event.target.result;
                                    resolve(this.db);
                                };
                                request.onerror = (event) => {
                                    reject(event.target.error);
                                };
                            });
                        },
                        saveCache: async function(storeName, data) {
                            if (!this.db) await this.openDB();
                            const transaction = this.db.transaction([storeName], 'readwrite');
                            const store = transaction.objectStore(storeName);
                            // Clear existing data
                            await new Promise((resolve) => {
                                const clearRequest = store.clear();
                                clearRequest.onsuccess = () => resolve();
                                clearRequest.onerror = () => resolve(); // Continue even if clear fails
                            });
                            // Save new data
                            const dataArray = Array.from(data);
                            // Verifica se é uma lista de objetos ou strings
                            const isObject = dataArray.length > 0 && typeof dataArray[0] === 'object';
                            const record = { id: 1, usernames: isObject ? dataArray.map(u => u.username) : dataArray };
                            if (isObject) record.users = dataArray; // Salva os detalhes completos se disponíveis

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
                                        if (res.users) {
                                            set.details = new Map(res.users.map(u => [u.username, u]));
                                        }
                                        resolve(set);
                                    } else {
                                        resolve(null);
                                    }
                                };
                                request.onerror = () => resolve(null);
                            });
                        },
                        saveUnfollowHistory: async function(userData) {
                            if (!this.db) await this.openDB();
                            const transaction = this.db.transaction(['unfollowHistory'], 'readwrite');
                            const store = transaction.objectStore('unfollowHistory');
                            return new Promise((resolve, reject) => {
                                // put() irá adicionar ou atualizar o registro
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
                                    // Ordena por data decrescente
                                    const sorted = request.result.sort((a, b) => new Date(b.unfollowDate) - new Date(a.unfollowDate));
                                    resolve(sorted);
                                };
                                request.onerror = () => resolve([]); // Retorna array vazio em caso de erro
                            });
                        },
                        saveException: async function(username) {
                            if (!this.db) await this.openDB();
                            const tx = this.db.transaction(['exceptions'], 'readwrite');
                            const store = tx.objectStore('exceptions');
                            store.put({ username: username });
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
                        }
                    };

                    // --- LÓGICA DE CONFIGURAÇÕES ---
                    function loadSettings() {
                        const defaults = {
                            darkMode: false,
                            rgbBorder: false,
                            language: 'pt-BR',
                            unfollowDelay: 5000,
                            itemsPerPage: 10,
                            requestDelay: 250,
                            requestBatchSize: 50,
                            maxRequests: 0
                        };
                        try {
                            const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                            return { ...defaults, ...saved };
                        } catch (e) {
                            return defaults;
                        }
                    }

                    const translations = {
                        'pt-BR': { likes: 'Curtidas', comments: 'Comentários', blocked: 'Bloqueados', messages: 'Mensagens', notFollowingBack: 'Não segue de volta', following: 'Seguindo', closeFriends: 'Amigos Próximos', hideStory: 'Ocultar Story', mutedAccounts: 'Contas Silenciadas', interactions: 'Interações', reelsMenu: 'Menu de Reels', downloadStory: 'Baixar Story', engagement: 'Engajamento', settings: 'Configurações', darkMode: 'Modo Escuro', rgbBorder: 'Borda RGB', shortcuts: 'Atalhos', parameters: 'Parâmetros', language: 'Idioma' },
                        'en-US': { likes: 'Likes', comments: 'Comments', blocked: 'Blocked', messages: 'Messages', notFollowingBack: 'Not Following Back', following: 'Following', closeFriends: 'Close Friends', hideStory: 'Hide Story', mutedAccounts: 'Muted Accounts', interactions: 'Interactions', reelsMenu: 'Reels Menu', downloadStory: 'Download Story', engagement: 'Engagement', settings: 'Settings', darkMode: 'Dark Mode', rgbBorder: 'RGB Border', shortcuts: 'Shortcuts', parameters: 'Parameters', language: 'Language' },
                        'es-ES': { likes: 'Me gusta', comments: 'Comentarios', blocked: 'Bloqueados', messages: 'Mensajes', notFollowingBack: 'No te sigue', following: 'Siguiendo', closeFriends: 'Mejores Amigos', hideStory: 'Ocultar Historia', mutedAccounts: 'Cuentas Silenciadas', interactions: 'Interacciones', reelsMenu: 'Menú de Reels', downloadStory: 'Descargar Historia', engagement: 'Compromiso', settings: 'Configuración', darkMode: 'Modo Oscuro', rgbBorder: 'Borde RGB', shortcuts: 'Atajos', parameters: 'Parámetros', language: 'Idioma' },
                        'fr-FR': { likes: 'J\'aime', comments: 'Commentaires', blocked: 'Bloqués', messages: 'Messages', notFollowingBack: 'Ne suit pas en retour', following: 'Abonnements', closeFriends: 'Amis Proches', hideStory: 'Masquer Story', mutedAccounts: 'Comptes Muets', interactions: 'Interactions', reelsMenu: 'Menu Reels', downloadStory: 'Télécharger Story', engagement: 'Engagement', settings: 'Paramètres', darkMode: 'Mode Sombre', rgbBorder: 'Bordure RGB', shortcuts: 'Raccourcis', parameters: 'Paramètres', language: 'Langue' },
                        'it-IT': { likes: 'Mi piace', comments: 'Commenti', blocked: 'Bloccati', messages: 'Messaggi', notFollowingBack: 'Non ti segue', following: 'Seguiti', closeFriends: 'Amici Più Stretti', hideStory: 'Nascondi Storia', mutedAccounts: 'Account Silenziati', interactions: 'Interazioni', reelsMenu: 'Menu Reels', downloadStory: 'Scarica Storia', engagement: 'Coinvolgimento', settings: 'Impostazioni', darkMode: 'Modalità Scura', rgbBorder: 'Bordo RGB', shortcuts: 'Scorciatoie', parameters: 'Parametri', language: 'Lingua' },
                        'de-DE': { likes: 'Gefällt mir', comments: 'Kommentare', blocked: 'Blockiert', messages: 'Nachrichten', notFollowingBack: 'Folgt nicht zurück', following: 'Abonniert', closeFriends: 'Engste Freunde', hideStory: 'Story verbergen', mutedAccounts: 'Stummgeschaltete', interactions: 'Interaktionen', reelsMenu: 'Reels Menü', downloadStory: 'Story herunterladen', engagement: 'Engagement', settings: 'Einstellungen', darkMode: 'Dunkelmodus', rgbBorder: 'RGB-Rand', shortcuts: 'Verknüpfungen', parameters: 'Parameter', language: 'Sprache' }
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
                        const btn = document.getElementById("settingsDarkModeBtn");
                        if (btn) btn.style.background = enabled ? '#4c5c75' : '';
                    }

                    function toggleRgbBorder(enabled) {
                        const elements = document.querySelectorAll('.submenu-modal, .assistive-menu');
                        elements.forEach(el => {
                            el.classList.toggle('rgb-border-effect', enabled);
                        });
                        const btn = document.getElementById("settingsRgbBorderBtn");
                        if (btn) btn.style.background = enabled ? '#4c5c75' : '';
                    }

                    function applyInitialSettings() {
                        const settings = loadSettings();
                        toggleDarkMode(settings.darkMode);
                        toggleRgbBorder(settings.rgbBorder);
                    }

                    // --- LÓGICA PARA ATALHOS ---
                    function getShortcuts() {
                        try {
                            const saved = JSON.parse(localStorage.getItem('instagram_shortcuts_v2'));
                            return Array.isArray(saved) ? saved : [];
                        } catch (e) {
                            return [];
                        }
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
                            if (element) {
                                element.click();
                                return true;
                            }
                            console.warn("Atalho: Nenhum elemento encontrado para o XPath:", xpath);
                            return false;
                        } catch (error) {
                            console.error("Atalho: Erro ao executar o XPath:", xpath, error);
                            return false;
                        }
                    }

                    function initShortcutListener() {
                        if (document.body.dataset.shortcutsInitialized) return; // Evita múltiplos listeners
                        document.body.dataset.shortcutsInitialized = 'true';

                        document.addEventListener('keydown', (event) => {
                            // Ignora atalhos se um input, textarea ou contenteditable estiver focado
                            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
                                return;
                            }

                            // Ignora pressionamentos de apenas teclas modificadoras
                            if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
                                return;
                            }

                            const shortcuts = getShortcuts();
                            const shortcut = shortcuts.find(s =>
                                s.key.toLowerCase() === event.key.toLowerCase() &&
                                !!s.ctrlKey === event.ctrlKey &&
                                !!s.altKey === event.altKey &&
                                !!s.shiftKey === event.shiftKey
                            );

                            if (shortcut) {
                                event.preventDefault();
                                event.stopPropagation();
                                console.log(`Atalho '${formatShortcutForDisplay(shortcut)}' acionado.`);
                                if (shortcut.xpath) {
                                    executeXPathClick(shortcut.xpath);
                                } else if (shortcut.link) {
                                    window.location.href = shortcut.link;
                                }
                            }
                        });
                    }

                        function injectMenu() {
                            if (document.getElementById("assistiveTouchMenu")) return;
                            if (document.getElementById("instagramToolsSidebarBtn")) return;

                            // --- LÓGICA DE COMANDOS DE VOZ ---
                            const voiceControl = {
                                recognition: null,
                                isListening: false,
                                commands: [],
                                init: function() {
                                    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                                        console.warn("Web Speech API não suportada.");
                                        return;
                                    }
                                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                                    this.recognition = new SpeechRecognition();
                                    this.recognition.continuous = true;
                                    this.recognition.lang = loadSettings().language || 'pt-BR';
                                    this.recognition.interimResults = false;

                                    this.recognition.onresult = (event) => {
                                        const last = event.results.length - 1;
                                        const command = event.results[last][0].transcript.trim().toLowerCase();
                                        console.log("Comando de voz:", command);
                                        this.executeCommand(command);
                                    };

                                    this.recognition.onerror = (event) => {
                                        console.error("Erro voz:", event.error);
                                        if (event.error === 'not-allowed') {
                                            this.stop();
                                            alert("Permissão de microfone negada.");
                                        }
                                    };
                                    
                                    this.recognition.onend = () => {
                                        if (this.isListening) {
                                            try { this.recognition.start(); } catch(e) {}
                                        }
                                    };

                                    this.loadCommands();
                                    if (localStorage.getItem('instagram_voice_enabled') === 'true') {
                                        try { this.start(); } catch(e) { console.log("Autostart voz bloqueado"); }
                                    }
                                },
                                loadCommands: function() {
                                    const defaults = [
                                        { phrase: "baixar story", action: "downloadStory", description: "Baixa o story atual" },
                                        { phrase: "abrir configurações", action: "openSettings", description: "Abre configurações" },
                                        { phrase: "fechar menu", action: "closeMenu", description: "Fecha o menu" },
                                        { phrase: "rolar reels", action: "toggleReelsScroll", description: "Rolagem de Reels" },
                                        { phrase: "baixar reel", action: "downloadReel", description: "Baixa o Reel atual" },
                                        { phrase: "amigos próximos", action: "openCloseFriends", description: "Menu Amigos Próximos" },
                                        { phrase: "ocultar story", action: "openHideStory", description: "Menu Ocultar Story" },
                                        { phrase: "contas silenciadas", action: "openMuted", description: "Menu Contas Silenciadas" },
                                        { phrase: "não segue de volta", action: "openNotFollowingBack", description: "Análise Não Segue de Volta" },
                                        { phrase: "seguindo", action: "openFollowing", description: "Gerenciador Seguindo" },
                                        { phrase: "bloqueados", action: "openBlocked", description: "Lista de Bloqueados" },
                                        { phrase: "análise reels", action: "analyzeReels", description: "Análise de Reels" },
                                        { phrase: "engajamento", action: "openEngagement", description: "Dashboard Engajamento" },
                                        { phrase: "interações", action: "openInteractions", description: "Verificar Interações" }
                                    ];
                                    try {
                                        const saved = JSON.parse(localStorage.getItem('instagram_voice_commands'));
                                        this.commands = saved || defaults;
                                    } catch (e) { this.commands = defaults; }
                                },
                                saveCommands: function() {
                                    localStorage.setItem('instagram_voice_commands', JSON.stringify(this.commands));
                                },
                                start: function() {
                                    if (!this.recognition) this.init();
                                    if (this.recognition && !this.isListening) {
                                        try {
                                            this.recognition.start();
                                            this.isListening = true;
                                            localStorage.setItem('instagram_voice_enabled', 'true');
                                            console.log("Voz iniciada.");
                                        } catch(e) { console.error(e); }
                                    }
                                },
                                stop: function() {
                                    if (this.recognition && this.isListening) {
                                        this.recognition.stop();
                                        this.isListening = false;
                                        localStorage.setItem('instagram_voice_enabled', 'false');
                                        console.log("Voz parada.");
                                    }
                                },
                                toggle: function() {
                                    if (this.isListening) this.stop();
                                    else this.start();
                                    return this.isListening;
                                },
                                executeCommand: function(transcript) {
                                    const cmd = this.commands.find(c => transcript.includes(c.phrase.toLowerCase()));
                                    if (cmd) {
                                        console.log("Executando:", cmd.action);
                                        const toast = document.createElement('div');
                                        toast.innerText = `🎤 ${cmd.phrase}`;
                                        toast.style.cssText = "position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; z-index: 100000; font-size: 14px; pointer-events: none;";
                                        document.body.appendChild(toast);
                                        setTimeout(() => toast.remove(), 2000);

                                        switch(cmd.action) {
                                            case 'downloadStory': baixarStoryAtual(); break;
                                            case 'openSettings': abrirModalConfiguracoes(); break;
                                            case 'closeMenu': 
                                                const m = document.querySelector('.assistive-menu');
                                                if(m) m.style.display = 'none';
                                                break;
                                            case 'toggleReelsScroll': toggleRolagemAutomaticaReels(); break;
                                            case 'downloadReel': baixarReelAtual(); break;
                                            case 'openCloseFriends': abrirModalAmigosProximos(); break;
                                            case 'openHideStory': abrirModalOcultarStory(); break;
                                            case 'openMuted': abrirModalContasSilenciadas(); break;
                                            case 'openNotFollowingBack': iniciarProcessoNaoSegueDeVolta(); break;
                                            case 'openFollowing': iniciarProcessoSeguindo(); break;
                                            case 'openBlocked': iniciarProcessoBloqueados(); break;
                                            case 'analyzeReels': iniciarAnaliseReels(); break;
                                            case 'openEngagement': abrirModalEngajamento(); break;
                                            case 'openInteractions': abrirModalInteracoes(); break;
                                        }
                                    }
                                }
                            };

                            // --- Funções auxiliares ---
                            function findSidebarContainer() {
                                const homeLink = document.querySelector('a[href="/"]');
                                const exploreLink = document.querySelector('a[href="/explore/"]');
                                if (homeLink && exploreLink) {
                                    let parent = homeLink.parentElement;
                                    while (parent) {
                                        if (parent.contains(exploreLink)) return parent;
                                        parent = parent.parentElement;
                                    }
                                }
                                return document.querySelector('div.x78zum5.xaw8158.xh8yej3');
                            }

                            function findItemToClone(container, link) {
                                if (!container || !link) return null;
                                let element = link;
                                while (element && element.parentElement) {
                                    if (element.parentElement === container) return element;
                                    element = element.parentElement;
                                }
                                return null;
                            }

                            // Tenta encontrar o container da sidebar oficial usando o seletor fornecido
                            const sidebarContainer = findSidebarContainer();
                            if (!sidebarContainer) return; // Aguarda o carregamento da sidebar

                            // Add dynamic styles
                            if (!document.getElementById("dynamicMenuStyle")) {
                            const style = document.createElement("style");
                            style.id = "dynamicMenuStyle";
                            document.head.appendChild(style);

                            function updateColors() {
                                style.innerHTML = `
                                    .assistive-menu {
                                        position: fixed;
                                        top: 50%;
                                        left: 50%;
                                        transform: translate(-50%, -50%);
                                        display: none;
                                        flex-direction: column;
                                        gap: 10px;
                                        z-index: 2147483647;
                                        background: white;
                                        padding: 20px;
                                        border-radius: 12px;
                                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                        width: 300px;
                                        max-height: 80vh;
                                        overflow-y: auto;
                                    }
                                    .menu-item {
                                        display: flex;
                                        align-items: center;
                                        gap: 10px;
                                    }
                                    .menu-item button {
                                        width: 50px;
                                        height: 50px;
                                        border-radius: 50%;
                                        border: none;
                                        background: transparent;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        cursor: pointer;
                                        transition: background 0.2s;
                                        color: inherit;
                                    }
                                    .menu-item button:hover {
                                        background: rgba(0, 0, 0, 0.05);
                                        border-radius: 8px;
                                    }
                                    .menu-item span {
                                        font-size: 14px;
                                        color: black;
                                        font-weight: 500;
                                    }
                                    .submenu-modal {
                                        background: white;
                                        color: black;
                                    }
                                    .submenu-modal h2, .submenu-modal span, .submenu-modal th, .submenu-modal td, .submenu-modal li span, .submenu-modal label {
                                        color: black !important;
                                    }
                                    .dark-mode .assistive-menu {
                                        background: black !important;
                                        border: 1px solid #333;
                                    }
                                    .dark-mode .menu-item span {
                                        color: white !important;
                                    }
                                    .dark-mode .menu-item button {
                                        color: white;
                                    }
                                    .dark-mode .menu-item button:hover {
                                        background: rgba(255, 255, 255, 0.1);
                                    }
                                    .dark-mode #allCloseFriendsDiv {
                                        background: black;
                                        color: white;
                                    }
                                    .dark-mode #allHideStoryDiv {
                                        background: black;
                                        color: white;
                                    }
                                    .dark-mode #naoSegueDeVoltaDiv {
                                        background: black;
                                        color: white;
                                    }
                                    .dark-mode .submenu-modal {
                                        background: black !important;
                                        color: white !important;
                                    }
                                    .dark-mode .submenu-modal h2 {
                                        color: white !important;
                                    }
                                    .dark-mode .submenu-modal span, .dark-mode .submenu-modal th, .dark-mode .submenu-modal td, .dark-mode .submenu-modal li span, .dark-mode .submenu-modal a, .dark-mode .submenu-modal label, .dark-mode .submenu-modal input[type="file"] {
                                        color: white !important;
                                    }
                                    .menu-item-button {
                                        background: #f8f9fa; border: 1px solid #dbdbdb; padding: 10px; border-radius: 8px; cursor: pointer; text-align: left; font-size: 16px; color: black;
                                    }
                                    .dark-mode #reelsSubmenuModal .menu-item-button {
                                        background: #262626 !important;
                                        color: white !important;
                                        border-color: #555 !important;
                                    }
                                    .tab-container {
                                        display: flex;
                                        border-bottom: 1px solid #dbdbdb;
                                        margin-bottom: 15px;
                                    }
                                    .tab-button {
                                        padding: 10px 20px;
                                        cursor: pointer;
                                        border: none;
                                        background-color: transparent;
                                        color: #8e8e8e;
                                        font-weight: 600;
                                    }
                                    .tab-button.active {
                                        color: #262626;
                                        border-bottom: 2px solid #262626;
                                    }
                                    .modal-header {
                                        display: flex;
                                        justify-content: space-between;
                                        align-items: center;
                                        padding: 10px;
                                        background-color: #f0f0f0;
                                        border-bottom: 1px solid #dbdbdb;
                                        cursor: move; /* Para arrastar a janela */
                                        border-top-left-radius: 10px;
                                        border-top-right-radius: 10px;
                                    }
                                    .dark-mode .modal-header {
                                        background-color: #262626;
                                        border-bottom: 1px solid #363636;
                                    }
                                    .modal-title { font-weight: bold; }
                                    .modal-controls button {
                                        background: none; border: none; font-size: 16px;
                                        cursor: pointer; padding: 5px;
                                        color: #8e8e8e;
                                    }
                                    @keyframes rgb-border-animation {
                                        0% { border-color: rgb(255, 0, 0); }
                                        15% { border-color: rgb(255, 128, 0); }
                                        30% { border-color: rgb(255, 255, 0); }
                                        45% { border-color: rgb(0, 255, 0); }
                                        60% { border-color: rgb(0, 128, 255); }
                                        75% { border-color: rgb(128, 0, 255); }
                                        90% { border-color: rgb(255, 0, 255); }
                                        100% { border-color: rgb(255, 0, 0); }
                                    }
                                    .rgb-border-effect {
                                        border-style: solid !important;
                                        border-width: 2px !important;
                                        animation: rgb-border-animation 5s linear infinite;
                                    }
                                    .info-tooltip { position: relative; display: inline-block; cursor: help; color: #8e8e8e; vertical-align: middle; }
                                    .info-tooltip .tooltip-text { visibility: hidden; width: 220px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 8px; position: absolute; z-index: 100000; top: 100%; margin-top: 10px; left: 50%; margin-left: -110px; opacity: 0; transition: opacity 0.3s; font-size: 12px; font-weight: normal; line-height: 1.4; box-shadow: 0 2px 10px rgba(0,0,0,0.2); pointer-events: none; }
                                    .info-tooltip .tooltip-text::after { content: ""; position: absolute; bottom: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: transparent transparent #333 transparent; }
                                    .info-tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }
                                `;
                            }

                            updateColors();
                            }

                            // Create menu
                            let menu = document.querySelector('.assistive-menu');
                            if (!menu) {
                                menu = document.createElement("div");
                            menu.className = "assistive-menu";
                            menu.innerHTML = `
                                <div class="menu-item">
                                    <button id="curtidasBtn"><svg aria-label="Curtidas" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.843.118 3.377.135 4.234-.149a4.21 4.21 0 0 1 1.675-1.792z"></path></svg></button>
                                    <span>${getText('likes')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="comentariosBtn"><svg aria-label="Comentários" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg></button>
                                    <span>${getText('comments')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="bloqueadosBtn"><svg aria-label="Bloqueados" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle><line x1="4.93" y1="19.07" x2="19.07" y2="4.93" stroke="currentColor" stroke-width="2"></line></svg></button>
                                    <span>${getText('blocked')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="mensagensBtn"><svg aria-label="Mensagens" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="22" x2="9.218" y1="3" y2="10.083"></line><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></polygon></svg></button>
                                    <span>${getText('messages')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="naoSegueDeVoltaBtn"><svg aria-label="Não segue de volta" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8z"></path><path d="M15.5 11h-7a1 1 0 0 0 0 2h7a1 1 0 0 0 0-2z"></path></svg></button>
                                    <span>${getText('notFollowingBack')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="seguindoBtn"><svg aria-label="Seguindo" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12.004 12.002c3.309 0 6-2.691 6-6s-2.691-6-6-6-6 2.691-6 6 2.691 6 6 6zm0-10c2.206 0 4 1.794 4 4s-1.794 4-4 4-4-1.794-4-4 1.794-4 4-4zm0 12c-2.67 0-8 1.337-8 4v2h16v-2c0-2.663-5.33-4-8-4zm-6 4c.22-.72 3.02-2 6-2s5.78 1.28 6 2H6.004z"></path></svg></button>
                                    <span>${getText('following')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="closeFriendsBtn"><svg aria-label="Amigos Próximos" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" fill="none" r="10" stroke="currentColor" stroke-width="2"></circle><polygon points="12 16.63 7.85 19.33 9.15 14.48 5.24 11.24 10.19 10.96 12 6.38 13.81 10.96 18.76 11.24 14.85 14.48 16.15 19.33 12 16.63" fill="currentColor"></polygon></svg></button>
                                    <span>${getText('closeFriends')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="hideStoryBtn"><svg aria-label="Ocultar Story" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="none" stroke="currentColor" stroke-width="2"></path><line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="2"></line></svg></button>
                                    <span>${getText('hideStory')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="mutedAccountsBtn"><svg aria-label="Contas Silenciadas" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="none" stroke="currentColor" stroke-width="2"></path><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"></line><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"></line></svg></button>
                                    <span>${getText('mutedAccounts')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="interacoesBtn"><svg aria-label="Interações" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path></svg></button>
                                    <span>${getText('interactions')}</span>
                                </div>

                                <div class="menu-item">
                                    <button id="reelsMenuBtn"><svg aria-label="Reels" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12.87 1.51l-2.54 2.6-2.53-2.6a.86.86 0 0 0-.61-.25c-.23 0-.45.09-.61.25l-2.54 2.6-2.53-2.6A.86.86 0 0 0 .9 1.26c-.23 0-.45.09-.61.25L.1 1.7a.88.88 0 0 0 0 1.23l2.54 2.6-2.53 2.6a.88.88 0 0 0 0 1.23l.19.19c.16.16.38.25.61.25.23 0 .45-.09.61-.25l2.54-2.6 2.53 2.6c.16.16.38.25.61.25.23 0 .45-.09.61-.25l2.54-2.6 2.53 2.6c.16.16.38.25.61.25.23 0 .45-.09.61-.25l.19-.19a.88.88 0 0 0 0-1.23l-2.53-2.6 2.53-2.6a.88.88 0 0 0 0-1.23l-.19-.19a.86.86 0 0 0-.61-.25z" fill="currentColor"></path><rect height="16" rx="3" ry="3" width="18" x="3" y="7" fill="none" stroke="currentColor" stroke-width="2"></rect></svg></button>
                                    <span>${getText('reelsMenu')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="baixarStoryBtn"><svg aria-label="Baixar Story" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg></button>
                                    <span>${getText('downloadStory')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="engajamentoBtn"><svg aria-label="Engajamento" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"></path></svg></button>
                                    <span>${getText('engagement')}</span>
                                </div>
                                <div class="menu-item">
                                    <button id="settingsBtn"><svg aria-label="Configurações" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" stroke-width="2"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.09 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"></path></svg></button>
                                    <span>${getText('settings')}</span>
                                </div>
                            `;

                            document.body.appendChild(menu);
                            }

                            // Fechar submenu ao clicar fora (Comportamento nativo)
                            if (!document.body.dataset.menuClickListenerAttached) {
                                document.addEventListener('click', (e) => {
                                    const menu = document.querySelector('.assistive-menu');
                                    const btn = document.getElementById('instagramToolsSidebarBtn');
                                    if (menu && menu.style.display === 'flex') {
                                        // Se o clique não foi no menu nem no botão que o abre
                                        if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                                            menu.style.display = 'none';
                                        }
                                    }
                                });
                                document.body.dataset.menuClickListenerAttached = 'true';
                            }

                            const homeLink = sidebarContainer.querySelector('a[href="/"]');
                            const itemToClone = findItemToClone(sidebarContainer, homeLink);


                            if (itemToClone) {
                                const newItem = itemToClone.cloneNode(true);
                                const link = newItem.querySelector('a');
                                if (link) {
                                    link.id = "instagramToolsSidebarBtn";
                                    link.href = "#";
                                    link.removeAttribute('aria-label');

                                    // Substitui o ícone original pelo ícone de engrenagem
                                    const svg = link.querySelector('svg');
                                    if (svg) {
                                        // SVG de Engrenagem estilo Instagram
                                        const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                                        newSvg.setAttribute("aria-label", "Ferramentas");
                                        newSvg.setAttribute("class", "x1lliihq x1n2onr6 x5n08af");
                                        newSvg.setAttribute("fill", "currentColor");
                                        newSvg.setAttribute("height", "24");
                                        newSvg.setAttribute("role", "img");
                                        newSvg.setAttribute("viewBox", "0 0 24 24");
                                        newSvg.setAttribute("width", "24");
                                        newSvg.innerHTML = '<circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" stroke-width="2"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.09 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"></path>';
                                        svg.replaceWith(newSvg);
                                    }

                                    // Adiciona o texto "IG Tools" (para visualização PC)
                                    // Procura por elementos de texto dentro do link clonado de forma mais abrangente
                                    const allDescendants = link.querySelectorAll('*');
                                    allDescendants.forEach(el => {
                                        // Verifica se é um elemento folha (sem filhos tags)
                                        if (el.children.length === 0 && el.textContent.trim().length > 0) {
                                            // Ignora se estiver dentro de um SVG ou for o próprio SVG
                                            if (el.closest('svg')) return;

                                            const text = el.textContent.trim();
                                            // Ignora números (notificações) e textos muito curtos
                                            if (isNaN(parseInt(text)) && text.length > 1) {
                                                el.textContent = "IG Tools";
                                            }
                                        }
                                    });

                                    link.addEventListener("click", (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        // Lógica de posicionamento inteligente (PC vs Mobile)
                                        const isDesktop = window.innerWidth >= 1024;
                                        if (isDesktop) {
                                            const sidebar = findSidebarContainer();
                                            const rect = sidebar ? sidebar.getBoundingClientRect() : { right: 72 };
                                            menu.style.left = (rect.right + 15) + 'px';
                                            menu.style.bottom = '20px';
                                            menu.style.top = 'auto';
                                            menu.style.transform = 'none';
                                        } else {
                                            menu.style.left = '50%';
                                            menu.style.top = '50%';
                                            menu.style.bottom = 'auto';
                                            menu.style.transform = 'translate(-50%, -50%)';
                                        }

                                        menu.style.display = menu.style.display === "flex" ? "none" : "flex";
                                    });
                                }
                                sidebarContainer.appendChild(newItem);
                            }

                            function closeMenu() {
                                menu.style.display = 'none';
                            }

                            // Functionality for buttons
                            let usernames = new Set();
                            let downloadStarted = false;
                            let scrollInterval; // Variável global para armazenar o intervalo
                            let isUnfollowing = false; // Flag para prevenir múltiplas execuções
                            let currentExtraction = ''; // Para rastrear se é seguidores ou seguindo
                            let isDarkMode = false;
                            let isReelsScrolling = false;
                            let currentVideoEndedListener = null;
                            let reelsScrollInterval = null;

                            // Cache global para listas de usuários, para evitar buscas repetidas
                            const userListCache = {
                                muted: null,       // Será um Set de usernames
                                closeFriends: null,  // Será um Set de usernames
                                hiddenStory: null    // Será um Set de usernames
                            };

                            function extractUsernames() {
                                document
                                    .querySelectorAll('a[href^="/"][role="link"]')
                                    .forEach((a) => {
                                        if (
                                            a.innerText.trim() &&
                                            ![
                                                "Página inicial",
                                                "Reels",
                                                "Explorar",
                                                "Messenger",
                                                "Notificações",
                                                "Criar",
                                                "Pesquisar",
                                                "Mais",
                                                "Editar perfil",
                                                "Itens Arquivados",
                                                "seguidores",
                                                "seguindo",
                                                "Privacidade",
                                                "Termos",
                                                "Instagram Lite",
                                                "Meta Verified",
                                                "outras pessoas",
                                                "Ver todos os 2 comentários",
                                                "Localizações",
                                            ].includes(a.innerText.trim())
                                        ) {
                                            usernames.add(a.innerText.trim());
                                        }
                                    });
                            }

                            function getTotalFollowersOrFollowing(type) {
                                // Encontra o cabeçalho principal da página de perfil.
                                const header = document.querySelector('main header');
                                if (!header) return 1;

                                // Encontra todos os itens da lista de estatísticas (Posts, Seguidores, Seguindo).
                                const stats = header.querySelectorAll('ul li');
                                let targetStatElement;

                                if (type === 'followers') {
                                    // Encontra o item que contém o texto "seguidores".
                                    targetStatElement = Array.from(stats).find(li => li.innerText.toLowerCase().includes('seguidores'));
                                } else if (type === 'following') {
                                    // Encontra o item que contém o texto "seguindo".
                                    targetStatElement = Array.from(stats).find(li => li.innerText.toLowerCase().includes('seguindo'));
                                }

                                if (targetStatElement) {
                                    // Prioridade 1: Tenta encontrar um <span> com um atributo 'title', que geralmente tem o número exato.
                                    const titleSpan = targetStatElement.querySelector('span[title]');
                                    if (titleSpan && titleSpan.title) {
                                        return parseInt(titleSpan.title.replace(/\D/g, ''), 10) || 1;
                                    }
                                    // Prioridade 2 (Fallback): Extrai o número do texto visível.
                                    const numberString = targetStatElement.innerText.split(' ')[0].replace(/\./g, '').replace(/,/g, '');
                                    return parseInt(numberString, 10) || 1;
                                }
                                return 1; // Retorna 1 como fallback para evitar divisão por zero
                            }

                            function updateProgressBar(progress, total, message = "") {
                                let bar = document.getElementById("progressBar");
                                let fill = document.getElementById("progressFill");
                                let text = document.getElementById("progressText");
                                let closeButton = document.getElementById("progressCloseBtn");

                                if (!bar) {
                                    bar = document.createElement("div");
                                    bar.id = "progressBar";
                                    bar.style.cssText =
                                        "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:9999;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";

                                    fill = document.createElement("div");
                                    fill.id = "progressFill";
                                    fill.style.cssText =
                                        "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";

                                    text = document.createElement("div");
                                    text.id = "progressText";
                                    text.style.position = "relative";
                                    text.innerText = "0%";

                                    closeButton = document.createElement("button");
                                    closeButton.id = "progressCloseBtn";
                                    closeButton.innerText = "Fechar";
                                    closeButton.style.cssText =
                                        "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";

                                    closeButton.addEventListener("click", () => {
                                        if (scrollInterval) {
                                            clearInterval(scrollInterval); // Interrompe o processo de rolagem
                                            scrollInterval = null; // Reseta a variável
                                        }
                                        bar.remove(); // Remove a barra de progresso
                                        alert("Processo interrompido pelo usuário.");
                                    });

                                    bar.appendChild(fill);
                                    bar.appendChild(text);
                                    bar.appendChild(closeButton);
                                    document.body.appendChild(bar);
                                }

                                const percent = Math.min((progress / total) * 100, 100);

                                // Atualizar a barra de progresso
                                fill.style.width = percent + "%";
                                text.innerText = `${Math.floor(percent)}% (${progress}/${total})`;
                            }

                            function startScroll(totalCount, onProgress) {
                                const scrollDiv = document.querySelector(
                                    "body > div.x1n2onr6.xzkaem6 > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z > div > div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div.x7r02ix.xf1ldfh.x131esax.xdajt7p.xxfnqb6.xb88tzc.xw2csxc.x1odjw0f.x5fp0pe > div > div > div.xyi19xy.x1ccrb07.xtf3nb5.x1pc53ja.x1lliihq.x1iyjqo2.xs83m0k.xz65tgg.x1rife3k.x1n2onr6"
                                );

                                if (!scrollDiv) {
                                    alert("Div com scroll não encontrada.");
                                    return;
                                }

                                let waitTime = 0;
                                scrollInterval = setInterval(() => {
                                    extractUsernames();
                                    onProgress(usernames.size, totalCount);

                                    if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight) {
                                        waitTime += 2;
                                        if (waitTime >= 10) {
                                            clearInterval(scrollInterval);
                                            onProgress(usernames.size, totalCount, " - Concluído!");
                                        }
                                    } else {
                                        scrollDiv.scrollTop = scrollDiv.scrollHeight;
                                        waitTime = 0;
                                    }
                                }, 2000);
                            }

                            function startDownload() {
                                const csv = "Username\n" + [...usernames].join("\n");
                                const a = document.createElement("a");
                                a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
                                a.download = currentExtraction + ".csv";
                                a.click();
                                // Remove a barra de progresso após o download
                                let bar = document.getElementById("progressBar");
                                if (bar) bar.remove();
                            }

                            /**
                             * Cria uma barra de progresso com um botão de cancelar.
                             * @param {function} onCancel - Callback a ser executado quando o botão de cancelar é clicado.
                             * @returns {object} - Um objeto com as funções { update, remove }.
                             */
                            function createCancellableProgressBar() {
                                document.getElementById("cancellableProgressBar")?.remove();

                                const bar = document.createElement("div");
                                bar.id = "cancellableProgressBar";
                                bar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:2147483647;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";

                                const fill = document.createElement("div");
                                fill.style.cssText = "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";

                                const text = document.createElement("div");
                                text.style.position = "relative";

                                const closeButton = document.createElement("button");
                                closeButton.innerText = "Cancelar";
                                closeButton.style.cssText = "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";

                                bar.appendChild(fill);
                                bar.appendChild(text);
                                bar.appendChild(closeButton);
                                document.body.appendChild(bar);

                                const update = (current, total, message = '') => {
                                    const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
                                    fill.style.width = `${percent}%`;
                                    text.innerText = `${message} ${Math.floor(percent)}% (${current}/${total})`;
                                };

                                return { bar, update, closeButton };
                            }

                            document
                                .getElementById("curtidasBtn")
                                .addEventListener("click", (e) => {
                                    e.preventDefault();
                                    history.pushState(null, null, "/your_activity/interactions/likes/");
                                    window.dispatchEvent(new Event("popstate"));
                                });

                            document
                                .getElementById("comentariosBtn")
                                .addEventListener("click", (e) => {
                                    e.preventDefault();
                                    history.pushState(null, null, "/your_activity/interactions/comments/");
                                    window.dispatchEvent(new Event("popstate"));
                                });

                            document
                                .getElementById("mensagensBtn")
                                .addEventListener("click", (e) => {
                                    e.preventDefault();
                                    history.pushState(null, null, "/direct/inbox/");
                                    window.dispatchEvent(new Event("popstate"));
                                });

                            document
                                .getElementById("bloqueadosBtn")
                                .addEventListener("click", (e) => {
                                    closeMenu();
                                    iniciarProcessoBloqueados();
                                });

                            document.getElementById("naoSegueDeVoltaBtn").addEventListener("click", () => {
                                closeMenu();
                                iniciarProcessoNaoSegueDeVolta();
                            });

                            document.getElementById("seguindoBtn").addEventListener("click", () => {
                                closeMenu();
                                iniciarProcessoSeguindo();
                            });

                            document.getElementById("seguindoBtn").addEventListener("click", () => {
                                closeMenu();
                                iniciarProcessoSeguindo();
                            });

                            // --- NOVO MENU: AMIGOS PRÓXIMOS ---
            document.getElementById("closeFriendsBtn").addEventListener("click", () => {
                closeMenu();
                console.log("Botão Amigos Próximos clicado");
                // Direcionar para a página de amigos próximos se não estiver lá
                if (window.location.pathname !== "/accounts/close_friends/") {
                    console.log("Navegando para /accounts/close_friends/");
                    history.pushState(null, null, "/accounts/close_friends/");
                    window.dispatchEvent(new Event("popstate"));
                    // Abrir o modal independente do resultado da função buscarUsernames
                    setTimeout(() => {
                        console.log("Abrindo modal após navegação");
                        abrirModalAmigosProximos();
                    }, 1000);
                } else {
                    console.log("Já na página /accounts/close_friends/, abrindo modal");
                    abrirModalAmigosProximos();
                }
            });

            // --- NOVO MENU: OCULTAR STORY ---
                            document.getElementById("hideStoryBtn").addEventListener("click", () => {
                closeMenu();
                console.log("Botão Ocultar Story clicado");
                // Direcionar para a página de ocultar story se não estiver lá
                if (window.location.pathname !== "/accounts/hide_story_and_live_from/") {
                    console.log("Navegando para /accounts/hide_story_and_live_from/");
                    history.pushState(null, null, "/accounts/hide_story_and_live_from/");
                    window.dispatchEvent(new Event("popstate"));
                    // Abrir o modal independente do resultado da função buscarUsernames
                    setTimeout(() => {
                        console.log("Abrindo modal após navegação");
                        abrirModalOcultarStory();
                    }, 1000);
                } else {
                    console.log("Já na página /accounts/hide_story_and_live_from/, abrindo modal");
                    abrirModalOcultarStory();
                }
            });

            document.getElementById("mutedAccountsBtn").addEventListener("click", () => {
                closeMenu();
                console.log("Botão Contas Silenciadas clicado");
                if (window.location.pathname !== "/accounts/muted_accounts/") {
                    console.log("Navegando para /accounts/muted_accounts/");
                    history.pushState(null, null, "/accounts/muted_accounts/");
                    window.dispatchEvent(new Event("popstate"));
                    setTimeout(() => {
                        abrirModalContasSilenciadas();
                    }, 1000);
                } else {
                    abrirModalContasSilenciadas();
                }
            });

                                document.getElementById("interacoesBtn").addEventListener("click", () => {
                                    closeMenu();
                                    abrirModalInteracoes();
                                });

            // --- NOVO MENU: REELS ---
            document.getElementById("reelsMenuBtn").addEventListener("click", () => {
                closeMenu();
                abrirModalReels();
            });
            document.getElementById("baixarStoryBtn").addEventListener("click", () => { baixarStoryAtual(); });

            document.getElementById("settingsBtn").addEventListener("click", () => {
                closeMenu();
                abrirModalConfiguracoes();
            });

            document.getElementById("engajamentoBtn").addEventListener("click", () => {
                closeMenu();
                abrirModalEngajamento();
            });

            function extractCloseFriendsUsernames(doc = document) {
                return new Promise((resolve) => {
                    const maxAttempts = 20;
                    let attempts = 0;

                    function tryExtract() {
                        attempts++;
                        const users = [];
                        // Select all elements with data-bloks-name="bk.components.Flexbox" that contain spans with data-bloks-name="bk.components.Text"
                        const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                            el.querySelector('span[data-bloks-name="bk.components.Text"]')
                        );

                        if (userElements.length === 0) {
                            console.log("No user elements found for close friends usernames, attempt", attempts);
                            if (attempts < maxAttempts) {
                                setTimeout(tryExtract, 500);
                            } else {
                                resolve(users);
                            }
                            return;
                        }

                        console.log("User elements found:", userElements.length);

                        for (let i = 0; i < userElements.length; i++) {
                            const userElement = userElements[i];
                            let username = "";
                            let photoUrl = "";
                            const usernameSpan = userElement.querySelector('span[data-bloks-name="bk.components.Text"]');
                            if (usernameSpan) {
                                username = usernameSpan.innerText.trim();
                            } else {
                                username = userElement.innerText.trim().split('\n')[0];
                            }
                            // Try to find an img tag or div with background-image for photo inside userElement
                            const imgTag = userElement.querySelector('img');
                            if (imgTag && imgTag.src) {
                                photoUrl = imgTag.src;
                            } else {
                                // Try to find div with background-image style
                                const bgDiv = userElement.querySelector('div[style*="background-image"]');
                                if (bgDiv) {
                                    const bgStyle = bgDiv.style.backgroundImage;
                                    const match = bgStyle.match(/url\\(["']?(.*?)["']?\\)/);
                                    if (match && match[1]) {
                                        photoUrl = match[1];
                                    }
                                }
                            }
                            if (
                                username.length > 0 &&
                                !username.includes(" ") &&
                                photoUrl && // Apenas adiciona se tiver foto
                                !users.some(u => u.username === username) &&
                                /^[a-zA-Z0-9_.]+$/.test(username)
                            ) {
                                users.push({ username, photoUrl });
                            }
                        }
                        console.log("Extracted users:", users);
                        resolve(users);
                    }

                    tryExtract();
                });
            }

            async function abrirModalAmigosProximos() {
                if (modalAberto) return; // Se modal já aberto, não faz nada

                modalAberto = true; // Marca que modal foi aberto para evitar loop infinito

                // Extract users asynchronously (username and photoUrl)
                const users = await extractCloseFriendsUsernames();

                // Monta a div
                const div = document.createElement("div");
                div.id = "allCloseFriendsDiv";
                div.className = "submenu-modal";
                div.style.cssText = `
                    position: fixed;
                    top: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70vw;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: auto;
                    border: 2px solid #0095f6;
                    border-radius: 10px;
                    z-index: 2147483647;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

                const itemsPerPage = loadSettings().itemsPerPage;
                let currentPage = 1;
                let currentTab = 'nao_selecionados'; // 'selecionados' or 'nao_selecionados'

                // Cache official checkbox states for performance
                const officialCheckboxStates = new Map();
                const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                flexboxes.forEach(flex => {
                    const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                    if (userText) {
                        const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                        if (officialCheckboxContainer) {
                            const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                            const style = window.getComputedStyle(iconDiv);
                            const bgColor = style.backgroundColor;
                            const mask = style.maskImage || style.webkitMaskImage;
                            const bgImg = style.backgroundImage;
                            const isChecked = (bgColor === "rgb(0, 149, 246)" || bgColor === "rgb(74, 93, 249)" || (bgImg && bgImg.includes('circle-check__filled')) || (mask && mask.includes('circle-check__filled')));
                            officialCheckboxStates.set(userText, isChecked);
                        }
                    }
                });

                // Filtra e armazena no cache APENAS os usuários que estão realmente marcados
                const closeFriendsUsernames = users
                    .filter(u => officialCheckboxStates.get(u.username) === true)
                    .map(u => u.username);
                userListCache.closeFriends = new Set(closeFriendsUsernames);
                console.log(`Cache atualizado com ${userListCache.closeFriends.size} melhores amigos.`);

                // Gerenciamento de estado para os checkboxes do modal, similar a "Ocultar Story"
                const modalStates = new Map();
                users.forEach(({ username }) => {
                    modalStates.set(username, officialCheckboxStates.get(username) || false);
                });

                // Armazena os estados iniciais para comparar no "Aplicar"
                const initialStates = new Map(modalStates);

                function renderPage(page) {
                    let html = `
                        <div class="modal-header">
                            <span class="modal-title">
                                Amigos Próximos
                                <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie sua lista de Melhores Amigos. Selecione quem pode ver seus stories exclusivos (círculo verde).</span></div>
                            </span>
                            <div class="modal-controls"><button id="closeFriendsMinimizarBtn" title="Minimizar">_</button><button id="closeFriendsFecharBtn" title="Fechar">X</button></div>
                        </div>`;
                    html += `
                        <div style="padding: 15px;">
                            <button id="closeFriendsMarcarTodosBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                            <button id="closeFriendsDesmarcarTodosBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                            <button id="closeFriendsAplicarBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Aplicar</button>
                        </div>
                        <div style="margin-bottom:15px;">
                            <input type="text" id="closeFriendsSearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                        </div>
                        <div class="tab-container">
                            <button id="tabSelecionados" class="tab-button ${currentTab === 'selecionados' ? 'active' : ''}">Melhores Amigos</button>
                            <button id="tabNaoSelecionados" class="tab-button ${currentTab === 'nao_selecionados' ? 'active' : ''}">Amigos</button>
                        </div>
                        <ul id="closeFriendsList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
                    `;

                    // Filter users based on tab
                    let filteredUsers = users;
                    if (currentTab === 'selecionados') {
                        filteredUsers = users.filter(({
                            username
                        }) => {
                            return modalStates.get(username) === true;
                        });
                    } else if (currentTab === 'nao_selecionados') {
                        filteredUsers = users.filter(({
                            username
                        }) => !modalStates.get(username));
                    }

                    const startIndex = (page - 1) * itemsPerPage;
                    const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                    const pageUsers = filteredUsers.slice(startIndex, endIndex);

                    pageUsers.forEach(({ username, photoUrl }, idx) => {
                        const isChecked = modalStates.get(username) || false;

                        html += `
                            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                                <label class="custom-checkbox" for="cfcb_${username}" style="margin:0;">
                                    <input type="checkbox" class="closeFriendCheckbox" id="cfcb_${username}" data-username="${username}" ${isChecked ? "checked" : ""}>
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="cursor:pointer; color: black;">${username}</span>
                            </li>
                        `;
                    });
                    html += "</ul>";
                    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                    html += `<div id="paginationControls" style="margin-top:20px; display:flex; justify-content:center; align-items:center; gap:10px;">`;
                    if (totalPages > 1) {
                        if (page > 1) html += `<button id="prevPageBtn">Anterior</button>`;
                        html += `<span style="font-weight:bold;">Página ${page} de ${totalPages}</span>`;
                        if (page < totalPages) html += `<button id="nextPageBtn">Próximo</button>`;
                    }
                    html += `</div>`;
                    div.innerHTML = html;
                    document.body.appendChild(div);

                    document.getElementById("closeFriendsFecharBtn").onclick = () => {
                        div.remove();
                        modalAberto = false;
                    };
                    document.getElementById("closeFriendsMinimizarBtn").onclick = () => {
                        const modal = document.getElementById('allCloseFriendsDiv');
                        const contentToToggle = [
                            modal.querySelector('input[type="text"]'),
                            modal.querySelector('.tab-container'),
                            modal.querySelector('ul'),
                            modal.querySelector('#paginationControls')
                        ].filter(Boolean);

                        const btn = document.getElementById('closeFriendsMinimizarBtn');
                        const isMinimized = modal.dataset.minimized === 'true';

                        contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');

                        modal.dataset.minimized = !isMinimized;
                        btn.textContent = isMinimized ? 'Minimizar' : 'Maximizar';
                        modal.style.maxHeight = isMinimized ? '85vh' : 'none';
                    };

                    document.getElementById("closeFriendsMarcarTodosBtn").onclick = () => {
                        // Filtra os usuários da aba atual e depois pega apenas os da página visível
                        const filteredUsers = users.filter(({ username }) => {
                            return currentTab === 'selecionados' ? modalStates.get(username) : !modalStates.get(username);
                        });
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                        const pageUsers = filteredUsers.slice(startIndex, endIndex);

                        pageUsers.forEach(({ username }) => modalStates.set(username, true));
                        renderPage(currentPage);
                    };
                    document.getElementById("closeFriendsDesmarcarTodosBtn").onclick = () => {
                        // Filtra os usuários da aba atual e depois pega apenas os da página visível
                        const filteredUsers = users.filter(({ username }) => {
                            return currentTab === 'selecionados' ? modalStates.get(username) : !modalStates.get(username);
                        });
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                        const pageUsers = filteredUsers.slice(startIndex, endIndex);

                        pageUsers.forEach(({ username }) => modalStates.set(username, false));
                        renderPage(currentPage);
                    };

                    const searchInput = document.getElementById("closeFriendsSearchInput");
                    searchInput.addEventListener("input", () => {
                        const filter = searchInput.value.toLowerCase();
                        const listItems = div.querySelectorAll("#closeFriendsList li");
                        listItems.forEach(li => {
                            // Seletor ajustado para ser mais específico
                            const usernameSpan = li.querySelector('span[style*="cursor:pointer"]');
                            if (usernameSpan) {
                                const text = usernameSpan.textContent.toLowerCase();
                                li.style.display = text.includes(filter) ? "" : "none";
                            }
                        });
                    });

                    document.getElementById("tabSelecionados").onclick = () => {
                        if (currentTab !== 'selecionados') {
                            currentTab = 'selecionados';
                            currentPage = 1;
                            renderPage(currentPage);
                        }
                    };
                    document.getElementById("tabNaoSelecionados").onclick = () => {
                        if (currentTab !== 'nao_selecionados') {
                            currentTab = 'nao_selecionados';
                            currentPage = 1;
                            renderPage(currentPage);
                        }
                    };

                    const prevBtn = document.getElementById("prevPageBtn");
                    if (prevBtn) prevBtn.onclick = () => {
                        currentPage--;
                        renderPage(currentPage);
                    };
                    const nextBtn = document.getElementById("nextPageBtn");
                    if (nextBtn) nextBtn.onclick = () => {
                        currentPage++;
                        renderPage(currentPage);
                    };

                    // Adiciona eventos para os checkboxes na página atual
                    document.querySelectorAll('.closeFriendCheckbox').forEach(cb => {
                        cb.addEventListener('change', () => {
                            modalStates.set(cb.dataset.username, cb.checked);
                        });
                    });

                    document.getElementById("closeFriendsAplicarBtn").onclick = async () => {
                        isApplyingChanges = true;
                        const changedUsers = Array.from(modalStates.entries()).filter(([username, checked]) => {
                            return initialStates.get(username) !== checked;
                        });
                        if (changedUsers.length === 0) {
                            alert("Nenhuma alteração para aplicar.");
                            isApplyingChanges = false;
                            return;
                        }

                        let cancelled = false;
                        const { bar, update, closeButton } = createCancellableProgressBar();
                        closeButton.onclick = () => {
                            cancelled = true;
                            isApplyingChanges = false;
                            bar.remove();
                            alert("Processo interrompido.");
                        };
                        const isCancelled = () => cancelled;

                        if (window.location.pathname !== "/accounts/close_friends/") {
                            history.pushState(null, null, "/accounts/close_friends/");
                            window.dispatchEvent(new Event("popstate"));
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        async function toggleOfficialCheckbox(username) {
                            return new Promise((resolve) => {
                                let attempts = 0;
                                function tryToggle() {
                                    attempts++;
                                    const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                                    let found = false;
                                    for (const flex of flexboxes) {
                                        const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                        if (userText === username) {
                                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                                            if (officialCheckboxContainer) {
                                                officialCheckboxContainer.click();
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (found || attempts >= 30) {
                                        resolve();
                                    } else {
                                        setTimeout(tryToggle, 300);
                                    }
                                }
                                tryToggle();
                            });
                        }
                        for (let i = 0; i < changedUsers.length; i++) {
                            if (isCancelled()) break;
                            update(i + 1, changedUsers.length, "Aplicando alterações:");
                            const [username, isChecked] = changedUsers[i];
                            await toggleOfficialCheckbox(username);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            // Atualiza o estado inicial para o próximo "Aplicar"
                            initialStates.set(username, isChecked);
                        }

                        bar.remove();
                        isApplyingChanges = false;
                    };

                    let isApplyingChanges = false;
                    setTimeout(() => {
                        const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                        flexboxes.forEach(flex => {
                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                            if (!officialCheckboxContainer) return;
                            if (officialCheckboxContainer._customSyncListener) return;
                            officialCheckboxContainer._customSyncListener = true;
                            officialCheckboxContainer.addEventListener("click", function () {
                                if (isApplyingChanges) return;
                                const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                const customCheckbox = document.querySelector(`.closeFriendCheckbox[data-username="${userText}"]`);
                                if (customCheckbox) {
                                    const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                    let isChecked = false;
                                    if (iconDiv) {
                                        const style = window.getComputedStyle(iconDiv);
                                        const mask = style.maskImage || style.webkitMaskImage;
                                        const bgImg = style.backgroundImage;
                                        isChecked = (style.backgroundColor === 'rgb(0, 149, 246)' || style.backgroundColor === 'rgb(74, 93, 249)' || (bgImg && bgImg.includes('circle-check__filled')) || (mask && mask.includes('circle-check__filled')));
                                    }
                                    if (customCheckbox.checked !== isChecked) {
                                        customCheckbox.checked = isChecked;
                                    }
                                }
                            });
                        });
                    }, 500);
                    const aplicarBtn = document.getElementById("closeFriendsAplicarBtn");
                    if (aplicarBtn) {
                        const originalHandler = aplicarBtn.onclick;
                        aplicarBtn.onclick = async function () {
                            isApplyingChanges = true;
                            if (originalHandler) {
                                await originalHandler.apply(this, arguments);
                            }
                            isApplyingChanges = false;
                        };
                    }
                }

                renderPage(currentPage);
            }

            let tentativasUser = 0;
            let modalAberto = false; // Flag para evitar loop infinito
                            // --- FIM DO MENU AMIGOS PRÓXIMOS ---

                            // --- NOVO MENU: OCULTAR STORY ---
            function extractHideStoryUsernames(doc = document) {
                 return new Promise((resolve) => {
                     const users = new Map(); // Usar Map para evitar duplicados e manter a ordem
                     let scrollInterval;
                     let noNewUsersCount = 0;
                     const maxIdleCount = 3; // Parar após 3 tentativas sem novos usuários (3 segundos)

                     let cancelled = false;
                     const { bar, update, closeButton } = createCancellableProgressBar();
                     closeButton.onclick = () => {
                         cancelled = true;
                         bar.remove();
                         finishExtraction();
                     };
                     update(0, 0, "Buscando e rolando a lista de usuários com story oculto...");

                     function finishExtraction() {
                         clearInterval(scrollInterval);
                         if (bar) bar.remove();
                         console.log(`Extração finalizada. Total de ${users.size} usuários encontrados.`);
                         // Se foi cancelado, retorna uma lista vazia para não abrir o modal.
                         resolve(cancelled ? [] : Array.from(users.values()));
                     }

                     function performScrollAndExtract() {
                         const initialUserCount = users.size;

                         // Seletor para os elementos que contêm o nome de usuário
                         const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                             el.querySelector('span[data-bloks-name="bk.components.Text"]')
                         );

                         if (userElements.length === 0 && users.size === 0) {
                             console.log("Nenhum usuário encontrado ainda, tentando novamente...");
                             return; // Continua tentando se a lista estiver vazia
                         }

                         userElements.forEach(userElement => {
                             const usernameSpan = userElement.querySelector('span[data-bloks-name="bk.components.Text"]');
                             const username = usernameSpan ? usernameSpan.innerText.trim() : '';
                             const imgTag = userElement.querySelector('img');

                             let isChecked = false;
                             const checkboxContainer = userElement.querySelector('div[role="button"][tabindex="0"]');
                             if (checkboxContainer) {
                                 const icon = checkboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                 if (icon) {
                                     const style = window.getComputedStyle(icon);
                                     const bg = style.backgroundColor;
                                     const mask = style.maskImage || style.webkitMaskImage;
                                     const bgImg = style.backgroundImage;
                                     if (bg === 'rgb(0, 149, 246)' || bg === 'rgb(74, 93, 249)' || (bgImg && bgImg.includes('circle-check__filled')) || (mask && mask.includes('circle-check__filled'))) {
                                         isChecked = true;
                                     }
                                 }
                             }

                             // Adiciona o usuário apenas se tiver um nome válido, uma foto e ainda não estiver na lista
                             if (username && imgTag && !users.has(username) && /^[a-zA-Z0-9_.]+$/.test(username)) {
                                 const photoUrl = imgTag.src;
                                 users.set(username, { username, photoUrl, isChecked });
                             } else if (users.has(username)) {
                                 const u = users.get(username);
                                 if (!u.isChecked && isChecked) {
                                     u.isChecked = true;
                                     users.set(username, u);
                                 }
                             }
                         });

                         update(users.size, users.size, `Encontrado(s) ${users.size} usuário(s)... Rolando...`);

                         // Lógica de parada: se não encontrar novos usuários por um tempo, para.
                         if (users.size === initialUserCount) {
                             noNewUsersCount++;
                         } else {
                             noNewUsersCount = 0; // Reseta o contador se encontrar novos usuários
                         }

                         if (noNewUsersCount >= maxIdleCount) {
                             console.log("Nenhum novo usuário encontrado após várias tentativas. Finalizando.");
                             finishExtraction();
                             return;
                         }

                         // Simula a rolagem da janela principal
                         window.scrollTo(0, document.body.scrollHeight);
                     }

                     // Inicia o processo de rolagem e extração
                     scrollInterval = setInterval(performScrollAndExtract, 1000); // Rola e extrai a cada 1 segundo
                 });
            }

            async function abrirModalOcultarStory() {
                if (modalAbertoStory) return;
                modalAbertoStory = true;

                const users = await extractHideStoryUsernames();

                // Se a extração foi cancelada ou não encontrou usuários, não abre o modal.
                if (users.length === 0) {
                    modalAbertoStory = false; // Permite abrir novamente
                    return;
                }

                const officialStates = new Map();
                users.forEach(u => {
                    officialStates.set(u.username, u.isChecked || false);
                });
                const modalStates = new Map(officialStates);
            const itemsPerPage = loadSettings().itemsPerPage;
                let currentPage = 1;
                const div = document.createElement("div");
                div.id = "allHideStoryDiv";
                div.className = "submenu-modal";
                div.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70vw;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: auto;
                    border: 2px solid #f39c12;
                    border-radius: 10px;
                    z-index: 2147483647;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

            // Filtra e armazena no cache APENAS os usuários que estão realmente marcados
            const hiddenStoryUsernames = users
                .filter(u => modalStates.get(u.username) === true)
                .map(u => u.username);
            userListCache.hiddenStory = new Set(hiddenStoryUsernames);
            console.log(`Cache atualizado com ${userListCache.hiddenStory.size} usuários com story oculto.`);

            let currentTab = 'ocultados'; // 'ocultados' ou 'amigos'

                function renderPage(page) {
                    let html = `
                        <div class="modal-header">
                            <span class="modal-title">
                                Ocultar Story
                                <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Selecione usuários para ocultar seus stories e lives. Eles não saberão que foram ocultados.</span></div>
                            </span>
                            <div class="modal-controls"><button id="hideStoryMinimizarBtn" title="Minimizar">_</button><button id="hideStoryFecharBtn" title="Fechar">X</button></div>
                        </div>`;
                    html += `
                        <div style="padding: 15px;">
                            <button id="hideStoryMarcarTodosBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                            <button id="hideStoryDesmarcarTodosBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                            <button id="hideStoryAplicarBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Aplicar</button>
                        </div>
                        <div style="margin-bottom:15px;">
                            <input type="text" id="hideStorySearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                        </div>
                    <div class="tab-container">
                        <button id="tabOcultados" class="tab-button ${currentTab === 'ocultados' ? 'active' : ''}">Ocultados</button>
                        <button id="tabAmigos" class="tab-button ${currentTab === 'amigos' ? 'active' : ''}">Amigos</button>
                    </div>
                        <ul id="hideStoryList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
                    `;

                // Filtra usuários com base na aba
                let filteredUsers;
                if (currentTab === 'ocultados') {
                    filteredUsers = users.filter(({ username }) => modalStates.get(username));
                } else { // amigos
                    filteredUsers = users.filter(({ username }) => !modalStates.get(username));
                }

                // Filtra por pesquisa
                const searchTerm = document.getElementById('hideStorySearchInput')?.value.toLowerCase() || '';
                if (searchTerm) {
                    filteredUsers = filteredUsers.filter(({ username }) => username.toLowerCase().includes(searchTerm));
                }

                    const startIndex = (page - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                const pageUsers = filteredUsers.slice(startIndex, endIndex);

                    pageUsers.forEach(({ username, photoUrl }, idx) => {
                        const isChecked = modalStates.get(username) || false;
                        html += `
                            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                            <label class="custom-checkbox" for="hsb_${username}" style="margin:0;">
                                <input type="checkbox" class="hideStoryCheckbox" id="hsb_${username}" data-username="${username}" ${isChecked ? "checked" : ""}>
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="cursor:pointer; color: black;">${username}</span>
                            </li>
                        `;
                    });
                    html += "</ul>";
                const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                    html += `<div id="paginationControls" style="margin-top:20px; display:flex; justify-content:center; align-items:center; gap:10px;">`;
                    if (totalPages > 1) {
                        if (page > 1) html += `<button id="prevPageBtn">Anterior</button>`;
                        html += `<span style="font-weight:bold;">Página ${page} de ${totalPages}</span>`;
                        if (page < totalPages) html += `<button id="nextPageBtn">Próximo</button>`;
                    }
                    html += `</div>`;
                    div.innerHTML = html;
                    document.body.appendChild(div);
                    document.getElementById("hideStoryFecharBtn").onclick = () => {
                        div.remove();
                        modalAbertoStory = false;
                    };
                    document.getElementById("hideStoryMinimizarBtn").onclick = () => {
                        const modal = document.getElementById('allHideStoryDiv');
                        const contentToToggle = [
                            modal.querySelector('input[type="text"]'),
                            modal.querySelector('.tab-container'),
                            modal.querySelector('ul'),
                            modal.querySelector('#paginationControls')
                        ].filter(Boolean);

                        const btn = document.getElementById('hideStoryMinimizarBtn');
                        const isMinimized = modal.dataset.minimized === 'true';

                        contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');

                        modal.dataset.minimized = !isMinimized;
                        btn.textContent = isMinimized ? 'Minimizar' : 'Maximizar';
                        modal.style.maxHeight = isMinimized ? '85vh' : 'none';
                    };
                    document.getElementById("hideStoryMarcarTodosBtn").onclick = () => {
                    pageUsers.forEach(({ username }) => modalStates.set(username, true));
                    renderPage(currentPage);
                    };
                    document.getElementById("hideStoryDesmarcarTodosBtn").onclick = () => {
                    pageUsers.forEach(({ username }) => modalStates.set(username, false));
                    renderPage(currentPage);
                    };
                    const searchInput = document.getElementById("hideStorySearchInput");
                    searchInput.addEventListener("input", () => {
                    currentPage = 1;
                    renderPage(currentPage);
                });

                // Eventos das abas
                document.getElementById("tabOcultados").onclick = () => {
                    if (currentTab !== 'ocultados') {
                        currentTab = 'ocultados';
                        currentPage = 1;
                        renderPage(currentPage);
                    }
                };
                document.getElementById("tabAmigos").onclick = () => {
                    if (currentTab !== 'amigos') {
                        currentTab = 'amigos';
                        currentPage = 1;
                        renderPage(currentPage);
                    }
                };

                // Eventos dos checkboxes
                document.querySelectorAll(".hideStoryCheckbox").forEach(cb => {
                    cb.addEventListener("change", () => {
                        modalStates.set(cb.dataset.username, cb.checked);
                    });
                    });
                    const prevBtn = document.getElementById("prevPageBtn");
                    if (prevBtn) prevBtn.onclick = () => {
                        currentPage--;
                        renderPage(currentPage);
                    };
                    const nextBtn = document.getElementById("nextPageBtn");
                    if (nextBtn) nextBtn.onclick = () => {
                        currentPage++;
                        renderPage(currentPage);
                    };
                    document.getElementById("hideStoryAplicarBtn").onclick = async () => {
                        isApplyingChangesStory = true;
                        const changedUsers = Array.from(modalStates.entries()).filter(([username, checked]) => officialStates.get(username) !== checked).map(([username, checked]) => ({ dataset: { username }, checked }));
                        if (changedUsers.length === 0) {
                            alert("Nenhuma alteração para aplicar.");
                            isApplyingChangesStory = false;
                            return;
                        }

                let cancelled = false;
                const { bar, update, closeButton } = createCancellableProgressBar();
                closeButton.onclick = () => {
                    cancelled = true;
                    isApplyingChangesStory = false;
                    bar.remove();
                    alert("Processo interrompido.");
                };
                const isCancelled = () => cancelled;

                        if (window.location.pathname !== "/accounts/hide_story_and_live_from/") {
                            history.pushState(null, null, "/accounts/hide_story_and_live_from/");
                            window.dispatchEvent(new Event("popstate"));
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        async function toggleOfficialCheckbox(username) {
                            return new Promise((resolve) => {
                                let attempts = 0;
                                function tryToggle() {
                                    attempts++;
                                    const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                                    let found = false;
                                    for (const flex of flexboxes) {
                                        const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                        if (userText === username) {
                                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                                            if (officialCheckboxContainer) {
                                                officialCheckboxContainer.click();
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (found || attempts >= 30) {
                                        resolve();
                                    } else {
                                        setTimeout(tryToggle, 300);
                                    }
                                }
                                tryToggle();
                            });
                        }
                        for (let i = 0; i < changedUsers.length; i++) {
                    if (isCancelled()) break;
                    update(i + 1, changedUsers.length, "Aplicando alterações:");
                            await toggleOfficialCheckbox(changedUsers[i].dataset.username);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            officialStates.set(changedUsers[i].dataset.username, changedUsers[i].checked);
                            // Redesenha a página atual para refletir a mudança em tempo real
                            renderPage(currentPage);
                        }
                bar.remove();
                        isApplyingChangesStory = false;
                    };
                    let isApplyingChangesStory = false;
                    setTimeout(() => {
                        const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                        flexboxes.forEach(flex => {
                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                            if (!officialCheckboxContainer) return;
                            if (officialCheckboxContainer._customSyncListenerStory) return;
                            officialCheckboxContainer._customSyncListenerStory = true;
                            officialCheckboxContainer.addEventListener("click", function () {
                                if (isApplyingChangesStory) return;
                                const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                const customCheckbox = document.querySelector(`.hideStoryCheckbox[data-username="${userText}"]`);
                                if (customCheckbox) {
                                    const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                    let isChecked = false;
                                    if (iconDiv) {
                                        const style = window.getComputedStyle(iconDiv);
                                        const mask = style.maskImage || style.webkitMaskImage;
                                        const bgImg = style.backgroundImage;
                                        isChecked = (style.backgroundColor === 'rgb(0, 149, 246)' || style.backgroundColor === 'rgb(74, 93, 249)' || (bgImg && bgImg.includes('circle-check__filled')) || (mask && mask.includes('circle-check__filled')));
                                    }
                                    if (customCheckbox.checked !== isChecked) {
                                        customCheckbox.checked = isChecked;
                                    }
                                }
                            });
                        });
                    }, 500);
                    const aplicarBtn = document.getElementById("hideStoryAplicarBtn");
                    if (aplicarBtn) {
                        const originalHandler = aplicarBtn.onclick;
                        aplicarBtn.onclick = async function () {
                            isApplyingChangesStory = true;
                            if (originalHandler) {
                                await originalHandler.apply(this, arguments);
                            }
                            isApplyingChangesStory = false;
                        };
                    }
                }
                renderPage(currentPage);
            }

            let modalAbertoStory = false;
                            // --- FIM DO MENU OCULTAR STORY ---

                            // --- NOVO MENU: CONTAS SILENCIADAS ---
            function extractMutedAccountsUsernames(doc = document) {
                return new Promise((resolve) => {
                    const users = new Map(); // Usar Map para evitar duplicados e manter a ordem
                    let scrollInterval;
                    let noNewUsersCount = 0;
                    const maxIdleCount = 3; // Parar após 3 tentativas sem novos usuários (3 segundos)

                    let cancelled = false;
                    const { bar, update, closeButton } = createCancellableProgressBar();
                    closeButton.onclick = () => {
                        cancelled = true;
                        bar.remove();
                        finishExtraction();
                    };
                    update(0, 0, "Buscando e rolando a lista de contas silenciadas...");

                    function finishExtraction() {
                        clearInterval(scrollInterval);
                        if (bar) bar.remove();
                        console.log(`Extração finalizada. Total de ${users.size} usuários encontrados.`);
                        // Se foi cancelado, retorna uma lista vazia para não abrir o modal.
                        resolve(cancelled ? [] : Array.from(users.values()));
                    }

                    function performScrollAndExtract() {
                        const initialUserCount = users.size;

                        // Seletor para os elementos que contêm o nome de usuário
                        const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                            el.querySelector('span[data-bloks-name="bk.components.Text"]')
                        );

                        if (userElements.length === 0 && users.size === 0) {
                            console.log("Nenhum usuário encontrado ainda, tentando novamente...");
                            return; // Continua tentando se a lista estiver vazia
                        }

                        userElements.forEach(userElement => {
                            const usernameSpan = userElement.querySelector('span[data-bloks-name="bk.components.Text"]');
                            const username = usernameSpan ? usernameSpan.innerText.trim() : '';
                            const imgTag = userElement.querySelector('img');

                            let isChecked = false;
                            const checkboxContainer = userElement.querySelector('div[role="button"][tabindex="0"]');
                            if (checkboxContainer) {
                                const icon = checkboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                if (icon) {
                                    const style = window.getComputedStyle(icon);
                                    const bg = style.backgroundColor;
                                    const mask = style.maskImage || style.webkitMaskImage;
                                    const bgImg = style.backgroundImage;
                                    if (bg === 'rgb(0, 149, 246)' || bg === 'rgb(74, 93, 249)' || (bgImg && bgImg.includes('circle-check__filled')) || (mask && mask.includes('circle-check__filled'))) {
                                        isChecked = true;
                                    }
                                }
                            }

                            // Adiciona o usuário apenas se tiver um nome válido, uma foto e ainda não estiver na lista
                            if (username && imgTag && !users.has(username) && /^[a-zA-Z0-9_.]+$/.test(username)) {
                                const photoUrl = imgTag.src;
                                users.set(username, { username, photoUrl, isChecked });
                            } else if (users.has(username)) {
                                const u = users.get(username);
                                if (!u.isChecked && isChecked) {
                                    u.isChecked = true;
                                    users.set(username, u);
                                }
                            }
                        });

                        update(users.size, users.size, `Encontrado(s) ${users.size} usuário(s)... Rolando...`);

                        // Lógica de parada: se não encontrar novos usuários por um tempo, para.
                        if (users.size === initialUserCount) {
                            noNewUsersCount++;
                        } else {
                            noNewUsersCount = 0; // Reseta o contador se encontrar novos usuários
                        }

                        if (noNewUsersCount >= maxIdleCount) {
                            console.log("Nenhum novo usuário encontrado após várias tentativas. Finalizando.");
                            finishExtraction();
                            return;
                        }

                        // Simula a rolagem da janela principal
                        window.scrollTo(0, document.body.scrollHeight);
                    }

                    // Inicia o processo de rolagem e extração
                    scrollInterval = setInterval(performScrollAndExtract, 1000); // Rola e extrai a cada 1 segundo

                    // Adiciona um timeout de segurança para garantir que o processo termine
                    setTimeout(() => {
                        if (scrollInterval) {
                            console.log("Timeout de segurança atingido. Finalizando extração.");
                            finishExtraction();
                        }
                    }, 60000); // Timeout de 60 segundos
                });
            }

            async function abrirModalContasSilenciadas() {
                if (modalAbertoMuted) return;
                modalAbertoMuted = true;

                const users = await extractMutedAccountsUsernames();

                // Armazena a lista no cache global
                userListCache.muted = new Set(users.map(u => u.username));
                console.log(`Cache atualizado com ${userListCache.muted.size} contas silenciadas.`);

                const modalStates = new Map();
                users.forEach(({ username }) => modalStates.set(username, false)); // Inicia todos desmarcados

                const itemsPerPage = loadSettings().itemsPerPage;
                let currentPage = 1;

                const div = document.createElement("div");
                div.id = "allMutedAccountsDiv";
                div.className = "submenu-modal";
                div.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70vw;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: auto;
                    border: 2px solid #8e44ad;
                    border-radius: 10px;
                    z-index: 2147483647;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

                function renderPage(page) {
                    let html = `
                        <div class="modal-header">
                            <span class="modal-title">
                                Contas Silenciadas
                                <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie contas que você silenciou (Stories ou Posts). Você pode reativar o som aqui.</span></div>
                            </span>
                            <div class="modal-controls"><button id="mutedMinimizarBtn" title="Minimizar">_</button><button id="mutedFecharBtn" title="Fechar">X</button></div>
                        </div>`;
                    html += `
                        <div style="padding: 15px;">
                            <button id="mutedMarcarTodosBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                            <button id="mutedDesmarcarTodosBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                            <button id="mutedAplicarBtn" style="background:#8e44ad;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Reativar Som</button>
                        </div>
                        <div style="margin-bottom:15px;">
                            <input type="text" id="mutedSearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                        </div>
                        <ul id="mutedList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
                    `;
                    const startIndex = (page - 1) * itemsPerPage;
                    const endIndex = Math.min(startIndex + itemsPerPage, users.length);
                    const pageUsers = users.slice(startIndex, endIndex);

                    pageUsers.forEach(({ username, photoUrl }, idx) => {
                        const globalIdx = startIndex + idx;
                        const isChecked = modalStates.get(username) || false;
                        html += `
                            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                                <label class="custom-checkbox" for="muted_cb_${globalIdx}" style="margin:0;">
                                    <input type="checkbox" class="mutedCheckbox" id="muted_cb_${globalIdx}" data-username="${username}" ${isChecked ? "checked" : ""}>
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="cursor:pointer; color: black;">${username}</span>
                            </li>
                        `;
                    });
                    html += "</ul>";
                    const totalPages = Math.ceil(users.length / itemsPerPage);
                    html += `<div id="paginationControls" style="margin-top:20px; display:flex; justify-content:center; align-items:center; gap:10px;">`;
                    if (totalPages > 1) {
                        if (page > 1) html += `<button id="prevPageBtn">Anterior</button>`;
                        html += `<span style="font-weight:bold;">Página ${page} de ${totalPages}</span>`;
                        if (page < totalPages) html += `<button id="nextPageBtn">Próximo</button>`;
                    }
                    html += `</div>`;
                    div.innerHTML = html;
                    document.body.appendChild(div);

                    document.getElementById("mutedFecharBtn").onclick = () => { div.remove(); modalAbertoMuted = false; };
                    document.getElementById("mutedMinimizarBtn").onclick = () => {
                        const modal = document.getElementById('allMutedAccountsDiv');
                        const contentToToggle = [
                            modal.querySelector('input[type="text"]'),
                            modal.querySelector('ul'),
                            modal.querySelector('#paginationControls')
                        ].filter(Boolean);

                        const btn = document.getElementById('mutedMinimizarBtn');
                        const isMinimized = modal.dataset.minimized === 'true';

                        contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');

                        modal.dataset.minimized = !isMinimized;
                        btn.textContent = isMinimized ? 'Minimizar' : 'Maximizar';
                        modal.style.maxHeight = isMinimized ? '85vh' : 'none';
                    };

                    document.getElementById("mutedMarcarTodosBtn").onclick = () => {
                        document.querySelectorAll("#mutedList .mutedCheckbox").forEach(cb => { cb.checked = true; modalStates.set(cb.dataset.username, true); });
                    };
                    document.getElementById("mutedDesmarcarTodosBtn").onclick = () => {
                        document.querySelectorAll("#mutedList .mutedCheckbox").forEach(cb => { cb.checked = false; modalStates.set(cb.dataset.username, false); });
                    };

                    const searchInput = document.getElementById("mutedSearchInput");
                    searchInput.addEventListener("input", () => {
                        const filter = searchInput.value.toLowerCase();
                        div.querySelectorAll("#mutedList li").forEach(li => {
                            // Seletor ajustado para ser mais específico
                            const usernameSpan = li.querySelector('span[style*="cursor:pointer"]');
                            const text = usernameSpan ? usernameSpan.textContent.toLowerCase() : '';
                            li.style.display = text.includes(filter) ? "" : "none";
                        });
                    });

                    const prevBtn = document.getElementById("prevPageBtn");
                    if (prevBtn) prevBtn.onclick = () => { currentPage--; renderPage(currentPage); };
                    const nextBtn = document.getElementById("nextPageBtn");
                    if (nextBtn) nextBtn.onclick = () => { currentPage++; renderPage(currentPage); };

                    document.querySelectorAll(".mutedCheckbox").forEach(cb => {
                        cb.addEventListener("change", () => modalStates.set(cb.dataset.username, cb.checked));
                    });

                    document.getElementById("mutedAplicarBtn").onclick = async () => {
                        const usersToUnmute = Array.from(modalStates.entries())
                            .filter(([_, checked]) => checked)
                            .map(([username]) => username);

                        if (usersToUnmute.length === 0) {
                            alert("Nenhum usuário selecionado para reativar o som.");
                            return;
                        }

                        const aplicarBtn = document.getElementById("mutedAplicarBtn");
                        aplicarBtn.disabled = true;
                        aplicarBtn.textContent = "Processando...";

                        await unmuteUsers(usersToUnmute, () => {
                            aplicarBtn.disabled = false;
                            aplicarBtn.textContent = "Reativar Som";
                            alert(`${usersToUnmute.length} usuário(s) tiveram o som reativado.`);
                            // Recarrega o modal para refletir as mudanças
                            div.remove();
                            modalAbertoMuted = false;
                            abrirModalContasSilenciadas();
                        });
                    };
                }
                renderPage(currentPage);
            }

            async function unmuteUsers(usersToUnmute, callback, toggleMode = false) {
                let cancelled = false;
                const { bar, update, closeButton } = createCancellableProgressBar();
                closeButton.onclick = () => {
                    cancelled = true;
                    bar.remove();
                    alert("Processo interrompido.");
                };
                const isCancelled = () => cancelled;

                const originalPath = window.location.pathname;

                for (let i = 0; i < usersToUnmute.length; i++) {
                    if (isCancelled()) break;
                    const username = usersToUnmute[i];
                    update(i + 1, usersToUnmute.length, toggleMode ? "Alterando status de silenciar:" : "Reativando som:");

                    // 1. Navegar para o perfil do usuário
                    history.pushState(null, null, `/${username}/`);
                    window.dispatchEvent(new Event("popstate"));
                    await new Promise(resolve => setTimeout(resolve, 4000)); // Espera o perfil carregar

                    // 2. Clicar no botão "Seguindo"
                    // Seletor aprimorado para iPhone: procura em mais tipos de elementos e verifica o texto de forma mais flexível.
                    const followingButton = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]')).find(el => {
                        const text = el.innerText.trim();
                        return text === 'Seguindo' || text === 'Following';
                    });
                    if (!followingButton) {
                        console.warn(`Botão 'Seguindo' não encontrado para ${username}. Pulando.`);
                        continue;
                    }
                    simulateClick(followingButton);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Espera o menu dropdown aparecer

                    // 3. Clicar na opção "Silenciar"
                    // Seletor mais robusto, similar ao de unfollow, para encontrar a opção "Silenciar"
                    const muteOption = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], div[role="menuitem"]')).find(el =>
                        el.innerText.trim() === 'Silenciar' ||
                        (el.querySelector('span') && el.querySelector('span').innerText.trim() === 'Silenciar')
                    );
                    if (!muteOption) {
                        console.warn(`Opção 'Silenciar' não encontrada para ${username}. Pulando.`);
                        // Tenta fechar o menu se ele abriu
                        if (followingButton) simulateClick(followingButton);
                        continue;
                    }
                    simulateClick(muteOption);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Espera o modal de silenciar abrir

                    // 4. Desativar os toggles de "Publicações" e "Stories"
                    console.log('Procurando opções "Publicações" e "Stories" para alterar o estado...');
                    const optionsToToggle = ['Publicações', 'Posts', 'Stories'];
                    let togglesClicked = 0;

                    for (const optionText of optionsToToggle) {
                        // Encontra o elemento de texto ("Publicações" ou "Stories") em toda a página
                        const textElement = Array.from(document.querySelectorAll('span, div')).find(el => el.innerText.trim() === optionText);

                        if (!textElement) {
                            console.log(`Elemento de texto para "${optionText}" não encontrado.`);
                            continue;
                        }
                        console.log(`Elemento de texto para "${optionText}" encontrado:`, textElement);

                        // Sobe na árvore DOM para encontrar o contêiner da linha inteira, que é clicável
                        const rowContainer = textElement.closest('div[role="button"]');
                        if (rowContainer) {
                            console.log(`Contêiner clicável para "${optionText}" encontrado:`, rowContainer);
                            const stateIndicator = rowContainer.querySelector('input[type="checkbox"], div[role="switch"]');

                            if (stateIndicator) {
                                const isChecked = stateIndicator.getAttribute('aria-checked');
                                console.log(`Indicador de estado para "${optionText}" encontrado. Estado (aria-checked): ${isChecked}. Modo Toggle: ${toggleMode}`);

                                if (toggleMode || isChecked === 'true') {
                                    console.log(`Tentando alterar o estado de "${optionText}".`);

                                    // --- LÓGICA DE TESTE A/B ---
                                    if (optionText === 'Publicações' || optionText === 'Posts') {
                                        console.log(`Usando método 1 (clique no input) para "${optionText}".`);
                                        simulateClick(stateIndicator, true);
                                    } else if (optionText === 'Stories') {
                                        console.log(`Usando método 2 (clique no container) para "${optionText}".`);
                                        simulateClick(rowContainer);
                                    }
                                    // --- FIM DA LÓGICA ---

                                    await new Promise(resolve => setTimeout(resolve, 500)); // Pausa final
                                } else {
                                    console.log(`Estado de "${optionText}" já é 'false' e o modo toggle está desativado. Nenhuma ação necessária.`);
                                }
                            } else {
                                console.warn(`Indicador de estado (checkbox/switch) não encontrado para "${optionText}".`);
                            }
                        } else {
                            console.warn(`Contêiner clicável (div[role="button"]) não encontrado para a opção: "${optionText}".`);
                        }
                    }

                    // 5. Clicar no botão "Salvar" se ele existir (desktop) ou aguardar se não existir (mobile).
                    console.log('Procurando pelo botão "Salvar" ou "Concluído"...');
                    const saveButton = Array.from(document.querySelectorAll('button, div[role="button"]')).find(
                        btn => ['Salvar', 'Save', 'Concluído', 'Done'].includes(btn.innerText.trim())
                    );

                    if (saveButton) {
                        console.log('Botão "Salvar" encontrado (Desktop). Clicando...', saveButton);
                        simulateClick(saveButton);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa após clicar em salvar.
                    } else {
                        console.warn('Botão "Salvar" não encontrado (Mobile). A ação deve salvar automaticamente. Aguardando...');
                        await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa maior para mobile.
                    }

                    // Remove a linha do modal para feedback visual imediato
                    const modalLi = document.querySelector(`#mutedList li input[data-username="${username}"]`);
                    if (modalLi) modalLi.closest('li').remove();

                    // No mobile, o modal de silenciar pode não fechar sozinho. Clicamos em "Voltar".
                    // O seletor foi melhorado para encontrar o botão que contém o SVG com o aria-label correto.
                    const backButton = document.querySelector('button svg[aria-label="Voltar"], button svg[aria-label="Back"]')?.closest('button');
                    if (backButton) {
                        console.log("Botão 'Voltar' do mobile encontrado. Clicando para salvar a alteração...");
                        simulateClick(backButton);
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa extra após fechar o modal.
                    }
                }

                bar.remove();

                // Retorna para a página original de contas silenciadas
                history.pushState(null, null, originalPath);
                window.dispatchEvent(new Event("popstate"));
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (callback) callback();
            }

            let modalAbertoMuted = false;
                            // --- FIM DO MENU CONTAS SILENCIADAS ---

                            // --- NOVO MENU: CONTAS BLOQUEADAS ---
            function extractBlockedAccountsUsernames(doc = document) {
                return new Promise((resolve) => {
                    const users = new Map(); // Usar Map para evitar duplicados e manter a ordem
                    let scrollInterval;
                    let noNewUsersCount = 0;
                    const maxIdleCount = 1; // Parar após 1 tentativa sem novos usuários (5 segundos)
                    let initialTimeout;

                    let cancelled = false;
                    const { bar, update, closeButton } = createCancellableProgressBar();
                    closeButton.onclick = () => {
                        cancelled = true;
                        bar.remove();
                        finishExtraction();
                    };
                    update(0, 0, "Buscando e rolando a lista de contas bloqueadas...");

                    function finishExtraction() {
                        clearInterval(scrollInterval);
                        clearTimeout(initialTimeout);
                        if (bar) bar.remove();
                        console.log(`Extração finalizada. Total de ${users.size} usuários encontrados.`);
                        // Se foi cancelado, retorna uma lista vazia para não abrir o modal.
                        resolve(cancelled ? [] : Array.from(users.values()));
                    }

                    function performScrollAndExtract() {
                        const initialUserCount = users.size;

                        // Seletor para os elementos que contêm o nome de usuário
                        const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                            el.querySelector('span[data-bloks-name="bk.components.Text"]')
                        );

                        if (userElements.length === 0 && users.size === 0) {
                            console.log("Nenhum usuário encontrado ainda, tentando novamente...");
                            return; // Continua tentando se a lista estiver vazia
                        }

                        userElements.forEach(userElement => {
                            const usernameSpan = userElement.querySelector('span[data-bloks-name="bk.components.Text"]');
                            const username = usernameSpan ? usernameSpan.innerText.trim() : '';

                            if (username && !users.has(username) && /^[a-zA-Z0-9_.]+$/.test(username)) {
                                const imgTag = userElement.querySelector('img');
                                const photoUrl = imgTag ? imgTag.src : 'https://via.placeholder.com/32';
                                users.set(username, { username, photoUrl });
                            }
                        });

                        update(users.size, users.size, `Encontrado(s) ${users.size} usuário(s)... Rolando...`);

                        // Lógica de parada: se não encontrar novos usuários por um tempo, para.
                        if (users.size === initialUserCount) {
                            noNewUsersCount++;
                        } else {
                            noNewUsersCount = 0; // Reseta o contador se encontrar novos usuários
                        }

                        if (noNewUsersCount >= maxIdleCount) {
                            console.log("Nenhum novo usuário encontrado após várias tentativas. Finalizando.");
                            finishExtraction();
                            return;
                        }

                        // Simula a rolagem da janela principal
                        window.scrollTo(0, document.body.scrollHeight);
                    }

                    // Inicia o processo de rolagem e extração a cada 5 segundos
                    scrollInterval = setInterval(performScrollAndExtract, 5000);

                    // Adiciona um timeout inicial de 7 segundos. Se nenhum usuário for encontrado, finaliza.
                    initialTimeout = setTimeout(() => {
                        if (users.size === 0) {
                            console.log("Timeout de 7 segundos atingido sem encontrar usuários. Finalizando.");
                            finishExtraction();
                        }
                    }, 7000);
                });
            }

            async function iniciarProcessoBloqueados() {
                if (modalAbertoBlocked) return;
                modalAbertoBlocked = true;

                // Navegar para a página de contas bloqueadas
                if (window.location.pathname !== "/accounts/blocked_accounts/") {
                    history.pushState(null, null, "/accounts/blocked_accounts/");
                    window.dispatchEvent(new Event("popstate"));
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Espera a página carregar
                }

                const users = await extractBlockedAccountsUsernames();

                const modalStates = new Map();
                users.forEach(({ username }) => modalStates.set(username, false)); // Inicia todos desmarcados

                const itemsPerPage = loadSettings().itemsPerPage;
                let currentPage = 1;

                const div = document.createElement("div");
                div.id = "allBlockedAccountsDiv";
                div.className = "submenu-modal";
                div.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70vw;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: auto;
                    border: 2px solid #e74c3c;
                    border-radius: 10px;
                    z-index: 2147483647;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

                function renderPage(page) {
                    let html = `
                        <div class="modal-header">
                            <span class="modal-title">
                                Contas Bloqueadas
                                <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Lista de usuários que você bloqueou. Você pode desbloqueá-los em massa aqui.</span></div>
                            </span>
                            <div class="modal-controls"><button id="blockedMinimizarBtn" title="Minimizar">_</button><button id="blockedFecharBtn" title="Fechar">X</button></div>
                        </div>`;
                    html += `
                        <div style="padding: 15px;">
                            <button id="blockedMarcarTodosBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                            <button id="blockedDesmarcarTodosBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                            <button id="blockedDesbloquearBtn" style="background:#2ecc71;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Desbloquear</button>
                        </div>
                        <div style="margin-bottom:15px;">
                            <input type="text" id="blockedSearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                        </div>
                        <ul id="blockedList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
                    `;
                    const startIndex = (page - 1) * itemsPerPage;
                    const endIndex = Math.min(startIndex + itemsPerPage, users.length);
                    const pageUsers = users.slice(startIndex, endIndex);

                    pageUsers.forEach(({ username, photoUrl }, idx) => {
                        const globalIdx = startIndex + idx;
                        const isChecked = modalStates.get(username) || false;
                        html += `
                            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                                <label class="custom-checkbox" for="blocked_cb_${globalIdx}" style="margin:0;">
                                    <input type="checkbox" class="blockedCheckbox" id="blocked_cb_${globalIdx}" data-username="${username}" ${isChecked ? "checked" : ""}>
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="cursor:pointer; color: black;">${username}</span>
                            </li>
                        `;
                    });
                    html += "</ul>";
                    const totalPages = Math.ceil(users.length / itemsPerPage);
                    html += `<div id="paginationControls" style="margin-top:20px; display:flex; justify-content:center; align-items:center; gap:10px;">`;
                    if (totalPages > 1) {
                        if (page > 1) html += `<button id="prevPageBtn">Anterior</button>`;
                        html += `<span style="font-weight:bold;">Página ${page} de ${totalPages}</span>`;
                        if (page < totalPages) html += `<button id="nextPageBtn">Próximo</button>`;
                    }
                    html += `</div>`;
                    div.innerHTML = html;
                    document.body.appendChild(div);

                    document.getElementById("blockedFecharBtn").onclick = () => { div.remove(); modalAbertoBlocked = false; };
                    document.getElementById("blockedMinimizarBtn").onclick = () => {
                        const modal = document.getElementById('allBlockedAccountsDiv');
                        const contentToToggle = [
                            modal.querySelector('input[type="text"]'),
                            modal.querySelector('ul'),
                            modal.querySelector('#paginationControls')
                        ].filter(Boolean);

                        const btn = document.getElementById('blockedMinimizarBtn');
                        const isMinimized = modal.dataset.minimized === 'true';

                        contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');

                        modal.dataset.minimized = !isMinimized;
                        btn.textContent = isMinimized ? 'Minimizar' : 'Maximizar';
                        modal.style.maxHeight = isMinimized ? '85vh' : 'none';
                    };

                    document.getElementById("blockedMarcarTodosBtn").onclick = () => {
                        document.querySelectorAll("#blockedList .blockedCheckbox").forEach(cb => { cb.checked = true; modalStates.set(cb.dataset.username, true); });
                    };
                    document.getElementById("blockedDesmarcarTodosBtn").onclick = () => {
                        document.querySelectorAll("#blockedList .blockedCheckbox").forEach(cb => { cb.checked = false; modalStates.set(cb.dataset.username, false); });
                    };

                    const searchInput = document.getElementById("blockedSearchInput");
                    searchInput.addEventListener("input", () => {
                        const filter = searchInput.value.toLowerCase();
                        // O seletor foi corrigido para pegar o span correto com o nome de usuário
                        div.querySelectorAll("#blockedList li").forEach(li => {
                            const usernameSpan = li.querySelector('span[style*="cursor:pointer"]');
                            const text = usernameSpan ? usernameSpan.textContent.toLowerCase() : '';
                            li.style.display = text.includes(filter) ? "" : "none";
                        });
                    });

                    const prevBtn = document.getElementById("prevPageBtn");
                    if (prevBtn) prevBtn.onclick = () => { currentPage--; renderPage(currentPage); };
                    const nextBtn = document.getElementById("nextPageBtn");
                    if (nextBtn) nextBtn.onclick = () => { currentPage++; renderPage(currentPage); };

                    document.querySelectorAll(".blockedCheckbox").forEach(cb => {
                        cb.addEventListener("change", () => modalStates.set(cb.dataset.username, cb.checked));
                    });

                    document.getElementById("blockedDesbloquearBtn").onclick = async () => {
                        const usersToUnblock = Array.from(modalStates.entries())
                            .filter(([_, checked]) => checked)
                            .map(([username]) => username);

                        if (usersToUnblock.length === 0) {
                            alert("Nenhum usuário selecionado para desbloquear.");
                            return;
                        }

                        const desbloquearBtn = document.getElementById("blockedDesbloquearBtn");
                        desbloquearBtn.disabled = true;
                        desbloquearBtn.textContent = "Processando...";

                        await unblockUsers(usersToUnblock, () => {
                            desbloquearBtn.disabled = false;
                            desbloquearBtn.textContent = "Desbloquear";
                            alert(`${usersToUnblock.length} usuário(s) tiveram o bloqueio removido.`);
                            // Recarrega o modal para refletir as mudanças
                            div.remove();
                            modalAbertoBlocked = false;
                            iniciarProcessoBloqueados();
                        });
                    };
                }
                renderPage(currentPage);
            }

            async function unblockUsers(usersToUnblock, onComplete) {
                let cancelled = false;
                const { bar, update, closeButton } = createCancellableProgressBar();
                closeButton.onclick = () => {
                    cancelled = true;
                    bar.remove();
                    alert("Processo de desbloqueio interrompido.");
                };

                // Garante que estamos na página de contas bloqueadas
                if (window.location.pathname !== "/accounts/blocked_accounts/") {
                    history.pushState(null, null, "/accounts/blocked_accounts/");
                    window.dispatchEvent(new Event("popstate"));
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Espera a página carregar
                }

                for (let i = 0; i < usersToUnblock.length; i++) {
                    if (cancelled) break;
                    const username = usersToUnblock[i];
                    update(i + 1, usersToUnblock.length, "Desbloqueando:");

                    // 1. Encontrar o card do usuário na lista de bloqueados
                    const userCard = Array.from(document.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]'))
                        .find(el => el.querySelector('span')?.innerText.trim() === username);

                    if (!userCard) {
                        console.warn(`Usuário ${username} não encontrado na lista. Pulando.`);
                        continue;
                    }

                    // 2. Encontrar e clicar no botão "Desbloquear" dentro do card do usuário
                    const unblockButton = userCard.querySelector('div[aria-label="Desbloquear"]');
                    if (!unblockButton) {
                        console.warn(`Botão 'Desbloquear' não encontrado para ${username}. Pulando.`);
                        continue;
                    }
                    simulateClick(unblockButton);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Espera o modal de confirmação

                    // 3. Encontrar e clicar no botão de confirmação final no modal
                    const confirmButton = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.trim() === 'Desbloquear' || btn.innerText.trim() === 'Unblock');
                    if (confirmButton) {
                        simulateClick(confirmButton);
                    } else {
                        console.warn(`Botão de confirmação de desbloqueio não encontrado para ${username}.`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa entre as ações
                }

                bar.remove();
                if (onComplete) onComplete();
            }

            let modalAbertoBlocked = false;
                            // --- FIM DO MENU CONTAS BLOQUEADAS ---

            function simulateClick(element, triggerChangeEvent = false) {
                 if (!element) return;
                 const dispatch = (event) => element.dispatchEvent(event);

                 // Simula eventos de toque, mais confiáveis em mobile
                 dispatch(new TouchEvent('touchstart', { bubbles: true, cancelable: true, view: window }));
                 dispatch(new TouchEvent('touchend', { bubbles: true, cancelable: true, view: window }));

                 // Mantém os eventos de mouse como fallback
                 dispatch(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                 dispatch(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                 dispatch(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                 if (triggerChangeEvent) {
                     dispatch(new Event('change', { bubbles: true }));
                 }
            }


                            // --- FUNÇÃO PARA BAIXAR STORY ATUAL (IMAGEM OU VÍDEO) ---
                            function baixarStoryAtual() {
                                if (!window.location.href.includes('/stories/')) {
                                    alert('Esta função só pode ser usada na tela de visualização de Stories.');
                                    return;
                                }

                                // Função auxiliar para verificar se um elemento está visível na tela
                                const isElementVisible = (el) => {
                                    if (!el) return false;
                                    const rect = el.getBoundingClientRect();
                                    const viewHeight = window.innerHeight || document.documentElement.clientHeight;

                                    // Considera visível se pelo menos 50% da altura do elemento estiver na tela.
                                    // Isso ajuda a ignorar elementos pré-carregados fora da tela.
                                    return (
                                        rect.bottom > 0 &&
                                        rect.top < viewHeight &&
                                        rect.width > 0 &&
                                        rect.height > 0
                                    );
                                };

                                let visibleImage;
                                let visibleVideo;

                                // 1. Tentar encontrar um vídeo visível primeiro
                                visibleVideo = Array.from(document.querySelectorAll('video')).find(isElementVisible);

                                if (isMobileDevice()) {
                                    // Lógica para celular: Procura por uma imagem que tenha 'srcset', um indicador comum para a imagem principal do story.
                                    // Isso é mais robusto do que um seletor de CSS fixo.
                                    visibleImage = Array.from(document.querySelectorAll('img[src]')).find(img => {
                                        const rect = img.getBoundingClientRect();
                                        return isElementVisible(img) && rect.height > (window.innerHeight * 0.5);
                                    });
                                } else {
                                    // Lógica para PC: Encontra a imagem grande que está visível.
                                    visibleImage = Array.from(document.querySelectorAll('section img')).find(img => {
                                        const rect = img.getBoundingClientRect();
                                        return isElementVisible(img) && rect.height > (window.innerHeight * 0.5);
                                    });
                                }

                                if (visibleVideo && visibleVideo.src) {
                                    console.log("Vídeo do story encontrado:", visibleVideo.src);
                                    // Se for um blob, pode ser uma imagem com música.
                                    if (visibleVideo.src.startsWith('blob:')) {
                                        console.log("Vídeo é um blob, tentando capturar como imagem.");
                                        // Tirar "print" do vídeo
                                        const canvas = document.createElement('canvas');
                                        canvas.width = visibleVideo.videoWidth;
                                        canvas.height = visibleVideo.videoHeight;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(visibleVideo, 0, 0, canvas.width, canvas.height);
                                        const dataUrl = canvas.toDataURL('image/png');
                                        downloadMedia(dataUrl, `story_img_${Date.now()}.png`);
                                    } else {
                                        // Se for um vídeo normal, tenta baixar diretamente.
                                        downloadMedia(visibleVideo.src, `story_video_${Date.now()}.mp4`);
                                    }
                                    return;
                                }

                                // 2. Se não houver vídeo, procurar por uma imagem visível
                                if (visibleImage && visibleImage.src) {
                                    console.log("Imagem do story encontrada:", visibleImage.src);
                                    // Prioriza a imagem de maior resolução do srcset, se disponível.
                                    const imageUrl = visibleImage.srcset
                                        ? visibleImage.srcset.split(',').slice(-1)[0].trim().split(' ')[0]
                                        : visibleImage.src;

                                    downloadMedia(imageUrl, `story_img_${Date.now()}.jpg`);
                                    return;
                                }

                                // 3. Se não encontrar nenhum dos dois
                                alert('Nenhuma imagem ou vídeo de story encontrado para baixar.');
                            }

                            // --- BOTÃO FLUTUANTE AUTOMÁTICO PARA STORIES ---
                            function injectStoryFloatingButton() {
                                if (window.location.href.includes('/stories/')) {
                                    if (!document.getElementById("storyFloatingDownloadBtn")) {
                                        const btn = document.createElement("button");
                                        btn.id = "storyFloatingDownloadBtn";
                                        btn.innerHTML = "⬇️";
                                        btn.title = "Baixar Story Atual";
                                        btn.style.cssText = `
                                            position: fixed;
                                            top: 20px;
                                            left: 20px;
                                            z-index: 2147483647;
                                            background: rgba(255, 255, 255, 0.2);
                                            color: white;
                                            border: 1px solid rgba(255, 255, 255, 0.5);
                                            border-radius: 50%;
                                            width: 45px;
                                            height: 45px;
                                            font-size: 20px;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            backdrop-filter: blur(4px);
                                            transition: all 0.3s ease;
                                        `;
                                        btn.onmouseover = () => { btn.style.background = "rgba(255, 255, 255, 0.4)"; btn.style.transform = "scale(1.1)"; };
                                        btn.onmouseout = () => { btn.style.background = "rgba(255, 255, 255, 0.2)"; btn.style.transform = "scale(1)"; };
                                        btn.onclick = (e) => {
                                            e.stopPropagation();
                                            baixarStoryAtual();
                                        };
                                        document.body.appendChild(btn);
                                    }
                                } else {
                                    const btn = document.getElementById("storyFloatingDownloadBtn");
                                    if (btn) btn.remove();
                                }
                            }
                            setInterval(injectStoryFloatingButton, 1000);

                            // --- LÓGICA UNIFICADA PARA "NÃO SEGUE DE VOLTA" ---
                            async function iniciarProcessoNaoSegueDeVolta(initialTab = 'tabNaoSegueDeVolta') {
                                const pathParts = window.location.pathname.split('/').filter(Boolean);
                                if (document.getElementById("naoSegueDeVoltaDiv")) return; // Evita abrir múltiplos modais
                                const username = pathParts[0];
                                const appID = '936619743392459'; // ID público do app web do Instagram
                                if (!username || pathParts.length > 1 && !['followers', 'following'].includes(pathParts[1])) {
                                    alert("Por favor, vá para a página de perfil de um usuário para usar esta função.");
                                    return;
                                }

                                // 1. Criar o modal de progresso
                                const div = document.createElement("div");
                                div.id = "naoSegueDeVoltaDiv";
                                div.className = "submenu-modal";
                                let processoCancelado = false; // Variável de controle de cancelamento

                                div.style.cssText = `
                                    position: fixed;
                                    top: 50%;
                                    left: 50%;
                                    transform: translate(-50%, -50%);
                                    width: 90%;
                                    max-width: 800px;
                                    max-height: 90vh;
                                    border: 1px solid #ccc;
                                    border-radius: 10px;
                                    padding: 20px;
                                    z-index: 10000;
                                    overflow: auto;
                                `;
                                div.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">
                                            Análise de Seguidores
                                            <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Veja quem você segue mas não te segue de volta. Também mostra novos seguidores e histórico de unfollows.</span></div>
                                        </span>
                                        <div class="modal-controls">
                                            <button id="naoSegueDeVoltaMinimizarBtn" title="Minimizar">_</button>
                                            <button id="fecharSubmenuBtn" title="Fechar">X</button>
                                        </div>
                                    </div>
                                    <div id="statusNaoSegue" style="margin-top: 20px; font-weight: bold;"></div>
                                    <div id="tabelaContainer" style="display: block; margin-top: 15px;"></div>
                                `;
                                document.body.appendChild(div);

                                document.getElementById("fecharSubmenuBtn").addEventListener("click", () => {
                                    processoCancelado = true; // Sinaliza que o processo deve ser cancelado
                                    document.getElementById("progressBar")?.remove();
                                    div.remove();
                                });

                                document.getElementById("naoSegueDeVoltaMinimizarBtn").onclick = () => {
                                    const modal = document.getElementById('naoSegueDeVoltaDiv');
                                    const contentToToggle = [
                                        modal.querySelector('.tab-container'),
                                        modal.querySelector('#statusNaoSegue'),
                                        modal.querySelector('#tabelaContainer')
                                    ].filter(Boolean);

                                    const btn = document.getElementById('naoSegueDeVoltaMinimizarBtn');
                                    const isMinimized = modal.dataset.minimized === 'true';

                                    contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');
                                    modal.dataset.minimized = !isMinimized;
                                    btn.textContent = isMinimized ? '_' : '□';
                                    modal.style.maxHeight = isMinimized ? '90vh' : 'auto';
                                };

                                const statusDiv = document.getElementById("statusNaoSegue");

                                // Cache para armazenar os dados e evitar novas buscas
                                const cachedData = {
                                    seguindo: null,
                                    seguidores: null,
                                    naoSegueDeVolta: null,
                                    novosSeguidores: null,
                                    unfollows: null,
                                    seguidoresPerdidos: null,
                                    exceptions: null,
                                    profileInfo: null,
                                    userDetails: new Map()
                                };

                                // Variável compartilhada para as listas, acessível pelo unfollowUsers
                                let lists = {};

                                // Função para extrair lista de usuários via API (muito mais rápido)
                                const fetchUserListAPI = async (userId, type, total) => {
                                    const userList = new Set();
                                    let nextMaxId = '';
                                    let hasNextPage = true;

                                    // --- Lógica da Barra de Progresso ---
                                    let bar = document.getElementById("progressBar");
                                    if (bar) bar.remove();

                                    bar = document.createElement("div");
                                    bar.id = "progressBar";
                                    bar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:10001;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";

                                    const fill = document.createElement("div");
                                    fill.style.cssText = "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";

                                    const text = document.createElement("div");
                                    text.style.position = "relative";

                                    const closeButton = document.createElement("button");
                                    closeButton.innerText = "Cancelar";
                                    closeButton.style.cssText = "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";
                                    closeButton.onclick = () => { processoCancelado = true; bar.remove(); statusDiv.innerText = "Processo interrompido."; };

                                    bar.appendChild(fill);
                                    bar.appendChild(text);
                                    bar.appendChild(closeButton);
                                    document.body.appendChild(bar);

                                    const updateLocalProgressBar = (progress, total, message) => {
                                        const percent = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
                                        fill.style.width = `${percent}%`;
                                        text.innerText = `${message} ${Math.floor(percent)}% (${progress}/${total})`;
                                    };
                                    // --- Fim da lógica da Barra de Progresso ---

                                    let hasError = false;
                                    while (hasNextPage && !processoCancelado && !hasError) {
                                        try {
                                            const batchSize = loadSettings().requestBatchSize || 50;
                                            const delay = loadSettings().requestDelay || 250;
                                            const response = await fetch(`https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=${batchSize}&max_id=${nextMaxId}`, {
                                                headers: { 'X-IG-App-ID': appID }
                                            });
                                            if (!response.ok) throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
                                            const data = await response.json();

                                            data.users.forEach(user => {
                                                const lowerUsername = user.username.toLowerCase();
                                                userList.add(lowerUsername);
                                                cachedData.userDetails.set(lowerUsername, {
                                                    username: user.username,
                                                    photoUrl: user.profile_pic_url
                                                });
                                            });
                                            updateLocalProgressBar(userList.size, total, `Extraindo ${type}:`);

                                            if (data.next_max_id) {
                                                nextMaxId = data.next_max_id;
                                            } else {
                                                hasNextPage = false;
                                            }
                                            await new Promise(r => setTimeout(r, delay)); // Pausa configurável
                                        } catch (error) {
                                            console.error(`Erro ao buscar ${type}:`, error);
                                            alert(`Ocorreu um erro ao buscar a lista de ${type}: ${error.message}.\n\nIsso geralmente ocorre por muitas requisições (Erro 429). Tente aumentar o 'Intervalo Requisições' nas configurações ou aguarde alguns minutos.`);
                                            hasError = true;
                                            hasNextPage = false; // Interrompe em caso de erro
                                        }
                                    }
                                    let progressBarElement = document.getElementById("progressBar");
                                    if (progressBarElement) progressBarElement.remove();
                                    if (hasError) return null;
                                    return processoCancelado ? null : userList;
                                };

                                // Função principal que carrega os dados UMA VEZ
                                async function carregarDadosIniciais() {
                                    statusDiv.innerText = 'Carregando dados do Banco de Dados (IndexedDB)...';

                                    // 1. Carrega dados do DB (Sem requisições API)
                                    let dbFollowers = await dbHelper.loadCache('followers');
                                    let dbFollowing = await dbHelper.loadCache('following');
                                    let dbExceptions = await dbHelper.loadExceptions();

                                    // Função para normalizar Sets e popular detalhes
                                    const normalizeAndCache = (set) => {
                                        const newSet = new Set();
                                        if (set) {
                                            set.forEach(u => {
                                                if(u) newSet.add(u.toLowerCase());
                                            });
                                            if (set.details) {
                                                set.details.forEach((val, key) => cachedData.userDetails.set(key.toLowerCase(), val));
                                            }
                                        }
                                        return newSet;
                                    };

                                    dbFollowers = normalizeAndCache(dbFollowers);
                                    dbFollowing = normalizeAndCache(dbFollowing);
                                    cachedData.exceptions = dbExceptions || new Set();

                                    cachedData.seguidores = dbFollowers;
                                    cachedData.seguindo = dbFollowing;

                                    // 2. Calcula listas baseadas no DB
                                    // Filtra quem não segue de volta E quem não está na lista de exceções (corrigidos)
                                    cachedData.naoSegueDeVolta = [...dbFollowing].filter(user => !dbFollowers.has(user) && !cachedData.exceptions.has(user));

                                    // Tenta buscar info básica do perfil (leve) apenas para ter o ID caso o usuário queira atualizar
                                    try {
                                        const profileInfoResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                                        if (profileInfoResponse.ok) {
                                            cachedData.profileInfo = await profileInfoResponse.json();
                                        }
                                    } catch (e) {
                                        console.log("Não foi possível buscar info do perfil (modo offline/cache).");
                                    }

                                    // Calcula listas
                                    const toObjects = (names) => names.map(name => cachedData.userDetails.get(name) || { username: name, photoUrl: null });

                                    // Listas iniciais (Novos estarão vazios até atualizar)
                                    let listNaoSegueDeVolta = toObjects(cachedData.naoSegueDeVolta);
                                    let listNovosSeguidores = [];
                                    let listNovosSeguindo = [];
                                    let listSeguidoresPerdidos = [];
                                    let listNaoSigoDeVolta = toObjects([...dbFollowers].filter(u => !dbFollowing.has(u)));
                                    let listHistorico = []; // Será carregado sob demanda

                                    const totalFollowers = cachedData.profileInfo ? cachedData.profileInfo.data.user.edge_followed_by.count : 'N/A';
                                    const totalFollowing = cachedData.profileInfo ? cachedData.profileInfo.data.user.edge_follow.count : 'N/A';

                                    statusDiv.innerText = `Dados carregados do cache. Seguidores: ${dbFollowers.size} (Oficial: ${totalFollowers}) | Seguindo: ${dbFollowing.size} (Oficial: ${totalFollowing})`;

                                    const tabelaContainer = document.getElementById("tabelaContainer");

                                    // Adiciona abas
                                    const tabsHtml = `
                                        <div style="margin-bottom: 15px;">
                                            <button id="btnUpdateApi" style="background: #0095f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">🔄 Atualizar Dados (Baixar e Salvar no DB)</button>
                                        </div>
                                        <div class="tab-container">
                                            <button id="tabNaoSegueDeVolta" class="tab-button active">Não Segue de Volta (<span id="countNaoSegue">${listNaoSegueDeVolta.length}</span>)</button>
                                            <button id="tabNovosSeguidores" class="tab-button">Novos Seguidores (<span id="countNovosSeguidores">${listNovosSeguidores.length}</span>)</button>
                                            <button id="tabNovosSeguindo" class="tab-button">Novos Seguindo (<span id="countNovosSeguindo">${listNovosSeguindo.length}</span>)</button>
                                            <button id="tabSeguidoresPerdidos" class="tab-button">Seguidores Perdidos (<span id="countSeguidoresPerdidos">${listSeguidoresPerdidos.length}</span>)</button>
                                            <button id="tabNaoSigoDeVolta" class="tab-button">Não Sigo de Volta (<span id="countNaoSigo">${listNaoSigoDeVolta.length}</span>)</button>
                                            <button id="tabHistorico" class="tab-button">Histórico</button>
                                        </div>
                                        <div id="tabContent"></div>
                                    `;

                                    tabelaContainer.innerHTML = tabsHtml;

                                    // Referências para as listas (usando let para poder atualizar)
                                    lists = {
                                        'tabNaoSegueDeVolta': listNaoSegueDeVolta,
                                        'tabNovosSeguidores': listNovosSeguidores,
                                        'tabNovosSeguindo': listNovosSeguindo,
                                        'tabSeguidoresPerdidos': listSeguidoresPerdidos,
                                        'tabNaoSigoDeVolta': listNaoSigoDeVolta,
                                        'tabHistorico': listHistorico
                                    };

                                    let currentTabId = initialTab;
                                    let currentList = lists[currentTabId];

                                    async function renderCurrentTab() {
                                        // Atualiza classe active
                                        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                                        const activeBtn = document.getElementById(currentTabId);
                                        if(activeBtn) activeBtn.classList.add('active');

                                        if (currentTabId === 'tabHistorico') {
                                            currentList = await dbHelper.loadUnfollowHistory();
                                        } else {
                                            currentList = lists[currentTabId];
                                        }

                                        const tableId = currentTabId === 'tabHistorico' ? 'historicoTable' : 'naoSegueDeVoltaTable';
                                        const contentDiv = document.getElementById("tabContent");
                                        contentDiv.innerHTML = `
                                            <div style="margin-bottom: 10px;">
                                            </div>
                                            <table id="${tableId}" style="width: 100%; border-collapse: collapse; margin-top: 20px;"></table>
                                            <div style="margin-top: 20px;">
                                                <button id="selecionarTodosBtn">Selecionar Todos</button>
                                                <button id="desmarcarTodosBtn">Desmarcar Todos</button>
                                                ${(currentTabId === 'tabNaoSegueDeVolta' || currentTabId === 'tabSeguidoresPerdidos') ? `
                                                    <button id="unfollowBtn">Unfollow</button>
                                                    <button id="bloquearBtn" style="margin-left: 10px; background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Bloquear</button>
                                                    ${currentTabId === 'tabNaoSegueDeVolta' ? `<button id="corrigirBtn" style="margin-left: 10px; background-color: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;" title="Remove usuários selecionados desta lista permanentemente">Corrigir (Já Sigo)</button>` : ''}
                                                ` : ''}
                                                ${currentTabId === 'tabNaoSigoDeVolta' ? `<button id="followBackBtn" style="background:#0095f6;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Seguir de Volta (Em breve)</button>` : ''}
                                                ${currentTabId === 'tabHistorico' ? `<button id="limparHistoricoBtn" style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Limpar Selecionados</button>` : ''}
                                            </div>
                                        `;

                                        preencherTabela(currentList, true, currentTabId === 'tabHistorico');

                                        document.getElementById("selecionarTodosBtn").onclick = selecionarTodos;
                                        document.getElementById("desmarcarTodosBtn").onclick = desmarcarTodos;

                                        if (document.getElementById("unfollowBtn")) {
                                            document.getElementById("unfollowBtn").onclick = unfollowSelecionados;
                                        }
                                        if (document.getElementById("bloquearBtn")) {
                                            document.getElementById("bloquearBtn").onclick = bloquearSelecionados;
                                        }
                                        if (document.getElementById("corrigirBtn")) {
                                            document.getElementById("corrigirBtn").onclick = async () => {
                                                const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(cb => cb.dataset.username);
                                                if (selecionados.length === 0) return alert("Selecione os usuários que você já segue para corrigir.");

                                                if (confirm(`Marcar ${selecionados.length} usuários como 'Já Sigo'? Eles não aparecerão mais nesta lista.`)) {
                                                    for (const u of selecionados) {
                                                        await dbHelper.saveException(u);
                                                        cachedData.exceptions.add(u);
                                                    }
                                                    // Recalcula a lista
                                                    cachedData.naoSegueDeVolta = [...cachedData.seguindo].filter(user => !cachedData.seguidores.has(user) && !cachedData.exceptions.has(user));
                                                    lists['tabNaoSegueDeVolta'] = toObjects(cachedData.naoSegueDeVolta);
                                                    currentList = lists['tabNaoSegueDeVolta'];
                                                    document.getElementById('countNaoSegue').innerText = currentList.length;
                                                    renderCurrentTab();
                                                }
                                            };
                                        }
                                        if (document.getElementById("limparHistoricoBtn")) {
                                            document.getElementById("limparHistoricoBtn").onclick = async () => {
                                                const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(cb => cb.dataset.username);
                                                if (selecionados.length === 0) return alert("Selecione itens para limpar.");
                                                if(confirm(`Excluir ${selecionados.length} itens do histórico?`)) {
                                                    await dbHelper.deleteUnfollowHistory(selecionados);
                                                    renderCurrentTab();
                                                }
                                            };
                                        }
                                    }

                                    renderCurrentTab();

                                    // Event listeners para as abas
                                    const tabs = ['tabNaoSegueDeVolta', 'tabNovosSeguidores', 'tabNovosSeguindo', 'tabSeguidoresPerdidos', 'tabNaoSigoDeVolta', 'tabHistorico'];

                                    tabs.forEach(tabId => {
                                        document.getElementById(tabId).addEventListener('click', () => {
                                            currentTabId = tabId;
                                            renderCurrentTab();
                                        });
                                    });

                                    // Lógica do Botão Atualizar
                                    document.getElementById("btnUpdateApi").onclick = async () => {
                                        if (!cachedData.profileInfo) {
                                            statusDiv.innerText = "Buscando ID do usuário...";
                                            const profileInfoResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                                            if (profileInfoResponse.ok) {
                                                cachedData.profileInfo = await profileInfoResponse.json();
                                            } else {
                                                alert("Erro ao obter ID do usuário. Tente novamente mais tarde.");
                                                return;
                                            }
                                        }

                                        const userId = cachedData.profileInfo.data.user.id;
                                        const totalFollowing = cachedData.profileInfo.data.user.edge_follow.count;
                                        const totalFollowers = cachedData.profileInfo.data.user.edge_followed_by.count;

                                        // 1. Baixar Seguindo
                                        const apiFollowing = await fetchUserListAPI(userId, 'following', totalFollowing);
                                        if (processoCancelado || !apiFollowing) return;

                                        // 2. Baixar Seguidores
                                        const apiFollowers = await fetchUserListAPI(userId, 'followers', totalFollowers);
                                        if (processoCancelado || !apiFollowers) return;

                                        statusDiv.innerText = "Calculando diferenças e salvando no Banco de Dados...";

                                        // 3. Calcular Novos (Comparando API vs DB Antigo)
                                        const novosSeguidoresSet = [...apiFollowers].filter(u => !cachedData.seguidores.has(u));
                                        const novosSeguindoSet = [...apiFollowing].filter(u => !cachedData.seguindo.has(u));
                                        const seguidoresPerdidosSet = [...cachedData.seguidores].filter(u => !apiFollowers.has(u));

                                        // 4. Salvar no DB (Substitui o antigo pelo novo da API)
                                        // Prepara objetos completos para salvar (com foto)
                                        const followersToSave = [...apiFollowers].map(u => cachedData.userDetails.get(u) || { username: u, photoUrl: null });
                                        const followingToSave = [...apiFollowing].map(u => cachedData.userDetails.get(u) || { username: u, photoUrl: null });

                                        await dbHelper.saveCache('followers', followersToSave);
                                        await dbHelper.saveCache('following', followingToSave);

                                        // 5. Atualizar Cache em Memória e Listas
                                        cachedData.seguidores = apiFollowers;
                                        cachedData.seguindo = apiFollowing;
                                        cachedData.naoSegueDeVolta = [...apiFollowing].filter(user => !apiFollowers.has(user) && !cachedData.exceptions.has(user));

                                        lists['tabNaoSegueDeVolta'] = toObjects(cachedData.naoSegueDeVolta);
                                        lists['tabNovosSeguidores'] = toObjects(novosSeguidoresSet);
                                        lists['tabNovosSeguindo'] = toObjects(novosSeguindoSet);
                                        lists['tabSeguidoresPerdidos'] = toObjects(seguidoresPerdidosSet);
                                        lists['tabNaoSigoDeVolta'] = toObjects([...apiFollowers].filter(u => !apiFollowing.has(u)));

                                        // Atualizar Contadores
                                        document.getElementById('countNaoSegue').innerText = lists['tabNaoSegueDeVolta'].length;
                                        document.getElementById('countNovosSeguidores').innerText = lists['tabNovosSeguidores'].length;
                                        document.getElementById('countNovosSeguindo').innerText = lists['tabNovosSeguindo'].length;
                                        document.getElementById('countSeguidoresPerdidos').innerText = lists['tabSeguidoresPerdidos'].length;
                                        document.getElementById('countNaoSigo').innerText = lists['tabNaoSigoDeVolta'].length;

                                        statusDiv.innerText = "Dados atualizados e salvos no IndexDB com sucesso!";
                                        currentList = lists[currentTabId];
                                        renderCurrentTab();
                                    };
                                }

                                // As funções de unfollow são movidas para cá para ter acesso ao escopo de `cachedData`, `statusDiv`, etc.
                                function selecionarTodos() {
                                    document.querySelectorAll(`#naoSegueDeVoltaTable .unfollowCheckbox`).forEach((checkbox) => {
                                        checkbox.checked = true;
                                    });
                                }

                                function desmarcarTodos() {
                                    document.querySelectorAll(`#naoSegueDeVoltaTable .unfollowCheckbox`).forEach((checkbox) => {
                                        checkbox.checked = false;
                                    });
                                }

                                function bloquearSelecionados() {
                                    const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(
                                        (checkbox) => checkbox.dataset.username
                                    );
                                    if (selecionados.length === 0) {
                                        alert("Nenhum usuário selecionado para Bloquear.");
                                        return;
                                    }
                                    const btn = document.getElementById("bloquearBtn");
                                    btn.disabled = true;
                                    btn.textContent = "Processando...";

                                    blockUsers(selecionados, 0, () => {
                                        btn.disabled = false;
                                        btn.textContent = "Bloquear";
                                    });
                                }

                                function blockUsers(users, index, callback) {
                                    if (index >= users.length) {
                                        alert("Bloqueio concluído.");
                                        if (callback) callback();
                                        return;
                                    }
                                    const username = users[index];
                                    statusDiv.innerText = `Bloqueando ${username} (${index + 1}/${users.length})...`;
                                    history.pushState(null, null, `/${username}/`);
                                    window.dispatchEvent(new Event("popstate"));

                                    setTimeout(() => {
                                        // 1. Clicar nos 3 pontinhos (Opções)
                                        const xpath1 = "/html/body/div[1]/div/div/div[2]/div/div/div[1]/div[2]/div[1]/section/main/div/div/header/div/section[2]/div/div[1]/div[2]/div";
                                        let optionsClicked = executeXPathClick(xpath1);

                                        if (!optionsClicked) {
                                            // Fallback: busca por SVG de opções se o XPath falhar
                                            const svgs = document.querySelectorAll('svg[aria-label="Opções"], svg[aria-label="Options"]');
                                            if (svgs.length > 0) {
                                                let parent = svgs[0].closest('div[role="button"]') || svgs[0].parentNode;
                                                if (parent) { parent.click(); optionsClicked = true; }
                                            }
                                        }

                                        if (optionsClicked) {
                                            setTimeout(() => {
                                                // 2. Clicar em "Bloquear" no menu que abriu
                                                let blockMenuClicked = false;
                                                // Tenta XPaths comuns para o menu (div[5], div[6], etc)
                                                const menuXpaths = [
                                                    "/html/body/div[5]/div[1]/div/div[2]/div/div/div/div/div/button[1]",
                                                    "/html/body/div[6]/div[1]/div/div[2]/div/div/div/div/div/button[1]",
                                                    "/html/body/div[7]/div[1]/div/div[2]/div/div/div/div/div/button[1]"
                                                ];
                                                for (let xp of menuXpaths) {
                                                    if (executeXPathClick(xp)) { blockMenuClicked = true; break; }
                                                }

                                                if (!blockMenuClicked) {
                                                    // Fallback: Busca botão "Bloquear" no último dialog aberto
                                                    const dialogs = document.querySelectorAll('div[role="dialog"]');
                                                    if (dialogs.length > 0) {
                                                        const lastDialog = dialogs[dialogs.length - 1];
                                                        const btn = Array.from(lastDialog.querySelectorAll('button')).find(b => b.innerText.trim() === 'Bloquear' || b.innerText.trim() === 'Block');
                                                        if (btn) { btn.click(); blockMenuClicked = true; }
                                                    }
                                                }

                                                if (blockMenuClicked) {
                                                    setTimeout(() => {
                                                        // 3. Confirmar "Bloquear" no modal de confirmação
                                                        let confirmClicked = false;
                                                        // Tenta XPaths comuns para o modal de confirmação
                                                        const confirmXpaths = [
                                                            "/html/body/div[10]/div[1]/div/div[2]/div/div/div/div/div/div/div[2]/button[1]",
                                                            "/html/body/div[9]/div[1]/div/div[2]/div/div/div/div/div/div/div[2]/button[1]",
                                                            "/html/body/div[8]/div[1]/div/div[2]/div/div/div/div/div/div/div[2]/button[1]"
                                                        ];
                                                        for (let xp of confirmXpaths) {
                                                            if (executeXPathClick(xp)) { confirmClicked = true; break; }
                                                        }

                                                        if (!confirmClicked) {
                                                            // Fallback robusto: Busca botão "Bloquear" no último dialog (que deve ser o de confirmação)
                                                            const dialogs = document.querySelectorAll('div[role="dialog"]');
                                                            if (dialogs.length > 0) {
                                                                const lastDialog = dialogs[dialogs.length - 1];
                                                                const btn = Array.from(lastDialog.querySelectorAll('button')).find(b => b.innerText.trim() === 'Bloquear' || b.innerText.trim() === 'Block');
                                                                if (btn) { btn.click(); confirmClicked = true; }
                                                            }
                                                        }
                                                        setTimeout(() => blockUsers(users, index + 1, callback), 2000);
                                                    }, 2000);
                                                } else {
                                                    console.warn("Botão Bloquear do menu não encontrado.");
                                                    blockUsers(users, index + 1, callback);
                                                }
                                            }, 2000);
                                        } else {
                                            console.warn("Botão Opções (3 pontos) não encontrado.");
                                            blockUsers(users, index + 1, callback);
                                        }
                                    }, 4000);
                                }

                                function unfollowSelecionados() {
                                    if (isUnfollowing) {
                                        alert("Processo de unfollow já em andamento.");
                                        return;
                                    }

                                    const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(
                                        (checkbox) => checkbox.dataset.username
                                    );

                                    if (selecionados.length === 0) {
                                        alert("Nenhum usuário selecionado para Unfollow.");
                                        return;
                                    }

                                    const unfollowBtn = document.getElementById("unfollowBtn");
                                    unfollowBtn.disabled = true;
                                    unfollowBtn.textContent = "Processando...";
                                    isUnfollowing = true;

                                    unfollowUsers(selecionados, 0, () => {
                                        unfollowBtn.disabled = false;
                                        unfollowBtn.textContent = "Unfollow";
                                        isUnfollowing = false;
                                        const tabHistorico = document.getElementById('tabHistorico');
                                        if (tabHistorico) tabHistorico.click();
                                    });
                                }

                                function unfollowUsers(users, index, callback) {
                                    if (index >= users.length || processoCancelado) {
                                        if (!processoCancelado) {
                                            console.log("Todos os usuários processados. Unfollow concluído.");
                                            alert("Unfollow concluído.");
                                        }
                                        if (callback) callback();
                                        return;
                                    }

                                    const username = users[index];
                                    statusDiv.innerText = `Deixando de seguir ${username} (${index + 1}/${users.length})...`;
                                    history.pushState(null, null, `/${username}/`);
                                    window.dispatchEvent(new Event("popstate"));

                                    const unfollowDelay = loadSettings().unfollowDelay;

                                    setTimeout(() => {
                                        if (processoCancelado) { if (callback) callback(); return; }

                                        // Seletores robustos para o botão "Seguindo"
                                        let followBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(el => ['Seguindo', 'Following'].includes(el.innerText.trim()));

                                        if (followBtn) {
                                            followBtn.click();
                                            setTimeout(() => {
                                                if (processoCancelado) { if (callback) callback(); return; }

                                                // Seletor robusto para o botão de confirmação
                                                const confirmBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(btn => ['Deixar de seguir', 'Unfollow'].includes(btn.innerText.trim()));

                                                if (confirmBtn) {
                                                    confirmBtn.click();
                                                    console.log(`Unfollow confirmado para ${username}`);

                                                    // Salva no histórico
                                                    getProfilePic(username).then(photoUrl => {
                                                        dbHelper.saveUnfollowHistory({
                                                            username: username,
                                                            photoUrl: photoUrl,
                                                            unfollowDate: new Date().toISOString()
                                                        }).catch(err => console.error(`Falha ao salvar ${username} no histórico:`, err));
                                                    });

                                                    // Remove da lista de "Não segue de volta" em memória
                                                    const naoSegueList = lists['tabNaoSegueDeVolta'];
                                                    if (naoSegueList) {
                                                        const userIndex = naoSegueList.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
                                                        if (userIndex > -1) {
                                                            naoSegueList.splice(userIndex, 1);
                                                        }
                                                        // Atualiza o contador da aba
                                                        const countSpan = document.getElementById('countNaoSegue');
                                                        if (countSpan) countSpan.innerText = naoSegueList.length;
                                                    }

                                                    // Atualiza o cache de 'following' no banco de dados para persistir a mudança
                                                    const lowerUser = username.toLowerCase();
                                                    if (cachedData.seguindo && cachedData.seguindo.has(lowerUser)) {
                                                        cachedData.seguindo.delete(lowerUser);
                                                        const newFollowingList = Array.from(cachedData.seguindo).map(u =>
                                                            cachedData.userDetails.get(u) || { username: u, photoUrl: null }
                                                        );
                                                        dbHelper.saveCache('following', newFollowingList).catch(e => console.error("Erro ao atualizar cache following:", e));
                                                    }

                                                    // Remove a linha da tabela visível
                                                    const row = document.querySelector(`#naoSegueDeVoltaTable tr[data-username="${username}"]`);
                                                    if (row) row.remove();

                                                    // Processa o próximo usuário após o delay
                                                    setTimeout(() => {
                                                        unfollowUsers(users, index + 1, callback);
                                                    }, unfollowDelay);

                                                } else {
                                                    console.log(`Botão de confirmação não encontrado para ${username}, pulando.`);
                                                    alert(`Não foi possível confirmar o unfollow para ${username}. Pulando.`);
                                                    unfollowUsers(users, index + 1, callback);
                                                }
                                            }, 2000); // Atraso para o modal de confirmação aparecer
                                        } else {
                                            console.log(`Botão 'Seguindo' não encontrado para ${username}, pulando.`);
                                            alert(`Botão 'Seguindo' não encontrado para ${username}. Pulando.`);
                                            unfollowUsers(users, index + 1, callback);
                                        }
                                    }, 4000); // Atraso para a página do perfil carregar
                                }

                                carregarDadosIniciais();
                            }

                            // --- LÓGICA PARA "SEGUINDO" ---
                            async function iniciarProcessoSeguindo() {
                                if (document.getElementById("seguindoModal")) return;
                                if (document.getElementById("automationStatusModal")) return;

                                const originalPath = window.location.pathname;

                                const pathParts = window.location.pathname.split('/').filter(Boolean);
                                const username = pathParts[0];
                                const appID = '936619743392459';
                                if (!username || (pathParts.length > 1 && !['followers', 'following'].includes(pathParts[1]))) {
                                    alert("Por favor, vá para a página de perfil de um usuário para usar esta função.");
                                    return;
                                }

                                // 1. Criar o modal de status da automação
                                const statusModal = document.createElement("div");
                                statusModal.id = "automationStatusModal";
                                statusModal.className = "submenu-modal";
                                statusModal.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 500px; border: 1px solid #ccc;
                                    border-radius: 10px; padding: 20px; z-index: 10001;
                                `;
                                statusModal.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">Coletando Dados...</span>
                                    </div>
                                    <div style="padding: 15px;">
                                        <p>Por favor, aguarde. O script está navegando para buscar as informações necessárias.</p>
                                        <ul style="list-style: none; padding: 0; margin-top: 20px;">
                                            <li id="status-step-1" style="margin-bottom: 10px;"><span>⏳</span> Carregando lista de "Seguindo"...</li>
                                    <li id="status-step-2" style="margin-bottom: 10px;"><span>⏳</span> Carregando cache de "Melhores Amigos"...</li>
                                    <li id="status-step-3" style="margin-bottom: 10px;"><span>⏳</span> Carregando cache de "Ocultar Stories"...</li>
                                    <li id="status-step-4" style="margin-bottom: 10px;"><span>⏳</span> Carregando cache de "Contas Silenciadas"...</li>
                                    </ul>
                                <div id="automation-result" style="margin-top: 20px; font-weight: bold; color: red;"></div>
                                `;
                                document.body.appendChild(statusModal);

                                const updateStatus = (step, success, message = '') => {
                                    const stepLi = document.getElementById(`status-step-${step}`);
                                    if (stepLi) {
                                        stepLi.innerHTML = `<span>${success ? '✅' : '❌'}</span> ${stepLi.innerText.substring(2)} ${message}`;
                                    }
                                };

                                // Função para navegar, extrair e retornar
                                const fetchAndCache = async (url, extractorFn, cacheKey, step) => {
                                    if (userListCache[cacheKey] !== null) {
                                        updateStatus(step, true, '(Já em cache)');
                                        return true;
                                    }
                                    try {
                                        history.pushState(null, null, url);
                                        window.dispatchEvent(new Event("popstate"));
                                        await new Promise(r => setTimeout(r, 3000)); // Espera a página carregar

                                        const users = await extractorFn();
                                        if (url.includes('muted_accounts')) {
                                            userListCache[cacheKey] = new Set(users.map(u => u.username));
                                        } else {
                                            const officialStates = new Map();
                                            const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                                            flexboxes.forEach(flex => {
                                                const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                                if (userText) {
                                                    const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                                                    if (officialCheckboxContainer) {
                                                        const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                                        const isChecked = iconDiv && (window.getComputedStyle(iconDiv).backgroundColor === "rgb(74, 93, 249)" || iconDiv.style.backgroundImage.includes('circle-check__filled'));
                                                        officialStates.set(userText, isChecked);
                                                    }
                                                }
                                            });
                                            const filteredUsernames = users.filter(u => officialStates.get(u.username) === true).map(u => u.username);
                                            userListCache[cacheKey] = new Set(filteredUsernames);
                                        }
                                        updateStatus(step, true);
                                        return true;
                                    } catch (error) {
                                        console.error(`Falha ao buscar dados para ${cacheKey}:`, error);
                                        updateStatus(step, false);
                                        return false;
                                    }
                                };

                                const div = document.createElement("div");
                                div.id = "seguindoModal";
                                div.className = "submenu-modal";
                                let processoCancelado = false;

                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 800px; max-height: 90vh; border: 1px solid #ccc;
                                    border-radius: 10px; padding: 20px; z-index: 10000; overflow: auto;
                                `;
                                div.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">
                                            Gerenciador de "Seguindo"
                                            <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie quem você segue. Filtre por quem é Melhor Amigo, Silenciado ou tem Story Oculto.</span></div>
                                        </span>
                                        <div class="modal-controls"><button id="seguindoMinimizarBtn" title="Minimizar">_</button><button id="fecharSeguindoBtn" title="Fechar">X</button></div>
                                    </div>
                                    <div style="padding: 15px;">
                                        <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; margin-bottom: 15px;">
                                            <button id="atualizarSeguindoBtn" title="Atualizar Dados" style="background: #1abc9c; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer;">🔄️ Atualizar</button>
                                            <button id="silenciarSeguindoBtn" style="background: #8e44ad; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer;">Silenciar/Reativar</button>
                                            <button id="closeFriendsSeguindoBtn" style="background: #2ecc71; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer;">Melhores Amigos</button>
                                            <button id="hideStorySeguindoBtn" style="background: #f39c12; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer;">Ocultar Story</button>
                                        </div>
                                    </div>
                                    <div style="margin: 20px 0;">
                                        <input type="text" id="seguindoSearchInput" placeholder="Pesquisar na lista de seguindo..." style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                                    </div>
                                    <div id="statusSeguindo" style="margin-top: 20px; font-weight: bold;"></div>
                                    <div id="tabelaSeguindoContainer" style="display: block; margin-top: 15px;"></div>
                                `;
                                document.body.appendChild(div);

                                document.getElementById("fecharSeguindoBtn").addEventListener("click", () => {
                                    processoCancelado = true;
                                    document.getElementById("progressBar")?.remove();
                                    div.remove();
                                });

                                document.getElementById("seguindoMinimizarBtn").addEventListener("click", () => {
                                    const modal = document.getElementById('seguindoModal');
                                    const contentToToggle = [
                                        modal.querySelector('input[type="text"]').parentElement, // div da pesquisa
                                        modal.querySelector('#tabelaSeguindoContainer'),
                                        modal.querySelector('#tabelaSeguindoContainer')
                                    ].filter(Boolean);

                                    const btn = document.getElementById('seguindoMinimizarBtn');
                                    const isMinimized = modal.dataset.minimized === 'true';

                                    contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');
                                    modal.dataset.minimized = !isMinimized;
                                    btn.textContent = isMinimized ? 'Minimizar' : 'Maximizar';
                                    modal.style.maxHeight = isMinimized ? '90vh' : 'none';
                                });

                                document.getElementById("atualizarSeguindoBtn").addEventListener("click", () => {
                                    // Limpa o cache e recarrega os dados
                                    Object.keys(userListCache).forEach(key => userListCache[key] = null);
                                    div.remove();
                                    iniciarProcessoSeguindo();
                                });

                                const statusDiv = document.getElementById("statusSeguindo");
                                const container = document.getElementById("tabelaSeguindoContainer");
                                let seguindoList = [];
                                const selectedUsers = new Set(); // Armazena todos os usuários selecionados entre as páginas

                            const fetchUserListAPISeguindo = async (userId, type, total) => {
                                const userList = [];
                                let nextMaxId = '';
                                let hasNextPage = true;
                                let bar, fill, text;

                                const setupProgressBar = () => {
                                    bar = document.createElement("div");
                                    bar.id = "progressBar";
                                    bar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:10001;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;";
                                    fill = document.createElement("div");
                                    fill.style.cssText = "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";
                                    text = document.createElement("div");
                                    text.style.position = "relative";
                                    bar.appendChild(fill);
                                    bar.appendChild(text);
                                    document.body.appendChild(bar);
                                };

                                const updateLocalProgressBar = (progress, total) => {
                                    if (!bar) setupProgressBar();
                                    const percent = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
                                    fill.style.width = `${percent}%`;
                                    text.innerText = `Buscando: ${progress} de ${total}`;
                                };

                                while (hasNextPage && !processoCancelado) {
                                    const response = await fetch(`https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=50&max_id=${nextMaxId}`, { headers: { 'X-IG-App-ID': appID } });
                                    const data = await response.json();
                                    data.users.forEach(user => userList.push({ username: user.username, photoUrl: user.profile_pic_url }));
                                    updateLocalProgressBar(userList.length, total);
                                    hasNextPage = !!data.next_max_id;
                                    nextMaxId = data.next_max_id;
                                    await new Promise(r => setTimeout(r, 250));
                                }
                                if (bar) bar.remove();
                                return processoCancelado ? null : userList;
                            };

                                async function carregarSeguindo() {
                                    statusDiv.innerText = 'Buscando informações do perfil...';
                                    const profileInfoResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                                    if (processoCancelado) return;
                                    const profileInfo = await profileInfoResponse.json();
                                    const userId = profileInfo.data?.user?.id;
                                    if (!userId) { alert('Não foi possível obter o ID do usuário.'); div.remove(); return; }

                                    const totalFollowing = profileInfo.data.user.edge_follow.count;

                                    // Inicia o processo de automação
                                const step2Success = await fetchAndCache('/accounts/close_friends/', extractCloseFriendsUsernames, 'closeFriends', 2);
                                const step3Success = await fetchAndCache('/accounts/hide_story_and_live_from/', extractHideStoryUsernames, 'hiddenStory', 3);
                                const step4Success = await fetchAndCache('/accounts/muted_accounts/', extractMutedAccountsUsernames, 'muted', 4);

                                const step1Success = await (async () => {
                                    if (!step2Success || !step3Success || !step4Success) {
                                        updateStatus(1, false, '(Abortado)');
                                        return false;
                                    }
                                        seguindoList = await fetchUserListAPISeguindo(userId, 'following', totalFollowing);
                                        const success = seguindoList !== null;
                                        updateStatus(1, success);
                                        return success;
                                    })();

                                    // Retorna para a página original
                                    history.pushState(null, null, originalPath);
                                    window.dispatchEvent(new Event("popstate"));
                                    await new Promise(r => setTimeout(r, 500));

                                if (!step1Success || !step2Success || !step3Success || !step4Success) {
                                        document.getElementById('automation-result').innerHTML = 'Falha na coleta automática. Por favor, abra os menus "Melhores Amigos", "Ocultar Story" e "Contas Silenciadas" manualmente para carregar os dados e tente novamente.';
                                        return; // Interrompe se alguma etapa falhou
                                    }

                                    statusModal.remove(); // Remove o modal de status
                                    document.body.appendChild(div); // Adiciona o modal principal

                                    statusDiv.innerText = `Total: ${seguindoList.length} perfis seguidos.`;

                                    let currentPage = 1; // Reinicia a paginação
                                    const itemsPerPage = loadSettings().itemsPerPage;

                                    // Configuração para ordenação da tabela
                                    let sortConfig = { key: 'username', direction: 'ascending' };

                                    const renderList = (page) => {
                                        const startIndex = (page - 1) * itemsPerPage;
                                        const endIndex = startIndex + itemsPerPage;

                                        // Filtra por pesquisa antes de ordenar e paginar
                                        const searchTerm = document.getElementById('seguindoSearchInput')?.value.toLowerCase() || '';
                                        let filteredUsers = seguindoList;
                                        if (searchTerm) {
                                            filteredUsers = seguindoList.filter(user => user.username.toLowerCase().includes(searchTerm));
                                        }
                                        let tableHtml = `
                                            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                                <thead style="cursor: pointer;">
                                                    <tr style="text-align: left; border-bottom: 2px solid #dbdbdb;">
                                                        <th style="padding: 8px; width: 20px;"><input type="checkbox" id="selectAllCheckbox" title="Selecionar Todos"></th>
                                                        <th style="padding: 8px;" data-sort-key="username">Usuário ${sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                                        <th style="padding: 8px; text-align: center;" data-sort-key="isMuted" title="${userListCache.muted === null ? 'Visite o menu Contas Silenciadas para carregar estes dados.' : ''}">Silenciado? ${userListCache.muted === null ? '??' : (sortConfig.key === 'isMuted' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                                        <th style="padding: 8px; text-align: center;" data-sort-key="isCloseFriend" title="${userListCache.closeFriends === null ? 'Visite o menu Amigos Próximos para carregar estes dados.' : ''}">Melhores Amigos? ${userListCache.closeFriends === null ? '??' : (sortConfig.key === 'isCloseFriend' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                                        <th style="padding: 8px; text-align: center;" data-sort-key="isStoryHidden" title="${userListCache.hiddenStory === null ? 'Visite o menu Ocultar Story para carregar estes dados.' : ''}">Ocultar Stories? ${userListCache.hiddenStory === null ? '??' : (sortConfig.key === 'isStoryHidden' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody style="max-height: 60vh; overflow-y: auto;">
                                        `;

                                        // Ordena a lista antes de paginar
                                        const sortedUsers = [...filteredUsers].sort((a, b) => {
                                            const getSortValue = (user, key) => {
                                                if (key === 'username') return user.username.toLowerCase();
                                                if (key === 'isMuted') return userListCache.muted ? (userListCache.muted.has(user.username) ? 1 : 2) : 3;
                                                if (key === 'isCloseFriend') return userListCache.closeFriends ? (userListCache.closeFriends.has(user.username) ? 1 : 2) : 3;
                                                if (key === 'isStoryHidden') return userListCache.hiddenStory ? (userListCache.hiddenStory.has(user.username) ? 1 : 2) : 3;
                                                return 0;
                                            };

                                            const valA = getSortValue(a, sortConfig.key);
                                            const valB = getSortValue(b, sortConfig.key);

                                            if (valA < valB) {
                                                return sortConfig.direction === 'ascending' ? -1 : 1;
                                            }
                                            if (valA > valB) {
                                                return sortConfig.direction === 'ascending' ? 1 : -1;
                                            }
                                            return 0;
                                        });

                                        const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

                                        paginatedUsers.forEach(({ username, photoUrl }) => {
                                            const isChecked = selectedUsers.has(username);
                                            // Verifica os dados no cache global
                                            const isMuted = userListCache.muted ? (userListCache.muted.has(username) ? "Sim" : "Não") : "??";
                                            const isCloseFriend = userListCache.closeFriends ? (userListCache.closeFriends.has(username) ? "Sim" : "Não") : "??";
                                            const isStoryHidden = userListCache.hiddenStory ? (userListCache.hiddenStory.has(username) ? "Sim" : "Não") : "??";

                                            const getStatusStyle = (status, type) => {
                                                if (status === 'Sim') {
                                                    const colors = {
                                                        muted: { bg: '#e74c3c', text: 'white' },
                                                        closeFriend: { bg: '#2ecc71', text: 'white' },
                                                        storyHidden: { bg: '#f39c12', text: 'white' }
                                                    };
                                                    return `background-color: ${colors[type].bg}; color: ${colors[type].text};`;
                                                }
                                                if (status === 'Não') {
                                                    return 'background-color: #ecf0f1; color: #7f8c8d;';
                                                }
                                                return ''; // Estilo padrão para '??'
                                            };

                                            tableHtml += `
                                                <tr style="border-bottom: 1px solid #dbdbdb;">
                                                    <td style="padding: 8px;"><input type="checkbox" class="user-checkbox" data-username="${username}" style="cursor: pointer;" ${isChecked ? 'checked' : ''}></td>
                                                    <td style="padding: 8px; display:flex; align-items:center; gap:10px;">
                                                        <img src="${photoUrl}" alt="${username}" style="width:40px; height:40px; border-radius:50%;">
                                                        <a href="https://www.instagram.com/${username}" target="_blank" style="text-decoration:none; color:inherit; font-weight:600;">${username}</a>
                                                    </td>
                                                    <td style="text-align: center; padding: 8px;"><span style="padding: 4px 8px; border-radius: 5px; font-weight: bold; ${getStatusStyle(isMuted, 'muted')}">${isMuted}</span></td>
                                                    <td style="text-align: center; padding: 8px;"><span style="padding: 4px 8px; border-radius: 5px; font-weight: bold; ${getStatusStyle(isCloseFriend, 'closeFriend')}">${isCloseFriend}</span></td>
                                                    <td style="text-align: center; padding: 8px;"><span style="padding: 4px 8px; border-radius: 5px; font-weight: bold; ${getStatusStyle(isStoryHidden, 'storyHidden')}">${isStoryHidden}</span></td>
                                                </tr>
                                            `;
                                        });
                                        tableHtml += `</tbody></table>`;

                                        const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
                                        let paginationHtml = `<div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:20px;">`;
                                        if (page > 1) paginationHtml += `<button id="prevPageBtn" style="padding:5px 10px;">Anterior</button>`;
                                        paginationHtml += `<span>Página ${page} de ${totalPages}</span>`;
                                        if (page < totalPages) paginationHtml += `<button id="nextPageBtn" style="padding:5px 10px;">Próximo</button>`;
                                        paginationHtml += `</div>`;

                                        container.innerHTML = tableHtml + paginationHtml;

                                        const prevBtn = document.getElementById("prevPageBtn");
                                        if (prevBtn) prevBtn.onclick = () => renderList(--currentPage);
                                        const nextBtn = document.getElementById("nextPageBtn");
                                        if (nextBtn) nextBtn.onclick = () => renderList(++currentPage);

                                        // Adiciona eventos aos checkboxes individuais para atualizar o Set
                                        document.querySelectorAll('#seguindoModal .user-checkbox').forEach(checkbox => {
                                            checkbox.addEventListener('change', (e) => {
                                                const username = e.target.dataset.username;
                                                if (e.target.checked) {
                                                    selectedUsers.add(username);
                                                } else {
                                                    selectedUsers.delete(username);
                                                }
                                            });
                                        });

                                        // Adiciona evento para o checkbox "selecionar tudo"
                                        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
                                        if (selectAllCheckbox) {
                                            selectAllCheckbox.addEventListener('change', (e) => {
                                                const isChecked = e.target.checked;
                                                document.querySelectorAll('#tabelaSeguindoContainer .user-checkbox').forEach(checkbox => {
                                                    checkbox.checked = isChecked;
                                                });
                                            });
                                        }

                                        // Evento para a barra de pesquisa
                                        const searchInput = document.getElementById("seguindoSearchInput");
                                        searchInput.oninput = () => {
                                            renderList(1); // Volta para a primeira página ao pesquisar
                                        };

                                        // Adiciona eventos de clique para ordenação nos cabeçalhos
                                        document.querySelectorAll('#seguindoModal th[data-sort-key]').forEach(th => {
                                            th.addEventListener('click', () => {
                                                const key = th.dataset.sortKey;
                                                if (sortConfig.key === key) {
                                                    sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
                                                } else {
                                                    sortConfig = { key, direction: 'ascending' };
                                                }
                                                renderList(1); // Volta para a primeira página ao reordenar
                                            });
                                        });
                                    };

                                    document.getElementById('silenciarSeguindoBtn').onclick = () => handleActionOnSelected(Array.from(selectedUsers), 'mute');
                                    document.getElementById('closeFriendsSeguindoBtn').onclick = () => handleActionOnSelected(Array.from(selectedUsers), 'closeFriends');
                                    document.getElementById('hideStorySeguindoBtn').onclick = () => handleActionOnSelected(Array.from(selectedUsers), 'hideStory');

                                    if (seguindoList.length > 0) renderList(currentPage);
                                }
                                carregarSeguindo();
                            }

                            function abrirModalConfiguracoes() {
                                if (document.getElementById("settingsModal")) return;

                                const div = document.createElement("div");
                                div.id = "settingsModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 350px; border: 1px solid #ccc;
                                    border-radius: 10px; z-index: 10001;
                                `;
                                if (loadSettings().rgbBorder) {
                                    div.classList.add('rgb-border-effect');
                                }

                                const settings = loadSettings();

                                div.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">
                                            ${getText('settings')}
                                            <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Ajuste a aparência, atalhos e parâmetros de funcionamento do script.</span></div>
                                        </span>
                                        <div class="modal-controls">
                                            <button id="fecharSettingsBtn" title="Fechar">X</button>
                                        </div>
                                    </div>
                                    <div style="padding: 15px;">
                                        <div style="display: flex; flex-direction: column; gap: 10px;">
<<<<<<< HEAD
                                            <button id="settingsDarkModeBtn" class="menu-item-button" style="background: ${settings.darkMode ? '#4c5c75' : ''};">🌙 Modo Escuro</button>
                                            <button id="settingsRgbBorderBtn" class="menu-item-button" style="background: ${settings.rgbBorder ? '#4c5c75' : ''};">🌈 Borda RGB</button>
                                            <button id="settingsVoiceBtn" class="menu-item-button">🎙️ Comandos de Voz</button>
                                            <button id="settingsShortcutsBtn" class="menu-item-button">⌨️ Atalhos</button>
                                            <button id="settingsParamsBtn" class="menu-item-button">🔧 Parâmetros</button>
                                            <button id="settingsLangBtn" class="menu-item-button">🌐 Idioma</button>
=======
                                            <button id="settingsDarkModeBtn" class="menu-item-button" style="background: ${settings.darkMode ? '#4c5c75' : ''};">🌙 ${getText('darkMode')}</button>
                                            <button id="settingsRgbBorderBtn" class="menu-item-button" style="background: ${settings.rgbBorder ? '#4c5c75' : ''};">🌈 ${getText('rgbBorder')}</button>
                                            <button id="settingsShortcutsBtn" class="menu-item-button">⌨️ ${getText('shortcuts')}</button>
                                            <button id="settingsParamsBtn" class="menu-item-button">🔧 ${getText('parameters')}</button>
                                            <button id="settingsLangBtn" class="menu-item-button">🌐 ${getText('language')}</button>
>>>>>>> 7ed91515adc9e5bbc1ccde8503e365868427af03
                                        </div>
                                    </div>
                                `;
                                document.body.appendChild(div);

                                document.getElementById("fecharSettingsBtn").onclick = () => div.remove();

                                document.getElementById("settingsDarkModeBtn").onclick = () => {
                                    const newSetting = !loadSettings().darkMode;
                                    toggleDarkMode(newSetting);
                                    saveSettings({ darkMode: newSetting });
                                };

                                document.getElementById("settingsRgbBorderBtn").onclick = () => {
                                    const newSetting = !loadSettings().rgbBorder;
                                    toggleRgbBorder(newSetting);
                                    saveSettings({ rgbBorder: newSetting });
                                };

                                document.getElementById("settingsVoiceBtn").onclick = () => {
                                    div.remove();
                                    abrirModalComandosVoz();
                                };

                                document.getElementById("settingsShortcutsBtn").onclick = () => {
                                    div.remove();
                                    abrirModalAtalhos();
                                };

                                document.getElementById("settingsParamsBtn").onclick = () => {
                                    div.remove(); // Fecha o modal de config para abrir o de parâmetros
                                    abrirModalParametros();
                                };

                                document.getElementById("settingsLangBtn").onclick = () => {
                                    div.remove();
                                    abrirModalIdioma();
                                };
                            }

                            function abrirModalIdioma() {
                                if (document.getElementById("langModal")) return;
                                const div = document.createElement("div");
                                div.id = "langModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 300px; border: 1px solid #ccc;
                                    border-radius: 10px; z-index: 10001;
                                `;
                                if (loadSettings().rgbBorder) {
                                    div.classList.add('rgb-border-effect');
                                }

                                const languages = [
                                    { code: 'pt-BR', name: '🇧🇷 Português' },
                                    { code: 'en-US', name: '🇺🇸 English' },
                                    { code: 'es-ES', name: '🇪🇸 Español' },
                                    { code: 'fr-FR', name: '🇫🇷 Français' },
                                    { code: 'it-IT', name: '🇮🇹 Italiano' },
                                    { code: 'de-DE', name: '🇩🇪 Deutsch' }
                                ];

                                let html = `<div class="modal-header"><span class="modal-title">${getText('language')}</span><div class="modal-controls"><button id="fecharLangBtn">X</button></div></div><div style="padding: 15px; display: flex; flex-direction: column; gap: 10px;">`;
                                languages.forEach(lang => { html += `<button class="menu-item-button lang-option" data-lang="${lang.code}">${lang.name}</button>`; });
                                html += `</div>`;
                                div.innerHTML = html;
                                document.body.appendChild(div);

                                document.getElementById("fecharLangBtn").onclick = () => div.remove();
                                div.querySelectorAll('.lang-option').forEach(btn => {
                                    btn.onclick = () => { saveSettings({ language: btn.dataset.lang }); div.remove(); const oldMenu = document.querySelector('.assistive-menu'); if (oldMenu) oldMenu.remove(); };
                                });
                            }

                            function renderShortcuts() {
                                const list = document.getElementById('shortcuts-list');
                                if (!list) return;

                                const shortcuts = getShortcuts();
                                list.innerHTML = '';

                                if (shortcuts.length === 0) {
                                    list.innerHTML = '<p style="color: #8e8e8e; text-align: center;">Nenhum atalho configurado.</p>';
                                    return;
                                }

                                shortcuts.forEach((shortcut, index) => {
                                    const item = document.createElement('div');
                                    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #efefef;';

                                    const keyText = formatShortcutForDisplay(shortcut);
                                    const actionText = shortcut.xpath ? `XPath: ${shortcut.xpath.substring(0, 25)}...` : `Link: ${shortcut.link.substring(0, 25)}...`;

                                    item.innerHTML = `
                                        <div>
                                            <strong style="font-size: 16px;">${keyText}</strong>
                                            <span style="font-size: 12px; color: #8e8e8e; margin-left: 10px;">${actionText}</span>
                                        </div>
                                        <button data-index="${index}" class="delete-shortcut-btn" style="background: #ed4956; color: white; border: none; border-radius: 5px; cursor: pointer; padding: 4px 8px;">Excluir</button>
                                    `;
                                    list.appendChild(item);
                                });

                                document.querySelectorAll('.delete-shortcut-btn').forEach(button => {
                                    button.onclick = (e) => {
                                        const indexToDelete = parseInt(e.target.dataset.index, 10);
                                        let currentShortcuts = getShortcuts();
                                        currentShortcuts.splice(indexToDelete, 1);
                                        saveShortcuts(currentShortcuts);
                                        renderShortcuts(); // Re-render a lista
                                    };
                                });
                            }
<<<<<<< HEAD
                            
                            function abrirModalComandosVoz() {
                                if (document.getElementById("voiceCommandsModal")) return;

                                const div = document.createElement("div");
                                div.id = "voiceCommandsModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 500px; border: 1px solid #ccc;
                                    border-radius: 10px; z-index: 10001; max-height: 90vh; overflow-y: auto;
                                `;
                                if (loadSettings().rgbBorder) {
                                    div.classList.add('rgb-border-effect');
                                }

                                const isListening = voiceControl.isListening;

                                // Available actions mapping
                                const availableActions = [
                                    { value: "downloadStory", label: "Baixar Story" },
                                    { value: "openSettings", label: "Abrir Configurações" },
                                    { value: "closeMenu", label: "Fechar Menu" },
                                    { value: "toggleReelsScroll", label: "Rolar Reels" },
                                    { value: "downloadReel", label: "Baixar Reel" },
                                    { value: "openCloseFriends", label: "Amigos Próximos" },
                                    { value: "openHideStory", label: "Ocultar Story" },
                                    { value: "openMuted", label: "Contas Silenciadas" },
                                    { value: "openNotFollowingBack", label: "Não Segue de Volta" },
                                    { value: "openFollowing", label: "Seguindo" },
                                    { value: "openBlocked", label: "Bloqueados" },
                                    { value: "analyzeReels", label: "Análise Reels" },
                                    { value: "openEngagement", label: "Engajamento" },
                                    { value: "openInteractions", label: "Interações" }
                                ];

                                div.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">
                                            Comandos de Voz
                                            <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Controle o script usando sua voz.</span></div>
                                        </span>
                                        <div class="modal-controls">
                                            <button id="fecharVoiceBtn" title="Fechar">X</button>
                                        </div>
                                    </div>
                                    <div style="padding: 20px;">
                                        <div style="margin-bottom: 20px; text-align: center;">
                                            <button id="toggleVoiceBtn" style="background: ${isListening ? '#e74c3c' : '#2ecc71'}; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-size: 16px; font-weight: bold;">
                                                ${isListening ? '🛑 Parar Escuta' : '🎙️ Iniciar Escuta'}
                                            </button>
                                            <p id="voiceStatusText" style="font-size: 12px; color: #666; margin-top: 5px;">Status: ${isListening ? 'Ouvindo...' : 'Parado'}</p>
                                        </div>
                                        
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                            <h3 style="font-size: 16px; margin: 0;">Lista de Comandos</h3>
                                            <button id="addVoiceCommandBtn" style="background: #0095f6; color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-weight: bold; font-size: 18px;">+</button>
                                        </div>

                                        <div id="voiceCommandForm" style="display: none; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #dbdbdb;">
                                            <h4 id="formTitle" style="margin-top: 0; margin-bottom: 10px; font-size: 14px;">Novo Comando</h4>
                                            <input type="hidden" id="editIndex" value="-1">
                                            <div style="margin-bottom: 10px;">
                                                <label style="display: block; font-size: 12px; margin-bottom: 5px;">Frase de Comando:</label>
                                                <input type="text" id="commandPhrase" placeholder="Ex: abrir menu" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc; box-sizing: border-box; color: black;">
                                            </div>
                                            <div style="margin-bottom: 10px;">
                                                <label style="display: block; font-size: 12px; margin-bottom: 5px;">Ação:</label>
                                                <select id="commandAction" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc; box-sizing: border-box; color: black;">
                                                    ${availableActions.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
                                                </select>
                                            </div>
                                            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                                <button id="cancelCommandBtn" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Cancelar</button>
                                                <button id="saveCommandBtn" style="background: #0095f6; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Salvar</button>
                                            </div>
                                        </div>

                                        <div id="voiceCommandsList" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 5px;"></div>
                                    </div>
                                `;
                                document.body.appendChild(div);

                                const formDiv = document.getElementById('voiceCommandForm');
                                const phraseInput = document.getElementById('commandPhrase');
                                const actionSelect = document.getElementById('commandAction');
                                const editIndexInput = document.getElementById('editIndex');
                                const formTitle = document.getElementById('formTitle');

                                const renderList = () => {
                                    const list = document.getElementById('voiceCommandsList');
                                    list.innerHTML = '';
                                    if (voiceControl.commands.length === 0) {
                                        list.innerHTML = '<div style="padding: 15px; text-align: center; color: #888;">Nenhum comando configurado.</div>';
                                        return;
                                    }
                                    voiceControl.commands.forEach((cmd, index) => {
                                        const item = document.createElement('div');
                                        item.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;";
                                        
                                        const actionLabel = availableActions.find(a => a.value === cmd.action)?.label || cmd.action;

                                        item.innerHTML = `
                                            <div>
                                                <div style="font-weight: bold; color: #333;">"${cmd.phrase}"</div>
                                                <div style="font-size: 12px; color: #888;">Ação: ${actionLabel}</div>
                                            </div>
                                            <div style="display: flex; gap: 5px;">
                                                <button class="edit-voice-btn" data-index="${index}" style="background: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">✏️</button>
                                                <button class="delete-voice-btn" data-index="${index}" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">🗑️</button>
                                            </div>
                                        `;
                                        list.appendChild(item);
                                    });

                                    document.querySelectorAll('.delete-voice-btn').forEach(btn => {
                                        btn.onclick = (e) => {
                                            const idx = parseInt(e.target.dataset.index);
                                            if(confirm('Excluir este comando?')) {
                                                voiceControl.commands.splice(idx, 1);
                                                voiceControl.saveCommands();
                                                renderList();
                                            }
                                        };
                                    });

                                    document.querySelectorAll('.edit-voice-btn').forEach(btn => {
                                        btn.onclick = (e) => {
                                            const idx = parseInt(e.target.dataset.index);
                                            const cmd = voiceControl.commands[idx];
                                            phraseInput.value = cmd.phrase;
                                            actionSelect.value = cmd.action;
                                            editIndexInput.value = idx;
                                            formTitle.innerText = "Editar Comando";
                                            formDiv.style.display = 'block';
                                            phraseInput.focus();
                                        };
                                    });
                                };

                                renderList();

                                document.getElementById("fecharVoiceBtn").onclick = () => div.remove();
                                
                                document.getElementById("toggleVoiceBtn").onclick = () => {
                                    const listening = voiceControl.toggle();
                                    const btn = document.getElementById("toggleVoiceBtn");
                                    const status = document.getElementById("voiceStatusText");
                                    
                                    if (listening) {
                                        btn.style.background = '#e74c3c';
                                        btn.innerText = '🛑 Parar Escuta';
                                        status.innerText = 'Status: Ouvindo...';
                                    } else {
                                        btn.style.background = '#2ecc71';
                                        btn.innerText = '🎙️ Iniciar Escuta';
                                        status.innerText = 'Status: Parado';
                                    }
                                };

                                document.getElementById("addVoiceCommandBtn").onclick = () => {
                                    phraseInput.value = '';
                                    actionSelect.selectedIndex = 0;
                                    editIndexInput.value = -1;
                                    formTitle.innerText = "Novo Comando";
                                    formDiv.style.display = 'block';
                                    phraseInput.focus();
                                };

                                document.getElementById("cancelCommandBtn").onclick = () => {
                                    formDiv.style.display = 'none';
                                };

                                document.getElementById("saveCommandBtn").onclick = () => {
                                    const phrase = phraseInput.value.trim().toLowerCase();
                                    const action = actionSelect.value;
                                    const idx = parseInt(editIndexInput.value);

                                    if (!phrase) return alert("Digite uma frase para o comando.");

                                    const newCmd = { 
                                        phrase, 
                                        action, 
                                        description: availableActions.find(a => a.value === action)?.label 
                                    };

                                    if (idx >= 0) {
                                        voiceControl.commands[idx] = newCmd;
                                    } else {
                                        if (voiceControl.commands.some(c => c.phrase === phrase)) {
                                            return alert("Já existe um comando com essa frase.");
                                        }
                                        voiceControl.commands.push(newCmd);
                                    }

                                    voiceControl.saveCommands();
                                    renderList();
                                    formDiv.style.display = 'none';
                                };
                            }
=======
>>>>>>> 7ed91515adc9e5bbc1ccde8503e365868427af03

                            function abrirModalAtalhos() {
                                if (document.getElementById("shortcutsModal")) return;

                                const div = document.createElement("div");
                                div.id = "shortcutsModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 500px; border: 1px solid #ccc;
                                    border-radius: 10px; z-index: 10001;
                                `;
                                if (loadSettings().rgbBorder) {
                                    div.classList.add('rgb-border-effect');
                                }

                                div.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">
                                            Configurar Atalhos
                                            <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Crie atalhos de teclado para ações rápidas ou navegação.</span></div>
                                        </span>
                                        <div class="modal-controls">
                                            <button id="fecharShortcutsBtn" title="Fechar">X</button>
                                        </div>
                                    </div>
                                    <div style="padding: 20px;">
                                        <form id="shortcut-form" style="display: flex; flex-direction: column; gap: 15px;">
                                            <input type="text" id="shortcut-key" placeholder="Clique aqui e pressione o atalho" required readonly style="padding: 8px; color: black; border: 1px solid #ccc; border-radius: 5px; cursor: pointer;">
                                            <input type="text" id="shortcut-xpath" placeholder="Full XPath (opcional)" style="padding: 8px; color: black; border: 1px solid #ccc; border-radius: 5px;">
                                            <input type="text" id="shortcut-link" placeholder="Link de Acesso (opcional)" style="padding: 8px; color: black; border: 1px solid #ccc; border-radius: 5px;">
                                            <button type="submit" style="background:#0095f6;color:white;border:none;padding:10px;border-radius:5px;cursor:pointer;">Salvar Atalho</button>
                                        </form>
                                        <hr style="border: none; border-top: 1px solid #efefef; margin: 20px 0;">
                                        <h3 style="margin-bottom: 10px; font-size: 16px;">Atalhos Salvos</h3>
                                        <div id="shortcuts-list" style="max-height: 200px; overflow-y: auto;"></div>
                                    </div>
                                `;
                                document.body.appendChild(div);

                                renderShortcuts();

                                const keyInput = document.getElementById('shortcut-key');
                                let capturedShortcut = null;

                                const handleShortcutKeyDown = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    // Ignora se for apenas uma tecla modificadora
                                    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                                        return;
                                    }

                                    capturedShortcut = {
                                        key: e.key.toLowerCase(),
                                        ctrlKey: e.ctrlKey,
                                        altKey: e.altKey,
                                        shiftKey: e.shiftKey,
                                    };

                                    keyInput.value = formatShortcutForDisplay(capturedShortcut);
                                    document.removeEventListener('keydown', handleShortcutKeyDown, true);
                                    keyInput.style.borderColor = '#ccc';
                                    document.getElementById('shortcut-xpath').focus();
                                };

                                keyInput.addEventListener('focus', () => {
                                    keyInput.value = 'Pressione o atalho...';
                                    keyInput.style.borderColor = '#0095f6';
                                    // Usa 'true' para capturar o evento antes de outros listeners
                                    document.addEventListener('keydown', handleShortcutKeyDown, true);
                                });

                                keyInput.addEventListener('blur', () => {
                                    keyInput.style.borderColor = '#ccc';
                                    if (keyInput.value === 'Pressione o atalho...') {
                                        keyInput.value = capturedShortcut ? formatShortcutForDisplay(capturedShortcut) : '';
                                    }
                                    document.removeEventListener('keydown', handleShortcutKeyDown, true);
                                });

                                document.getElementById("fecharShortcutsBtn").onclick = () => {
                                    document.removeEventListener('keydown', handleShortcutKeyDown, true);
                                    div.remove();
                                };

                                document.getElementById("shortcut-form").onsubmit = (e) => {
                                    e.preventDefault();
                                    const xpathInput = document.getElementById('shortcut-xpath');
                                    const linkInput = document.getElementById('shortcut-link');

                                    const xpath = xpathInput.value.trim();
                                    const link = linkInput.value.trim();

                                    if (!capturedShortcut || !capturedShortcut.key) {
                                        alert("Por favor, defina uma tecla de atalho válida.");
                                        return;
                                    }
                                    if (!xpath && !link) {
                                        alert("Você deve fornecer um XPath ou um Link.");
                                        return;
                                    }

                                    const newShortcut = { ...capturedShortcut, xpath, link };
                                    const shortcuts = getShortcuts();

                                    // Verifica se já existe um atalho com a mesma tecla
                                    const existingIndex = shortcuts.findIndex(s =>
                                        s.key.toLowerCase() === newShortcut.key.toLowerCase() &&
                                        !!s.ctrlKey === newShortcut.ctrlKey &&
                                        !!s.altKey === newShortcut.altKey &&
                                        !!s.shiftKey === newShortcut.shiftKey
                                    );
                                    if (existingIndex > -1) {
                                        if (confirm(`Já existe um atalho para '${formatShortcutForDisplay(newShortcut)}'. Deseja substituí-lo?`)) {
                                            shortcuts[existingIndex] = newShortcut;
                                        } else {
                                            return;
                                        }
                                    } else {
                                        shortcuts.push(newShortcut);
                                    }

                                    saveShortcuts(shortcuts);
                                    renderShortcuts();

                                    // Limpa o formulário
                                    keyInput.value = '';
                                    capturedShortcut = null;
                                    xpathInput.value = '';
                                    linkInput.value = '';
                                };
                            }

                            function abrirModalParametros() {
                                if (document.getElementById("paramsModal")) return;

                                const div = document.createElement("div");
                                div.id = "paramsModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 500px; border: 1px solid #ccc;
                                    border-radius: 10px; z-index: 10001; max-height: 90vh; overflow-y: auto;
                                `;
                                if (loadSettings().rgbBorder) {
                                    div.classList.add('rgb-border-effect');
                                }

                                const settings = loadSettings();

                                div.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">
                                            Parâmetros do Script
                                            <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Ajuste delays e limites para evitar bloqueios do Instagram.</span></div>
                                        </span>
                                        <div class="modal-controls">
                                            <button id="fecharParamsBtn" title="Fechar">X</button>
                                        </div>
                                    </div>
                                    <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <label for="unfollowDelayInput">Atraso para Unfollow (ms)</label>
                                            <input type="number" id="unfollowDelayInput" value="${settings.unfollowDelay}" style="width: 80px; color: black;">
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <label for="requestDelayInput">Intervalo Requisições (ms)</label>
                                            <input type="number" id="requestDelayInput" value="${settings.requestDelay || 250}" style="width: 80px; color: black;">
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <label for="requestBatchSizeInput">Itens por Requisição (API)</label>
                                            <input type="number" id="requestBatchSizeInput" value="${settings.requestBatchSize || 50}" style="width: 80px; color: black;">
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <label for="maxRequestsInput" title="0 para ilimitado">Limite Total de Requisições</label>
                                            <input type="number" id="maxRequestsInput" value="${settings.maxRequests || 0}" style="width: 80px; color: black;">
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <label for="itemsPerPageInput">Itens por Página nas Tabelas</label>
                                            <input type="number" id="itemsPerPageInput" value="${settings.itemsPerPage}" style="width: 80px; color: black;">
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <label for="languageSelect">Idioma</label>
                                            <select id="languageSelect" style="width: 120px; color: black;">
                                                <option value="pt-BR" ${settings.language === 'pt-BR' ? 'selected' : ''}>🇧🇷 Português</option>
                                                <option value="en-US" ${settings.language === 'en-US' ? 'selected' : ''}>🇺🇸 English</option>
                                            </select>
                                        </div>

                                        <hr style="border: 1px solid #eee; width: 100%;">

                                        <h3 style="margin: 0; font-size: 16px;">Gerenciamento de Banco de Dados (IndexedDB)</h3>
                                        <div style="display: flex; flex-direction: column; gap: 10px;">
                                            <select id="dbStoreSelect" style="padding: 5px; color: black;">
                                                <option value="">Carregando tabelas...</option>
                                            </select>
                                            <div style="display: flex; gap: 10px;">
                                                <button id="btnExportDB" style="flex: 1; background: #2ecc71; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">Baixar .csv</button>
                                                <button id="btnClearDB" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">Limpar Tabela</button>
                                            </div>
                                        </div>

                                        <hr style="border: 1px solid #eee; width: 100%;">

                                        <button id="saveParamsBtn" style="background:#0095f6;color:white;border:none;padding:10px;border-radius:5px;cursor:pointer;">Salvar e Fechar</button>
                                    </div>
                                `;
                                document.body.appendChild(div);

                                // Popula o Select com as tabelas do DB
                                dbHelper.openDB().then(db => {
                                    const select = document.getElementById('dbStoreSelect');
                                    select.innerHTML = '<option value="">Selecione uma tabela...</option>';
                                    const storeNames = Array.from(db.objectStoreNames);
                                    storeNames.forEach(name => {
                                        const option = document.createElement('option');
                                        option.value = name;
                                        option.innerText = name;
                                        select.appendChild(option);
                                    });
                                });

                                document.getElementById("fecharParamsBtn").onclick = () => div.remove();
                                document.getElementById("saveParamsBtn").onclick = () => {
                                    const newSettings = {
                                        unfollowDelay: parseInt(document.getElementById("unfollowDelayInput").value, 10),
                                        requestDelay: parseInt(document.getElementById("requestDelayInput").value, 10),
                                        requestBatchSize: parseInt(document.getElementById("requestBatchSizeInput").value, 10),
                                        maxRequests: parseInt(document.getElementById("maxRequestsInput").value, 10),
                                        itemsPerPage: parseInt(document.getElementById("itemsPerPageInput").value, 10),
                                        language: document.getElementById("languageSelect").value
                                    };
                                    saveSettings(newSettings);
                                    alert("Parâmetros salvos!");
                                    div.remove();
                                };

                                document.getElementById("btnClearDB").onclick = async () => {
                                    const storeName = document.getElementById('dbStoreSelect').value;
                                    if (!storeName) return alert("Selecione uma tabela.");
                                    if (confirm(`Tem certeza que deseja limpar a tabela '${storeName}'? Isso não pode ser desfeito.`)) {
                                        const db = await dbHelper.openDB();
                                        const tx = db.transaction([storeName], 'readwrite');
                                        tx.objectStore(storeName).clear();
                                        alert(`Tabela '${storeName}' limpa com sucesso.`);
                                    }
                                };

                                document.getElementById("btnExportDB").onclick = async () => {
                                    const storeName = document.getElementById('dbStoreSelect').value;
                                    if (!storeName) return alert("Selecione uma tabela.");

                                    const db = await dbHelper.openDB();
                                    const tx = db.transaction([storeName], 'readonly');
                                    const store = tx.objectStore(storeName);
                                    const req = store.getAll();

                                    req.onsuccess = () => {
                                        const result = req.result;
                                        if (!result || result.length === 0) return alert("Tabela vazia.");

                                        let dataToExport = [];

                                        // Lógica para extrair dados dependendo do formato da tabela
                                        if (result.length === 1 && result[0].usernames && Array.isArray(result[0].usernames)) {
                                            // Formato de cache (followers, following)
                                            if (result[0].users) {
                                                dataToExport = result[0].users; // Objetos completos
                                            } else {
                                                dataToExport = result[0].usernames.map(u => ({ username: u }));
                                            }
                                        } else {
                                            // Formato de histórico ou exceções
                                            dataToExport = result;
                                        }

                                        if (dataToExport.length === 0) return alert("Dados não formatáveis ou vazios.");

                                        // Gerar CSV
                                        const keys = Object.keys(dataToExport[0]);
                                        const csvContent = [
                                            keys.join(','), // Cabeçalho
                                            ...dataToExport.map(row => keys.map(k => {
                                                let val = row[k];
                                                if (typeof val === 'string') val = `"${val}"`; // Aspas para strings
                                                return val;
                                            }).join(','))
                                        ].join('\n');

                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.setAttribute("href", url);
                                        link.setAttribute("download", `${storeName}_backup.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    };
                                };
                            }

                            // Adiciona a classe RGB em novos modais
                            const originalAppendChild = document.body.appendChild;
                            document.body.appendChild = function(node) {
                                if (node.classList && (node.classList.contains('submenu-modal') || node.classList.contains('assistive-menu')) && loadSettings().rgbBorder) {
                                    node.classList.add('rgb-border-effect');
                                }
                                return originalAppendChild.apply(this, arguments);
                            };

                            // --- LÓGICA PARA O MENU DE REELS ---

                            function abrirModalReels() {
                                if (document.getElementById("reelsSubmenuModal")) return;

                                const div = document.createElement("div");
                                div.id = "reelsSubmenuModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 400px; border: 1px solid #ccc;
                                    border-radius: 10px; padding: 20px; z-index: 10000;
                                `;
                                div.innerHTML = `
                                    <div class="modal-header">
                                        <span class="modal-title">
                                            Menu de Reels
                                            <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Ferramentas para Reels: Download, Análise de Desempenho e Rolagem Automática.</span></div>
                                        </span>
                                        <div class="modal-controls">
                                            <button id="fecharReelsSubmenuBtn" title="Fechar">X</button>
                                        </div>
                                    </div>
                                    <div style="padding: 15px;">
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <button id="analiseReelsBtn" class="menu-item-button">📊 Análise de Desempenho</button>
                                        <button id="baixarReelAtualBtn" class="menu-item-button">⬇️ Baixar Reel Atual</button>
                                        <button id="copiarLegendaReelBtn" class="menu-item-button">📋 Copiar Legenda</button>
                                        <button id="rolagemReelsBtn" class="menu-item-button">▶️ Rolagem Automática</button>
                                    </div>
                                `;
                                document.body.appendChild(div);

                                document.getElementById("fecharReelsSubmenuBtn").onclick = () => div.remove();
                                document.getElementById("analiseReelsBtn").onclick = () => {
                                    div.remove();
                                    iniciarAnaliseReels();
                                };
                                document.getElementById("baixarReelAtualBtn").onclick = () => {
                                    baixarReelAtual();
                                };
                                document.getElementById("rolagemReelsBtn").onclick = () => {
                                    toggleRolagemAutomaticaReels();
                                };
                            }

                            function toggleRolagemAutomaticaReels() {
                                if (!window.location.pathname.startsWith('/reels/')) {
                                    alert("Esta função só pode ser usada na página de Reels.");
                                    return;
                                }

                                isReelsScrolling = !isReelsScrolling;
                                const reelsModal = document.getElementById("reelsSubmenuModal");
                                const scrollBtn = reelsModal ? reelsModal.querySelector("#rolagemReelsBtn") : null;

                                if (isReelsScrolling) {
                                    console.log("Iniciando rolagem automática de Reels.");
                                    if (scrollBtn) scrollBtn.innerHTML = "⏸️ Parar Rolagem";
                                    startReelsAutoScroll();
                                } else {
                                    console.log("Parando rolagem automática de Reels.");
                                    if (scrollBtn) scrollBtn.innerHTML = "▶️ Rolagem Automática";
                                    stopReelsAutoScroll();
                                }
                            }

                            function stopReelsAutoScroll() {
                                isReelsScrolling = false;
                                // Remove o listener de qualquer vídeo que possa tê-lo
                                document.querySelectorAll('video[data-reels-scroller="true"]').forEach(video => {
                                    if (video._timeUpdateListener) {
                                        video.removeEventListener('timeupdate', video._timeUpdateListener);
                                    }
                                    video.removeAttribute('data-reels-scroller');
                                });
                                if (reelsScrollInterval) {
                                    clearTimeout(reelsScrollInterval); // Limpa o timeout se houver
                                    reelsScrollInterval = null;
                                }
                                console.log("Rolagem automática de Reels parada.");
                            }

                            function startReelsAutoScroll() {
                                if (!isReelsScrolling) return;

                                // Encontra o vídeo que está visível na tela
                                const visibleVideo = Array.from(document.querySelectorAll('video')).find(v => {
                                    const rect = v.getBoundingClientRect();
                                    return rect.top >= 0 && rect.bottom <= window.innerHeight && v.readyState > 2;
                                });

                                // Se encontrou um vídeo e ele ainda não tem nosso listener
                                if (visibleVideo && !visibleVideo.hasAttribute('data-reels-scroller')) {
                                    visibleVideo.setAttribute('data-reels-scroller', 'true');

                                    const timeUpdateListener = () => {
                                        // Verifica se o vídeo está perto do fim (últimos 700ms)
                                        if (visibleVideo.duration - visibleVideo.currentTime <= 0.7) {
                                            console.log("Vídeo quase no fim, rolando para o próximo.");

                                            // Remove o listener para não disparar múltiplas vezes
                                            visibleVideo.removeEventListener('timeupdate', timeUpdateListener);

                                            // Lógica para encontrar o contêiner de rolagem dinamicamente
                                            let scrollableContainer = visibleVideo.parentElement;
                                            while (scrollableContainer) {
                                                // O contêiner correto tem uma altura de rolagem maior que sua altura visível
                                                if (scrollableContainer.scrollHeight > scrollableContainer.clientHeight) {
                                                    break; // Encontrou!
                                                }
                                                scrollableContainer = scrollableContainer.parentElement;
                                            }

                                            if (scrollableContainer) {
                                                console.log("Contêiner de rolagem encontrado. Rolando...");
                                                // Rola o contêiner para baixo na altura de um reel (altura da janela)
                                                scrollableContainer.scrollBy({
                                                    top: scrollableContainer.clientHeight,
                                                    left: 0,
                                                    behavior: 'smooth'
                                                });
                                            } else {
                                                console.warn("Contêiner de rolagem não encontrado. Usando fallback de rolagem da janela.");
                                                // Fallback para o método antigo se a busca dinâmica falhar
                                                window.scrollBy({
                                                    top: window.innerHeight,
                                                    left: 0,
                                                    behavior: 'smooth'
                                                });
                                            }

                                            // Após a rolagem, chama a função novamente para encontrar o novo vídeo
                                            // e adicionar o listener a ele.
                                            setTimeout(startReelsAutoScroll, 2000); // Aguarda a animação de rolagem
                                        }
                                    };
                                    visibleVideo._timeUpdateListener = timeUpdateListener;
                                    visibleVideo.addEventListener('timeupdate', timeUpdateListener);
                                } else {
                                    // Se não encontrou um vídeo novo, tenta novamente em 1 segundo
                                    reelsScrollInterval = setTimeout(startReelsAutoScroll, 1000);
                                }
                            }

                            async function iniciarAnaliseReels() {
                                const pathParts = window.location.pathname.split('/').filter(Boolean);
                                const username = pathParts[0];
                                const appID = '936619743392459';
                                if (!username || (pathParts.length > 1 && !['followers', 'following'].includes(pathParts[1]))) {
                                    alert("Por favor, vá para a sua página de perfil para usar esta função.");
                                    return;
                                }

                                const statusModal = document.createElement("div");
                                statusModal.id = "reelsAnalysisStatusModal";
                                statusModal.className = "submenu-modal";
                                statusModal.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 500px; border: 1px solid #ccc; border-radius: 10px; padding: 20px; z-index: 10001;`;
                                statusModal.innerHTML = `<div class="modal-header"><span class="modal-title">Análise de Reels</span></div><div style="padding:15px;"><p id="reelsStatusText">Buscando informações do perfil...</p></div>`;
                                document.body.appendChild(statusModal);

                                const statusText = document.getElementById("reelsStatusText");

                                try {
                                    const profileInfoResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                                    const profileInfo = await profileInfoResponse.json();
                                    const userId = profileInfo.data?.user?.id;
                                    if (!userId) throw new Error("Não foi possível obter o ID do usuário.");

                                    statusText.innerText = 'Buscando lista de Reels...';

                                    const reelsList = [];
                                    let nextMaxId = '';
                                    let hasNextPage = true;

                                    // O endpoint /api/v1/clips/user/ foi descontinuado. Usaremos GraphQL.
                                    const queryHash = 'd4d88dc1500312af6f937f7b804c68c3'; // Hash para a query de Reels do usuário

                                    while (hasNextPage) {
                                        const variables = { "user_id": userId, "first": 50, "after": nextMaxId };
                                        const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

                                        const response = await fetch(url, { headers: { 'X-IG-App-ID': appID } });
                                        if (!response.ok) throw new Error(`A resposta da rede não foi 'ok'. Status: ${response.status}`);
                                        const data = await response.json();

                                        const clipsData = data.data?.user?.edge_clips;
                                        if (clipsData?.edges) {
                                            clipsData.edges.forEach(({ node: item }) => {
                                                reelsList.push({
                                                    id: item.id,
                                                    thumbnail: item.image_versions2.candidates[0].url,
                                                    views: item.play_count || 0,
                                                    likes: item.like_count || 0,
                                                    comments: item.comment_count || 0,
                                                    date: new Date(item.taken_at * 1000),
                                                    url: `https://www.instagram.com/reel/${item.code}/`
                                                });
                                            });
                                            statusText.innerText = `Encontrados ${reelsList.length} Reels...`;
                                        }

                                        hasNextPage = clipsData?.page_info?.has_next_page || false;
                                        nextMaxId = clipsData?.page_info?.end_cursor || '';
                                        if (hasNextPage) await new Promise(r => setTimeout(r, 300));
                                    }

                                    statusModal.remove();
                                    abrirModalTabelaReels(reelsList);

                                } catch (error) {
                                    console.error("Erro na análise de Reels:", error);
                                    statusText.innerText = `Erro: ${error.message}. Tente novamente.`;
                                    setTimeout(() => statusModal.remove(), 3000);
                                }
                            }

                            function abrirModalTabelaReels(reelsList) {
                                const div = document.createElement("div");
                                div.id = "reelsTableModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 900px; max-height: 90vh; border: 1px solid #ccc; border-radius: 10px; padding: 20px; z-index: 10000; overflow: auto;`;

                                let sortConfig = { key: 'date', direction: 'descending' };

                                const renderTable = () => {
                                    const sortedList = [...reelsList].sort((a, b) => {
                                        const valA = a[sortConfig.key];
                                        const valB = b[sortConfig.key];
                                        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                                        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                                        return 0;
                                    });

                                    const getSortArrow = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';

                                    let tableHtml = `
                                        <div class="modal-header">
                                            <span class="modal-title">
                                                Análise de Desempenho dos Reels
                                                <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Tabela com métricas de visualizações, curtidas e comentários dos seus Reels.</span></div>
                                            </span>
                                            <div class="modal-controls">
                                                <button id="fecharReelsTableBtn" title="Fechar">X</button>
                                            </div>
                                        </div>
                                        <div style="padding: 15px;">
                                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                            <thead style="cursor: pointer;">
                                                <tr style="text-align: left; border-bottom: 2px solid #dbdbdb;">
                                                    <th style="padding: 8px;">Reel</th>
                                                    <th style="padding: 8px; text-align: center;" data-sort-key="views">Visualizações ${getSortArrow('views')}</th>
                                                    <th style="padding: 8px; text-align: center;" data-sort-key="likes">Curtidas ${getSortArrow('likes')}</th>
                                                    <th style="padding: 8px; text-align: center;" data-sort-key="comments">Comentários ${getSortArrow('comments')}</th>
                                                    <th style="padding: 8px; text-align: right;" data-sort-key="date">Data ${getSortArrow('date')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>`;

                                    sortedList.forEach(reel => {
                                        tableHtml += `
                                            <tr style="border-bottom: 1px solid #dbdbdb;">
                                                <td style="padding: 8px; display:flex; align-items:center; gap:10px;">
                                                    <a href="${reel.url}" target="_blank"><img src="${reel.thumbnail}" alt="Reel Thumbnail" style="width:50px; height:90px; object-fit:cover; border-radius:4px;"></a>
                                                </td>
                                                <td style="text-align: center; font-weight: 600;">${reel.views.toLocaleString('pt-BR')}</td>
                                                <td style="text-align: center;">${reel.likes.toLocaleString('pt-BR')}</td>
                                                <td style="text-align: center;">${reel.comments.toLocaleString('pt-BR')}</td>
                                                <td style="text-align: right;">${reel.date.toLocaleDateString('pt-BR')}</td>
                                            </tr>`;
                                    });
                                    tableHtml += `</tbody></table></div>`;
                                    tableHtml += `</tbody></table>`;
                                    div.innerHTML = tableHtml;

                                    document.querySelectorAll('#reelsTableModal th[data-sort-key]').forEach(th => {
                                        th.onclick = () => {
                                            const key = th.dataset.sortKey;
                                            if (sortConfig.key === key) {
                                                sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
                                            } else {
                                                sortConfig = { key, direction: 'descending' };
                                            }
                                            renderTable();
                                        };
                                    });

                                    document.getElementById("fecharReelsTableBtn").onclick = () => div.remove();
                                };

                                document.body.appendChild(div);
                                renderTable();
                            }

                            // --- LÓGICA PARA O MENU DE ENGAJAMENTO ---

                            async function abrirModalEngajamento() {
                                if (document.getElementById("engajamentoModal")) return;

                                const div = document.createElement("div");
                                div.id = "engajamentoModal";
                                div.className = "submenu-modal";
                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 900px; max-height: 90vh; border: 1px solid #ccc;
                                    border-radius: 10px; padding: 20px; z-index: 10000; overflow: auto;
                                `;

                                div.innerHTML = `
                                    <style>
                                        .info-tooltip { position: relative; display: inline-block; cursor: help; margin-left: 5px; color: #8e8e8e; }
                                        .info-tooltip .tooltip-text { visibility: hidden; width: 200px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 8px; position: absolute; z-index: 10; top: 100%; margin-top: 10px; left: 50%; margin-left: -100px; opacity: 0; transition: opacity 0.3s; font-size: 11px; font-weight: normal; line-height: 1.4; box-shadow: 0 2px 10px rgba(0,0,0,0.2); pointer-events: none; }
                                        .info-tooltip .tooltip-text::after { content: ""; position: absolute; bottom: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: transparent transparent #333 transparent; }
                                        .info-tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }
                                    </style>
                                    <div class="modal-header">
                                        <span class="modal-title">Dashboard de Engajamento</span>
                                        <div class="modal-controls">
                                            <button id="fecharEngajamentoBtn" title="Fechar">X</button>
                                        </div>
                                    </div>
                                    <div style="padding: 15px;">
                                        <div id="engajamentoLoading" style="text-align: center; padding: 20px;">Carregando dados e gráficos...</div>
                                        <div id="engajamentoContent" style="display: none;">
                                            <!-- Cards de Resumo -->
                                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dbdbdb;">
                                                    <h3 style="margin: 0; font-size: 14px; color: #666;">
                                                        Taxa de Engajamento
                                                        <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Cálculo: ((Likes + Comentários) / Total Posts) / Seguidores * 100.</span></div>
                                                    </h3>
                                                    <p id="engRateVal" style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #0095f6;">-</p>
                                                </div>
                                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dbdbdb;">
                                                    <h3 style="margin: 0; font-size: 14px; color: #666;">
                                                        Média de Likes
                                                        <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Média simples de curtidas nos últimos posts analisados.</span></div>
                                                    </h3>
                                                    <p id="avgLikesVal" style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #e74c3c;">-</p>
                                                </div>
                                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dbdbdb;">
                                                    <h3 style="margin: 0; font-size: 14px; color: #666;">
                                                        Média de Comentários
                                                        <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Média simples de comentários nos últimos posts analisados.</span></div>
                                                    </h3>
                                                    <p id="avgCommentsVal" style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #2ecc71;">-</p>
                                                </div>
                                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dbdbdb;">
                                                    <h3 style="margin: 0; font-size: 14px; color: #666;">
                                                        Melhor Horário
                                                        <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Horário do dia com maior volume acumulado de interações.</span></div>
                                                    </h3>
                                                    <p id="bestTimeVal" style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #f39c12;">-</p>
                                                </div>
                                            </div>

                                            <!-- Gráficos -->
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                                <div style="background: white; padding: 10px; border: 1px solid #eee; border-radius: 8px;">
                                                    <h4 style="text-align: center; margin-bottom: 10px;">Desempenho dos Últimos Posts</h4>
                                                    <div id="postsChartContainer" style="height: 200px; width: 100%;"></div>
                                                </div>
                                                <div style="background: white; padding: 10px; border: 1px solid #eee; border-radius: 8px;">
                                                    <h4 style="text-align: center; margin-bottom: 10px;">Atividade por Hora</h4>
                                                    <div id="hoursChartContainer" style="height: 200px; width: 100%;"></div>
                                                </div>
                                            </div>

                                            <!-- IA Section -->
                                            <div style="border-top: 1px solid #eee; padding-top: 20px;">
                                                <h3>
                                                    🔍 Análise de Conteúdo (IA)
                                                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">A porcentagem indica o nível de confiança da IA na classificação da imagem.</span></div>
                                                </h3>
                                                <p style="font-size: 12px; color: #666;">Classificação de imagens usando IA (Simulação/Placeholder).</p>
                                                <button id="analyzeImagesBtn" style="background: #8e44ad; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Analisar Últimos Posts</button>
                                                <div id="aiResults" style="margin-top: 10px; display: flex; gap: 10px; overflow-x: auto;"></div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                document.body.appendChild(div);
                                document.getElementById("fecharEngajamentoBtn").onclick = () => div.remove();

                                try {

                                    // Buscar dados do perfil
                                    const pathParts = window.location.pathname.split('/').filter(Boolean);
                                    const username = pathParts[0];
                                    const appID = '936619743392459';

                                    const profileInfoResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                                    const profileInfo = await profileInfoResponse.json();
                                    const userId = profileInfo.data?.user?.id;
                                    const followersCount = profileInfo.data?.user?.edge_followed_by?.count || 1;

                                    // Buscar posts (últimos 50)
                                    const queryHash = '69cba40317214236af40e7efa697781d'; // Hash comum para feed de usuário
                                    // Fallback para API v1 se GraphQL falhar ou for complexo
                                    const feedUrl = `https://www.instagram.com/api/v1/feed/user/${userId}/?count=50`;
                                    const feedRes = await fetch(feedUrl, { headers: { 'X-IG-App-ID': appID } });
                                    const feedData = await feedRes.json();
                                    const items = feedData.items || [];

                                    // Processar dados
                                    let totalLikes = 0;
                                    let totalComments = 0;
                                    const postsData = [];
                                    const hoursActivity = new Array(24).fill(0);

                                    items.forEach(item => {
                                        const likes = item.like_count || 0;
                                        const comments = item.comment_count || 0;
                                        const timestamp = item.taken_at; // Unix timestamp
                                        const date = new Date(timestamp * 1000);
                                        const hour = date.getHours();

                                        totalLikes += likes;
                                        totalComments += comments;
                                        hoursActivity[hour] += (likes + comments); // Peso por engajamento

                                        postsData.push({
                                            id: item.id,
                                            code: item.code,
                                            likes: likes,
                                            comments: comments,
                                            date: date.toLocaleDateString(),
                                            url: item.image_versions2?.candidates?.[0]?.url || ''
                                        });
                                    });

                                    // Calcular médias
                                    const avgLikes = items.length ? (totalLikes / items.length).toFixed(0) : 0;
                                    const avgComments = items.length ? (totalComments / items.length).toFixed(0) : 0;
                                    const engRate = items.length ? (((totalLikes + totalComments) / items.length) / followersCount * 100).toFixed(2) : 0;

                                    // Melhor horário
                                    const maxActivity = Math.max(...hoursActivity);
                                    const bestHour = hoursActivity.indexOf(maxActivity);

                                    // Atualizar UI
                                    document.getElementById("engRateVal").innerText = `${engRate}%`;
                                    document.getElementById("avgLikesVal").innerText = avgLikes;
                                    document.getElementById("avgCommentsVal").innerText = avgComments;
                                    document.getElementById("bestTimeVal").innerText = `${bestHour}:00 - ${bestHour + 1}:00`;

                                    document.getElementById("engajamentoLoading").style.display = "none";
                                    document.getElementById("engajamentoContent").style.display = "block";

                                    // Renderizar Gráficos
                                    // Substituição do Chart.js por gráficos SVG/HTML simples para evitar CSP
                                    const recentPosts = postsData.slice(0, 10).reverse();
                                    renderSimpleBarChart(
                                        'postsChartContainer',
                                        recentPosts.map(p => p.date.split('/').slice(0,2).join('/')), // dd/mm
                                        recentPosts.map(p => p.likes),
                                        recentPosts.map(p => p.comments),
                                        'Likes', 'Comentários'
                                    );

                                    renderSimpleLineChart(
                                        'hoursChartContainer',
                                        Array.from({length: 24}, (_, i) => `${i}h`),
                                        hoursActivity,
                                        'Atividade'
                                    );

                                    // Lógica de IA (Simulada)
                                    document.getElementById("analyzeImagesBtn").onclick = () => {
                                        const aiContainer = document.getElementById("aiResults");
                                        aiContainer.innerHTML = '<p>Analisando...</p>';

                                        // Simulação de chamada de API (Google Vision / Clarifai exigiria chave privada)
                                        setTimeout(() => {
                                            aiContainer.innerHTML = '';
                                            const samplePosts = postsData.slice(0, 5);

                                            // Categorias fictícias para demonstração
                                            const categories = ['Paisagem', 'Selfie', 'Comida', 'Evento', 'Meme'];

                                            samplePosts.forEach(post => {
                                                if (!post.url) return;
                                                const randomCat = categories[Math.floor(Math.random() * categories.length)];
                                                const confidence = (Math.random() * (0.99 - 0.70) + 0.70).toFixed(2);

                                                const card = document.createElement('div');
                                                card.style.cssText = "min-width: 120px; border: 1px solid #eee; border-radius: 5px; padding: 5px; text-align: center;";
                                                card.innerHTML = `
                                                    <img src="${post.url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;">
                                                    <div style="font-weight: bold; font-size: 12px; margin-top: 5px;">${randomCat}</div>
                                                    <div style="font-size: 10px; color: #666;">Confiança: ${parseInt(confidence * 100)}%</div>
                                                `;
                                                aiContainer.appendChild(card);
                                            });

                                            const note = document.createElement('p');
                                            note.style.cssText = "font-size: 10px; color: red; width: 100%; margin-top: 10px;";
                                            note.innerText = "Nota: Para classificação real, é necessário integrar uma API Key do Google Vision ou Clarifai no código.";
                                            aiContainer.appendChild(note);

                                        }, 1500);
                                    };

                                } catch (error) {
                                    console.error("Erro no dashboard:", error);
                                    document.getElementById("engajamentoLoading").innerText = "Erro ao carregar dados. Certifique-se de estar logado e na página de perfil.";
                                }
                            }

                            // Funções auxiliares para gráficos sem bibliotecas externas (Bypass CSP)
                            function renderSimpleBarChart(containerId, labels, data1, data2, label1, label2) {
                                const container = document.getElementById(containerId);
                                if (!container) return;
                                container.innerHTML = '';
                                const maxVal = Math.max(...data1, ...data2, 1);

                                const chart = document.createElement('div');
                                chart.style.cssText = "display: flex; align-items: flex-end; height: 100%; width: 100%; gap: 5px; padding-bottom: 20px; box-sizing: border-box;";

                                labels.forEach((lbl, i) => {
                                    const v1 = data1[i] || 0;
                                    const v2 = data2[i] || 0;
                                    const h1 = Math.max((v1 / maxVal) * 80, 1);
                                    const h2 = Math.max((v2 / maxVal) * 80, 1);

                                    const group = document.createElement('div');
                                    group.style.cssText = "flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;";

                                    const bars = document.createElement('div');
                                    bars.style.cssText = "display: flex; align-items: flex-end; gap: 2px; height: 100%; width: 100%; justify-content: center;";

                                    const b1 = document.createElement('div');
                                    b1.style.cssText = `width: 40%; background: #e74c3c; height: ${h1}%; border-radius: 2px 2px 0 0;`;
                                    b1.title = `${label1}: ${v1}`;

                                    const b2 = document.createElement('div');
                                    b2.style.cssText = `width: 40%; background: #2ecc71; height: ${h2}%; border-radius: 2px 2px 0 0;`;
                                    b2.title = `${label2}: ${v2}`;

                                    bars.appendChild(b1);
                                    bars.appendChild(b2);

                                    const txt = document.createElement('div');
                                    txt.innerText = lbl;
                                    txt.style.cssText = "font-size: 9px; color: #666; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;";

                                    group.appendChild(bars);
                                    group.appendChild(txt);
                                    chart.appendChild(group);
                                });
                                container.appendChild(chart);
                            }

                            function renderSimpleLineChart(containerId, labels, data, labelName) {
                                const container = document.getElementById(containerId);
                                if (!container) return;
                                container.innerHTML = '';
                                const maxVal = Math.max(...data, 1);
                                const h = container.clientHeight || 200;
                                const w = container.clientWidth || 400;
                                const step = w / (labels.length - 1 || 1);

                                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                                svg.setAttribute("width", "100%");
                                svg.setAttribute("height", "100%");
                                svg.style.overflow = "visible";

                                let points = "";
                                data.forEach((val, i) => {
                                    const x = i * step;
                                    const y = h - ((val / maxVal) * (h - 20)) - 20; // Padding bottom
                                    points += `${x},${y} `;

                                    if (i % 4 === 0) { // Labels espaçados
                                        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
                                        txt.setAttribute("x", x);
                                        txt.setAttribute("y", h);
                                        txt.setAttribute("font-size", "10");
                                        txt.setAttribute("fill", "#666");
                                        txt.setAttribute("text-anchor", "middle");
                                        txt.textContent = labels[i];
                                        svg.appendChild(txt);
                                    }
                                });

                                const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                                polyline.setAttribute("points", points);
                                polyline.setAttribute("fill", "none");
                                polyline.setAttribute("stroke", "#0095f6");
                                polyline.setAttribute("stroke-width", "2");
                                svg.appendChild(polyline);
                                container.appendChild(svg);
                            }

                        function abrirModalInteracoes() {
                            if (document.getElementById("interacoesModal")) return;

                            // Helper para pegar cookie
                            const getCookie = (name) => {
                                const value = `; ${document.cookie}`;
                                const parts = value.split(`; ${name}=`);
                                if (parts.length === 2) return parts.pop().split(';').shift();
                            };

                            const div = document.createElement("div");
                            div.id = "interacoesModal";
                            div.className = "submenu-modal";
                            div.style.cssText = `
                                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                width: 90%; max-width: 600px; max-height: 90vh; border: 1px solid #ccc;
                                border-radius: 10px; padding: 20px; z-index: 10000; overflow: auto;
                            `;

                            div.innerHTML = `
                                <div class="modal-header">
                                    <span class="modal-title">
                                        Verificar Interações
                                        <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Verifique o que você curtiu de um usuário específico (Posts e Stories).</span></div>
                                    </span>
                                    <div class="modal-controls">
                                        <button id="fecharInteracoesBtn" title="Fechar">X</button>
                                    </div>
                                </div>
                                <div style="padding: 15px;">
                                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                                        <div style="flex: 1; position: relative;">
                                            <input type="text" id="interacoesUsernameInput" placeholder="Digite o username..." style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc; color: black; box-sizing: border-box;" autocomplete="off">
                                            <div id="interacoesSuggestions" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-top: none; border-radius: 0 0 5px 5px; max-height: 200px; overflow-y: auto; z-index: 1001; display: none; color: black; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
                                        </div>
                                        <button id="verificarInteracoesBtn" style="background: #0095f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Verificar</button>
                                    </div>
                                    <div id="interacoesUserProfile" style="display: none; flex-direction: column; align-items: center; margin-bottom: 20px;">
                                        <img id="interacoesUserPic" src="" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 1px solid #dbdbdb;">
                                        <span id="interacoesUserNameDisplay" style="font-weight: bold; font-size: 16px; color: black;"></span>
                                        <span id="interacoesUserBioDisplay" style="font-size: 14px; color: #666; text-align: center; margin-top: 5px; max-width: 80%;"></span>
                                    </div>
                                    <div id="interacoesResultados" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
                                        <!-- Cards serão inseridos aqui -->
                                    </div>
                                    <div id="interacoesDetalhes" style="margin-top: 20px; display: none;">
                                        <h3 id="detalhesTitulo" style="margin-bottom: 10px; color: black;"></h3>
                                        <button id="voltarCardsBtn" style="margin-bottom: 10px; padding: 5px 10px; cursor: pointer;">Voltar</button>
                                        <div id="detalhesLista" style="max-height: 300px; overflow-y: auto; color: black;"></div>
                                    </div>
                                </div>
                            `;
                            document.body.appendChild(div);

                            document.getElementById("fecharInteracoesBtn").onclick = () => div.remove();

                            // Lógica de Autocomplete
                            const inputUsername = document.getElementById("interacoesUsernameInput");
                            const suggestionsDiv = document.getElementById("interacoesSuggestions");
                            let followingList = [];

                            // Carrega a lista de seguindo do cache
                            dbHelper.loadCache('following').then(set => {
                                if (set) {
                                    followingList = Array.from(set);
                                }
                            });

                            inputUsername.addEventListener('input', () => {
                                const val = inputUsername.value.toLowerCase();
                                suggestionsDiv.innerHTML = '';
                                if (!val) {
                                    suggestionsDiv.style.display = 'none';
                                    return;
                                }

                                const matches = followingList.filter(u => u.toLowerCase().includes(val)).slice(0, 10);

                                if (matches.length > 0) {
                                    matches.forEach(u => {
                                        const item = document.createElement('div');
                                        item.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;';
                                        item.innerText = u;
                                        item.onmouseover = () => item.style.background = '#f0f0f0';
                                        item.onmouseout = () => item.style.background = 'white';
                                        item.onclick = () => {
                                            inputUsername.value = u;
                                            suggestionsDiv.style.display = 'none';
                                        };
                                        suggestionsDiv.appendChild(item);
                                    });
                                    suggestionsDiv.style.display = 'block';
                                } else {
                                    suggestionsDiv.style.display = 'none';
                                }
                            });

                            // Fechar sugestões ao clicar fora
                            document.addEventListener('click', (e) => {
                                if (e.target !== inputUsername && e.target !== suggestionsDiv) {
                                    suggestionsDiv.style.display = 'none';
                                }
                            });

                            let dataEuCurti = null;

                            document.getElementById("verificarInteracoesBtn").onclick = async () => {
                                const username = document.getElementById("interacoesUsernameInput").value.trim();
                                if (!username) return alert("Digite um username.");

                                const btn = document.getElementById("verificarInteracoesBtn");
                                btn.disabled = true;
                                btn.textContent = "Verificando...";

                                const resultadosDiv = document.getElementById("interacoesResultados");
                                const profileDiv = document.getElementById("interacoesUserProfile");

                                resultadosDiv.innerHTML = '<p style="color:black;">Carregando interações...</p>';
                                document.getElementById("interacoesDetalhes").style.display = "none";
                                profileDiv.style.display = "none";

                                // Buscar foto de perfil
                                let photoUrl = 'https://via.placeholder.com/80';
                                let bio = '';
                                try {
                                    const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                                        headers: { 'X-IG-App-ID': '936619743392459' }
                                    });
                                    if (response.ok) {
                                        const data = await response.json();
                                        photoUrl = data.data?.user?.profile_pic_url || photoUrl;
                                        bio = data.data?.user?.biography || '';
                                    }
                                } catch (e) {
                                    console.error("Erro ao buscar foto de perfil:", e);
                                }

                                document.getElementById("interacoesUserPic").src = photoUrl;
                                document.getElementById("interacoesUserNameDisplay").innerText = username;
                                document.getElementById("interacoesUserBioDisplay").innerText = bio;
                                profileDiv.style.display = "flex";

                                const headers = { 'X-IG-App-ID': '936619743392459' };
                                const myId = getCookie('ds_user_id');

                                try {
                                    // Obter ID do usuário
                                    let targetUserId = '';
                                    const profileRes = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers });
                                    if (profileRes.ok) {
                                        const profileData = await profileRes.json();
                                        targetUserId = profileData.data.user.id;
                                    } else {
                                        throw new Error("Não foi possível obter o ID do usuário.");
                                    }

                                    // --- O QUE EU CURTI DELE ---
                                        resultadosDiv.innerHTML = '<p style="color:black;">Analisando posts e destaques...</p>';

                                        const likedPosts = [];
                                        const likedStories = [];

                                        // 1. Posts
                                        let nextMaxId = null;
                                        let hasNext = true;
                                        let processedCount = 0;
                                        const MAX_POSTS = 500;

                                        while (hasNext && processedCount < MAX_POSTS) {
                                            let url = `https://www.instagram.com/api/v1/feed/user/${targetUserId}/?count=33`;
                                            if (nextMaxId) url += `&max_id=${nextMaxId}`;

                                            const feedRes = await fetch(url, { headers });
                                            if (!feedRes.ok) break;

                                            const feedData = await feedRes.json();
                                            const items = feedData.items || [];

                                            for (const item of items) {
                                                if (item.has_liked) {
                                                    let thumb = item.image_versions2?.candidates?.[0]?.url || item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url || '';
                                                    likedPosts.push({ type: 'Post', url: `https://www.instagram.com/p/${item.code}/`, thumb: thumb, id: item.id });
                                                }
                                            }

                                            processedCount += items.length;
                                            resultadosDiv.innerHTML = `<p style="color:black;">Analisando posts... (${processedCount} verificados)</p>`;

                                            nextMaxId = feedData.next_max_id;
                                            if (!feedData.more_available || !nextMaxId) hasNext = false;
                                            await new Promise(r => setTimeout(r, 300));
                                        }

                                        // 2. Destaques (Stories)
                                        resultadosDiv.innerHTML = `<p style="color:black;">Analisando destaques...</p>`;
                                        try {
                                            const trayRes = await fetch(`https://www.instagram.com/api/v1/highlights/${targetUserId}/highlights_tray/`, { headers });
                                            if (trayRes.ok) {
                                                const trayData = await trayRes.json();
                                                const tray = trayData.tray || [];
                                                const reelIds = tray.map(t => t.id);

                                                if (reelIds.length > 0) {
                                                    let url = `https://www.instagram.com/api/v1/feed/reels_media/?`;
                                                    reelIds.forEach(id => url += `reel_ids=${id}&`);
                                                    const mediaRes = await fetch(url, { headers });
                                                    if (mediaRes.ok) {
                                                        const mediaData = await mediaRes.json();
                                                        for (const reelId in mediaData.reels) {
                                                            const items = mediaData.reels[reelId].items || [];
                                                            for (const item of items) {
                                                                if (item.has_liked) {
                                                                    let thumb = item.image_versions2?.candidates?.[0]?.url || item.video_versions?.[0]?.url || '';
                                                                    const cleanReelId = reelId.replace(/^highlight:/, '');
                                                                    likedStories.push({ type: 'Story (Destaque)', url: `https://www.instagram.com/stories/highlights/${cleanReelId}/?story_media_id=${item.id}`, thumb: thumb, id: item.id });
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        } catch (e) { console.error("Erro destaques", e); }

                                        const dadosReais = {
                                            fotosCurtidas: { count: likedPosts.length, items: likedPosts },
                                            storiesCurtidos: { count: likedStories.length, items: likedStories },
                                            comentarios: { count: 0, items: [] },
                                            enquetes: { count: 0, items: [] }
                                        };
                                        dataEuCurti = dadosReais;
                                        renderizarCardsInteracoes(dadosReais);

                                } catch (e) {
                                    console.error(e);
                                    resultadosDiv.innerHTML = `<p style="color:red;">Erro ao buscar dados: ${e.message}</p>`;
                                } finally { btn.disabled = false; btn.textContent = "Verificar"; }
                            };

                        function renderizarCardsInteracoes(dados) {
                            const container = document.getElementById("interacoesResultados");
                            container.innerHTML = '';

                            const mapLabels = {
                                fotosCurtidas: 'Fotos Curtidas',
                                storiesCurtidos: 'Stories Curtidos',
                                comentarios: 'Comentários',
                                enquetes: 'Enquetes'
                            };

                            for (const [key, data] of Object.entries(dados)) {
                                const card = document.createElement("div");
                                card.style.cssText = `
                                    border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px;
                                    text-align: center; cursor: pointer; background: #f8f9fa; transition: transform 0.2s;
                                `;
                                card.innerHTML = `
                                    <div style="font-size: 24px; font-weight: bold; color: #0095f6;">${data.count}</div>
                                    <div style="font-size: 14px; color: #8e8e8e;">${mapLabels[key] || key}</div>
                                `;
                                card.onmouseover = () => card.style.transform = "scale(1.05)";
                                card.onmouseout = () => card.style.transform = "scale(1)";
                                card.onclick = () => mostrarDetalhesInteracao(mapLabels[key] || key, data.items);
                                container.appendChild(card);
                            }
                        }

                        function mostrarDetalhesInteracao(titulo, itens) {
                            document.getElementById("interacoesResultados").style.display = "none";
                            const detalhesDiv = document.getElementById("interacoesDetalhes");
                            detalhesDiv.style.display = "block";
                            document.getElementById("detalhesTitulo").innerText = titulo;

                            const lista = document.getElementById("detalhesLista");
                            lista.innerHTML = '';

                            if (itens.length === 0) {
                                lista.innerHTML = '<p>Nenhum item encontrado.</p>';
                            } else {
                                const grid = document.createElement("div");
                                grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;";
                                itens.forEach(item => {
                                    const div = document.createElement("div");
                                    div.style.cssText = "aspect-ratio: 1; overflow: hidden; border-radius: 5px; border: 1px solid #dbdbdb; cursor: pointer; position: relative;";

                                    const contentDiv = document.createElement("div");
                                    contentDiv.style.cssText = "width: 100%; height: 100%;";

                                    if (item.thumb) {
                                        contentDiv.innerHTML = `<img src="${item.thumb}" style="width: 100%; height: 100%; object-fit: cover;">`;
                                        contentDiv.onclick = () => window.open(item.url, '_blank');
                                    } else {
                                        contentDiv.innerText = item.type;
                                    }
                                    div.appendChild(contentDiv);

                                    if (item.id) {
                                        const unlikeBtn = document.createElement("button");
                                        unlikeBtn.innerHTML = "💔";
                                        unlikeBtn.title = "Descurtir";
                                        unlikeBtn.style.cssText = "position: absolute; bottom: 5px; right: 5px; width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(0,0,0,0.7); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; z-index: 10;";
                                        unlikeBtn.onclick = async (e) => {
                                            e.stopPropagation();
                                            if (confirm("Tem certeza que deseja descurtir?")) {
                                                const success = await unlikeMedia(item.id, item.type);
                                                if (success) {
                                                    div.remove();
                                                }
                                            }
                                        };
                                        div.appendChild(unlikeBtn);
                                    }

                                    grid.appendChild(div);
                                });
                                lista.appendChild(grid);
                            }

                            document.getElementById("voltarCardsBtn").onclick = () => {
                                detalhesDiv.style.display = "none";
                                document.getElementById("interacoesResultados").style.display = "grid";
                            };
                        }

                        async function unlikeMedia(mediaId, type) {
                            try {
                                const csrf = getCookie('csrftoken');
                                if (!csrf) {
                                    alert("Erro: Token CSRF não encontrado. Recarregue a página.");
                                    return false;
                                }

                                let url, body;
                                if (type && (type.includes('Story') || type.includes('Destaque'))) {
                                    url = `https://www.instagram.com/api/v1/story_interactions/unlike_story_like/`;
                                    body = `media_id=${mediaId}`;
                                } else {
                                    url = `https://www.instagram.com/api/v1/web/likes/${mediaId}/unlike/`;
                                    body = '';
                                }

                                const response = await fetch(url, {
                                    method: 'POST',
                                    headers: {
                                        'X-IG-App-ID': '936619743392459',
                                        'X-CSRFToken': csrf,
                                        'X-Requested-With': 'XMLHttpRequest',
                                        'X-ASBD-ID': '129477',
                                        'X-Instagram-AJAX': '1',
                                        'Content-Type': 'application/x-www-form-urlencoded'
                                    },
                                    body: body
                                });
                                if (response.ok) return true;
                                console.error("Falha ao descurtir:", await response.text());
                                alert("Falha ao descurtir.");
                                return false;
                            } catch (e) {
                                console.error(e);
                                alert("Erro ao descurtir.");
                                return false;
                            }
                        }
                    }

                            function baixarReelAtual() {
                                // Função auxiliar para verificar se um elemento está visível na tela
                                const isElementVisible = (el) => {
                                    if (!el) return false;
                                    const rect = el.getBoundingClientRect();
                                    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
                                    const viewWidth = window.innerWidth || document.documentElement.clientWidth;
                                    // Considera visível se estiver dentro da viewport e tiver dimensões
                                    return (
                                        rect.top >= 0 &&
                                        rect.left >= 0 &&
                                        rect.bottom <= viewHeight &&
                                        rect.right <= viewWidth &&
                                        rect.width > 0 &&
                                        rect.height > 0
                                    );
                                };

                                // Encontra todos os vídeos na página e filtra pelo que está visível
                                const videos = Array.from(document.querySelectorAll('video'));
                                const visibleVideo = videos.find(isElementVisible);

                                if (visibleVideo && visibleVideo.src) {
                                    console.log("Vídeo do Reel encontrado:", visibleVideo.src);

                                    // Tenta extrair o nome de usuário para o nome do arquivo
                                    const reelContainer = visibleVideo.closest('article, div[role="dialog"]');
                                    let username = 'reel';
                                    if (reelContainer) {
                                        const userLink = reelContainer.querySelector('header a[href^="/"]');
                                        if (userLink) username = userLink.href.split('/')[1];
                                    }
                                    downloadMedia(visibleVideo.src, `reel_${username}_${Date.now()}.mp4`);
                                } else {
                                    alert('Nenhum vídeo de Reel visível encontrado. Abra o Reel que deseja baixar e tente novamente.');
                                }
                            }

                            async function handleActionOnSelected(selectedUsers, actionType) {
                                if (selectedUsers.length === 0) {
                                    alert("Nenhum usuário selecionado.");
                                    return;
                                }

                                const actionConfig = {
                                    mute: {
                                        buttonId: 'silenciarSeguindoBtn',
                                        text: 'Silenciar/Reativar',
                                        func: (users, cb) => unmuteUsers(users, cb, true) // Passa `true` para ativar o modo toggle
                                },
                                closeFriends: {
                                    buttonId: 'closeFriendsSeguindoBtn',
                                    text: 'Melhores Amigos',
                                    // Nova função que age no perfil individual
                                    func: (users, cb) => performActionOnProfile(users, ['Adicionar à lista Amigos Próximos', 'Amigo próximo'], cb)
                                },
                                hideStory: {
                                    buttonId: 'hideStorySeguindoBtn',
                                    text: 'Ocultar Story',
                                    // Revertido para o método original que navega para a página de lista, conforme solicitado.
                                    func: (users, cb) => toggleListMembership(users, '/accounts/hide_story_and_live_from/', 'hiddenStory', cb)
                                }
                                };

                                const config = actionConfig[actionType];
                                if (!config) return;

                                const btn = document.getElementById(config.buttonId);
                                btn.disabled = true;
                                btn.textContent = 'Processando...';

                                await config.func(selectedUsers, () => {
                                    btn.disabled = false;
                                    btn.textContent = config.text;
                                    alert(`Ação "${config.text}" concluída para ${selectedUsers.length} usuário(s).`);
                                    // Recarrega todos os dados para ver a mudança
                                    document.getElementById("atualizarSeguindoBtn").click();
                                });
                            }

                        async function performActionOnProfile(users, menuTexts, callback) {
                            const originalPath = window.location.pathname;
                            let cancelled = false;
                            const { bar, update, closeButton } = createCancellableProgressBar();
                            closeButton.onclick = () => {
                                cancelled = true;
                                bar.remove();
                                alert("Processo interrompido.");
                            };
                            const isCancelled = () => cancelled;

                            for (let i = 0; i < users.length; i++) {
                                if (isCancelled()) break;
                                const username = users[i];
                                update(i + 1, users.length, "Processando:");

                                // 1. Navegar para o perfil do usuário
                                history.pushState(null, null, `/${username}/`);
                                window.dispatchEvent(new Event("popstate"));
                                await new Promise(resolve => setTimeout(resolve, 4000)); // Espera o perfil carregar

                                // 2. Clicar no botão "Seguindo"
                                // Seletor aprimorado para iPhone: procura em mais tipos de elementos e verifica o texto de forma mais flexível.
                                const followingButton = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]')).find(el => {
                                    const text = el.innerText.trim();
                                    return text === 'Seguindo' || text === 'Following';
                                });
                                if (!followingButton) {
                                    console.warn(`Botão 'Seguindo' não encontrado para ${username}. Pulando.`);
                                    continue;
                                }
                                simulateClick(followingButton);
                                await new Promise(resolve => setTimeout(resolve, 1500)); // Espera o menu dropdown aparecer

                                // 3. Clicar na opção desejada (ex: "Adicionar aos melhores amigos")
                                 // Seletor aprimorado para encontrar o texto em qualquer lugar dentro do elemento clicável
                                 const actionOption = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"]')).find(el =>
                                     menuTexts.some(text => el.innerText.includes(text))
                                 );



                                if (actionOption) {
                                    simulateClick(actionOption);
                                    console.log(`Ação '${actionOption.innerText}' executada para ${username}.`);
                                } else {
                                    console.warn(`Opção de ação não encontrada para ${username}. Textos procurados: ${menuTexts.join(', ')}`);
                                    // Tenta fechar o menu se a opção não foi encontrada
                                    simulateClick(followingButton);
                                }
                                await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa antes do próximo
                            }

                            bar.remove();

                            // Retorna para a página original
                            history.pushState(null, null, originalPath);
                            window.dispatchEvent(new Event("popstate"));
                            await new Promise(r => setTimeout(r, 1000));

                            // Limpa os caches relevantes para forçar a recarga na próxima vez
                            userListCache.closeFriends = null;
                            userListCache.hiddenStory = null;

                            if (callback) callback();
                        }

                            async function toggleListMembership(users, pageUrl, cacheKey, callback) {
                                const originalPath = window.location.pathname;
                                let cancelled = false;
                                const { bar, update, closeButton } = createCancellableProgressBar();
                                closeButton.onclick = () => {
                                    cancelled = true;
                                    bar.remove();
                                    alert("Processo interrompido.");
                                };
                                const isCancelled = () => cancelled;

                                // Navega para a página correta
                                history.pushState(null, null, pageUrl);
                                window.dispatchEvent(new Event("popstate"));
                                await new Promise(r => setTimeout(r, 3000));

                                for (let i = 0; i < users.length; i++) { if (isCancelled()) break; const username = users[i]; update(i + 1, users.length, "Processando:");
                                    // A lógica para encontrar e clicar no checkbox é a mesma para CF e Hide Story
                                    const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                                    let found = false;
                                    for (const flex of flexboxes) {
                                        const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                        if (userText === username) {
                                            const checkboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                                            if (checkboxContainer) {
                                                checkboxContainer.click();
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (!found) {
                                        console.warn(`Não foi possível encontrar o checkbox para ${username} na página ${pageUrl}.`);
                                    }
                                    await new Promise(r => setTimeout(r, 1500)); // Pausa entre as ações
                                }

                                bar.remove();

                                // Retorna para a página original
                                history.pushState(null, null, originalPath);
                                window.dispatchEvent(new Event("popstate"));
                                await new Promise(r => setTimeout(r, 1000));

                                // Limpa o cache específico para forçar a recarga na próxima vez
                                userListCache[cacheKey] = null;

                                if (callback) callback();
                            }



                            async function getProfilePic(username) {
                                try {
                                    // Usa a API interna do Instagram, que é mais estável que raspar o HTML.
                                    const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                                        headers: {
                                            // ID público do aplicativo web do Instagram
                                            'X-IG-App-ID': '936619743392459'
                                        }
                                    });
                                    const contentType = response.headers.get("content-type");
                                    if (response.ok && contentType && contentType.includes("application/json")) {
                                        const data = await response.json();
                                        return data.data?.user?.profile_pic_url || 'https://via.placeholder.com/32';
                                    }
                                    return 'https://via.placeholder.com/32';
                                } catch (error) {
                                    // console.warn(`Erro ao buscar foto para ${username}:`, error);
                                    return 'https://via.placeholder.com/32';
                                }
                            }

                            function preencherTabela(userList, showCheckbox = true, isHistory = false) {
                                const tableId = isHistory ? "historicoTable" : "naoSegueDeVoltaTable";
                                const table = document.getElementById(tableId);
                                if (!table) return;

                                table.innerHTML = `
                                    <thead>
                                        <tr>
                                            <th style="border: 1px solid #ccc; padding: 10px;">ID</th>
                                            <th style="border: 1px solid #ccc; padding: 10px;">Username</th>
                                            <th style="border: 1px solid #ccc; padding: 10px;">Foto</th>
                                            ${isHistory ? '<th style="border: 1px solid #ccc; padding: 10px;">Data do Unfollow</th>' : ''}
                                            ${showCheckbox ? '<th style="border: 1px solid #ccc; padding: 10px;">Check</th>' : ''}
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                `;
                                // Seleciona o tbody APÓS a tabela ser criada
                                const tbody = table.querySelector("tbody");
                                if (!tbody) return;

                                const itemsPerPage = loadSettings().itemsPerPage; // Número de itens por página
                                const maxPageButtons = 5; // Número máximo de botões de página exibidos
                                let currentPage = 1; // Página atual

                                function renderTable(page) {
                                    tbody.innerHTML = ""; // Limpa a tabela para a nova página
                                    const startIndex = (page - 1) * itemsPerPage;
                                    const endIndex = Math.min(startIndex + itemsPerPage, userList.length);

                                    userList.slice(startIndex, endIndex).forEach((userData, index) => {
                                        const isObject = typeof userData === 'object' && userData !== null;
                                        const username = isObject ? userData.username : userData;
                                        const photoUrl = isObject ? userData.photoUrl : null;
                                        let unfollowDate = null;
                                        if (isHistory) {
                                            try {
                                                unfollowDate = userData.unfollowDate ? new Date(userData.unfollowDate).toLocaleString('pt-BR') : 'Data desconhecida';
                                            } catch (e) { unfollowDate = 'Data inválida'; }
                                        }

                                        const tr = document.createElement("tr");
                                        tr.setAttribute('data-username', username);
                                        tr.innerHTML = `
                                            <td style="border: 1px solid #ccc; padding: 10px;">${startIndex + index + 1}</td>
                                            <td style="border: 1px solid #ccc; padding: 10px;">
                                                <a href="https://www.instagram.com/${username}" target="_blank">${username}</a>
                                            </td>
                                            <td style="border: 1px solid #ccc; padding: 10px;">
                                                <img id="img_${username}_${isHistory ? 'hist' : 'main'}" src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%;" onerror="this.onerror=null;this.src='https://via.placeholder.com/32';">
                                            </td>` +
                                            (isHistory ? `<td style="border: 1px solid #ccc; padding: 10px;">${unfollowDate}</td>` : '') +
                                            (showCheckbox ? `<td style="border: 1px solid #ccc; padding: 10px;">
                                                <input type="checkbox" class="unfollowCheckbox" data-username="${username}" />
                                            </td>` : '') + `
                                        `;
                                        tbody.appendChild(tr);
                                        // Comentado para evitar erro 429 (Too Many Requests) ao renderizar a tabela
                                        // if (!isHistory && !photoUrl) {
                                        //     getProfilePic(username).then(url => {
                                        //         const img = document.getElementById(`img_${username}_main`);
                                        //         if (img) img.src = url;
                                        //     });
                                        // }
                                    });

                                    updatePaginationControls();
                                }

                                function updatePaginationControls() {
                                    const paginationDiv = document.getElementById("paginationControls");
                                    if (!paginationDiv) return;

                                    paginationDiv.innerHTML = ""; // Limpa os controles de paginação

                                    const totalPages = Math.ceil(userList.length / itemsPerPage);
                                    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
                                    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

                                    // Indicador de página
                                    const pageIndicator = document.createElement("span");
                                    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
                                    pageIndicator.style.marginRight = "20px";
                                    pageIndicator.style.fontWeight = "bold";
                                    paginationDiv.appendChild(pageIndicator);

                                    // Botão "Anterior"
                                    const prevButton = document.createElement("button");
                                    prevButton.textContent = "Anterior";
                                    prevButton.disabled = currentPage === 1;
                                    prevButton.style.marginRight = "10px";
                                    prevButton.addEventListener("click", () => {
                                        if (currentPage > 1) {
                                            currentPage--;
                                            renderTable(currentPage);
                                        }
                                    });
                                    paginationDiv.appendChild(prevButton);

                                    // Botões de página (limitados ao conjunto atual)
                                    for (let i = startPage; i <= endPage; i++) {
                                        const pageButton = document.createElement("button");
                                        pageButton.textContent = i;
                                        pageButton.style.marginRight = "5px";
                                        pageButton.disabled = i === currentPage;
                                        pageButton.addEventListener("click", () => {
                                            currentPage = i;
                                            renderTable(currentPage);
                                        });
                                        paginationDiv.appendChild(pageButton);
                                    }

                                    // Botão "Próximo"
                                    const nextButton = document.createElement("button");
                                    nextButton.textContent = "Próximo";
                                    nextButton.disabled = currentPage === totalPages;
                                    nextButton.style.marginLeft = "10px";
                                    nextButton.addEventListener("click", () => {
                                        if (currentPage < totalPages) {
                                            currentPage++;
                                            renderTable(currentPage);
                                        }
                                    });
                                    paginationDiv.appendChild(nextButton);
                                }

                                // Adiciona os controles de paginação
                                let paginationDiv = document.getElementById("paginationControls");
                                if (!paginationDiv) {
                                    if (!document.getElementById("tabelaContainer")) return; // Garante que o container existe
                                    paginationDiv = document.createElement("div");
                                    paginationDiv.id = "paginationControls";
                                    paginationDiv.style.marginTop = "20px";
                                    document.getElementById("tabelaContainer").appendChild(paginationDiv);
                                }

                                renderTable(currentPage); // Renderiza a primeira página
                            }

                            function selecionarTodos(e, tableId = "naoSegueDeVoltaTable") {
                                document.querySelectorAll(`#${tableId} .unfollowCheckbox`).forEach((checkbox) => {
                                    checkbox.checked = true;
                                });
                            }

                            function desmarcarTodos(e, tableId = "naoSegueDeVoltaTable") {
                                document.querySelectorAll(".unfollowCheckbox").forEach((checkbox) => {
                                    checkbox.checked = false;
                                });
                            }

                            function unfollowSelecionados(e, tableId = "naoSegueDeVoltaTable") {
                                const selecionados = getSelectedUsers(tableId);
                                // ... resto da função unfollowSelecionados
                            }


                            function unfollowSelecionados() {
                                if (isUnfollowing) {
                                    alert("Processo de unfollow já em andamento.");
                                    return;
                                }

                                const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(
                                    (checkbox) => checkbox.dataset.username
                                );

                                if (selecionados.length === 0) {
                                    alert("Nenhum usuário selecionado para Unfollow.");
                                    return;
                                }

                                // Desabilitar botão para evitar múltiplas execuções
                                const unfollowBtn = document.getElementById("unfollowBtn");
                                unfollowBtn.disabled = true;
                                unfollowBtn.textContent = "Processando...";
                                isUnfollowing = true;

                                // Iniciar processo de unfollow
                                unfollowUsers(selecionados, 0, () => {
                                    // Reabilitar botão ao finalizar
                                    unfollowBtn.disabled = false;
                                    unfollowBtn.textContent = "Unfollow";
                                    isUnfollowing = false;
                                });
                            }

                            function unfollowUsers(users, index, callback) {
                                if (index >= users.length) {
                                    console.log("Todos os usuários processados. Unfollow concluído.");
                                    alert("Unfollow concluído.");
                                    if (callback) callback();
                                    return;
                                }

                                const username = users[index];
                                console.log(`Iniciando unfollow para: ${username}, índice: ${index} de ${users.length - 1}`);
                                // Navegar para o perfil
                                history.pushState(null, null, `/${username}/`);
                                window.dispatchEvent(new Event("popstate"));

                                // Aguardar carregamento da página
                                const unfollowDelay = loadSettings().unfollowDelay;

                                setTimeout(() => {
                                    // Encontrar botão Seguindo (tentar vários seletores e textos alternativos)
                                    function getButtonByDescendantText(texts) {
                                        for (const text of texts) {
                                            const xpath = `//button[descendant::*[normalize-space(text())='${text}']]`;
                                            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            if (result.singleNodeValue) {
                                                console.log(`Botão encontrado via XPath para texto: ${text}`);
                                                return result.singleNodeValue;
                                            }
                                        }
                                        return null;
                                    }
                                    let followBtn = getButtonByDescendantText(['Seguindo', 'Following', 'Siguiendo']);
                                    if (!followBtn) {
                                        const candidates = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
                                        for (const el of candidates) {
                                            const text = el.textContent.trim();
                                            console.log("Candidato texto:", text);
                                            if (text === 'Seguindo' || text === 'Following' || text === 'Siguiendo') {
                                                followBtn = el;
                                                break;
                                            }
                                        }
                                    }
                                    if (!followBtn) {
                                        const allElements = Array.from(document.querySelectorAll('*'));
                                        for (const el of allElements) {
                                            const text = el.textContent.trim();
                                            if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && (text === 'Seguindo' || text === 'Following' || text === 'Siguiendo')) {
                                                followBtn = el;
                                                break;
                                            }
                                        }
                                    }
                                    if (followBtn) {
                                        followBtn.click();
                                        console.log("Botão 'Seguindo' clicado para " + username);
                                        // Aguardar diálogo abrir
                                        setTimeout(() => {
                                            // Seletor aprimorado para o botão "Deixar de seguir"
                                            let confirmBtn;
                                            if (!confirmBtn) {
                                                confirmBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(el => {
                                                    const text = el.textContent.trim();
                                                    return text === 'Deixar de seguir' || text === 'Unfollow' || text === 'Dejar de seguir';
                                                });
                                            }
                                            if (!confirmBtn) {
                                                confirmBtn = Array.from(document.querySelectorAll('*')).find(el => {
                                                    const text = el.textContent.trim();
                                                    return (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && (text === 'Deixar de seguir' || text === 'Unfollow' || text === 'Dejar de seguir');
                                                });
                                            }
                                            if (confirmBtn) {
                                                confirmBtn.click();
                                                console.log("Botão 'Deixar de seguir' clicado para " + username);

                                                // Salvar no histórico do IndexedDB
                                                getProfilePic(username).then(photoUrl => {
                                                    dbHelper.saveUnfollowHistory({
                                                        username: username,
                                                        photoUrl: photoUrl,
                                                        unfollowDate: new Date().toISOString()
                                                    }).catch(err => console.error(`Falha ao salvar ${username} no histórico:`, err));
                                                });

                                                // Aguardar antes do próximo
                                                setTimeout(() => {
                                                    console.log(`Avançando para o próximo usuário, índice: ${index + 1}`);
                                                    unfollowUsers(users, index + 1, callback);
                                                }, unfollowDelay);
                                                // Remove the row after unfollow
                                                setTimeout(() => {
                                                    const row = document.querySelector(`tr[data-username="${username}"]`);
                                                    if (row) row.remove();
                                                }, unfollowDelay + 1000);
                                            } else {
                                                console.log(`Botão de confirmação não encontrado para ${username}, pulando para o próximo`);
                                                alert(`Não conseguiu confirmar unfollow para ${username}`);
                                                unfollowUsers(users, index + 1, callback);
                                            }
                                        }, 2000); // Aumentar para 2 segundos para a caixa abrir
                                    } else {
                                        console.log(`Botão Seguindo não encontrado para ${username}, pulando para o próximo`);
                                        alert(`Botão Seguindo não encontrado para ${username}`);
                                        unfollowUsers(users, index + 1, callback);
                                    }
                                }, 4000); // Aumentar para 4 segundos para carregamento da página
                            }

                            function isMobileDevice() {
                                // Detectar se o dispositivo é móvel
                                return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                            }

                            function startScrollMobile() {
                                let lastScrollTop = 0; // Para verificar se o scroll mudou
                                let waitTime = 0; // Tempo de espera para detectar o fim do scroll

                                scrollInterval = setInterval(() => {
                                    // Extrair usernames visíveis na página
                                    extractUsernames();
                                    updateProgressBar();

                                    // Rolar para baixo
                                    window.scrollTo(0, document.body.scrollHeight);

                                    // Verificar se o scroll parou
                                    const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                                    if (currentScrollTop === lastScrollTop) {
                                        waitTime += 1; // Incrementa o tempo de espera
                                        if (waitTime >= 10) { // Se não houver mudança no scroll por 10 ciclos (10 segundos)
                                            clearInterval(scrollInterval); // Parar o intervalo
                                            startDownload(); // Iniciar o download
                                        }
                                    } else {
                                        waitTime = 0; // Resetar o tempo de espera se o scroll mudou
                                    }

                                    lastScrollTop = currentScrollTop; // Atualizar a posição do scroll
                                }, 1000); // Intervalo de 1 segundo
                            }
                            voiceControl.init();
                        }

                        async function downloadMedia(url, filename) {
                            alert(`Iniciando download de: ${filename}`);
                            try {
                                // Se for uma data URL (do canvas), não precisa de fetch
                                if (url.startsWith('data:')) {
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    return;
                                }

                                const response = await fetch(url);
                                if (!response.ok) throw new Error('A resposta da rede não foi ok.');
                                const blob = await response.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                            } catch (error) {
                                console.error('Erro ao baixar mídia:', error);
                                alert('Não foi possível baixar automaticamente. Abrindo em uma nova aba para download manual.');
                                window.open(url, '_blank');
                            }
                        }

                        // --- FIM DA LÓGICA DE DOWNLOAD DE STORIES ---

                       dbHelper.openDB(); // Abre a conexão com o IndexedDB na inicialização
                        applyInitialSettings(); // Aplica as configurações salvas na inicialização
                        addFeedDownloadButtons();
                        injectMenu();
                        initShortcutListener();

                        // Re-inject menu on navigation
                        const push = history.pushState;
                        history.pushState = function () {
                            push.apply(history, arguments);
                            setTimeout(() => {
                                if (window.location.href.includes("instagram.com")) injectMenu();
                            }, 500);
                        };

                        window.addEventListener("popstate", () => {
                            setTimeout(() => {
                                if (window.location.href.includes("instagram.com")) injectMenu();
                                // Aplica as configurações após a navegação também
                                if (document.getElementById("assistiveTouchMenu")) applyInitialSettings();
                            }, 500);
                        });

                        // Garante que o menu seja injetado periodicamente caso o DOM mude (SPA)
                        setInterval(() => {
                            if (window.location.href.includes("instagram.com")) injectMenu();
                        }, 1000);

                    // --- DOWNLOAD DE MÍDIA DO FEED E REELS ---
                    function addFeedDownloadButtons() {
                        const observer = new MutationObserver(mutations => {
                            mutations.forEach(mutation => {
                                if (mutation.addedNodes.length) {
                                    // Busca por posts (articles) que ainda não foram processados
                                    const articles = document.querySelectorAll('article:not([data-download-processed])');
                                    articles.forEach(article => {
                                        article.setAttribute('data-download-processed', 'true');
                                        addDownloadButtonToMedia(article);
                                    });
                                }
                            });
                        });

                        observer.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                    }

                    function addDownloadButtonToMedia(article) {
                        // Função para processar e adicionar botão a um container de mídia
                        const processContainer = (container) => {
                            const mediaElement = container.querySelector('img, video');
                            // Pula se não houver mídia, se o botão já existir, ou se for imagem de perfil
                            if (!mediaElement || container.querySelector('.feed-download-btn') || container.closest('header')) {
                                return;
                            }
                            createAndAttachButton(container);
                        };

                        // Processa mídias já existentes no artigo
                        article.querySelectorAll('ul > li, div[role="presentation"], ._aagv').forEach(processContainer);

                        // Cria um observador específico para este artigo para lidar com o carregamento dinâmico do carrossel
                        const articleObserver = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                if (mutation.addedNodes.length) {
                                    mutation.addedNodes.forEach(node => {
                                        if (node.nodeType === 1) { // Se for um elemento
                                            // Procura por containers de mídia dentro dos nós adicionados
                                            node.querySelectorAll('ul > li, div[role="presentation"], ._aagv').forEach(processContainer);
                                            // Verifica o próprio nó adicionado
                                            if (node.matches('ul > li, div[role="presentation"], ._aagv')) {
                                                processContainer(node);
                                            }
                                        }
                                    });
                                }
                            });
                        });

                        articleObserver.observe(article, { childList: true, subtree: true });
                    }

                    function createAndAttachButton(container) {
                        if (!container) return;

                        // Evita adicionar botão em imagens de perfil nos comentários
                        const closestCommentSection = container.closest('ul[class*="x78zum5"]');
                        if (closestCommentSection) {
                            const commentAuthorLink = closestCommentSection.querySelector('a[href*="/p/"]');
                            if (!commentAuthorLink) { // Se não achar link de post, é provável que seja a lista de comentários principal
                                return;
                            }
                        }

                        // Evita adicionar botão em imagens de perfil no header do post
                        if (container.closest('header')) {
                            return;
                        }

                        // Se o botão já existe, não faz nada
                        if (container.querySelector('.feed-download-btn')) return;

                        const btn = document.createElement('button');
                        btn.innerHTML = '⬇️';
                        btn.className = 'feed-download-btn';
                        btn.style.cssText = `
                            position: absolute;
                            top: 15px;
                            left: 15px;
                            z-index: 100;
                            background-color: rgba(0, 0, 0, 0.6);
                            color: white;
                            border: none;
                            border-radius: 50%;
                            width: 32px;
                            height: 32px;
                            font-size: 16px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            line-height: 1;
                        `;

                        // Impede que o evento 'mousedown' se propague para os elementos pais.
                        // Isso é crucial para evitar que o Instagram abra o pop-up da postagem
                        // e cause o erro 'aria-hidden'.
                        btn.addEventListener('mousedown', (e) => {
                            e.stopPropagation();
                        });

                        btn.onclick = (e) => {
                            e.stopPropagation();
                            e.preventDefault();

                            // Lógica para baixar a mídia contida no container do botão
                            const activeMedia = container.querySelector('video, img');

                            if (activeMedia) {
                                const isVideo = activeMedia.tagName === 'VIDEO';
                                let mediaUrl = activeMedia.src;

                                // Para vídeos (especialmente Reels), a URL pode estar em um elemento <source>
                                if (isVideo) {
                                    const sourceElement = activeMedia.querySelector('source');
                                    if (sourceElement && sourceElement.src) {
                                        mediaUrl = sourceElement.src;
                                    }
                                }

                                const filename = `instagram_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
                                downloadMedia(mediaUrl, filename);
                            } else {
                                alert('Não foi possível encontrar a mídia para download.');
                            }
                        };
                        container.style.position = 'relative';
                        container.appendChild(btn);
                    }
                } // Esta chave fecha o if (window.location.href.includes("instagram.com"))
            }

            // Lógica de inicialização mais robusta para SPAs como o Instagram
            const observer = new MutationObserver((mutations, obs) => {
                // Procura por um elemento principal que sempre existe no Instagram logado
                const mainContainer = document.querySelector('main[role="main"], div[data-main-nav="true"]');
                if (mainContainer) {
                    console.log("Elemento principal do Instagram encontrado, iniciando o script.");
                    initScript();
                    obs.disconnect(); // Para de observar após a inicialização para economizar recursos
                }
            });

            // Começa a observar o corpo do documento por mudanças
            observer.observe(document.body, {
                childList: true,
                    subtree: true,
            });

        })();