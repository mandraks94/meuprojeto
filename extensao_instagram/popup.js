// IG Tools Pro - iPhone 18 Popup Controller

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Relógio iOS em Tempo Real
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeEl = document.getElementById('iosTime');
        if (timeEl) timeEl.textContent = `${hours}:${minutes}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // 2. Banner / Toast no iPhone
    let bannerTimeout = null;
    function showIosBanner(text) {
        const banner = document.getElementById('iosBanner');
        const bannerText = document.getElementById('iosBannerText');
        if (!banner || !bannerText) return;
        bannerText.textContent = text;
        banner.classList.add('show');
        clearTimeout(bannerTimeout);
        bannerTimeout = setTimeout(() => {
            banner.classList.remove('show');
        }, 2200);
    }

    // 3. Helper para enviar comandos para a aba ativa do Instagram
    async function sendToActiveInstagramTab(message) {
        try {
            console.log("[IG Tools Popup] Enviando comando:", message);
            const allTabs = await chrome.tabs.query({});
            const igTabs = allTabs.filter(t => t.url && (t.url.includes('instagram.com') || t.url.includes('www.instagram.com')));

            if (igTabs.length === 0) {
                console.warn("[IG Tools Popup] Nenhuma aba do Instagram encontrada.");
                showIosBanner("Abra o Instagram primeiro!");
                return false;
            }

            // Seleciona a aba ativa ou a primeira do Instagram
            let targetTab = igTabs.find(t => t.active) || igTabs[0];

            console.log("[IG Tools Popup] Aba alvo identificada:", targetTab.id, targetTab.url);

            // Garante foco na aba e na janela do Instagram
            try {
                await chrome.tabs.update(targetTab.id, { active: true });
                if (targetTab.windowId) {
                    await chrome.windows.update(targetTab.windowId, { focused: true });
                }
            } catch (_) {}

            // 1. Envia via bridge.js (sendMessage)
            chrome.tabs.sendMessage(targetTab.id, message, () => {
                const err = chrome.runtime.lastError;
                if (err) console.log("[IG Tools Popup] Aviso ao enviar via bridge:", err.message);
            });

            // 2. Executa diretamente no contexto MAIN da página via scripting (Infalível e Imediato)
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: targetTab.id },
                    world: 'MAIN',
                    func: (cmd) => {
                        console.log("[IG Tools Direct] Executando comando recebido:", cmd);
                        if (cmd.type === 'IG_POPUP_TOGGLE' && cmd.setting) {
                            if (cmd.setting === 'darkMode' && typeof toggleDarkMode === 'function') toggleDarkMode(cmd.value);
                            if (cmd.setting === 'rgbBorder' && typeof toggleRgbBorder === 'function') toggleRgbBorder(cmd.value);
                            if (cmd.setting === 'anonymousStories' && typeof toggleAnonymousStories === 'function') toggleAnonymousStories(cmd.value);
                            if (cmd.setting === 'useApi' && typeof toggleUseApi === 'function') toggleUseApi(cmd.value);
                            if (cmd.setting === 'validateProfileStatus') {
                                if (typeof saveSettings === 'function') saveSettings({ validateProfileStatus: cmd.value });
                                if (cmd.value && typeof validateCurrentPagePrivacy === 'function') validateCurrentPagePrivacy();
                                else {
                                    document.querySelectorAll('.ig-privacy-badge').forEach(b => b.remove());
                                    document.querySelectorAll('[data-privacy-processed]').forEach(el => el.removeAttribute('data-privacy-processed'));
                                }
                            }
                            if (typeof saveSettings === 'function') saveSettings({ [cmd.setting]: cmd.value });
                        }

                        if (cmd.type === 'IG_POPUP_OPEN_MODAL' && cmd.modal) {
                            document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                            ['settingsModal', 'manageCategoriesModal', 'shortcutsModal', 'paramsModal', 'langModal', 'naoSegueDeVoltaDiv', 'closeFriendsModal', 'hideStoryModal'].forEach(id => {
                                document.getElementById(id)?.remove();
                            });

                            if (typeof injectMenu === 'function') injectMenu();
                            const modals = window.__igToolsModals || {};

                            if (cmd.modal === 'settings') {
                                if (modals.openSettings) modals.openSettings();
                                else if (typeof abrirModalConfiguracoes === 'function') abrirModalConfiguracoes();
                            } else if (cmd.modal === 'voice') {
                                if (modals.openVoice) modals.openVoice();
                                else if (typeof abrirModalComandosVoz === 'function') abrirModalComandosVoz();
                            } else if (cmd.modal === 'categories') {
                                if (modals.openCategories) modals.openCategories();
                                else if (typeof abrirModalGerenciarCategorias === 'function') abrirModalGerenciarCategorias();
                            } else if (cmd.modal === 'shortcuts') {
                                if (modals.openShortcuts) modals.openShortcuts();
                                else if (typeof abrirModalAtalhos === 'function') abrirModalAtalhos();
                            } else if (cmd.modal === 'parameters') {
                                if (modals.openParameters) modals.openParameters();
                                else if (typeof abrirModalParametros === 'function') abrirModalParametros();
                            } else if (cmd.modal === 'language') {
                                if (modals.openLanguage) modals.openLanguage();
                                else if (typeof abrirModalIdioma === 'function') abrirModalIdioma();
                            } else if (cmd.modal === 'notFollowingBack') {
                                if (modals.openNotFollowingBack) modals.openNotFollowingBack('tabNaoSegueDeVolta');
                                else if (typeof iniciarProcessoNaoSegueDeVolta === 'function') iniciarProcessoNaoSegueDeVolta('tabNaoSegueDeVolta');
                            } else if (cmd.modal === 'unfollowHistory') {
                                if (modals.openNotFollowingBack) modals.openNotFollowingBack('tabHistorico');
                                else if (typeof iniciarProcessoNaoSegueDeVolta === 'function') iniciarProcessoNaoSegueDeVolta('tabHistorico');
                            } else if (cmd.modal === 'closeFriends') {
                                if (modals.openCloseFriends) modals.openCloseFriends();
                                else if (typeof abrirModalAmigosProximos === 'function') abrirModalAmigosProximos();
                            }
                        }

                        // Também envia postMessage no DOM por redundância
                        window.postMessage({
                            source: 'IG_TOOLS_BRIDGE',
                            action: cmd.type,
                            payload: cmd
                        }, '*');
                    },
                    args: [message]
                });
                console.log("[IG Tools Popup] Comando acionado com sucesso no contexto da página!");
            } catch (errExec) {
                console.warn("[IG Tools Popup] Erro no scripting direto (usando bridge):", errExec);
            }

            return true;
        } catch (e) {
            console.error("[IG Tools Popup] Erro ao comunicar com a aba:", e);
            showIosBanner("Erro de conexão!");
            return false;
        }
    }

    // 4. Carregar configurações salvas
    const defaults = {
        darkMode: true,
        rgbBorder: true,
        anonymousStories: false,
        useApi: true,
        validateProfileStatus: true,
        language: 'pt-BR'
    };

    let currentSettings = { ...defaults };

    try {
        const stored = await chrome.storage.local.get([
            'instagramToolsSettings_v2',
            'ig_tools_settings',
            'ig_tools_unfollow_history',
            'ig_tools_gdrive_token',
            'ig_tools_gdrive_token_timestamp',
            'ig_tools_gdrive_expires_in'
        ]);

        if (stored.instagramToolsSettings_v2) {
            currentSettings = { ...defaults, ...stored.instagramToolsSettings_v2 };
        }

        // Status do Google Drive
        const gdriveToken = stored.ig_tools_gdrive_token;
        const gdriveTime = Number(stored.ig_tools_gdrive_token_timestamp) || 0;
        const gdriveExpires = Number(stored.ig_tools_gdrive_expires_in) || 3600;
        const isDriveConnected = gdriveToken && (Date.now() - gdriveTime < (gdriveExpires - 60) * 1000);

        updateDriveUI(isDriveConnected);

        // Badge de Unfollows
        const history = stored.ig_tools_unfollow_history || [];
        const unreadCount = history.filter(u => u.detectedInBackground).length;
        const badgeCount = document.getElementById('badgeUnfollowCount');
        if (badgeCount && unreadCount > 0) {
            badgeCount.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badgeCount.style.display = 'flex';
        }

    } catch (e) {
        console.warn("[IG Tools Popup] Erro ao ler storage:", e);
    }

    // 5. Atualizar Indicadores Visuais (Toggles)
    function refreshTogglesUI() {
        setIndicator('indDarkMode', currentSettings.darkMode);
        setIndicator('indRgbBorder', currentSettings.rgbBorder);
        setIndicator('indAnonymousStories', currentSettings.anonymousStories);
        setIndicator('indUseApi', currentSettings.useApi);
        setIndicator('indValidateProfile', currentSettings.validateProfileStatus);
    }

    function setIndicator(id, isActive) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('active', !!isActive);
        }
    }

    function updateDriveUI(connected) {
        const pill = document.getElementById('drivePill');
        const pillText = document.getElementById('drivePillText');
        const badge = document.getElementById('badgeDrive');
        const dot = pill?.querySelector('.status-dot');

        if (connected) {
            if (dot) dot.classList.add('connected');
            if (pillText) pillText.textContent = 'Drive Conectado';
            if (badge) {
                badge.textContent = 'OK';
                badge.classList.add('connected');
            }
        } else {
            if (dot) dot.classList.remove('connected');
            if (pillText) pillText.textContent = 'Drive Off';
            if (badge) {
                badge.textContent = 'Conectar';
                badge.classList.remove('connected');
            }
        }
    }

    refreshTogglesUI();

    // 6. Manipuladores de Clique nos Apps / Toggles

    // Toggle: Modo Escuro
    document.getElementById('appDarkMode')?.addEventListener('click', async () => {
        currentSettings.darkMode = !currentSettings.darkMode;
        refreshTogglesUI();
        await saveCurrentSettings();
        sendToActiveInstagramTab({ type: 'IG_POPUP_TOGGLE', setting: 'darkMode', value: currentSettings.darkMode });
        showIosBanner(`Modo Escuro: ${currentSettings.darkMode ? 'Ligado' : 'Desligado'}`);
    });

    // Toggle: Borda RGB
    document.getElementById('appRgbBorder')?.addEventListener('click', async () => {
        currentSettings.rgbBorder = !currentSettings.rgbBorder;
        refreshTogglesUI();
        await saveCurrentSettings();
        sendToActiveInstagramTab({ type: 'IG_POPUP_TOGGLE', setting: 'rgbBorder', value: currentSettings.rgbBorder });
        showIosBanner(`Borda RGB: ${currentSettings.rgbBorder ? 'Ativada' : 'Desativada'}`);
    });

    // Toggle: Stories Anônimo
    document.getElementById('appAnonymousStories')?.addEventListener('click', async () => {
        currentSettings.anonymousStories = !currentSettings.anonymousStories;
        refreshTogglesUI();
        await saveCurrentSettings();
        sendToActiveInstagramTab({ type: 'IG_POPUP_TOGGLE', setting: 'anonymousStories', value: currentSettings.anonymousStories });
        showIosBanner(`Stealth Stories: ${currentSettings.anonymousStories ? 'Ativado 👻' : 'Desativado'}`);
    });

    // Toggle: Usar API
    document.getElementById('appUseApi')?.addEventListener('click', async () => {
        currentSettings.useApi = !currentSettings.useApi;
        refreshTogglesUI();
        await saveCurrentSettings();
        sendToActiveInstagramTab({ type: 'IG_POPUP_TOGGLE', setting: 'useApi', value: currentSettings.useApi });
        showIosBanner(`Turbo API: ${currentSettings.useApi ? 'Ativado ⚡' : 'Modo Humano'}`);
    });

    // Toggle: Validar Status P/A
    document.getElementById('appValidateProfile')?.addEventListener('click', async () => {
        currentSettings.validateProfileStatus = !currentSettings.validateProfileStatus;
        refreshTogglesUI();
        await saveCurrentSettings();
        sendToActiveInstagramTab({ type: 'IG_POPUP_TOGGLE', setting: 'validateProfileStatus', value: currentSettings.validateProfileStatus });
        showIosBanner(`Validador Status: ${currentSettings.validateProfileStatus ? 'ON' : 'OFF'}`);
    });

    // Google Drive
    document.getElementById('appGoogleDrive')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Ajustes do Google Drive...");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'settings' });
    });
    document.getElementById('drivePill')?.addEventListener('click', async () => {
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'settings' });
    });

    // Comandos de Voz
    document.getElementById('appVoice')?.addEventListener('click', async () => {
        showIosBanner("Iniciando Comandos de Voz 🎙️");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'voice' });
    });

    // Gerenciar Categorias
    document.getElementById('appCategories')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Categorias 📁");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'categories' });
    });

    // Atalhos
    document.getElementById('appShortcuts')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Atalhos ⌨️");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'shortcuts' });
    });

    // Parâmetros
    document.getElementById('appParams')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Parâmetros 🔧");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'parameters' });
    });

    // Idioma
    document.getElementById('appLanguage')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Seletor de Idioma 🌐");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'language' });
    });

    // Unfollow Monitor
    document.getElementById('appUnfollowMonitor')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Histórico de Unfollows 🔔");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'unfollowHistory' });
    });
    document.getElementById('widgetMonitor')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Monitor Pro 🛡️");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'unfollowHistory' });
    });

    // 7. Botões do Dock iOS
    document.getElementById('dockInstagram')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.instagram.com/' });
    });

    document.getElementById('dockUnfollow')?.addEventListener('click', async () => {
        showIosBanner("Iniciando 'Não Segue de Volta' 💔");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'notFollowingBack' });
    });

    document.getElementById('dockCloseFriends')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Amigos Próximos ⭐");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'closeFriends' });
    });

    document.getElementById('dockOpenSettingsModal')?.addEventListener('click', async () => {
        showIosBanner("Abrindo Menu Configurações ⚙️");
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'settings' });
    });

    // Dynamic Island Click Fun
    document.getElementById('dynamicIsland')?.addEventListener('click', () => {
        showIosBanner("✨ IG Tools Pro v1.1.0 • iPhone 18 OS");
    });

    async function saveCurrentSettings() {
        try {
            await chrome.storage.local.set({
                instagramToolsSettings_v2: currentSettings
            });
        } catch (_) {}
    }
});
