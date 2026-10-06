// IG Tools Pro - Content Script Bridge (Isolated World)
// Faz a ponte bidirecional entre o contexto da página (MAIN world) e o Background Service Worker.

(function () {
    'use strict';

    window.addEventListener('message', (event) => {
        // Valida se a mensagem vem da mesma janela
        if (event.source !== window || !event.data || event.data.source !== 'IG_TOOLS_MAIN') {
            return;
        }

        const { action, id, options, followers, settings } = event.data;

        if (!chrome?.runtime?.id) {
            window.postMessage({
                source: 'IG_TOOLS_BRIDGE',
                id: id,
                success: false,
                error: 'Extension context invalidated',
                status: 0
            }, '*');
            return;
        }

        // 1. Requisição HTTP via Proxy Cross-Origin
        if (action === 'HTTP_REQUEST') {
            try {
                chrome.runtime.sendMessage(
                    { type: 'IG_TOOLS_HTTP_REQUEST', options: options },
                    (response) => {
                        const lastError = chrome.runtime.lastError;
                        if (lastError) {
                            window.postMessage({
                                source: 'IG_TOOLS_BRIDGE',
                                id: id,
                                success: false,
                                error: lastError.message,
                                status: 0
                            }, '*');
                            return;
                        }

                        window.postMessage({
                            source: 'IG_TOOLS_BRIDGE',
                            id: id,
                            success: response?.success ?? false,
                            status: response?.status ?? 0,
                            statusText: response?.statusText ?? '',
                            responseText: response?.responseText ?? '',
                            headers: response?.headers ?? {},
                            error: response?.error
                        }, '*');
                    }
                );
            } catch (err) {
                window.postMessage({
                    source: 'IG_TOOLS_BRIDGE',
                    id: id,
                    success: false,
                    error: err.message || 'Extension context invalidated',
                    status: 0
                }, '*');
            }
            return;
        }

        // 2. Sincronização da lista de seguidores em segundo plano
        if (action === 'SYNC_FOLLOWERS_BASELINE') {
            chrome.runtime.sendMessage(
                { type: 'IG_TOOLS_SYNC_FOLLOWERS_BASELINE', followers: followers },
                (response) => {
                    window.postMessage({
                        source: 'IG_TOOLS_BRIDGE',
                        id: id,
                        success: response?.success ?? false,
                        count: response?.count ?? 0,
                        error: chrome.runtime.lastError?.message || response?.error
                    }, '*');
                }
            );
            return;
        }

        // 3. Forçar checagem agora
        if (action === 'CHECK_NOW') {
            chrome.runtime.sendMessage(
                { type: 'IG_TOOLS_CHECK_NOW' },
                (response) => {
                    window.postMessage({
                        source: 'IG_TOOLS_BRIDGE',
                        id: id,
                        success: response?.success ?? false,
                        error: chrome.runtime.lastError?.message || response?.error
                    }, '*');
                }
            );
            return;
        }

        // 4. Obter status do monitor
        if (action === 'GET_MONITOR_STATUS') {
            chrome.runtime.sendMessage(
                { type: 'IG_TOOLS_GET_MONITOR_STATUS' },
                (response) => {
                    window.postMessage({
                        source: 'IG_TOOLS_BRIDGE',
                        id: id,
                        data: response,
                        success: response?.success ?? false,
                        error: chrome.runtime.lastError?.message
                    }, '*');
                }
            );
            return;
        }

        // 5. Atualizar configurações
        if (action === 'UPDATE_SETTINGS') {
            chrome.runtime.sendMessage(
                { type: 'IG_TOOLS_UPDATE_SETTINGS', settings: settings },
                (response) => {
                    window.postMessage({
                        source: 'IG_TOOLS_BRIDGE',
                        id: id,
                        data: response?.settings,
                        success: response?.success ?? false,
                        error: chrome.runtime.lastError?.message
                    }, '*');
                }
            );
            return;
        }

        // 6. Teste de Notificação
        if (action === 'TEST_NOTIFICATION') {
            chrome.runtime.sendMessage(
                { type: 'IG_TOOLS_TEST_NOTIFICATION', username: event.data.username || 'usuario_teste' },
                (response) => {
                    window.postMessage({
                        source: 'IG_TOOLS_BRIDGE',
                        id: id,
                        success: response?.success ?? false,
                        message: response?.message,
                        error: chrome.runtime.lastError?.message
                    }, '*');
                }
            );
            return;
        }
    });

    // Ouve comandos vindos do Background ou Popup do iPhone
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message) return false;

        // Repassa eventos de interface para a página
        if (message.type === 'IG_POPUP_TOGGLE' || message.type === 'IG_POPUP_OPEN_MODAL') {
            console.log('[IG Tools Bridge] Comando recebido do popup iPhone:', message);
            window.postMessage({
                source: 'IG_TOOLS_BRIDGE',
                action: message.type,
                payload: message
            }, '*');
            sendResponse({ success: true });
            return true;
        }

        // Coleta de seguidores Same-Origin delegada pelo Background Service Worker
        if (message.type === 'IG_TOOLS_FETCH_FOLLOWERS_VIA_TAB') {
            const userId = message.userId;
            (async () => {
                try {
                    let currentFollowers = [];
                    let nextMaxId = null;
                    let hasMore = true;
                    let pageCount = 0;
                    const MAX_PAGES = 30;

                    // Extrai csrftoken dos cookies da página
                    const matchCsrf = document.cookie.match(/csrftoken=([^;]+)/);
                    const csrfToken = matchCsrf ? matchCsrf[1] : '';

                    while (hasMore && pageCount < MAX_PAGES) {
                        pageCount++;
                        let url = `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=50`;
                        if (nextMaxId) {
                            url += `&max_id=${encodeURIComponent(nextMaxId)}`;
                        }

                        const res = await fetch(url, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'X-CSRFToken': csrfToken,
                                'X-IG-App-ID': '936619743392459',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json'
                            }
                        });

                        if (!res.ok) break;
                        const text = await res.text();
                        if (text.trim().startsWith('<')) {
                            console.warn('[IG Tools Bridge] Resposta não-JSON recebida da API.');
                            break;
                        }
                        const data = JSON.parse(text);
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
                        if (hasMore) {
                            await new Promise(r => setTimeout(r, 600));
                        }
                    }

                    console.log(`[IG Tools Bridge] Coleta concluída via aba: ${currentFollowers.length} seguidores.`);
                    sendResponse({ success: true, followers: currentFollowers });
                } catch (err) {
                    console.error('[IG Tools Bridge] Erro na coleta via aba:', err);
                    sendResponse({ success: false, error: err.message, followers: [] });
                }
            })();
            return true;
        }

        // Nova Lógica Ultra-Rápida: Consulta apenas a contagem total de seguidores (Via GraphQL Oficial sem 429)
        if (message.type === 'IG_TOOLS_GET_FOLLOWERS_COUNT') {
            const userId = message.userId;
            const requestId = 'fcount_' + Date.now();

            let responded = false;
            const timeoutTimer = setTimeout(() => {
                if (!responded) {
                    responded = true;
                    window.removeEventListener('message', onCountResponse);
                    // Fallback rápido via DOM se o GraphQL demorar
                    const headerLinks = document.querySelectorAll('header a, header span');
                    for (const el of headerLinks) {
                        const text = el.innerText || '';
                        if (text.toLowerCase().includes('seguidor') || text.toLowerCase().includes('follower')) {
                            const numMatch = text.match(/[\d.,]+/);
                            if (numMatch) {
                                const parsed = parseInt(numMatch[0].replace(/\D/g, ''), 10);
                                if (parsed > 0) {
                                    sendResponse({ success: true, count: parsed });
                                    return;
                                }
                            }
                        }
                    }
                    sendResponse({ success: false, error: 'Timeout ao obter contagem de seguidores' });
                }
            }, 3500);

            const onCountResponse = (evt) => {
                if (evt.source === window && evt.data?.source === 'IG_TOOLS_MAIN' && evt.data?.action === 'RESPONSE_FOLLOWERS_COUNT' && evt.data?.id === requestId) {
                    if (!responded) {
                        responded = true;
                        clearTimeout(timeoutTimer);
                        window.removeEventListener('message', onCountResponse);
                        if (typeof evt.data.count === 'number') {
                            console.log(`[IG Tools Bridge] Contagem recebida da página: ${evt.data.count}`);
                            sendResponse({ success: true, count: evt.data.count });
                        } else {
                            sendResponse({ success: false, error: 'Contagem não disponível' });
                        }
                    }
                }
            };

            window.addEventListener('message', onCountResponse);

            // Dispara para o contexto da página que possui o GraphQL HoverCard nativo
            window.postMessage({
                source: 'IG_TOOLS_BRIDGE',
                action: 'GET_FOLLOWERS_COUNT_FROM_MAIN',
                userId: userId,
                id: requestId
            }, '*');

            return true;
        }

        // Pop-up visual na tela do Instagram
        if (message.type === 'IG_SHOW_UNFOLLOW_POPUP') {
            window.postMessage({
                source: 'IG_TOOLS_BRIDGE',
                action: 'SHOW_UNFOLLOW_POPUP',
                payload: {
                    title: message.title,
                    message: message.message,
                    detail: message.detail
                }
            }, '*');
            sendResponse({ success: true });
            return true;
        }
    });

    console.log('[IG Tools Bridge] Ponte de comunicação ativa (Proxy HTTP + Monitor + iPhone Popup).');
})();
