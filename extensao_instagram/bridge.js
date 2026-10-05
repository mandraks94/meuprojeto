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

    // Ouve comandos vindos do Popup do iPhone e repassa para a página (MAIN world)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && (message.type === 'IG_POPUP_TOGGLE' || message.type === 'IG_POPUP_OPEN_MODAL')) {
            console.log('[IG Tools Bridge] Comando recebido do popup iPhone:', message);
            window.postMessage({
                source: 'IG_TOOLS_BRIDGE',
                action: message.type,
                payload: message
            }, '*');
            sendResponse({ success: true });
            return true;
        }
    });

    console.log('[IG Tools Bridge] Ponte de comunicação ativa (Proxy HTTP + Monitor + iPhone Popup).');
})();
