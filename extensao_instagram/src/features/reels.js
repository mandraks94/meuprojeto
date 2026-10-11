/**
 * IG Tools Pro - Módulo de Reels & Mídia
 * Arquivo: src/features/reels.js
 * Descrição: Automação, download, análise de desempenho e rolagem de Reels no Instagram Web.
 */

(function () {
    'use strict';

    window.IGTools = window.IGTools || {};

    let isReelsScrolling = false;
    let reelsScrollInterval = null;

    // Helpers com fallback seguro
    const toggleLoading = (show, progress, text) => {
        if (typeof window.toggleLoading === 'function') {
            window.toggleLoading(show, progress, text);
        }
    };

    const showToast = (msg, duration) => {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, duration);
        } else {
            console.log(`[IGTools Toast]: ${msg}`);
        }
    };

    const loadSettings = () => {
        if (typeof window.loadSettings === 'function') {
            return window.loadSettings();
        }
        return { rgbBorder: false };
    };

    const getInfoIcon = () => {
        return window.infoIcon || `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:help; vertical-align: middle; margin-left: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    };

    const resolveUsername = async () => {
        if (typeof window.resolveTargetOrLoggedUsername === 'function') {
            return await window.resolveTargetOrLoggedUsername();
        }
        if (typeof resolveTargetOrLoggedUsername === 'function') {
            return await resolveTargetOrLoggedUsername();
        }
        return null;
    };

    const fetchProfileInfo = async (username) => {
        if (typeof window.safeFetchProfileInfo === 'function') {
            return await window.safeFetchProfileInfo(username);
        }
        if (typeof safeFetchProfileInfo === 'function') {
            return await safeFetchProfileInfo(username);
        }
        return null;
    };

    const downloadMediaFile = async (url, filename) => {
        if (typeof window.downloadMedia === 'function') {
            return await window.downloadMedia(url, filename);
        }
        if (typeof downloadMedia === 'function') {
            return await downloadMedia(url, filename);
        }
        // Fallback nativo
        try {
            if (url.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha no download da rede.');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Erro no fallback de downloadMedia:', err);
            window.open(url, '_blank');
        }
    };

    // Helper para verificar se um elemento está visível na tela
    function isElementVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewWidth = window.innerWidth || document.documentElement.clientWidth;
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= viewHeight &&
            rect.right <= viewWidth &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    /**
     * Abre o modal do Menu de Reels
     */
    function abrirModalReels() {
        if (document.getElementById("reelsSubmenuModal")) return;

        toggleLoading(true, null, "Carregando menu de Reels...");
        const div = document.createElement("div");
        div.id = "reelsSubmenuModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 400px; border: 1px solid #ccc;
            border-radius: 10px; padding: 20px; z-index: 10000;
        `;
        if (loadSettings().rgbBorder) div.classList.add('rgb-border-effect');

        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    Menu de Reels
                    <div class="info-tooltip">${getInfoIcon()}<span class="tooltip-text">Ferramentas para Reels: Download, Análise de Desempenho e Rolagem Automática.</span></div>
                </span>
                <div class="modal-controls">
                    <button id="fecharReelsSubmenuBtn" title="Fechar">X</button>
                </div>
            </div>
            <div style="padding: 15px;">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="analiseReelsBtn" class="menu-item-button">📊 Análise de Desempenho</button>
                    <button id="baixarReelAtualBtn" class="menu-item-button">⬇️ Baixar Reel Atual</button>
                    <button id="copiarLegendaReelBtn" class="menu-item-button">📋 Copiar Legenda</button>
                    <button id="rolagemReelsBtn" class="menu-item-button">${isReelsScrolling ? '⏸️ Parar Rolagem' : '▶️ Rolagem Automática'}</button>
                </div>
            </div>
        `;
        toggleLoading(false);
        document.body.appendChild(div);

        document.getElementById("fecharReelsSubmenuBtn").onclick = () => div.remove();
        document.getElementById("analiseReelsBtn").onclick = () => {
            div.remove();
            iniciarAnaliseReels();
        };
        document.getElementById("baixarReelAtualBtn").onclick = () => {
            baixarReelAtual();
        };
        document.getElementById("copiarLegendaReelBtn").onclick = () => {
            copiarLegendaReel();
        };
        document.getElementById("rolagemReelsBtn").onclick = () => {
            toggleRolagemAutomaticaReels();
        };
    }

    /**
     * Alterna a rolagem automática de Reels
     */
    function toggleRolagemAutomaticaReels() {
        if (!window.location.pathname.startsWith('/reels/')) {
            alert("Esta função só pode ser usada na página de Reels.");
            return;
        }

        isReelsScrolling = !isReelsScrolling;
        const reelsModal = document.getElementById("reelsSubmenuModal");
        const scrollBtn = reelsModal ? reelsModal.querySelector("#rolagemReelsBtn") : null;

        if (isReelsScrolling) {
            console.log("Iniciando rolagem automática de Reels.");
            if (scrollBtn) scrollBtn.innerHTML = "⏸️ Parar Rolagem";
            startReelsAutoScroll();
        } else {
            console.log("Parando rolagem automática de Reels.");
            if (scrollBtn) scrollBtn.innerHTML = "▶️ Rolagem Automática";
            stopReelsAutoScroll();
        }
    }

    /**
     * Para a rolagem automática de Reels
     */
    function stopReelsAutoScroll() {
        isReelsScrolling = false;
        document.querySelectorAll('video[data-reels-scroller="true"]').forEach(video => {
            if (video._timeUpdateListener) {
                video.removeEventListener('timeupdate', video._timeUpdateListener);
            }
            video.removeAttribute('data-reels-scroller');
        });
        if (reelsScrollInterval) {
            clearTimeout(reelsScrollInterval);
            reelsScrollInterval = null;
        }
        console.log("Rolagem automática de Reels parada.");
    }

    /**
     * Inicia o monitoramento e avanço automático de Reels
     */
    function startReelsAutoScroll() {
        if (!isReelsScrolling) return;

        // Encontra o vídeo visível na tela
        const visibleVideo = Array.from(document.querySelectorAll('video')).find(v => {
            const rect = v.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= window.innerHeight && v.readyState > 2;
        });

        if (visibleVideo && !visibleVideo.hasAttribute('data-reels-scroller')) {
            visibleVideo.setAttribute('data-reels-scroller', 'true');

            const timeUpdateListener = () => {
                // Se faltar <= 700ms para o fim do vídeo
                if (visibleVideo.duration - visibleVideo.currentTime <= 0.7) {
                    console.log("Vídeo quase no fim, rolando para o próximo.");
                    visibleVideo.removeEventListener('timeupdate', timeUpdateListener);

                    let scrollableContainer = visibleVideo.parentElement;
                    while (scrollableContainer) {
                        if (scrollableContainer.scrollHeight > scrollableContainer.clientHeight) {
                            break;
                        }
                        scrollableContainer = scrollableContainer.parentElement;
                    }

                    if (scrollableContainer) {
                        console.log("Contêiner de rolagem encontrado. Rolando...");
                        scrollableContainer.scrollBy({
                            top: scrollableContainer.clientHeight,
                            left: 0,
                            behavior: 'smooth'
                        });
                    } else {
                        console.warn("Contêiner não encontrado. Usando rolagem da janela.");
                        window.scrollBy({
                            top: window.innerHeight,
                            left: 0,
                            behavior: 'smooth'
                        });
                    }

                    setTimeout(startReelsAutoScroll, 2000);
                }
            };
            visibleVideo._timeUpdateListener = timeUpdateListener;
            visibleVideo.addEventListener('timeupdate', timeUpdateListener);
        } else {
            reelsScrollInterval = setTimeout(startReelsAutoScroll, 1000);
        }
    }

    /**
     * Baixa o Reel atualmente visível na tela
     */
    function baixarReelAtual() {
        const videos = Array.from(document.querySelectorAll('video'));
        const visibleVideo = videos.find(isElementVisible);

        if (visibleVideo && visibleVideo.src) {
            console.log("Vídeo do Reel encontrado:", visibleVideo.src);

            const reelContainer = visibleVideo.closest('article, div[role="dialog"]');
            let username = 'reel';
            if (reelContainer) {
                const userLink = reelContainer.querySelector('header a[href^="/"]');
                if (userLink) username = userLink.href.split('/')[1] || 'reel';
            }
            downloadMediaFile(visibleVideo.src, `reel_${username}_${Date.now()}.mp4`);
        } else {
            alert('Nenhum vídeo de Reel visível encontrado. Abra o Reel que deseja baixar e tente novamente.');
        }
    }

    /**
     * Copia a legenda do Reel ativo
     */
    function copiarLegendaReel() {
        const videos = Array.from(document.querySelectorAll('video'));
        const visibleVideo = videos.find(isElementVisible);
        const container = visibleVideo ? visibleVideo.closest('article, div[role="dialog"]') : (document.querySelector('article') || document.querySelector('div[role="dialog"]'));

        let legenda = '';
        if (container) {
            // Busca elementos comuns de legenda de posts/reels
            const captionEl = container.querySelector('h1') ||
                              container.querySelector('span[dir="auto"]') ||
                              container.querySelector('div[data-testid="post-comment-root"] span');
            if (captionEl) {
                legenda = captionEl.innerText || captionEl.textContent || '';
            }
        }

        if (legenda && legenda.trim()) {
            navigator.clipboard.writeText(legenda.trim()).then(() => {
                showToast("✅ Legenda copiada para a área de transferência!");
            }).catch(() => {
                prompt("Copie a legenda abaixo:", legenda.trim());
            });
        } else {
            showToast("ℹ️ Nenhuma legenda detectada no Reel atual.");
        }
    }

    /**
     * Inicia a análise de métricas dos Reels do usuário
     */
    async function iniciarAnaliseReels() {
        const username = await resolveUsername();
        const appID = '936619743392459';
        if (!username) {
            alert("Por favor, acesse a página de um perfil ou efetue login para usar esta função.");
            return;
        }

        toggleLoading(true, null, "Iniciando análise de Reels...");
        const statusModal = document.createElement("div");
        statusModal.id = "reelsAnalysisStatusModal";
        statusModal.className = "submenu-modal";
        statusModal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 500px; border: 1px solid #ccc; border-radius: 10px;
            padding: 20px; z-index: 10001;
        `;
        if (loadSettings().rgbBorder) statusModal.classList.add('rgb-border-effect');

        statusModal.innerHTML = `
            <div class="modal-header"><span class="modal-title">Análise de Reels</span></div>
            <div style="padding:15px;"><p id="reelsStatusText">Buscando informações do perfil...</p></div>
        `;
        document.body.appendChild(statusModal);

        const statusText = document.getElementById("reelsStatusText");

        try {
            const profileInfo = await fetchProfileInfo(username);
            const userId = profileInfo?.data?.user?.id;
            if (!userId) throw new Error("Não foi possível obter o ID do usuário (HTTP 429 ou perfil indisponível).");

            statusText.innerText = 'Buscando lista de Reels...';

            const reelsList = [];
            let nextMaxId = '';
            let hasNextPage = true;

            // Polaris GraphQL Query para Reels
            const queryHash = 'd4d88dc1500312af6f937f7b804c68c3';

            while (hasNextPage) {
                const variables = { "user_id": userId, "first": 50, "after": nextMaxId };
                const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

                const response = await fetch(url, { headers: { 'X-IG-App-ID': appID } });
                if (!response.ok) throw new Error(`A resposta da rede não foi 'ok'. Status: ${response.status}`);
                const data = await response.json();

                const clipsData = data.data?.user?.edge_clips;
                if (clipsData?.edges) {
                    clipsData.edges.forEach(({ node: item }) => {
                        reelsList.push({
                            id: item.id,
                            thumbnail: item.image_versions2?.candidates?.[0]?.url || '',
                            views: item.play_count || 0,
                            likes: item.like_count || 0,
                            comments: item.comment_count || 0,
                            date: new Date(item.taken_at * 1000),
                            url: `https://www.instagram.com/reel/${item.code}/`
                        });
                    });
                    statusText.innerText = `Encontrados ${reelsList.length} Reels...`;
                }

                hasNextPage = clipsData?.page_info?.has_next_page || false;
                nextMaxId = clipsData?.page_info?.end_cursor || '';
                if (hasNextPage) await new Promise(r => setTimeout(r, 300));
            }

            statusModal.remove();
            toggleLoading(false);
            abrirModalTabelaReels(reelsList);

        } catch (error) {
            console.error("Erro na análise de Reels:", error);
            statusText.innerText = `Erro: ${error.message}. Tente novamente.`;
            setTimeout(() => statusModal.remove(), 3000);
            toggleLoading(false);
        }
    }

    /**
     * Exibe o modal com a tabela analítica de Reels
     */
    function abrirModalTabelaReels(reelsList) {
        const div = document.createElement("div");
        div.id = "reelsTableModal";
        toggleLoading(true, null, "Gerando tabela de Reels...");
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 900px; max-height: 90vh; border: 1px solid #ccc;
            border-radius: 10px; padding: 20px; z-index: 10000; overflow: auto;
        `;
        if (loadSettings().rgbBorder) div.classList.add('rgb-border-effect');

        let sortConfig = { key: 'date', direction: 'descending' };

        const renderTable = () => {
            const sortedList = [...reelsList].sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });

            const getSortArrow = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';

            let tableHtml = `
                <div class="modal-header">
                    <span class="modal-title">
                        Análise de Desempenho dos Reels
                        <div class="info-tooltip">${getInfoIcon()}<span class="tooltip-text">Tabela com métricas de visualizações, curtidas e comentários dos seus Reels.</span></div>
                    </span>
                    <div class="modal-controls">
                        <button id="fecharReelsTableBtn" title="Fechar">X</button>
                    </div>
                </div>
                <div style="padding: 15px;">
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead style="cursor: pointer;">
                        <tr style="text-align: left; border-bottom: 2px solid #dbdbdb;">
                            <th style="padding: 8px;">Reel</th>
                            <th style="padding: 8px; text-align: center;" data-sort-key="views">Visualizações ${getSortArrow('views')}</th>
                            <th style="padding: 8px; text-align: center;" data-sort-key="likes">Curtidas ${getSortArrow('likes')}</th>
                            <th style="padding: 8px; text-align: center;" data-sort-key="comments">Comentários ${getSortArrow('comments')}</th>
                            <th style="padding: 8px; text-align: right;" data-sort-key="date">Data ${getSortArrow('date')}</th>
                        </tr>
                    </thead>
                    <tbody>`;

            sortedList.forEach(reel => {
                tableHtml += `
                    <tr style="border-bottom: 1px solid #dbdbdb;">
                        <td style="padding: 8px; display:flex; align-items:center; gap:10px;">
                            <a href="${reel.url}" target="_blank"><img src="${reel.thumbnail}" alt="Reel Thumbnail" style="width:50px; height:90px; object-fit:cover; border-radius:4px;"></a>
                        </td>
                        <td style="text-align: center; font-weight: 600;">${reel.views.toLocaleString('pt-BR')}</td>
                        <td style="text-align: center;">${reel.likes.toLocaleString('pt-BR')}</td>
                        <td style="text-align: center;">${reel.comments.toLocaleString('pt-BR')}</td>
                        <td style="text-align: right;">${reel.date.toLocaleDateString('pt-BR')}</td>
                    </tr>`;
            });
            tableHtml += `</tbody></table></div>`;
            div.innerHTML = tableHtml;

            div.querySelectorAll('th[data-sort-key]').forEach(th => {
                th.onclick = () => {
                    const key = th.dataset.sortKey;
                    if (sortConfig.key === key) {
                        sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
                    } else {
                        sortConfig = { key, direction: 'descending' };
                    }
                    renderTable();
                };
            });

            const fecharBtn = div.querySelector("#fecharReelsTableBtn");
            if (fecharBtn) fecharBtn.onclick = () => div.remove();
            toggleLoading(false);
        };

        document.body.appendChild(div);
        renderTable();
    }

    // Registro no barramento global
    window.IGTools.Reels = {
        abrirModalReels,
        toggleRolagemAutomaticaReels,
        startReelsAutoScroll,
        stopReelsAutoScroll,
        iniciarAnaliseReels,
        abrirModalTabelaReels,
        baixarReelAtual,
        copiarLegendaReel,
        get isScrolling() { return isReelsScrolling; }
    };

    // Aliases diretos para compatibilidade com popups e chamadas legadas
    window.abrirModalReels = abrirModalReels;
    window.baixarReelAtual = baixarReelAtual;
    window.toggleRolagemAutomaticaReels = toggleRolagemAutomaticaReels;
    window.iniciarAnaliseReels = iniciarAnaliseReels;
    window.copiarLegendaReel = copiarLegendaReel;

})();
