// IG Tools Pro - Background Service Worker (Manifest V3)
// Gerencia requisições cross-origin (Google Drive API, Webhooks de e-mail) sem restrições de CORS/CSP da página.

chrome.runtime.onInstalled.addListener(() => {
    console.log('[IG Tools Background] Extensão instalada/atualizada com sucesso.');
});

// Listener para requisições de rede enviadas pelo Content Script via Bridge
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'IG_TOOLS_HTTP_REQUEST') {
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

        return true; // Mantém o canal de mensagem aberto para resposta assíncrona
    }
});
