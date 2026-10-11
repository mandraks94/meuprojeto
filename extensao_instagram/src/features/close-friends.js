/**
 * ============================================================================
 * Instagram Tools - Módulo 6: Gerenciador de Amigos Próximos (Close Friends)
 * Arquivo: src/features/close-friends.js
 * Descrição: Gerenciamento completo de Amigos Próximos (Melhores Amigos) do Instagram.
 *            Suporta carregamento instantâneo (0ms) via IndexedDB/Cache local,
 *            sincronização avançada via Bloks/SSR, importação de arquivo oficial
 *            close_friends.json do Instagram, adição/remoção individual com 1 clique
 *            e execução em lote via Polaris GraphQL (usePolarisSetBestiesMutation).
 * ============================================================================
 */

(() => {
    'use strict';

    window.IGTools = window.IGTools || {};

    const DEFAULT_AVATAR = window.DEFAULT_AVATAR || "https://instagram.com/static/images/ico/favicon.ico/dfa40056e817.ico";
    const infoIcon = window.infoIcon || `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align: middle; opacity: 0.6;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;

    let cachedCloseFriends = [];
    try {
        const saved = localStorage.getItem('ig_tools_cached_close_friends');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) cachedCloseFriends = parsed;
        }
    } catch (_) { }

    let modalAbertoCloseFriends = false;

    // Helper para salvar e carregar configurações
    function getSettings() {
        if (typeof window.loadSettings === 'function') return window.loadSettings();
        try {
            return JSON.parse(localStorage.getItem('ig_tools_settings') || '{}');
        } catch (_) {
            return {};
        }
    }

    function setSettings(newSettings) {
        if (typeof window.saveSettings === 'function') return window.saveSettings(newSettings);
        try {
            const current = getSettings();
            localStorage.setItem('ig_tools_settings', JSON.stringify({ ...current, ...newSettings }));
        } catch (_) { }
    }

    function showNotification(msg) {
        if (typeof window.showToast === 'function') window.showToast(msg);
        else console.log('[IG Tools Close Friends]', msg);
    }

    // 1. Extrator completo via rolagem (Turbo Scroll) e interceptação Bloks
    function extractCloseFriendsUsernames(doc = document) {
        return new Promise((resolve) => {
            const users = new Map();
            let scrollInterval;
            let noNewUsersCount = 0;
            const maxIdleCount = 6;

            let cancelled = false;
            const createBar = window.createCancellableProgressBar || (() => ({
                bar: { remove: () => {} },
                update: () => {},
                closeButton: { onclick: () => {} }
            }));
            const { bar, update, closeButton } = createBar();
            closeButton.onclick = () => {
                cancelled = true;
                finishExtraction();
            };
            update(0, 0, "Buscando e rolando a lista de Amigos Próximos...");

            function finishExtraction() {
                if (scrollInterval) clearInterval(scrollInterval);
                if (window._igCloseFriendsUsersCapture && window._igCloseFriendsUsersCapture.callbacks) {
                    const idx = window._igCloseFriendsUsersCapture.callbacks.indexOf(networkCallback);
                    if (idx !== -1) window._igCloseFriendsUsersCapture.callbacks.splice(idx, 1);
                }
                if (bar) bar.remove();
                console.log(`[IG Tools Close Friends] Extração finalizada. Total de ${users.size} contatos mapeados.`);
                users.forEach(u => {
                    if (u.username && u.pk && typeof window.setCachedUserId === 'function') {
                        window.setCachedUserId(u.username, u.pk);
                    }
                });
                resolve(cancelled ? [] : Array.from(users.values()));
            }

            // A. Extração de scripts SSR presentes no DOM
            try {
                const scripts = Array.from(doc.querySelectorAll('script[type="application/json"]'));
                for (const script of scripts) {
                    const text = script.textContent || '';
                    if (!text.includes('close_friend') && !text.includes('besties') && !text.includes('username')) continue;

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
                        if (pk && typeof window.setCachedUserId === 'function') window.setCachedUserId(uname, pk);

                        let isChecked = false;
                        const chunkLower = chunk.toLowerCase();
                        if (chunkLower.includes('circle-check') || chunkLower.includes('"is_selected":true') || chunkLower.includes('"selected":true')) {
                            isChecked = true;
                        }

                        if (!users.has(uname)) {
                            users.set(uname, { username: uname, photoUrl, isChecked, isCloseFriend: isChecked, pk });
                        }
                    }
                }
                if (users.size > 0) {
                    console.log(`[IG Tools Close Friends] Extraídos ${users.size} usuários via scripts SSR.`);
                    update(users.size, users.size, `Carregados ${users.size} usuário(s) iniciais...`);
                }
            } catch (e) { }

            // B. Importa dados já capturados na sessão pelo interceptor de rede
            if (window._igCloseFriendsUsersCapture && window._igCloseFriendsUsersCapture.users) {
                window._igCloseFriendsUsersCapture.users.forEach(u => {
                    if (!users.has(u.username)) {
                        users.set(u.username, { username: u.username, photoUrl: u.photoUrl, isChecked: u.isChecked || false, isCloseFriend: u.isChecked || false, pk: u.pk });
                    } else {
                        const cur = users.get(u.username);
                        if (!cur.pk && u.pk) cur.pk = u.pk;
                        if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && u.photoUrl !== DEFAULT_AVATAR) cur.photoUrl = u.photoUrl;
                        if (!cur.isChecked && u.isChecked) { cur.isChecked = true; cur.isCloseFriend = true; }
                    }
                    if (u.pk && typeof window.setCachedUserId === 'function') window.setCachedUserId(u.username, u.pk);
                });
            }

            // C. Callback de rede em tempo real para paginações Bloks
            function networkCallback(capturedArray) {
                let added = false;
                capturedArray.forEach(u => {
                    if (!users.has(u.username)) {
                        users.set(u.username, { username: u.username, photoUrl: u.photoUrl, isChecked: u.isChecked || false, isCloseFriend: u.isChecked || false, pk: u.pk });
                        added = true;
                    } else {
                        const cur = users.get(u.username);
                        if (!cur.pk && u.pk) cur.pk = u.pk;
                        if ((!cur.photoUrl || cur.photoUrl === DEFAULT_AVATAR) && u.photoUrl !== DEFAULT_AVATAR) cur.photoUrl = u.photoUrl;
                        if (!cur.isChecked && u.isChecked) { cur.isChecked = true; cur.isCloseFriend = true; }
                    }
                    if (u.pk && typeof window.setCachedUserId === 'function') window.setCachedUserId(u.username, u.pk);
                });
                if (added) {
                    noNewUsersCount = 0;
                    update(users.size, users.size, `Capturado(s) ${users.size} usuário(s)... Rolando...`);
                }
            }
            if (window._igCloseFriendsUsersCapture) {
                window._igCloseFriendsUsersCapture.callbacks.push(networkCallback);
            }

            // D. Varredura no DOM combinada com rolagem acelerada (Turbo Scroll)
            function performScrollAndExtract() {
                if (cancelled) return;
                const initialUserCount = users.size;

                const userElements = Array.from(doc.querySelectorAll('div.wbloks_1, div[data-bloks-name="bk.components.Flexbox"]'))
                    .filter(el => el.querySelector('div[aria-label*="caixa de seleção"], div[role="button"][aria-label*="caixa de seleção"]') || (el.querySelector('img') && el.innerText && el.innerText.includes('\n')));

                userElements.forEach(userElement => {
                    const spans = Array.from(userElement.querySelectorAll('span'));
                    let username = spans.length > 0 ? spans[0].innerText.trim() : (userElement.innerText ? userElement.innerText.trim().split('\n')[0] : '');
                    username = username.replace(/^@/, '');
                    if (!username || username === 'Ver perfil') return;

                    let isChecked = false;
                    const checkboxContainer = userElement.querySelector('div[aria-label*="caixa de seleção"], div[role="button"][aria-label*="caixa de seleção"]') || userElement.querySelector('div[role="button"][tabindex="0"]');
                    if (checkboxContainer) {
                        const ariaChecked = checkboxContainer.getAttribute('aria-checked') || checkboxContainer.getAttribute('aria-selected');
                        if (ariaChecked === 'true') {
                            isChecked = true;
                        } else {
                            const icon = checkboxContainer.querySelector('[data-bloks-name="ig.components.Icon"], div.wbloks_1') || checkboxContainer;
                            if (icon) {
                                const style = window.getComputedStyle(icon);
                                const bg = style.backgroundColor;
                                const mask = style.maskImage || style.webkitMaskImage;
                                const bgImg = style.backgroundImage;
                                if (bg === 'rgb(0, 149, 246)' || bg === 'rgb(74, 93, 249)' || (bgImg && bgImg.includes('circle-check__filled')) || (mask && mask.includes('circle-check__filled'))) {
                                    isChecked = true;
                                }
                            }
                        }
                    }

                    if (/^[a-zA-Z0-9_.]+$/.test(username)) {
                        const imgTag = userElement.querySelector('img');
                        const photoUrl = imgTag ? imgTag.src : DEFAULT_AVATAR;

                        if (!users.has(username)) {
                            const pk = typeof window.getCachedUserId === 'function' ? (window.getCachedUserId(username) || '') : '';
                            users.set(username, { username, photoUrl, isChecked, isCloseFriend: isChecked, pk });
                        } else {
                            const u = users.get(username);
                            if (!u.isChecked && isChecked) { u.isChecked = true; u.isCloseFriend = true; }
                            if ((!u.photoUrl || u.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) u.photoUrl = photoUrl;
                        }
                    }
                });

                update(users.size, users.size, `Encontrado(s) ${users.size} usuário(s)... Rolando...`);

                if (users.size === initialUserCount) {
                    noNewUsersCount++;
                } else {
                    noNewUsersCount = 0;
                }

                if (noNewUsersCount >= (users.size > 0 ? maxIdleCount : 8)) {
                    console.log("[IG Tools Close Friends] Nenhum novo usuário após tentativas sucessivas. Finalizando.");
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
                if (scrollInterval) finishExtraction();
            }, 60000);
        });
    }

    // 2. Extrai instantaneamente do DOM atual ou de scripts SSR sem esperar rolagem
    async function extractCloseFriendsFromCurrentDomOrFetch() {
        const usersMap = new Map();

        // DOM atual (Bloks)
        const flexboxes = Array.from(document.querySelectorAll('div.wbloks_1, [data-bloks-name="bk.components.Flexbox"]'));
        if (flexboxes.length > 0) {
            flexboxes.forEach(flex => {
                const spans = Array.from(flex.querySelectorAll('span'));
                let uname = spans.length > 0 ? spans[0].innerText.trim() : (flex.innerText ? flex.innerText.trim().split('\n')[0] : '');
                uname = uname.replace(/^@/, '');
                if (!uname || uname === 'Ver perfil' || !/^[a-zA-Z0-9_.]+$/.test(uname)) return;

                const checkboxContainer = flex.querySelector('div[aria-label*="caixa de seleção"], div[role="button"][aria-label*="caixa de seleção"], div[role="button"][tabindex="0"]');
                let isChecked = false;
                if (checkboxContainer) {
                    const ariaChecked = checkboxContainer.getAttribute('aria-checked') || checkboxContainer.getAttribute('aria-selected');
                    if (ariaChecked === 'true') isChecked = true;
                    else {
                        const icon = checkboxContainer.querySelector('[data-bloks-name="ig.components.Icon"], div.wbloks_1') || checkboxContainer;
                        if (icon) {
                            const style = window.getComputedStyle(icon);
                            const bg = style.backgroundColor;
                            const mask = style.maskImage || style.webkitMaskImage;
                            const bgImg = style.backgroundImage;
                            if (bg === 'rgb(0, 149, 246)' || bg === 'rgb(74, 93, 249)' || (bgImg && bgImg.includes('circle-check__filled')) || (mask && mask.includes('circle-check__filled'))) {
                                isChecked = true;
                            }
                        }
                    }
                }

                const imgTag = flex.querySelector('img');
                const photoUrl = imgTag ? imgTag.src : DEFAULT_AVATAR;
                const pk = typeof window.getCachedUserId === 'function' ? (window.getCachedUserId(uname) || '') : '';

                usersMap.set(uname.toLowerCase(), {
                    username: uname,
                    photoUrl,
                    pk,
                    id: pk,
                    fullName: spans.length > 1 ? spans[1].innerText.trim() : '',
                    isCloseFriend: isChecked
                });
            });
        }

        // Scripts SSR
        const scripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
        for (const script of scripts) {
            const text = script.textContent || '';
            if (!text.includes('close_friend') && !text.includes('besties') && !text.includes('username')) continue;
            const userRegex = /"username":"([a-zA-Z0-9._]+)"/g;
            let match;
            while ((match = userRegex.exec(text)) !== null) {
                const uname = match[1];
                if (!uname || uname === 'instagram' || uname === 'threads') continue;
                const k = uname.toLowerCase();

                const start = Math.max(0, match.index - 300);
                const end = Math.min(text.length, match.index + 500);
                const chunk = text.slice(start, end);

                const picMatch = chunk.match(/"profile_pic_url":"([^"]+)"/);
                const photoUrl = picMatch ? picMatch[1].replace(/\\/g, '').replace(/\\u0026/g, '&') : DEFAULT_AVATAR;

                const pkMatch = chunk.match(/"pk":"?(\d+)"?/);
                const pk = pkMatch ? pkMatch[1] : '';
                if (pk && typeof window.setCachedUserId === 'function') window.setCachedUserId(uname, pk);

                let isChecked = false;
                const chunkLower = chunk.toLowerCase();
                if (chunkLower.includes('circle-check') || chunkLower.includes('"is_selected":true') || chunkLower.includes('"selected":true')) {
                    isChecked = true;
                }

                if (!usersMap.has(k)) {
                    usersMap.set(k, {
                        username: uname,
                        photoUrl,
                        pk,
                        id: pk,
                        fullName: '',
                        isCloseFriend: isChecked
                    });
                } else if (isChecked) {
                    usersMap.get(k).isCloseFriend = true;
                }
            }
        }

        // Se vazia e fora de /accounts/close_friends/, tenta ler o HTML diretamente via fetch nativo
        const currentCloseCount = Array.from(usersMap.values()).filter(u => u.isCloseFriend).length;
        if (currentCloseCount === 0 && !window.location.pathname.includes('/accounts/close_friends/')) {
            try {
                const res = await fetch('https://www.instagram.com/accounts/close_friends/', { credentials: 'include' });
                if (res.ok) {
                    const htmlText = await res.text();
                    const userRegex = /"username":"([a-zA-Z0-9._]+)"/g;
                    let match;
                    while ((match = userRegex.exec(htmlText)) !== null) {
                        const uname = match[1];
                        if (!uname || uname === 'instagram' || uname === 'threads') continue;
                        const k = uname.toLowerCase();

                        const start = Math.max(0, match.index - 300);
                        const end = Math.min(htmlText.length, match.index + 500);
                        const chunk = htmlText.slice(start, end);

                        const picMatch = chunk.match(/"profile_pic_url":"([^"]+)"/);
                        const photoUrl = picMatch ? picMatch[1].replace(/\\/g, '').replace(/\\u0026/g, '&') : DEFAULT_AVATAR;

                        const pkMatch = chunk.match(/"pk":"?(\d+)"?/);
                        const pk = pkMatch ? pkMatch[1] : '';
                        if (pk && typeof window.setCachedUserId === 'function') window.setCachedUserId(uname, pk);

                        let isChecked = false;
                        const chunkLower = chunk.toLowerCase();
                        if (chunkLower.includes('circle-check') || chunkLower.includes('"is_selected":true') || chunkLower.includes('"selected":true')) {
                            isChecked = true;
                        }

                        if (!usersMap.has(k)) {
                            usersMap.set(k, {
                                username: uname,
                                photoUrl,
                                pk,
                                id: pk,
                                fullName: '',
                                isCloseFriend: isChecked
                            });
                        } else if (isChecked) {
                            usersMap.get(k).isCloseFriend = true;
                        }
                    }
                }
            } catch (_) { }
        }

        // Dados capturados em tempo real por rede
        if (window._igCloseFriendsUsersCapture && window._igCloseFriendsUsersCapture.users) {
            window._igCloseFriendsUsersCapture.users.forEach(u => {
                const k = u.username.toLowerCase();
                if (!usersMap.has(k)) {
                    usersMap.set(k, {
                        username: u.username,
                        photoUrl: u.photoUrl || DEFAULT_AVATAR,
                        pk: u.pk || '',
                        id: u.pk || '',
                        fullName: '',
                        isCloseFriend: !!u.isChecked
                    });
                } else if (u.isChecked) {
                    usersMap.get(k).isCloseFriend = true;
                }
                if (u.pk && typeof window.setCachedUserId === 'function') window.setCachedUserId(u.username, u.pk);
            });
        }

        return Array.from(usersMap.values());
    }

    // 3. Mutação Polaris GraphQL oficial para Besties (usePolarisSetBestiesMutation)
    async function executeGraphqlSetBesties(adds = [], removes = []) {
        const addList = (Array.isArray(adds) ? adds : [adds]).filter(Boolean).map(String);
        const removeList = (Array.isArray(removes) ? removes : [removes]).filter(Boolean).map(String);

        if (addList.length === 0 && removeList.length === 0) {
            console.warn("[IG Tools Besties] Nenhum ID fornecido para adicionar ou remover.");
            return { success: false, error: 'empty_ids' };
        }

        const getCookie = (name) => {
            if (typeof window.getCookie === 'function') return window.getCookie(name);
            const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
            return v ? v[2] : '';
        };

        const getInstagramFormToken = (name) => {
            if (typeof window.getInstagramFormToken === 'function') return window.getInstagramFormToken(name);
            try {
                const match = document.documentElement.innerHTML.match(new RegExp(`"${name}":"([^"]+)"`));
                return match ? match[1] : '';
            } catch (_) { return ''; }
        };

        const viewerId = getCookie('ds_user_id') || getInstagramFormToken('av') || '';
        const lsd = (typeof window.getLsdToken === 'function' ? window.getLsdToken() : '') || getInstagramFormToken('lsd') || '';
        const fbDtsg = (typeof window.getDtsgToken === 'function' ? window.getDtsgToken() : '') || getInstagramFormToken('fb_dtsg') || '';
        const jazoest = (typeof window.computeJazoest === 'function' ? window.computeJazoest(fbDtsg) : '') || '26367';
        const spin = typeof window.getSpinParams === 'function' ? window.getSpinParams() : { spin_r: '1048569652', spin_b: 'trunk', spin_t: String(Math.floor(Date.now() / 1000)) };

        const body = new URLSearchParams();
        body.append('__comet_req', '7');
        if (viewerId) body.append('av', viewerId);
        if (fbDtsg) body.append('fb_dtsg', fbDtsg);
        if (jazoest) body.append('jazoest', jazoest);
        if (lsd) body.append('lsd', lsd);
        if (spin.spin_r) body.append('__spin_r', spin.spin_r);
        body.append('__spin_b', spin.spin_b || 'trunk');
        if (spin.spin_t) body.append('__spin_t', spin.spin_t);
        body.append('fb_api_caller_class', 'RelayModern');
        body.append('fb_api_req_friendly_name', 'usePolarisSetBestiesMutation');
        body.append('server_timestamps', 'true');
        body.append('variables', JSON.stringify({
            add: addList,
            remove: removeList,
            source: 'profile'
        }));
        body.append('doc_id', '27495272076736910');

        const getHeaders = typeof window.getApiHeaders === 'function' ? window.getApiHeaders(true) : {};
        const headers = {
            'X-IG-App-ID': '936619743392459',
            'X-CSRFToken': getCookie('csrftoken') || '',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded',
            ...getHeaders,
            'X-FB-LSD': lsd,
            'X-FB-Friendly-Name': 'usePolarisSetBestiesMutation'
        };

        try {
            console.log(`[IG Tools Besties] Enviando mutação Polaris GraphQL:`, { adds: addList, removes: removeList, hasFbDtsg: !!fbDtsg, hasLsd: !!lsd });
            let resp = await fetch('https://www.instagram.com/api/graphql', {
                method: 'POST',
                headers,
                body: body.toString(),
                credentials: 'include',
                cache: 'no-store'
            });

            let rawText = await resp.text();
            let cleanedText = rawText.trim();
            if (cleanedText.startsWith('for (;;);')) {
                cleanedText = cleanedText.slice(9).trim();
            }

            // Fallback para endpoint alternativo Polaris caso api/graphql devolva HTML
            if (cleanedText.startsWith('<!DOCTYPE') || cleanedText.startsWith('<html') || !resp.ok) {
                console.warn('[IG Tools Besties] api/graphql retornou HTML ou status não-ok, tentando endpoint alternativo graphql/query...');
                try {
                    const altResp = await fetch('https://www.instagram.com/graphql/query', {
                        method: 'POST',
                        headers,
                        body: body.toString(),
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    if (altResp.ok) {
                        const altText = await altResp.text();
                        let altCleaned = altText.trim();
                        if (altCleaned.startsWith('for (;;);')) altCleaned = altCleaned.slice(9).trim();
                        if (!altCleaned.startsWith('<!DOCTYPE') && !altCleaned.startsWith('<html')) {
                            resp = altResp;
                            cleanedText = altCleaned;
                        }
                    }
                } catch (altErr) {
                    console.warn('[IG Tools Besties] Falha no endpoint alternativo:', altErr);
                }
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

            console.log("[IG Tools Besties] Resposta processada:", { status: resp.status, ok: resp.ok, data });

            if (data && !data.errors) {
                return { success: true, data };
            }
            if (data?.errors) {
                return { success: false, error: data.errors[0]?.message || 'GraphQL Error' };
            }
            if (resp.ok && cleanedText && !cleanedText.startsWith('<!DOCTYPE')) {
                return { success: true, data };
            }
            return { success: false, status: resp.status, error: 'Resposta inválida do servidor' };
        } catch (err) {
            console.error('[IG Tools Besties] Erro na requisição:', err);
            return { success: false, error: err.message };
        }
    }

    // 4. Modal Principal do Gerenciador de Amigos Próximos
    async function abrirModalAmigosProximos() {
        const existingModal = document.getElementById("closeFriendsModal") || document.getElementById("allCloseFriendsDiv");
        if (existingModal) existingModal.remove();
        if (modalAbertoCloseFriends) return;
        modalAbertoCloseFriends = true;

        const dbHelper = window.dbHelper;
        const userListCache = window.userListCache || { closeFriends: new Set() };
        const toggleLoading = window.toggleLoading || (() => {});

        // Helper inteligente para resolver fotos de perfil através de múltiplos caches e sessões
        function resolveUserPhoto(username, currentPhoto = null) {
            if (currentPhoto && currentPhoto !== DEFAULT_AVATAR && typeof currentPhoto === 'string' && !currentPhoto.includes('rsrc.php')) {
                return currentPhoto;
            }
            const clean = (typeof username === 'string' ? username : (username?.username || '')).toLowerCase().trim();
            if (!clean) return DEFAULT_AVATAR;

            try {
                if (typeof window.cachedData !== 'undefined' && window.cachedData?.userDetails) {
                    const p = window.cachedData.userDetails.get(clean)?.photoUrl;
                    if (p && p !== DEFAULT_AVATAR && typeof p === 'string' && !p.includes('rsrc.php')) return p;
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
                if (dbHelper?._cache?.closeFriends && Array.isArray(dbHelper._cache.closeFriends)) {
                    const item = dbHelper._cache.closeFriends.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
                if (typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList)) {
                    const item = window.seguindoList.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
            } catch (_) { }
            return DEFAULT_AVATAR;
        }

        // 1. CARREGAMENTO INSTANTÂNEO VIA CACHE LOCAL OU BANCO INDEXEDDB (0ms)
        let closeFriendsList = (Array.isArray(cachedCloseFriends) && cachedCloseFriends.length > 0)
            ? [...cachedCloseFriends]
            : [];

        if (closeFriendsList.length === 0 && dbHelper && typeof dbHelper.loadCache === 'function') {
            try {
                const dbBesties = await dbHelper.loadCache('closeFriends');
                let bestiesArr = [];
                if (dbBesties) {
                    if (Array.isArray(dbBesties)) bestiesArr = dbBesties;
                    else if (dbBesties.details instanceof Map) bestiesArr = Array.from(dbBesties.details.values());
                    else if (dbBesties instanceof Set) bestiesArr = Array.from(dbBesties).map(u => ({ username: u }));
                }
                if (bestiesArr.length > 0) {
                    closeFriendsList = bestiesArr.map(u => ({
                        username: typeof u === 'string' ? u : u.username,
                        photoUrl: resolveUserPhoto(typeof u === 'string' ? u : u.username, typeof u === 'object' ? u.photoUrl : null),
                        pk: (typeof u === 'object' && (u.pk || u.id)) ? String(u.pk || u.id) : ((typeof window.getCachedUserId === 'function' ? window.getCachedUserId(typeof u === 'string' ? u : u.username) : '') || ''),
                        fullName: (typeof u === 'object' && u.fullName) ? u.fullName : '',
                        isCloseFriend: true
                    }));
                    cachedCloseFriends = closeFriendsList;
                }
            } catch (_) { }
        }

        // Tenta mesclar contas de Seguindo imediatamente
        try {
            let fArr = [];
            if (dbHelper && typeof dbHelper.loadCache === 'function') {
                const dbFollowing = await dbHelper.loadCache('following');
                if (dbFollowing) {
                    if (Array.isArray(dbFollowing)) fArr = dbFollowing;
                    else if (dbFollowing.details instanceof Map) fArr = Array.from(dbFollowing.details.values());
                    else if (dbFollowing instanceof Set) fArr = Array.from(dbFollowing).map(u => ({ username: u }));
                }
            }
            if (fArr.length === 0 && dbHelper?._cache?.following && Array.isArray(dbHelper._cache.following)) {
                fArr = dbHelper._cache.following;
            }
            if (fArr.length === 0 && typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList) && window.seguindoList.length > 0) {
                fArr = window.seguindoList;
            }
            if (fArr.length > 0) {
                const map = new Map();
                closeFriendsList.forEach(u => {
                    const k = u.username.toLowerCase();
                    const p = resolveUserPhoto(u.username, u.photoUrl);
                    map.set(k, { ...u, photoUrl: p });
                });
                fArr.forEach(f => {
                    const uname = typeof f === 'string' ? f : f.username;
                    if (!uname) return;
                    const k = uname.toLowerCase();
                    const p = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
                    const existing = map.get(k);
                    if (existing) {
                        if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p && p !== DEFAULT_AVATAR) {
                            existing.photoUrl = p;
                        }
                        if (!existing.fullName && typeof f === 'object' && f.fullName) {
                            existing.fullName = f.fullName;
                        }
                        if (!existing.pk && typeof f === 'object' && (f.pk || f.id)) {
                            existing.pk = String(f.pk || f.id);
                        }
                    } else {
                        const pk = (typeof f === 'object' && (f.pk || f.id)) ? String(f.pk || f.id) : ((typeof window.getCachedUserId === 'function' ? window.getCachedUserId(uname) : '') || '');
                        map.set(k, {
                            username: uname,
                            pk: pk,
                            id: pk,
                            fullName: (typeof f === 'object' && f.fullName) ? f.fullName : '',
                            photoUrl: p || DEFAULT_AVATAR,
                            isCloseFriend: false
                        });
                    }
                });
                closeFriendsList = Array.from(map.values());
                cachedCloseFriends = closeFriendsList;
            }
        } catch (_) { }

        const selectedUsers = new Set();
        let currentPage = 1;
        let sortConfig = { key: 'isCloseFriend', direction: 'descending' };

        // 2. MONTAGEM IMEDIATA DO MODAL (0ms)
        const div = document.createElement("div");
        div.id = "closeFriendsModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 820px; max-height: 90vh; border: 1px solid #ccc;
            border-radius: 12px; padding: 20px; z-index: 10000; overflow: auto;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        `;

        const cfCount = closeFriendsList.filter(u => u.isCloseFriend).length;

        div.innerHTML = `
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; cursor: move;">
                <span class="modal-title" style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <span>⭐ Gerenciador de Amigos Próximos</span>
                    <span id="cfSelectedCount" style="font-size:12px; font-weight:normal; color:#0095f6;">(0 selecionados)</span>
                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie seus Melhores Amigos (círculo verde). Adicione ou remova contatos individualmente ou em lote com 1 clique.</span></div>
                </span>
                <div class="modal-controls" style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 10px;">
                    <button id="cfMinimizarBtn" title="Minimizar" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 2px 6px; color: #8e8e8e; line-height: 1;">_</button>
                    <button id="cfFecharBtn" title="Fechar" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 2px 6px; color: #8e8e8e; line-height: 1;">X</button>
                </div>
            </div>
            <div id="cfModalBody" style="display: block;">
                <div style="padding: 15px 0 10px 0;">
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                            <button id="cfRefreshBtn" title="Ler e sincronizar Amigos Próximos via Instagram Web" style="background: #1abc9c; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">🔄 Sincronizar</button>
                            <button id="cfImportJsonBtn" title="Importar arquivo oficial close_friends.json do Instagram" style="background: #8e44ad; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">📥 Importar JSON</button>
                            <button id="cfAddSelectedBtn" title="Adicionar selecionados aos Amigos Próximos" style="background: #2ecc71; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600;">⭐ Adicionar Selecionados</button>
                            <button id="cfRemoveSelectedBtn" title="Remover selecionados dos Amigos Próximos" style="background: #e74c3c; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600;">❌ Remover Selecionados</button>
                            <button id="cfSelectPageBtn" style="background: #0095f6; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px;">Selecionar Página</button>
                            <button id="cfDeselectAllBtn" style="background: #6c757d; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px;">Desmarcar Todos</button>
                            <input type="file" id="cfJsonFileInput" accept=".json" style="display: none;">
                        </div>
                        <div class="toggle-item" style="padding: 5px 10px; border-radius: 8px; gap: 10px; display: flex; align-items: center;">
                            <span style="font-size: 13px; font-weight: 500;">⚡ Usar API</span>
                            <label class="switch"><input type="checkbox" id="cfUseApiToggle" ${getSettings().useApi ? 'checked' : ''}><span class="slider"></span></label>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 12px; display: flex; gap: 10px;">
                    <input type="text" id="cfSearchInput" placeholder="Pesquisar por @usuário, nome ou ID..." style="flex: 2; padding: 8px 12px; height: 38px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; outline: none; box-sizing: border-box;">
                    <select id="cfFilterSelect" style="flex: 1; padding: 0 10px; height: 38px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; cursor: pointer; outline: none; box-sizing: border-box;">
                        <option value="besties">⭐ Melhores Amigos (${cfCount})</option>
                        <option value="following">👤 Quem Eu Sigo (Para Adicionar)</option>
                        <option value="all">Todos (${closeFriendsList.length})</option>
                    </select>
                </div>
                <div id="statusCloseFriends" style="font-weight: 600; font-size: 13px; color: #555; display: flex; justify-content: space-between; align-items: center;">
                    <span>Total: <strong style="color: #2ecc71;">${cfCount}</strong> melhores amigos cadastrados.</span>
                    <span id="cfSyncInfo" style="font-size: 11px; color: #888;"></span>
                </div>
                <div id="tabelaCloseFriendsContainer" style="display: block; margin-top: 12px;"></div>
            </div>
        `;

        document.body.appendChild(div);

        try {
            if (typeof window.makeDraggable === 'function') window.makeDraggable(div);
        } catch (_) { }

        const container = document.getElementById("tabelaCloseFriendsContainer");

        const updateCounts = (paginatedUsers = []) => {
            const countEl = document.getElementById('cfSelectedCount');
            if (countEl) countEl.innerText = `(${selectedUsers.size} selecionados)`;

            const selectAllCb = document.getElementById('selectAllCfCheckbox');
            if (selectAllCb && paginatedUsers.length > 0) {
                selectAllCb.checked = paginatedUsers.every(u => selectedUsers.has(u.username));
            }

            const curCfCount = closeFriendsList.filter(u => u.isCloseFriend).length;
            const filterSelect = document.getElementById('cfFilterSelect');
            if (filterSelect && filterSelect.options.length >= 3) {
                filterSelect.options[0].text = `⭐ Melhores Amigos (${curCfCount})`;
                filterSelect.options[2].text = `Todos (${closeFriendsList.length})`;
            }

            const statusEl = document.getElementById('statusCloseFriends');
            if (statusEl) {
                const totalSpan = statusEl.querySelector('span');
                if (totalSpan) totalSpan.innerHTML = `Total: <strong style="color: #2ecc71;">${curCfCount}</strong> melhores amigos cadastrados.`;
            }
        };

        const renderList = (page) => {
            const itemsPerPage = getSettings().itemsPerPage || 10;
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            const searchTerm = (document.getElementById('cfSearchInput')?.value || '').toLowerCase().trim();
            const filterValue = document.getElementById('cfFilterSelect')?.value || 'besties';

            let filteredUsers = closeFriendsList;

            if (filterValue === 'besties') {
                filteredUsers = filteredUsers.filter(u => u.isCloseFriend);
            } else if (filterValue === 'following') {
                filteredUsers = filteredUsers.filter(u => !u.isCloseFriend);
            }

            if (searchTerm) {
                filteredUsers = filteredUsers.filter(u =>
                    (u.username && u.username.toLowerCase().includes(searchTerm)) ||
                    (u.fullName && u.fullName.toLowerCase().includes(searchTerm)) ||
                    (u.pk && u.pk.includes(searchTerm))
                );
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
                } else if (sortConfig.key === 'isCloseFriend') {
                    valA = a.isCloseFriend ? 1 : 0;
                    valB = b.isCloseFriend ? 1 : 0;
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });

            const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));
            if (page > totalPages) page = totalPages;
            currentPage = page;

            const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

            let tableHtml = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
                    <thead style="cursor: pointer;">
                        <tr style="text-align: left; border-bottom: 2px solid #dbdbdb;">
                            <th style="padding: 8px; width: 30px;"><input type="checkbox" id="selectAllCfCheckbox" title="Selecionar Todos da Página"></th>
                            <th style="padding: 8px;" data-sort-key="username">Usuário ${sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                            <th style="padding: 8px; text-align: center;" data-sort-key="pk">ID (PK) ${sortConfig.key === 'pk' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                            <th style="padding: 8px; text-align: center;" data-sort-key="isCloseFriend">Status ${sortConfig.key === 'isCloseFriend' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                            <th style="padding: 8px; text-align: center;">Ações</th>
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
                                Você pode clicar em <strong>🔄 Sincronizar</strong> para carregar sua lista de Melhores Amigos diretamente do Instagram Web ou clicar em <strong>📥 Importar JSON</strong> com o arquivo <code>close_friends.json</code>.
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                paginatedUsers.forEach(userObj => {
                    const { username, pk, fullName, isCloseFriend } = userObj;
                    const isChecked = selectedUsers.has(username);
                    const photoUrl = resolveUserPhoto(username, userObj.photoUrl);
                    if (photoUrl !== userObj.photoUrl && photoUrl !== DEFAULT_AVATAR) {
                        userObj.photoUrl = photoUrl;
                    }

                    tableHtml += `
                        <tr style="border-bottom: 1px solid #dbdbdb;" data-username="${username}">
                            <td style="padding: 8px;"><input type="checkbox" class="cf-user-checkbox" data-username="${username}" style="cursor: pointer;" ${isChecked ? 'checked' : ''}></td>
                            <td style="padding: 8px; display: flex; align-items: center; gap: 10px;">
                                <img src="${photoUrl || DEFAULT_AVATAR}" crossorigin="anonymous" loading="lazy" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" alt="${username}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid #eee; flex-shrink: 0;">
                                <div style="display: flex; flex-direction: column;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <a href="https://www.instagram.com/${username}" target="_blank" style="text-decoration: none; color: inherit; font-weight: 600;">${username}</a>
                                    </div>
                                    ${fullName ? `<span style="font-size: 12px; color: #666;">${fullName}</span>` : ''}
                                </div>
                            </td>
                            <td style="text-align: center; padding: 8px; font-family: monospace; font-size: 12px; color: #555;">${pk || '-'}</td>
                            <td style="text-align: center; padding: 8px;">
                                ${isCloseFriend
                            ? `<span style="background: #e8f8f0; color: #0f7b4b !important; border: 1px solid #a3e6cd; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">⭐ Amigo Próximo</span>`
                            : `<span style="background: #f1f3f5; color: #495057 !important; border: 1px solid #dee2e6; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">👤 Seguindo</span>`
                        }
                            </td>
                            <td style="text-align: center; padding: 8px;">
                                ${isCloseFriend
                            ? `<button class="btn-action-cf" data-username="${username}" data-uid="${pk}" data-action="remove" style="background: #e74c3c; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">❌ Remover</button>`
                            : `<button class="btn-action-cf" data-username="${username}" data-uid="${pk}" data-action="add" style="background: #2ecc71; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">⭐ Adicionar</button>`
                        }
                            </td>
                        </tr>
                    `;
                });
            }

            tableHtml += `</tbody></table>`;

            let paginationHtml = `<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 15px;">`;
            if (page > 1) paginationHtml += `<button id="prevCfPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Anterior</button>`;
            paginationHtml += `<span style="font-size: 13px; font-weight: 600;">Página ${page} de ${totalPages}</span>`;
            if (page < totalPages) paginationHtml += `<button id="nextCfPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Próximo</button>`;
            paginationHtml += `</div>`;

            container.innerHTML = tableHtml + paginationHtml;

            // Busca assíncrona on-demand para preencher fotos que faltarem na página exibida
            const missingOnPage = paginatedUsers.filter(u => !u.photoUrl || u.photoUrl === DEFAULT_AVATAR);
            if (missingOnPage.length > 0) {
                (async () => {
                    for (const mUser of missingOnPage) {
                        try {
                            const clean = mUser.username.toLowerCase();
                            let pic = null;
                            let fullName = null;
                            let pk = mUser.pk;

                            // 1. Tenta GraphQL se já tiver o PK
                            if (pk && typeof window.executeGraphqlUserHoverCard === 'function') {
                                const stats = await window.executeGraphqlUserHoverCard(pk);
                                if (stats?.profilePicUrl) {
                                    pic = stats.profilePicUrl;
                                    fullName = stats.fullName;
                                }
                            }

                            // 2. Fallback de cache do dbHelper
                            if (!pic && dbHelper?._cache?.followers) {
                                const f = dbHelper._cache.followers.find(x => (typeof x === 'string' ? x : x?.username || '').toLowerCase() === clean);
                                if (f && f.photoUrl && f.photoUrl !== DEFAULT_AVATAR) pic = f.photoUrl;
                            }

                            if (pic) {
                                mUser.photoUrl = pic;
                                if (pk) mUser.pk = String(pk);
                                if (fullName && !mUser.fullName) mUser.fullName = fullName;

                                const rowEl = container.querySelector(`tr[data-username="${mUser.username}"]`);
                                if (rowEl) {
                                    const imgEl = rowEl.querySelector('img');
                                    if (imgEl) imgEl.src = pic;
                                    if (fullName) {
                                        const nameEl = rowEl.querySelector('span[style*="font-size: 12px"]');
                                        if (nameEl) nameEl.innerText = fullName;
                                    }
                                    if (pk) {
                                        const pkEl = rowEl.querySelectorAll('td')[2];
                                        if (pkEl && pkEl.innerText === '-') pkEl.innerText = String(pk);
                                    }
                                }

                                if (typeof window.cachedData !== 'undefined' && window.cachedData?.userDetails) {
                                    window.cachedData.userDetails.set(clean, { username: mUser.username, photoUrl: pic, id: pk, fullName: mUser.fullName });
                                }
                            }
                        } catch (_) { }
                        await new Promise(r => setTimeout(r, 150));
                    }
                })();
            }

            // Checkbox individual listeners
            container.querySelectorAll('.cf-user-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const uname = e.target.dataset.username;
                    if (e.target.checked) selectedUsers.add(uname);
                    else selectedUsers.delete(uname);
                    updateCounts(paginatedUsers);
                });
            });

            // Select all checkbox listener
            const selectAllCb = document.getElementById('selectAllCfCheckbox');
            if (selectAllCb) {
                selectAllCb.checked = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u.username));
                selectAllCb.onchange = (e) => {
                    const isChecked = e.target.checked;
                    paginatedUsers.forEach(u => {
                        if (isChecked) selectedUsers.add(u.username);
                        else selectedUsers.delete(u.username);
                    });
                    container.querySelectorAll('.cf-user-checkbox').forEach(cb => cb.checked = isChecked);
                    updateCounts(paginatedUsers);
                };
            }

            // Sorting listeners
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

            // Pagination button listeners
            const prevBtn = document.getElementById('prevCfPageBtn');
            if (prevBtn) prevBtn.onclick = () => renderList(currentPage - 1);
            const nextBtn = document.getElementById('nextCfPageBtn');
            if (nextBtn) nextBtn.onclick = () => renderList(currentPage + 1);

            // Botão individual Adicionar / Remover (1 clique via Polaris GraphQL)
            container.querySelectorAll('.btn-action-cf').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetBtn = e.currentTarget;
                    const uname = targetBtn.dataset.username;
                    const action = targetBtn.dataset.action; // 'add' ou 'remove'
                    let uid = targetBtn.dataset.uid || (typeof window.getCachedUserId === 'function' ? window.getCachedUserId(uname) : '');

                    targetBtn.disabled = true;
                    targetBtn.textContent = 'Salvando...';

                    if (!uid && typeof window.getUserId === 'function') {
                        uid = await window.getUserId(uname);
                    }

                    if (!uid) {
                        showNotification(`⚠️ Não foi possível obter o ID de @${uname}`);
                        targetBtn.disabled = false;
                        targetBtn.textContent = action === 'add' ? '⭐ Adicionar' : '❌ Remover';
                        return;
                    }

                    const adds = action === 'add' ? [String(uid)] : [];
                    const removes = action === 'remove' ? [String(uid)] : [];

                    try {
                        const res = await executeGraphqlSetBesties(adds, removes);
                        if (res && res.success) {
                            const userObj = closeFriendsList.find(u => u.username.toLowerCase() === uname.toLowerCase());
                            if (userObj) {
                                userObj.isCloseFriend = action === 'add';
                            }

                            if (!userListCache.closeFriends) userListCache.closeFriends = new Set();
                            if (action === 'add') {
                                userListCache.closeFriends.add(uname);
                                showNotification(`⭐ @${uname} adicionado aos Amigos Próximos!`);
                            } else {
                                userListCache.closeFriends.delete(uname);
                                showNotification(`❌ @${uname} removido dos Amigos Próximos.`);
                            }

                            cachedCloseFriends = closeFriendsList;
                            try {
                                localStorage.setItem('ig_tools_cached_close_friends', JSON.stringify(closeFriendsList));
                                if (dbHelper && typeof dbHelper.saveCache === 'function') {
                                    await dbHelper.saveCache('closeFriends', closeFriendsList.filter(u => u.isCloseFriend));
                                }
                            } catch (_) { }

                            renderList(currentPage);
                            updateCounts();
                        } else {
                            showNotification(`Erro ao atualizar @${uname}`);
                            targetBtn.disabled = false;
                            targetBtn.textContent = action === 'add' ? '⭐ Adicionar' : '❌ Remover';
                        }
                    } catch (err) {
                        console.error('[IG Tools Close Friends] Erro:', err);
                        showNotification(`Erro ao comunicar com o Instagram.`);
                        targetBtn.disabled = false;
                        targetBtn.textContent = action === 'add' ? '⭐ Adicionar' : '❌ Remover';
                    }
                });
            });
        };

        // Sincronização avançada: se estiver na tela de melhores amigos, faz scroll; se não, tenta SSR/DOM e navega se solicitado
        async function sincronizarCloseFriends(forceScroll = false) {
            const refreshBtn = document.getElementById("cfRefreshBtn");
            try {
                if (refreshBtn) {
                    refreshBtn.disabled = true;
                    refreshBtn.textContent = "🔄 Mapeando...";
                }

                let extractedUsers = [];
                const isOnCloseFriendsPage = window.location.pathname.includes('/accounts/close_friends/');

                if (forceScroll || isOnCloseFriendsPage) {
                    if (!isOnCloseFriendsPage) {
                        history.pushState(null, null, '/accounts/close_friends/');
                        window.dispatchEvent(new Event('popstate'));
                        await new Promise(r => setTimeout(r, 1200));
                    }
                    extractedUsers = await extractCloseFriendsUsernames();
                } else {
                    extractedUsers = await extractCloseFriendsFromCurrentDomOrFetch();
                }

                // Carrega lista de Seguindo para compor a opção "Quem Eu Sigo"
                let followingAccounts = [];
                try {
                    if (dbHelper && typeof dbHelper.loadCache === 'function') {
                        const dbFollowing = await dbHelper.loadCache('following');
                        if (dbFollowing) {
                            if (Array.isArray(dbFollowing)) followingAccounts = dbFollowing;
                            else if (dbFollowing.details instanceof Map) followingAccounts = Array.from(dbFollowing.details.values());
                            else if (dbFollowing instanceof Set) followingAccounts = Array.from(dbFollowing).map(u => ({ username: u }));
                        }
                    }
                } catch (_) { }

                if (followingAccounts.length === 0 && dbHelper?._cache?.following && Array.isArray(dbHelper._cache.following)) {
                    followingAccounts = dbHelper._cache.following;
                }

                if (followingAccounts.length === 0 && typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList) && window.seguindoList.length > 0) {
                    followingAccounts = window.seguindoList;
                }

                const map = new Map();

                // Insere os já mapeados no cache atual
                closeFriendsList.forEach(u => {
                    const k = u.username.toLowerCase();
                    const p = resolveUserPhoto(u.username, u.photoUrl);
                    map.set(k, { ...u, photoUrl: p });
                });

                // Atualiza com dados extraídos
                if (Array.isArray(extractedUsers) && extractedUsers.length > 0) {
                    extractedUsers.forEach(u => {
                        const k = u.username.toLowerCase();
                        const existing = map.get(k);
                        const p = resolveUserPhoto(u.username, u.photoUrl);
                        if (existing) {
                            if (u.isCloseFriend) existing.isCloseFriend = true;
                            if (u.pk) existing.pk = u.pk;
                            if (p && p !== DEFAULT_AVATAR) existing.photoUrl = p;
                            if (u.fullName && !existing.fullName) existing.fullName = u.fullName;
                        } else {
                            const pk = u.pk || (typeof window.getCachedUserId === 'function' ? window.getCachedUserId(u.username) : '') || '';
                            map.set(k, {
                                username: u.username,
                                pk: pk,
                                id: pk,
                                fullName: u.fullName || '',
                                photoUrl: p || DEFAULT_AVATAR,
                                isCloseFriend: !!u.isCloseFriend
                            });
                        }
                        if (u.pk && typeof window.setCachedUserId === 'function') window.setCachedUserId(u.username, u.pk);
                    });
                }

                // Insere quem o usuário segue
                followingAccounts.forEach(f => {
                    const uname = typeof f === 'string' ? f : f.username;
                    if (!uname) return;
                    const k = uname.toLowerCase();
                    const p = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
                    const existing = map.get(k);
                    if (existing) {
                        if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p && p !== DEFAULT_AVATAR) {
                            existing.photoUrl = p;
                        }
                        if (!existing.fullName && typeof f === 'object' && f.fullName) {
                            existing.fullName = f.fullName;
                        }
                        if (!existing.pk && typeof f === 'object' && (f.pk || f.id)) {
                            existing.pk = String(f.pk || f.id);
                        }
                    } else {
                        const pk = (typeof f === 'object' && (f.pk || f.id)) ? String(f.pk || f.id) : ((typeof window.getCachedUserId === 'function' ? window.getCachedUserId(uname) : '') || '');
                        map.set(k, {
                            username: uname,
                            pk: pk,
                            id: pk,
                            fullName: (typeof f === 'object' && f.fullName) ? f.fullName : '',
                            photoUrl: p || DEFAULT_AVATAR,
                            isCloseFriend: false
                        });
                    }
                });

                closeFriendsList = Array.from(map.values());
                cachedCloseFriends = closeFriendsList;

                try {
                    localStorage.setItem('ig_tools_cached_close_friends', JSON.stringify(closeFriendsList));
                    const bestiesOnly = closeFriendsList.filter(u => u.isCloseFriend);
                    if (dbHelper && typeof dbHelper.saveCache === 'function') {
                        await dbHelper.saveCache('closeFriends', bestiesOnly);
                    }
                    userListCache.closeFriends = new Set(bestiesOnly.map(u => u.username));
                } catch (_) { }

                renderList(currentPage);
                updateCounts();

                const bestiesCount = closeFriendsList.filter(u => u.isCloseFriend).length;
                showNotification(`Sincronizado! ${bestiesCount} melhores amigos mapeados.`);
            } catch (err) {
                console.error('[IG Tools Close Friends] Erro na sincronização:', err);
                showNotification('Erro ao sincronizar amigos próximos.');
            } finally {
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = "🔄 Sincronizar";
                }
            }
        }

        // Renderização imediata (0ms)
        renderList(1);
        updateCounts();

        // Se não tiver nenhum amigo próximo em cache, tenta sincronizar instantaneamente via DOM/SSR
        if (cfCount === 0) {
            sincronizarCloseFriends(false);
        }

        // Header Controls
        document.getElementById("cfFecharBtn").onclick = () => {
            div.remove();
            modalAbertoCloseFriends = false;
        };

        document.getElementById("cfMinimizarBtn").onclick = () => {
            const modal = document.getElementById('closeFriendsModal');
            if (!modal) return;
            const bodyEl = document.getElementById("cfModalBody");
            const btn = document.getElementById('cfMinimizarBtn');
            const isMinimized = modal.dataset.minimized === 'true';

            if (bodyEl) bodyEl.style.display = isMinimized ? 'block' : 'none';
            modal.dataset.minimized = isMinimized ? 'false' : 'true';
            modal.style.height = isMinimized ? '' : 'auto';
            modal.style.maxHeight = isMinimized ? '90vh' : 'none';
            modal.style.width = isMinimized ? '90%' : 'auto';
            modal.style.minWidth = isMinimized ? '' : '380px';
            modal.style.maxWidth = isMinimized ? '820px' : '440px';
            modal.style.padding = isMinimized ? '20px' : '12px 18px';
            btn.textContent = isMinimized ? '_' : '⬜';
            btn.title = isMinimized ? 'Minimizar' : 'Maximizar';
        };

        document.getElementById("cfRefreshBtn").onclick = () => {
            sincronizarCloseFriends(true);
        };

        // IMPORTAÇÃO OFICIAL VIA ARQUIVO JSON DO INSTAGRAM (0ms)
        const jsonFileInput = document.getElementById("cfJsonFileInput");
        document.getElementById("cfImportJsonBtn").onclick = () => {
            jsonFileInput.click();
        };

        jsonFileInput.addEventListener("change", async (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const json = JSON.parse(text);
                const importedUsernames = new Set();

                // Suporta formatos de exportação de dados do Instagram:
                if (Array.isArray(json.relationships_close_friends)) {
                    json.relationships_close_friends.forEach(item => {
                        if (Array.isArray(item.string_list_data)) {
                            item.string_list_data.forEach(entry => {
                                if (entry.value) importedUsernames.add(entry.value.trim());
                            });
                        }
                    });
                }
                else if (Array.isArray(json)) {
                    json.forEach(entry => {
                        if (typeof entry === 'string') importedUsernames.add(entry.trim());
                        else if (entry && entry.value) importedUsernames.add(entry.value.trim());
                        else if (entry && entry.username) importedUsernames.add(entry.username.trim());
                    });
                }
                else if (Array.isArray(json.close_friends)) {
                    json.close_friends.forEach(entry => {
                        if (typeof entry === 'string') importedUsernames.add(entry.trim());
                        else if (entry && entry.value) importedUsernames.add(entry.value.trim());
                        else if (entry && entry.username) importedUsernames.add(entry.username.trim());
                        else if (entry && Array.isArray(entry.string_list_data)) {
                            entry.string_list_data.forEach(sub => {
                                if (sub && sub.value) importedUsernames.add(sub.value.trim());
                            });
                        }
                    });
                }

                if (importedUsernames.size === 0) {
                    alert("Nenhum usuário de Amigos Próximos foi identificado no arquivo JSON selecionado. Certifique-se de selecionar o arquivo 'close_friends.json' baixado do Instagram.");
                    return;
                }

                const map = new Map();
                closeFriendsList.forEach(u => map.set(u.username.toLowerCase(), u));

                importedUsernames.forEach(uname => {
                    const k = uname.toLowerCase();
                    if (map.has(k)) {
                        map.get(k).isCloseFriend = true;
                    } else {
                        const pk = typeof window.getCachedUserId === 'function' ? (window.getCachedUserId(uname) || '') : '';
                        map.set(k, {
                            username: uname,
                            pk: pk,
                            id: pk,
                            fullName: '',
                            photoUrl: DEFAULT_AVATAR,
                            isCloseFriend: true
                        });
                    }
                });

                closeFriendsList = Array.from(map.values());
                cachedCloseFriends = closeFriendsList;

                try {
                    localStorage.setItem('ig_tools_cached_close_friends', JSON.stringify(closeFriendsList));
                    const bestiesOnly = closeFriendsList.filter(u => u.isCloseFriend);
                    if (dbHelper && typeof dbHelper.saveCache === 'function') {
                        await dbHelper.saveCache('closeFriends', bestiesOnly);
                    }
                    userListCache.closeFriends = new Set(bestiesOnly.map(u => u.username));
                } catch (_) { }

                renderList(1);
                updateCounts();
                alert(`Sucesso! ${importedUsernames.size} amigos próximos foram importados instantaneamente do JSON.`);
            } catch (err) {
                console.error("[IG Tools Close Friends] Erro ao ler JSON:", err);
                alert("Falha ao analisar o arquivo JSON: " + err.message);
            } finally {
                jsonFileInput.value = '';
            }
        });

        document.getElementById("cfSelectPageBtn").onclick = () => {
            const itemsPerPage = getSettings().itemsPerPage || 10;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const filterValue = document.getElementById('cfFilterSelect')?.value || 'besties';
            let listToSelect = closeFriendsList;
            if (filterValue === 'besties') listToSelect = listToSelect.filter(u => u.isCloseFriend);
            else if (filterValue === 'following') listToSelect = listToSelect.filter(u => !u.isCloseFriend);

            const pageUsers = listToSelect.slice(startIndex, startIndex + itemsPerPage);
            pageUsers.forEach(u => selectedUsers.add(u.username));
            container.querySelectorAll('.cf-user-checkbox').forEach(cb => cb.checked = true);
            updateCounts(pageUsers);
        };

        document.getElementById("cfDeselectAllBtn").onclick = () => {
            selectedUsers.clear();
            container.querySelectorAll('.cf-user-checkbox').forEach(cb => cb.checked = false);
            updateCounts();
        };

        const searchInput = document.getElementById("cfSearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", () => renderList(1));
        }

        const filterSelect = document.getElementById("cfFilterSelect");
        if (filterSelect) {
            filterSelect.addEventListener("change", () => renderList(1));
        }

        const apiToggle = document.getElementById("cfUseApiToggle");
        if (apiToggle) {
            apiToggle.addEventListener("change", (e) => {
                setSettings({ useApi: e.target.checked });
                showNotification(`Modo API ${e.target.checked ? 'ativado' : 'desativado'}.`);
            });
        }

        // AÇÃO EM LOTE: Adicionar Selecionados
        document.getElementById("cfAddSelectedBtn").onclick = async () => {
            if (selectedUsers.size === 0) {
                alert("Nenhum usuário selecionado.");
                return;
            }

            const usersToAdd = Array.from(selectedUsers).filter(uname => {
                const u = closeFriendsList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                return u && !u.isCloseFriend;
            });

            if (usersToAdd.length === 0) {
                alert("Todos os usuários selecionados já estão na sua lista de Amigos Próximos.");
                return;
            }

            if (!confirm(`Deseja adicionar ${usersToAdd.length} usuário(s) aos seus Amigos Próximos?`)) return;

            const addBtn = document.getElementById("cfAddSelectedBtn");
            addBtn.disabled = true;
            addBtn.textContent = "Adicionando...";
            toggleLoading(true, 0, "Obtendo IDs e adicionando...");

            const uids = [];
            for (const uname of usersToAdd) {
                let uid = typeof window.getCachedUserId === 'function' ? window.getCachedUserId(uname) : '';
                if (!uid) {
                    const u = closeFriendsList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                    if (u && u.pk) uid = u.pk;
                }
                if (!uid && typeof window.getUserId === 'function') uid = await window.getUserId(uname);
                if (uid) uids.push(String(uid));
            }

            try {
                const res = await executeGraphqlSetBesties(uids, []);
                toggleLoading(false);
                addBtn.disabled = false;
                addBtn.textContent = "⭐ Adicionar Selecionados";

                if (res && res.success) {
                    usersToAdd.forEach(uname => {
                        const u = closeFriendsList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                        if (u) u.isCloseFriend = true;
                        if (userListCache.closeFriends) userListCache.closeFriends.add(uname);
                    });

                    cachedCloseFriends = closeFriendsList;
                    try {
                        localStorage.setItem('ig_tools_cached_close_friends', JSON.stringify(closeFriendsList));
                        if (dbHelper && typeof dbHelper.saveCache === 'function') {
                            await dbHelper.saveCache('closeFriends', closeFriendsList.filter(u => u.isCloseFriend));
                        }
                    } catch (_) { }

                    selectedUsers.clear();
                    renderList(currentPage);
                    updateCounts();
                    alert(`Sucesso! ${usersToAdd.length} usuário(s) foram adicionados aos Amigos Próximos.`);
                } else {
                    alert("Ocorreu uma falha ao adicionar os usuários via GraphQL.");
                }
            } catch (err) {
                toggleLoading(false);
                addBtn.disabled = false;
                addBtn.textContent = "⭐ Adicionar Selecionados";
                alert("Erro ao adicionar: " + err.message);
            }
        };

        // AÇÃO EM LOTE: Remover Selecionados
        document.getElementById("cfRemoveSelectedBtn").onclick = async () => {
            if (selectedUsers.size === 0) {
                alert("Nenhum usuário selecionado.");
                return;
            }

            const usersToRemove = Array.from(selectedUsers).filter(uname => {
                const u = closeFriendsList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                return u && u.isCloseFriend;
            });

            if (usersToRemove.length === 0) {
                alert("Nenhum dos usuários selecionados está na sua lista de Amigos Próximos.");
                return;
            }

            if (!confirm(`Deseja remover ${usersToRemove.length} usuário(s) dos Amigos Próximos?`)) return;

            const removeBtn = document.getElementById("cfRemoveSelectedBtn");
            removeBtn.disabled = true;
            removeBtn.textContent = "Removendo...";
            toggleLoading(true, 0, "Obtendo IDs e removendo...");

            const uids = [];
            for (const uname of usersToRemove) {
                let uid = typeof window.getCachedUserId === 'function' ? window.getCachedUserId(uname) : '';
                if (!uid) {
                    const u = closeFriendsList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                    if (u && u.pk) uid = u.pk;
                }
                if (!uid && typeof window.getUserId === 'function') uid = await window.getUserId(uname);
                if (uid) uids.push(String(uid));
            }

            try {
                const res = await executeGraphqlSetBesties([], uids);
                toggleLoading(false);
                removeBtn.disabled = false;
                removeBtn.textContent = "❌ Remover Selecionados";

                if (res && res.success) {
                    usersToRemove.forEach(uname => {
                        const u = closeFriendsList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                        if (u) u.isCloseFriend = false;
                        if (userListCache.closeFriends) userListCache.closeFriends.delete(uname);
                    });

                    cachedCloseFriends = closeFriendsList;
                    try {
                        localStorage.setItem('ig_tools_cached_close_friends', JSON.stringify(closeFriendsList));
                        if (dbHelper && typeof dbHelper.saveCache === 'function') {
                            await dbHelper.saveCache('closeFriends', closeFriendsList.filter(u => u.isCloseFriend));
                        }
                    } catch (_) { }

                    selectedUsers.clear();
                    renderList(currentPage);
                    updateCounts();
                    alert(`Sucesso! ${usersToRemove.length} usuário(s) foram removidos dos Amigos Próximos.`);
                } else {
                    alert("Ocorreu uma falha ao remover os usuários via GraphQL.");
                }
            } catch (err) {
                toggleLoading(false);
                removeBtn.disabled = false;
                removeBtn.textContent = "❌ Remover Selecionados";
                alert("Erro ao remover: " + err.message);
            }
        };
    }

    // Exportação para o barramento oficial e aliases globais
    window.IGTools.CloseFriends = {
        extractCloseFriendsUsernames,
        extractCloseFriendsFromCurrentDomOrFetch,
        abrirModalAmigosProximos,
        executeGraphqlSetBesties,
        getCachedCloseFriends: () => cachedCloseFriends,
        setCachedCloseFriends: (list) => { cachedCloseFriends = list; }
    };

    window.extractCloseFriendsUsernames = extractCloseFriendsUsernames;
    window.extractCloseFriendsFromCurrentDomOrFetch = extractCloseFriendsFromCurrentDomOrFetch;
    window.abrirModalAmigosProximos = abrirModalAmigosProximos;
    window.executeGraphqlSetBesties = executeGraphqlSetBesties;

    console.log('[IG Tools] Módulo 6 (Amigos Próximos / Close Friends) carregado com sucesso.');
})();
