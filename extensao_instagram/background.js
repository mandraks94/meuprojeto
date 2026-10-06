// IG Tools Pro - Background Service Worker (Manifest V3)
// Gerencia requisições cross-origin e monitoramento periódico de unfollowers em segundo plano.

const ALARM_NAME = 'IG_TOOLS_CHECK_UNFOLLOWERS';
const DEFAULT_INTERVAL_MINUTES = 15; // EXATOS 15 MINUTOS AUTOMÁTICOS
const IG_APP_ID = '936619743392459';

// Inicialização ao instalar/atualizar
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[IG Tools Background] Extensão instalada/atualizada:', details.reason);
    setupUnfollowerAlarm(15);

    // Realiza a primeira captura da Lista Base após 3 segundos automaticamente
    setTimeout(() => {
        console.log('[IG Tools Background] Capturando Lista Base inicial de seguidores...');
        checkUnfollowersInBackground();
    }, 3000);
});

// Inicialização ao ligar o navegador
chrome.runtime.onStartup.addListener(() => {
    console.log('[IG Tools Background] Navegador iniciado. Ativando monitor de 15 minutos...');
    setupUnfollowerAlarm(15);
});

// Configuração do Alarme em Segundo Plano (Intervalo dinâmico configurável)
async function setupUnfollowerAlarm(customInterval = null) {
    try {
        const stored = await chrome.storage.local.get(['ig_tools_settings']);
        const savedInterval = stored?.ig_tools_settings?.backgroundMonitorInterval;
        const interval = customInterval || savedInterval || DEFAULT_INTERVAL_MINUTES;
        const validInterval = Math.max(1, parseInt(interval, 10) || 15);

        chrome.alarms.clear(ALARM_NAME, () => {
            chrome.alarms.create(ALARM_NAME, {
                delayInMinutes: 1, // Primeira checagem 1 minuto após ligar
                periodInMinutes: validInterval // Repete no intervalo configurado pelo usuário
            });
            console.log(`[IG Tools Background] Monitor 100% automático ATIVO: checagem a cada ${validInterval} minutos.`);
        });
    } catch (err) {
        console.error('[IG Tools Background] Erro ao configurar alarme:', err);
    }
}

// Inicializa alarme dinâmico
setupUnfollowerAlarm();

// Listener do Alarme Periódico
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        console.log('[IG Tools Background] Alarme disparado. Validando contagem de seguidores...');
        await checkUnfollowersInBackground();
    }
});

// Listener de Clique na Notificação Desktop
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('[IG Tools Background] Usuário clicou na notificação:', notificationId);
    chrome.notifications.clear(notificationId);
    
    // Abre ou foca a aba do Instagram e já abre o menu "Não Segue de Volta"
    chrome.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
            chrome.tabs.sendMessage(tabs[0].id, { type: 'IG_POPUP_OPEN_MODAL', modal: 'notFollowingBack' });
        } else {
            chrome.tabs.create({ url: 'https://www.instagram.com/' });
        }
    });

    // Limpa o badge do ícone
    chrome.action.setBadgeText({ text: '' });
});

// Função principal de verificação: VALIDA APENAS O NÚMERO DE SEGUIDORES
async function checkUnfollowersInBackground() {
    try {
        // 1. Obter cookies de autenticação do Instagram
        let cookies = await chrome.cookies.getAll({ url: 'https://www.instagram.com' });
        if (!cookies || cookies.length === 0) {
            cookies = await chrome.cookies.getAll({ domain: '.instagram.com' });
        }
        if (!cookies || cookies.length === 0) {
            cookies = await chrome.cookies.getAll({ domain: 'instagram.com' });
        }

        const dsUserIdCookie = cookies.find(c => c.name === 'ds_user_id');
        const sessionCookie = cookies.find(c => c.name === 'sessionid');
        const csrfCookie = cookies.find(c => c.name === 'csrftoken');

        if (!dsUserIdCookie || !sessionCookie) {
            console.log('[IG Tools Background] Nenhuma sessão ativa do Instagram encontrada nos cookies. Aguardando login...');
            return;
        }

        const userId = dsUserIdCookie.value;
        const csrfToken = csrfCookie ? csrfCookie.value : '';

        console.log(`[IG Tools Background] Monitor Pro Ativo para UID: ${userId}. Validando número de seguidores...`);

        let currentCount = null;

        // 2. Método 1: Busca ultrarrápida Same-Origin através de aba aberta no Instagram
        try {
            const igTabs = await chrome.tabs.query({ url: '*://*.instagram.com/*' });
            if (igTabs && igTabs.length > 0) {
                const tabResponse = await new Promise((resolve) => {
                    chrome.tabs.sendMessage(igTabs[0].id, {
                        type: 'IG_TOOLS_GET_FOLLOWERS_COUNT',
                        userId: userId
                    }, (res) => {
                        if (chrome.runtime.lastError || !res) {
                            resolve(null);
                        } else {
                            resolve(res);
                        }
                    });
                });

                if (tabResponse && tabResponse.success && typeof tabResponse.count === 'number') {
                    currentCount = tabResponse.count;
                    console.log(`[IG Tools Background] Contagem obtida via aba ativa: ${currentCount} seguidores.`);
                }
            }
        } catch (tabErr) {
            console.warn('[IG Tools Background] Falha na consulta via aba:', tabErr);
        }

        // 3. Método 2: Fallback direto via API oficial do usuário se não houver aba aberta
        if (currentCount === null) {
            try {
                const response = await fetch(`https://www.instagram.com/api/v1/users/${userId}/info/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'X-IG-App-ID': IG_APP_ID,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const text = await response.text();
                    if (!text.trim().startsWith('<')) {
                        const data = JSON.parse(text);
                        const num = data?.user?.follower_count ?? data?.data?.user?.edge_followed_by?.count;
                        if (typeof num === 'number') {
                            currentCount = num;
                            console.log(`[IG Tools Background] Contagem obtida via API direta: ${currentCount} seguidores.`);
                        }
                    }
                }
            } catch (fetchErr) {
                console.warn('[IG Tools Background] Erro na consulta de contagem via API direta:', fetchErr);
            }
        }

        if (currentCount === null) {
            console.log('[IG Tools Background] Não foi possível obter o número de seguidores neste ciclo.');
            return;
        }

        const nowIso = new Date().toISOString();

        // 4. Comparação da contagem de seguidores com o valor anterior salvo
        const stored = await chrome.storage.local.get(['ig_tools_followers_count', 'ig_tools_alerts']);
        const previousCount = stored.ig_tools_followers_count;

        // Se for a primeira execução, apenas salva o número de referência inicial
        if (typeof previousCount !== 'number') {
            console.log(`[IG Tools Background] Primeira execução: número de seguidores salvo como referência inicial: ${currentCount}`);
            await chrome.storage.local.set({
                ig_tools_followers_count: currentCount,
                ig_tools_last_check: nowIso
            });
            return;
        }

        console.log(`[IG Tools Background] Comparando: Anterior = ${previousCount} | Atual = ${currentCount}`);

        // 5. Se o número de seguidores DIMINUIU: Dispara o Alerta!
        if (currentCount < previousCount) {
            const lost = previousCount - currentCount;
            console.log(`[IG Tools Background] 🚨 Unfollow detectado! Perda de ${lost} seguidor(es) (${previousCount} ➔ ${currentCount}).`);

            const alertMsg = 'Alguem deixou de seguir, entra no menu não segue de volta para descobrir.';

            // Salva na Central de Alertas
            const storedAlerts = stored.ig_tools_alerts || [];
            const newAlert = {
                id: 'alert_' + Date.now(),
                type: 'unfollow',
                title: 'Alerta de Unfollow',
                message: alertMsg,
                detail: `Contagem caiu de ${previousCount} para ${currentCount} (-${lost} seguidor${lost > 1 ? 'es' : ''})`,
                previousCount: previousCount,
                currentCount: currentCount,
                date: nowIso,
                read: false
            };

            const updatedAlerts = [newAlert, ...storedAlerts].slice(0, 100);
            const unreadCount = updatedAlerts.filter(a => !a.read).length;

            await chrome.storage.local.set({
                ig_tools_followers_count: currentCount,
                ig_tools_alerts: updatedAlerts,
                ig_tools_last_check: nowIso
            });

            // Atualiza o Badge do ícone da extensão (+N)
            chrome.action.setBadgeText({ text: unreadCount > 0 ? String(unreadCount) : '' });
            chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });

            // 1. Dispara Pop-up Visual diretamente na tela do Instagram
            chrome.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
                tabs?.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'IG_SHOW_UNFOLLOW_POPUP',
                        title: 'Alerta de Unfollow',
                        message: alertMsg,
                        detail: `Contagem caiu de ${previousCount} para ${currentCount} (-${drop} seguidor${drop > 1 ? 'es' : ''})`
                    }).catch(() => {});
                });
            });

            // 2. Dispara Notificação Nativa do Windows/Chrome Desktop
            try {
                chrome.notifications.create('ig_tools_unfollow_' + Date.now(), {
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: '⚠️ Instagram Tools - Alerta de Unfollow',
                    message: alertMsg,
                    contextMessage: `De ${previousCount} para ${currentCount} seguidores`,
                    priority: 2
                }, (notifId) => {
                    if (chrome.runtime.lastError) {
                        console.warn('[IG Tools Background] Aviso na notificação desktop:', chrome.runtime.lastError.message);
                    } else {
                        console.log('[IG Tools Background] Notificação Desktop exibida:', notifId);
                    }
                });
            } catch (nErr) {
                console.warn('[IG Tools Background] Falha ao criar notificação nativa:', nErr);
            }

        } else if (currentCount > previousCount) {
            // A conta ganhou seguidores! Atualiza a referência sem disparar alerta
            const gained = currentCount - previousCount;
            console.log(`[IG Tools Background] 🎉 Novos seguidores! Ganhou +${gained} (${previousCount} ➔ ${currentCount}). Referência atualizada.`);
            await chrome.storage.local.set({
                ig_tools_followers_count: currentCount,
                ig_tools_last_check: nowIso
            });
        } else {
            // Número idêntico e estável
            console.log(`[IG Tools Background] ✅ Contagem estável: ${currentCount} seguidores. Nenhum unfollow.`);
            await chrome.storage.local.set({
                ig_tools_last_check: nowIso
            });
        }
    } catch (err) {
        console.error('[IG Tools Background] Erro ao verificar contagem de seguidores:', err);
    }
}

// Listener de Mensagens da Extensão
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;

    // 1. Proxy HTTP Cross-Origin legado
    if (message.type === 'IG_TOOLS_HTTP_REQUEST') {
        const { options } = message;
        const method = (options.method || 'GET').toUpperCase();
        const headers = options.headers || {};
        
        const fetchOptions = {
            method: method,
            headers: headers
        };

        if (options.data && method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = options.data;
        }

        fetch(options.url, fetchOptions)
            .then(async (response) => {
                const text = await response.text();
                sendResponse({
                    success: true,
                    status: response.status,
                    statusText: response.statusText,
                    responseText: text,
                    headers: Object.fromEntries(response.headers.entries())
                });
            })
            .catch((error) => {
                console.error('[IG Tools Background] Erro no fetch:', error);
                sendResponse({
                    success: false,
                    error: error.message || error.toString(),
                    status: 0,
                    responseText: ''
                });
            });

        return true;
    }

    // 2. Sincronização da lista de seguidores vinda da aba aberta no Instagram
    if (message.type === 'IG_TOOLS_SYNC_FOLLOWERS_BASELINE') {
        const { followers } = message;
        if (Array.isArray(followers) && followers.length > 0) {
            chrome.storage.local.set({
                ig_tools_followers_baseline: followers,
                ig_tools_last_check: new Date().toISOString()
            }, () => {
                console.log(`[IG Tools Background] Baseline sincronizado via página: ${followers.length} seguidores.`);
                sendResponse({ success: true, count: followers.length });
            });
        } else {
            sendResponse({ success: false, error: 'Lista inválida' });
        }
        return true;
    }

    // 3. Forçar checagem imediata agora
    if (message.type === 'IG_TOOLS_CHECK_NOW') {
        checkUnfollowersInBackground().then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    // 4. Obter status do monitor
    if (message.type === 'IG_TOOLS_GET_MONITOR_STATUS') {
        chrome.storage.local.get([
            'ig_tools_followers_baseline',
            'ig_tools_unfollow_history',
            'ig_tools_last_check',
            'ig_tools_settings'
        ], (stored) => {
            sendResponse({
                success: true,
                baselineCount: (stored.ig_tools_followers_baseline || []).length,
                unfollowHistoryCount: (stored.ig_tools_unfollow_history || []).length,
                lastCheck: stored.ig_tools_last_check || null,
                settings: stored.ig_tools_settings || {}
            });
        });
        return true;
    }

    // 5. Atualizar configurações do monitor
    if (message.type === 'IG_TOOLS_UPDATE_SETTINGS') {
        const { settings } = message;
        chrome.storage.local.get(['ig_tools_settings'], (stored) => {
            const current = stored.ig_tools_settings || {};
            const updated = { ...current, ...settings };
            chrome.storage.local.set({ ig_tools_settings: updated }, () => {
                setupUnfollowerAlarm(updated.backgroundMonitorInterval);
                sendResponse({ success: true, settings: updated });
            });
        });
        return true;
    }

    // 6. Teste de notificação sob demanda
    if (message.type === 'IG_TOOLS_TEST_NOTIFICATION') {
        const nowIso = new Date().toISOString();
        const alertMsg = 'Alguem deixou de seguir, entra no menu não segue de volta para descobrir.';

        chrome.storage.local.get(['ig_tools_alerts'], (stored) => {
            const list = stored.ig_tools_alerts || [];
            const newAlert = {
                id: 'alert_' + Date.now(),
                type: 'unfollow',
                title: 'Alerta de Unfollow',
                message: alertMsg,
                detail: 'Modo Teste do Monitor Pro Ativo',
                date: nowIso,
                read: false
            };
            const updated = [newAlert, ...list].slice(0, 100);
            const unreadCount = updated.filter(a => !a.read).length;

            chrome.storage.local.set({ ig_tools_alerts: updated }, () => {
                chrome.action.setBadgeText({ text: String(unreadCount) });
                chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
            });
        });

        // 1. Envia Pop-up flutuante para as abas abertas do Instagram
        chrome.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
            tabs?.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'IG_SHOW_UNFOLLOW_POPUP',
                    title: 'Alerta de Unfollow (Teste)',
                    message: alertMsg,
                    detail: 'Modo Teste do Monitor Pro Ativo'
                }).catch(() => {});
            });
        });

        // 2. Dispara notificação nativa do Windows/Desktop
        try {
            chrome.notifications.create('ig_tools_test_' + Date.now(), {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                title: '⚠️ Instagram Tools - Alerta de Unfollow',
                message: alertMsg,
                contextMessage: 'Clique para abrir o menu Não Segue de Volta (Modo Teste)',
                priority: 2
            }, (notifId) => {
                if (chrome.runtime.lastError) {
                    console.warn('[IG Tools Background] Aviso na notificação desktop de teste:', chrome.runtime.lastError.message);
                } else {
                    console.log('[IG Tools Background] Notificação de teste desktop criada:', notifId);
                }
            });
        } catch (e) {
            console.warn('[IG Tools Background] Erro ao criar notificação de teste:', e);
        }

        sendResponse({ success: true, message: 'Notificação de teste disparada com sucesso!' });
        return true;
    }

    // 7. Limpar alertas ou marcar como lidos
    if (message.type === 'IG_TOOLS_CLEAR_ALERTS') {
        chrome.storage.local.set({ ig_tools_alerts: [] }, () => {
            chrome.action.setBadgeText({ text: '' });
            sendResponse({ success: true });
        });
        return true;
    }

    if (message.type === 'IG_TOOLS_MARK_ALERTS_READ') {
        chrome.storage.local.get(['ig_tools_alerts'], (stored) => {
            const list = stored.ig_tools_alerts || [];
            const updated = list.map(a => ({ ...a, read: true }));
            chrome.storage.local.set({ ig_tools_alerts: updated }, () => {
                chrome.action.setBadgeText({ text: '' });
                sendResponse({ success: true });
            });
        });
        return true;
    }
});
