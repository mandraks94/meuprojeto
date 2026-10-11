/**
 * IG Tools Pro - Módulo de Configurações, Idioma & Parâmetros
 * Arquivo: src/features/settings.js
 * Descrição: Gerenciamento de preferências visuais, sincronização Google Drive,
 * webhook de e-mail de unfollow, exportação e manutenção de tabelas do IndexedDB.
 */

(function () {
    'use strict';

    window.IGTools = window.IGTools || {};

    // Helpers seguros com fallback
    const getText = (key) => (typeof window.getText === 'function' ? window.getText(key) : key);
    const loadSettings = () => (typeof window.loadSettings === 'function' ? window.loadSettings() : {});
    const saveSettings = (newSettings) => { if (typeof window.saveSettings === 'function') window.saveSettings(newSettings); };
    const toggleDarkMode = (enable) => { if (typeof window.toggleDarkMode === 'function') window.toggleDarkMode(enable); };
    const toggleRgbBorder = (enable) => { if (typeof window.toggleRgbBorder === 'function') window.toggleRgbBorder(enable); };
    const toggleAnonymousStories = (enable) => { if (typeof window.toggleAnonymousStories === 'function') window.toggleAnonymousStories(enable); };
    const toggleUseApi = (enable) => { if (typeof window.toggleUseApi === 'function') window.toggleUseApi(enable); };
    const showToast = (msg, duration) => { if (typeof window.showToast === 'function') window.showToast(msg, duration); else console.log(`[IGTools Toast]: ${msg}`); };
    const getInfoIcon = () => window.infoIcon || `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:help; vertical-align: middle; margin-left: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    const getGoogleAuth = () => window.IGTools?.Storage?.googleAuth || window.googleAuth || {
        isConnected: () => false,
        setAccessToken: () => { },
        login: () => {
            const config = window.IGTools?.Config?.GDRIVE_CONFIG;
            if (config?.clientId && !config.clientId.includes('SEU_CLIENT_ID')) {
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/')}&response_type=token&scope=${encodeURIComponent(config.scope)}`;
                window.location.href = authUrl;
            } else {
                alert("Google Auth indisponível ou Client ID não configurado.");
            }
        }
    };

    const getDbHelper = () => window.dbHelper || {
        openDB: async () => ({}),
        _cache: {},
        clearCache: async () => { }
    };

    /**
     * Modal Principal de Configurações
     */
    function abrirModalConfiguracoes() {
        if (document.getElementById("settingsModal")) return;

        const googleAuth = getGoogleAuth();
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
        const isGDriveConnected = googleAuth.isConnected();

        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    ${getText('settings')}
                    <div class="info-tooltip">${getInfoIcon()}<span class="tooltip-text">Ajuste a aparência, atalhos e parâmetros de funcionamento do script.</span></div>
                </span>
                <div class="modal-controls">
                    <button id="fecharSettingsBtn" title="Fechar">X</button>
                </div>
            </div>
            <div style="padding: 15px;">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div class="toggle-item">
                        <span>🌙 <span data-i18n="darkMode">${getText('darkMode')}</span></span>
                        <label class="switch"><input type="checkbox" id="settingsDarkModeToggle" ${settings.darkMode ? 'checked' : ''}><span class="slider"></span></label>
                    </div>
                    <div class="toggle-item">
                        <span>🌈 <span data-i18n="rgbBorder">${getText('rgbBorder')}</span></span>
                        <label class="switch"><input type="checkbox" id="settingsRgbBorderToggle" ${settings.rgbBorder ? 'checked' : ''}><span class="slider"></span></label>
                    </div>
                    <div class="toggle-item">
                        <span>👻 <span data-i18n="anonymousStories">${getText('anonymousStories')}</span></span>
                        <label class="switch"><input type="checkbox" id="settingsAnonymousStoriesToggle" ${settings.anonymousStories ? 'checked' : ''}><span class="slider"></span></label>
                    </div>
                    <div class="toggle-item">
                        <span>⚡ <span data-i18n="useApi">${getText('useApi')}</span></span>
                        <label class="switch"><input type="checkbox" id="settingsUseApiToggle" ${settings.useApi ? 'checked' : ''}><span class="slider"></span></label>
                    </div>
                    <div class="toggle-item">
                        <span>👁️‍🗨️ <span data-i18n="validateProfileStatus">${getText('validateProfileStatus')}</span></span>
                        <label class="switch"><input type="checkbox" id="settingsValidateProfileToggle" ${settings.validateProfileStatus ? 'checked' : ''}><span class="slider"></span></label>
                    </div>

                    ${!isGDriveConnected ? `
                    <div style="background: rgba(231, 76, 60, 0.12); border: 1px solid rgba(231, 76, 60, 0.35); border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #e74c3c; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 2px 0;">
                        <span>⚠️ <b>Google Drive desconectado:</b> Backup em nuvem inativo.</span>
                        <button id="googleBannerLoginBtn" style="background: #4285F4; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: bold; cursor: pointer; white-space: nowrap;">Conectar</button>
                    </div>
                    ` : `
                    <div style="background: rgba(39, 174, 96, 0.12); border: 1px solid rgba(39, 174, 96, 0.35); border-radius: 8px; padding: 6px 10px; font-size: 12px; color: #27ae60; display: flex; align-items: center; gap: 6px; margin: 2px 0;">
                        <span>☁️ <b>Google Drive conectado:</b> Sincronização em nuvem ativa.</span>
                    </div>
                    `}

                    <div class="toggle-item" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>☁️ Google Drive</span>
                            <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; ${isGDriveConnected ? 'background: rgba(39, 174, 96, 0.18); color: #27ae60; border: 1px solid rgba(39, 174, 96, 0.4);' : 'background: rgba(231, 76, 60, 0.18); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.4);'}">
                                ${isGDriveConnected ? '🟢 Conectado' : '🔴 Desconectado'}
                            </span>
                        </div>
                        <button id="googleLoginBtn" style="padding: 5px 12px; border-radius: 6px; cursor: pointer; border: none; font-size: 12px; font-weight: 600; ${isGDriveConnected ? 'background: rgba(231, 76, 60, 0.15); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.3);' : 'background: #4285F4; color: white;'}">
                            ${isGDriveConnected ? 'Desconectar' : '🔑 Conectar'}
                        </button>
                    </div>
                    <button id="settingsVoiceBtn" class="menu-item-button">🎙️ Comandos de Voz</button>
                    <button id="settingsManageCategoriesBtn" class="menu-item-button">📁 Gerenciar Categorias</button>
                    <button id="settingsShortcutsBtn" class="menu-item-button">⌨️ <span data-i18n="shortcuts">${getText('shortcuts')}</span></button>
                    <button id="settingsParamsBtn" class="menu-item-button">🔧 <span data-i18n="parameters">${getText('parameters')}</span></button>
                    <button id="settingsLangBtn" class="menu-item-button">🌐 <span data-i18n="language">${getText('language')}</span></button>
                </div>
            </div>
        `;
        document.body.appendChild(div);

        document.getElementById("fecharSettingsBtn").onclick = () => div.remove();

        const googleLoginBtn = document.getElementById("googleLoginBtn");
        if (googleLoginBtn) {
            googleLoginBtn.onclick = () => {
                if (googleAuth.isConnected()) {
                    googleAuth.setAccessToken(null);
                    showToast("Google Drive desconectado.");
                    div.remove();
                    abrirModalConfiguracoes();
                } else {
                    googleAuth.login();
                }
            };
        }
        const googleBannerLoginBtn = document.getElementById("googleBannerLoginBtn");
        if (googleBannerLoginBtn) {
            googleBannerLoginBtn.onclick = () => googleAuth.login();
        }

        document.getElementById("settingsDarkModeToggle").onchange = (e) => {
            toggleDarkMode(e.target.checked);
            saveSettings({ darkMode: e.target.checked });
        };

        document.getElementById("settingsRgbBorderToggle").onchange = (e) => {
            toggleRgbBorder(e.target.checked);
            saveSettings({ rgbBorder: e.target.checked });
        };

        document.getElementById("settingsAnonymousStoriesToggle").onchange = (e) => {
            toggleAnonymousStories(e.target.checked);
            saveSettings({ anonymousStories: e.target.checked });
            showToast(`Stories Anônimo: ${e.target.checked ? 'ON' : 'OFF'}`);
        };

        document.getElementById("settingsUseApiToggle").onchange = (e) => {
            toggleUseApi(e.target.checked);
            saveSettings({ useApi: e.target.checked });
            const cfApiToggle = document.getElementById('closeFriendsUseApiToggle');
            if (cfApiToggle) cfApiToggle.checked = e.target.checked;
            const hsApiToggle = document.getElementById('hideStoryUseApiToggle');
            if (hsApiToggle) hsApiToggle.checked = e.target.checked;
            showToast(`Modo API: ${e.target.checked ? 'ON' : 'OFF'}`);
        };

        document.getElementById("settingsValidateProfileToggle").onchange = (e) => {
            const isChecked = e.target.checked;
            saveSettings({ validateProfileStatus: isChecked });
            showToast(`Validação de Status: ${isChecked ? 'ON' : 'OFF'}`);
            if (isChecked) {
                if (typeof window.validateCurrentPagePrivacy === 'function') {
                    window.validateCurrentPagePrivacy();
                }
            } else {
                document.querySelectorAll('.ig-privacy-badge').forEach(b => b.remove());
                document.querySelectorAll('[data-privacy-processed]').forEach(el => el.removeAttribute('data-privacy-processed'));
            }
        };

        document.getElementById("settingsVoiceBtn").onclick = () => {
            div.remove();
            if (typeof window.abrirModalComandosVoz === 'function') window.abrirModalComandosVoz();
        };

        document.getElementById("settingsManageCategoriesBtn").onclick = () => {
            div.remove();
            if (typeof window.abrirModalGerenciarCategorias === 'function') window.abrirModalGerenciarCategorias();
        };

        document.getElementById("settingsShortcutsBtn").onclick = () => {
            div.remove();
            if (typeof window.abrirModalAtalhos === 'function') window.abrirModalAtalhos();
        };

        document.getElementById("settingsParamsBtn").onclick = () => {
            div.remove();
            abrirModalParametros();
        };

        document.getElementById("settingsLangBtn").onclick = () => {
            div.remove();
            abrirModalIdioma();
        };
    }

    /**
     * Modal de Escolha de Idioma
     */
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
            btn.onclick = () => {
                const newLang = btn.dataset.lang;
                if (typeof window.updateInterfaceLanguage === 'function') {
                    window.updateInterfaceLanguage(newLang);
                } else if (window.IGTools?.I18n?.updateInterfaceLanguage) {
                    window.IGTools.I18n.updateInterfaceLanguage(newLang);
                } else {
                    saveSettings({ language: newLang });
                }
                div.remove();

                // Atualiza o modal de configurações se estiver aberto
                const settingsModal = document.getElementById("settingsModal");
                if (settingsModal) {
                    settingsModal.remove();
                    abrirModalConfiguracoes();
                }

                if (typeof showToast === 'function') {
                    showToast((getText('language') || 'Idioma') + ': ' + (btn.textContent || newLang));
                }
            };
        });
    }

    /**
     * Modal de Parâmetros Avançados e Manutenção IndexedDB
     */
    function abrirModalParametros() {
        if (document.getElementById("paramsModal")) return;

        const dbHelper = getDbHelper();
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
                    <div class="info-tooltip">${getInfoIcon()}<span class="tooltip-text">Ajuste delays e limites para evitar bloqueios do Instagram.</span></div>
                </span>
                <div class="modal-controls">
                    <button id="fecharParamsBtn" title="Fechar">X</button>
                </div>
            </div>
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label for="unfollowDelayInput">Atraso para Unfollow (ms)</label>
                    <input type="number" id="unfollowDelayInput" value="${settings.unfollowDelay || 1500}" style="width: 80px; color: black;">
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
                    <input type="number" id="itemsPerPageInput" value="${settings.itemsPerPage || 10}" style="width: 80px; color: black;">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label for="backgroundMonitorIntervalInput">Intervalo Monitor de Seguidores (min)</label>
                    <input type="number" id="backgroundMonitorIntervalInput" min="1" max="1440" value="${settings.backgroundMonitorInterval || 15}" style="width: 80px; color: black;">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label for="languageSelect">Idioma</label>
                    <select id="languageSelect" style="width: 120px; color: black;">
                        <option value="pt-BR" ${settings.language === 'pt-BR' ? 'selected' : ''}>🇧🇷 Português</option>
                        <option value="en-US" ${settings.language === 'en-US' ? 'selected' : ''}>🇺🇸 English</option>
                    </select>
                </div>

                <hr style="border: 1px solid #eee; width: 100%;">

                <h3 style="margin: 0; font-size: 16px;">Notificações de Unfollow por E-mail</h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label for="unfollowEmailEnabledToggle">Ativar Envio de E-mail</label>
                        <label class="switch"><input type="checkbox" id="unfollowEmailEnabledToggle" ${settings.unfollowEmailEnabled ? 'checked' : ''}><span class="slider"></span></label>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label for="unfollowEmailRecipientInput">E-mail Destinatário</label>
                        <input type="email" id="unfollowEmailRecipientInput" value="${settings.unfollowEmailRecipient || ''}" placeholder="seu-email@gmail.com" style="width: 100%; padding: 8px; color: black; box-sizing: border-box; border: 1px solid #ccc; border-radius: 5px;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label for="unfollowEmailWebhookInput">URL Webhook Google Apps Script</label>
                        <input type="text" id="unfollowEmailWebhookInput" value="${settings.unfollowEmailWebhookUrl || ''}" placeholder="https://script.google.com/macros/s/.../exec" style="width: 100%; padding: 8px; color: black; box-sizing: border-box; border: 1px solid #ccc; border-radius: 5px;">
                    </div>
                    <button id="testUnfollowEmailBtn" style="background: #27ae60; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 5px; transition: background 0.2s;">📧 Testar Envio (Enviar E-mail de Teste)</button>
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
            if (!select) return;
            select.innerHTML = '<option value="">Selecione uma tabela...</option>';
            const storeNames = Object.keys(db || dbHelper._cache || {});
            storeNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.innerText = name;
                select.appendChild(option);
            });
        });

        document.getElementById("fecharParamsBtn").onclick = () => div.remove();

        document.getElementById("testUnfollowEmailBtn").onclick = async () => {
            const recipient = document.getElementById("unfollowEmailRecipientInput").value.trim();
            const webhookUrl = document.getElementById("unfollowEmailWebhookInput").value.trim();
            if (!recipient || !webhookUrl) {
                alert("Por favor, preencha o E-mail Destinatário e a URL do Webhook antes de testar.");
                return;
            }

            const btn = document.getElementById("testUnfollowEmailBtn");
            const originalText = btn.innerText;
            btn.innerText = "⏳ Enviando...";
            btn.disabled = true;

            try {
                const testUnfollowers = [{ username: 'teste_alerta', photoUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }];
                if (typeof window.sendUnfollowEmailNotification === 'function') {
                    await window.sendUnfollowEmailNotification(testUnfollowers, recipient, webhookUrl);
                }
                alert("E-mail de teste enviado com sucesso! Verifique a sua caixa de entrada.");
            } catch (err) {
                alert("Erro ao enviar e-mail de teste: " + err);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };

        document.getElementById("saveParamsBtn").onclick = () => {
            const monitorInterval = parseInt(document.getElementById("backgroundMonitorIntervalInput")?.value, 10) || 15;
            const newSettings = {
                unfollowDelay: parseInt(document.getElementById("unfollowDelayInput").value, 10),
                requestDelay: parseInt(document.getElementById("requestDelayInput").value, 10),
                requestBatchSize: parseInt(document.getElementById("requestBatchSizeInput").value, 10),
                maxRequests: parseInt(document.getElementById("maxRequestsInput").value, 10),
                itemsPerPage: parseInt(document.getElementById("itemsPerPageInput").value, 10),
                language: document.getElementById("languageSelect").value,
                backgroundMonitorInterval: monitorInterval,
                unfollowEmailEnabled: document.getElementById("unfollowEmailEnabledToggle").checked,
                unfollowEmailRecipient: document.getElementById("unfollowEmailRecipientInput").value.trim(),
                unfollowEmailWebhookUrl: document.getElementById("unfollowEmailWebhookInput").value.trim()
            };
            saveSettings(newSettings);
            if (typeof window.updateInterfaceLanguage === 'function') {
                window.updateInterfaceLanguage(newSettings.language);
            } else if (window.IGTools?.I18n?.updateInterfaceLanguage) {
                window.IGTools.I18n.updateInterfaceLanguage(newSettings.language);
            }
            window.postMessage({
                source: 'IG_TOOLS_MAIN',
                action: 'UPDATE_SETTINGS',
                settings: { backgroundMonitorInterval: monitorInterval }
            }, '*');
            if (typeof showToast === 'function') {
                showToast("Parâmetros salvos!");
            } else {
                alert("Parâmetros salvos!");
            }
            div.remove();
        };

        document.getElementById("btnClearDB").onclick = async () => {
            const storeName = document.getElementById('dbStoreSelect').value;
            if (!storeName) return alert("Selecione uma tabela.");
            if (confirm(`Tem certeza que deseja limpar a tabela '${storeName}'? Isso não pode ser desfeito.`)) {
                await dbHelper.clearCache(storeName);

                if (storeName === 'unblockedAccounts' || storeName === 'unblocked') {
                    if (typeof window.cachedUnblockedAccounts !== 'undefined') window.cachedUnblockedAccounts = [];
                    if (typeof window.unblockedList !== 'undefined') window.unblockedList = [];
                    const unblockedBadge = document.getElementById('tabUnblockedBadge');
                    if (unblockedBadge) unblockedBadge.textContent = '0';
                }

                alert(`Tabela '${storeName}' limpa com sucesso.`);
                div.remove();
                abrirModalParametros();
            }
        };

        document.getElementById("btnExportDB").onclick = async () => {
            const storeName = document.getElementById('dbStoreSelect').value;
            if (!storeName) return alert("Selecione uma tabela.");

            await dbHelper.openDB();
            let result = dbHelper._cache ? dbHelper._cache[storeName] : null;

            if (!result || (Array.isArray(result) && result.length === 0)) {
                if (storeName === 'unblockedAccounts') {
                    try {
                        const local = JSON.parse(localStorage.getItem('ig_tools_cached_unblocked'));
                        if (Array.isArray(local) && local.length > 0) {
                            result = local;
                            if (dbHelper._cache) dbHelper._cache.unblockedAccounts = local;
                        }
                    } catch (_) { }
                } else {
                    try {
                        const local = JSON.parse(localStorage.getItem('ig_tools_cache_' + storeName) || localStorage.getItem('ig_tools_cached_' + storeName));
                        if (Array.isArray(local) && local.length > 0) result = local;
                    } catch (_) { }
                }
            }

            if (!result || (Array.isArray(result) && result.length === 0)) return alert("Tabela vazia.");

            const dataToExport = Array.isArray(result) ? result : [result];
            const firstItem = dataToExport[0];
            const keys = typeof firstItem === 'object' ? Object.keys(firstItem) : ['value'];

            const csvContent = [
                keys.join(','),
                ...dataToExport.map(row => keys.map(k => {
                    let val = typeof row === 'object' ? row[k] : row;
                    return `"${String(val || '').replace(/"/g, '""')}"`;
                }).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${storeName}_gdrive_backup.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };
    }

    // Registro no barramento global
    window.IGTools.Settings = {
        abrirModalConfiguracoes,
        abrirModalIdioma,
        abrirModalParametros
    };

    // Aliases diretos para retrocompatibilidade
    window.abrirModalConfiguracoes = abrirModalConfiguracoes;
    window.abrirModalIdioma = abrirModalIdioma;
    window.abrirModalParametros = abrirModalParametros;

})();
