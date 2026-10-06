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

        // Badge da Central de Alertas
        const alerts = stored.ig_tools_alerts || [];
        const unreadAlerts = alerts.filter(a => !a.read).length;
        const badgeAlerts = document.getElementById('badgeAlertsCount');
        if (badgeAlerts) {
            if (unreadAlerts > 0) {
                badgeAlerts.textContent = unreadAlerts > 99 ? '99+' : unreadAlerts;
                badgeAlerts.style.display = 'flex';
            } else {
                badgeAlerts.style.display = 'none';
            }
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

    // 10. Parâmetros (Abre o Sheet de Parâmetros do Monitor Pro)
    const paramsSheet = document.getElementById('paramsSheet');
    const customIntervalInput = document.getElementById('customIntervalInput');
    const intervalPills = document.querySelectorAll('.interval-pill');

    document.getElementById('appParams')?.addEventListener('click', () => {
        openParamsSheet();
    });

    document.getElementById('btnCloseParamsSheet')?.addEventListener('click', () => {
        paramsSheet?.classList.remove('open');
    });

    async function openParamsSheet() {
        if (!paramsSheet) return;
        paramsSheet.classList.add('open');

        try {
            const stored = await chrome.storage.local.get([
                'ig_tools_settings',
                'ig_tools_followers_count',
                'ig_tools_last_check'
            ]);

            const currentInterval = stored?.ig_tools_settings?.backgroundMonitorInterval || 15;
            const currentFollowers = stored?.ig_tools_followers_count;
            const lastCheck = stored?.ig_tools_last_check;

            // Atualiza inputs e displays
            if (customIntervalInput) {
                customIntervalInput.value = currentInterval;
            }

            selectIntervalPill(currentInterval);

            const displayCount = document.getElementById('paramsFollowersCountDisplay');
            if (displayCount) {
                displayCount.textContent = (typeof currentFollowers === 'number') 
                    ? currentFollowers.toLocaleString('pt-BR') 
                    : 'Aguardando...';
            }

            const displayInterval = document.getElementById('paramsActiveIntervalDisplay');
            if (displayInterval) {
                displayInterval.textContent = `${currentInterval} min`;
            }

            const displayLastCheck = document.getElementById('paramsLastCheckTime');
            if (displayLastCheck) {
                displayLastCheck.textContent = lastCheck ? `Última: ${formatRelativeTime(lastCheck)}` : 'Verificando...';
            }
        } catch (e) {
            console.warn('[IG Tools Popup] Erro ao carregar parâmetros:', e);
        }
    }

    function selectIntervalPill(value) {
        intervalPills.forEach(pill => {
            const val = parseInt(pill.getAttribute('data-interval'), 10);
            if (val === parseInt(value, 10)) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
    }

    // Clique nos pills rápidos
    intervalPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const val = parseInt(pill.getAttribute('data-interval'), 10);
            selectIntervalPill(val);
            if (customIntervalInput) customIntervalInput.value = val;
        });
    });

    // Input customizado
    customIntervalInput?.addEventListener('input', () => {
        const val = parseInt(customIntervalInput.value, 10);
        selectIntervalPill(val);
    });

    // Salvar Parâmetros
    document.getElementById('btnSaveParams')?.addEventListener('click', () => {
        const newInterval = Math.max(1, parseInt(customIntervalInput?.value, 10) || 15);
        showIosBanner(`Intervalo salvo: a cada ${newInterval} min! ⏱️`);

        chrome.runtime.sendMessage({
            type: 'IG_TOOLS_UPDATE_SETTINGS',
            settings: { backgroundMonitorInterval: newInterval }
        }, () => {
            const displayInterval = document.getElementById('paramsActiveIntervalDisplay');
            if (displayInterval) displayInterval.textContent = `${newInterval} min`;
            setTimeout(() => {
                paramsSheet?.classList.remove('open');
            }, 600);
        });
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
        showIosBanner("Verificando Seguidores Agora ⚡...");
        chrome.runtime.sendMessage({ type: 'IG_TOOLS_CHECK_NOW' }, (res) => {
            console.log("[IG Tools Popup] Checagem manual disparada:", res);
        });
        await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'notFollowingBack' });
    });

    // 13. Central de Alertas (Abre a Notification Sheet)
    const alertsSheet = document.getElementById('alertsSheet');
    const alertsBody = document.getElementById('alertsBody');

    document.getElementById('appAlertsCenter')?.addEventListener('click', () => {
        openAlertsCenter();
    });

    document.getElementById('btnCloseAlertsSheet')?.addEventListener('click', () => {
        alertsSheet?.classList.remove('open');
    });

    document.getElementById('btnClearAllAlerts')?.addEventListener('click', async () => {
        chrome.runtime.sendMessage({ type: 'IG_TOOLS_CLEAR_ALERTS' }, () => {
            renderAlertsList([]);
            const badgeAlerts = document.getElementById('badgeAlertsCount');
            if (badgeAlerts) badgeAlerts.style.display = 'none';
            showIosBanner("Central de Alertas Limpa! 🧹");
        });
    });

    document.getElementById('btnTestAlert')?.addEventListener('click', async () => {
        showIosBanner("🚨 Disparando Notificação de Teste...");
        
        // 1. Pop-up visual na tela do Instagram
        sendToActiveInstagramTab({
            type: 'IG_SHOW_UNFOLLOW_POPUP',
            title: 'Alerta de Unfollow (Teste)',
            message: 'Alguem deixou de seguir, entra no menu não segue de volta para descobrir.'
        });

        // 2. Pop-up nativo do Chrome / Windows Desktop
        try {
            chrome.notifications.create('popup_test_' + Date.now(), {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                title: '⚠️ Instagram Tools - Alerta de Unfollow',
                message: 'Alguem deixou de seguir, entra no menu não segue de volta para descobrir.',
                priority: 2
            }, (id) => {
                if (chrome.runtime.lastError) {
                    console.warn('[Popup] Erro na notificação Chrome:', chrome.runtime.lastError.message);
                } else {
                    console.log('[Popup] Notificação nativa criada:', id);
                }
            });
        } catch (e) {
            console.warn('[Popup] Erro ao disparar notificação:', e);
        }

        // 3. Salva na Central de Alertas e atualiza badge
        chrome.runtime.sendMessage({ type: 'IG_TOOLS_TEST_NOTIFICATION', username: 'usuario_teste' }, async () => {
            setTimeout(async () => {
                const stored = await chrome.storage.local.get(['ig_tools_alerts']);
                renderAlertsList(stored.ig_tools_alerts || []);
            }, 300);
        });
    });

    async function openAlertsCenter() {
        if (!alertsSheet) return;
        alertsSheet.classList.add('open');

        const stored = await chrome.storage.local.get(['ig_tools_alerts']);
        const alerts = stored.ig_tools_alerts || [];
        renderAlertsList(alerts);

        // Marca todos como lidos e zera o badge vermelho
        chrome.runtime.sendMessage({ type: 'IG_TOOLS_MARK_ALERTS_READ' }, () => {
            const badgeAlerts = document.getElementById('badgeAlertsCount');
            if (badgeAlerts) badgeAlerts.style.display = 'none';
        });
    }

    function renderAlertsList(alerts) {
        if (!alertsBody) return;
        if (!alerts || alerts.length === 0) {
            alertsBody.innerHTML = `
                <div class="alerts-empty">
                    <span class="alerts-empty-icon">🔔</span>
                    <h3>Nenhum Alerta Salvo</h3>
                    <p>Quando alguém deixar de te seguir ou houver notificações, os avisos ficarão guardados aqui.</p>
                </div>
            `;
            return;
        }

        alertsBody.innerHTML = '';
        alerts.forEach((alert) => {
            const card = document.createElement('div');
            card.className = `alert-card ${alert.read ? '' : 'unread'}`;
            card.id = `card_${alert.id}`;

            const timeStr = formatRelativeTime(alert.date);
            const isUnfollow = alert.type === 'unfollow';

            card.innerHTML = `
                <div class="alert-card-header">
                    <div class="alert-card-type">
                        <span>${isUnfollow ? '💔' : '🔔'}</span>
                        <span>${escapeHtml(alert.title || 'Alerta')}</span>
                    </div>
                    <span class="alert-card-time">${timeStr}</span>
                </div>
                <div class="alert-card-msg">${escapeHtml(alert.message || '')}</div>
                ${alert.detail ? `<div class="alert-card-detail" style="font-size:10.5px;color:rgba(255,255,255,0.6);margin-top:2px;">${escapeHtml(alert.detail)}</div>` : ''}
                <div class="alert-card-footer">
                    <button class="btn-alert-link btn-alert-goto-unfollow" title="Descobrir quem não te segue">💔 Não Segue de Volta</button>
                    <button class="btn-alert-delete" data-id="${escapeHtml(alert.id)}" title="Excluir este alerta">🗑️</button>
                </div>
            `;
            alertsBody.appendChild(card);
        });

        // Listeners para botões dentro dos cards
        alertsBody.querySelectorAll('.btn-alert-goto-unfollow').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                showIosBanner("Abrindo 'Não Segue de Volta' 💔");
                await sendToActiveInstagramTab({ type: 'IG_POPUP_OPEN_MODAL', modal: 'notFollowingBack' });
            };
        });

        alertsBody.querySelectorAll('.btn-alert-delete').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const alertId = btn.getAttribute('data-id');
                const stored = await chrome.storage.local.get(['ig_tools_alerts']);
                const currentAlerts = (stored.ig_tools_alerts || []).filter(a => a.id !== alertId);
                await chrome.storage.local.set({ ig_tools_alerts: currentAlerts });
                renderAlertsList(currentAlerts);
            };
        });
    }

    function formatRelativeTime(isoString) {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffSeconds = Math.floor((now - date) / 1000);
            if (diffSeconds < 60) return 'Agora';
            if (diffSeconds < 3600) return `Há ${Math.floor(diffSeconds / 60)} min`;
            if (diffSeconds < 86400) {
                const hours = date.getHours().toString().padStart(2, '0');
                const mins = date.getMinutes().toString().padStart(2, '0');
                return `Hoje às ${hours}:${mins}`;
            }
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } catch (_) {
            return '';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }

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

    // Dynamic Island Click Fun & Teste Rápido de Notificação
    document.getElementById('dynamicIsland')?.addEventListener('click', () => {
        showIosBanner("✨ IG Tools Pro v1.1.0 • iPhone 18 OS");
    });

    document.getElementById('dynamicIsland')?.addEventListener('dblclick', () => {
        showIosBanner("🚨 Disparando Alerta de Teste...");
        sendToActiveInstagramTab({
            type: 'IG_SHOW_UNFOLLOW_POPUP',
            title: 'Alerta de Unfollow (Teste)',
            message: 'Alguem deixou de seguir, entra no menu não segue de volta para descobrir.'
        });
        chrome.runtime.sendMessage({ type: 'IG_TOOLS_TEST_NOTIFICATION', username: 'usuario_teste' }, () => {
            const badgeAlerts = document.getElementById('badgeAlertsCount');
            if (badgeAlerts) {
                badgeAlerts.textContent = '1';
                badgeAlerts.style.display = 'flex';
            }
        });
    });

    async function saveCurrentSettings() {
        try {
            await chrome.storage.local.set({
                instagramToolsSettings_v2: currentSettings
            });
        } catch (_) {}
    }
});
