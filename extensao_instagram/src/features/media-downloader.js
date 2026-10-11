/**
 * IG Tools Pro - Módulo de Download de Mídia
 * Arquivo: src/features/media-downloader.js
 * Descrição: Download de mídias de Stories (imagem/vídeo/canvas snapshot),
 * Destaques, Feed e Carrosséis, botão flutuante e botões inline no Feed.
 */

(function () {
    'use strict';

    window.IGTools = window.IGTools || {};

    // Helpers seguros com fallback
    const loadSettings = () => (typeof window.loadSettings === 'function' ? window.loadSettings() : {});
    const isMobileDevice = () => (window.IGTools?.BulkActions?.isMobileDevice ? window.IGTools.BulkActions.isMobileDevice() : (typeof window.isMobileDevice === 'function' ? window.isMobileDevice() : (window.innerWidth <= 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent))));

    /**
     * Download de Mídia (URL remota ou Data URL)
     */
    async function downloadMedia(url, filename) {
        if (!url) {
            alert('Não foi possível encontrar a mídia para download.');
            return;
        }

        try {
            // Se for uma data URL (do canvas), não precisa de fetch
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
            if (!response.ok) throw new Error('A resposta da rede não foi ok.');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Erro ao baixar mídia:', error);
            alert('Não foi possível baixar automaticamente. Abrindo em uma nova aba para download manual.');
            window.open(url, '_blank');
        }
    }

    /**
     * Baixar Story Atual (Imagem ou Vídeo)
     */
    function baixarStoryAtual() {
        if (!window.location.href.includes('/stories/')) {
            alert('Esta função só pode ser usada na tela de visualização de Stories.');
            return;
        }

        const isElementVisible = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            const viewHeight = window.innerHeight || document.documentElement.clientHeight;
            return (
                rect.bottom > 0 &&
                rect.top < viewHeight &&
                rect.width > 0 &&
                rect.height > 0
            );
        };

        let visibleImage;
        let visibleVideo;

        // 1. Tentar encontrar um vídeo visível primeiro
        visibleVideo = Array.from(document.querySelectorAll('video')).find(isElementVisible);

        if (isMobileDevice()) {
            visibleImage = Array.from(document.querySelectorAll('img[src]')).find(img => {
                const rect = img.getBoundingClientRect();
                return isElementVisible(img) && rect.height > (window.innerHeight * 0.5);
            });
        } else {
            visibleImage = Array.from(document.querySelectorAll('section img')).find(img => {
                const rect = img.getBoundingClientRect();
                return isElementVisible(img) && rect.height > (window.innerHeight * 0.5);
            });
        }

        if (visibleVideo && visibleVideo.src) {
            console.log("Vídeo do story encontrado:", visibleVideo.src);
            if (visibleVideo.src.startsWith('blob:')) {
                console.log("Vídeo é um blob, capturando como imagem.");
                const canvas = document.createElement('canvas');
                canvas.width = visibleVideo.videoWidth || 1080;
                canvas.height = visibleVideo.videoHeight || 1920;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(visibleVideo, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                downloadMedia(dataUrl, `story_img_${Date.now()}.png`);
            } else {
                downloadMedia(visibleVideo.src, `story_video_${Date.now()}.mp4`);
            }
            return;
        }

        // 2. Imagem visível
        if (visibleImage && visibleImage.src) {
            console.log("Imagem do story encontrada:", visibleImage.src);
            const imageUrl = visibleImage.srcset
                ? visibleImage.srcset.split(',').slice(-1)[0].trim().split(' ')[0]
                : visibleImage.src;

            downloadMedia(imageUrl, `story_img_${Date.now()}.jpg`);
            return;
        }

        alert('Nenhuma imagem ou vídeo de story encontrado para baixar.');
    }

    /**
     * Botão Flutuante Automático para Stories
     */
    function injectStoryFloatingButton() {
        if (window.location.href.includes('/stories/')) {
            if (!document.getElementById("storyFloatingDownloadBtn")) {
                const btn = document.createElement("button");
                btn.id = "storyFloatingDownloadBtn";
                btn.innerHTML = "⬇️";
                btn.title = "Baixar Story Atual";
                btn.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    z-index: 2147483647;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    width: 45px;
                    height: 45px;
                    font-size: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                    transition: all 0.3s ease;
                `;
                btn.onmouseover = () => { btn.style.background = "rgba(255, 255, 255, 0.4)"; btn.style.transform = "scale(1.1)"; };
                btn.onmouseout = () => { btn.style.background = "rgba(255, 255, 255, 0.2)"; btn.style.transform = "scale(1)"; };
                btn.onclick = (e) => {
                    e.stopPropagation();
                    baixarStoryAtual();
                };
                document.body.appendChild(btn);
            }
        } else {
            const btn = document.getElementById("storyFloatingDownloadBtn");
            if (btn) btn.remove();
        }
    }

    /**
     * Rastreador Contínuo de Stories e Destaques Curtidos em Tempo Real
     */
    let _lastTrackedStoryTime = 0;
    function trackActiveLikedStoryInDom() {
        const now = Date.now();
        if (now - _lastTrackedStoryTime < 600) return;
        _lastTrackedStoryTime = now;

        try {
            const heartEl = document.querySelector('svg.xxk16z8, svg[aria-label="Descurtir"], div[role="button"]:has(svg.xxk16z8), button:has(svg.xxk16z8)');
            if (!heartEl) return;

            let storyUsername = '';
            const urlMatch = window.location.pathname.match(/\/stories\/([^/?#]+)/);
            if (urlMatch && urlMatch[1] && urlMatch[1] !== 'highlights') {
                storyUsername = urlMatch[1].toLowerCase();
            }

            if (!storyUsername) {
                const replyInput = document.querySelector('textarea[placeholder*="Responder a"], input[placeholder*="Responder a"]');
                const mUser = replyInput?.getAttribute('placeholder')?.match(/Responder a\s+([^\s.]+)/i);
                if (mUser && mUser[1]) storyUsername = mUser[1].toLowerCase().replace(/[.,!?:;]$/, '');
            }

            if (!storyUsername) {
                const authorLink = document.querySelector('header a[href^="/"], div[role="dialog"] header a[href^="/"], section a[href^="/"]');
                if (authorLink) {
                    const rawH = (authorLink.getAttribute('href') || '').replace(/^\/|\/$/g, '').split('/')[0];
                    if (rawH && rawH !== 'stories' && rawH !== 'explore') storyUsername = rawH.toLowerCase();
                }
            }

            if (!storyUsername) return;

            const container = heartEl.closest('section') || heartEl.closest('[role="dialog"]') || document.body;
            let mediaObj = null;
            let detectedMediaId = '';

            let el = heartEl;
            for (let i = 0; i < 20 && el; i++) {
                const fKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                if (fKey && el[fKey]) {
                    let f = el[fKey];
                    for (let j = 0; j < 30 && f; j++) {
                        const p = f.memoizedProps;
                        if (p) {
                            if (p.media && typeof p.media === 'object') { mediaObj = p.media; break; }
                            if (p.item && typeof p.item === 'object') { mediaObj = p.item; break; }
                            if (p.storyItem && typeof p.storyItem === 'object') { mediaObj = p.storyItem; break; }
                            if (!detectedMediaId) {
                                if (p.mediaId) detectedMediaId = String(p.mediaId);
                                else if (p.storyId) detectedMediaId = String(p.storyId);
                                else if (p.id && !String(p.id).startsWith('highlight:')) detectedMediaId = String(p.id);
                            }
                        }
                        f = f.return;
                    }
                }
                if (mediaObj) break;
                el = el.parentElement;
            }

            if (!mediaObj && !detectedMediaId) {
                const mediaEl = container.querySelector('video, img[draggable="false"]');
                if (mediaEl) {
                    const fKey = Object.keys(mediaEl).find(k => k.startsWith('__reactFiber$'));
                    if (fKey && mediaEl[fKey]) {
                        let f = mediaEl[fKey];
                        for (let k = 0; k < 20 && f; k++) {
                            const p = f.memoizedProps;
                            if (p?.item || p?.media || p?.storyItem) {
                                mediaObj = p.item || p.media || p.storyItem;
                                break;
                            }
                            if (p?.mediaId || p?.id) {
                                detectedMediaId = String(p.mediaId || p.id);
                                break;
                            }
                            f = f.return;
                        }
                    }
                }
            }

            const currentUrl = window.location.href;
            const mMedia = currentUrl.match(/story_media_id=(\d+)/);
            const mHl = currentUrl.match(/\/stories\/highlights\/(\d+)/);
            const mediaId = String(detectedMediaId || mediaObj?.id || mediaObj?.pk || (mMedia ? mMedia[1] : '')).split('_')[0];
            if (!mediaId) return;

            const highlightId = mHl ? mHl[1] : (mediaObj?.highlight_id || '');
            const isHighlight = Boolean(mHl || highlightId || mediaObj?.reel_type === 'highlight_reel');

            let thumb = mediaObj?.image_versions2?.candidates?.[0]?.url || mediaObj?.display_url || '';
            if (!thumb) {
                const videoEl = container.querySelector('video');
                if (videoEl) thumb = videoEl.getAttribute('poster') || '';
                if (!thumb) {
                    const imgEl = container.querySelector('img[src*="cdninstagram"], img[src*="fbcdn"]');
                    if (imgEl) thumb = imgEl.src;
                }
            }

            const storageKey = `ig_tools_liked_media_${storyUsername}`;
            let cachedList = [];
            try {
                cachedList = JSON.parse(localStorage.getItem(storageKey) || '[]');
            } catch (_) { }

            if (!cachedList.some(item => item.id === mediaId)) {
                const newItem = {
                    type: isHighlight ? 'Story (Destaque)' : 'Story (24h)',
                    url: isHighlight
                        ? (highlightId ? `https://www.instagram.com/stories/highlights/${highlightId}/?story_media_id=${mediaId}` : `https://www.instagram.com/stories/highlights/${mediaId}/`)
                        : `https://www.instagram.com/stories/${storyUsername}/${mediaId}/`,
                    thumb: thumb,
                    id: mediaId,
                    rawId: mediaId
                };
                cachedList.push(newItem);
                localStorage.setItem(storageKey, JSON.stringify(cachedList));
                console.log(`%c[IG Tools Tracker] ${newItem.type} curtido registrado automaticamente para @${storyUsername}: ${mediaId}`, 'color: yellow; background: green; font-weight: bold;');
            }
        } catch (errTrack) {
            console.warn("[IG Tools Tracker] Erro:", errTrack);
        }
    }

    /**
     * Download de Mídia do Feed e Reels
     */
    function addFeedDownloadButtons() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    if (window.location.pathname.includes('/stories/')) {
                        trackActiveLikedStoryInDom();
                    }

                    const articles = document.querySelectorAll('article:not([data-download-processed])');
                    articles.forEach(article => {
                        article.setAttribute('data-download-processed', 'true');
                        addDownloadButtonToMedia(article);
                    });

                    if (loadSettings().validateProfileStatus && typeof window.validateCurrentPagePrivacy === 'function') {
                        window.validateCurrentPagePrivacy();
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        if (loadSettings().validateProfileStatus && typeof window.validateCurrentPagePrivacy === 'function') {
            window.validateCurrentPagePrivacy();
        }
    }

    function addDownloadButtonToMedia(article) {
        const processContainer = (container) => {
            const mediaElement = container.querySelector('img, video');
            if (!mediaElement || container.querySelector('.feed-download-btn') || container.closest('header')) {
                return;
            }
            createAndAttachButton(container);
        };

        article.querySelectorAll('ul > li, div[role="presentation"], ._aagv').forEach(processContainer);

        const articleObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            node.querySelectorAll('ul > li, div[role="presentation"], ._aagv').forEach(processContainer);
                            if (node.matches('ul > li, div[role="presentation"], ._aagv')) {
                                processContainer(node);
                            }
                        }
                    });
                }
            });
        });

        articleObserver.observe(article, { childList: true, subtree: true });
    }

    function createAndAttachButton(container) {
        if (!container) return;

        const closestCommentSection = container.closest('ul[class*="x78zum5"]');
        if (closestCommentSection) {
            const commentAuthorLink = closestCommentSection.querySelector('a[href*="/p/"]');
            if (!commentAuthorLink) return;
        }

        if (container.closest('header')) return;
        if (container.querySelector('.feed-download-btn')) return;

        const btn = document.createElement('button');
        btn.innerHTML = '⬇️';
        btn.className = 'feed-download-btn';
        btn.style.cssText = `
            position: absolute;
            top: 15px;
            left: 15px;
            z-index: 100;
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        `;

        btn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();

            const activeMedia = container.querySelector('video, img');
            if (activeMedia) {
                const isVideo = activeMedia.tagName === 'VIDEO';
                let mediaUrl = activeMedia.src;

                if (isVideo) {
                    const sourceElement = activeMedia.querySelector('source');
                    if (sourceElement && sourceElement.src) {
                        mediaUrl = sourceElement.src;
                    }
                }

                const filename = `instagram_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
                downloadMedia(mediaUrl, filename);
            } else {
                alert('Não foi possível encontrar a mídia para download.');
            }
        };

        container.style.position = 'relative';
        container.appendChild(btn);
    }

    // Injeção periódica do botão flutuante de stories
    setInterval(injectStoryFloatingButton, 1000);

    // Exportação do namespace
    window.IGTools.MediaDownloader = {
        downloadMedia,
        baixarStoryAtual,
        injectStoryFloatingButton,
        addFeedDownloadButtons,
        addDownloadButtonToMedia,
        createAndAttachButton,
        trackActiveLikedStoryInDom
    };

    // Aliases globais para retrocompatibilidade
    window.downloadMedia = downloadMedia;
    window.baixarStoryAtual = baixarStoryAtual;
    window.injectStoryFloatingButton = injectStoryFloatingButton;
    window.addFeedDownloadButtons = addFeedDownloadButtons;
    window.addDownloadButtonToMedia = addDownloadButtonToMedia;
    window.createAndAttachButton = createAndAttachButton;
    window.trackActiveLikedStoryInDom = trackActiveLikedStoryInDom;

})();
