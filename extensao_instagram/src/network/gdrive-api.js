// Camada 2: Network - API do Google Drive (Sincronização em Nuvem)
window.IGTools = window.IGTools || {};

(function () {
    const gDriveApi = {
        execute: function (options) {
            const token = window.IGTools.Storage?.googleAuth?.getAccessToken();
            if (!token) {
                window.IGTools.UI?.showToast("⚠️ Faça login no Google nas Configurações");
                return Promise.reject("Sem token");
            }

            return new Promise((resolve, reject) => {
                const reqOptions = {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${token}`
                    },
                    onload: (res) => {
                        console.log(`[IG Tools] API Response (${options.method} ${options.url}):`, res.status);
                        if (res.status >= 200 && res.status < 300) {
                            try {
                                const data = res.responseText ? JSON.parse(res.responseText) : {};
                                resolve(data);
                            } catch (e) {
                                resolve(res.responseText);
                            }
                        } else {
                            reject(res);
                        }
                    },
                    onerror: (err) => {
                        console.error("[IG Tools] Network Error:", err);
                        reject(err);
                    }
                };

                // Usa o HttpClient unificado da extensão
                if (window.IGTools.HttpClient?.request) {
                    window.IGTools.HttpClient.request(reqOptions)
                        .then(resolve)
                        .catch(reject);
                } else if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest(reqOptions);
                } else {
                    reject("Nenhum cliente HTTP disponível.");
                }
            });
        },

        getFileId: async function () {
            const config = window.IGTools.Config.GDRIVE_CONFIG;
            const data = await this.execute({
                method: 'GET',
                url: `https://www.googleapis.com/drive/v3/files?q=name='${config.fileName}'&spaces=appDataFolder`
            });
            if (data.files && data.files.length > 0) {
                console.log("[IG Tools] Arquivo encontrado no Drive ID:", data.files[0].id);
                return data.files[0].id;
            }
            return null;
        },

        saveData: async function (allData) {
            const config = window.IGTools.Config.GDRIVE_CONFIG;
            let fileId = await this.getFileId();
            const method = fileId ? 'PATCH' : 'POST';
            const url = fileId
                ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
                : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

            if (!fileId) {
                console.log("[IG Tools] Criando novo arquivo no Google Drive...");
                const metadata = { name: config.fileName, parents: ['appDataFolder'] };
                const boundary = 'foo_bar_baz';
                const delimiter = `\r\n--${boundary}\r\n`;
                const close_delim = `\r\n--${boundary}--`;
                const body = delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(allData) +
                    close_delim;

                return this.execute({
                    method: 'POST',
                    url,
                    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
                    data: body
                });
            } else {
                console.log("[IG Tools] Atualizando arquivo existente no Drive...");
                return this.execute({
                    method: 'PATCH',
                    url,
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(allData)
                });
            }
        },

        loadData: async function () {
            const fileId = await this.getFileId();
            if (!fileId) return {};
            const response = await this.execute({
                method: 'GET',
                url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
            });
            try {
                return typeof response === 'string' ? JSON.parse(response) : response;
            } catch (e) {
                console.error("[IG Tools] Erro ao parsear dados do arquivo:", e);
                return {};
            }
        }
    };

    window.IGTools.GDriveApi = gDriveApi;
})();
