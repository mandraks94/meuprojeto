// src/features/blocked-accounts.js - Módulo de Gerenciamento de Contas Bloqueadas e Desbloqueadas
window.IGTools = window.IGTools || {};

(function () {
    'use strict';

    // Helpers compartilhados e fallbacks de barramento
    const getActorId = () => (typeof window.getActorId === 'function' ? window.getActorId() : '') || (typeof window.getCookie === 'function' ? window.getCookie('ds_user_id') : '') || '';
    const getCookie = (name) => (typeof window.getCookie === 'function' ? window.getCookie(name) : '') || '';
    const getLoggedInUsername = () => (typeof window.getLoggedInUsername === 'function' ? window.getLoggedInUsername() : '') || '';
    const getLsdToken = () => (typeof window.getLsdToken === 'function' ? window.getLsdToken() : '') || (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken('lsd') : '') || '';
    const getDtsgToken = () => (typeof window.getDtsgToken === 'function' ? window.getDtsgToken() : '') || (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken('fb_dtsg') : '') || '';
    const computeJazoest = (dtsg) => (typeof window.computeJazoest === 'function' ? window.computeJazoest(dtsg) : '25862');
    const getSpinParams = () => (typeof window.getSpinParams === 'function' ? window.getSpinParams() : { spin_r: '1048608279', spin_b: 'trunk', spin_t: '' });
    const getInstagramFormToken = (name) => (typeof window.getInstagramFormToken === 'function' ? window.getInstagramFormToken(name) : '');
    const getApiHeaders = (isGql = false) => (typeof window.getApiHeaders === 'function' ? window.getApiHeaders(isGql) : {});
    const getCachedUserId = (user) => (typeof window.getCachedUserId === 'function' ? window.getCachedUserId(user) : null);
    const setCachedUserId = (user, id) => (typeof window.setCachedUserId === 'function' ? window.setCachedUserId(user, id) : null);
    const getUserId = async (user) => (typeof window.getUserId === 'function' ? await window.getUserId(user) : null);
    async function executeGraphqlBlockMany(targetUserIds = []) {
        if (!targetUserIds || targetUserIds.length === 0) return { success: false, error: 'no_uids' };

        const idList = targetUserIds.map(String);
        const viewerId = getCookie('ds_user_id') || getInstagramFormToken('av') || '';
        const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
        const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
        const jazoest = computeJazoest(fbDtsg) || '26261';
        const spin = typeof getSpinParams === 'function' ? getSpinParams() : {};

        const variables = {
            surface: null,
            target_user_ids: idList
        };

        const body = new URLSearchParams();
        body.append('__comet_req', '7');
        if (viewerId) body.append('av', viewerId);
        if (fbDtsg) body.append('fb_dtsg', fbDtsg);
        if (jazoest) body.append('jazoest', jazoest);
        if (lsd) body.append('lsd', lsd);
        if (spin.spin_r) body.append('__spin_r', spin.spin_r);
        body.append('__spin_b', spin.spin_b || 'trunk');
        if (spin.spin_t) body.append('__spin_t', spin.spin_t);
        body.append('__crn', 'comet.igweb.PolarisProfilePostsTabRoute');
        body.append('fb_api_caller_class', 'RelayModern');
        body.append('fb_api_req_friendly_name', 'usePolarisBlockManyMutation');
        body.append('server_timestamps', 'true');
        body.append('variables', JSON.stringify(variables));
        body.append('doc_id', '39139849082272635');

        const headers = {
            ...(typeof getApiHeaders === 'function' ? getApiHeaders(true) : {}),
            'X-ASBD-ID': '359341',
            'X-Bloks-Version-Id': '62077fc559de123afe03ebeb18194a88ba5d4e6874d9a07873752f3792adb8a0',
            'X-CSRFToken': getCookie('csrftoken') || '',
            'X-FB-Friendly-Name': 'usePolarisBlockManyMutation',
            'X-FB-LSD': lsd,
            'X-IG-App-ID': '936619743392459',
            'X-IG-Max-Touch-Points': '0',
            'X-Root-Field-Name': 'xdt_block_many',
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        try {
            console.log(`[IG Tools Block] Enviando mutação GraphQL para UIDs:`, idList, variables);
            let response = await fetch('https://www.instagram.com/api/graphql', {
                method: 'POST',
                headers,
                body: body.toString(),
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                console.warn(`[IG Tools Block] Tentativa em /api/graphql retornou ${response.status}, tentando fallback /graphql/query...`);
                response = await fetch('https://www.instagram.com/graphql/query', {
                    method: 'POST',
                    headers,
                    body: body.toString(),
                    credentials: 'include',
                    cache: 'no-store'
                });
            }

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

            const isAlreadyBlocked = (
                JSON.stringify(data || '').toLowerCase().includes('already') ||
                JSON.stringify(data || '').toLowerCase().includes('bloqueado') ||
                rawText.toLowerCase().includes('already') ||
                rawText.toLowerCase().includes('bloqueado')
            );

            const hasData = !!(data?.data?.xdt_block_many || data?.data);
            const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0 && !hasData;
            const success = (response.ok || response.status === 200) && (!hasErrors || isAlreadyBlocked) && (hasData || isAlreadyBlocked);

            return {
                response,
                success,
                isAlreadyBlocked,
                result: { status: success ? 'ok' : 'fail', data },
                text: rawText,
                data
            };
        } catch (e) {
            console.error('[IG Tools Block] Erro na requisição GraphQL:', e);
            return { response: { ok: false, status: 0 }, success: false, result: null, text: String(e) };
        }
    }

    async function executeApiBlock(uid, username = '') {
        if (!uid) return { success: false, error: 'no_uid' };
        try {
            const gqlRes = await executeGraphqlBlockMany([uid]);
            if (gqlRes.success || gqlRes.isAlreadyBlocked) {
                console.log(`[IG Tools Block] Sucesso via Polaris GraphQL para UID ${uid} (@${username})`);
                return { success: true, data: gqlRes.data, method: 'graphql', isAlreadyBlocked: gqlRes.isAlreadyBlocked };
            }
            console.warn(`[IG Tools Block] Falha na mutação Polaris GraphQL para @${username}:`, gqlRes);
            return { success: false, error: 'graphql_failed', data: gqlRes.data };
        } catch (e) {
            console.error(`[IG Tools Block] Erro no Polaris GraphQL para @${username}:`, e);
            return { success: false, error: String(e) };
        }
    }

    async function executeGraphqlUnblock(uid) {
        if (!uid) return { response: { ok: false, status: 0 }, success: false, result: null, text: 'no_uid' };

        const viewerId = getCookie('ds_user_id') || getInstagramFormToken('av') || '';
        const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
        const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
        const jazoest = computeJazoest(fbDtsg) || '26261';
        const spin = typeof getSpinParams === 'function' ? getSpinParams() : {};

        const variables = { target_user_id: String(uid) };

        const body = new URLSearchParams();
        body.append('__comet_req', '7');
        if (viewerId) body.append('av', viewerId);
        if (fbDtsg) body.append('fb_dtsg', fbDtsg);
        if (jazoest) body.append('jazoest', jazoest);
        if (lsd) body.append('lsd', lsd);
        if (spin.spin_r) body.append('__spin_r', spin.spin_r);
        body.append('__spin_b', spin.spin_b || 'trunk');
        if (spin.spin_t) body.append('__spin_t', spin.spin_t);
        body.append('__crn', 'comet.igweb.PolarisProfilePostsTabRoute');
        body.append('fb_api_caller_class', 'RelayModern');
        body.append('fb_api_req_friendly_name', 'usePolarisUnblockMutation');
        body.append('server_timestamps', 'true');
        body.append('variables', JSON.stringify(variables));
        body.append('doc_id', '28398337623154952');

        const headers = {
            ...(typeof getApiHeaders === 'function' ? getApiHeaders(true) : {}),
            'X-ASBD-ID': '359341',
            'X-Bloks-Version-Id': '62077fc559de123afe03ebeb18194a88ba5d4e6874d9a07873752f3792adb8a0',
            'X-CSRFToken': getCookie('csrftoken') || '',
            'X-FB-Friendly-Name': 'usePolarisUnblockMutation',
            'X-FB-LSD': lsd,
            'X-IG-App-ID': '936619743392459',
            'X-IG-Max-Touch-Points': '0',
            'X-Root-Field-Name': 'xdt_unblock',
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        try {
            console.log(`[IG Tools Unblock] Enviando mutação GraphQL para UID ${uid}...`, variables);
            let response = await fetch('https://www.instagram.com/api/graphql', {
                method: 'POST',
                headers,
                body: body.toString(),
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                response = await fetch('https://www.instagram.com/graphql/query', {
                    method: 'POST',
                    headers,
                    body: body.toString(),
                    credentials: 'include',
                    cache: 'no-store'
                });
            }

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

            const hasData = !!(data?.data?.xdt_unblock || data?.data);
            const isUnblocked = data?.data?.xdt_unblock?.friendship_status?.blocking === false;
            const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0 && !hasData;
            const success = (response.ok || response.status === 200) && !hasErrors && (isUnblocked || hasData);

            return {
                response,
                success,
                result: { status: success ? 'ok' : 'fail', data },
                text: rawText,
                data
            };
        } catch (e) {
            console.error('[IG Tools Unblock] Erro na requisição GraphQL:', e);
            return { response: { ok: false, status: 0 }, success: false, result: null, text: String(e) };
        }
    }


    async function executeApiUnblock(uid, username = '') {
        if (!uid) return { success: false, error: 'no_uid' };
        try {
            const gqlRes = await executeGraphqlUnblock(uid);
            if (gqlRes.success) {
                console.log(`[IG Tools Unblock] Sucesso via GraphQL para UID ${uid} (@${username})`);
                return { success: true, data: gqlRes.data, method: 'graphql' };
            }
            console.warn(`[IG Tools Unblock] Falha na mutação GraphQL para @${username}:`, gqlRes);
            return { success: false, error: 'graphql_failed', data: gqlRes.data };
        } catch (e) {
            console.error(`[IG Tools Unblock] Erro no GraphQL para @${username}:`, e);
            return { success: false, error: String(e) };
        }
    }

    window.executeGraphqlBlockMany = executeGraphqlBlockMany;
    window.executeApiBlock = executeApiBlock;
    window.executeGraphqlUnblock = executeGraphqlUnblock;
    window.executeApiUnblock = executeApiUnblock;
    const showToast = (msg, dur) => (window.IGTools?.DOMUtils?.showToast ? window.IGTools.DOMUtils.showToast(msg, dur) : (typeof window.showToast === 'function' ? window.showToast(msg, dur) : null));
    const toggleLoading = (loading, pct, msg) => (window.IGTools?.DOMUtils?.toggleLoading ? window.IGTools.DOMUtils.toggleLoading(loading, pct, msg) : (typeof window.toggleLoading === 'function' ? window.toggleLoading(loading, pct, msg) : null));
    const createCancellableProgressBar = () => (typeof window.createCancellableProgressBar === 'function' ? window.createCancellableProgressBar() : { bar: document.createElement('div'), update: () => {}, closeButton: document.createElement('button') });
    const loadSettings = () => (window.IGTools?.Storage?.loadSettings ? window.IGTools.Storage.loadSettings() : (typeof window.loadSettings === 'function' ? window.loadSettings() : {}));
    const saveSettings = (s) => (window.IGTools?.Storage?.saveSettings ? window.IGTools.Storage.saveSettings(s) : (typeof window.saveSettings === 'function' ? window.saveSettings(s) : null));
    const dbHelper = window.IGTools?.Storage?.dbHelper || window.dbHelper || {};
    const googleAuth = window.IGTools?.Storage?.googleAuth || window.googleAuth || { isConnected: () => false, login: () => {} };
    const isValidInstagramUsername = (u) => (typeof window.isValidInstagramUsername === 'function' ? window.isValidInstagramUsername(u) : true);
    const resolveUserPhoto = (uname, url) => (typeof window.resolveUserPhoto === 'function' ? window.resolveUserPhoto(uname, url) : (url || DEFAULT_AVATAR));
    const DEFAULT_AVATAR = window.DEFAULT_AVATAR || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.37-2.57 5.05-2.57s5.02.91 5.05 2.57C15.8 19.15 14.03 20 12 20z'/%3E%3C/svg%3E";
    const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;

    // Helper para filtrar nomes proibidos ou capturados incorretamente do DOM da tela de perfil/feed
    function isForbiddenBlockedUsername(uname) {
        if (!uname || typeof uname !== 'string') return true;
        const clean = uname.toLowerCase().trim();
        const myUname = (getLoggedInUsername() || '').toLowerCase().trim();
        const forbidden = [
            'destaques', 'novo', 'highlights', 'new', 'salvar', 'save',
            'concluído', 'done', 'editar', 'edit', 'cancelar', 'cancel',
            'pesquisar', 'search', 'configurações', 'settings', 'instagram',
            'threads', 'publicações', 'stories', 'reels', 'seguidores', 'seguindo'
        ];
        if (forbidden.includes(clean)) return true;
        if (myUname && clean === myUname) return true;
        if (!isValidInstagramUsername(clean)) return true;
        return false;
    }

    function sanitizeBlockedList(list) {
        if (!Array.isArray(list)) return [];
        return list.filter(u => {
            if (!u || !u.username) return false;
            return !isForbiddenBlockedUsername(u.username);
        });
    }

    // Cache persistente de contas bloqueadas (permite abertura INSTANTÂNEA em 0ms)
    let cachedBlockedAccounts = [];
    try {
        const saved = localStorage.getItem('ig_tools_cached_blocked');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cachedBlockedAccounts = sanitizeBlockedList(parsed);
                if (cachedBlockedAccounts.length !== parsed.length) {
                    localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(cachedBlockedAccounts));
                }
            }
        }
    } catch (_) { }

    // Cache persistente de contas desbloqueadas (sincronizado com Google Drive)
    let cachedUnblockedAccounts = [];
    try {
        const savedUnblocked = localStorage.getItem('ig_tools_cached_unblocked');
        if (savedUnblocked) {
            const parsedUnblocked = JSON.parse(savedUnblocked);
            if (Array.isArray(parsedUnblocked) && parsedUnblocked.length > 0) {
                cachedUnblockedAccounts = parsedUnblocked;
            }
        }
    } catch (_) { }

    async function fetchBlockedAccountsWbloks() {
        try {
            const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
            const jazoest = computeJazoest(fbDtsg) || '25862';
            const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
            const spin = getSpinParams();

            const dyn = getInstagramFormToken('__dyn') || '';
            const csr = getInstagramFormToken('__csr') || '';
            const hsdp = getInstagramFormToken('__hsdp') || '';
            const hblp = getInstagramFormToken('__hblp') || '';
            const sjsp = getInstagramFormToken('__sjsp') || getInstagramFormToken('_sjsp') || '';
            const sParam = getInstagramFormToken('__s') || '';
            const hsi = getInstagramFormToken('__hsi') || '';
            const hs = getInstagramFormToken('__hs') || '';

            const url = 'https://www.instagram.com/async/wbloks/fetch/?appid=com.instagram.portable_settings.blocked_accounts.blocked_accounts_reloader&type=action&__bkv=62077fc559de123afe03ebeb18194a88ba5d4e6874d9a07873752f3792adb8a0';

            const viewerId = window._sharedData?.config?.viewerId || getCookie('ds_user_id') || getCookie('sessionid')?.split('%')[0] || '0';
            const cursorInfo = window._igBlockedCursorInfo || {};
            const body = new URLSearchParams({
                params: JSON.stringify({
                    container_id_of_list: cursorInfo.listId || cursorInfo.containerId || "2073224587",
                    container_id_of_rows: cursorInfo.rowsId || "2073224588"
                }),
                __crn: 'comet.igweb.PolarisBlockedAccountsSettingsRoute',
                __comet_req: '7',
                server_timestamps: 'true',
                __d: 'www',
                __user: viewerId,
                av: viewerId,
                __a: '1',
                __req: '7',
                __hs: hs || '20550.HYP:instagram_web_pkg.2.1..0.0',
                dpr: String(window.devicePixelRatio || 1),
                __ccg: 'EXCELLENT',
                __rev: spin.spin_r || '1048608279',
                __s: sParam,
                __hsi: hsi,
                __dyn: dyn || '7xeUMWS2e5U4-1twp142w4vwKxW4E462m12wUwtU662W0CEbo1nEhw2nVE4W0om78687e2l0F86C1mw5ux615x60Vo1upE4W0OE2ZwrU6C072e',
                __csr: csr || 'gE0B5B',
                __hsdp: hsdp,
                __hblp: hblp,
                __sjsp: sjsp,
                _sjsp: sjsp,
                __spin_r: spin.spin_r || '1048608279',
                __spin_b: spin.spin_b || 'trunk',
                __spin_t: spin.spin_t || String(Math.floor(Date.now() / 1000))
            });

            if (fbDtsg) body.append('fb_dtsg', fbDtsg);
            if (jazoest) body.append('jazoest', jazoest);
            if (lsd) body.append('lsd', lsd);

            const headers = {
                ...getApiHeaders(true),
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'X-FB-LSD': lsd
            };

            console.log('[IG Tools Bloqueados] Buscando contas bloqueadas via Wbloks endpoint...');
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: body.toString(),
                credentials: 'include',
                cache: 'no-store',
                signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
            });

            if (!response.ok) {
                console.warn('[IG Tools Bloqueados] Resposta Wbloks HTTP', response.status);
                return null;
            }

            const rawText = await response.text();
            if (typeof window.parseBlockedBloksText === 'function') {
                const parsed = window.parseBlockedBloksText(rawText);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`[IG Tools Bloqueados] Extraídos ${parsed.length} usuários via Wbloks com sucesso.`);
                    return sanitizeBlockedList(parsed);
                }
            }

            console.log('[IG Tools Bloqueados] Wbloks endpoint retornou 0 usuários estruturados.');
            return null;
        } catch (err) {
            console.error('[IG Tools Bloqueados] Erro ao buscar Wbloks:', err);
            return null;
        }
    }

    async function fetchBlockedAccountsPageHtml() {
        try {
            console.log('[IG Tools Bloqueados] Tentando buscar página de contas bloqueadas via background fetch...');
            const response = await fetch('https://www.instagram.com/accounts/blocked_accounts/', {
                credentials: 'include',
                headers: {
                    ...getApiHeaders(true),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                cache: 'no-store'
            });
            if (!response.ok) return null;
            const html = await response.text();
            if (typeof window.parseBlockedBloksText === 'function') {
                const users = window.parseBlockedBloksText(html);
                if (Array.isArray(users) && users.length > 0) {
                    console.log(`[IG Tools Bloqueados] Extraídos ${users.length} usuários via HTML oficial.`);
                    return sanitizeBlockedList(users);
                }
            }
            return null;
        } catch (e) {
            console.warn('[IG Tools Bloqueados] Erro ao buscar HTML em segundo plano:', e);
            return null;
        }
    }

    function extractBlockedAccountsUsernames(doc = document) {
        return new Promise(async (resolve) => {
            const wbloksUsers = await fetchBlockedAccountsWbloks();
            if (wbloksUsers && wbloksUsers.length > 0) {
                const clean = sanitizeBlockedList(wbloksUsers);
                if (clean.length > 0) {
                    resolve(clean);
                    return;
                }
            }

            const isOnBlockedPage = window.location.pathname.startsWith('/accounts/blocked_accounts');
            if (!isOnBlockedPage) {
                console.log('[IG Tools Bloqueados] Fora de /accounts/blocked_accounts. Tentando background HTML fetch...');
                const bgUsers = await fetchBlockedAccountsPageHtml();
                if (bgUsers && bgUsers.length > 0) {
                    resolve(bgUsers);
                    return;
                }
                console.warn('[IG Tools Bloqueados] Não é seguro extrair contas bloqueadas fora da tela oficial. Retornando vazio.');
                resolve([]);
                return;
            }

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
            update(0, 0, "Buscando e rolando a lista de contas bloqueadas...");

            function finishExtraction() {
                if (scrollInterval) clearInterval(scrollInterval);
                if (window._igBlockedUsersCapture && window._igBlockedUsersCapture.callbacks) {
                    const idx = window._igBlockedUsersCapture.callbacks.indexOf(networkCallback);
                    if (idx !== -1) window._igBlockedUsersCapture.callbacks.splice(idx, 1);
                }
                if (bar) bar.remove();
                console.log(`[IG Tools] Extração de bloqueados finalizada. Total de ${users.size} usuários.`);
                users.forEach(u => {
                    if (u.username && u.pk) setCachedUserId(u.username, u.pk);
                });
                resolve(cancelled ? [] : sanitizeBlockedList(Array.from(users.values())));
            }

            function tryExtractFromSSRScripts() {
                try {
                    const scripts = Array.from(doc.querySelectorAll('script'));
                    for (const script of scripts) {
                        const text = script.textContent || '';
                        if (!text || text.length < 50) continue;
                        const isRelevant = text.includes('bk.action.array.Make') ||
                            text.includes('blocked_accounts') ||
                            text.includes('PolarisBlockedAccounts') ||
                            text.includes('is_auto_blocked') ||
                            text.includes('portable_settings.blocked_accounts');
                        if (!isRelevant) continue;

                        if (typeof window.parseBlockedBloksText === 'function') {
                            const parsed = window.parseBlockedBloksText(text);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                parsed.forEach(u => {
                                    if (u && u.username && !isForbiddenBlockedUsername(u.username) && !users.has(u.username.toLowerCase())) {
                                        users.set(u.username.toLowerCase(), u);
                                    }
                                });
                            }
                        }
                    }
                    if (users.size > 0) {
                        console.log(`[IG Tools Bloqueados] Extraídos ${users.size} usuário(s) via SSR scripts da página.`);
                        update(users.size, users.size, `Carregados ${users.size} usuário(s) iniciais...`);
                    }
                } catch (e) {
                    console.warn('[IG Tools Bloqueados] Erro ao extrair SSR scripts:', e);
                }
            }

            tryExtractFromSSRScripts();

            if (window._igBlockedUsersCapture && window._igBlockedUsersCapture.users) {
                window._igBlockedUsersCapture.users.forEach(u => {
                    if (u && u.username && !isForbiddenBlockedUsername(u.username)) {
                        const k = u.username.toLowerCase();
                        if (!users.has(k)) {
                            users.set(k, { username: u.username, photoUrl: u.photoUrl, pk: u.pk, id: u.pk, fullName: u.fullName || '', secondaryText: u.secondaryText || '', isAutoBlocked: !!u.isAutoBlocked });
                        } else {
                            const cur = users.get(k);
                            if (!cur.pk && u.pk) { cur.pk = u.pk; cur.id = u.pk; }
                            if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && u.photoUrl !== DEFAULT_AVATAR) cur.photoUrl = u.photoUrl;
                            if (u.isAutoBlocked) cur.isAutoBlocked = true;
                        }
                        if (u.pk) setCachedUserId(u.username, u.pk);
                    }
                });
            }

            function networkCallback(capturedArray) {
                let added = false;
                capturedArray.forEach(u => {
                    if (u && u.username && !isForbiddenBlockedUsername(u.username)) {
                        const k = u.username.toLowerCase();
                        if (!users.has(k)) {
                            users.set(k, { username: u.username, photoUrl: u.photoUrl, pk: u.pk, id: u.pk, fullName: u.fullName || '', secondaryText: u.secondaryText || '', isAutoBlocked: !!u.isAutoBlocked });
                            added = true;
                        } else {
                            const cur = users.get(k);
                            if (!cur.pk && u.pk) { cur.pk = u.pk; cur.id = u.pk; }
                            if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && u.photoUrl !== DEFAULT_AVATAR) cur.photoUrl = u.photoUrl;
                            if (u.isAutoBlocked) cur.isAutoBlocked = true;
                        }
                        if (u.pk) setCachedUserId(u.username, u.pk);
                    }
                });
                if (added) {
                    noNewUsersCount = 0;
                    update(users.size, users.size, `Capturado(s) ${users.size} usuário(s)... Rolando...`);
                }
            }
            if (window._igBlockedUsersCapture) {
                window._igBlockedUsersCapture.callbacks.push(networkCallback);
            }

            function performScrollAndExtract() {
                if (cancelled) return;
                const initialUserCount = users.size;

                const unblockKeywords = ['desbloquear', 'unblock', 'débloquer', 'sblocca', 'blockierung aufheben', 'desbloquea'];
                const allButtons = Array.from(doc.querySelectorAll('button, div[role="button"]'));
                const unblockButtons = allButtons.filter(b => {
                    if (b.closest('#blockedAccountsModal') || b.id?.startsWith('blocked') || b.classList?.contains('btn-unblock-row')) return false;
                    const txt = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                    return unblockKeywords.some(kw => txt === kw || txt.includes(kw));
                });

                unblockButtons.forEach(btn => {
                    let row = btn.closest('div[role="listitem"], li');
                    if (!row) {
                        let p = btn;
                        for (let depth = 0; depth < 5; depth++) {
                            if (p.parentElement && p.parentElement !== doc.body && p.parentElement.tagName !== 'MAIN') {
                                p = p.parentElement;
                                if (p.querySelector('img') || (p.innerText && p.innerText.includes('\n'))) {
                                    row = p;
                                    break;
                                }
                            }
                        }
                    }
                    if (!row) row = btn.parentElement?.parentElement || btn.parentElement;

                    let username = '';
                    let fullName = '';
                    let isAutoBlocked = false;

                    const link = row.querySelector('a[href^="/"]');
                    if (link) {
                        const href = link.getAttribute('href') || '';
                        const m = href.match(/^\/([a-zA-Z0-9._]+)\/?$/);
                        if (m && !isForbiddenBlockedUsername(m[1])) {
                            username = m[1];
                        }
                    }

                    if (!username) {
                        const textElements = Array.from(row.querySelectorAll('span, div, p'));
                        for (const el of textElements) {
                            const t = (el.innerText || el.textContent || '').trim();
                            if (/^[a-zA-Z0-9._]{1,30}$/.test(t) && !t.includes(' ') && !isForbiddenBlockedUsername(t)) {
                                if (!unblockKeywords.some(kw => t.toLowerCase().includes(kw))) {
                                    username = t;
                                    break;
                                }
                            }
                        }
                    }

                    if (!username && row.innerText) {
                        const lines = row.innerText.split('\n').map(l => l.trim()).filter(Boolean);
                        for (const line of lines) {
                            if (/^[a-zA-Z0-9._]{1,30}$/.test(line) && !line.includes(' ') && !isForbiddenBlockedUsername(line)) {
                                if (!unblockKeywords.some(kw => line.toLowerCase().includes(kw))) {
                                    username = line;
                                    break;
                                }
                            }
                        }
                    }

                    if (username && !isForbiddenBlockedUsername(username)) {
                        const k = username.toLowerCase();
                        const imgTag = row.querySelector('img');
                        const photoUrl = (imgTag && imgTag.src && !imgTag.src.includes('rsrc.php')) ? imgTag.src : DEFAULT_AVATAR;
                        const rowText = (row.innerText || '').toLowerCase();
                        if (rowText.includes('outras contas') || rowText.includes('other accounts')) {
                            isAutoBlocked = true;
                        }

                        const pk = getCachedUserId(username) || '';
                        if (!users.has(k)) {
                            users.set(k, {
                                username,
                                photoUrl,
                                pk,
                                id: pk,
                                fullName,
                                secondaryText: isAutoBlocked ? 'Inclui outras contas que o usuário tiver ou criar' : fullName,
                                isAutoBlocked
                            });
                        } else {
                            const cur = users.get(k);
                            if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) {
                                cur.photoUrl = photoUrl;
                            }
                            if (!cur.pk && pk) { cur.pk = pk; cur.id = pk; }
                            if (isAutoBlocked) cur.isAutoBlocked = true;
                        }
                    }
                });

                const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                    el.querySelector('span[data-bloks-name="bk.components.Text"]') || (el.querySelector('img') && el.innerText && el.innerText.includes('\n'))
                );

                userElements.forEach(el => {
                    let username = '';
                    const bloksSpan = el.querySelector('span[data-bloks-name="bk.components.Text"]');
                    if (bloksSpan) {
                        username = bloksSpan.innerText.trim();
                    } else {
                        const spans = el.querySelectorAll('span, p, div');
                        for (const span of spans) {
                            const t = span.innerText?.trim() || '';
                            if (/^[a-zA-Z0-9._]{3,30}$/.test(t) && !t.includes(' ')) {
                                username = t; break;
                            }
                        }
                    }

                    if (username && !isForbiddenBlockedUsername(username)) {
                        const k = username.toLowerCase();
                        const imgTag = el.querySelector('img');
                        const photoUrl = imgTag ? imgTag.src : DEFAULT_AVATAR;
                        const pk = getCachedUserId(username) || '';
                        if (!users.has(k)) {
                            users.set(k, { username, photoUrl, pk, id: pk, fullName: '', secondaryText: '', isAutoBlocked: false });
                        } else {
                            const cur = users.get(k);
                            if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) cur.photoUrl = photoUrl;
                            if (!cur.pk && pk) { cur.pk = pk; cur.id = pk; }
                        }
                    }
                });

                update(users.size, users.size, `Encontrado(s) ${users.size} usuário(s)... Rolando...`);

                if (users.size === initialUserCount) {
                    noNewUsersCount++;
                } else {
                    noNewUsersCount = 0;
                }

                const idleLimit = users.size > 0 ? maxIdleCount : 20;
                if (noNewUsersCount >= idleLimit) {
                    finishExtraction();
                    return;
                }

                const scrollContainer = doc.querySelector('div[role="dialog"] ._aano') ||
                    doc.querySelector('div[role="dialog"] div[style*="overflow-y: auto"]') ||
                    doc.querySelector('main div[style*="overflow-y: auto"]') ||
                    doc.querySelector('div[style*="overflow-y: auto"]') ||
                    doc.querySelector('._aano') ||
                    doc.querySelector('main') ||
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
            }, 120000);
        });
    }

    let blockedList = [];
    let unblockedList = [];
    let modalAbertoBlocked = false;

    async function iniciarProcessoBloqueados(autoExtractPolaris = false) {
        const existingModal = document.getElementById("blockedAccountsModal") || document.getElementById("allBlockedAccountsDiv");
        if (existingModal) {
            existingModal.remove();
        }
        if (modalAbertoBlocked) return;
        modalAbertoBlocked = true;
        const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24'><defs><linearGradient id='ig' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23833ab4'/><stop offset='50%25' stop-color='%23fd1d1d'/><stop offset='100%25' stop-color='%23fcb045'/></linearGradient></defs><circle cx='12' cy='12' r='11' fill='url(%23ig)'/><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' fill='%23ffffff'/></svg>";

        blockedList = (Array.isArray(cachedBlockedAccounts) && cachedBlockedAccounts.length > 0)
            ? sanitizeBlockedList([...cachedBlockedAccounts])
            : [];
        cachedBlockedAccounts = blockedList;
        try {
            localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
        } catch (_) { }

        unblockedList = (Array.isArray(cachedUnblockedAccounts) && cachedUnblockedAccounts.length > 0)
            ? [...cachedUnblockedAccounts]
            : [];

        const initialUnblockedNames = new Set(unblockedList.map(u => (u.username || '').toLowerCase()));
        if (initialUnblockedNames.size > 0 && blockedList.length > 0) {
            const prevLen = blockedList.length;
            blockedList = blockedList.filter(u => !initialUnblockedNames.has((u.username || '').toLowerCase()));
            if (blockedList.length !== prevLen) {
                cachedBlockedAccounts = blockedList;
                try {
                    localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                } catch (_) { }
            }
        }

        let currentTab = 'blocked';
        const selectedUsers = new Set();
        let currentPage = 1;
        let sortConfig = { key: 'username', direction: 'ascending' };

        if (googleAuth.isConnected()) {
            dbHelper.loadUnblockedAccounts(true).then(driveList => {
                if (Array.isArray(driveList) && driveList.length > 0) {
                    const map = new Map();
                    driveList.forEach(u => {
                        if (u && u.username) map.set(u.username.toLowerCase(), u);
                    });
                    unblockedList.forEach(u => {
                        if (u && u.username && !map.has(u.username.toLowerCase())) {
                            map.set(u.username.toLowerCase(), u);
                        }
                    });
                    unblockedList = Array.from(map.values());
                    cachedUnblockedAccounts = unblockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
                    } catch (_) { }

                    const driveUnblockedSet = new Set(unblockedList.map(u => (u.username || '').toLowerCase()));
                    const prevBlockedLen = blockedList.length;
                    blockedList = blockedList.filter(u => !driveUnblockedSet.has((u.username || '').toLowerCase()));
                    if (blockedList.length !== prevBlockedLen) {
                        cachedBlockedAccounts = blockedList;
                        try {
                            localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                        } catch (_) { }
                        if (currentTab === 'blocked') {
                            renderList(currentPage);
                        }
                    }

                    updateCounts();
                    if (currentTab === 'unblocked') {
                        renderList(currentPage);
                    }
                }
            }).catch(err => {
                console.warn('[IG Tools] Sincronização silenciosa de desbloqueados do Drive pendente:', err);
            });
        }

        const div = document.createElement("div");
        div.id = "blockedAccountsModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 840px; max-height: 90vh; border: 1px solid #ccc;
            border-radius: 10px; padding: 20px; z-index: 10000; overflow: auto;
        `;

        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    Gerenciador de Contas <span id="blockedSelectedCount" style="font-size:12px; font-weight:normal; color:#e74c3c;">(0 selecionados)</span>
                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie as contas bloqueadas e desbloqueadas. Os desbloqueados são sincronizados automaticamente com o Google Drive e podem ser bloqueados novamente com 1 clique.</span></div>
                </span>
                <div class="modal-controls">
                    <button id="blockedMinimizarBtn" title="Minimizar">_</button>
                    <button id="blockedFecharBtn" title="Fechar">X</button>
                </div>
            </div>

            <!-- BARRA DE ABAS: BLOQUEADOS & DESBLOQUEADOS -->
            <div class="blocked-tabs-bar" style="display: flex; gap: 8px; margin: 15px 0 12px 0; border-bottom: 2px solid #2e2e2e; padding-bottom: 10px;">
                <button id="tabBlockedBtn" type="button" class="blocked-tab-btn active" style="background: #0095f6; color: white; border: none; border-radius: 8px; padding: 9px 18px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; font-size: 13px; transition: all 0.2s;">
                    <span>🔒 Bloqueados</span>
                    <span id="tabBlockedBadge" style="background: rgba(255,255,255,0.25); border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 700;">${blockedList.length}</span>
                </button>
                <button id="tabUnblockedBtn" type="button" class="blocked-tab-btn" style="background: #262626; color: #a8a8a8; border: 1px solid #383838; border-radius: 8px; padding: 9px 18px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; font-size: 13px; transition: all 0.2s;">
                    <span>🔓 Desbloqueados</span>
                    <span id="tabUnblockedBadge" style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 700;">${unblockedList.length}</span>
                </button>
            </div>

            <div style="padding: 5px 0 10px 0;">
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                        <!-- Botões exclusivos da aba Bloqueados -->
                        <button id="blockedRefreshBtn" title="Atualizar dados do Instagram" style="background: #1abc9c; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">🔄 Atualizar</button>
                        <button id="blockedPolarisFullBtn" title="Carregar lista completa de contas bloqueadas (+1000) via Polaris oficial da Meta" style="background: #8e44ad; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">🌐 Carregar via Polaris</button>
                        <button id="blockedImportJsonBtn" title="Importar arquivo JSON de dados baixados da Meta/Instagram" style="background: #34495e; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer; font-weight: 600;">📥 Importar JSON</button>
                        <input type="file" id="blockedJsonFileInput" accept=".json" style="display: none;">
                        <button id="blockedClearCacheBtn" title="Limpar cache local de contas bloqueadas" style="background: #c0392b; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer; font-weight: 600;">🗑️ Limpar Cache</button>
                        <button id="blockedDesbloquearBtn" style="background: #e74c3c; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">🔓 Desbloquear Selecionados</button>

                        <!-- Botões exclusivos da aba Desbloqueados -->
                        <button id="unblockedSyncDriveBtn" title="Sincronizar dados com o Google Drive" style="display: none; background: #4285F4; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">☁️ Sincronizar Drive</button>
                        <button id="unblockedExportCsvBtn" title="Exportar contas desbloqueadas em formato CSV" style="display: none; background: #2ecc71; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">📥 Baixar .CSV</button>
                        <button id="unblockedBloquearBtn" title="Bloquear novamente os usuários selecionados" style="display: none; background: #e74c3c; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">🔒 Bloquear Selecionados</button>
                        <button id="unblockedImportPhotosBtn" title="Carregar arquivo CSV/Excel de fotos e salvar no Google Drive" style="display: none; background: #8e44ad; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">🖼️ Carregar Fotos (Excel)</button>
                        <input type="file" id="unblockedPhotosFileInput" accept=".csv, text/csv, .txt" style="display: none;">
                        <button id="unblockedClearBtn" title="Limpar todas as contas da tabela de desbloqueados" style="display: none; background: #c0392b; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; font-weight: 600;">🗑️ Limpar Desbloqueados</button>

                        <!-- Botões compartilhados -->
                        <button id="blockedMarcarTodosBtn" style="background: #0095f6; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer;">Selecionar Página</button>
                        <button id="blockedDesmarcarTodosBtn" style="background: #6c757d; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer;">Desmarcar Todos</button>
                    </div>
                    <div class="toggle-item" style="padding: 5px 10px; border-radius: 8px; gap: 10px; display: flex; align-items: center;">
                        <span style="font-size: 14px; font-weight: 500;">⚡ Usar API</span>
                        <label class="switch"><input type="checkbox" id="blockedUseApiToggle" ${loadSettings().useApi ? 'checked' : ''}><span class="slider"></span></label>
                    </div>
                </div>
            </div>
            <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                <input type="text" id="blockedSearchInput" placeholder="Pesquisar por @usuário, nome ou ID..." style="flex: 2; padding: 8px 12px; height: 40px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; outline: none; box-sizing: border-box;">
                <select id="blockedFilterSelect" style="flex: 1; padding: 0 10px; height: 40px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; cursor: pointer; outline: none; box-sizing: border-box;">
                    <option value="all">Todos (${blockedList.length})</option>
                    <option value="auto_blocked">🔒 Inclui novas contas (Auto-bloqueio)</option>
                    <option value="standard">👤 Bloqueio padrão</option>
                </select>
            </div>
            <div id="statusBloqueados" style="margin-top: 5px; font-weight: bold; font-size: 13px; color: #555;">
                Total: ${blockedList.length} contas bloqueadas.
                <span id="blockedSyncStatusIndicator" style="font-size: 11px; font-weight: normal; color: #0095f6; margin-left: 10px; display: none;"></span>
            </div>

            <!-- CONTAINER DE ALERTA DE STATUS DO GOOGLE DRIVE -->
            <div id="unblockedDriveAlertContainer" style="display: none; margin: 10px 0 6px 0;"></div>

            <div id="tabelaBloqueadosContainer" style="display: block; margin-top: 15px;"></div>
        `;

        document.body.appendChild(div);

        const container = document.getElementById("tabelaBloqueadosContainer");

        const salvarDesbloqueadosNoDrive = async (lista, showFeedback = false) => {
            unblockedList = lista;
            cachedUnblockedAccounts = unblockedList;
            try {
                localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
            } catch (_) { }

            try {
                await dbHelper.saveUnblockedAccounts(unblockedList);
                if (showFeedback) showToast("☁️ Desbloqueados salvos no Google Drive!");
            } catch (errSync) {
                console.warn('[IG Tools] Falha ao sincronizar com Google Drive:', errSync);
                if (showFeedback) showToast("⚠️ Salvo localmente. Conecte o Google Drive para sincronizar.");
            }
            updateCounts();
        };

        const updateCounts = (paginatedUsers = []) => {
            const countEl = document.getElementById('blockedSelectedCount');
            if (countEl) countEl.innerText = `(${selectedUsers.size} selecionados)`;

            const tabBlockedBadge = document.getElementById('tabBlockedBadge');
            if (tabBlockedBadge) tabBlockedBadge.innerText = blockedList.length;

            const tabUnblockedBadge = document.getElementById('tabUnblockedBadge');
            if (tabUnblockedBadge) tabUnblockedBadge.innerText = unblockedList.length;

            const selectAllCb = document.getElementById('selectAllBlockedCheckbox');
            if (selectAllCb && paginatedUsers.length > 0) {
                selectAllCb.checked = paginatedUsers.every(u => selectedUsers.has(u.username));
            }

            const filterSelect = document.getElementById('blockedFilterSelect');
            if (filterSelect && filterSelect.options.length > 0) {
                if (currentTab === 'blocked') {
                    filterSelect.options[0].text = `Todos (${blockedList.length})`;
                } else {
                    filterSelect.options[0].text = `Todos (${unblockedList.length})`;
                }
            }
        };

        const switchTab = (newTab) => {
            if (currentTab === newTab) return;
            currentTab = newTab;
            selectedUsers.clear();
            currentPage = 1;

            const tabBlockedBtn = document.getElementById('tabBlockedBtn');
            const tabUnblockedBtn = document.getElementById('tabUnblockedBtn');
            const refreshBtn = document.getElementById('blockedRefreshBtn');
            const polarisFullBtn = document.getElementById('blockedPolarisFullBtn');
            const importJsonBtn = document.getElementById('blockedImportJsonBtn');
            const clearCacheBtn = document.getElementById('blockedClearCacheBtn');
            const desbloquearBtn = document.getElementById('blockedDesbloquearBtn');
            const syncDriveBtn = document.getElementById('unblockedSyncDriveBtn');
            const exportCsvBtn = document.getElementById('unblockedExportCsvBtn');
            const bloquearBtn = document.getElementById('unblockedBloquearBtn');
            const importPhotosBtn = document.getElementById('unblockedImportPhotosBtn');
            const clearUnblockedBtn = document.getElementById('unblockedClearBtn');
            const filterSelect = document.getElementById('blockedFilterSelect');
            const driveAlertEl = document.getElementById('unblockedDriveAlertContainer');

            if (currentTab === 'blocked') {
                if (tabBlockedBtn) {
                    tabBlockedBtn.style.background = '#0095f6';
                    tabBlockedBtn.style.color = 'white';
                    tabBlockedBtn.style.border = 'none';
                }
                if (tabUnblockedBtn) {
                    tabUnblockedBtn.style.background = '#262626';
                    tabUnblockedBtn.style.color = '#a8a8a8';
                    tabUnblockedBtn.style.border = '1px solid #383838';
                }
                if (refreshBtn) refreshBtn.style.display = 'inline-block';
                if (polarisFullBtn) polarisFullBtn.style.display = 'inline-block';
                if (importJsonBtn) importJsonBtn.style.display = 'inline-block';
                if (clearCacheBtn) clearCacheBtn.style.display = 'inline-block';
                if (desbloquearBtn) desbloquearBtn.style.display = 'inline-block';
                if (syncDriveBtn) syncDriveBtn.style.display = 'none';
                if (exportCsvBtn) exportCsvBtn.style.display = 'none';
                if (bloquearBtn) bloquearBtn.style.display = 'none';
                if (importPhotosBtn) importPhotosBtn.style.display = 'none';
                if (clearUnblockedBtn) clearUnblockedBtn.style.display = 'none';
                if (driveAlertEl) driveAlertEl.style.display = 'none';

                if (filterSelect) {
                    filterSelect.innerHTML = `
                        <option value="all">Todos (${blockedList.length})</option>
                        <option value="auto_blocked">🔒 Inclui novas contas (Auto-bloqueio)</option>
                        <option value="standard">👤 Bloqueio padrão</option>
                    `;
                }
            } else {
                if (tabUnblockedBtn) {
                    tabUnblockedBtn.style.background = '#0095f6';
                    tabUnblockedBtn.style.color = 'white';
                    tabUnblockedBtn.style.border = 'none';
                }
                if (tabBlockedBtn) {
                    tabBlockedBtn.style.background = '#262626';
                    tabBlockedBtn.style.color = '#a8a8a8';
                    tabBlockedBtn.style.border = '1px solid #383838';
                }
                if (refreshBtn) refreshBtn.style.display = 'none';
                if (polarisFullBtn) polarisFullBtn.style.display = 'none';
                if (importJsonBtn) importJsonBtn.style.display = 'none';
                if (clearCacheBtn) clearCacheBtn.style.display = 'none';
                if (desbloquearBtn) desbloquearBtn.style.display = 'none';
                if (syncDriveBtn) syncDriveBtn.style.display = 'inline-block';
                if (exportCsvBtn) exportCsvBtn.style.display = 'inline-block';
                if (bloquearBtn) bloquearBtn.style.display = 'inline-block';
                if (importPhotosBtn) importPhotosBtn.style.display = 'inline-block';
                if (clearUnblockedBtn) clearUnblockedBtn.style.display = 'inline-block';

                if (driveAlertEl) {
                    driveAlertEl.style.display = 'block';
                    if (googleAuth.isConnected()) {
                        driveAlertEl.innerHTML = `
                            <div style="background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.35); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: #27ae60;">
                                <span>☁️ <b>Google Drive conectado:</b> Backup em nuvem sincronizado com seus outros dispositivos.</span>
                                <span style="color: #666; font-size: 11px;">Clique em <b>☁️ Sincronizar Drive</b> para atualizar</span>
                            </div>
                        `;
                    } else {
                        driveAlertEl.innerHTML = `
                            <div style="background: rgba(231, 76, 60, 0.12); border: 1px solid rgba(231, 76, 60, 0.35); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                                <div style="font-size: 12px; color: #e74c3c;">
                                    <b>⚠️ Google Drive desconectado neste navegador.</b> Conecte sua conta Google para sincronizar o backup com outros dispositivos.
                                </div>
                                <button id="unblockedConnectDriveBannerBtn" type="button" style="background: #4285F4; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;">🔑 Conectar Google Drive</button>
                            </div>
                        `;
                        document.getElementById("unblockedConnectDriveBannerBtn")?.addEventListener('click', () => googleAuth.login());
                    }
                }

                if (filterSelect) {
                    filterSelect.innerHTML = `
                        <option value="all">Todos (${unblockedList.length})</option>
                    `;
                }
            }

            updateCounts();
            renderList(1);
        };

        const renderList = (page) => {
            const itemsPerPage = loadSettings().itemsPerPage || 10;
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            const searchTerm = (document.getElementById('blockedSearchInput')?.value || '').toLowerCase().trim();
            const filterValue = document.getElementById('blockedFilterSelect')?.value || 'all';

            const currentSourceList = (currentTab === 'blocked') ? blockedList : unblockedList;
            let filteredUsers = currentSourceList;

            if (searchTerm) {
                filteredUsers = filteredUsers.filter(u =>
                    (u.username && u.username.toLowerCase().includes(searchTerm)) ||
                    (u.fullName && u.fullName.toLowerCase().includes(searchTerm)) ||
                    (u.secondaryText && u.secondaryText.toLowerCase().includes(searchTerm)) ||
                    (u.pk && String(u.pk).includes(searchTerm))
                );
            }

            if (currentTab === 'blocked') {
                if (filterValue === 'auto_blocked') {
                    filteredUsers = filteredUsers.filter(u => u.isAutoBlocked);
                } else if (filterValue === 'standard') {
                    filteredUsers = filteredUsers.filter(u => !u.isAutoBlocked);
                }
            }

            const sortedUsers = [...filteredUsers].sort((a, b) => {
                let valA = '';
                let valB = '';
                if (sortConfig.key === 'username') {
                    valA = (a.username || '').toLowerCase();
                    valB = (b.username || '').toLowerCase();
                } else if (sortConfig.key === 'pk') {
                    valA = Number(a.pk) || 0;
                    valB = Number(b.pk) || 0;
                } else if (sortConfig.key === 'isAutoBlocked') {
                    valA = a.isAutoBlocked ? 1 : 0;
                    valB = b.isAutoBlocked ? 1 : 0;
                } else if (sortConfig.key === 'unblockedAt') {
                    valA = a.unblockedAt || 0;
                    valB = b.unblockedAt || 0;
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });

            const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));
            if (page > totalPages) page = totalPages;
            currentPage = page;

            const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

            const statusEl = document.getElementById('statusBloqueados');
            if (statusEl) {
                const syncIndicator = document.getElementById('blockedSyncStatusIndicator');
                const indicatorHtml = syncIndicator ? syncIndicator.outerHTML : '<span id="blockedSyncStatusIndicator" style="font-size: 11px; font-weight: normal; color: #0095f6; margin-left: 10px;"></span>';
                if (currentTab === 'blocked') {
                    statusEl.innerHTML = `Mostrando ${filteredUsers.length} de ${blockedList.length} contas bloqueadas. ${indicatorHtml}`;
                } else {
                    statusEl.innerHTML = `Mostrando ${filteredUsers.length} de ${unblockedList.length} contas desbloqueadas (Salvo no Google Drive ☁️).`;
                }
            }

            const colTypeTitle = (currentTab === 'blocked') ? 'Tipo de Bloqueio' : 'Status / Desbloqueado em';
            const sortKeyType = (currentTab === 'blocked') ? 'isAutoBlocked' : 'unblockedAt';

            let tableHtml = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead style="cursor: pointer;">
                        <tr style="text-align: left; border-bottom: 2px solid #dbdbdb;">
                            <th style="padding: 8px; width: 30px;"><input type="checkbox" id="selectAllBlockedCheckbox" title="Selecionar Todos da Página"></th>
                            <th style="padding: 8px;" data-sort-key="username">Usuário ${sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                            <th style="padding: 8px; text-align: center;" data-sort-key="pk">ID (PK) ${sortConfig.key === 'pk' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                            <th style="padding: 8px; text-align: center;" data-sort-key="${sortKeyType}">${colTypeTitle} ${sortConfig.key === sortKeyType ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                            <th style="padding: 8px; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (paginatedUsers.length === 0) {
                const emptyMsg = (currentTab === 'blocked')
                    ? 'Nenhuma conta bloqueada encontrada com os filtros aplicados.'
                    : 'Nenhuma conta desbloqueada salva no Google Drive ainda.';
                tableHtml += `<tr><td colspan="5" style="text-align: center; padding: 25px; color: #888;">${emptyMsg}</td></tr>`;
            } else {
                paginatedUsers.forEach(userObj => {
                    const { username, photoUrl, pk, fullName, secondaryText, isAutoBlocked, unblockedAt } = userObj;
                    const isChecked = selectedUsers.has(username);

                    let statusBadgeHtml = '';
                    if (currentTab === 'blocked') {
                        statusBadgeHtml = isAutoBlocked
                            ? `<span class="badge-tipo-bloqueio badge-auto-blocked" style="background: #fde8e8; color: #b71c1c !important; border: 1px solid #f8b4b4; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">🔒 + Novas contas</span>`
                            : `<span class="badge-tipo-bloqueio badge-standard" style="background: #e8f4fd; color: #0d47a1 !important; border: 1px solid #90caf9; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">👤 Padrão</span>`;
                    } else {
                        let dateInfo = '';
                        if (unblockedAt) {
                            try {
                                const d = new Date(unblockedAt);
                                dateInfo = ` (${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                            } catch (_) { }
                        }
                        statusBadgeHtml = `<span class="badge-tipo-bloqueio" style="background: #e6f9ed; color: #27ae60 !important; border: 1px solid #a3e9c0; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">🔓 Desbloqueado${dateInfo}</span>`;
                    }

                    const actionBtnHtml = (currentTab === 'blocked')
                        ? `<button class="btn-unblock-row" data-username="${username}" data-uid="${pk || ''}" style="background: #2ecc71; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">Desbloquear</button>`
                        : `<button class="btn-block-again-row" data-username="${username}" data-uid="${pk || ''}" style="background: #e74c3c; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">Bloquear novamente</button>`;

                    tableHtml += `
                        <tr style="border-bottom: 1px solid #dbdbdb;" data-username="${username}">
                            <td style="padding: 8px;"><input type="checkbox" class="user-checkbox" data-username="${username}" style="cursor: pointer;" ${isChecked ? 'checked' : ''}></td>
                            <td style="padding: 8px; display: flex; align-items: center; gap: 10px;">
                                <img src="${photoUrl || DEFAULT_AVATAR}" alt="${username}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #262626;" loading="lazy">
                                <div style="display: flex; flex-direction: column;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <a href="https://www.instagram.com/${username}" target="_blank" style="text-decoration: none; color: inherit; font-weight: 600;">${username}</a>
                                    </div>
                                    ${fullName ? `<span style="font-size: 12px; color: #666;">${fullName}</span>` : ''}
                                    ${secondaryText ? `<span style="font-size: 11px; color: ${isAutoBlocked ? '#e74c3c' : '#777'};">${secondaryText}</span>` : ''}
                                </div>
                            </td>
                            <td style="text-align: center; padding: 8px; font-family: monospace; font-size: 12px; color: #555;">${pk || '-'}</td>
                            <td style="text-align: center; padding: 8px;">
                                ${statusBadgeHtml}
                            </td>
                            <td style="text-align: center; padding: 8px;">
                                ${actionBtnHtml}
                            </td>
                        </tr>
                    `;
                });
            }

            tableHtml += `</tbody></table>`;

            let paginationHtml = `<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px;">`;
            if (page > 1) paginationHtml += `<button id="prevBlockedPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Anterior</button>`;
            paginationHtml += `<span style="font-size: 13px; font-weight: 600;">Página ${page} de ${totalPages}</span>`;
            if (page < totalPages) paginationHtml += `<button id="nextBlockedPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Próximo</button>`;
            paginationHtml += `</div>`;

            container.innerHTML = tableHtml + paginationHtml;

            container.querySelectorAll('.user-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const uname = e.target.dataset.username;
                    if (e.target.checked) selectedUsers.add(uname);
                    else selectedUsers.delete(uname);
                    updateCounts(paginatedUsers);
                });
            });

            const selectAllCb = document.getElementById('selectAllBlockedCheckbox');
            if (selectAllCb) {
                selectAllCb.checked = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u.username));
                selectAllCb.onchange = (e) => {
                    const isChecked = e.target.checked;
                    paginatedUsers.forEach(u => {
                        if (isChecked) selectedUsers.add(u.username);
                        else selectedUsers.delete(u.username);
                    });
                    container.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = isChecked);
                    updateCounts(paginatedUsers);
                };
            }

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

            const prevBtn = document.getElementById('prevBlockedPageBtn');
            if (prevBtn) prevBtn.onclick = () => renderList(currentPage - 1);
            const nextBtn = document.getElementById('nextBlockedPageBtn');
            if (nextBtn) nextBtn.onclick = () => renderList(currentPage + 1);

            container.querySelectorAll('.btn-unblock-row').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetBtn = e.currentTarget;
                    const uname = targetBtn.dataset.username;
                    if (!confirm(`Deseja desbloquear o usuário @${uname}?`)) return;

                    targetBtn.disabled = true;
                    targetBtn.textContent = 'Processando...';

                    const userFound = blockedList.find(u => u.username.toLowerCase() === uname.toLowerCase()) || {
                        username: uname,
                        pk: targetBtn.dataset.uid || getCachedUserId(uname) || '',
                        fullName: '',
                        photoUrl: DEFAULT_AVATAR
                    };

                    await unblockUsers([uname], async (unblocked) => {
                        if (unblocked && unblocked.includes(uname)) {
                            blockedList = blockedList.filter(u => u.username.toLowerCase() !== uname.toLowerCase());
                            cachedBlockedAccounts = blockedList;
                            try {
                                localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                            } catch (_) { }
                            selectedUsers.delete(uname);

                            const novoDesbloqueado = {
                                username: userFound.username,
                                pk: String(userFound.pk || userFound.id || getCachedUserId(userFound.username) || ''),
                                id: String(userFound.pk || userFound.id || getCachedUserId(userFound.username) || ''),
                                fullName: userFound.fullName || '',
                                secondaryText: userFound.secondaryText || '',
                                photoUrl: userFound.photoUrl || DEFAULT_AVATAR,
                                isAutoBlocked: !!userFound.isAutoBlocked,
                                unblockedAt: Date.now()
                            };
                            const novaListaDesbloqueados = [novoDesbloqueado, ...unblockedList.filter(u => u.username.toLowerCase() !== uname.toLowerCase())];
                            unblockedList = novaListaDesbloqueados;
                            cachedUnblockedAccounts = unblockedList;
                            try {
                                localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
                            } catch (_) { }

                            await salvarDesbloqueadosNoDrive(novaListaDesbloqueados, false);

                            showToast(`🔓 Usuário @${uname} desbloqueado e salvo no Google Drive!`);
                            updateCounts();
                            const visibleRows = container.querySelectorAll('tbody tr[data-username]');
                            if (visibleRows.length <= 1 && currentPage > 1) {
                                renderList(currentPage - 1);
                            } else {
                                renderList(currentPage);
                            }
                        } else {
                            targetBtn.disabled = false;
                            targetBtn.textContent = 'Desbloquear';
                        }
                    });
                });
            });

            container.querySelectorAll('.btn-block-again-row').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetBtn = e.currentTarget;
                    const uname = targetBtn.dataset.username;
                    const targetUid = String(targetBtn.dataset.uid || '').trim();
                    if (!confirm(`Deseja bloquear novamente o usuário @${uname}?`)) return;

                    targetBtn.disabled = true;
                    targetBtn.textContent = 'Processando...';

                    if (targetUid) {
                        setCachedUserId(uname, targetUid);
                    }

                    const userFound = unblockedList.find(u => u.username.toLowerCase() === uname.toLowerCase()) || {
                        username: uname,
                        pk: targetUid || getCachedUserId(uname) || '',
                        fullName: '',
                        photoUrl: DEFAULT_AVATAR
                    };

                    await blockUsers([{ username: uname, pk: targetUid || userFound.pk }], async (blocked) => {
                        if (blocked && (blocked.includes(uname) || blocked.some(b => (typeof b === 'object' ? b.username : b).toLowerCase() === uname.toLowerCase()))) {
                            const novaListaDesbloqueados = unblockedList.filter(u => u.username.toLowerCase() !== uname.toLowerCase());
                            unblockedList = novaListaDesbloqueados;
                            cachedUnblockedAccounts = unblockedList;
                            try {
                                localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
                            } catch (_) { }

                            await salvarDesbloqueadosNoDrive(novaListaDesbloqueados, false);

                            const uid = String(targetUid || userFound.pk || userFound.id || getCachedUserId(uname) || '');
                            const blockedItem = {
                                username: userFound.username,
                                pk: uid,
                                id: uid,
                                fullName: userFound.fullName || '',
                                secondaryText: 'Bloqueado novamente',
                                photoUrl: userFound.photoUrl || DEFAULT_AVATAR,
                                isAutoBlocked: false
                            };
                            blockedList = [blockedItem, ...blockedList.filter(u => u.username.toLowerCase() !== uname.toLowerCase())];
                            cachedBlockedAccounts = blockedList;
                            try {
                                localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                            } catch (_) { }

                            selectedUsers.delete(uname);
                            showToast(`🔒 @${uname} bloqueado novamente com sucesso!`);
                            updateCounts();
                            const visibleRows = container.querySelectorAll('tbody tr[data-username]');
                            if (visibleRows.length <= 1 && currentPage > 1) {
                                renderList(currentPage - 1);
                            } else {
                                renderList(currentPage);
                            }
                        } else {
                            targetBtn.disabled = false;
                            targetBtn.textContent = 'Bloquear novamente';
                        }
                    });
                });
            });
        };

        document.getElementById('tabBlockedBtn')?.addEventListener('click', () => switchTab('blocked'));
        document.getElementById('tabUnblockedBtn')?.addEventListener('click', () => switchTab('unblocked'));

        async function sincronizarBloqueados(showFeedback = false, forcePolaris = false) {
            const refreshBtn = document.getElementById("blockedRefreshBtn");
            const polarisBtn = document.getElementById("blockedPolarisFullBtn");
            const syncIndicator = document.getElementById("blockedSyncStatusIndicator");
            try {
                if (showFeedback) {
                    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = "🔄 Buscando..."; }
                    if (polarisBtn) { polarisBtn.disabled = true; polarisBtn.textContent = "🌐 Carregando Polaris..."; }
                }
                if (syncIndicator) {
                    syncIndicator.textContent = forcePolaris ? "🌐 Extraindo lista Polaris completa..." : "🔄 Sincronizando com o Instagram...";
                    syncIndicator.style.color = "#0095f6";
                }

                let wbloksUsers = null;
                const isOnBlockedPage = window.location.pathname.startsWith('/accounts/blocked_accounts');

                if (forcePolaris || isOnBlockedPage) {
                    console.log('[IG Tools Bloqueados] Executando extração Polaris completa via rolagem e interceptação...');
                    wbloksUsers = await extractBlockedAccountsUsernames();
                } else {
                    console.log('[IG Tools Bloqueados] Buscando contas bloqueadas via Wbloks endpoint...');
                    wbloksUsers = await fetchBlockedAccountsWbloks();
                    if (!wbloksUsers || wbloksUsers.length === 0) {
                        console.log('[IG Tools Bloqueados] Wbloks direto retornou vazio. Tentando background HTML fetch...');
                        wbloksUsers = await fetchBlockedAccountsPageHtml();
                    }
                }

                if (wbloksUsers && wbloksUsers.length > 0) {
                    const previousMap = new Map();
                    blockedList.forEach(u => {
                        if (u && u.username) previousMap.set(u.username.toLowerCase(), u);
                    });

                    const recentUnblockedCutoff = Date.now() - 60000;
                    const recentUnblockedSet = new Set(
                        (unblockedList || [])
                            .filter(u => u && u.unblockedAt && u.unblockedAt > recentUnblockedCutoff)
                            .map(u => (u.username || '').toLowerCase())
                            .filter(Boolean)
                    );

                    const liveBlockedNames = new Set();
                    const liveMap = new Map();

                    wbloksUsers.forEach(u => {
                        if (!u || !u.username || isForbiddenBlockedUsername(u.username)) return;
                        const k = u.username.toLowerCase();
                        liveBlockedNames.add(k);

                        if (recentUnblockedSet.has(k)) return;

                        const prev = previousMap.get(k);
                        if (prev) {
                            liveMap.set(k, {
                                ...prev,
                                ...u,
                                photoUrl: (u.photoUrl && u.photoUrl !== DEFAULT_AVATAR) ? u.photoUrl : (prev.photoUrl || u.photoUrl)
                            });
                        } else {
                            liveMap.set(k, u);
                        }
                    });

                    const initialUnblockedCount = unblockedList.length;
                    const reblockedCleanList = unblockedList.filter(u => {
                        if (!u || !u.username) return false;
                        const k = u.username.toLowerCase();
                        return !liveBlockedNames.has(k) || recentUnblockedSet.has(k);
                    });

                    if (reblockedCleanList.length !== initialUnblockedCount) {
                        const removedCount = initialUnblockedCount - reblockedCleanList.length;
                        console.log(`[IG Tools] Reconciliação: ${removedCount} conta(s) rebloqueada(s) no Instagram foram removidas da aba Desbloqueados e do Google Drive.`);
                        salvarDesbloqueadosNoDrive(reblockedCleanList, false);
                    }

                    previousMap.forEach((prev, k) => {
                        if (!liveMap.has(k) && !recentUnblockedSet.has(k) && !isForbiddenBlockedUsername(prev.username)) {
                            if (prev.secondaryText && prev.secondaryText.includes('Importado')) {
                                liveMap.set(k, prev);
                            }
                        }
                    });

                    blockedList = sanitizeBlockedList(Array.from(liveMap.values()));
                    cachedBlockedAccounts = blockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                    } catch (_) { }

                    if (currentTab === 'blocked') renderList(currentPage);
                    updateCounts();

                    if (syncIndicator) {
                        syncIndicator.textContent = `✓ ${blockedList.length} contas bloqueadas ativas`;
                        syncIndicator.style.color = "#4ade80";
                    }

                    if (showFeedback) showToast(`Sincronizado! ${blockedList.length} contas bloqueadas ativas.`);
                } else if (blockedList.length === 0 && currentTab === 'blocked') {
                    if (syncIndicator) {
                        syncIndicator.textContent = "⚠️ Nenhuma conta retornada";
                        syncIndicator.style.color = "#f87171";
                    }
                    container.innerHTML = `
                        <div style="text-align: center; padding: 30px 15px; color: #666;">
                            <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">Nenhuma conta encontrada via requisição direta.</div>
                            <div style="font-size: 13px; color: #888; max-width: 520px; margin: 0 auto 15px;">
                                Você pode tentar clicar em <b>🌐 Carregar via Polaris</b> para abrir a página oficial e extrair todas as contas ou importar o JSON exportado do Instagram.
                            </div>
                        </div>
                    `;
                } else {
                    if (syncIndicator) {
                        syncIndicator.textContent = `✓ ${blockedList.length} contas carregadas`;
                        syncIndicator.style.color = "#4ade80";
                    }
                }
            } catch (err) {
                console.error('[IG Tools Bloqueados] Erro na sincronização:', err);
                if (syncIndicator) {
                    syncIndicator.textContent = "⚠️ Erro na sincronização";
                    syncIndicator.style.color = "#f87171";
                }
                if (blockedList.length === 0 && currentTab === 'blocked') {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 30px 15px; color: #666;">
                            <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #ef4444;">Não foi possível carregar a lista no momento.</div>
                            <div style="font-size: 13px; color: #888; max-width: 520px; margin: 0 auto 15px;">
                                Clique em <b>🌐 Carregar via Polaris</b> para extrair via página oficial ou importe o JSON exportado do Instagram.
                            </div>
                        </div>
                    `;
                }
                if (showFeedback) showToast('Erro ao sincronizar contas com o Instagram.');
            } finally {
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = "🔄 Atualizar";
                }
                if (polarisBtn) {
                    polarisBtn.disabled = false;
                    polarisBtn.textContent = "🌐 Carregar via Polaris";
                }
            }
        }

        if (blockedList.length > 0) {
            renderList(1);
            if (autoExtractPolaris) {
                sincronizarBloqueados(true, true);
            } else {
                sincronizarBloqueados(false);
            }
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #555;">
                    <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(0,149,246,0.2); border-top-color: #0095f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px;"></div>
                    <div style="font-weight: 600; font-size: 14px;">Carregando contas bloqueadas...</div>
                    <div style="font-size: 12px; color: #888; margin-top: 4px;">Consultando o Instagram em segundo plano...</div>
                </div>
            `;
            sincronizarBloqueados(false, autoExtractPolaris);
        }

        document.getElementById("blockedFecharBtn").onclick = () => {
            div.remove();
            modalAbertoBlocked = false;
        };

        document.getElementById("blockedMinimizarBtn").onclick = () => {
            const modal = document.getElementById('blockedAccountsModal');
            if (!modal) return;
            const contentToToggle = [
                modal.querySelector('.blocked-tabs-bar'),
                modal.querySelector('#blockedSearchInput')?.parentElement,
                modal.querySelector('#statusBloqueados'),
                modal.querySelector('#tabelaBloqueadosContainer')
            ].filter(Boolean);

            const btn = document.getElementById('blockedMinimizarBtn');
            const isMinimized = modal.dataset.minimized === 'true';

            contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');
            modal.dataset.minimized = !isMinimized;
            btn.textContent = isMinimized ? '_' : '⬜';
            btn.title = isMinimized ? 'Minimizar' : 'Maximizar';
            modal.style.maxHeight = isMinimized ? '90vh' : 'auto';
        };

        document.getElementById("blockedRefreshBtn").onclick = () => {
            const isOnBlockedPage = window.location.pathname.startsWith('/accounts/blocked_accounts');
            if (!isOnBlockedPage) {
                if (confirm("Você está fora da tela oficial de contas bloqueadas do Instagram.\n\nPara sincronizar a lista completa de contas bloqueadas com 100% de precisão via Polaris, o script precisa acessar a página oficial (/accounts/blocked_accounts/).\n\nDeseja ir para a página agora? O gerenciador reabrirá automaticamente e sincronizará.")) {
                    sessionStorage.setItem('ig_tools_reopen_blocked', '1');
                    sessionStorage.setItem('ig_tools_auto_polaris_extract', '1');
                    window.location.href = '/accounts/blocked_accounts/';
                    return;
                }
            }
            sincronizarBloqueados(true, isOnBlockedPage);
        };

        const polarisBtnEl = document.getElementById("blockedPolarisFullBtn");
        if (polarisBtnEl) {
            polarisBtnEl.onclick = async () => {
                if (window.location.pathname.startsWith('/accounts/blocked_accounts')) {
                    await sincronizarBloqueados(true, true);
                } else {
                    if (confirm("Para carregar a lista completa de mais de 1000 contas bloqueadas via Polaris, o script abrirá a página oficial de contas bloqueadas do Instagram (/accounts/blocked_accounts/).\n\nDeseja ir para a página agora? O script reabrirá este gerenciador e extrairá automaticamente todas as contas.")) {
                        sessionStorage.setItem('ig_tools_reopen_blocked', '1');
                        sessionStorage.setItem('ig_tools_auto_polaris_extract', '1');
                        window.location.href = '/accounts/blocked_accounts/';
                    }
                }
            };
        }

        const clearBlockedBtnEl = document.getElementById("blockedClearCacheBtn");
        if (clearBlockedBtnEl) {
            clearBlockedBtnEl.onclick = () => {
                if (!confirm("Tem certeza que deseja limpar o cache local de contas bloqueadas?")) return;
                blockedList = [];
                cachedBlockedAccounts = [];
                try {
                    localStorage.removeItem('ig_tools_cached_blocked');
                } catch (_) { }
                updateCounts();
                renderList(1);
                showToast("✓ Cache de contas bloqueadas limpo com sucesso!");
            };
        }

        const clearUnblockedBtnEl = document.getElementById("unblockedClearBtn");
        if (clearUnblockedBtnEl) {
            clearUnblockedBtnEl.onclick = async () => {
                const count = unblockedList.length;
                if (count === 0) return alert("A lista de contas desbloqueadas já está vazia.");
                if (!confirm(`Tem certeza que deseja limpar todas as ${count} contas da lista de desbloqueados?\n\nIsso removerá as contas salvas localmente e no Google Drive.`)) {
                    return;
                }
                clearUnblockedBtnEl.disabled = true;
                clearUnblockedBtnEl.textContent = "⏳ Limpando...";
                try {
                    await dbHelper.clearCache('unblockedAccounts');
                    unblockedList = [];
                    cachedUnblockedAccounts = [];
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify([]));
                    } catch (_) { }

                    updateCounts();
                    renderList(1);
                    showToast("✓ Tabela de contas desbloqueadas limpa com sucesso!");
                } catch (err) {
                    console.error('[IG Tools] Erro ao limpar desbloqueados:', err);
                    alert("Erro ao limpar lista de desbloqueados: " + err);
                } finally {
                    clearUnblockedBtnEl.disabled = false;
                    clearUnblockedBtnEl.textContent = "🗑️ Limpar Desbloqueados";
                }
            };
        }

        document.getElementById("unblockedSyncDriveBtn").onclick = async () => {
            if (!googleAuth.isConnected()) {
                if (confirm("O Google Drive não está conectado neste navegador.\n\nDeseja fazer login na sua conta Google agora para sincronizar os usuários desbloqueados no PC?")) {
                    googleAuth.login();
                }
                return;
            }

            const syncBtn = document.getElementById("unblockedSyncDriveBtn");
            if (syncBtn) {
                syncBtn.disabled = true;
                syncBtn.textContent = "☁️ Buscando da Nuvem...";
            }
            try {
                const driveList = await dbHelper.loadUnblockedAccounts(true);
                if (Array.isArray(driveList)) {
                    const map = new Map();
                    driveList.forEach(u => {
                        if (u && u.username) map.set(u.username.toLowerCase(), u);
                    });
                    unblockedList.forEach(u => {
                        if (u && u.username && !map.has(u.username.toLowerCase())) {
                            map.set(u.username.toLowerCase(), u);
                        }
                    });
                    unblockedList = Array.from(map.values());
                    cachedUnblockedAccounts = unblockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
                    } catch (_) { }

                    const unblockedSet = new Set(unblockedList.map(u => (u.username || '').toLowerCase()).filter(Boolean));
                    const countBefore = blockedList.length;
                    blockedList = blockedList.filter(u => u && u.username && !unblockedSet.has(u.username.toLowerCase()));
                    cachedBlockedAccounts = blockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                    } catch (_) { }

                    updateCounts();
                    renderList(currentPage);
                    const removedCount = countBefore - blockedList.length;
                    showToast(`☁️ Sincronizado! ${driveList.length} contas do Drive.${removedCount > 0 ? ` (${removedCount} removidas dos bloqueados)` : ''}`);
                } else {
                    showToast("☁️ Conectado ao Google Drive.");
                }
            } catch (errDrive) {
                console.error('[IG Tools] Erro ao sincronizar Google Drive:', errDrive);
                showToast("⚠️ Erro ao acessar o Google Drive: " + (errDrive.message || errDrive));
            } finally {
                if (syncBtn) {
                    syncBtn.disabled = false;
                    syncBtn.textContent = "☁️ Sincronizar Drive";
                }
            }
        };

        const exportCsvBtnEl = document.getElementById("unblockedExportCsvBtn");
        if (exportCsvBtnEl) {
            exportCsvBtnEl.onclick = () => {
                let listToExport = (Array.isArray(unblockedList) && unblockedList.length > 0) ? unblockedList : [];
                if (listToExport.length === 0) {
                    try {
                        const local = JSON.parse(localStorage.getItem('ig_tools_cached_unblocked'));
                        if (Array.isArray(local) && local.length > 0) listToExport = local;
                    } catch (_) { }
                }
                if (listToExport.length === 0 && dbHelper._cache && Array.isArray(dbHelper._cache.unblockedAccounts)) {
                    listToExport = dbHelper._cache.unblockedAccounts;
                }
                if (listToExport.length === 0) {
                    return alert("Nenhum usuário desbloqueado para exportar.");
                }
                const headers = ['username', 'fullName', 'pk', 'unblockedAt'];
                const csvContent = [
                    headers.join(','),
                    ...listToExport.map(u => headers.map(h => {
                        let val = u[h] || '';
                        if (h === 'unblockedAt' && val) val = new Date(val).toLocaleString();
                        return `"${String(val).replace(/"/g, '""')}"`;
                    }).join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `desbloqueados_instagram_${Date.now()}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
        }

        const importPhotosBtnEl = document.getElementById("unblockedImportPhotosBtn");
        const photosFileInputEl = document.getElementById("unblockedPhotosFileInput");
        if (importPhotosBtnEl && photosFileInputEl) {
            importPhotosBtnEl.onclick = () => photosFileInputEl.click();
            photosFileInputEl.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                importPhotosBtnEl.disabled = true;
                importPhotosBtnEl.textContent = "⏳ Processando...";

                try {
                    const text = await file.text();
                    const lines = text.split(/\r?\n/).filter(Boolean);

                    const photoMap = new Map();
                    lines.forEach((line, idx) => {
                        if (idx === 0 && (line.toLowerCase().includes('username') || line.toLowerCase().includes('ordem'))) return;
                        const cols = line.split(/[;,\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
                        if (cols.length >= 2) {
                            const username = cols.find(c => c && !c.startsWith('http') && !/^\d+$/.test(c) && /^[a-zA-Z0-9._]+$/.test(c.replace('@', '')))?.replace('@', '').toLowerCase();
                            const photoUrl = cols.find(c => c && (c.startsWith('http://') || c.startsWith('https://')) && (c.includes('fbcdn.net') || c.includes('cdninstagram.com') || c.includes('instagram.f') || c.includes('data:image')));
                            if (username && photoUrl) {
                                photoMap.set(username, photoUrl);
                            }
                        }
                    });

                    if (photoMap.size === 0) {
                        alert("Nenhuma URL de foto válida encontrada no arquivo. Certifique-se de que o arquivo contém colunas com o @usuário e a URL da foto.");
                        return;
                    }

                    let matchedCount = 0;
                    unblockedList.forEach(user => {
                        const u = (user.username || '').toLowerCase();
                        if (photoMap.has(u)) {
                            user.photoUrl = photoMap.get(u);
                            matchedCount++;
                        }
                    });

                    cachedUnblockedAccounts = unblockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
                    } catch (_) { }

                    if (dbHelper && dbHelper._cache) {
                        dbHelper._cache.unblockedAccounts = unblockedList;
                    }

                    renderList(currentPage);

                    let driveSaved = false;
                    if (googleAuth.isConnected()) {
                        importPhotosBtnEl.textContent = "☁️ Gravando no Drive...";
                        try {
                            await dbHelper.saveUnblockedAccounts(unblockedList);
                            driveSaved = true;
                        } catch (driveErr) {
                            console.warn("[IG Tools] Erro ao salvar fotos no Drive:", driveErr);
                        }
                    }

                    if (driveSaved) {
                        showToast(`🎉 ${matchedCount} fotos aplicadas e salvas no Google Drive com sucesso!`);
                        alert(`🎉 SUCESSO!\n\n${matchedCount} fotos foram vinculadas aos usuários desbloqueados e salvas permanentemente no Google Drive!`);
                    } else {
                        showToast(`🖼️ ${matchedCount} fotos aplicadas localmente.`);
                        alert(`🖼️ ${matchedCount} fotos foram aplicadas localmente!\n\nNota: Para sincronizar com a nuvem, conecte o Google Drive.`);
                    }
                } catch (err) {
                    console.error("[IG Tools] Erro ao carregar fotos:", err);
                    alert("Ocorreu um erro ao processar o arquivo de fotos: " + (err.message || err));
                } finally {
                    importPhotosBtnEl.disabled = false;
                    importPhotosBtnEl.textContent = "🖼️ Carregar Fotos (Excel)";
                    photosFileInputEl.value = '';
                }
            };
        }

        const importBtn = document.getElementById("blockedImportJsonBtn");
        const fileInput = document.getElementById("blockedJsonFileInput");
        if (importBtn && fileInput) {
            importBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const json = JSON.parse(event.target.result);
                        let imported = [];

                        if (Array.isArray(json.relationships_blocked_users)) {
                            imported = json.relationships_blocked_users.map(item => {
                                const uname = item.title || item.string_list_data?.[0]?.value || '';
                                let dateText = '';
                                const ts = item.string_list_data?.[0]?.timestamp;
                                if (ts) dateText = `Bloqueado em ${new Date(ts * 1000).toLocaleDateString()}`;
                                return {
                                    username: uname,
                                    pk: '',
                                    id: '',
                                    fullName: '',
                                    secondaryText: dateText || 'Importado de JSON oficial',
                                    photoUrl: DEFAULT_AVATAR,
                                    isAutoBlocked: false
                                };
                            }).filter(u => !!u.username);
                        } else if (Array.isArray(json.blocked_accounts)) {
                            imported = json.blocked_accounts.map(item => ({
                                username: item.username || item.title || item,
                                pk: String(item.pk || item.id || ''),
                                id: String(item.pk || item.id || ''),
                                fullName: item.full_name || '',
                                secondaryText: 'Importado de JSON oficial',
                                photoUrl: item.profile_pic_url || DEFAULT_AVATAR,
                                isAutoBlocked: false
                            })).filter(u => !!u.username);
                        } else if (Array.isArray(json)) {
                            imported = json.map(item => {
                                const uname = typeof item === 'string' ? item : (item.username || item.title || '');
                                return {
                                    username: uname,
                                    pk: String(item.pk || item.id || ''),
                                    id: String(item.pk || item.id || ''),
                                    fullName: item.full_name || item.fullName || '',
                                    secondaryText: 'Importado de JSON oficial',
                                    photoUrl: item.photoUrl || DEFAULT_AVATAR,
                                    isAutoBlocked: false
                                };
                            }).filter(u => !!u.username);
                        }

                        if (imported.length === 0) {
                            alert('Nenhum usuário bloqueado foi encontrado no arquivo JSON selecionado. Certifique-se de exportar "Seguidores e bloqueados" da Central de Contas Meta.');
                            return;
                        }

                        const map = new Map();
                        blockedList.forEach(u => map.set(u.username.toLowerCase(), u));
                        let newCount = 0;
                        imported.forEach(u => {
                            const k = u.username.toLowerCase();
                            if (!map.has(k)) {
                                map.set(k, u);
                                newCount++;
                            }
                        });

                        blockedList = Array.from(map.values());
                        cachedBlockedAccounts = blockedList;
                        try {
                            localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                        } catch (_) { }

                        renderList(1);
                        updateCounts();
                        showToast(`✅ ${newCount} novas contas importadas! Total: ${blockedList.length}.`);
                    } catch (err) {
                        console.error('[IG Tools] Erro ao ler JSON de bloqueados:', err);
                        alert('Erro ao processar arquivo JSON: ' + err.message);
                    }
                    fileInput.value = '';
                };
                reader.readAsText(file);
            };
        }

        document.getElementById("blockedMarcarTodosBtn").onclick = () => {
            const itemsPerPage = loadSettings().itemsPerPage || 10;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const activeSource = (currentTab === 'blocked') ? blockedList : unblockedList;
            const pageUsers = activeSource.slice(startIndex, startIndex + itemsPerPage);
            pageUsers.forEach(u => selectedUsers.add(u.username));
            container.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = true);
            updateCounts(pageUsers);
        };

        document.getElementById("blockedDesmarcarTodosBtn").onclick = () => {
            selectedUsers.clear();
            container.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
            updateCounts();
        };

        const searchInput = document.getElementById("blockedSearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", () => renderList(1));
        }

        const filterSelect = document.getElementById("blockedFilterSelect");
        if (filterSelect) {
            filterSelect.addEventListener("change", () => renderList(1));
        }

        const apiToggle = document.getElementById("blockedUseApiToggle");
        if (apiToggle) {
            apiToggle.addEventListener("change", (e) => {
                const s = loadSettings();
                s.useApi = e.target.checked;
                saveSettings(s);
                showToast(`Modo API ${s.useApi ? 'ativado' : 'desativado'}.`);
            });
        }

        document.getElementById("blockedDesbloquearBtn").onclick = async () => {
            if (selectedUsers.size === 0) {
                alert("Nenhum usuário selecionado para desbloquear.");
                return;
            }

            const count = selectedUsers.size;
            if (!confirm(`Deseja desbloquear os ${count} usuário(s) selecionado(s)?`)) return;

            const desbloquearBtn = document.getElementById("blockedDesbloquearBtn");
            desbloquearBtn.disabled = true;
            desbloquearBtn.textContent = "Processando...";
            toggleLoading(true, 0, "Desbloqueando contas...");

            const usersToUnblock = Array.from(selectedUsers);

            await unblockUsers(usersToUnblock, async (unblocked) => {
                desbloquearBtn.disabled = false;
                desbloquearBtn.textContent = "🔓 Desbloquear Selecionados";
                toggleLoading(false);

                if (unblocked && unblocked.length > 0) {
                    const unblockedSet = new Set(unblocked.map(u => u.toLowerCase()));

                    const novosDesbloqueados = blockedList
                        .filter(u => unblockedSet.has(u.username.toLowerCase()))
                        .map(u => ({
                            username: u.username,
                            pk: String(u.pk || u.id || getCachedUserId(u.username) || ''),
                            id: String(u.pk || u.id || getCachedUserId(u.username) || ''),
                            fullName: u.fullName || '',
                            secondaryText: u.secondaryText || '',
                            photoUrl: u.photoUrl || DEFAULT_AVATAR,
                            isAutoBlocked: !!u.isAutoBlocked,
                            unblockedAt: Date.now()
                        }));

                    blockedList = blockedList.filter(u => !unblockedSet.has(u.username.toLowerCase()));
                    cachedBlockedAccounts = blockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                    } catch (_) { }

                    const mapUnblocked = new Map();
                    unblockedList.forEach(u => mapUnblocked.set(u.username.toLowerCase(), u));
                    novosDesbloqueados.forEach(u => mapUnblocked.set(u.username.toLowerCase(), u));
                    const listaAtualizada = Array.from(mapUnblocked.values());
                    unblockedList = listaAtualizada;
                    cachedUnblockedAccounts = unblockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
                    } catch (_) { }

                    await salvarDesbloqueadosNoDrive(listaAtualizada, false);

                    unblocked.forEach(u => selectedUsers.delete(u));
                    alert(`${unblocked.length} usuário(s) desbloqueado(s) e salvos no Google Drive com sucesso.`);
                } else {
                    alert("Nenhum usuário pôde ser desbloqueado.");
                }

                updateCounts();
                const totalPages = Math.max(1, Math.ceil(blockedList.length / (loadSettings().itemsPerPage || 10)));
                if (currentPage > totalPages) currentPage = totalPages;
                renderList(currentPage);
            });
        };

        document.getElementById("unblockedBloquearBtn").onclick = async () => {
            if (selectedUsers.size === 0) {
                alert("Nenhum usuário selecionado para bloquear novamente.");
                return;
            }

            const count = selectedUsers.size;
            if (!confirm(`Deseja bloquear novamente os ${count} usuário(s) selecionado(s)?`)) return;

            const bloquearBtn = document.getElementById("unblockedBloquearBtn");
            bloquearBtn.disabled = true;
            bloquearBtn.textContent = "Processando...";
            toggleLoading(true, 0, "Bloqueando contas novamente...");

            const usersToBlock = Array.from(selectedUsers);

            await blockUsers(usersToBlock, async (blocked) => {
                bloquearBtn.disabled = false;
                bloquearBtn.textContent = "🔒 Bloquear Selecionados";
                toggleLoading(false);

                if (blocked && blocked.length > 0) {
                    const blockedSet = new Set(blocked.map(u => u.toLowerCase()));

                    const itensBloqueados = unblockedList
                        .filter(u => blockedSet.has(u.username.toLowerCase()))
                        .map(u => ({
                            username: u.username,
                            pk: String(u.pk || u.id || getCachedUserId(u.username) || ''),
                            id: String(u.pk || u.id || getCachedUserId(u.username) || ''),
                            fullName: u.fullName || '',
                            secondaryText: 'Bloqueado novamente',
                            photoUrl: u.photoUrl || DEFAULT_AVATAR,
                            isAutoBlocked: false
                        }));

                    const novaListaDesbloqueados = unblockedList.filter(u => !blockedSet.has(u.username.toLowerCase()));
                    unblockedList = novaListaDesbloqueados;
                    cachedUnblockedAccounts = unblockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(unblockedList));
                    } catch (_) { }

                    await salvarDesbloqueadosNoDrive(novaListaDesbloqueados, false);

                    const mapBlocked = new Map();
                    blockedList.forEach(u => mapBlocked.set(u.username.toLowerCase(), u));
                    itensBloqueados.forEach(u => mapBlocked.set(u.username.toLowerCase(), u));
                    blockedList = Array.from(mapBlocked.values());
                    cachedBlockedAccounts = blockedList;
                    try {
                        localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(blockedList));
                    } catch (_) { }

                    blocked.forEach(u => selectedUsers.delete(u));
                    alert(`${blocked.length} usuário(s) foram bloqueados novamente com sucesso.`);
                } else {
                    alert("Nenhum usuário pôde ser bloqueado.");
                }

                updateCounts();
                const totalPages = Math.max(1, Math.ceil(unblockedList.length / (loadSettings().itemsPerPage || 10)));
                if (currentPage > totalPages) currentPage = totalPages;
                renderList(currentPage);
            });
        };
    }

    async function unblockUsers(usersToUnblock, onComplete) {
        let cancelled = false;
        const { bar, update, closeButton } = createCancellableProgressBar();
        closeButton.onclick = () => {
            cancelled = true;
            bar.remove();
            showToast("Processo de desbloqueio interrompido.");
        };
        toggleLoading(true, 0, "Desbloqueando contas via API...");

        const delay = loadSettings().unfollowDelay || 1200;
        const successfullyUnblocked = [];

        for (let i = 0; i < usersToUnblock.length; i++) {
            if (cancelled) break;
            const username = usersToUnblock[i];
            const percent = Math.round(((i + 1) / usersToUnblock.length) * 100);
            update(i + 1, usersToUnblock.length, `Desbloqueando @${username}...`);
            toggleLoading(true, percent, `Desbloqueando @${username} (${i + 1}/${usersToUnblock.length})...`);

            let uid = getCachedUserId(username);
            if (!uid && Array.isArray(blockedList)) {
                const item = blockedList.find(x => x?.username?.toLowerCase() === username.toLowerCase());
                if (item?.pk || item?.id) {
                    uid = String(item.pk || item.id);
                    setCachedUserId(username, uid);
                }
            }
            if (!uid) {
                uid = await getUserId(username);
            }

            if (!uid) {
                console.warn(`[IG Tools] ID não encontrado para @${username}`);
                showToast(`⚠️ ID de @${username} não encontrado`);
                continue;
            }

            const res = await executeApiUnblock(uid, username);
            if (res.success) {
                successfullyUnblocked.push(username);
                showToast(`🔓 Desbloqueou @${username}`);

                const rows = document.querySelectorAll(`tr[data-username="${username}"]`);
                rows.forEach(r => r.remove());
            } else {
                showToast(`❌ Falha ao desbloquear @${username}`);
            }

            if (i < usersToUnblock.length - 1) {
                await new Promise(r => setTimeout(r, delay));
            }
        }

        bar.remove();
        toggleLoading(false);

        if (onComplete) onComplete(successfullyUnblocked);
    }

    async function blockUsers(usersToBlock, onComplete) {
        let cancelled = false;
        const { bar, update, closeButton } = createCancellableProgressBar();
        closeButton.onclick = () => {
            cancelled = true;
            bar.remove();
            showToast("Processo de bloqueio interrompido.");
        };
        toggleLoading(true, 0, "Bloqueando contas via API...");

        const delay = loadSettings().unfollowDelay || 1200;
        const successfullyBlocked = [];

        for (let i = 0; i < usersToBlock.length; i++) {
            if (cancelled) break;
            const itemObj = usersToBlock[i];
            const username = typeof itemObj === 'object' ? itemObj.username : itemObj;
            let explicitPk = typeof itemObj === 'object' ? (itemObj.pk || itemObj.id) : null;

            const percent = Math.round(((i + 1) / usersToBlock.length) * 100);
            update(i + 1, usersToBlock.length, `Bloqueando @${username}...`);
            toggleLoading(true, percent, `Bloqueando @${username} (${i + 1}/${usersToBlock.length})...`);

            let uid = explicitPk || getCachedUserId(username);
            if (!uid && Array.isArray(unblockedList)) {
                const item = unblockedList.find(x => x?.username?.toLowerCase() === username.toLowerCase());
                if (item?.pk || item?.id) {
                    uid = String(item.pk || item.id);
                    setCachedUserId(username, uid);
                }
            }
            if (!uid && Array.isArray(blockedList)) {
                const item = blockedList.find(x => x?.username?.toLowerCase() === username.toLowerCase());
                if (item?.pk || item?.id) {
                    uid = String(item.pk || item.id);
                    setCachedUserId(username, uid);
                }
            }
            if (!uid) {
                const rowBtn = document.querySelector(`.btn-block-again-row[data-username="${username}"]`);
                if (rowBtn && rowBtn.dataset.uid) {
                    uid = String(rowBtn.dataset.uid);
                    setCachedUserId(username, uid);
                }
            }
            if (!uid) {
                uid = await getUserId(username);
            }

            if (!uid) {
                console.warn(`[IG Tools Block] ID não encontrado para @${username}`);
                showToast(`⚠️ ID de @${username} não encontrado`);
                continue;
            }

            const res = await executeApiBlock(uid, username);
            const isAlreadyBlocked = !res.success && (
                JSON.stringify(res.data || '').toLowerCase().includes('already') ||
                JSON.stringify(res.data || '').toLowerCase().includes('bloqueado') ||
                (res.text && (res.text.toLowerCase().includes('already') || res.text.toLowerCase().includes('bloqueado')))
            );

            if (res.success || isAlreadyBlocked) {
                successfullyBlocked.push(username);
                showToast(`🔒 @${username} ${isAlreadyBlocked ? '(já estava bloqueado no Instagram)' : 'bloqueado com sucesso'}`);

                const rows = document.querySelectorAll(`tr[data-username="${username}"]`);
                rows.forEach(r => r.remove());
            } else {
                showToast(`❌ Falha ao bloquear @${username}`);
            }

            if (i < usersToBlock.length - 1) {
                await new Promise(r => setTimeout(r, delay));
            }
        }

        bar.remove();
        toggleLoading(false);

        if (onComplete) onComplete(successfullyBlocked);
    }

    // Exporta módulo para o barramento window.IGTools e escopo global
    window.IGTools.BlockedAccounts = {
        isForbiddenBlockedUsername,
        sanitizeBlockedList,
        fetchBlockedAccountsWbloks,
        fetchBlockedAccountsPageHtml,
        extractBlockedAccountsUsernames,
        iniciarProcessoBloqueados,
        unblockUsers,
        blockUsers
    };

    window.isForbiddenBlockedUsername = isForbiddenBlockedUsername;
    window.sanitizeBlockedList = sanitizeBlockedList;
    window.fetchBlockedAccountsWbloks = fetchBlockedAccountsWbloks;
    window.fetchBlockedAccountsPageHtml = fetchBlockedAccountsPageHtml;
    window.extractBlockedAccountsUsernames = extractBlockedAccountsUsernames;
    window.iniciarProcessoBloqueados = iniciarProcessoBloqueados;
    window.unblockUsers = unblockUsers;
    window.blockUsers = blockUsers;
})();
