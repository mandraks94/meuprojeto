// src/features/profile-interactions.js - Módulo de Interações (Posts, Stories e Destaques Curtidos + Descurtir)
window.IGTools = window.IGTools || {};

(function () {
    'use strict';

    // Helpers compartilhados
    const getActorId = () => (typeof window.getActorId === 'function' ? window.getActorId() : '') || (typeof window.getCookie === 'function' ? window.getCookie('ds_user_id') : '') || '';
    const getCookie = (name) => (typeof window.getCookie === 'function' ? window.getCookie(name) : '') || '';
    const getLsdToken = () => (typeof window.getLsdToken === 'function' ? window.getLsdToken() : '') || (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken('lsd') : '') || '';
    const getDtsgToken = () => (typeof window.getDtsgToken === 'function' ? window.getDtsgToken() : '') || (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken('fb_dtsg') : '') || '';
    const computeJazoest = (dtsg) => (typeof window.computeJazoest === 'function' ? window.computeJazoest(dtsg) : '26452');
    const getSpinParams = () => (typeof window.getSpinParams === 'function' ? window.getSpinParams() : { spin_r: '', spin_b: 'trunk', spin_t: '' });
    const getApiHeaders = (isGql = false) => (typeof window.getApiHeaders === 'function' ? window.getApiHeaders(isGql) : {});
    const getCachedUserId = (user) => (typeof window.getCachedUserId === 'function' ? window.getCachedUserId(user) : null);
    const getUserId = async (user) => (typeof window.getUserId === 'function' ? await window.getUserId(user) : null);
    const executeGraphqlProfilePosts = async (user, cursor) => (typeof window.executeGraphqlProfilePosts === 'function' ? await window.executeGraphqlProfilePosts(user, cursor) : null);
    const executeGraphqlUserHoverCard = async (uid) => (typeof window.executeGraphqlUserHoverCard === 'function' ? await window.executeGraphqlUserHoverCard(uid) : null);
    const safeFetchProfileInfo = async (user) => (typeof window.safeFetchProfileInfo === 'function' ? await window.safeFetchProfileInfo(user) : null);
    const toggleLoading = (loading, pct, msg) => (window.IGTools?.DOMUtils?.toggleLoading ? window.IGTools.DOMUtils.toggleLoading(loading, pct, msg) : (typeof window.toggleLoading === 'function' ? window.toggleLoading(loading, pct, msg) : null));
    const loadSettings = () => (window.IGTools?.Storage?.loadSettings ? window.IGTools.Storage.loadSettings() : (typeof window.loadSettings === 'function' ? window.loadSettings() : {}));
    const DEFAULT_AVATAR = window.DEFAULT_AVATAR || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.37-2.57 5.05-2.57s5.02.91 5.05 2.57C15.8 19.15 14.03 20 12 20z'/%3E%3C/svg%3E";
    const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="vertical-align: middle;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;

    // ========================================================
    // FUNÇÕES COMPARTILHADAS DE INTERAÇÕES E DESCURTIR (UNLIKE)
    // ========================================================

    async function executeGraphqlUnlikeStory(mediaId) {
        try {
            const cleanMediaId = String(mediaId).split('_')[0];
            const actorId = getActorId();
            const lsd = getLsdToken() || '';
            const fbDtsg = getDtsgToken() || '';
            const jazoest = computeJazoest(fbDtsg) || '26452';
            const spin = getSpinParams();

            const variables = {
                input: {
                    actor_id: actorId,
                    client_mutation_id: String(Math.floor(Math.random() * 100) + 1),
                    media_id: cleanMediaId
                }
            };

            const body = new URLSearchParams();
            body.append('__comet_req', '7');
            if (fbDtsg) body.append('fb_dtsg', fbDtsg);
            if (jazoest) body.append('jazoest', jazoest);
            if (lsd) body.append('lsd', lsd);
            if (spin.spin_r) body.append('__spin_r', spin.spin_r);
            body.append('__spin_b', spin.spin_b || 'trunk');
            if (spin.spin_t) body.append('__spin_t', spin.spin_t);
            body.append('__crn', 'comet.igweb.PolarisStoriesV3HighlightsRoute');
            body.append('fb_api_caller_class', 'RelayModern');
            body.append('fb_api_req_friendly_name', 'usePolarisStoriesV4LikeMutationUnlikeMutation');
            body.append('server_timestamps', 'true');
            body.append('variables', JSON.stringify(variables));
            body.append('doc_id', '26510485515280697');

            const headers = {
                ...getApiHeaders(true),
                'X-ASBD-ID': '359341',
                'X-CSRFToken': getCookie('csrftoken') || '',
                'X-FB-Friendly-Name': 'usePolarisStoriesV4LikeMutationUnlikeMutation',
                'X-FB-LSD': lsd,
                'X-IG-App-ID': '936619743392459',
                'X-IG-Max-Touch-Points': '0'
            };

            console.log(`[IG Tools Interações] Enviando mutação GraphQL para descurtir story (${cleanMediaId})...`, variables);
            const response = await fetch('https://www.instagram.com/api/graphql', {
                method: 'POST',
                headers,
                body: body.toString(),
                credentials: 'include',
                cache: 'no-store'
            });

            const rawText = await response.text();
            let cleanedText = rawText.trim();
            if (cleanedText.startsWith('for (;;);')) {
                cleanedText = cleanedText.slice(9).trim();
            }

            let data = null;
            try {
                data = JSON.parse(cleanedText);
            } catch (_) { }

            console.log('[IG Tools Interações] Resposta GraphQL Unlike Story:', { status: response.status, ok: response.ok, data });

            if (response.ok && (data?.data?.xig_unsend_story_like || !data?.errors)) {
                return true;
            }
            return false;
        } catch (e) {
            console.error('[IG Tools Interações] Erro ao descurtir story via GraphQL:', e);
            return false;
        }
    }

    async function executeGraphqlUnlikePost(mediaId, trackingToken = '') {
        try {
            const cleanMediaId = String(mediaId).split('_')[0];
            const actorId = getActorId();
            const lsd = getLsdToken() || '';
            const fbDtsg = getDtsgToken() || '';
            const jazoest = computeJazoest(fbDtsg) || '26456';
            const spin = getSpinParams();

            const inputObj = {
                actor_id: actorId,
                client_mutation_id: String(Math.floor(Math.random() * 100) + 1),
                media_id: cleanMediaId
            };
            if (trackingToken) {
                inputObj.tracking_token = trackingToken;
            }

            const variables = { input: inputObj };

            const body = new URLSearchParams();
            body.append('__comet_req', '7');
            if (fbDtsg) body.append('fb_dtsg', fbDtsg);
            if (jazoest) body.append('jazoest', jazoest);
            if (lsd) body.append('lsd', lsd);
            if (spin.spin_r) body.append('__spin_r', spin.spin_r);
            body.append('__spin_b', spin.spin_b || 'trunk');
            if (spin.spin_t) body.append('__spin_t', spin.spin_t);
            body.append('__crn', 'comet.igweb.PolarisDesktopPostRoute');
            body.append('fb_api_caller_class', 'RelayModern');
            body.append('fb_api_req_friendly_name', 'usePolarisLikeMediaXIGUnlikeMutation');
            body.append('server_timestamps', 'true');
            body.append('variables', JSON.stringify(variables));
            body.append('doc_id', '27345296031770102');

            const headers = {
                ...getApiHeaders(true),
                'X-ASBD-ID': '359341',
                'X-CSRFToken': getCookie('csrftoken') || '',
                'X-FB-Friendly-Name': 'usePolarisLikeMediaXIGUnlikeMutation',
                'X-FB-LSD': lsd,
                'X-IG-App-ID': '936619743392459',
                'X-IG-Max-Touch-Points': '0'
            };

            console.log(`[IG Tools Interações] Enviando mutação GraphQL para descurtir post (${cleanMediaId})...`, variables);
            const response = await fetch('https://www.instagram.com/api/graphql', {
                method: 'POST',
                headers,
                body: body.toString(),
                credentials: 'include',
                cache: 'no-store'
            });

            const rawText = await response.text();
            let cleanedText = rawText.trim();
            if (cleanedText.startsWith('for (;;);')) {
                cleanedText = cleanedText.slice(9).trim();
            }

            let data = null;
            try {
                data = JSON.parse(cleanedText);
            } catch (_) { }

            console.log('[IG Tools Interações] Resposta GraphQL Unlike Post:', { status: response.status, ok: response.ok, data });

            if (response.ok && (data?.data?.xig_media_unlike || !data?.errors)) {
                return true;
            }
            return false;
        } catch (e) {
            console.error('[IG Tools Interações] Erro ao descurtir post via GraphQL:', e);
            return false;
        }
    }

    async function unlikeMedia(itemOrId, maybeType) {
        try {
            const csrf = getCookie('csrftoken');
            if (!csrf) {
                alert("Erro: Token CSRF não encontrado. Recarregue a página.");
                return false;
            }

            const item = typeof itemOrId === 'object' ? itemOrId : { id: itemOrId, type: maybeType };
            const rawId = String(item.rawId || item.id || '');
            const cleanMediaId = rawId.split('_')[0];
            const type = item.type || maybeType || '';

            console.log(`[IG Tools Interações] Descurtindo ${type} (${cleanMediaId})...`);

            if (type && (type.includes('Story') || type.includes('Destaque'))) {
                const gqlSuccess = await executeGraphqlUnlikeStory(cleanMediaId);
                if (gqlSuccess) {
                    console.log(`[IG Tools Interações] Sucesso ao descurtir story via GraphQL (${cleanMediaId})!`);
                    return true;
                }

                console.warn(`[IG Tools Interações] GraphQL falhou, tentando fallback REST...`);
                const restUrl = `https://www.instagram.com/api/v1/story_interactions/unlike_story_like/`;
                let restRes = await fetch(restUrl, {
                    method: 'POST',
                    headers: {
                        ...getApiHeaders(true),
                        'X-CSRFToken': csrf
                    },
                    body: `media_id=${encodeURIComponent(cleanMediaId)}`,
                    credentials: 'include'
                });
                if (restRes.ok) return true;

                const errText = await restRes.text();
                console.error("[IG Tools Interações] Falha ao descurtir via REST:", restRes.status, errText);
                alert(`Falha ao descurtir (${restRes.status}). Verifique o console.`);
                return false;
            } else {
                const gqlSuccess = await executeGraphqlUnlikePost(cleanMediaId, item.trackingToken);
                if (gqlSuccess) {
                    console.log(`[IG Tools Interações] Sucesso ao descurtir post via GraphQL (${cleanMediaId})!`);
                    return true;
                }

                console.warn(`[IG Tools Interações] GraphQL falhou para post, tentando fallback REST...`);
                const postUrl = `https://www.instagram.com/api/v1/web/likes/${cleanMediaId}/unlike/`;
                const postRes = await fetch(postUrl, {
                    method: 'POST',
                    headers: {
                        ...getApiHeaders(true),
                        'X-CSRFToken': csrf
                    },
                    body: '',
                    credentials: 'include'
                });
                if (postRes.ok) {
                    console.log(`[IG Tools Interações] Sucesso ao descurtir post (${cleanMediaId})!`);
                    return true;
                }

                const errText = await postRes.text();
                console.error("[IG Tools Interações] Falha ao descurtir post:", postRes.status, errText);
                alert(`Falha ao descurtir post (${postRes.status}). Verifique o console.`);
                return false;
            }
        } catch (e) {
            console.error("[IG Tools Interações] Erro ao descurtir:", e);
            alert("Erro ao descurtir: " + e.message);
            return false;
        }
    }

    async function fetchUserInteractionsData(username, explicitUid = null, onProgress = null, maxPages = 10) {
        const cleanUsername = String(username).trim().toLowerCase();
        let targetUserId = explicitUid || getCachedUserId(cleanUsername);
        if (!targetUserId) {
            targetUserId = await getUserId(cleanUsername);
        }
        if (!targetUserId) {
            throw new Error("Não foi possível obter o ID do perfil.");
        }

        const likedPosts = [];
        const likedStories = [];
        const likedHighlights = [];

        // 1. Posts via GraphQL oficial (analisa com paginação segura)
        let totalPostsFound = 0;
        let hasNextPage = true;
        let endCursor = null;
        let pageNum = 0;

        while (hasNextPage && pageNum < maxPages) {
            pageNum++;
            const pct = Math.min(85, Math.floor((pageNum / maxPages) * 75));
            if (onProgress) onProgress(`Analisando publicações (pág ${pageNum})... (${likedPosts.length} curtidos)`, pct);
            const connection = await executeGraphqlProfilePosts(cleanUsername, endCursor);
            if (!connection || !Array.isArray(connection.edges)) break;

            const edges = connection.edges;
            totalPostsFound += edges.length;

            for (const edge of edges) {
                const node = edge?.node;
                if (!node) continue;
                const code = node.code || node.shortcode;
                const isLiked = Boolean(node.has_liked || node.viewer_has_liked);
                const thumb = node.image_versions2?.candidates?.[0]?.url || node.display_url || node.thumbnail_src || '';
                const mediaId = node.id || node.pk;

                if (isLiked && code) {
                    likedPosts.push({
                        type: 'Post',
                        url: `https://www.instagram.com/p/${code}/`,
                        thumb: thumb,
                        id: mediaId || code,
                        rawId: String(mediaId || code),
                        trackingToken: node.tracking_token || ''
                    });
                }
            }
            hasNextPage = Boolean(connection.page_info?.has_next_page);
            endCursor = connection.page_info?.end_cursor;
            if (!endCursor) break;
            await new Promise(r => setTimeout(r, 250));
        }

        // 2. Extração de Stories (24h) e Destaques (Highlights) via Polaris
        if (onProgress) onProgress('Buscando Stories e Destaques (Polaris)...', 90);

        const highlightIdsSet = new Set();
        const processedReelIds = new Set();

        // Carrega do cache local histórico de stories/destaques já visualizados com curtida
        try {
            const cachedLiked = JSON.parse(localStorage.getItem(`ig_tools_liked_media_${cleanUsername}`) || '[]');
            for (const item of cachedLiked) {
                if (likedPosts.some(p => p.id === item.id)) continue;
                if (item.type?.includes('Destaque')) {
                    if (!likedHighlights.some(h => h.id === item.id)) likedHighlights.push(item);
                } else {
                    if (!likedStories.some(s => s.id === item.id)) likedStories.push(item);
                }
            }
            if (likedHighlights.length > 0 || likedStories.length > 0) {
                console.log(`[IG Tools Cache] Carregado(s) do histórico local: ${likedHighlights.length} destaque(s) e ${likedStories.length} storie(s).`);
            }
        } catch (_) {}

        function isLikedStoryHeartElement(el) {
            if (!el) return false;
            try {
                if (el.classList && el.classList.contains('xxk16z8')) return true;
                if (el.querySelector && el.querySelector('.xxk16z8')) return true;

                const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                if (aria === 'descurtir' || aria === 'unlike') return true;

                const titleEl = el.querySelector ? el.querySelector('title') : null;
                if (titleEl) {
                    const titleText = (titleEl.textContent || '').trim().toLowerCase();
                    if (titleText === 'descurtir' || titleText === 'unlike') return true;
                }

                const pathEl = el.querySelector ? el.querySelector('path') : null;
                if (pathEl) {
                    const d = pathEl.getAttribute('d') || '';
                    if (d.startsWith('M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6')) return true;
                }

                const comp = window.getComputedStyle(el);
                const cColor = comp.color || '';
                const cFill = comp.fill || '';
                if (cColor.includes('255, 48, 64') || cFill.includes('255, 48, 64') ||
                    cColor.includes('254, 44, 85') || cFill.includes('254, 44, 85') ||
                    cColor.includes('237, 73, 86') || cFill.includes('237, 73, 86')) {
                    return true;
                }
            } catch (_) {}
            return false;
        }

        function scanDomForLikedStories() {
            if (typeof document === 'undefined') return;
            try {
                const candidates = Array.from(document.querySelectorAll('svg, div[role="button"], button'));
                const likedElements = candidates.filter(isLikedStoryHeartElement);

                if (likedElements.length > 0) {
                    console.log(`%c[IG Tools DOM] Encontrado(s) ${likedElements.length} elemento(s) com coração curtido ativo no DOM!`, 'color: #00ffaa; font-weight: bold;');
                }

                for (const targetEl of likedElements) {
                    let mediaObj = null;
                    let detectedMediaId = '';

                    let el = targetEl;
                    for (let i = 0; i < 20 && el; i++) {
                        const fKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                        if (fKey && el[fKey]) {
                            let fiber = el[fKey];
                            for (let j = 0; j < 35 && fiber; j++) {
                                const props = fiber.memoizedProps;
                                if (props) {
                                    if (props.media && typeof props.media === 'object') { mediaObj = props.media; break; }
                                    if (props.item && typeof props.item === 'object') { mediaObj = props.item; break; }
                                    if (props.storyItem && typeof props.storyItem === 'object') { mediaObj = props.storyItem; break; }
                                    if (props.story && typeof props.story === 'object') { mediaObj = props.story; break; }
                                    if (props.reel && typeof props.reel === 'object') { mediaObj = props.reel; break; }
                                    if (!detectedMediaId) {
                                        if (props.mediaId) detectedMediaId = String(props.mediaId);
                                        else if (props.storyId) detectedMediaId = String(props.storyId);
                                        else if (props.id && !String(props.id).startsWith('highlight:')) detectedMediaId = String(props.id);
                                    }
                                }
                                fiber = fiber.return;
                            }
                        }
                        if (mediaObj) break;
                        el = el.parentElement;
                    }

                    const container = targetEl.closest('section') || targetEl.closest('[role="dialog"]') || document.body;

                    if (!mediaObj && !detectedMediaId) {
                        const mediaEl = container.querySelector('video, img[draggable="false"]');
                        if (mediaEl) {
                            const fKey = Object.keys(mediaEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
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
                    const mStory = currentUrl.match(/\/stories\/([^/?#]+)\/(\d+)/);

                    const mediaId = String(detectedMediaId || mediaObj?.id || mediaObj?.pk || (mMedia ? mMedia[1] : (mStory && mStory[1] !== 'highlights' ? mStory[2] : ''))).split('_')[0];
                    const isHighlight = Boolean(mHl || (mediaObj && (mediaObj.reel_type === 'highlight_reel' || String(mediaObj.id).startsWith('highlight:'))));
                    const highlightId = mHl ? mHl[1] : (mediaObj?.highlight_id || '');

                    let thumb = mediaObj?.image_versions2?.candidates?.[0]?.url ||
                                mediaObj?.display_url ||
                                mediaObj?.display_resources?.[0]?.src ||
                                '';

                    if (!thumb) {
                        const videoEl = container.querySelector('video');
                        if (videoEl) thumb = videoEl.getAttribute('poster') || '';
                        if (!thumb) {
                            const imgEl = container.querySelector('img[src*="cdninstagram"], img[src*="fbcdn"]');
                            if (imgEl) thumb = imgEl.src;
                        }
                    }

                    if (mediaId) {
                        if (isHighlight) {
                            if (!likedHighlights.some(h => h.id === mediaId)) {
                                console.log(`%c[IG Tools DOM] Destaque curtido adicionado via DOM: ${mediaId}`, 'color: yellow; background: green; font-weight: bold;', { mediaId, highlightId });
                                likedHighlights.push({
                                    type: 'Story (Destaque)',
                                    url: highlightId
                                        ? `https://www.instagram.com/stories/highlights/${highlightId}/?story_media_id=${mediaId}`
                                        : `https://www.instagram.com/stories/highlights/${mediaId}/`,
                                    thumb: thumb,
                                    id: mediaId,
                                    rawId: mediaId
                                });
                            }
                        } else {
                            if (!likedStories.some(s => s.id === mediaId)) {
                                console.log(`%c[IG Tools DOM] Story curtido adicionado via DOM: ${mediaId}`, 'color: yellow; background: green; font-weight: bold;', { mediaId });
                                likedStories.push({
                                    type: 'Story (24h)',
                                    url: `https://www.instagram.com/stories/${cleanUsername}/${mediaId}/`,
                                    thumb: thumb,
                                    id: mediaId,
                                    rawId: mediaId
                                });
                            }
                        }

                        try {
                            localStorage.setItem(`ig_tools_liked_media_${cleanUsername}`, JSON.stringify([...likedStories, ...likedHighlights]));
                        } catch (_) {}
                    }
                }
            } catch (errDom) {
                console.warn("[IG Tools DOM] Erro na varredura do DOM:", errDom);
            }
        }

        scanDomForLikedStories();

        function isStoryLiked(it) {
            if (!it || typeof it !== 'object') return false;
            if (it.has_liked === true || it.viewer_has_liked === true || it.viewer_has_liked_story === true) return true;
            if (it.liked === true || it.liked_by_viewer === true || it.has_viewer_liked === true) return true;
            if (it.story_like) return true;
            if (it.viewer_interaction && (it.viewer_interaction.has_liked || it.viewer_interaction.liked || it.viewer_interaction.is_liked)) return true;
            if (it.viewer_reaction && (it.viewer_reaction.has_liked || it.viewer_reaction.liked)) return true;
            if (it.user_has_liked === true || it.is_liked === true) return true;
            for (const key of Object.keys(it)) {
                const k = key.toLowerCase();
                if ((k.includes('like') || k.includes('heart')) && !k.includes('count') && !k.includes('disabled') && !k.includes('allow') && !k.includes('can_')) {
                    const val = it[key];
                    if (val === true || val === 1 || val === 'true') return true;
                    if (val && typeof val === 'object' && (val.has_liked || val.liked || val.is_liked)) return true;
                }
            }
            return false;
        }

        function processSingleStoryItem(it, isHighlight = false, cleanHighlightId = '') {
            if (!it || typeof it !== 'object') return;
            const hasLiked = isStoryLiked(it);
            const likeKeys = Object.keys(it).filter(k => k.toLowerCase().includes('like') || k.toLowerCase().includes('viewer') || k.toLowerCase().includes('heart'));
            console.log("[IG Tools Interações] Story/Destaque item analisado:", { id: it.id || it.pk, isHighlight, hasLiked, likeKeys, item: it });
            if (!hasLiked) return;

            const rawId = String(it.id || it.pk || it.story_media_id || '');
            if (!rawId) return;
            const cleanMediaId = rawId.split('_')[0];

            if (likedPosts.some(p => p.id === cleanMediaId)) {
                return;
            }

            const thumb = it.image_versions2?.candidates?.[0]?.url ||
                          it.display_url ||
                          it.display_resources?.[0]?.src ||
                          it.thumbnail_src ||
                          it.cover_media?.cropped_image_version?.url ||
                          '';

            if (isHighlight) {
                if (!likedHighlights.some(s => s.id === cleanMediaId)) {
                    likedHighlights.push({
                        type: 'Story (Destaque)',
                        url: cleanHighlightId
                            ? `https://www.instagram.com/stories/highlights/${cleanHighlightId}/?story_media_id=${cleanMediaId}`
                            : `https://www.instagram.com/stories/highlights/${cleanMediaId}/`,
                        thumb: thumb,
                        id: cleanMediaId,
                        rawId: rawId
                    });
                }
            } else {
                if (!likedStories.some(s => s.id === cleanMediaId)) {
                    likedStories.push({
                        type: 'Story (24h)',
                        url: `https://www.instagram.com/stories/${cleanUsername}/${cleanMediaId}/`,
                        thumb: thumb,
                        id: cleanMediaId,
                        rawId: rawId
                    });
                }
            }
        }

        function processReelItems(reel, isHighlightDefault = false) {
            if (!reel) return;
            const reelId = String(reel?.id || reel?.pk || '');
            const isHighlight = isHighlightDefault || reelId.startsWith('highlight:') || reel?.reel_type === 'highlight_reel' || (String(reelId) !== String(targetUserId));
            const cleanHighlightId = reelId.replace(/^highlight:/, '');
            const items = Array.isArray(reel?.items)
                ? reel.items
                : (reel?.edge_story_media_to_story_item?.edges?.map(e => e?.node) || []);

            console.log(`[IG Tools Interações] processReelItems chamado para reel ${reelId} (isHighlight: ${isHighlight}). Total de itens:`, items.length);

            if (items.length > 0 && reelId) {
                processedReelIds.add(reelId);
                if (reelId.startsWith('highlight:')) processedReelIds.add(reelId.replace(/^highlight:/, ''));
                else processedReelIds.add(`highlight:${reelId}`);
            }

            for (const it of items) {
                processSingleStoryItem(it, isHighlight, cleanHighlightId);
            }
        }

        function findStoryItemsRecursively(obj, out = [], depth = 0) {
            if (!obj || depth > 45) return out;
            if (Array.isArray(obj)) {
                for (const it of obj) {
                    findStoryItemsRecursively(it, out, depth + 1);
                }
                return out;
            }
            if (typeof obj === 'object') {
                const isStoryCandidate = (obj.id || obj.pk) && (
                    'has_liked' in obj || 'viewer_has_liked' in obj || 'story_like' in obj ||
                    'viewer_interaction' in obj || 'image_versions2' in obj || 'display_url' in obj ||
                    obj.media_type === 1 || obj.media_type === 2
                );
                if (isStoryCandidate) {
                    out.push(obj);
                }
                if (Array.isArray(obj.items)) {
                    for (const it of obj.items) {
                        if (it && typeof it === 'object' && (it.id || it.pk)) {
                            out.push(it);
                        }
                    }
                }
                for (const key of Object.keys(obj)) {
                    if (key !== 'items' && typeof obj[key] === 'object' && obj[key] !== null) {
                        findStoryItemsRecursively(obj[key], out, depth + 1);
                    }
                }
            }
            return out;
        }

        function extractPolarisStoryItems(htmlText) {
            const itemsFound = [];
            if (!htmlText || typeof htmlText !== 'string') return itemsFound;

            const trimmed = htmlText.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    findStoryItemsRecursively(parsed, itemsFound);
                    if (itemsFound.length > 0) return itemsFound;
                } catch (_) {}
            }

            const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
            let match;
            while ((match = scriptRegex.exec(htmlText)) !== null) {
                const content = match[1];
                if (!content || (!content.includes('has_liked') && !content.includes('viewer_has_liked') && !content.includes('story_like') && !content.includes('"items"') && !content.includes('reels_media') && !content.includes('display_url'))) continue;

                const sTrimmed = content.trim();
                if (sTrimmed.startsWith('{') || sTrimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(sTrimmed);
                        findStoryItemsRecursively(parsed, itemsFound);
                    } catch (_) {}
                } else {
                    const start = content.indexOf('{');
                    const end = content.lastIndexOf('}');
                    if (start !== -1 && end > start) {
                        try {
                            const parsed = JSON.parse(content.substring(start, end + 1));
                            findStoryItemsRecursively(parsed, itemsFound);
                        } catch (_) {}
                    }
                }
            }

            try {
                const itemsBlocks = htmlText.match(/"items"\s*:\s*(\[\s*\{[\s\S]*?\}\s*\])/g);
                if (itemsBlocks) {
                    for (const block of itemsBlocks) {
                        const arrStr = block.replace(/^"items"\s*:\s*/, '');
                        try {
                            const arr = JSON.parse(arrStr);
                            findStoryItemsRecursively(arr, itemsFound);
                        } catch (_) {}
                    }
                }
            } catch (_) {}

            if (itemsFound.length === 0) {
                const matches = htmlText.matchAll(/\{[^{}]*?"(?:has_liked|viewer_has_liked|story_like)"\s*:[^{}]*?\}/g);
                for (const m of matches) {
                    try {
                        const parsedItem = JSON.parse(m[0]);
                        if (parsedItem && (parsedItem.id || parsedItem.pk)) {
                            itemsFound.push(parsedItem);
                        }
                    } catch (_) {}
                }
            }

            return itemsFound;
        }

        const csrfToken = getCookie('csrftoken') || '';
        const baseApiHeaders = {
            'X-IG-App-ID': '936619743392459',
            'X-ASBD-ID': '129477',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*'
        };

        // Camada 1: Polaris GraphQL Oficial
        if (targetUserId) {
            try {
                console.log(`[IG Tools Interações] Buscando Stories 24h e Destaques via Polaris GraphQL para ${targetUserId} (@${cleanUsername})...`);
                const gqlHlUrl = `https://www.instagram.com/graphql/query/?query_hash=d4d88dc1500312af6f937f7b804c68c3&variables=${encodeURIComponent(JSON.stringify({ user_id: String(targetUserId), include_highlight_reels: true, include_reel: true }))}`;
                const gqlRes = await fetch(gqlHlUrl, {
                    headers: baseApiHeaders,
                    credentials: 'include'
                });
                if (gqlRes.ok) {
                    const gqlData = await gqlRes.json();
                    console.log("[IG Tools Interações] Resposta Camada 1 Polaris GraphQL (Stories/Destaques):", gqlData);

                    const userReel = gqlData?.data?.user?.reel;
                    if (userReel) {
                        console.log(`[IG Tools Interações] Polaris GraphQL retornou Stories 24h ativos para @${cleanUsername}:`, userReel);
                        processReelItems(userReel, false);
                    }

                    const edges = gqlData?.data?.user?.edge_highlight_reels?.edges || [];
                    for (const edge of edges) {
                        const node = edge?.node;
                        const hId = node?.id;
                        if (hId) {
                            const rawHlId = String(hId);
                            const hlIdStr = rawHlId.startsWith('highlight:') ? rawHlId : `highlight:${rawHlId}`;
                            highlightIdsSet.add(hlIdStr);
                        }
                        if (Array.isArray(node?.items) && node.items.length > 0) {
                            processReelItems(node, true);
                        }
                    }
                    if (edges.length > 0) {
                        console.log(`[IG Tools Interações] Polaris GraphQL retornou ${edges.length} destaque(s). Exemplo node:`, edges[0]?.node);
                    }
                }
            } catch (eGqlHl) {
                console.warn("[IG Tools Interações] Erro ao consultar Polaris GraphQL:", eGqlHl);
            }
        }

        // Camada 2: web_profile_info estruturado
        if (highlightIdsSet.size === 0) {
            try {
                console.log(`[IG Tools Interações] Buscando destaques via web_profile_info para @${cleanUsername}...`);
                const profileData = await safeFetchProfileInfo(cleanUsername);
                const hlEdges = profileData?.data?.user?.edge_highlight_reels?.edges || [];
                for (const edge of hlEdges) {
                    const hId = edge?.node?.id;
                    if (hId) {
                        const rawHlId = String(hId);
                        const hlIdStr = rawHlId.startsWith('highlight:') ? rawHlId : `highlight:${rawHlId}`;
                        highlightIdsSet.add(hlIdStr);
                    }
                }
                if (hlEdges.length > 0) {
                    console.log(`[IG Tools Interações] web_profile_info retornou ${hlEdges.length} destaque(s).`);
                }
            } catch (eInfo) {
                console.warn("[IG Tools Interações] Erro ao consultar web_profile_info para destaques:", eInfo);
            }
        }

        // Camada 3: Verificação direta do DOM
        try {
            const currentPath = (window.location.pathname || '').replace(/^\/|\/$/g, '').toLowerCase().split('/')[0];
            if (currentPath === cleanUsername && typeof document !== 'undefined') {
                document.querySelectorAll('a[href*="/stories/highlights/"]').forEach(a => {
                    const m = (a.getAttribute('href') || '').match(/\/stories\/highlights\/(\d+)/);
                    if (m && m[1]) highlightIdsSet.add(`highlight:${m[1]}`);
                });

                const currentHl = (window.location.href || '').match(/\/stories\/highlights\/(\d+)/);
                if (currentHl && currentHl[1]) highlightIdsSet.add(`highlight:${currentHl[1]}`);
            }
        } catch (eDom) {
            console.warn("[IG Tools Interações] Verificação DOM de destaques:", eDom);
        }

        // Camada 4: Fallback HTML do perfil
        try {
            console.log(`[IG Tools Interações] Analisando página do perfil @${cleanUsername} para descobrir destaques...`);
            const profileHtmlRes = await fetch(`https://www.instagram.com/${cleanUsername}/`, {
                credentials: 'include',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (profileHtmlRes.ok) {
                const htmlText = await profileHtmlRes.text();
                const hlMatches = htmlText.matchAll(/\/stories\/highlights\/(\d+)/g);
                for (const match of hlMatches) {
                    if (match[1]) highlightIdsSet.add(`highlight:${match[1]}`);
                }
                const jsonMatches = htmlText.matchAll(/"(?:id|reel_id)":\s*"?highlight:(\d+)"?/g);
                for (const match of jsonMatches) {
                    if (match[1]) highlightIdsSet.add(`highlight:${match[1]}`);
                }
                const hlKeyMatches = htmlText.matchAll(/"highlight:(\d+)"/g);
                for (const match of hlKeyMatches) {
                    if (match[1]) highlightIdsSet.add(`highlight:${match[1]}`);
                }

                const profileItems = extractPolarisStoryItems(htmlText);
                if (profileItems.length > 0) {
                    console.log(`[IG Tools Interações] Encontrados ${profileItems.length} itens embutidos no HTML do perfil.`);
                    for (const it of profileItems) {
                        processSingleStoryItem(it, true, '');
                    }
                }
            }
        } catch (eHlHtml) {
            console.warn("[IG Tools Interações] Fallback HTML de perfil:", eHlHtml);
        }

        // --- ETAPA A: Stories 24h via Rota Polaris Web ---
        try {
            console.log(`[IG Tools Interações] Verificando Stories 24h para @${cleanUsername}...`);
            const storyPageRes = await fetch(`https://www.instagram.com/stories/${cleanUsername}/`, {
                credentials: 'include',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (storyPageRes.ok) {
                const storyHtml = await storyPageRes.text();
                const storyItems = extractPolarisStoryItems(storyHtml);
                console.log(`[IG Tools Interações] Stories 24h: extraídos ${storyItems.length} itens via Polaris HTML.`);
                for (const it of storyItems) {
                    processSingleStoryItem(it, false, '');
                }
            }
        } catch (errStoryHtml) {
            console.warn("[IG Tools Interações] Falha ao verificar rota HTML de stories 24h:", errStoryHtml);
        }

        // --- ETAPA B: Destaques (Highlights) via Rotas Polaris Web Oficiais ---
        const pendingHighlights = Array.from(highlightIdsSet).map(id => id.replace(/^highlight:/, ''));
        console.log(`[IG Tools Interações] Buscando mídias de ${pendingHighlights.length} destaque(s) identificados:`, pendingHighlights);

        for (const cleanHlId of pendingHighlights) {
            if (processedReelIds.has(cleanHlId) || processedReelIds.has(`highlight:${cleanHlId}`)) continue;
            processedReelIds.add(cleanHlId);
            processedReelIds.add(`highlight:${cleanHlId}`);

            try {
                const hlUrl = `https://www.instagram.com/stories/highlights/${cleanHlId}/`;
                const hlRes = await fetch(hlUrl, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'same-origin'
                    }
                });

                if (hlRes.ok) {
                    const hlHtml = await hlRes.text();
                    console.log(`[IG Tools DEBUG Destaque ${cleanHlId}] HTTP ${hlRes.status}, tamanho: ${hlHtml.length}. Amostra:`, hlHtml.substring(0, 300));
                    const extractedItems = extractPolarisStoryItems(hlHtml);
                    console.log(`[IG Tools Interações] Destaque ${cleanHlId}: extraídos ${extractedItems.length} item(ns) do HTML Polaris.`);
                    for (const it of extractedItems) {
                        processSingleStoryItem(it, true, cleanHlId);
                    }
                } else {
                    console.warn(`[IG Tools Interações] Rota do destaque ${cleanHlId} retornou HTTP ${hlRes.status}`);
                }
            } catch (errHlRoute) {
                console.warn(`[IG Tools Interações] Erro ao carregar mídias do destaque ${cleanHlId}:`, errHlRoute);
            }

            await new Promise(r => setTimeout(r, 150));
        }

        if (window._igRecentStoryItemsMap && window._igRecentStoryItemsMap.size > 0) {
            for (const [, item] of window._igRecentStoryItemsMap) {
                const isHl = item.reel_type === 'highlight_reel' || Boolean(item.highlight_id);
                processSingleStoryItem(item, isHl, item.highlight_id || '');
            }
            window._igRecentStoryItemsMap.clear();
        }

        scanDomForLikedStories();

        // PURGA ABSOLUTA DE DESDUPLICAÇÃO
        const feedPostIds = new Set(likedPosts.map(p => p.id));
        for (let i = likedHighlights.length - 1; i >= 0; i--) {
            if (feedPostIds.has(likedHighlights[i].id)) {
                console.log(`[IG Tools Desduplicação] Removendo destaque duplicado do feed: ${likedHighlights[i].id}`);
                likedHighlights.splice(i, 1);
            }
        }
        for (let i = likedStories.length - 1; i >= 0; i--) {
            if (feedPostIds.has(likedStories[i].id)) {
                console.log(`[IG Tools Desduplicação] Removendo story duplicado do feed: ${likedStories[i].id}`);
                likedStories.splice(i, 1);
            }
        }

        console.log(`[IG Tools Interações] @${cleanUsername}: ${totalPostsFound} publicações analisadas. Curtidas encontradas: ${likedPosts.length}. Stories curtidos: ${likedStories.length}. Destaques curtidos: ${likedHighlights.length}`);

        return {
            likedPosts,
            likedStories,
            likedHighlights,
            total: likedPosts.length + likedStories.length + likedHighlights.length
        };
    }

    // Função de teste rápido
    const testarDestaquesUsuario = async function(target = 'kellyyamada_') {
        console.log(`%c[IG Tools TESTE RÁPIDO] Testando DESTAQUES de @${target}...`, 'color: yellow; background: purple; font-size: 14px; font-weight: bold;');
        try {
            const uId = await getUserId(target);
            console.log(`[IG Tools TESTE] ID do usuário @${target}: ${uId}`);
            const res = await fetchUserInteractionsData(target, uId, (msg, pct) => {
                console.log(`[TESTE ${pct}%] ${msg}`);
            }, 1);
            console.log(`%c[IG Tools TESTE CONCLUÍDO] Destaques encontrados: ${res.likedHighlights.length}`, 'color: #00ffaa; background: #003311; font-size: 15px; font-weight: bold;', res.likedHighlights);
            if (res.likedHighlights.length > 0) {
                console.table(res.likedHighlights.map(h => ({ Tipo: h.type, ID: h.id, URL: h.url })));
            }
            return res;
        } catch (e) {
            console.error('[IG Tools TESTE ERRO]', e);
        }
    };

    function renderSubrowInteracoesContent(username, data, containerEl, btnEl) {
        const isDark = document.body.classList.contains('dark-mode') || document.querySelector('.dark-mode');
        const allItems = [
            ...data.likedPosts,
            ...data.likedStories,
            ...data.likedHighlights
        ];

        let headerHtml = `
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(150,150,150,0.2);">
                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 13px; font-weight: 600;">
                    <span style="color: #0095f6;">Interações com @${username}:</span>
                    <span style="background: rgba(0, 149, 246, 0.12); color: #0095f6; padding: 2px 8px; border-radius: 12px; font-size: 11px;">📸 ${data.likedPosts.length} Posts</span>
                    <span style="background: rgba(231, 76, 60, 0.12); color: #e74c3c; padding: 2px 8px; border-radius: 12px; font-size: 11px;">⭕ ${data.likedStories.length} Stories</span>
                    <span style="background: rgba(243, 156, 18, 0.12); color: #f39c12; padding: 2px 8px; border-radius: 12px; font-size: 11px;">⭐ ${data.likedHighlights.length} Destaques</span>
                    <span style="font-weight: bold; font-size: 12px;">(Total: ${data.total})</span>
                </div>
                <button class="btn-recarregar-interacoes-subrow" style="background: transparent; border: 1px solid rgba(150,150,150,0.4); border-radius: 5px; padding: 3px 8px; font-size: 11px; cursor: pointer; color: inherit;">🔄 Recarregar</button>
            </div>
        `;

        if (allItems.length === 0) {
            containerEl.innerHTML = headerHtml + `
                <div style="text-align: center; padding: 12px; color: var(--ig-secondary-text, #888); font-size: 13px;">
                    Nenhuma curtida encontrada nas publicações recentes, stories ou destaques de @${username}.
                </div>
            `;
            const reloadBtn = containerEl.querySelector('.btn-recarregar-interacoes-subrow');
            if (reloadBtn) {
                reloadBtn.onclick = () => {
                    if (typeof window.carregarInteracoesUsuario === 'function') {
                        window.carregarInteracoesUsuario(username, btnEl?.dataset?.userid || null, containerEl, btnEl, true);
                    }
                };
            }
            return;
        }

        let gridHtml = `<div style="display: flex; flex-wrap: wrap; gap: 10px; max-height: 250px; overflow-y: auto; padding: 4px;">`;
        allItems.forEach((item) => {
            gridHtml += `
                <div class="item-interacao-card" data-id="${item.id}" style="position: relative; width: 90px; height: 115px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(150,150,150,0.25); background: ${isDark ? '#262626' : '#fff'}; box-shadow: 0 2px 6px rgba(0,0,0,0.1); flex-shrink: 0; display: flex; flex-direction: column;">
                    <div style="flex: 1; position: relative; cursor: pointer; overflow: hidden;" title="Abrir ${item.type}">
                        ${item.thumb ? `<img src="${item.thumb}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999;">${item.type}</div>`}
                        <span style="position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,0.7); color: white; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 600;">
                            ${item.type.includes('Post') ? 'Post' : item.type.includes('Destaque') ? 'Destaque' : 'Story'}
                        </span>
                    </div>
                    <button class="btn-unlike-subrow" title="Descurtir" style="position: absolute; bottom: 5px; right: 5px; width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,0.75); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; z-index: 5; transition: transform 0.15s, background 0.15s;">
                        💔
                    </button>
                </div>
            `;
        });
        gridHtml += `</div>`;

        containerEl.innerHTML = headerHtml + gridHtml;

        const reloadBtn = containerEl.querySelector('.btn-recarregar-interacoes-subrow');
        if (reloadBtn) {
            reloadBtn.onclick = () => {
                if (typeof window.carregarInteracoesUsuario === 'function') {
                    window.carregarInteracoesUsuario(username, btnEl?.dataset?.userid || null, containerEl, btnEl, true);
                }
            };
        }

        containerEl.querySelectorAll('.item-interacao-card').forEach((card) => {
            const itemId = card.dataset.id;
            const item = allItems.find(x => x.id === itemId);
            if (!item) return;

            const imgDiv = card.querySelector('div[title^="Abrir"]');
            if (imgDiv) {
                imgDiv.onclick = () => window.open(item.url, '_blank');
            }

            const unlikeBtn = card.querySelector('.btn-unlike-subrow');
            if (unlikeBtn) {
                unlikeBtn.onmouseover = () => { unlikeBtn.style.transform = "scale(1.15)"; unlikeBtn.style.background = "rgba(220, 38, 38, 0.9)"; };
                unlikeBtn.onmouseout = () => { unlikeBtn.style.transform = "scale(1)"; unlikeBtn.style.background = "rgba(0,0,0,0.75)"; };
                unlikeBtn.onclick = async (e) => {
                    e.stopPropagation();
                    unlikeBtn.disabled = true;
                    unlikeBtn.style.opacity = "0.5";
                    const success = await unlikeMedia(item);
                    if (success) {
                        card.style.transition = 'opacity 0.2s, transform 0.2s';
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            card.remove();
                            const removeFromArray = (arr) => {
                                const i = arr.findIndex(x => x.id === item.id);
                                if (i !== -1) arr.splice(i, 1);
                            };
                            removeFromArray(data.likedPosts);
                            removeFromArray(data.likedStories);
                            removeFromArray(data.likedHighlights);
                            data.total = data.likedPosts.length + data.likedStories.length + data.likedHighlights.length;

                            if (btnEl) {
                                btnEl.innerHTML = `<span>${data.total > 0 ? `❤️ ${data.total}` : '0'}</span>`;
                                btnEl.style.background = data.total > 0 ? '#e74c3c' : '#7f8c8d';
                            }

                            renderSubrowInteracoesContent(username, data, containerEl, btnEl);
                        }, 200);
                    } else {
                        unlikeBtn.disabled = false;
                        unlikeBtn.style.opacity = "1";
                    }
                };
            }
        });
    }

    function abrirModalInteracoes() {
        if (document.getElementById("interacoesModal")) return;

        const div = document.createElement("div");
        div.id = "interacoesModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 92%; max-width: 650px; min-height: 480px; max-height: 90vh;
            border-radius: 10px; z-index: 10000; overflow-y: auto; overflow-x: hidden;
            display: flex; flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;
        if (loadSettings().rgbBorder) {
            div.classList.add('rgb-border-effect');
        }

        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    Verificar Interações
                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Verifique o que você curtiu de um usuário específico (Posts e Stories).</span></div>
                </span>
                <div class="modal-controls">
                    <button id="fecharInteracoesBtn" title="Fechar">X</button>
                </div>
            </div>
            <div class="loading-overlay" style="display: none;"><div class="spinner"></div><div class="loading-text"></div></div>
            <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <div style="flex: 1; position: relative;">
                        <input type="text" id="interacoesUsernameInput" class="interacoes-input" placeholder="Digite o username..." autocomplete="off">
                        <div id="interacoesSuggestions"></div>
                    </div>
                    <button id="verificarInteracoesBtn" style="background: #0095f6; color: white; border: none; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; transition: background 0.2s;">Verificar</button>
                </div>
                <div id="interacoesUserProfile" style="display: none; flex-direction: column; align-items: center; margin-bottom: 20px;">
                    <img id="interacoesUserPic" src="" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid #0095f6;">
                    <span id="interacoesUserNameDisplay" style="font-weight: bold; font-size: 16px;"></span>
                    <span id="interacoesUserBioDisplay" style="font-size: 14px; text-align: center; margin-top: 5px; max-width: 85%; line-height: 1.4;"></span>
                </div>
                <div id="interacoesResultados" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
                </div>
                <div id="interacoesDetalhes" style="margin-top: 15px; display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 id="detalhesTitulo" style="margin: 0; font-size: 16px;"></h3>
                        <button id="voltarCardsBtn" style="padding: 6px 14px; background: #0095f6; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">← Voltar</button>
                    </div>
                    <div id="detalhesLista" style="max-height: 320px; overflow-y: auto;"></div>
                </div>
            </div>
        `;
        toggleLoading(false);
        document.body.appendChild(div);

        document.getElementById("fecharInteracoesBtn").onclick = () => div.remove();

        const inputUsername = document.getElementById("interacoesUsernameInput");
        const suggestionsDiv = document.getElementById("interacoesSuggestions");
        let followingList = [];

        if (window.IGTools?.Storage?.dbHelper) {
            window.IGTools.Storage.dbHelper.loadCache('following').then(data => {
                if (data) {
                    if (data.details) {
                        followingList = Array.from(data.details.keys());
                    } else if (Array.isArray(data)) {
                        followingList = data.map(x => typeof x === 'object' ? (x.username || '') : String(x)).filter(Boolean);
                    } else if (data instanceof Set) {
                        followingList = Array.from(data).map(x => typeof x === 'object' ? (x.username || '') : String(x)).filter(Boolean);
                    }
                }
            });
        }

        inputUsername.addEventListener('input', () => {
            const val = inputUsername.value.toLowerCase();
            suggestionsDiv.innerHTML = '';
            if (!val) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            const matches = followingList.filter(u => u.toLowerCase().includes(val)).slice(0, 10);
            if (matches.length > 0) {
                matches.forEach(u => {
                    const item = document.createElement('div');
                    item.style.cssText = 'padding: 10px 14px; cursor: pointer; border-bottom: 1px solid rgba(150,150,150,0.1); font-size: 14px; color: var(--ig-primary-text, inherit); display: flex; align-items: center; gap: 8px; transition: background 0.15s;';
                    item.innerText = u;
                    item.onmouseover = () => item.style.background = 'rgba(150, 150, 150, 0.15)';
                    item.onmouseout = () => item.style.background = 'transparent';
                    item.onclick = () => {
                        inputUsername.value = u;
                        suggestionsDiv.style.display = 'none';
                    };
                    suggestionsDiv.appendChild(item);
                });
                suggestionsDiv.style.display = 'block';
            } else {
                suggestionsDiv.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target !== inputUsername && e.target !== suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
        });

        let dataEuCurti = null;

        document.getElementById("verificarInteracoesBtn").onclick = async () => {
            const username = document.getElementById("interacoesUsernameInput").value.trim();
            if (!username) return alert("Digite um username.");

            const btn = document.getElementById("verificarInteracoesBtn");
            btn.disabled = true;
            btn.textContent = "Verificando...";
            toggleLoading(true, null, "Verificando interações...");

            const resultadosDiv = document.getElementById("interacoesResultados");
            const profileDiv = document.getElementById("interacoesUserProfile");

            resultadosDiv.innerHTML = '<p class="interacoes-status-text" style="text-align: center; padding: 20px; font-size: 14px; font-weight: 500;">Carregando interações...</p>';
            document.getElementById("interacoesDetalhes").style.display = "none";
            profileDiv.style.display = "none";

            let photoUrl = DEFAULT_AVATAR;
            let bio = '';
            const cleanUsername = username.toLowerCase();

            if (typeof window.cachedData !== 'undefined' && window.cachedData?.userDetails?.has(cleanUsername)) {
                const cached = window.cachedData.userDetails.get(cleanUsername);
                if (cached?.profile_pic_url) photoUrl = cached.profile_pic_url;
                if (cached?.biography) bio = cached.biography;
            }

            let targetUserId = await getUserId(username);

            if (targetUserId) {
                try {
                    const hoverData = await executeGraphqlUserHoverCard(targetUserId);
                    if (hoverData) {
                        if (hoverData.profilePicUrl) photoUrl = hoverData.profilePicUrl;
                        if (hoverData.biography) bio = hoverData.biography;
                    }
                } catch (_) { }
            }

            if (photoUrl === DEFAULT_AVATAR) {
                try {
                    const info = await safeFetchProfileInfo(username);
                    if (info && info.data?.user) {
                        photoUrl = info.data.user.profile_pic_url || photoUrl;
                        bio = info.data.user.biography || bio;
                    }
                } catch (_) { }
            }

            document.getElementById("interacoesUserPic").src = photoUrl;
            document.getElementById("interacoesUserNameDisplay").innerText = username;
            document.getElementById("interacoesUserBioDisplay").innerText = bio;
            profileDiv.style.display = "flex";

            try {
                if (!targetUserId) {
                    throw new Error("Não foi possível obter o ID do usuário.");
                }

                resultadosDiv.innerHTML = '<p class="interacoes-status-text" style="text-align: center; padding: 20px; font-size: 14px; font-weight: 500;">Analisando publicações, stories e destaques via GraphQL/API...</p>';

                const data = await fetchUserInteractionsData(cleanUsername, targetUserId, (msg, pct) => {
                    toggleLoading(true, pct, msg);
                    const textEl = document.querySelector("#interacoesResultados .interacoes-status-text");
                    if (textEl) textEl.innerText = msg;
                }, 25);

                const dadosReais = {
                    fotosCurtidas: { count: data.likedPosts.length, items: data.likedPosts },
                    storiesCurtidos: { count: data.likedStories.length, items: data.likedStories },
                    destaquesCurtidos: { count: data.likedHighlights.length, items: data.likedHighlights },
                    comentarios: { count: 0, items: [] }
                };
                dataEuCurti = dadosReais;
                renderizarCardsInteracoes(dadosReais);

            } catch (e) {
                console.error(e);
                resultadosDiv.innerHTML = `<p style="color:red;">Erro ao buscar dados: ${e.message}</p>`;
            } finally {
                toggleLoading(false);
                btn.disabled = false;
                btn.textContent = "Verificar";
            }
        };

        function renderizarCardsInteracoes(dados) {
            const container = document.getElementById("interacoesResultados");
            container.innerHTML = '';

            const mapLabels = {
                fotosCurtidas: 'Fotos Curtidas',
                storiesCurtidos: 'Stories Curtidos',
                destaquesCurtidos: 'Destaques Curtidos',
                comentarios: 'Comentários'
            };

            const isDarkMode = document.body.classList.contains('dark-mode') || loadSettings().darkMode;

            for (const [key, data] of Object.entries(dados)) {
                const card = document.createElement("div");
                card.className = "interacoes-stat-card";

                const bgCard = isDarkMode ? "#ffffff" : "#262626";
                const textCard = isDarkMode ? "#262626" : "#ffffff";
                const borderCard = isDarkMode ? "1px solid #e0e0e0" : "1px solid #3d3d3d";
                const shadowCard = isDarkMode ? "0 4px 14px rgba(0, 0, 0, 0.15)" : "0 4px 14px rgba(0, 0, 0, 0.25)";

                card.style.cssText = `
                    border: ${borderCard};
                    border-radius: 12px;
                    padding: 18px 12px;
                    text-align: center;
                    cursor: pointer;
                    background: ${bgCard};
                    color: ${textCard};
                    box-shadow: ${shadowCard};
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                `;
                card.innerHTML = `
                    <div class="card-count" style="font-size: 26px; font-weight: 700; color: #0095f6; margin-bottom: 6px; font-family: inherit;">${data.count}</div>
                    <div class="card-label" style="font-size: 13px; font-weight: 600; color: ${textCard}; font-family: inherit;">${mapLabels[key] || key}</div>
                `;
                card.onmouseover = () => {
                    card.style.transform = "translateY(-3px)";
                    card.style.boxShadow = isDarkMode ? "0 8px 20px rgba(0, 0, 0, 0.25)" : "0 8px 20px rgba(0, 0, 0, 0.4)";
                };
                card.onmouseout = () => {
                    card.style.transform = "translateY(0)";
                    card.style.boxShadow = shadowCard;
                };
                card.onclick = () => mostrarDetalhesInteracao(mapLabels[key] || key, data.items);
                container.appendChild(card);
            }
        }

        function mostrarDetalhesInteracao(titulo, itens) {
            document.getElementById("interacoesResultados").style.display = "none";
            const detalhesDiv = document.getElementById("interacoesDetalhes");
            detalhesDiv.style.display = "block";
            document.getElementById("detalhesTitulo").innerText = `${titulo} (${itens.length})`;

            const lista = document.getElementById("detalhesLista");
            lista.innerHTML = '';

            const isDark = document.body.classList.contains('dark-mode') || loadSettings().darkMode;

            if (itens.length === 0) {
                lista.innerHTML = '<p style="color: var(--ig-secondary-text, #a8a8a8); text-align: center; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">Nenhum item encontrado.</p>';
            } else {
                const grid = document.createElement("div");
                grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; padding: 4px;";
                itens.forEach(item => {
                    const div = document.createElement("div");
                    div.style.cssText = `aspect-ratio: 1; overflow: hidden; border-radius: 8px; border: 1px solid ${isDark ? '#444' : '#dbdbdb'}; cursor: pointer; position: relative; background: ${isDark ? '#000' : '#f5f5f5'}; box-shadow: 0 2px 8px rgba(0,0,0,0.15);`;

                    const contentDiv = document.createElement("div");
                    contentDiv.style.cssText = "width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;";

                    if (item.thumb) {
                        contentDiv.innerHTML = `<img src="${item.thumb}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        contentDiv.onclick = () => window.open(item.url, '_blank');
                    } else {
                        contentDiv.innerHTML = `<span style="font-size: 12px; color: ${isDark ? '#aaa' : '#666'}; text-align: center; padding: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${item.type}</span>`;
                        contentDiv.onclick = () => window.open(item.url, '_blank');
                    }
                    div.appendChild(contentDiv);

                    if (item.id) {
                        const unlikeBtn = document.createElement("button");
                        unlikeBtn.innerHTML = "💔";
                        unlikeBtn.title = "Descurtir";
                        unlikeBtn.style.cssText = "position: absolute; bottom: 6px; right: 6px; width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(0,0,0,0.75); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; z-index: 10; transition: transform 0.15s, background 0.15s;";
                        unlikeBtn.onmouseover = () => { unlikeBtn.style.transform = "scale(1.15)"; unlikeBtn.style.background = "rgba(220, 38, 38, 0.9)"; };
                        unlikeBtn.onmouseout = () => { unlikeBtn.style.transform = "scale(1)"; unlikeBtn.style.background = "rgba(0,0,0,0.75)"; };
                        unlikeBtn.onclick = async (e) => {
                            e.stopPropagation();
                            unlikeBtn.disabled = true;
                            unlikeBtn.style.opacity = "0.5";
                            const success = await unlikeMedia(item);
                            if (success) {
                                div.remove();
                                const idx = itens.indexOf(item);
                                if (idx !== -1) itens.splice(idx, 1);
                                document.getElementById("detalhesTitulo").innerText = `${titulo} (${itens.length})`;

                                if (titulo.includes('Foto') || titulo.includes('Post')) {
                                    if (dataEuCurti?.fotosCurtidas) dataEuCurti.fotosCurtidas.count = itens.length;
                                } else if (titulo.includes('Destaque')) {
                                    if (dataEuCurti?.destaquesCurtidos) dataEuCurti.destaquesCurtidos.count = itens.length;
                                } else if (titulo.includes('Stori')) {
                                    if (dataEuCurti?.storiesCurtidos) dataEuCurti.storiesCurtidos.count = itens.length;
                                }
                                renderizarCardsInteracoes(dataEuCurti);

                                if (itens.length === 0) {
                                    lista.innerHTML = '<p style="color: var(--ig-secondary-text, #a8a8a8); text-align: center; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">Nenhum item restante.</p>';
                                }
                            } else {
                                unlikeBtn.disabled = false;
                                unlikeBtn.style.opacity = "1";
                            }
                        };
                        div.appendChild(unlikeBtn);
                    }

                    grid.appendChild(div);
                });
                lista.appendChild(grid);
            }

            document.getElementById("voltarCardsBtn").onclick = () => {
                detalhesDiv.style.display = "none";
                document.getElementById("interacoesResultados").style.display = "grid";
            };
        }
    }

    // Exporta módulo para o barramento window.IGTools e escopo global
    window.IGTools.ProfileInteractions = {
        executeGraphqlUnlikeStory,
        executeGraphqlUnlikePost,
        unlikeMedia,
        fetchUserInteractionsData,
        testarDestaquesUsuario,
        renderSubrowInteracoesContent,
        abrirModalInteracoes
    };

    window.unlikeMedia = unlikeMedia;
    window.fetchUserInteractionsData = fetchUserInteractionsData;
    window.testarDestaquesUsuario = testarDestaquesUsuario;
    window.testarInteracoesUsuario = testarDestaquesUsuario;
    window.renderSubrowInteracoesContent = renderSubrowInteracoesContent;
    window.abrirModalInteracoes = abrirModalInteracoes;
})();
