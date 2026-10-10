// Camada 2: Network - Cliente HTTP universal e Polyfill GM_xmlhttpRequest
// Resolve completamente o erro "GM_xmlhttpRequest missing" conectando ao Service Worker via Bridge.

window.IGTools = window.IGTools || {};

(function () {
    let requestIdCounter = 0;
    const pendingRequests = new Map();

    // Ouve respostas vindas do bridge.js (isolated world)
    window.addEventListener('message', (event) => {
        if (event.source !== window || !event.data || event.data.source !== 'IG_TOOLS_BRIDGE') {
            return;
        }

        const { id, success, status, statusText, responseText, headers, error } = event.data;
        if (pendingRequests.has(id)) {
            const { resolve, reject, options } = pendingRequests.get(id);
            pendingRequests.delete(id);

            const responseObj = {
                status: status || (success ? 200 : 0),
                statusText: statusText || (success ? 'OK' : 'Error'),
                responseText: responseText || '',
                headers: headers || {}
            };

            if (success) {
                // Em GM_xmlhttpRequest, qualquer resposta HTTP (mesmo 401, 404, etc) chama onload com o status
                if (options.onload) options.onload(responseObj);
                resolve(responseObj);
            } else {
                // Se a extensão foi recarregada no navegador (context invalidated) ou a ponte falhou
                const isContextError = !success && (
                    String(error).includes('context invalidated') ||
                    String(error).includes('message port closed') ||
                    status === 0
                );

                const url = options.url || '';
                const isInstagramUrl = url.includes('instagram.com') || url.startsWith('/');

                // Só tenta fallback direto se for na própria origem do Instagram (evita violar CSP com Google APIs)
                if (isContextError && isInstagramUrl) {
                    console.warn('[IG Tools HttpClient] Contexto reiniciado. Acionando fallback direto seguro via fetch...');
                    fallbackFetch(options, resolve, reject);
                    return;
                }

                const errObj = error instanceof Error 
                    ? error 
                    : new Error(typeof error === 'string' ? error : (responseObj.statusText || 'Erro na requisição'));
                if (options.onerror) options.onerror(errObj);
                reject(errObj);
            }
        }
    });

    // Função central de requisição de rede
    function request(options) {
        return new Promise((resolve, reject) => {
            const id = 'req_' + (++requestIdCounter) + '_' + Date.now();

            // Configura timeout de segurança (25s para conexões em nuvem)
            const timeoutId = setTimeout(() => {
                if (pendingRequests.has(id)) {
                    pendingRequests.delete(id);
                    const url = options.url || '';
                    const isInstagramUrl = url.includes('instagram.com') || url.startsWith('/');
                    // Só tenta fallback direto se for na própria origem do Instagram (evita violar CSP com Google APIs)
                    if (isInstagramUrl) {
                        fallbackFetch(options, resolve, reject);
                    } else {
                        const err = new Error(`Timeout na requisição de rede em nuvem (${url})`);
                        if (options.onerror) options.onerror(err);
                        reject(err);
                    }
                }
            }, 25000);

            pendingRequests.set(id, {
                options,
                resolve: (res) => { clearTimeout(timeoutId); resolve(res); },
                reject: (err) => { clearTimeout(timeoutId); reject(err); }
            });

            // Envia para o bridge.js
            window.postMessage({
                source: 'IG_TOOLS_MAIN',
                action: 'HTTP_REQUEST',
                id: id,
                options: {
                    url: options.url,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    data: options.data || null
                }
            }, '*');
        });
    }

    // Fallback nativo com fetch caso a ponte demore ou não responda
    async function fallbackFetch(options, resolve, reject) {
        try {
            const fetchOpts = {
                method: options.method || 'GET',
                headers: options.headers || {}
            };
            if (options.data && fetchOpts.method !== 'GET' && fetchOpts.method !== 'HEAD') {
                fetchOpts.body = options.data;
            }
            const res = await fetch(options.url, fetchOpts);
            const text = await res.text();
            const responseObj = {
                status: res.status,
                statusText: res.statusText,
                responseText: text
            };
            if (res.ok) {
                if (options.onload) options.onload(responseObj);
                resolve(responseObj);
            } else {
                if (options.onerror) options.onerror(responseObj);
                reject(responseObj);
            }
        } catch (e) {
            if (options.onerror) options.onerror(e);
            reject(e);
        }
    }

    // Polyfill oficial para compatibilidade total com GM_xmlhttpRequest
    window.GM_xmlhttpRequest = function (options) {
        request(options).catch((err) => {
            console.warn('[IG Tools] Requisição falhou:', err);
        });
    };

    window.IGTools.HttpClient = {
        request
    };

    console.log('[IG Tools HttpClient] Cliente HTTP e polyfill GM_xmlhttpRequest inicializados.');
})();
