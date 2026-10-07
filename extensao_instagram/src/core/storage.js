// Camada 1: Core - Armazenamento Local e Conexão com Google Drive
window.IGTools = window.IGTools || {};

(function () {
    const rawStorage = {
        get: (key) => {
            try {
                return typeof GM_getValue !== 'undefined' ? GM_getValue(key) : localStorage.getItem('ig_tools_' + key);
            } catch (e) {
                return localStorage.getItem('ig_tools_' + key);
            }
        },
        set: (key, val) => {
            try {
                if (typeof GM_setValue !== 'undefined') GM_setValue(key, val);
                localStorage.setItem('ig_tools_' + key, val);
            } catch (e) {
                localStorage.setItem('ig_tools_' + key, val);
            }
        }
    };

    function loadSettings() {
        const defaults = window.IGTools.Config.DEFAULT_SETTINGS;
        try {
            const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
            return { ...defaults, ...saved };
        } catch (e) {
            return defaults;
        }
    }

    function saveSettings(newSettings) {
        const current = loadSettings();
        const merged = { ...current, ...newSettings };
        localStorage.setItem('instagramToolsSettings_v2', JSON.stringify(merged));
        return merged;
    }

    const googleAuth = {
        getAccessToken: () => rawStorage.get('gdrive_token'),
        setAccessToken: (token) => rawStorage.set('gdrive_token', token),

        login: function () {
            const config = window.IGTools.Config.GDRIVE_CONFIG;
            if (config.clientId.includes('SEU_CLIENT_ID')) {
                alert("ERRO: Você precisa configurar seu Client ID do Google Cloud no código!");
                window.open('https://console.cloud.google.com/');
                return;
            }
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/')}&response_type=token&scope=${encodeURIComponent(config.scope)}`;
            window.location.href = authUrl;
        },

        checkUrlToken: function () {
            const hash = window.location.hash;
            if (hash && hash.includes('access_token=')) {
                console.log("[IG Tools] Hash detectado após login.");
                const params = new URLSearchParams(hash.substring(1));
                const token = params.get('access_token');
                console.log("[IG Tools] Sucesso! Token recebido.");
                this.setAccessToken(token);
                localStorage.setItem('ig_tools_gdrive_token', token);
                if (window.IGTools.UI?.showToast) {
                    window.IGTools.UI.showToast("✅ Logado no Google Drive!");
                }
                window.location.hash = '';
            }
        },

        showAuthGate: function () {
            if (document.getElementById('ig-tools-auth-gate')) return;
            const gate = document.createElement('div');
            gate.id = 'ig-tools-auth-gate';
            gate.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); border: 1px solid #dbdbdb; display: flex; flex-direction: column; gap: 12px; align-items: center; max-width: 280px; font-family: -apple-system, system-ui, sans-serif;';
            gate.innerHTML = `
                <div style="font-size: 24px;">🛠️</div>
                <span style="color: black; font-weight: bold; font-size: 16px; text-align: center;">IG Tools Protegido</span>
                <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">Faça login com sua conta Google para ativar as ferramentas de download e análise.</p>
                <button id="authGateLoginBtn" style="background: #4285F4; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; transition: background 0.2s;">Login com Google</button>
            `;
            document.body.appendChild(gate);
            const btn = document.getElementById('authGateLoginBtn');
            if (btn) btn.onclick = () => googleAuth.login();
        }
    };

    // Helper consolidado para Google Drive / Cache de dados
    const dbHelper = {
        _cache: null,
        _init: async function () {
            if (!this._cache) {
                try {
                    console.log("[IG Tools] Sincronizando com Google Drive...");
                    this._cache = await window.IGTools.GDriveApi.loadData();
                    if (!this._cache || typeof this._cache !== 'object') {
                        this._cache = {};
                    }
                    if (Object.keys(this._cache).length > 0) {
                        console.log("[IG Tools] Dados carregados com sucesso.");
                    }
                } catch (e) {
                    this._cache = {};
                }

                // Merge inteligente na inicialização para nunca perder dados locais do localStorage
                try {
                    const localUnblocked = JSON.parse(localStorage.getItem('ig_tools_cached_unblocked'));
                    if (Array.isArray(localUnblocked) && localUnblocked.length > 0) {
                        const cloudUnblocked = Array.isArray(this._cache.unblockedAccounts) ? this._cache.unblockedAccounts : [];
                        const map = new Map();
                        cloudUnblocked.forEach(u => { if (u && u.username) map.set(u.username.toLowerCase(), u); });
                        let addedFromLocal = false;
                        localUnblocked.forEach(u => {
                            if (u && u.username && !map.has(u.username.toLowerCase())) {
                                map.set(u.username.toLowerCase(), u);
                                addedFromLocal = true;
                            }
                        });
                        this._cache.unblockedAccounts = Array.from(map.values());
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(this._cache.unblockedAccounts));
                        if (addedFromLocal && googleAuth.isConnected()) {
                            window.IGTools.GDriveApi.saveData(this._cache).catch(err => console.warn('[IG Tools] Auto-sync local unblocked to Drive failed:', err));
                        }
                    }
                } catch (_) { }
            }
            return this._cache;
        },
        openDB: function () { return this._init(); },
        saveCache: async function (storeName, data) {
            await this._init();
            let formattedData = [];
            if (data instanceof Set) {
                formattedData = Array.from(data).map(u => ({ username: u, photoUrl: null }));
            } else if (Array.isArray(data)) {
                formattedData = data.map(item => {
                    if (typeof item === 'string') return { username: item, photoUrl: null };
                    return item;
                });
            } else {
                formattedData = [];
            }
            this._cache[storeName] = formattedData;
            try {
                localStorage.setItem('ig_tools_cache_' + storeName, JSON.stringify(formattedData));
                await window.IGTools.GDriveApi.saveData(this._cache);
                
                // Se for a lista de seguidores, sincroniza automaticamente com o Service Worker em background
                if (storeName === 'followers' && formattedData.length > 0) {
                    sendBridgeMessage('SYNC_FOLLOWERS_BASELINE', { followers: formattedData }).catch(e => {
                        console.warn('[IG Tools] Aviso ao sincronizar baseline com background:', e);
                    });
                }
            } catch (errSync) {
                console.warn(`[IG Tools] Aviso: Dados salvos localmente, sincronização em nuvem pendente (${storeName}):`, errSync);
            }
        },
        loadCache: async function (storeName) {
            await this._init();
            const data = this._cache[storeName];
            if (!data) return null;
            const set = new Set(data.map(u => u.username));
            set.details = new Map(data.map(u => [u.username, u]));
            return set;
        },
        saveUnfollowHistory: async function (userData) {
            await this._init();
            if (!this._cache.unfollowHistory) this._cache.unfollowHistory = [];
            this._cache.unfollowHistory.push(userData);
            await window.IGTools.GDriveApi.saveData(this._cache);
        },
        deleteUnfollowHistory: async function (usernames) {
            await this._init();
            this._cache.unfollowHistory = (this._cache.unfollowHistory || []).filter(u => !usernames.includes(u.username));
            await window.IGTools.GDriveApi.saveData(this._cache);
        },
        loadUnfollowHistory: async function () {
            await this._init();
            return (this._cache.unfollowHistory || []).sort((a, b) => new Date(b.unfollowDate) - new Date(a.unfollowDate));
        },
        saveException: async function (username) {
            await this._init();
            if (!this._cache.exceptions) this._cache.exceptions = [];
            if (!this._cache.exceptions.includes(username)) this._cache.exceptions.push(username);
            await window.IGTools.GDriveApi.saveData(this._cache);
        },
        loadExceptions: async function () {
            await this._init();
            return new Set(this._cache.exceptions || []);
        },
        saveCategory: async function (category) {
            await this._init();
            if (!this._cache.categories) this._cache.categories = [];
            const idx = this._cache.categories.findIndex(c => c.id === category.id);
            if (idx > -1) this._cache.categories[idx] = category;
            else this._cache.categories.push(category);
            await window.IGTools.GDriveApi.saveData(this._cache);
        },
        loadCategories: async function () {
            await this._init();
            return (this._cache.categories || []).sort((a, b) => a.name.localeCompare(b.name));
        },
        deleteCategory: async function (categoryId) {
            await this._init();
            this._cache.categories = (this._cache.categories || []).filter(c => c.id !== categoryId);
            if (this._cache.userCategories) {
                Object.keys(this._cache.userCategories).forEach(user => {
                    this._cache.userCategories[user] = this._cache.userCategories[user].filter(id => id !== categoryId);
                });
            }
            await window.IGTools.GDriveApi.saveData(this._cache);
        },
        saveUserCategories: async function (username, categoryIds) {
            await this._init();
            if (!this._cache.userCategories) this._cache.userCategories = {};
            this._cache.userCategories[username.toLowerCase()] = categoryIds;
            await window.IGTools.GDriveApi.saveData(this._cache);
        },
        loadAllUserCategories: async function () {
            await this._init();
            const map = new Map();
            const data = this._cache.userCategories || {};
            Object.keys(data).forEach(user => map.set(user, data[user]));
            return map;
        },
        saveAllUserCategories: async function (categoryMap) {
            await this._init();
            this._cache.userCategories = Object.fromEntries(categoryMap);
            await window.IGTools.GDriveApi.saveData(this._cache);
        },
        saveUnblockedAccounts: async function (accounts) {
            await this._init();
            this._cache.unblockedAccounts = accounts;
            try {
                localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(accounts));
            } catch (_) { }

            if (googleAuth.isConnected()) {
                try {
                    let cloudData = {};
                    try {
                        cloudData = await window.IGTools.GDriveApi.loadData();
                        if (!cloudData || typeof cloudData !== 'object') cloudData = {};
                    } catch (_) { }

                    const cloudUnblocked = Array.isArray(cloudData.unblockedAccounts) ? cloudData.unblockedAccounts : [];
                    const map = new Map();
                    cloudUnblocked.forEach(u => {
                        if (u && u.username) map.set(u.username.toLowerCase(), u);
                    });
                    accounts.forEach(u => {
                        if (u && u.username) map.set(u.username.toLowerCase(), u);
                    });
                    const merged = Array.from(map.values());
                    this._cache = { ...(this._cache || {}), ...cloudData, unblockedAccounts: merged };
                    await window.IGTools.GDriveApi.saveData(this._cache);

                    // Reconciliação automática: remove contas desbloqueadas do cache de bloqueados
                    try {
                        const cachedBlocked = JSON.parse(localStorage.getItem('ig_tools_cached_blocked'));
                        if (Array.isArray(cachedBlocked) && cachedBlocked.length > 0) {
                            const unblockedSet = new Set(merged.map(u => (u.username || '').toLowerCase()));
                            const filteredBlocked = cachedBlocked.filter(u => !unblockedSet.has((u.username || '').toLowerCase()));
                            if (filteredBlocked.length !== cachedBlocked.length) {
                                localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(filteredBlocked));
                            }
                        }
                    } catch (_) { }

                    return merged;
                } catch (errSync) {
                    console.warn('[IG Tools] Erro ao sincronizar contas desbloqueadas com Drive:', errSync);
                    throw errSync;
                }
            } else {
                console.warn('[IG Tools] Google Drive desconectado. Contas salvas apenas localmente.');
                throw new Error("Google Drive não conectado.");
            }
        },
        loadUnblockedAccounts: async function (forceRefresh = false) {
            let localList = [];
            try {
                const local = JSON.parse(localStorage.getItem('ig_tools_cached_unblocked'));
                if (Array.isArray(local)) localList = local;
            } catch (_) { }

            if (googleAuth.isConnected()) {
                if (forceRefresh || !this._cache || !Array.isArray(this._cache.unblockedAccounts)) {
                    try {
                        console.log("[IG Tools] Buscando contas desbloqueadas mais recentes do Google Drive...");
                        const cloudData = await window.IGTools.GDriveApi.loadData();
                        if (cloudData && typeof cloudData === 'object') {
                            this._cache = { ...(this._cache || {}), ...cloudData };
                        }
                    } catch (e) {
                        console.error("[IG Tools] Erro ao recarregar contas da nuvem:", e);
                    }
                }
                const cloudUnblocked = (this._cache && Array.isArray(this._cache.unblockedAccounts)) ? this._cache.unblockedAccounts : [];
                const map = new Map();
                cloudUnblocked.forEach(u => { if (u && u.username) map.set(u.username.toLowerCase(), u); });
                let addedFromLocal = false;
                localList.forEach(u => {
                    if (u && u.username && !map.has(u.username.toLowerCase())) {
                        map.set(u.username.toLowerCase(), u);
                        addedFromLocal = true;
                    }
                });
                const merged = Array.from(map.values());
                if (merged.length > 0) {
                    this._cache.unblockedAccounts = merged;
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(merged));
                    } catch (_) { }

                    // Reconciliação automática: remove contas desbloqueadas do cache de bloqueados
                    try {
                        const cachedBlocked = JSON.parse(localStorage.getItem('ig_tools_cached_blocked'));
                        if (Array.isArray(cachedBlocked) && cachedBlocked.length > 0) {
                            const unblockedSet = new Set(merged.map(u => (u.username || '').toLowerCase()));
                            const filteredBlocked = cachedBlocked.filter(u => !unblockedSet.has((u.username || '').toLowerCase()));
                            if (filteredBlocked.length !== cachedBlocked.length) {
                                localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(filteredBlocked));
                            }
                        }
                    } catch (_) { }

                    if (addedFromLocal) {
                        window.IGTools.GDriveApi.saveData(this._cache).catch(err => console.warn('[IG Tools] Sync back to drive failed:', err));
                    }
                    return merged;
                }
            }
            if (this._cache && Array.isArray(this._cache.unblockedAccounts) && this._cache.unblockedAccounts.length > 0) {
                return this._cache.unblockedAccounts;
            }
            return localList;
        },
        clearCache: async function (storeName) {
            await this._init();
            delete this._cache[storeName];
            await window.IGTools.GDriveApi.saveData(this._cache);
        }
    };

    function sendBridgeMessage(action, payload = {}) {
        return new Promise((resolve) => {
            const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            const handler = (event) => {
                if (event.source !== window || !event.data || event.data.source !== 'IG_TOOLS_BRIDGE' || event.data.id !== id) {
                    return;
                }
                window.removeEventListener('message', handler);
                resolve(event.data);
            };
            window.addEventListener('message', handler);
            window.postMessage({
                source: 'IG_TOOLS_MAIN',
                action: action,
                id: id,
                ...payload
            }, '*');
        });
    }

    window.IGTools.Storage = {
        raw: rawStorage,
        loadSettings,
        saveSettings,
        googleAuth,
        dbHelper
    };

    window.IGTools.BackgroundMonitor = {
        syncFollowers: (followers) => sendBridgeMessage('SYNC_FOLLOWERS_BASELINE', { followers }),
        checkNow: () => sendBridgeMessage('CHECK_NOW'),
        getStatus: () => sendBridgeMessage('GET_MONITOR_STATUS'),
        updateSettings: (settings) => sendBridgeMessage('UPDATE_SETTINGS', { settings }),
        testNotification: (username = 'usuario_teste') => sendBridgeMessage('TEST_NOTIFICATION', { username })
    };
})();
