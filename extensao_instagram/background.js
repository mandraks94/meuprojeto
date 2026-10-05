// IG Tools Pro - Background Service Worker (Manifest V3)
// Gerencia requisições cross-origin e monitoramento periódico de unfollowers em segundo plano.

const ALARM_NAME = 'IG_TOOLS_CHECK_UNFOLLOWERS';
const DEFAULT_INTERVAL_MINUTES = 30;
const IG_APP_ID = '936619743392459';

// Inicialização ao instalar/atualizar
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[IG Tools Background] Extensão instalada/atualizada:', details.reason);
    setupUnfollowerAlarm();
});

// Inicialização ao ligar o navegador
chrome.runtime.onStartup.addListener(() => {
    console.log('[IG Tools Background] Navegador iniciado. Configurando monitor...');
    setupUnfollowerAlarm();
});

// Configuração do Alarme em Segundo Plano
async function setupUnfollowerAlarm(customInterval = null) {
    try {
        const stored = await chrome.storage.local.get(['ig_tools_settings']);
        const settings = stored.ig_tools_settings || {};
        const interval = customInterval || settings.backgroundMonitorInterval || DEFAULT_INTERVAL_MINUTES;
        const enabled = settings.backgroundMonitorEnabled !== false;

        chrome.alarms.clear(ALARM_NAME, () => {
            if (enabled) {
                chrome.alarms.create(ALARM_NAME, {
                    delayInMinutes: 1, // Primeira checagem 1 minuto após ligar
                    periodInMinutes: Math.max(15, Number(interval)) // Mínimo seguro de 15 minutos
                });
                console.log(`[IG Tools Background] Alarme agendado a cada ${interval} minutos.`);
            } else {
                console.log('[IG Tools Background] Monitor de segundo plano desativado nas configurações.');
            }
        });
    } catch (err) {
        console.error('[IG Tools Background] Erro ao configurar alarme:', err);
    }
}

// Listener do Alarme Periódico
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        console.log('[IG Tools Background] Alarme disparado. Verificando unfollowers em segundo plano...');
        await checkUnfollowersInBackground();
    }
});

// Listener de Clique na Notificação Desktop
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('[IG Tools Background] Usuário clicou na notificação:', notificationId);
    chrome.notifications.clear(notificationId);
    
    // Abre ou foca a aba do Instagram
    chrome.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            chrome.tabs.create({ url: 'https://www.instagram.com/' });
        }
    });

    // Limpa o badge do ícone
    chrome.action.setBadgeText({ text: '' });
});

// Função principal de verificação em segundo plano
async function checkUnfollowersInBackground() {
    try {
        // 1. Obter cookies de autenticação do Instagram
        const cookies = await chrome.cookies.getAll({ domain: '.instagram.com' });
        const dsUserIdCookie = cookies.find(c => c.name === 'ds_user_id');
        const sessionCookie = cookies.find(c => c.name === 'sessionid');
        const csrfCookie = cookies.find(c => c.name === 'csrftoken');

        if (!dsUserIdCookie || !sessionCookie) {
            console.log('[IG Tools Background] Nenhuma sessão ativa do Instagram encontrada. Abortando verificação.');
            return;
        }

        const userId = dsUserIdCookie.value;
        const csrfToken = csrfCookie ? csrfCookie.value : '';

        console.log(`[IG Tools Background] Sessão ativa detectada para UID: ${userId}. Coletando seguidores...`);

        // 2. Coletar a lista atual de seguidores via API interna do Instagram
        let currentFollowers = [];
        let nextMaxId = null;
        let hasMore = true;
        let pageCount = 0;
        const MAX_PAGES = 50; // Limite de proteção por ciclo

        while (hasMore && pageCount < MAX_PAGES) {
            pageCount++;
            let url = `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=100`;
            if (nextMaxId) {
                url += `&max_id=${encodeURIComponent(nextMaxId)}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'X-IG-App-ID': IG_APP_ID,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': '*/*'
                }
            });

            if (!response.ok) {
                console.warn(`[IG Tools Background] Falha na requisição da página ${pageCount}: status ${response.status}`);
                break;
            }

            const data = await response.json();
            const users = data.users || [];

            for (const u of users) {
                currentFollowers.push({
                    username: u.username,
                    id: String(u.pk || u.id || ''),
                    fullName: u.full_name || '',
                    photoUrl: u.profile_pic_url || ''
                });
            }

            nextMaxId = data.next_max_id;
            hasMore = !!nextMaxId;

            // Pausa respeitosa de 1.2 segundos entre páginas para evitar throttling
            if (hasMore) {
                await new Promise(r => setTimeout(r, 1200));
            }
        }

        if (currentFollowers.length === 0) {
            console.log('[IG Tools Background] Nenhum seguidor retornado ou erro temporário de conexão.');
            return;
        }

        console.log(`[IG Tools Background] Coletados ${currentFollowers.length} seguidores atuais.`);

        // 3. Comparar com o baseline anterior salvo
        const stored = await chrome.storage.local.get(['ig_tools_followers_baseline', 'ig_tools_unfollow_history']);
        const previousFollowers = stored.ig_tools_followers_baseline || [];

        // Se for a primeira execução, apenas salva o baseline inicial
        if (!previousFollowers || previousFollowers.length === 0) {
            console.log('[IG Tools Background] Primeiro scan. Definindo baseline de seguidores...');
            await chrome.storage.local.set({
                ig_tools_followers_baseline: currentFollowers,
                ig_tools_last_check: new Date().toISOString()
            });
            return;
        }

        // Criar mapa para busca rápida O(1)
        const currentSet = new Set(currentFollowers.map(u => (u.username || '').toLowerCase()));
        
        // Identificar quem estava na lista anterior e não está mais na atual
        const unfollowers = previousFollowers.filter(u => {
            const uname = (u.username || '').toLowerCase();
            return uname && !currentSet.has(uname);
        });

        const nowIso = new Date().toISOString();

        if (unfollowers.length > 0) {
            console.log(`[IG Tools Background] 🚨 ${unfollowers.length} novo(s) unfollow(s) detectado(s):`, unfollowers);

            // Atualiza o histórico de unfollows
            const history = stored.ig_tools_unfollow_history || [];
            const newEntries = unfollowers.map(u => ({
                username: u.username,
                id: u.id || '',
                photoUrl: u.photoUrl || null,
                unfollowDate: nowIso,
                detectedInBackground: true
            }));

            // Adiciona novos registros no topo sem duplicatas recentes
            const combinedHistory = [...newEntries, ...history].slice(0, 1000);

            await chrome.storage.local.set({
                ig_tools_followers_baseline: currentFollowers,
                ig_tools_unfollow_history: combinedHistory,
                ig_tools_last_check: nowIso,
                ig_tools_last_unfollowers: unfollowers
            });

            // Atualiza o Badge do ícone da extensão (+N)
            chrome.action.setBadgeText({ text: String(unfollowers.length) });
            chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });

            // Dispara Notificação Nativa do Sistema Operacional
            let notifMessage = '';
            if (unfollowers.length === 1) {
                notifMessage = `@${unfollowers[0].username} acabou de deixar de te seguir!`;
            } else if (unfollowers.length <= 3) {
                notifMessage = `${unfollowers.map(u => '@' + u.username).join(', ')} deixaram de te seguir!`;
            } else {
                notifMessage = `${unfollowers.length} pessoas deixaram de te seguir (incluindo @${unfollowers[0].username}, @${unfollowers[1].username}...)`;
            }

            chrome.notifications.create('ig_tools_unfollow_' + Date.now(), {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '⚠️ Instagram Tools - Alerta de Unfollow',
                message: notifMessage,
                contextMessage: 'Clique para abrir o Instagram',
                priority: 2,
                requireInteraction: true
            });

        } else {
            console.log('[IG Tools Background] ✅ Nenhum novo unfollow detectado. Lista estável.');
            await chrome.storage.local.set({
                ig_tools_followers_baseline: currentFollowers,
                ig_tools_last_check: nowIso
            });
        }

    } catch (err) {
        console.error('[IG Tools Background] Erro ao verificar unfollowers:', err);
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
        const testUser = message.username || 'usuario_teste';
        chrome.notifications.create('ig_tools_test_' + Date.now(), {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: '⚠️ Instagram Tools - Alerta de Unfollow',
            message: `@${testUser} acabou de deixar de te seguir!`,
            contextMessage: 'Clique para abrir o Instagram (Modo Teste)',
            priority: 2,
            requireInteraction: true
        });

        chrome.action.setBadgeText({ text: '1' });
        chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });

        sendResponse({ success: true, message: 'Notificação de teste disparada com sucesso!' });
        return true;
    }
});
