// IG Tools Pro - Content Script Bridge (Isolated World)
// Faz a ponte bidirecional entre o contexto da página (MAIN world) e o Background Service Worker.

(function () {
    'use strict';

    window.addEventListener('message', (event) => {
        // Valida se a mensagem vem da mesma janela
        if (event.source !== window || !event.data || event.data.source !== 'IG_TOOLS_MAIN') {
            return;
        }

        const { action, id, options } = event.data;

        if (action === 'HTTP_REQUEST') {
            try {
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
        }
    });

    console.log('[IG Tools Bridge] Ponte de comunicação ativa no contexto isolado.');
})();
