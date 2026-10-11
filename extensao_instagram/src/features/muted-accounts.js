// ========================================================
// MÓDULO DE CONTAS SILENCIADAS (MUTED ACCOUNTS)
// Gerenciamento e silenciamento de Stories e Publicações via Polaris GraphQL
// ========================================================

(function () {
    window.IGTools = window.IGTools || {};

    const DEFAULT_AVATAR = window.DEFAULT_AVATAR || "https://instagram.com/static/images/ico/favicon.ico/dfa40056e63a.ico";
    const infoIcon = `<svg aria-label="Informações" fill="currentColor" height="12" role="img" viewBox="0 0 24 24" width="12" style="cursor:help; opacity:0.6;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"></circle><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"></line><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2"></line></svg>`;

    // Helpers compartilhados e fallbacks de barramento
    const getActorId = () => (typeof window.getActorId === 'function' ? window.getActorId() : '') || (typeof window.getCookie === 'function' ? window.getCookie('ds_user_id') : '') || '';
    const getCookie = (name) => (typeof window.getCookie === 'function' ? window.getCookie(name) : '') || '';
    const getLoggedInUsername = () => (typeof window.getLoggedInUsername === 'function' ? window.getLoggedInUsername() : '') || '';
    const getMainWorldTokens = () => (typeof window.getMainWorldTokens === 'function' ? window.getMainWorldTokens() : {});
    const getLsdToken = () => (typeof window.getLsdToken === 'function' ? window.getLsdToken() : '') || (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken('lsd') : '') || '';
    const getDtsgToken = () => (typeof window.getDtsgToken === 'function' ? window.getDtsgToken() : '') || (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken('fb_dtsg') : '') || '';
    const computeJazoest = (dtsg) => (typeof window.computeJazoest === 'function' ? window.computeJazoest(dtsg) : '25862');
    const getSpinParams = () => (typeof window.getSpinParams === 'function' ? window.getSpinParams() : { spin_r: '1048608279', spin_b: 'trunk', spin_t: '' });
    const getInstagramFormToken = (name) => (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken(name) : '');
    const getApiHeaders = (isGql = false) => (typeof window.getApiHeaders === 'function' ? window.getApiHeaders(isGql) : {});
    const getCachedUserId = (user) => (typeof window.getCachedUserId === 'function' ? window.getCachedUserId(user) : null);
    const setCachedUserId = (user, id) => (typeof window.setCachedUserId === 'function' ? window.setCachedUserId(user, id) : null);
    const showToast = (msg, dur) => (window.IGTools?.DOMUtils?.showToast ? window.IGTools.DOMUtils.showToast(msg, dur) : (typeof window.showToast === 'function' ? window.showToast(msg, dur) : null));
    const createCancellableProgressBar = () => (typeof window.createCancellableProgressBar === 'function' ? window.createCancellableProgressBar() : { bar: document.createElement('div'), update: () => { }, closeButton: document.createElement('button') });
    const loadSettings = () => (window.IGTools?.Storage?.loadSettings ? window.IGTools.Storage.loadSettings() : (typeof window.loadSettings === 'function' ? window.loadSettings() : {}));
    const saveSettings = (s) => (window.IGTools?.Storage?.saveSettings ? window.IGTools.Storage.saveSettings(s) : (typeof window.saveSettings === 'function' ? window.saveSettings(s) : null));
    const getDbHelper = () => (window.IGTools?.Storage?.dbHelper || window.dbHelper || { loadCache: async () => [], getCache: () => [], _cache: {} });
    const isValidInstagramUsername = (u) => {
        if (!u) return false;
        if (typeof window.isValidInstagramUsername === 'function') return window.isValidInstagramUsername(u);
        const clean = String(u).replace(/^@/, '').trim();
        return /^[a-zA-Z0-9._]{1,30}$/.test(clean);
    };
    const makeDraggable = (el) => (typeof window.makeDraggable === 'function' ? window.makeDraggable(el) : null);
    const getUserListCache = () => {
        if (!window.userListCache) {
            window.userListCache = {
                muted: null,
                mutedDetails: new Map(),
                closeFriends: null,
                hiddenStory: null
            };
        }
        return window.userListCache;
    };
    let cachedMutedAccounts = window.cachedMutedAccounts || [];

    // --- EXECUÇÃO GRAPHQL POLARIS (RELAY MODERN) ---
    async function executeGraphqlMute(uid, targetType = 'stories', action = 'mute') {
        if (!uid) return { success: false, error: 'no_uid' };

        const viewerId = getCookie('ds_user_id') || getInstagramFormToken('av') || '';
        const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
        const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
        const jazoest = computeJazoest(fbDtsg) || '26367';
        const spin = typeof getSpinParams === 'function' ? getSpinParams() : {};

        const isStory = targetType === 'stories';
        const isUnmute = action === 'unmute';

        let friendlyName = '';
        let docId = '';
        let variables = {};

        if (isStory) {
            friendlyName = isUnmute ? 'usePolarisUnmuteStoryMutation' : 'usePolarisMuteStoryMutation';
            docId = isUnmute ? '27418767487792418' : '27469196189379050';
            variables = { target_reel_author_id: String(uid) };
        } else {
            friendlyName = isUnmute ? 'usePolarisUnmutePostsMutation' : 'usePolarisMutePostsMutation';
            docId = isUnmute ? '26763085236678376' : '36105467102431300';
            variables = { target_posts_author_id: String(uid) };
        }

        console.log(`[IG Tools Mute] Enviando mutação GraphQL (${friendlyName}):`, variables);

        const body = new URLSearchParams({
            __comet_req: '7',
            fb_api_caller_class: 'RelayModern',
            fb_api_req_friendly_name: friendlyName,
            server_timestamps: 'true',
            variables: JSON.stringify(variables),
            doc_id: docId
        });

        if (viewerId) body.append('av', viewerId);
        if (fbDtsg) body.append('fb_dtsg', fbDtsg);
        if (jazoest) body.append('jazoest', jazoest);
        if (lsd) body.append('lsd', lsd);
        if (spin.spin_r) body.append('__spin_r', spin.spin_r);
        if (spin.spin_b) body.append('__spin_b', spin.spin_b);
        if (spin.spin_t) body.append('__spin_t', spin.spin_t);

        const headers = {
            ...(typeof getApiHeaders === 'function' ? getApiHeaders(true) : {}),
            'X-FB-LSD': lsd,
            'X-FB-Friendly-Name': friendlyName
        };

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
        } catch (e) {
            const lines = cleanedText.split('\n');
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line.replace(/^for \(;;\);/, '').trim());
                    if (parsed?.data || parsed?.errors) {
                        data = parsed;
                        break;
                    }
                } catch (_) { }
            }
        }

        console.log(`[IG Tools Mute] Resposta GraphQL (${friendlyName}):`, {
            status: response.status,
            ok: response.ok,
            data,
            rawPreview: rawText.slice(0, 200)
        });

        const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0;
        const mutationData = data?.data;
        const success = response.ok && !hasErrors && (mutationData !== null && mutationData !== undefined);

        return { response, success, data, rawText };
    }

    async function executePolarisMute(uid, username = '', action = 'mute', targetType = 'all') {
        if (!uid && username) uid = getCachedUserId(username) || await getUserId(username);
        if (!uid) return { success: false, error: 'no_uid' };

        // Execução direta e exclusiva via mutações GraphQL Relay oficiais do Instagram Polaris:
        // (usePolarisUnmuteStoryMutation / usePolarisMuteStoryMutation e usePolarisUnmutePostsMutation / usePolarisMutePostsMutation)
        try {
            let successStories = false;
            let successPosts = false;

            if (targetType === 'stories' || targetType === 'all') {
                const res = await executeGraphqlMute(uid, 'stories', action);
                successStories = !!res?.success;
            }
            if (targetType === 'posts' || targetType === 'all') {
                const res = await executeGraphqlMute(uid, 'posts', action);
                successPosts = !!res?.success;
            }

            if (successStories || successPosts) {
                console.log(`[IG Tools Mute] Sucesso via GraphQL Relay Polaris (${action} ${targetType}) para UID ${uid}`);
                return { success: true, isGraphql: true };
            }
        } catch (gqlErr) {
            console.warn('[IG Tools Mute] Erro na mutação GraphQL Relay:', gqlErr);
            return { success: false, error: gqlErr.message || 'Falha GraphQL' };
        }

        return { success: false, error: 'Falha na mutação GraphQL Relay' };
    }

    // Modal de Opções de Mute (Stories, Posts, Ambos)
    function showMuteOptionsModal(actionType = 'mute', onConfirm) {
        const isMute = actionType === 'mute';
        const div = document.createElement("div");
        div.className = "submenu-modal";
        div.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 340px; padding: 22px; border: 1px solid #dbdbdb; border-radius: 12px; z-index: 2147483648; text-align: center; background: white; color: #262626; box-shadow: 0 10px 35px rgba(0,0,0,0.35);`;
        if (typeof loadSettings === 'function' && loadSettings().rgbBorder) div.classList.add('rgb-border-effect');

        div.innerHTML = `
            <h3 style="margin-top:0; font-size: 17px; font-weight: 700; color: inherit;">${isMute ? '🔇 O que deseja silenciar?' : '🔊 O que deseja reativar?'}</h3>
            <p style="font-size: 13px; color: #777; margin: 6px 0 16px 0;">Escolha o tipo de conteúdo para aplicar a alteração:</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="optStories" style="padding: 10px; cursor: pointer; background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; font-weight: 600; color: inherit; transition: background 0.2s;">Stories</button>
                <button id="optPosts" style="padding: 10px; cursor: pointer; background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; font-weight: 600; color: inherit; transition: background 0.2s;">Publicações</button>
                <button id="optAll" style="padding: 10px; cursor: pointer; background: ${isMute ? '#e67e22' : '#27ae60'}; color: white; border: none; border-radius: 8px; font-weight: 700;">Ambos (Stories e Publicações)</button>
                <button id="optCancel" style="padding: 10px; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600;">Cancelar</button>
            </div>
        `;
        document.body.appendChild(div);
        const close = () => div.remove();
        document.getElementById('optStories').onclick = () => { close(); onConfirm('stories'); };
        document.getElementById('optPosts').onclick = () => { close(); onConfirm('posts'); };
        document.getElementById('optAll').onclick = () => { close(); onConfirm('all'); };
        document.getElementById('optCancel').onclick = close;
    }

    // Cache local em memória
    try {
        const saved = localStorage.getItem('ig_tools_cached_muted') || localStorage.getItem('ig_tools_cache_muted');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cachedMutedAccounts = parsed;
            }
        }
    } catch (_) { }

    function scanMutedAccountsDomRows(doc = document) {
        const map = new Map();
        try {
            const userElements = Array.from(doc.querySelectorAll('div.wbloks_1, div[data-bloks-name="bk.components.Flexbox"]'))
                .filter(el => el.querySelector('div[aria-label*="Ver perfil"]') || (el.querySelector('img') && el.innerText && el.innerText.includes('\n')));

            userElements.forEach(userElement => {
                const spans = Array.from(userElement.querySelectorAll('span'));
                let username = spans.length > 0 ? spans[0].innerText.trim() : (userElement.innerText ? userElement.innerText.trim().split('\n')[0] : '');
                username = username.replace(/^@/, '').trim();
                if (username === 'Ver perfil' || !username || !isValidInstagramUsername(username)) return;

                const imgTag = userElement.querySelector('img');
                const photoUrl = imgTag ? imgTag.src : '';

                let status = "Silenciado";
                const statusSpan = spans.find(s => {
                    const t = s.innerText.toLowerCase();
                    return (t.includes('silenci') || t.includes('muted')) && t !== username.toLowerCase();
                });

                if (statusSpan) {
                    const stText = statusSpan.innerText.trim();
                    const stLower = stText.toLowerCase();
                    if ((stLower.includes('posts') || stLower.includes('publica')) && (stLower.includes('story') || stLower.includes('stories'))) {
                        status = "Stories e Publicações";
                    } else if (stLower.includes('story') || stLower.includes('stories')) {
                        status = "Stories";
                    } else if (stLower.includes('posts') || stLower.includes('publica')) {
                        status = "Publicações";
                    } else {
                        status = stText;
                    }
                }

                const pk = getCachedUserId(username) || '';
                map.set(username.toLowerCase(), {
                    username,
                    pk,
                    id: pk,
                    photoUrl: photoUrl || DEFAULT_AVATAR,
                    status,
                    isMuted: true
                });
            });
        } catch (e) {
            console.warn('[IG Tools Muted] scanMutedAccountsDomRows erro:', e);
        }
        return map;
    }

    function extractMutedAccountsUsernames(doc = document) {
        return new Promise((resolve) => {
            const users = new Map();
            let scrollInterval;
            let noNewUsersCount = 0;
            const maxIdleCount = 6;

            let cancelled = false;
            const { bar, update, closeButton } = createCancellableProgressBar();
            closeButton.onclick = () => {
                cancelled = true;
                finishExtraction();
            };
            update(0, 0, "Buscando e mapeando contas silenciadas...");

            function finishExtraction() {
                if (scrollInterval) clearInterval(scrollInterval);
                if (window._igMutedUsersCapture && window._igMutedUsersCapture.callbacks) {
                    const idx = window._igMutedUsersCapture.callbacks.indexOf(networkCallback);
                    if (idx !== -1) window._igMutedUsersCapture.callbacks.splice(idx, 1);
                }
                if (bar) bar.remove();
                console.log(`[IG Tools] Extração de silenciados finalizada. Total de ${users.size} contas encontradas.`);
                users.forEach(u => {
                    if (u.username && u.pk) setCachedUserId(u.username, u.pk);
                });
                resolve(cancelled ? [] : Array.from(users.values()));
            }

            // 1. Extração SSR Scripts
            try {
                const scripts = Array.from(doc.querySelectorAll('script[type="application/json"]'));
                for (const script of scripts) {
                    const text = script.textContent || '';
                    if (!text.includes('muted') && !text.includes('username')) continue;

                    const userRegex = /"username":"([a-zA-Z0-9._]+)"/g;
                    let match;
                    while ((match = userRegex.exec(text)) !== null) {
                        const uname = match[1];
                        if (!uname || uname === 'instagram' || uname === 'threads') continue;

                        const start = Math.max(0, match.index - 300);
                        const end = Math.min(text.length, match.index + 500);
                        const chunk = text.slice(start, end);

                        const picMatch = chunk.match(/"profile_pic_url":"([^"]+)"/);
                        const photoUrl = picMatch ? picMatch[1].replace(/\\/g, '').replace(/\\u0026/g, '&') : DEFAULT_AVATAR;

                        const pkMatch = chunk.match(/"pk":"?(\d+)"?/);
                        const pk = pkMatch ? pkMatch[1] : '';
                        if (pk) setCachedUserId(uname, pk);

                        let status = "Silenciado";
                        const chunkLower = chunk.toLowerCase();
                        if (chunkLower.includes('posts e story') || chunkLower.includes('publicações e stories') || chunkLower.includes('stories e publicações') || chunkLower.includes('posts and stories')) {
                            status = "Stories e Publicações";
                        } else if (chunkLower.includes('story') || chunkLower.includes('stories')) {
                            status = "Stories";
                        } else if (chunkLower.includes('post') || chunkLower.includes('publica')) {
                            status = "Publicações";
                        }

                        if (!users.has(uname.toLowerCase())) {
                            users.set(uname.toLowerCase(), { username: uname, photoUrl, status, pk, isMuted: true });
                        }
                    }
                }
            } catch (_) { }

            // 2. Interceptador de rede
            if (window._igMutedUsersCapture && window._igMutedUsersCapture.users) {
                window._igMutedUsersCapture.users.forEach(u => {
                    const k = u.username.toLowerCase();
                    if (!users.has(k)) {
                        users.set(k, { username: u.username, photoUrl: u.photoUrl, status: u.status, pk: u.pk, isMuted: true });
                    } else {
                        const cur = users.get(k);
                        if (!cur.pk && u.pk) cur.pk = u.pk;
                        if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && u.photoUrl !== DEFAULT_AVATAR) cur.photoUrl = u.photoUrl;
                        if (u.status && u.status !== 'Silenciado') cur.status = u.status;
                    }
                    if (u.pk) setCachedUserId(u.username, u.pk);
                });
            }

            function networkCallback(capturedArray) {
                let added = false;
                capturedArray.forEach(u => {
                    const k = u.username.toLowerCase();
                    if (!users.has(k)) {
                        users.set(k, { username: u.username, photoUrl: u.photoUrl, status: u.status, pk: u.pk, isMuted: true });
                        added = true;
                    } else {
                        const cur = users.get(k);
                        if (!cur.pk && u.pk) cur.pk = u.pk;
                        if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && u.photoUrl !== DEFAULT_AVATAR) cur.photoUrl = u.photoUrl;
                        if (u.status && u.status !== 'Silenciado') cur.status = u.status;
                    }
                    if (u.pk) setCachedUserId(u.username, u.pk);
                });
                if (added) {
                    noNewUsersCount = 0;
                    update(users.size, users.size, `Capturado(s) ${users.size} usuário(s)... Rolando...`);
                }
            }
            if (window._igMutedUsersCapture) {
                window._igMutedUsersCapture.callbacks.push(networkCallback);
            }

            function performScrollAndExtract() {
                if (cancelled) return;
                const initialUserCount = users.size;

                const domRows = scanMutedAccountsDomRows(doc);
                domRows.forEach((val, key) => {
                    if (!users.has(key)) {
                        users.set(key, val);
                    } else {
                        const cur = users.get(key);
                        if (val.status !== 'Silenciado') cur.status = val.status;
                        if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && val.photoUrl !== DEFAULT_AVATAR) cur.photoUrl = val.photoUrl;
                    }
                });

                update(users.size, users.size, `Encontrado(s) ${users.size} conta(s) silenciada(s)... Rolando...`);

                if (users.size === initialUserCount) {
                    noNewUsersCount++;
                } else {
                    noNewUsersCount = 0;
                }

                if (noNewUsersCount >= (users.size > 0 ? maxIdleCount : 8)) {
                    finishExtraction();
                    return;
                }

                const scrollContainer = doc.querySelector('div[role="dialog"] ._aano') ||
                    doc.querySelector('div[role="dialog"] div[style*="overflow-y: auto"]') ||
                    doc.querySelector('main div[style*="overflow-y: auto"]') ||
                    doc.querySelector('div[style*="overflow-y: auto"]') ||
                    doc.querySelector('._aano') ||
                    doc.documentElement;
                if (scrollContainer && scrollContainer !== doc.documentElement) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                } else {
                    window.scrollTo(0, document.body.scrollHeight);
                }
            }

            scrollInterval = setInterval(performScrollAndExtract, 400);
            setTimeout(() => {
                if (scrollInterval) {
                    finishExtraction();
                }
            }, 60000);
        });
    }

    let modalAbertoMuted = false;

    async function abrirModalContasSilenciadas(initialUsers = null) {
        const existingModal = document.getElementById("mutedAccountsModal");
        if (modalAbertoMuted && existingModal) {
            existingModal.style.display = "block";
            existingModal.focus();
            return;
        }
        modalAbertoMuted = false;

        try {
            modalAbertoMuted = true;
            const dbHelper = getDbHelper();
            const userListCache = getUserListCache();

        // Helper para resolver fotos de perfil através de múltiplos caches
        function resolveUserPhoto(username, currentPhoto = null) {
            if (currentPhoto && currentPhoto !== DEFAULT_AVATAR && typeof currentPhoto === 'string' && !currentPhoto.includes('rsrc.php') && !currentPhoto.includes('static.xx')) {
                return currentPhoto;
            }
            const clean = (typeof username === 'string' ? username : (username?.username || '')).toLowerCase().trim();
            if (!clean) return DEFAULT_AVATAR;

            try {
                if (typeof cachedData !== 'undefined' && cachedData?.userDetails) {
                    const p = cachedData.userDetails.get(clean)?.photoUrl;
                    if (p && p !== DEFAULT_AVATAR && typeof p === 'string' && !p.includes('rsrc.php') && !p.includes('static.xx')) return p;
                }
                const getUname = (x) => (typeof x === 'string' ? x : (x?.username || '')).toLowerCase().trim();

                if (dbHelper?._cache?.following && Array.isArray(dbHelper._cache.following)) {
                    const item = dbHelper._cache.following.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
                if (dbHelper?._cache?.followers && Array.isArray(dbHelper._cache.followers)) {
                    const item = dbHelper._cache.followers.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
                if (dbHelper?._cache?.muted && Array.isArray(dbHelper._cache.muted)) {
                    const item = dbHelper._cache.muted.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
                if (typeof seguindoList !== 'undefined' && Array.isArray(seguindoList)) {
                    const item = seguindoList.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
            } catch (_) { }
            return DEFAULT_AVATAR;
        }

        // 1. CARREGAMENTO IMEDIATO DO CACHE (0ms)
        const myUname = (typeof getLoggedInUsername === 'function' ? getLoggedInUsername() || '' : '').toLowerCase().trim();
        const myUid = (typeof getCookie === 'function' ? getCookie('ds_user_id') : '') || (typeof getActorId === 'function' ? getActorId() : '') || '';
        const isOnMutedPage = window.location.pathname.includes('/accounts/muted_accounts/');
        let mutedAccountsList = [];

        // Carrega seguidores e seguindo para cruzar informações e permitir silenciar qualquer contato
        let followersAccounts = [];
        let followingAccounts = [];

        const unpackList = (cacheObj) => {
            if (!cacheObj) return [];
            if (Array.isArray(cacheObj)) return cacheObj;
            if (cacheObj.details instanceof Map) return Array.from(cacheObj.details.values());
            if (cacheObj.data && Array.isArray(cacheObj.data)) return cacheObj.data;
            if (cacheObj.users && Array.isArray(cacheObj.users)) return cacheObj.users;
            if (cacheObj.users instanceof Map) return Array.from(cacheObj.users.values());
            if (cacheObj instanceof Map) return Array.from(cacheObj.values());
            if (cacheObj instanceof Set) return Array.from(cacheObj).map(u => (typeof u === 'string' ? { username: u } : u));
            return [];
        };

        const extractUname = (f) => {
            if (!f) return '';
            if (typeof f === 'string') return f.replace(/^@/, '').toLowerCase().trim();
            if (typeof f === 'object') {
                const u = f.username || f.user?.username || f.name || f.value || '';
                return String(u).replace(/^@/, '').toLowerCase().trim();
            }
            return '';
        };

        try {
            const [dbFollowers, dbFollowing, dbMuted, dbSeguidores, dbSeguindo] = await Promise.all([
                dbHelper.loadCache('followers') || dbHelper.getCache?.('followers'),
                dbHelper.loadCache('following') || dbHelper.getCache?.('following'),
                dbHelper.loadCache('muted') || dbHelper.getCache?.('muted'),
                dbHelper.loadCache('seguidores') || dbHelper.getCache?.('seguidores'),
                dbHelper.loadCache('seguindo') || dbHelper.getCache?.('seguindo')
            ]);

            followersAccounts = unpackList(dbFollowers);
            if (followersAccounts.length === 0) followersAccounts = unpackList(dbSeguidores);

            followingAccounts = unpackList(dbFollowing);
            if (followingAccounts.length === 0) followingAccounts = unpackList(dbSeguindo);

            if (Array.isArray(dbMuted) && dbMuted.length > 0) {
                dbMuted.forEach(u => {
                    const uname = (typeof u === 'string' ? u : u?.username || '').toLowerCase().trim();
                    if (uname) {
                        if (!userListCache.muted) userListCache.muted = new Set();
                        userListCache.muted.add(uname);
                        if (typeof u === 'object' && u?.status) {
                            if (!userListCache.mutedDetails) userListCache.mutedDetails = new Map();
                            userListCache.mutedDetails.set(uname, u.status);
                        }
                    }
                });
            }
        } catch (_) { }

        // Fallbacks de memória no dbHelper
        if (followersAccounts.length === 0 && dbHelper?._cache?.followers) {
            followersAccounts = unpackList(dbHelper._cache.followers);
        }
        if (followersAccounts.length === 0 && dbHelper?._cache?.seguidores) {
            followersAccounts = unpackList(dbHelper._cache.seguidores);
        }
        if (followingAccounts.length === 0 && dbHelper?._cache?.following) {
            followingAccounts = unpackList(dbHelper._cache.following);
        }
        if (followingAccounts.length === 0 && dbHelper?._cache?.seguindo) {
            followingAccounts = unpackList(dbHelper._cache.seguindo);
        }

        // Fallbacks de localStorage
        if (followersAccounts.length === 0) {
            const keys = ['ig_tools_cache_followers', 'ig_tools_cached_followers', 'ig_tools_followers', 'ig_followers_cache', 'ig_tools_seguidores', 'cached_followers'];
            for (const k of keys) {
                try {
                    const raw = localStorage.getItem(k);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const list = unpackList(parsed);
                        if (list.length > 0) { followersAccounts = list; break; }
                    }
                } catch (_) { }
            }
        }

        if (followingAccounts.length === 0) {
            const keys = ['ig_tools_cache_following', 'ig_tools_cached_following', 'ig_tools_following', 'ig_following_cache', 'ig_tools_seguindo', 'cached_following'];
            for (const k of keys) {
                try {
                    const raw = localStorage.getItem(k);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const list = unpackList(parsed);
                        if (list.length > 0) { followingAccounts = list; break; }
                    }
                } catch (_) { }
            }
        }

        // Fallbacks de variáveis globais
        if (followersAccounts.length === 0 && typeof seguidoresList !== 'undefined' && Array.isArray(seguidoresList) && seguidoresList.length > 0) {
            followersAccounts = seguidoresList;
        }
        if (followingAccounts.length === 0 && typeof seguindoList !== 'undefined' && Array.isArray(seguindoList) && seguindoList.length > 0) {
            followingAccounts = seguindoList;
        }

        // Fallbacks de cachedData
        if (followersAccounts.length === 0 && typeof cachedData !== 'undefined') {
            if (cachedData?.seguidores) followersAccounts = unpackList(cachedData.seguidores);
            else if (cachedData?.followers) followersAccounts = unpackList(cachedData.followers);
        }
        if (followingAccounts.length === 0 && typeof cachedData !== 'undefined') {
            if (cachedData?.seguindo) followingAccounts = unpackList(cachedData.seguindo);
            else if (cachedData?.following) followingAccounts = unpackList(cachedData.following);
        }

        // Fallbacks de userListCache
        if (followersAccounts.length === 0 && typeof userListCache !== 'undefined') {
            if (userListCache.followers) followersAccounts = unpackList(userListCache.followers);
            else if (userListCache.seguidores) followersAccounts = unpackList(userListCache.seguidores);
        }
        if (followingAccounts.length === 0 && typeof userListCache !== 'undefined') {
            if (userListCache.following) followingAccounts = unpackList(userListCache.following);
            else if (userListCache.seguindo) followingAccounts = unpackList(userListCache.seguindo);
        }

        followersAccounts.forEach(f => {
            if (typeof f === 'object' && f) {
                const uname = extractUname(f);
                f.photoUrl = resolveUserPhoto(uname, f.photoUrl);
            }
        });
        followingAccounts.forEach(f => {
            if (typeof f === 'object' && f) {
                const uname = extractUname(f);
                f.photoUrl = resolveUserPhoto(uname, f.photoUrl);
            }
        });

        const followersSet = new Set(
            followersAccounts.map(extractUname).filter(Boolean)
        );
        const followingSet = new Set(
            followingAccounts.map(extractUname).filter(Boolean)
        );

        // Mapeamento de contas com status de silenciado
        let officialMutedSet = new Set();
        let officialMutedList = [];
        let baseList = [];

        const addMutedAccount = (u, isMuted = true, statusStr = '') => {
            const uname = extractUname(u);
            if (!uname || !isValidInstagramUsername(uname) || uname === myUname) return;
            const pk = (typeof u === 'object' && (u.pk || u.id || u.user?.pk || u.user?.id)) ? String(u.pk || u.id || u.user?.pk || u.user?.id) : (getCachedUserId(uname) || '');
            const photoUrl = resolveUserPhoto(uname, typeof u === 'object' ? u.photoUrl : null);
            const fullName = (typeof u === 'object' && (u.fullName || u.full_name || u.user?.full_name)) ? (u.fullName || u.full_name || u.user?.full_name) : '';
            let status = statusStr || (typeof u === 'object' && u.status ? u.status : (isMuted ? 'Silenciado' : 'Não Silenciado'));

            const userObj = {
                username: uname,
                pk,
                id: pk,
                fullName,
                photoUrl,
                status,
                isMuted: !!isMuted
            };

            if (isMuted) {
                officialMutedSet.add(uname);
                if (!officialMutedList.some(x => x.username.toLowerCase() === uname)) {
                    officialMutedList.push(userObj);
                }
            }

            const existingBase = baseList.find(b => b.username.toLowerCase() === uname);
            if (!existingBase) {
                baseList.push(userObj);
            } else {
                if (isMuted) {
                    existingBase.isMuted = true;
                    if (status && status !== 'Silenciado') existingBase.status = status;
                }
                if (!existingBase.pk && pk) existingBase.pk = pk;
                if ((!existingBase.photoUrl || existingBase.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) {
                    existingBase.photoUrl = photoUrl;
                }
            }
        };

        // 1. Carrega de userListCache se presente
        if (userListCache.muted && userListCache.muted.size > 0) {
            userListCache.muted.forEach(u => addMutedAccount(u, true, userListCache.mutedDetails?.get(u) || 'Silenciado'));
        }

        // 2. Carrega de localStorage
        if (Array.isArray(cachedMutedAccounts) && cachedMutedAccounts.length > 0) {
            cachedMutedAccounts.forEach(u => addMutedAccount(u, !!(u.isMuted ?? true), u.status || 'Silenciado'));
        }

        // 3. Se estiver na tela nativa de silenciados, faz varredura imediata no DOM (0ms)
        if (isOnMutedPage) {
            const liveMap = scanMutedAccountsDomRows(document);
            liveMap.forEach(u => addMutedAccount(u, true, u.status));
        }

        // 4. Se foram passados usuários iniciais
        if (Array.isArray(initialUsers) && initialUsers.length > 0) {
            initialUsers.forEach(u => addMutedAccount(u, !!(u.isMuted ?? true), u.status || 'Silenciado'));
        }

        const mergedMap = new Map();

        // Prioridade 1: Contas Silenciadas
        officialMutedList.forEach(u => {
            const k = (u.username || '').toLowerCase().trim();
            if (k && k !== myUname) {
                mergedMap.set(k, { ...u, photoUrl: resolveUserPhoto(u.username, u.photoUrl), isMuted: true });
            }
        });

        // Prioridade 2: Base list
        baseList.forEach(u => {
            const uname = (u.username || '').toLowerCase().trim();
            if (!uname || !isValidInstagramUsername(uname) || uname === myUname) return;
            const isMut = !!u.isMuted;
            const p = resolveUserPhoto(uname, u.photoUrl);
            if (!mergedMap.has(uname)) {
                mergedMap.set(uname, { ...u, photoUrl: p, isMuted: isMut, status: u.status || (isMut ? 'Silenciado' : 'Não Silenciado') });
            } else {
                const existing = mergedMap.get(uname);
                if (isMut) existing.isMuted = true;
                if (u.status && u.status !== 'Silenciado') existing.status = u.status;
                if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p !== DEFAULT_AVATAR) {
                    existing.photoUrl = p;
                }
            }
        });

        // Prioridade 3: Meus Seguidores
        followersAccounts.forEach(f => {
            const uname = extractUname(f);
            if (!uname || !isValidInstagramUsername(uname) || uname === myUname) return;
            const k = uname.toLowerCase().trim();
            const pk = (typeof f === 'object' && (f.pk || f.id || f.user?.pk || f.user?.id)) ? String(f.pk || f.id || f.user?.pk || f.user?.id) : (getCachedUserId(uname) || '');
            const p = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
            const fn = (typeof f === 'object' && (f.fullName || f.full_name || f.user?.full_name)) ? (f.fullName || f.full_name || f.user?.full_name) : '';
            if (!mergedMap.has(k)) {
                mergedMap.set(k, {
                    username: uname,
                    pk: pk,
                    id: pk,
                    fullName: fn,
                    photoUrl: p,
                    status: officialMutedSet.has(k) ? (userListCache.mutedDetails?.get(k) || 'Silenciado') : 'Não Silenciado',
                    isMuted: officialMutedSet.has(k)
                });
            } else {
                const existing = mergedMap.get(k);
                if (!existing.pk && pk) existing.pk = pk;
                if (!existing.fullName && fn) existing.fullName = fn;
                if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p !== DEFAULT_AVATAR) {
                    existing.photoUrl = p;
                }
            }
        });

        // Prioridade 4: Meus Seguindo
        followingAccounts.forEach(f => {
            const uname = extractUname(f);
            if (!uname || !isValidInstagramUsername(uname) || uname === myUname) return;
            const k = uname.toLowerCase().trim();
            const pk = (typeof f === 'object' && (f.pk || f.id || f.user?.pk || f.user?.id)) ? String(f.pk || f.id || f.user?.pk || f.user?.id) : (getCachedUserId(uname) || '');
            const p = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
            const fn = (typeof f === 'object' && (f.fullName || f.full_name || f.user?.full_name)) ? (f.fullName || f.full_name || f.user?.full_name) : '';
            if (!mergedMap.has(k)) {
                mergedMap.set(k, {
                    username: uname,
                    pk: pk,
                    id: pk,
                    fullName: fn,
                    photoUrl: p,
                    status: officialMutedSet.has(k) ? (userListCache.mutedDetails?.get(k) || 'Silenciado') : 'Não Silenciado',
                    isMuted: officialMutedSet.has(k)
                });
            } else {
                const existing = mergedMap.get(k);
                if (!existing.pk && pk) existing.pk = pk;
                if (!existing.fullName && fn) existing.fullName = fn;
                if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p !== DEFAULT_AVATAR) {
                    existing.photoUrl = p;
                }
            }
        });

        mutedAccountsList = Array.from(mergedMap.values()).filter(u => {
            const uname = (u.username || '').toLowerCase().trim();
            const uid = String(u.pk || u.id || '');
            if (!uname || uname === myUname || (myUid && uid === myUid)) return false;
            return isValidInstagramUsername(uname);
        });
        cachedMutedAccounts = mutedAccountsList;

        const selectedUsers = new Set();
        let currentPage = 1;
        let sortConfig = { key: 'isMuted', direction: 'descending' };

        // 2. MONTAGEM IMEDIATA DO MODAL (0ms - Padrão Moderno)
        const div = document.createElement("div");
        div.id = "mutedAccountsModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 840px; max-height: 90vh; border: 1px solid #ccc;
            border-radius: 12px; padding: 20px; z-index: 10000; overflow: auto;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        `;

        const mutedCount = mutedAccountsList.filter(u => u.isMuted).length;
        const notMutedCount = mutedAccountsList.filter(u => !u.isMuted).length;
        const storiesMutedCount = mutedAccountsList.filter(u => u.isMuted && (u.status || '').toLowerCase().includes('stor') && !(u.status || '').toLowerCase().includes('publi')).length;
        const postsMutedCount = mutedAccountsList.filter(u => u.isMuted && (u.status || '').toLowerCase().includes('publi') && !(u.status || '').toLowerCase().includes('stor')).length;
        const bothMutedCount = mutedAccountsList.filter(u => u.isMuted && ((u.status || '').toLowerCase().includes('stor') && (u.status || '').toLowerCase().includes('publi'))).length;
        const followersCount = mutedAccountsList.filter(u => followersSet.has((u.username || '').toLowerCase().trim())).length;
        const followingCount = mutedAccountsList.filter(u => followingSet.has((u.username || '').toLowerCase().trim())).length;

        div.innerHTML = `
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; cursor: move;">
                <span class="modal-title" style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <span>🔇 Gerenciador de Contas Silenciadas</span>
                    <span id="mutedSelectedCount" style="font-size:12px; font-weight:normal; color:#0095f6;">(0 selecionados)</span>
                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie contas silenciadas no Instagram. Silencie ou reative o som de stories e publicações individualmente ou em lote com 1 clique.</span></div>
                </span>
                <div class="modal-controls" style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 10px;">
                    <button id="mutedMinimizarBtn" title="Minimizar" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 2px 6px; color: #8e8e8e; line-height: 1;">_</button>
                    <button id="mutedFecharBtn" title="Fechar" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 2px 6px; color: #8e8e8e; line-height: 1;">X</button>
                </div>
            </div>
            <div id="mutedModalBody" style="display: block;">
                <div style="padding: 15px 0 10px 0;">
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                            <button id="mutedRefreshBtn" title="Ler e sincronizar dados oficiais via Instagram Web" style="background: #1abc9c; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">🔄 Sincronizar</button>
                            <button id="mutedOpenOfficialPageBtn" title="Abre a tela nativa de Contas Silenciadas do Instagram para sincronizar instantaneamente em 0ms" style="background: #34495e; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">🌐 Tela Oficial (0ms)</button>
                            <button id="mutedImportJsonBtn" title="Importar arquivo JSON de contas silenciadas" style="background: #8e44ad; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">📥 Importar JSON</button>
                            <button id="mutedUnmuteSelectedBtn" title="Reativar som para os contatos selecionados" style="background: #27ae60; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600;">🔊 Reativar Selecionados</button>
                            <button id="mutedMuteSelectedBtn" title="Silenciar stories e publicações dos selecionados" style="background: #e67e22; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600;">🔇 Silenciar Selecionados</button>
                            <button id="mutedSelectPageBtn" style="background: #0095f6; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px;">Selecionar Página</button>
                            <button id="mutedDeselectAllBtn" style="background: #6c757d; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px;">Desmarcar Todos</button>
                            <input type="file" id="mutedJsonFileInput" accept=".json" style="display: none;">
                        </div>
                        <div class="toggle-item" style="padding: 5px 10px; border-radius: 8px; gap: 10px; display: flex; align-items: center;">
                            <span style="font-size: 13px; font-weight: 500;">⚡ Usar API</span>
                            <label class="switch"><input type="checkbox" id="mutedUseApiToggle" ${typeof loadSettings === 'function' && loadSettings().useApi ? 'checked' : ''}><span class="slider"></span></label>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <input type="text" id="mutedSearchInput" placeholder="Pesquisar por @usuário, nome ou ID..." style="flex: 2; min-width: 220px; padding: 8px 12px; height: 38px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; outline: none; box-sizing: border-box;">
                    <select id="mutedFilterSelect" style="flex: 1; min-width: 260px; padding: 0 10px; height: 38px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; cursor: pointer; outline: none; box-sizing: border-box; font-weight: 500;">
                        <option value="all" selected>🌐 Todos (${mutedAccountsList.length})</option>
                        <option value="muted">🔇 Contas Silenciadas (${mutedCount})</option>
                        <option value="stories">🔇 Stories (${storiesMutedCount})</option>
                        <option value="posts">🔇 Publicações (${postsMutedCount})</option>
                        <option value="both">🔇 Stories e Publicações (${bothMutedCount})</option>
                        <option value="not_muted">🔊 Não Silenciados (${notMutedCount})</option>
                        <option value="followers">👥 Meus Seguidores (${followersCount})</option>
                        <option value="following">👤 Meus Seguindo (${followingCount})</option>
                    </select>
                </div>
                <div id="statusMutedAccounts" style="font-weight: 600; font-size: 13px; color: #555; display: flex; justify-content: space-between; align-items: center;">
                    <span>Total: <strong style="color: #e67e22;">${mutedCount}</strong> contas silenciadas | <strong style="color: #27ae60;">${notMutedCount}</strong> com som ativo.</span>
                    <span id="mutedSyncInfo" style="font-size: 11px; color: #888;"></span>
                </div>
                <div id="tabelaMutedContainer" style="display: block; margin-top: 12px; overflow-x: auto; width: 100%;"></div>
            </div>
        `;

        document.body.appendChild(div);

        // Controles de Janela vinculados imediatamente
        const mutedCloseBtn = document.getElementById("mutedFecharBtn");
        if (mutedCloseBtn) {
            mutedCloseBtn.onclick = () => {
                div.remove();
                modalAbertoMuted = false;
            };
        }

        let isMutedMinimized = false;
        const mutedMinBtn = document.getElementById("mutedMinimizarBtn");
        if (mutedMinBtn) {
            mutedMinBtn.onclick = () => {
                const bodyEl = document.getElementById("mutedModalBody");
                isMutedMinimized = !isMutedMinimized;
                if (bodyEl) bodyEl.style.display = isMutedMinimized ? 'none' : 'block';
                div.style.height = isMutedMinimized ? 'auto' : '';
                div.style.maxHeight = isMutedMinimized ? 'none' : '90vh';
                div.style.width = isMutedMinimized ? 'auto' : '90%';
                div.style.minWidth = isMutedMinimized ? '380px' : '';
                div.style.maxWidth = isMutedMinimized ? '440px' : '840px';
                div.style.padding = isMutedMinimized ? '12px 18px' : '20px';
                mutedMinBtn.textContent = isMutedMinimized ? '_' : '_';
                mutedMinBtn.title = isMutedMinimized ? 'Maximizar' : 'Minimizar';
            };
        }

        try {
            if (typeof makeDraggable === 'function') makeDraggable(div);
        } catch (_) { }

        const container = document.getElementById("tabelaMutedContainer");

        const updateCounts = (paginatedUsers = []) => {
            try {
                const countEl = document.getElementById('mutedSelectedCount');
                if (countEl) countEl.innerText = `(${selectedUsers.size} selecionados)`;

                const selectAllCb = document.getElementById('selectAllMutedCheckbox');
                if (selectAllCb && paginatedUsers.length > 0) {
                    selectAllCb.checked = paginatedUsers.every(u => selectedUsers.has(typeof u === 'string' ? u : u.username));
                }

                const curMutedCount = mutedAccountsList.filter(u => u && u.isMuted).length;
                const curNotMutedCount = mutedAccountsList.filter(u => u && !u.isMuted).length;
                const curStoriesCount = mutedAccountsList.filter(u => u && u.isMuted && (u.status || '').toLowerCase().includes('stor') && !(u.status || '').toLowerCase().includes('publi')).length;
                const curPostsCount = mutedAccountsList.filter(u => u && u.isMuted && (u.status || '').toLowerCase().includes('publi') && !(u.status || '').toLowerCase().includes('stor')).length;
                const curBothCount = mutedAccountsList.filter(u => u && u.isMuted && ((u.status || '').toLowerCase().includes('stor') && (u.status || '').toLowerCase().includes('publi'))).length;
                const curFollowersCount = mutedAccountsList.filter(u => u && followersSet.has((u.username || '').toLowerCase().trim())).length;
                const curFollowingCount = mutedAccountsList.filter(u => u && followingSet.has((u.username || '').toLowerCase().trim())).length;
                const curTotalCount = mutedAccountsList.length;

                const filterSelect = document.getElementById('mutedFilterSelect');
                if (filterSelect && filterSelect.options && filterSelect.options.length >= 8) {
                    filterSelect.options[0].text = `🌐 Todos (${curTotalCount})`;
                    filterSelect.options[1].text = `🔇 Contas Silenciadas (${curMutedCount})`;
                    filterSelect.options[2].text = `🔇 Stories (${curStoriesCount})`;
                    filterSelect.options[3].text = `🔇 Publicações (${curPostsCount})`;
                    filterSelect.options[4].text = `🔇 Stories e Publicações (${curBothCount})`;
                    filterSelect.options[5].text = `🔊 Não Silenciados (${curNotMutedCount})`;
                    filterSelect.options[6].text = `👥 Meus Seguidores (${curFollowersCount})`;
                    filterSelect.options[7].text = `👤 Meus Seguindo (${curFollowingCount})`;
                }

                const statusEl = document.getElementById('statusMutedAccounts');
                if (statusEl) {
                    const totalSpan = statusEl.querySelector('span');
                    if (totalSpan) {
                        totalSpan.innerHTML = `Total: <strong style="color: #e67e22;">${curMutedCount}</strong> contas silenciadas | <strong style="color: #27ae60;">${curNotMutedCount}</strong> com som ativo.`;
                    }
                }
            } catch (e) {
                console.warn('[IG Tools Muted] Erro em updateCounts:', e);
            }
        };

        const renderList = (page = 1) => {
            try {
                const itemsPerPage = (typeof loadSettings === 'function' ? loadSettings().itemsPerPage : null) || 10;
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                const searchTerm = (document.getElementById('mutedSearchInput')?.value || '').toLowerCase().trim();
                const filterValue = document.getElementById('mutedFilterSelect')?.value || 'all';

                let filtered = mutedAccountsList.filter(u => {
                    if (!u) return false;
                    const uname = typeof u === 'string' ? u : (u.username || '');
                    const uLower = uname.toLowerCase().trim();
                    const fLower = (typeof u === 'object' && u.fullName ? u.fullName : '').toLowerCase().trim();
                    const pkStr = String(typeof u === 'object' ? (u.pk || u.id || '') : '');
                    const statusStr = (typeof u === 'object' && u.status ? u.status : '').toLowerCase();

                    const matchSearch = !searchTerm || uLower.includes(searchTerm) || fLower.includes(searchTerm) || pkStr.includes(searchTerm);
                    if (!matchSearch) return false;

                    if (filterValue === 'muted') return !!u.isMuted;
                    if (filterValue === 'stories') return !!u.isMuted && statusStr.includes('stor') && !statusStr.includes('publi');
                    if (filterValue === 'posts') return !!u.isMuted && statusStr.includes('publi') && !statusStr.includes('stor');
                    if (filterValue === 'both') return !!u.isMuted && (statusStr.includes('stor') && statusStr.includes('publi'));
                    if (filterValue === 'not_muted') return !u.isMuted;
                    if (filterValue === 'followers') return followersSet.has(uLower);
                    if (filterValue === 'following') return followingSet.has(uLower);
                    return true; // 'all'
                });

                // Ordenação
                filtered.sort((a, b) => {
                    let valA = '';
                    let valB = '';
                    const aUname = (typeof a === 'string' ? a : a?.username || '').toLowerCase();
                    const bUname = (typeof b === 'string' ? b : b?.username || '').toLowerCase();
                    if (sortConfig.key === 'username') {
                        valA = aUname;
                        valB = bUname;
                    } else if (sortConfig.key === 'pk') {
                        valA = Number(a?.pk || a?.id) || 0;
                        valB = Number(b?.pk || b?.id) || 0;
                    } else if (sortConfig.key === 'isMuted') {
                        valA = a?.isMuted ? 1 : 0;
                        valB = b?.isMuted ? 1 : 0;
                    }

                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                });

                const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
                if (page > totalPages) page = totalPages;
                if (page < 1) page = 1;
                currentPage = page;
                const paginatedUsers = filtered.slice(startIndex, endIndex);

                let tableHtml = `
                    <table style="width: 100%; min-width: 620px; border-collapse: collapse; margin-top: 5px;">
                        <thead style="cursor: pointer;">
                            <tr style="text-align: left; border-bottom: 2px solid #dbdbdb;">
                                <th style="padding: 8px; width: 36px; text-align: center;"><input type="checkbox" id="selectAllMutedCheckbox" title="Selecionar Todos da Página"></th>
                                <th style="padding: 8px;" data-sort-key="username">Usuário ${sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px; text-align: center; width: 110px;" data-sort-key="pk">ID (PK) ${sortConfig.key === 'pk' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px; text-align: center; width: 160px;" data-sort-key="isMuted">Status ${sortConfig.key === 'isMuted' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px; text-align: center; width: 130px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                if (paginatedUsers.length === 0) {
                    tableHtml += `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 30px 15px; color: #666;">
                                <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">Nenhum usuário encontrado</div>
                                <div style="font-size: 13px; color: #888; max-width: 480px; margin: 0 auto; line-height: 1.5;">
                                    Você pode clicar em <strong>🔄 Sincronizar</strong> para carregar sua lista de contas silenciadas diretamente do Instagram Web ou clicar em <strong>📥 Importar JSON</strong>.
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    paginatedUsers.forEach(userObj => {
                        const username = typeof userObj === 'string' ? userObj : (userObj?.username || '');
                        const currentPhotoUrl = typeof userObj === 'object' ? userObj?.photoUrl : null;
                        const pk = typeof userObj === 'object' ? (userObj?.pk || userObj?.id || '') : '';
                        const fullName = typeof userObj === 'object' ? (userObj?.fullName || '') : '';
                        const isMuted = typeof userObj === 'object' ? !!userObj?.isMuted : false;
                        const statusRaw = typeof userObj === 'object' ? (userObj?.status || '') : '';
                        const isChecked = selectedUsers.has(username);
                        const photoUrl = resolveUserPhoto(username, currentPhotoUrl);
                        if (typeof userObj === 'object' && userObj && photoUrl !== currentPhotoUrl && photoUrl !== DEFAULT_AVATAR) {
                            userObj.photoUrl = photoUrl;
                        }
                        const uLower = username.toLowerCase().trim();
                        const isFollower = followersSet.has(uLower);
                        const isFollowing = followingSet.has(uLower);

                        let relBadge = '';
                        if (isFollower && isFollowing) {
                            relBadge = `<span style="font-size: 10px; background: rgba(52, 152, 219, 0.15); color: #3498db; border: 1px solid rgba(52, 152, 219, 0.35); padding: 1px 6px; border-radius: 8px; font-weight: 600; white-space: nowrap;">Amigos Mútuos</span>`;
                        } else if (isFollowing) {
                            relBadge = `<span style="font-size: 10px; background: rgba(155, 89, 182, 0.15); color: #9b59b6; border: 1px solid rgba(155, 89, 182, 0.35); padding: 1px 6px; border-radius: 8px; font-weight: 600; white-space: nowrap;">Seguindo</span>`;
                        } else if (isFollower) {
                            relBadge = `<span style="font-size: 10px; background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.35); padding: 1px 6px; border-radius: 8px; font-weight: 600; white-space: nowrap;">Seguidor</span>`;
                        }

                        // Badge de status refinada
                        let statusBadgeHtml = '';
                        const stLower = statusRaw.toLowerCase();
                        if (isMuted) {
                            if (stLower.includes('stor') && stLower.includes('publi')) {
                                statusBadgeHtml = `<span style="background: rgba(142, 68, 173, 0.16); color: #8e44ad !important; border: 1px solid rgba(142, 68, 173, 0.45); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">🔇 Stories e Publicações</span>`;
                            } else if (stLower.includes('stor')) {
                                statusBadgeHtml = `<span style="background: rgba(230, 126, 34, 0.16); color: #e67e22 !important; border: 1px solid rgba(230, 126, 34, 0.45); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">🔇 Stories</span>`;
                            } else if (stLower.includes('publi') || stLower.includes('post')) {
                                statusBadgeHtml = `<span style="background: rgba(52, 152, 219, 0.16); color: #2980b9 !important; border: 1px solid rgba(52, 152, 219, 0.45); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">🔇 Publicações</span>`;
                            } else {
                                statusBadgeHtml = `<span style="background: rgba(231, 76, 60, 0.16); color: #c0392b !important; border: 1px solid rgba(231, 76, 60, 0.45); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">🔇 Silenciado</span>`;
                            }
                        } else {
                            statusBadgeHtml = `<span style="background: rgba(39, 174, 96, 0.15); color: #27ae60 !important; border: 1px solid rgba(39, 174, 96, 0.4); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">🔊 Não Silenciado</span>`;
                        }

                        tableHtml += `
                            <tr style="border-bottom: 1px solid #dbdbdb;" data-username="${username}">
                                <td style="padding: 8px; text-align: center;"><input type="checkbox" class="muted-user-checkbox" data-username="${username}" style="cursor: pointer;" ${isChecked ? 'checked' : ''}></td>
                                <td style="padding: 8px; display: flex; align-items: center; gap: 10px;">
                                    <img src="${photoUrl || DEFAULT_AVATAR}" crossorigin="anonymous" loading="lazy" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" alt="${username}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid #eee; flex-shrink: 0;">
                                    <div style="display: flex; flex-direction: column; min-width: 0;">
                                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                            <a href="https://www.instagram.com/${username}" target="_blank" style="text-decoration: none; color: inherit; font-weight: 600;">${username}</a>
                                            ${relBadge}
                                        </div>
                                        ${fullName ? `<span style="font-size: 12px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fullName}</span>` : ''}
                                    </div>
                                </td>
                                <td style="text-align: center; padding: 8px; font-family: monospace; font-size: 12px; color: #888;">${pk || '-'}</td>
                                <td style="text-align: center; padding: 8px;">
                                    ${statusBadgeHtml}
                                </td>
                                <td style="text-align: center; padding: 8px;">
                                    ${isMuted
                                ? `<button class="btn-action-muted" data-username="${username}" data-uid="${pk}" data-action="unmute" style="background: #27ae60; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">🔊 Reativar Som</button>`
                                : `<button class="btn-action-muted" data-username="${username}" data-uid="${pk}" data-action="mute" style="background: #e67e22; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">🔇 Silenciar</button>`
                            }
                                </td>
                            </tr>
                        `;
                    });
                }

                tableHtml += `</tbody></table>`;

                let paginationHtml = `<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 15px;">`;
                if (page > 1) paginationHtml += `<button id="prevMutedPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Anterior</button>`;
                paginationHtml += `<span style="font-size: 13px; font-weight: 600;">Página ${page} de ${totalPages}</span>`;
                if (page < totalPages) paginationHtml += `<button id="nextMutedPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Próximo</button>`;
                paginationHtml += `</div>`;

                container.innerHTML = tableHtml + paginationHtml;

                // Checkboxes individuais
                container.querySelectorAll('.muted-user-checkbox').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const uname = e.target.dataset.username;
                        if (e.target.checked) selectedUsers.add(uname);
                        else selectedUsers.delete(uname);
                        updateCounts(paginatedUsers);
                    });
                });

                // Selecionar todos os checkboxes da página
                const selectAllCb = document.getElementById('selectAllMutedCheckbox');
                if (selectAllCb) {
                    selectAllCb.checked = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(typeof u === 'string' ? u : u.username));
                    selectAllCb.onchange = (e) => {
                        const isChecked = e.target.checked;
                        paginatedUsers.forEach(u => {
                            const uname = typeof u === 'string' ? u : u.username;
                            if (isChecked) selectedUsers.add(uname);
                            else selectedUsers.delete(uname);
                        });
                        container.querySelectorAll('.muted-user-checkbox').forEach(cb => cb.checked = isChecked);
                        updateCounts(paginatedUsers);
                    };
                }

                // Ordenação por cabeçalho
                container.querySelectorAll('th[data-sort-key]').forEach(th => {
                    th.addEventListener('click', () => {
                        const key = th.dataset.sortKey;
                        if (sortConfig.key === key) {
                            sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
                        } else {
                            sortConfig.key = key;
                            sortConfig.direction = 'ascending';
                        }
                        renderList(currentPage);
                    });
                });

                // Paginação
                const prevBtn = document.getElementById('prevMutedPageBtn');
                if (prevBtn) prevBtn.onclick = () => renderList(currentPage - 1);
                const nextBtn = document.getElementById('nextMutedPageBtn');
                if (nextBtn) nextBtn.onclick = () => renderList(currentPage + 1);

                // Ação individual por linha (1 clique - Padrão Polaris 0ms)
                container.querySelectorAll('.btn-action-muted').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const targetBtn = e.currentTarget;
                        const uname = targetBtn.dataset.username;
                        const action = targetBtn.dataset.action; // 'mute' ou 'unmute'
                        const userObj = mutedAccountsList.find(u => (typeof u === 'string' ? u : u.username || '').toLowerCase() === uname.toLowerCase());
                        const uid = userObj?.pk || userObj?.id || targetBtn.dataset.uid || getCachedUserId(uname) || '';

                        targetBtn.disabled = true;
                        targetBtn.textContent = 'Processando...';

                        try {
                            const res = await executePolarisMute(uid, uname, action, 'all');
                            if (res && res.success) {
                                if (userObj && typeof userObj === 'object') {
                                    userObj.isMuted = (action === 'mute');
                                    userObj.status = action === 'mute' ? 'Stories e Publicações' : 'Não Silenciado';
                                }

                                if (!userListCache.muted) userListCache.muted = new Set();
                                if (!userListCache.mutedDetails) userListCache.mutedDetails = new Map();

                                if (action === 'mute') {
                                    userListCache.muted.add(uname.toLowerCase());
                                    userListCache.mutedDetails.set(uname.toLowerCase(), 'Stories e Publicações');
                                    if (typeof showToast === 'function') showToast(`🔇 Contas de @${uname} silenciadas!`);
                                } else {
                                    userListCache.muted.delete(uname.toLowerCase());
                                    userListCache.mutedDetails.delete(uname.toLowerCase());
                                    if (typeof showToast === 'function') showToast(`🔊 Som reativado para @${uname}!`);
                                }

                                cachedMutedAccounts = mutedAccountsList;
                                try {
                                    localStorage.setItem('ig_tools_cached_muted', JSON.stringify(mutedAccountsList.filter(u => u && u.isMuted)));
                                    if (typeof dbHelper !== 'undefined') dbHelper.saveCache('muted', mutedAccountsList.filter(u => u && u.isMuted));
                                } catch (_) { }

                                renderList(currentPage);
                                updateCounts(paginatedUsers);
                            } else {
                                throw new Error(res?.error || 'Falha na requisição');
                            }
                        } catch (err) {
                            console.error('[IG Tools Muted] Erro ao processar:', err);
                            if (typeof showToast === 'function') showToast(`Erro ao processar @${uname}: ${err.message || 'Falha na API'}`);
                            targetBtn.disabled = false;
                            targetBtn.textContent = action === 'mute' ? '🔇 Silenciar' : '🔊 Reativar Som';
                        }
                    });
                });
            } catch (renderErr) {
                console.error('[IG Tools Muted] Erro em renderList:', renderErr);
                if (container) {
                    container.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Erro ao exibir lista de contas silenciadas: ${renderErr.message}</div>`;
                }
            }
        };

        // Sincronização em tempo real
        async function sincronizarContasSilenciadas(forceScroll = false) {
            const refreshBtn = document.getElementById("mutedRefreshBtn");
            try {
                if (refreshBtn) {
                    refreshBtn.disabled = true;
                    refreshBtn.textContent = "🔄 Sincronizando...";
                }

                const isOnPage = window.location.pathname.includes('/accounts/muted_accounts/');
                let extractedUsers = [];

                if (forceScroll || isOnPage) {
                    if (!isOnPage) {
                        history.pushState(null, null, '/accounts/muted_accounts/');
                        window.dispatchEvent(new Event('popstate'));
                        await new Promise(r => setTimeout(r, 1200));
                    }
                    if (refreshBtn) refreshBtn.textContent = "🔄 Mapeando tela oficial...";
                    extractedUsers = await extractMutedAccountsUsernames(document);
                } else {
                    const liveMap = scanMutedAccountsDomRows(document);
                    extractedUsers = Array.from(liveMap.values());
                    if (extractedUsers.length === 0) {
                        history.pushState(null, null, '/accounts/muted_accounts/');
                        window.dispatchEvent(new Event('popstate'));
                        await new Promise(r => setTimeout(r, 1200));
                        extractedUsers = await extractMutedAccountsUsernames(document);
                    }
                }

                if (Array.isArray(extractedUsers) && extractedUsers.length > 0) {
                    extractedUsers.forEach(u => {
                        const uname = (u.username || '').toLowerCase().trim();
                        const existing = mutedAccountsList.find(x => x.username.toLowerCase() === uname);
                        if (existing) {
                            existing.isMuted = true;
                            if (u.status && u.status !== 'Silenciado') existing.status = u.status;
                            if (u.pk && !existing.pk) existing.pk = u.pk;
                            if (u.photoUrl && u.photoUrl !== DEFAULT_AVATAR) existing.photoUrl = u.photoUrl;
                        } else {
                            mutedAccountsList.unshift({
                                username: u.username,
                                pk: u.pk || '',
                                id: u.pk || '',
                                photoUrl: resolveUserPhoto(u.username, u.photoUrl),
                                status: u.status || 'Silenciado',
                                isMuted: true
                            });
                        }
                        if (!userListCache.muted) userListCache.muted = new Set();
                        if (!userListCache.mutedDetails) userListCache.mutedDetails = new Map();
                        userListCache.muted.add(uname);
                        userListCache.mutedDetails.set(uname, u.status || 'Silenciado');
                    });

                    cachedMutedAccounts = mutedAccountsList;
                    try {
                        localStorage.setItem('ig_tools_cached_muted', JSON.stringify(mutedAccountsList.filter(u => u.isMuted)));
                        if (typeof dbHelper !== 'undefined') dbHelper.saveCache('muted', mutedAccountsList.filter(u => u.isMuted));
                    } catch (_) { }

                    const syncInfo = document.getElementById("mutedSyncInfo");
                    if (syncInfo) syncInfo.textContent = `✓ Sincronizado às ${new Date().toLocaleTimeString()}`;
                    if (typeof showToast === 'function') showToast(`✓ Sincronização concluída (${extractedUsers.length} contas silenciadas).`);
                }
            } catch (err) {
                console.error('[IG Tools Muted] Erro ao sincronizar:', err);
                if (typeof showToast === 'function') showToast("Falha ao sincronizar contas silenciadas.");
            } finally {
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = "🔄 Sincronizar";
                }
                renderList(currentPage);
                updateCounts();
            }
        }

        // Função de execução em lote via Polaris API
        async function executarAcaoSilenciarLote(selectedArray, action = 'mute', targetType = 'all', callback = null) {
            if (!Array.isArray(selectedArray) || selectedArray.length === 0) {
                if (typeof showToast === 'function') showToast("Selecione ao menos um usuário.");
                return;
            }

            const isUnmute = action === 'unmute';
            let cancelled = false;
            const { bar, update, closeButton } = createCancellableProgressBar();
            closeButton.onclick = () => {
                cancelled = true;
                if (bar) bar.remove();
                if (typeof showToast === 'function') showToast("Operação cancelada pelo usuário.");
            };

            update(0, selectedArray.length, `Iniciando ${isUnmute ? 'reativação de som' : 'silenciamento'}...`);

            const delayMs = (typeof loadSettings === 'function' ? loadSettings().requestDelay : null) || 350;
            let successCount = 0;

            for (let i = 0; i < selectedArray.length; i++) {
                if (cancelled) break;
                const uname = selectedArray[i];
                const userObj = mutedAccountsList.find(u => (typeof u === 'string' ? u : u.username || '').toLowerCase() === uname.toLowerCase());
                const uid = userObj?.pk || userObj?.id || getCachedUserId(uname) || '';

                update(i + 1, selectedArray.length, `${isUnmute ? 'Reativando som' : 'Silenciando'} @${uname} (${i + 1}/${selectedArray.length})...`);

                try {
                    const res = await executePolarisMute(uid, uname, action, targetType);
                    if (res && res.success) {
                        successCount++;
                        const uLower = uname.toLowerCase().trim();
                        if (userObj && typeof userObj === 'object') {
                            if (isUnmute) {
                                if (targetType === 'all') {
                                    userObj.isMuted = false;
                                    userObj.status = 'Não Silenciado';
                                } else if (targetType === 'stories') {
                                    if (userObj.status === 'Stories e Publicações') userObj.status = 'Publicações';
                                    else { userObj.isMuted = false; userObj.status = 'Não Silenciado'; }
                                } else if (targetType === 'posts') {
                                    if (userObj.status === 'Stories e Publicações') userObj.status = 'Stories';
                                    else { userObj.isMuted = false; userObj.status = 'Não Silenciado'; }
                                }
                            } else {
                                userObj.isMuted = true;
                                userObj.status = targetType === 'all' ? 'Stories e Publicações' : (targetType === 'stories' ? 'Stories' : 'Publicações');
                            }
                        }

                        if (!userListCache.muted) userListCache.muted = new Set();
                        if (!userListCache.mutedDetails) userListCache.mutedDetails = new Map();

                        if (isUnmute) {
                            if (targetType === 'all') {
                                userListCache.muted.delete(uLower);
                                userListCache.mutedDetails.delete(uLower);
                            } else if (targetType === 'stories') {
                                const cur = userListCache.mutedDetails.get(uLower);
                                if (cur === 'Stories e Publicações') userListCache.mutedDetails.set(uLower, 'Publicações');
                                else { userListCache.muted.delete(uLower); userListCache.mutedDetails.delete(uLower); }
                            } else if (targetType === 'posts') {
                                const cur = userListCache.mutedDetails.get(uLower);
                                if (cur === 'Stories e Publicações') userListCache.mutedDetails.set(uLower, 'Stories');
                                else { userListCache.muted.delete(uLower); userListCache.mutedDetails.delete(uLower); }
                            }
                        } else {
                            userListCache.muted.add(uLower);
                            userListCache.mutedDetails.set(uLower, targetType === 'all' ? 'Stories e Publicações' : (targetType === 'stories' ? 'Stories' : 'Publicações'));
                        }
                    }
                } catch (err) {
                    console.warn(`[IG Tools Muted] Falha ao processar @${uname}:`, err);
                }

                if (i < selectedArray.length - 1 && !cancelled) {
                    await new Promise(r => setTimeout(r, delayMs));
                }
            }

            if (bar) bar.remove();

            cachedMutedAccounts = mutedAccountsList;
            try {
                localStorage.setItem('ig_tools_cached_muted', JSON.stringify(mutedAccountsList.filter(u => u && u.isMuted)));
                if (typeof dbHelper !== 'undefined') await dbHelper.saveCache('muted', mutedAccountsList.filter(u => u && u.isMuted));
            } catch (_) { }

            if (typeof showToast === 'function') showToast(`✓ Processo concluído: ${successCount} conta(s) processada(s) com sucesso.`);
            if (callback) callback();
            renderList(currentPage);
            updateCounts();
        }

        // Ação em lote: Reativar Som
        const unmuteSelectedBtn = document.getElementById("mutedUnmuteSelectedBtn");
        if (unmuteSelectedBtn) {
            unmuteSelectedBtn.onclick = () => {
                const selectedArray = Array.from(selectedUsers);
                if (selectedArray.length === 0) {
                    if (typeof showToast === 'function') showToast("Selecione ao menos um usuário.");
                    return;
                }
                showMuteOptionsModal('unmute', (targetType) => {
                    executarAcaoSilenciarLote(selectedArray, 'unmute', targetType, () => {
                        selectedUsers.clear();
                    });
                });
            };
        }

        // Ação em lote: Silenciar
        const muteSelectedBtn = document.getElementById("mutedMuteSelectedBtn");
        if (muteSelectedBtn) {
            muteSelectedBtn.onclick = () => {
                const selectedArray = Array.from(selectedUsers);
                if (selectedArray.length === 0) {
                    if (typeof showToast === 'function') showToast("Selecione ao menos um usuário.");
                    return;
                }
                showMuteOptionsModal('mute', (targetType) => {
                    executarAcaoSilenciarLote(selectedArray, 'mute', targetType, () => {
                        selectedUsers.clear();
                    });
                });
            };
        }

        // Sincronizar manual
        const refreshBtn = document.getElementById("mutedRefreshBtn");
        if (refreshBtn) {
            refreshBtn.onclick = () => sincronizarContasSilenciadas(true);
        }

        // Tela Oficial (0ms)
        const openOfficialBtn = document.getElementById("mutedOpenOfficialPageBtn");
        if (openOfficialBtn) {
            openOfficialBtn.onclick = async () => {
                if (!window.location.pathname.includes('/accounts/muted_accounts/')) {
                    history.pushState(null, null, '/accounts/muted_accounts/');
                    window.dispatchEvent(new Event('popstate'));
                    if (typeof showToast === 'function') showToast("Navegando para tela nativa de silenciados...");
                    await new Promise(r => setTimeout(r, 1000));
                }
                sincronizarContasSilenciadas(false);
            };
        }

        // Selecionar Página / Desmarcar Todos
        const selectPageBtn = document.getElementById("mutedSelectPageBtn");
        if (selectPageBtn) {
            selectPageBtn.onclick = () => {
                const itemsPerPage = (typeof loadSettings === 'function' ? loadSettings().itemsPerPage : null) || 10;
                const startIndex = (currentPage - 1) * itemsPerPage;
                const searchTerm = (document.getElementById('mutedSearchInput')?.value || '').toLowerCase().trim();
                const filterValue = document.getElementById('mutedFilterSelect')?.value || 'all';

                const filtered = mutedAccountsList.filter(u => {
                    if (!u) return false;
                    const uname = (u.username || '').toLowerCase().trim();
                    const fLower = (u.fullName || '').toLowerCase().trim();
                    const pkStr = String(u.pk || u.id || '');
                    const matchSearch = !searchTerm || uname.includes(searchTerm) || fLower.includes(searchTerm) || pkStr.includes(searchTerm);
                    if (!matchSearch) return false;
                    if (filterValue === 'muted') return !!u.isMuted;
                    if (filterValue === 'not_muted') return !u.isMuted;
                    if (filterValue === 'followers') return followersSet.has(uname);
                    if (filterValue === 'following') return followingSet.has(uname);
                    return true;
                });

                const pageUsers = filtered.slice(startIndex, startIndex + itemsPerPage);
                pageUsers.forEach(u => selectedUsers.add(u.username));
                renderList(currentPage);
                updateCounts(pageUsers);
            };
        }

        const deselectAllBtn = document.getElementById("mutedDeselectAllBtn");
        if (deselectAllBtn) {
            deselectAllBtn.onclick = () => {
                selectedUsers.clear();
                renderList(currentPage);
                updateCounts();
            };
        }

        // Importar JSON
        const importBtn = document.getElementById("mutedImportJsonBtn");
        const fileInput = document.getElementById("mutedJsonFileInput");
        if (importBtn && fileInput) {
            importBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const json = JSON.parse(evt.target.result);
                        let importedUsernames = [];
                        if (Array.isArray(json)) {
                            importedUsernames = json.map(item => typeof item === 'string' ? item : (item.username || item.name || item.value)).filter(Boolean);
                        } else if (typeof json === 'object' && json !== null) {
                            importedUsernames = Object.keys(json);
                        }

                        if (importedUsernames.length > 0) {
                            importedUsernames.forEach(uname => {
                                const clean = uname.replace(/^@/, '').trim();
                                if (!clean || !isValidInstagramUsername(clean)) return;
                                const k = clean.toLowerCase();
                                const existing = mutedAccountsList.find(x => x.username.toLowerCase() === k);
                                if (existing) {
                                    existing.isMuted = true;
                                } else {
                                    mutedAccountsList.unshift({
                                        username: clean,
                                        pk: getCachedUserId(clean) || '',
                                        id: getCachedUserId(clean) || '',
                                        photoUrl: resolveUserPhoto(clean),
                                        status: 'Silenciado',
                                        isMuted: true
                                    });
                                }
                                if (!userListCache.muted) userListCache.muted = new Set();
                                userListCache.muted.add(k);
                            });

                            try {
                                localStorage.setItem('ig_tools_cached_muted', JSON.stringify(mutedAccountsList.filter(u => u.isMuted)));
                                if (typeof dbHelper !== 'undefined') dbHelper.saveCache('muted', mutedAccountsList.filter(u => u.isMuted));
                            } catch (_) { }

                            if (typeof showToast === 'function') showToast(`📥 Importadas ${importedUsernames.length} contas com sucesso!`);
                            renderList(1);
                            updateCounts();
                        } else {
                            if (typeof showToast === 'function') showToast("Nenhum usuário válido encontrado no arquivo JSON.");
                        }
                    } catch (jerr) {
                        console.error('[IG Tools Muted] Erro ao importar JSON:', jerr);
                        if (typeof showToast === 'function') showToast("Arquivo JSON inválido.");
                    }
                };
                reader.readAsText(file);
            };
        }

        // Switch API
        const apiToggle = document.getElementById("mutedUseApiToggle");
        if (apiToggle) {
            apiToggle.onchange = (e) => {
                if (typeof saveSettings === 'function') saveSettings({ useApi: e.target.checked });
                if (typeof showToast === 'function') showToast(`Modo API ${e.target.checked ? 'Ativado (Super Rápido)' : 'Desativado (Modo Humano)'}`);
            };
        }

        // Input de busca e filtro
        const searchInput = document.getElementById("mutedSearchInput");
        if (searchInput) {
            searchInput.oninput = () => renderList(1);
        }

        const filterSelect = document.getElementById("mutedFilterSelect");
        if (filterSelect) {
            filterSelect.onchange = () => renderList(1);
        }

        // Renderização inicial imediata (0ms)
        renderList(1);
        updateCounts();

        // Sincronização em segundo plano se lista vazia ou pequena
        if (mutedAccountsList.length === 0 || !mutedAccountsList.some(u => u.isMuted)) {
            sincronizarContasSilenciadas(false);
        }
        } catch (error) {
            console.error("[IG Tools] Erro ao abrir modal de contas silenciadas:", error);
            modalAbertoMuted = false;
            const existing = document.getElementById("mutedAccountsModal");
            if (existing) existing.remove();
            if (typeof showToast === 'function') {
                showToast("Erro ao abrir modal de contas silenciadas. Veja o console.");
            }
        }
    }

    async function unmuteUsers(usersToUnmute, callback, actionType = 'unmute', targetType = 'all') {
        let cancelled = false;
        const { bar, update, closeButton } = createCancellableProgressBar();
        closeButton.onclick = () => {
            cancelled = true;
            bar.remove();
            alert("Processo interrompido.");
        };
        const isCancelled = () => cancelled;
        const isUnmute = actionType === 'unmute' || actionType === false;
        if (typeof toggleLoading === 'function') toggleLoading(true, 0, isUnmute ? "Reativando som..." : "Silenciando contas...");

        const originalPath = window.location.pathname;

        // --- LÓGICA API VS HUMANA ---
        if (typeof loadSettings === 'function' && loadSettings().useApi) {
            for (let i = 0; i < usersToUnmute.length; i++) {
                if (isCancelled()) break;
                const username = usersToUnmute[i];
                if (typeof toggleLoading === 'function') toggleLoading(true, ((i + 1) / usersToUnmute.length) * 100, "Processando via API...");
                update(i + 1, usersToUnmute.length, `Processando ${username} via API...`);
                let uid = null;
                if (typeof seguindoList !== 'undefined' && Array.isArray(seguindoList)) {
                    const item = seguindoList.find(x => x?.username?.toLowerCase() === username.toLowerCase());
                    if (item?.id) uid = String(item.id);
                }
                if (!uid) uid = getCachedUserId(username) || (typeof getUserId === 'function' ? await getUserId(username) : null);
                if (uid) {
                    try {
                        let successStories = false;
                        let successPosts = false;
                        const action = isUnmute ? 'unmute' : 'mute';

                        if (targetType === 'stories' || targetType === 'all') {
                            const res = await executeGraphqlMute(uid, 'stories', action);
                            successStories = res.success;
                        }
                        if (targetType === 'posts' || targetType === 'all') {
                            const res = await executeGraphqlMute(uid, 'posts', action);
                            successPosts = res.success;
                        }

                        if (successStories || successPosts) {
                            if (!userListCache.muted) userListCache.muted = new Set();
                            if (!userListCache.mutedDetails) userListCache.mutedDetails = new Map();

                            const uLower = username.toLowerCase().trim();
                            if (isUnmute) {
                                if (targetType === 'all') {
                                    userListCache.muted.delete(uLower);
                                    userListCache.mutedDetails.delete(uLower);
                                } else if (targetType === 'stories') {
                                    const cur = userListCache.mutedDetails.get(uLower);
                                    if (cur === 'Stories e Publicações') userListCache.mutedDetails.set(uLower, 'Publicações');
                                    else { userListCache.muted.delete(uLower); userListCache.mutedDetails.delete(uLower); }
                                } else if (targetType === 'posts') {
                                    const cur = userListCache.mutedDetails.get(uLower);
                                    if (cur === 'Stories e Publicações') userListCache.mutedDetails.set(uLower, 'Stories');
                                    else { userListCache.muted.delete(uLower); userListCache.mutedDetails.delete(uLower); }
                                }
                            } else {
                                userListCache.muted.add(uLower);
                                userListCache.mutedDetails.set(uLower, targetType === 'all' ? 'Stories e Publicações' : (targetType === 'stories' ? 'Stories' : 'Publicações'));
                            }
                            if (typeof dbHelper !== 'undefined') await dbHelper.saveCache('muted', Array.from(userListCache.muted).map(u => ({ username: u, status: userListCache.mutedDetails.get(u) || '' })));
                            console.log(`[IG Tools Mute] Usuário ${username} ${isUnmute ? 'reativado' : 'silenciado'} com sucesso via API GraphQL!`);
                        } else {
                            console.warn(`[IG Tools Mute] Não foi possível ${isUnmute ? 'reativar' : 'silenciar'} ${username} via GraphQL.`);
                        }
                    } catch (e) {
                        console.error(`Erro API Mute ${username}`, e);
                    }
                } else {
                    console.warn(`[IG Tools Mute] ID não encontrado para ${username}`);
                }
                await new Promise(r => setTimeout(r, 400));
            }
            bar.remove(); if (callback) callback(); return;
        }

        for (let i = 0; i < usersToUnmute.length; i++) {
            if (isCancelled()) break;
            const username = usersToUnmute[i];
            update(i + 1, usersToUnmute.length, isUnmute ? `Reativando som de @${username}:` : `Silenciando @${username}:`);

            // 1. Navegar para o perfil do usuário
            history.pushState(null, null, `/${username}/`);
            window.dispatchEvent(new Event("popstate"));
            await new Promise(resolve => setTimeout(resolve, 4000));

            // 2. Clicar no botão "Seguindo"
            const followingButton = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]')).find(el => {
                const text = el.innerText.trim();
                return text === 'Seguindo' || text === 'Following';
            });
            if (!followingButton) {
                console.warn(`Botão 'Seguindo' não encontrado para ${username}. Pulando.`);
                continue;
            }
            if (typeof simulateClick === 'function') simulateClick(followingButton);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 3. Clicar na opção "Silenciar"
            const muteOption = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], div[role="menuitem"]')).find(el =>
                el.innerText.trim() === 'Silenciar' ||
                (el.querySelector('span') && el.querySelector('span').innerText.trim() === 'Silenciar')
            );
            if (!muteOption) {
                console.warn(`Opção 'Silenciar' não encontrada para ${username}. Pulando.`);
                if (followingButton && typeof simulateClick === 'function') simulateClick(followingButton);
                continue;
            }
            if (typeof simulateClick === 'function') simulateClick(muteOption);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. Desativar/Ativar os toggles de "Publicações" e "Stories"
            let optionsToToggle = [];
            if (targetType === 'posts' || targetType === 'all') optionsToToggle.push('Publicações', 'Posts');
            if (targetType === 'stories' || targetType === 'all') optionsToToggle.push('Stories');

            for (const optionText of optionsToToggle) {
                const textElement = Array.from(document.querySelectorAll('span, div')).find(el => el.innerText.trim() === optionText);
                if (!textElement) continue;

                const rowContainer = textElement.closest('div[role="button"]');
                if (rowContainer) {
                    const stateIndicator = rowContainer.querySelector('input[type="checkbox"], div[role="switch"]');
                    if (stateIndicator) {
                        const isChecked = stateIndicator.getAttribute('aria-checked') === 'true';
                        const shouldClick = isUnmute ? isChecked : !isChecked;
                        if (shouldClick && typeof simulateClick === 'function') {
                            if (optionText === 'Publicações' || optionText === 'Posts') {
                                simulateClick(stateIndicator, true);
                            } else {
                                simulateClick(rowContainer);
                            }
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                }
            }

            // 5. Clicar em Salvar se existir
            const saveButton = Array.from(document.querySelectorAll('button, div[role="button"]')).find(
                btn => ['Salvar', 'Save', 'Concluído', 'Done'].includes(btn.innerText.trim())
            );

            if (saveButton && typeof simulateClick === 'function') {
                simulateClick(saveButton);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                await new Promise(resolve => setTimeout(resolve, 2500));
            }

            const backButton = document.querySelector('button svg[aria-label="Voltar"], button svg[aria-label="Back"]')?.closest('button');
            if (backButton && typeof simulateClick === 'function') {
                simulateClick(backButton);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        bar.remove();

        history.pushState(null, null, originalPath);
        window.dispatchEvent(new Event("popstate"));
        if (callback) callback();
    }

    // Exportação para o barramento global
    const mutedAccountsModule = {
        showMuteOptionsModal,
        scanMutedAccountsDomRows,
        extractMutedAccountsUsernames,
        abrirModalContasSilenciadas,
        unmuteUsers,
        executeGraphqlMute,
        executePolarisMute
    };

    window.IGTools.MutedAccounts = mutedAccountsModule;

    // Aliases globais de retrocompatibilidade
    window.showMuteOptionsModal = showMuteOptionsModal;
    window.scanMutedAccountsDomRows = scanMutedAccountsDomRows;
    window.extractMutedAccountsUsernames = extractMutedAccountsUsernames;
    window.abrirModalContasSilenciadas = abrirModalContasSilenciadas;
    window.unmuteUsers = unmuteUsers;
    window.executeGraphqlMute = executeGraphqlMute;
    window.executePolarisMute = executePolarisMute;
})();
