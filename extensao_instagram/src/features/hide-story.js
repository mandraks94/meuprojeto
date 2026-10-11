// src/features/hide-story.js - Módulo de Gerenciamento de Ocultar Stories (WBloks / DOM 0ms)
window.IGTools = window.IGTools || {};

(function () {
    'use strict';

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
    const dbHelper = window.IGTools?.Storage?.dbHelper || window.dbHelper || {};
    const isValidInstagramUsername = (u) => (typeof window.isValidInstagramUsername === 'function' ? window.isValidInstagramUsername(u) : true);
    const makeDraggable = (el) => (typeof window.makeDraggable === 'function' ? window.makeDraggable(el) : null);
    const DEFAULT_AVATAR = window.DEFAULT_AVATAR || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.37-2.57 5.05-2.57s5.02.91 5.05 2.57C15.8 19.15 14.03 20 12 20z'/%3E%3C/svg%3E";
    const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;

    const parseHideStoryBloksText = (text) => (typeof window.parseHideStoryBloksText === 'function' ? window.parseHideStoryBloksText(text) : []);
    
    // Execução de WBloks Ocultar/Reexibir Story com fallback resiliente
    async function executeWbloksHideStory(uid, username, action = 'hide') {
        if (typeof window.executeWbloksHideStory === 'function') {
            return await window.executeWbloksHideStory(uid, username, action);
        }
        if (!uid) return { success: false, error: 'no_uid' };

        const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
        const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
        const jazoest = computeJazoest(fbDtsg) || '26321';
        const spin = getSpinParams();
        const shouldUnhide = action === 'unhide';

        const params = {
            user_id: Number(uid) || uid,
            username: username,
            should_unhide: shouldUnhide
        };

        const url = 'https://www.instagram.com/async/wbloks/fetch/?appid=com.instagram.portable_settings.privacy.hide_story_from_screen.hide_story_from&type=action&__bkv=62077fc559de123afe03ebeb18194a88ba5d4e6874d9a07873752f3792adb8a0';

        const dyn = getInstagramFormToken('__dyn') || '7xeUjG1mxu1syaxG4Vp41twpUnwgU7SbzEdF8vyUco2qwJyEiw50x609vCwjE1EEc87m0yE462mcw5Mx62G5UswoEcE7O2l0Fwqo5W1yw9O1lwxwQzXwae4UaEW2G0AEco5G0zK5o4q0HU1wEbUGdwtUeo9UaQ0Lo6-bwHwKG6Ufk0zU8oC1IwjUpwlAcwBwUQp1yU426V8aUuwm8jxK1mwa6bBK4o16UeUGq2Kq11whE984O0XEdoCQ1jw';
        const csr = getInstagramFormToken('__csr') || 'iMB0FNX5N22j9eUHPWl8iGkV-eGXT8G5OPdP8VIzehP8KBh9pV9cNGWnip9Wh4BGfld8Dif4W4au9Irs8F4l9JbhAF4gJ7l95AFagBBBAkDiq9uVdppZDJykAch9QvAKiXjAV4HgzDBoLaaGh3Q68K9zGzay9pUC8yEj-dyWxe9zEGK9zXBzWzWyuQmbyWxaZ3KFEgxjhj1ycBzk5uVoGdgK8Ax3AAHV8K5GgG22maG1UUK1sweq7okw5ww08Ha00Y8EcU0vn2UKkMoQ18xgE0h1opw6yCtw2TU0hyS0Koqguw8Z0BwiUdK0qW5Eo6jw4dU3HwbWq3G8wTg1iV2By84iUy8guGywqodE2YrRrw1s2i1lG5o06KC02qu2K9g6rw0E5weS0fcw';
        const hsdp = getInstagramFormToken('__hsdp') || 'gjMb_j1GkkCPcx4Pn9lEHV2NOEO99KXjQ3pyigsojx5AqI9xeGG48qx222boGwm9cwnoAV4A-FUK19gZ91G8woHuSHG4u7dChF4mmQ4B8fCK68G2GUC9wzz84e11wywkqwHxS3u6Ed98S19wDxedwm8qwk8szofoKU28wJwok32361dyUO0j-0pC2O0cPwpE0B20YEnwtE0mCw5Ywa20zi08-5o0Guew5fxvw2GA0gW09Iwww5GwmU887K0kO0BVk7nu';
        const hblp = getInstagramFormToken('__hblp') || '0CG7E5u10wxzEb9bK9wAxedy69G1lwFBGm5ECiCiqim8K8yEyi2W5GAHyXEyjRwrAAq4Vk1ACg-eHxa9VbhFbGmUW4oyqWxny8hxeiCmECqUObz9ohwEGbxPx7Gmqmm9wkqz8hz8twTy-cgO4UiAzoiwSwDxedxam3-UmwYxe59US2u5kaK2K1czQ2O1tig8ES363CubCAz81fU7uiaw4hwIw8a1Lwt82zwGxS2W1Lw_wpE4e0N89U17U3Oxu1Sw2Yo0Hi5o2bwOwau1ewJwzwm8O2swuJ4wkU7u0HE1GoW0NE28xvwRxvw24o4x04ew5twah0q88awvU3xBwDwPwwyU6-0w85K1sxa8x_wr9k7nu';
        const sjsp = getInstagramFormToken('__sjsp') || getInstagramFormToken('_sjsp') || 'gjMbXj2k4hhiragx4PmpmyLAb7az8ACXKjgdES8UA4M9S9wFwQx2226a1oswnoB4AijWwrAA6E2QS4Qfg5u2GUjwzw6cwl8';
        const sParam = getInstagramFormToken('__s') || 'z3nm3y:imx696:n7ke1q';
        const hsi = getInstagramFormToken('__hsi') || '7689958851794881797';
        const hs = getInstagramFormToken('__hs') || '20722.HYP:instagram_web_pkg.2.1...0';

        const body = new URLSearchParams({
            __d: 'www',
            __user: '0',
            __a: '1',
            __req: '24',
            __hs: hs,
            dpr: '2',
            __ccg: 'EXCELLENT',
            __rev: spin.spin_r || '1048569652',
            __s: sParam,
            __hsi: hsi,
            __dyn: dyn,
            __csr: csr,
            __hsdp: hsdp,
            __hblp: hblp,
            __sjsp: sjsp,
            _sjsp: sjsp,
            __comet_req: '7',
            server_timestamps: 'true',
            __spin_r: spin.spin_r || '1048569652',
            __spin_b: spin.spin_b || 'trunk',
            __spin_t: spin.spin_t || String(Math.floor(Date.now() / 1000)),
            __crn: 'comet.igweb.PolarisSettingsHideStoryAndLiveFromRoute',
            params: JSON.stringify(params)
        });

        if (fbDtsg) body.append('fb_dtsg', fbDtsg);
        if (jazoest) body.append('jazoest', jazoest);
        if (lsd) body.append('lsd', lsd);

        const headers = {
            ...getApiHeaders(true),
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'X-FB-LSD': lsd
        };

        try {
            const response = await fetch(url, {
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
                        if (parsed?.data || parsed?.layout || parsed?.errors) {
                            data = parsed;
                            break;
                        }
                    } catch (_) { }
                }
            }

            const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0;
            return { response, success: response.ok && !hasErrors, data, rawText };
        } catch (err) {
            console.error('[IG Tools HideStory] Erro Wbloks:', err);
            return { success: false, error: err };
        }
    }

    // --- CACHES E ESTADO DO MÓDULO ---
    let cachedHideStory = [];
    try {
        const saved = localStorage.getItem('ig_tools_cached_hide_story');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) cachedHideStory = parsed;
        }
    } catch (_) { }

    let modalAbertoStory = false;

    // Helper para varredura robusta do DOM nativo de Ocultar Story
    function scanHideStoryDomRows(targetDoc = document) {
        const myUname = (getLoggedInUsername() || '').toLowerCase().trim();
        const myUid = getCookie('ds_user_id') || getActorId() || '';
        const foundUsers = new Map();
        const rowElements = new Set();

        // 1. Busca por candidatos a linha a partir dos avatares nativos da página (IGNORANDO qualquer modal da extensão)
        const avatarImgs = Array.from(targetDoc.querySelectorAll('img')).filter(img => {
            if (img.closest('.submenu-modal') || img.closest('#hideStoryModal') || img.closest('#closeFriendsModal')) return false;
            const s = img.src || '';
            return (s.includes('cdninstagram.com') || s.includes('fbcdn.net') || s.includes('/v/t51') || s.includes('/s150x150')) &&
                !s.includes('rsrc.php') && !s.includes('static.xx');
        });

        avatarImgs.forEach(img => {
            let el = img;
            let candidateRow = null;
            for (let d = 0; d < 8; d++) {
                if (!el.parentElement || el.parentElement === targetDoc.body || el.parentElement.tagName === 'BODY') break;
                el = el.parentElement;
                if (el.querySelectorAll('img').length > 2) break; // Passou do contêiner da linha individual

                const hasUsernameOrText = el.innerText && el.innerText.trim().length > 1;
                const hasControl = el.querySelector(`
                    [style*="circle-check"],
                    [style*="circle"],
                    [style*="rgb(0, 149, 246)"],
                    [style*="0, 149, 246"],
                    [style*="rgb(74, 93, 249)"],
                    [style*="74, 93, 249"],
                    [style*="#0095f6"],
                    [style*="mask-image"],
                    div[role="checkbox"],
                    div[role="button"],
                    [class*="circle-check"],
                    input[type="checkbox"],
                    svg[aria-label*="Check" i],
                    svg[aria-label*="check" i]
                `);

                if (hasUsernameOrText && hasControl) {
                    candidateRow = el;
                }
            }
            if (candidateRow) rowElements.add(candidateRow);
        });

        // 2. Busca direta a partir de QUALQUER controle, ícone de check ou botão na página nativa
        const checkboxCandidates = Array.from(targetDoc.querySelectorAll(`
            [style*="circle-check"],
            [style*="circle__"],
            [style*="rgb(0, 149, 246)"],
            [style*="0, 149, 246"],
            [style*="rgb(74, 93, 249)"],
            [style*="74, 93, 249"],
            [style*="#0095f6"],
            div[role="checkbox"],
            input[type="checkbox"],
            div[aria-label*="caixa de seleção" i],
            div[aria-label*="selecion" i],
            div[aria-label*="desmarcar" i],
            div[aria-label*="checked" i],
            div[role="button"][tabindex="0"],
            svg[aria-label*="Check" i],
            svg[aria-label*="check" i],
            svg[aria-label*="marcar" i],
            svg[aria-label*="desmarcar" i],
            [class*="circle-check"]
        `)).filter(el => !el.closest('.submenu-modal') && !el.closest('#hideStoryModal') && !el.closest('#closeFriendsModal'));

        checkboxCandidates.forEach(cb => {
            let p = cb;
            for (let d = 0; d < 7; d++) {
                if (!p.parentElement || p.parentElement === targetDoc.body || p.parentElement.tagName === 'BODY') break;
                p = p.parentElement;
                if (p.querySelectorAll('img').length > 2) break;
                if (p.querySelector('img') && (p.innerText && p.innerText.trim().length > 1)) {
                    rowElements.add(p);
                    break;
                }
            }
        });

        // 3. Processa cada linha encontrada e determina se o story está ocultado
        rowElements.forEach(row => {
            if (row.closest('.submenu-modal') || row.closest('#hideStoryModal') || row.closest('#closeFriendsModal')) return;

            // Extração do username
            let uname = '';
            const link = row.querySelector('a[href^="/"]');
            if (link) {
                const cand = link.getAttribute('href').replace(/\//g, '').trim();
                if (isValidInstagramUsername(cand) && cand.toLowerCase() !== myUname && cand !== 'accounts' && cand !== 'explore') {
                    uname = cand;
                }
            }
            if (!uname) {
                const textNodes = Array.from(row.querySelectorAll('span, div')).filter(el => el.children.length === 0 && el.innerText && el.innerText.trim());
                for (const tn of textNodes) {
                    const cand = tn.innerText.trim().replace(/^@/, '');
                    if (cand && isValidInstagramUsername(cand) && cand.toLowerCase() !== myUname && cand !== 'Ver perfil' && cand !== 'accounts' && cand !== 'explore') {
                        uname = cand;
                        break;
                    }
                }
            }
            if (!uname && row.innerText) {
                const lines = row.innerText.trim().split('\n').map(l => l.trim().replace(/^@/, ''));
                for (const line of lines) {
                    if (line && isValidInstagramUsername(line) && line.toLowerCase() !== myUname && line !== 'Ver perfil' && line !== 'accounts') {
                        uname = line;
                        break;
                    }
                }
            }

            if (!uname || !isValidInstagramUsername(uname) || uname.toLowerCase() === myUname) return;

            // Nome completo
            let fullName = '';
            if (row.innerText) {
                const lines = row.innerText.trim().split('\n').map(l => l.trim());
                const other = lines.filter(l => l.replace(/^@/, '') !== uname && l !== 'Ver perfil' && !l.includes('Seguir') && l.length > 0);
                if (other.length > 0) fullName = other[0];
            }

            // Avatar
            const img = row.querySelector('img');
            const rawPhoto = img ? img.src : '';
            const photoUrl = (rawPhoto && !rawPhoto.includes('rsrc.php') && !rawPhoto.includes('static.xx')) ? rawPhoto : DEFAULT_AVATAR;

            // Detecção de seleção (Story Ocultado = círculo azul com check branco)
            let isChecked = false;

            // A. aria-checked="true" / aria-selected="true" / checkbox marcado
            const ariaEl = row.querySelector('[aria-checked="true"], [aria-selected="true"], [aria-label*="desmarcar" i], input[type="checkbox"]:checked');
            if (ariaEl) {
                isChecked = true;
            }

            // B. Elemento Bloks com mask-image circle-check__filled ou background azul
            if (!isChecked) {
                const checkElements = Array.from(row.querySelectorAll(`
                    [style*="circle-check"],
                    [style*="rgb(0, 149, 246)"],
                    [style*="0, 149, 246"],
                    [style*="rgb(74, 93, 249)"],
                    [style*="74, 93, 249"],
                    [style*="#0095f6"],
                    [class*="circle-check__filled"],
                    [class*="circle-check"],
                    img[src*="circle-check"],
                    svg[aria-label*="Check" i],
                    svg[aria-label*="check" i],
                    svg[aria-label*="desmarcar" i]
                `));
                for (const el of checkElements) {
                    if (el.closest('[style*="display: none"], [style*="display:none"]')) continue;
                    try {
                        const cs = window.getComputedStyle(el);
                        const bg = cs.backgroundColor || '';
                        const mask = cs.maskImage || cs.webkitMaskImage || '';
                        if (cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetWidth > 0 || el.getBoundingClientRect().width > 0)) {
                            if (bg.includes('149, 246') || bg.includes('93, 249') || mask.includes('circle-check') || el.classList.toString().includes('circle-check__filled')) {
                                isChecked = true;
                                break;
                            }
                        }
                    } catch (_) { }
                }
            }

            // C. Fallback por innerHTML da linha
            if (!isChecked && row.innerHTML) {
                if (row.innerHTML.includes('circle-check') || row.innerHTML.includes('rgb(0, 149, 246)') || row.innerHTML.includes('0, 149, 246') || row.innerHTML.includes('rgb(74, 93, 249)') || row.innerHTML.includes('74, 93, 249') || row.innerHTML.includes('#0095f6')) {
                    isChecked = true;
                }
            }

            // D. Fallback estrutural: Se a linha estiver antes do cabeçalho "Sugeridos" no DOM
            if (!isChecked) {
                const sugeridosHeader = Array.from(targetDoc.querySelectorAll('span, div, h2, h3, h4, p')).find(el => {
                    if (el.closest('.submenu-modal') || el.closest('#hideStoryModal') || el.closest('#closeFriendsModal')) return false;
                    const t = (el.innerText || '').trim().toLowerCase();
                    return t === 'sugeridos' || t === 'sugestões' || t === 'suggested' || t === 'sugerencias';
                });
                if (sugeridosHeader) {
                    if (sugeridosHeader.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_PRECEDING) {
                        isChecked = true;
                    }
                }
            }

            const pk = getCachedUserId(uname) || '';
            const k = uname.toLowerCase();
            if (!foundUsers.has(k)) {
                foundUsers.set(k, {
                    username: uname,
                    fullName,
                    photoUrl,
                    pk,
                    id: pk,
                    isHidden: isChecked
                });
            } else {
                const ex = foundUsers.get(k);
                if (isChecked) ex.isHidden = true;
                if (!ex.pk && pk) ex.pk = pk;
                if (!ex.fullName && fullName) ex.fullName = fullName;
                if ((!ex.photoUrl || ex.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) ex.photoUrl = photoUrl;
            }
        });

        return foundUsers;
    }

    // 1. Extrator completo via rolagem (Turbo Scroll) e interceptação Bloks
    function extractHideStoryUsernames(doc = document) {
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
            update(0, 0, "Buscando e rolando a lista de usuários com story ocultado...");

            function finishExtraction() {
                if (scrollInterval) clearInterval(scrollInterval);
                if (window._igHideStoryUsersCapture && window._igHideStoryUsersCapture.callbacks) {
                    const idx = window._igHideStoryUsersCapture.callbacks.indexOf(networkCallback);
                    if (idx !== -1) window._igHideStoryUsersCapture.callbacks.splice(idx, 1);
                }
                if (bar) bar.remove();
                const hiddenCount = Array.from(users.values()).filter(u => u.isHidden).length;
                console.log(`[IG Tools] Extração de Ocultar Story finalizada. Total de ${users.size} contatos mapeados (${hiddenCount} ocultados).`);
                users.forEach(u => {
                    if (u.username && u.pk) setCachedUserId(u.username, u.pk);
                });
                resolve(cancelled ? [] : Array.from(users.values()));
            }

            // A. Extração de scripts SSR presentes no DOM
            try {
                const scripts = Array.from(doc.querySelectorAll('script[type="application/json"], script'));
                for (const script of scripts) {
                    const text = script.textContent || '';
                    if (!text.includes('hide_story') && !text.includes('should_unhide') && !text.includes('username')) continue;
                    const fromScript = parseHideStoryBloksText(text);
                    if (Array.isArray(fromScript)) {
                        fromScript.forEach(u => {
                            const k = (u.username || '').toLowerCase().trim();
                            if (!k) return;
                            if (!users.has(k)) {
                                users.set(k, { username: u.username, photoUrl: u.photoUrl, isHidden: !!(u.isHidden || u.isChecked), pk: u.pk, fullName: u.fullName || '' });
                            } else {
                                const ex = users.get(k);
                                if (u.isHidden || u.isChecked) ex.isHidden = true;
                                if (!ex.pk && u.pk) ex.pk = u.pk;
                                if (u.photoUrl && u.photoUrl !== DEFAULT_AVATAR) ex.photoUrl = u.photoUrl;
                                if (u.fullName) ex.fullName = u.fullName;
                            }
                        });
                    }
                }
            } catch (_) { }

            // B. Importa dados já capturados na sessão pelo interceptor de rede
            if (window._igHideStoryUsersCapture && window._igHideStoryUsersCapture.users) {
                window._igHideStoryUsersCapture.users.forEach(u => {
                    const k = (u.username || '').toLowerCase().trim();
                    if (!k) return;
                    if (!users.has(k)) {
                        users.set(k, { username: u.username, photoUrl: u.photoUrl, isHidden: !!(u.isHidden || u.isChecked), pk: u.pk, fullName: u.fullName || '' });
                    } else {
                        const ex = users.get(k);
                        if (u.isHidden || u.isChecked) ex.isHidden = true;
                        if (!ex.pk && u.pk) ex.pk = u.pk;
                        if (u.photoUrl && u.photoUrl !== DEFAULT_AVATAR) ex.photoUrl = u.photoUrl;
                        if (u.fullName) ex.fullName = u.fullName;
                    }
                });
            }

            // C. Callback de rede em tempo real para paginações Bloks
            function networkCallback(capturedArray) {
                let added = false;
                capturedArray.forEach(u => {
                    const k = (u.username || '').toLowerCase().trim();
                    if (!k) return;
                    if (!users.has(k)) {
                        users.set(k, { username: u.username, photoUrl: u.photoUrl, isHidden: !!(u.isHidden || u.isChecked), pk: u.pk, fullName: u.fullName || '' });
                        added = true;
                    } else {
                        const ex = users.get(k);
                        if (u.isHidden || u.isChecked) ex.isHidden = true;
                        if (!ex.pk && u.pk) ex.pk = u.pk;
                        if (u.photoUrl && u.photoUrl !== DEFAULT_AVATAR) ex.photoUrl = u.photoUrl;
                        if (u.fullName) ex.fullName = u.fullName;
                    }
                });
                if (added) {
                    noNewUsersCount = 0;
                    const curHidden = Array.from(users.values()).filter(u => u.isHidden).length;
                    update(users.size, users.size, `Capturado(s) ${users.size} usuário(s) (${curHidden} com story ocultado)... Rolando...`);
                }
            }
            if (window._igHideStoryUsersCapture) {
                window._igHideStoryUsersCapture.callbacks.push(networkCallback);
            }

            function performScan() {
                const scanned = scanHideStoryDomRows(doc);
                scanned.forEach((u, k) => {
                    if (!users.has(k)) {
                        users.set(k, u);
                    } else {
                        const ex = users.get(k);
                        if (u.isHidden) ex.isHidden = true;
                        if (!ex.pk && u.pk) ex.pk = u.pk;
                        if (u.photoUrl && u.photoUrl !== DEFAULT_AVATAR) ex.photoUrl = u.photoUrl;
                        if (u.fullName) ex.fullName = u.fullName;
                    }
                });
                const curHidden = Array.from(users.values()).filter(u => u.isHidden).length;
                update(users.size, users.size, `Mapeando contatos (${curHidden} com story ocultado)...`);
            }

            performScan();

            const scrollContainer = doc.querySelector('div[role="dialog"] ._aano') ||
                doc.querySelector('div[role="dialog"] div[style*="overflow-y: auto"]') ||
                doc.querySelector('main div[style*="overflow-y: auto"]') ||
                doc.querySelector('div[style*="overflow-y: auto"]') ||
                doc.querySelector('._aano') ||
                doc.documentElement;

            let lastCount = users.size;
            scrollInterval = setInterval(() => {
                if (cancelled) return;
                performScan();

                if (scrollContainer && scrollContainer !== doc.documentElement) {
                    scrollContainer.scrollTop += 900;
                } else {
                    window.scrollBy(0, 900);
                }

                if (users.size > lastCount) {
                    noNewUsersCount = 0;
                    lastCount = users.size;
                } else {
                    noNewUsersCount++;
                    if (noNewUsersCount >= maxIdleCount) {
                        finishExtraction();
                    }
                }
            }, 400);

            setTimeout(() => finishExtraction(), 25000);
        });
    }

    // 2. Extração segura e instantânea de Ocultar Story (0ms DOM)
    async function extractHideStoryFromCurrentDomOrFetch(forceFetch = false) {
        const resultUsers = scanHideStoryDomRows(document);
        const list = Array.from(resultUsers.values());
        const hiddenCount = list.filter(u => u.isHidden).length;
        console.log(`[IG Tools HideStory] Varredura instantânea mapeou ${list.length} usuários (${hiddenCount} ocultados).`);
        if (hiddenCount > 0 && !forceFetch) return list;

        const usersMap = new Map();
        list.forEach(u => usersMap.set(u.username.toLowerCase(), u));

        // Se não tiver usuários ocultados no DOM da página atual, busca em scripts SSR locais
        try {
            const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script'));
            for (const script of scripts) {
                const text = script.textContent || '';
                if (!text.includes('hide_story') && !text.includes('should_unhide') && !text.includes('username')) continue;
                const fromScript = parseHideStoryBloksText(text);
                if (Array.isArray(fromScript)) {
                    fromScript.forEach(u => {
                        const k = (u.username || '').toLowerCase().trim();
                        if (!k) return;
                        if (!usersMap.has(k)) {
                            usersMap.set(k, u);
                        } else if (u.isHidden || u.isChecked) {
                            usersMap.get(k).isHidden = true;
                        }
                    });
                }
            }
        } catch (_) { }

        // Se ainda não encontrou contas ocultadas e não está na rota, faz fetch na rota oficial
        const curHiddenCount = Array.from(usersMap.values()).filter(u => u.isHidden).length;
        if (curHiddenCount === 0 && !window.location.pathname.includes('/accounts/hide_story_and_live_from/')) {
            try {
                const pageResp = await fetch('https://www.instagram.com/accounts/hide_story_and_live_from/', {
                    credentials: 'include',
                    cache: 'no-store'
                });
                if (pageResp.ok) {
                    const html = await pageResp.text();
                    const fromHtml = parseHideStoryBloksText(html);
                    if (Array.isArray(fromHtml) && fromHtml.length > 0) {
                        fromHtml.forEach(u => {
                            const k = (u.username || '').toLowerCase().trim();
                            if (!k) return;
                            if (!usersMap.has(k)) {
                                usersMap.set(k, u);
                            } else if (u.isHidden || u.isChecked) {
                                usersMap.get(k).isHidden = true;
                            }
                        });
                    }
                }
            } catch (_) { }
        }

        // Tenta WBloks tela inicial se ainda 0
        if (Array.from(usersMap.values()).filter(u => u.isHidden).length === 0) {
            try {
                const initialUsers = await fetchHideStoryInitialScreen();
                if (Array.isArray(initialUsers) && initialUsers.length > 0) {
                    initialUsers.forEach(u => {
                        const k = (u.username || '').toLowerCase().trim();
                        if (!k) return;
                        if (!usersMap.has(k)) {
                            usersMap.set(k, u);
                        } else if (u.isHidden || u.isChecked) {
                            usersMap.get(k).isHidden = true;
                        }
                    });
                }
            } catch (_) { }
        }

        if (window._igHideStoryUsersCapture?.users) {
            window._igHideStoryUsersCapture.users.forEach((u, k) => {
                if (!usersMap.has(k)) {
                    usersMap.set(k, u);
                } else if (u.isHidden || u.isChecked) {
                    usersMap.get(k).isHidden = true;
                }
            });
        }

        return Array.from(usersMap.values());
    }

    // 2.1. Requisição direta oficial da Tela Inicial (WBloks com.instagram.portable_settings.privacy.hide_story_from_screen.hide_story_from)
    async function fetchHideStoryInitialScreen() {
        const live = getMainWorldTokens();
        const fbDtsg = live.dtsg || getDtsgToken() || '';
        const jazoest = computeJazoest(fbDtsg);
        const lsd = live.lsd || getLsdToken() || '';
        const spin = getSpinParams();
        const viewerId = getCookie('ds_user_id') || getActorId() || '';

        // 1. TENTATIVA DIRETA WBLOKS
        const url = 'https://www.instagram.com/async/wbloks/fetch/?appid=com.instagram.portable_settings.privacy.hide_story_from_screen.hide_story_from&type=action&__bkv=bebad2b121ef373e1847b0445ffd0ce996417496c088e54f6b5d2f5c6501842d';

        const dyn = live.dyn || getInstagramFormToken('__dyn') || '7xeUjG1mxu1syaxG4Vp41twpUnwgU7SbzEdF8vyUco2qwJyEiw50x609vCwjE1EEc87m0yE462mcw5Mx62G5UswoEcE7O2l0Fwqo5W1yw9O1lwxwQzXwae4UaEW2G0AEco5G0zK5o4q0HU1wEbUGdwtUeo9UaQ0Lo6-bwHwKG6Ufk0zU8oC1IwjUpwlAcwBwUQp1yU426V8aUuwm8jxK1mwa6bBK4o16UeUGq2Kq11whE984O0XEdoCQ1jw';
        const csr = live.csr || getInstagramFormToken('__csr') || 'iMB0FNX5N22j9eUHPWl8iGkV-eGXT8G5OPdP8VIzehP8KBh9pV9cNGWnip9Wh4BGfld8Dif4W4au9Irs8F4l9JbhAF4gJ7l95AFagBBBAkDiq9uVdppZDJykAch9QvAKiXjAV4HgzDBoLaaGh3Q68K9zGzay9pUC8yEj-dyWxe9zEGK9zXBzWzWyuQmbyWxaZ3KFEgxjhj1ycBzk5uVoGdgK8Ax3AAHV8K5GgG22maG1UUK1sweq7okw5ww08Ha00Y8EcU0vn2UKkMoQ18xgE0h1opw6yCtw2TU0hyS0Koqguw8Z0BwiUdK0qW5Eo6jw4dU3HwbWq3G8wTg1iV2By84iUy8guGywqodE2YrRrw1s2i1lG5o06KC02qu2K9g6rw0E5weS0fcw';
        const spinR = live.spin_r || spin.spin_r || spin._spin_r || '1049106301';
        const spinT = live.spin_t || spin.spin_t || spin._spin_t || String(Math.floor(Date.now() / 1000));

        const bodyParams = new URLSearchParams({
            __d: 'www',
            __user: viewerId || '0',
            __a: '1',
            __req: '7',
            dpr: '2',
            __ccg: 'EXCELLENT',
            __rev: spinR,
            __dyn: dyn,
            __csr: csr,
            _comet_req: '7',
            __comet_req: '7',
            server_timestamps: 'true',
            _spin_r: spinR,
            __spin_r: spinR,
            _spin_b: 'trunk',
            __spin_b: 'trunk',
            _spin_t: spinT,
            __spin_t: spinT,
            params: '{}'
        });

        if (viewerId) {
            bodyParams.set('av', viewerId);
            bodyParams.set('__user', viewerId);
        }
        if (fbDtsg) bodyParams.set('fb_dtsg', fbDtsg);
        if (jazoest) bodyParams.set('jazoest', jazoest);
        if (lsd) bodyParams.set('lsd', lsd);

        try {
            console.log('[IG Tools HideStory] Solicitando tela oficial via WBloks...', { viewerId, hasDtsg: !!fbDtsg, hasLsd: !!lsd, jazoest });
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...getApiHeaders(true),
                    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'x-fb-lsd': lsd,
                    'x-csrftoken': getCookie('csrftoken') || '',
                    'x-instagram-ajax': '1',
                    'x-requested-with': 'XMLHttpRequest'
                },
                body: bodyParams.toString(),
                credentials: 'include',
                cache: 'no-store'
            });

            if (response.ok) {
                const text = await response.text();
                if (text.includes('"error":1357001') || text.includes('Entre para continuar')) {
                    console.warn('[IG Tools HideStory] WBloks retornou 1357001 (sessão/token inválido). Limpando cache fb_dtsg.');
                    try { localStorage.removeItem('ig_tools_fb_dtsg'); } catch (_) { }
                } else {
                    console.log(`[IG Tools HideStory] fetchHideStoryInitialScreen recebeu ${text.length} bytes.`);
                    const extracted = parseHideStoryBloksText(text);
                    if (extracted.length > 0) return extracted;
                }
            }
        } catch (err) {
            console.warn('[IG Tools HideStory] Erro ao buscar tela inicial via WBloks POST:', err);
        }

        // 2. TENTATIVA FALLBACK: GET DIRETO NA URL OFICIAL (/accounts/hide_story_and_live_from/)
        try {
            console.log('[IG Tools HideStory] Tentando extração via GET na rota oficial /accounts/hide_story_and_live_from/...');
            const pageResp = await fetch('https://www.instagram.com/accounts/hide_story_and_live_from/', {
                credentials: 'include',
                cache: 'no-store'
            });
            if (pageResp.ok) {
                const html = await pageResp.text();
                console.log(`[IG Tools HideStory] HTML oficial recebido: ${html.length} bytes.`);
                const mDtsg = html.match(/\["DTSGInitialData",\s*\[\],\s*\{"token"\s*:\s*"([^"]+)"/i) || html.match(/"async_get_token"\s*:\s*"([^"]+)"/i);
                if (mDtsg && mDtsg[1]) {
                    window.__fb_dtsg = mDtsg[1];
                    try { localStorage.setItem('ig_tools_fb_dtsg', mDtsg[1]); } catch (_) { }
                }
                const extractedFromHtml = parseHideStoryBloksText(html);
                if (extractedFromHtml.length > 0) {
                    console.log(`[IG Tools HideStory] Sucesso! ${extractedFromHtml.length} usuários extraídos do HTML oficial.`);
                    return extractedFromHtml;
                }
            }
        } catch (errHtml) {
            console.warn('[IG Tools HideStory] Erro no fallback GET HTML:', errHtml);
        }

        return [];
    }

    // 2.2. Requisição direta oficial de Paginação (WBloks com.instagram.pagination.async)
    async function fetchHideStoryPagination(cursor, containerId = "1178138719", loadingId = "1178138721") {
        if (!cursor) return { users: [], nextCursor: null };

        const live = getMainWorldTokens();
        const fbDtsg = live.dtsg || getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
        const jazoest = computeJazoest(fbDtsg) || '25994';
        const lsd = live.lsd || getLsdToken() || getInstagramFormToken('lsd') || '';
        const spin = getSpinParams();
        const spinR = live.spin_r || spin.spin_r || spin._spin_r || '1049106301';
        const spinT = live.spin_t || spin.spin_t || spin._spin_t || String(Math.floor(Date.now() / 1000));

        const url = 'https://www.instagram.com/async/wbloks/fetch/?appid=com.instagram.pagination.async&type=action&__bkv=bebad2b121ef373e1847b0445ffd0ce996417496c088e54f6b5d2f5c6501842d';

        const paramsObj = {
            container_id: String(containerId),
            loading_component_id: String(loadingId),
            app_id: "com.instagram.portable_settings.privacy.selection_list_component.unselected_users",
            autoload_params: JSON.stringify({
                query: "",
                container_id: String(containerId),
                cursor: cursor,
                selection_type: "1"
            })
        };

        const bodyParams = new URLSearchParams();
        bodyParams.append('params', JSON.stringify(paramsObj));
        bodyParams.append('__comet_req', '7');
        if (fbDtsg) bodyParams.append('fb_dtsg', fbDtsg);
        if (jazoest) bodyParams.append('jazoest', jazoest);
        if (lsd) bodyParams.append('lsd', lsd);
        bodyParams.append('_spin_r', spinR);
        bodyParams.append('_spin_b', 'trunk');
        bodyParams.append('_spin_t', spinT);
        bodyParams.append('__crn', 'comet.igweb.PolarisSettingsHideStoryAndLiveFromRoute');

        const dyn = getInstagramFormToken('__dyn');
        if (dyn) bodyParams.append('__dyn', dyn);
        const hblp = getInstagramFormToken('__hblp');
        if (hblp) bodyParams.append('__hblp', hblp);
        const sjsp = getInstagramFormToken('__sjsp');
        if (sjsp) bodyParams.append('__sjsp', sjsp);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'x-csrftoken': getCookie('csrftoken') || '',
                    'x-instagram-ajax': '1',
                    'x-requested-with': 'XMLHttpRequest'
                },
                body: bodyParams.toString(),
                credentials: 'include'
            });

            if (!response.ok) return { users: [], nextCursor: null };
            const text = await response.text();
            const extracted = parseHideStoryBloksText(text);

            // Extrai o próximo cursor da resposta (robusto para qualquer nível de escape)
            const nextCursorMatch = text.match(/cursor\\*"\s*:\s*\\*"([^"\\\\]+)/);
            const nextCursor = (nextCursorMatch && nextCursorMatch[1] && nextCursorMatch[1] !== cursor) ? nextCursorMatch[1] : null;

            const nextContainerMatch = text.match(/container_id\\*"\s*:\s*\\*"(\d+)/);
            if (nextContainerMatch && nextContainerMatch[1]) window._igHideStoryContainerId = nextContainerMatch[1];

            const nextLoadingMatch = text.match(/loading_component_id\\*"\s*:\s*\\*"(\d+)/);
            if (nextLoadingMatch && nextLoadingMatch[1]) window._igHideStoryLoadingId = nextLoadingMatch[1];

            const cleanUsers = extracted.map(u => ({
                username: u.username,
                pk: u.pk || '',
                id: u.pk || '',
                fullName: u.fullName || '',
                photoUrl: (u.photoUrl && !u.photoUrl.includes('rsrc.php')) ? u.photoUrl : DEFAULT_AVATAR,
                isHidden: false // Usuários da paginação unselected são por definição não ocultados
            }));

            return { users: cleanUsers, nextCursor };
        } catch (err) {
            console.warn('[IG Tools HideStory] Erro na paginação:', err);
            return { users: [], nextCursor: null };
        }
    }

    // 3. MODAL INSTANTÂNEO (0ms) - GERENCIADOR DE OCULTAR STORIES
    async function abrirModalOcultarStory(initialUsers = null) {
        if (window.__isOpeningHideStoryModal) return;

        const existingModal = document.getElementById("hideStoryModal");
        if (existingModal) {
            existingModal.style.display = "block";
            existingModal.focus();
            modalAbertoStory = true;
            return;
        }
        if (modalAbertoStory) return;

        window.__isOpeningHideStoryModal = true;
        modalAbertoStory = true;

        document.querySelectorAll("#hideStoryModal").forEach(m => m.remove());

        // Helper inteligente para resolver fotos de perfil através de múltiplos caches e sessões
        function resolveUserPhoto(username, currentPhoto = null) {
            if (currentPhoto && currentPhoto !== DEFAULT_AVATAR && typeof currentPhoto === 'string' && !currentPhoto.includes('rsrc.php') && !currentPhoto.includes('static.xx')) {
                return currentPhoto;
            }
            const clean = (typeof username === 'string' ? username : (username?.username || '')).toLowerCase().trim();
            if (!clean) return DEFAULT_AVATAR;

            try {
                const cachedData = window.cachedData;
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
                if (dbHelper?._cache?.hiddenStory && Array.isArray(dbHelper._cache.hiddenStory)) {
                    const item = dbHelper._cache.hiddenStory.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
                if (dbHelper?._cache?.hideStory && Array.isArray(dbHelper._cache.hideStory)) {
                    const item = dbHelper._cache.hideStory.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
                if (dbHelper?._cache?.closeFriends && Array.isArray(dbHelper._cache.closeFriends)) {
                    const item = dbHelper._cache.closeFriends.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
                const seguindoList = window.seguindoList;
                if (typeof seguindoList !== 'undefined' && Array.isArray(seguindoList)) {
                    const item = seguindoList.find(x => getUname(x) === clean);
                    if (item && item.photoUrl && item.photoUrl !== DEFAULT_AVATAR && typeof item.photoUrl === 'string' && !item.photoUrl.includes('rsrc.php')) return item.photoUrl;
                }
            } catch (_) { }
            return DEFAULT_AVATAR;
        }

        // 1. CARREGAMENTO IMEDIATO DO CACHE (expurga qualquer rastro do usuário logado E resíduos inválidos)
        const myUname = (getLoggedInUsername() || '').toLowerCase().trim();
        const myUid = getCookie('ds_user_id') || getActorId() || '';
        const isOnHideStoryPage = window.location.pathname.includes('/accounts/hide_story_and_live_from/');
        let hideStoryList = [];

        // Carrega contas de Seguidores e Seguindo em paralelo para alimentar os filtros
        let followersAccounts = [];
        let followingAccounts = [];
        try {
            const [dbFollowers, dbFollowing] = await Promise.all([
                dbHelper.loadCache('followers') || dbHelper.getCache?.('followers'),
                dbHelper.loadCache('following') || dbHelper.getCache?.('following')
            ]);
            const unpackList = (cacheObj) => {
                if (!cacheObj) return [];
                if (Array.isArray(cacheObj)) return cacheObj;
                if (cacheObj.details instanceof Map) return Array.from(cacheObj.details.values());
                if (cacheObj instanceof Set) return Array.from(cacheObj).map(u => (typeof u === 'string' ? { username: u } : u));
                return [];
            };
            followersAccounts = unpackList(dbFollowers);
            followingAccounts = unpackList(dbFollowing);
        } catch (_) { }

        if (followersAccounts.length === 0 && dbHelper?._cache?.followers && Array.isArray(dbHelper._cache.followers)) {
            followersAccounts = dbHelper._cache.followers;
        }
        if (followingAccounts.length === 0 && dbHelper?._cache?.following && Array.isArray(dbHelper._cache.following)) {
            followingAccounts = dbHelper._cache.following;
        }
        if (followersAccounts.length === 0) {
            try {
                const raw = localStorage.getItem('ig_tools_cache_followers') || localStorage.getItem('ig_tools_cached_followers');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) followersAccounts = parsed;
                }
            } catch (_) { }
        }
        if (followingAccounts.length === 0) {
            try {
                const raw = localStorage.getItem('ig_tools_cache_following') || localStorage.getItem('ig_tools_cached_following');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) followingAccounts = parsed;
                }
            } catch (_) { }
        }
        const cachedData = window.cachedData;
        const seguindoList = window.seguindoList;
        if (followingAccounts.length === 0 && typeof seguindoList !== 'undefined' && Array.isArray(seguindoList) && seguindoList.length > 0) {
            followingAccounts = seguindoList;
        }
        if (followingAccounts.length === 0 && typeof cachedData !== 'undefined' && cachedData?.seguindo) {
            followingAccounts = Array.from(cachedData.seguindo).map(u => ({
                username: u,
                photoUrl: resolveUserPhoto(u),
                fullName: cachedData.userDetails?.get(u)?.fullName || ''
            }));
        }
        if (followersAccounts.length === 0 && typeof cachedData !== 'undefined' && cachedData?.seguidores) {
            followersAccounts = Array.from(cachedData.seguidores).map(u => ({
                username: u,
                photoUrl: resolveUserPhoto(u),
                fullName: cachedData.userDetails?.get(u)?.fullName || ''
            }));
        }

        followersAccounts.forEach(f => {
            if (typeof f === 'object' && f) f.photoUrl = resolveUserPhoto(f.username, f.photoUrl);
        });
        followingAccounts.forEach(f => {
            if (typeof f === 'object' && f) f.photoUrl = resolveUserPhoto(f.username, f.photoUrl);
        });

        const followersSet = new Set(
            followersAccounts.map(f => (typeof f === 'string' ? f : f.username || '').toLowerCase().trim()).filter(Boolean)
        );
        const followingSet = new Set(
            followingAccounts.map(f => (typeof f === 'string' ? f : f.username || '').toLowerCase().trim()).filter(Boolean)
        );

        // Detecção de contas com story ocultado oficial (verdade estrita)
        let officialHiddenSet = new Set();
        let officialHiddenList = [];
        let baseList = [];

        const addHiddenAccount = (u, isHidden = true) => {
            const uname = (typeof u === 'string' ? u : u.username || '').toLowerCase().trim();
            if (!uname || !isValidInstagramUsername(uname) || uname === myUname) return;
            const pk = (typeof u === 'object' && (u.pk || u.id)) ? String(u.pk || u.id) : (getCachedUserId(uname) || '');
            const photoUrl = resolveUserPhoto(uname, typeof u === 'object' ? u.photoUrl : null);
            const fullName = (typeof u === 'object' && u.fullName) ? u.fullName : '';
            const userObj = {
                username: uname,
                pk,
                id: pk,
                fullName,
                photoUrl,
                isHidden: !!isHidden
            };
            if (isHidden) {
                officialHiddenSet.add(uname);
                if (!officialHiddenList.some(x => x.username.toLowerCase() === uname)) {
                    officialHiddenList.push(userObj);
                }
            }
            const existingBase = baseList.find(b => b.username.toLowerCase() === uname);
            if (!existingBase) {
                baseList.push(userObj);
            } else {
                if (isHidden) existingBase.isHidden = true;
                if (!existingBase.pk && pk) existingBase.pk = pk;
                if ((!existingBase.photoUrl || existingBase.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) {
                    existingBase.photoUrl = photoUrl;
                }
            }
        };

        const userListCache = window.userListCache || {};

        // 1. Carrega de userListCache.hiddenStory se já presente em memória
        if (userListCache.hiddenStory && userListCache.hiddenStory.size > 0) {
            userListCache.hiddenStory.forEach(u => addHiddenAccount(u, true));
        }

        // 2. Carrega dados salvos anteriormente em cache/IndexedDB / Google Drive
        try {
            const raw = localStorage.getItem('ig_tools_cached_hide_story') || localStorage.getItem('ig_tools_cache_hiddenStory') || localStorage.getItem('ig_tools_cache_hideStory');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    parsed.forEach(u => {
                        addHiddenAccount(u, !!(u.isHidden || u.isChecked));
                    });
                }
            }
        } catch (_) { }

        try {
            const [dbHidden, dbHide] = await Promise.all([
                dbHelper.loadCache('hiddenStory') || dbHelper.getCache?.('hiddenStory'),
                dbHelper.loadCache('hideStory') || dbHelper.getCache?.('hideStory')
            ]);
            const unpackDb = (dbRes) => {
                if (!dbRes) return [];
                if (Array.isArray(dbRes)) return dbRes;
                if (dbRes.details instanceof Map) return Array.from(dbRes.details.values());
                if (dbRes instanceof Set) return Array.from(dbRes).map(u => ({ username: u, isHidden: true }));
                return [];
            };
            const combinedDb = [...unpackDb(dbHidden), ...unpackDb(dbHide)];
            combinedDb.forEach(u => addHiddenAccount(u, true));
        } catch (_) { }

        if (dbHelper?._cache?.hiddenStory && Array.isArray(dbHelper._cache.hiddenStory)) {
            dbHelper._cache.hiddenStory.forEach(u => addHiddenAccount(u, true));
        }
        if (dbHelper?._cache?.hideStory && Array.isArray(dbHelper._cache.hideStory)) {
            dbHelper._cache.hideStory.forEach(u => addHiddenAccount(u, true));
        }

        // 3. Se estiver diretamente na tela de Ocultar Story, faz varredura imediata dos elementos já na tela (0ms)
        if (isOnHideStoryPage) {
            const liveMap = scanHideStoryDomRows(document);
            const liveArr = Array.from(liveMap.values());
            const liveHidden = liveArr.filter(u => u.isHidden);
            if (liveHidden.length > 0) {
                officialHiddenList = liveHidden.map(u => ({ ...u, photoUrl: resolveUserPhoto(u.username, u.photoUrl) }));
                officialHiddenSet = new Set(liveHidden.map(u => u.username.toLowerCase()));
                try {
                    localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(liveHidden));
                    dbHelper.saveCache('hiddenStory', liveHidden);
                    dbHelper.saveCache('hideStory', liveHidden);
                    if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                    userListCache.hiddenStory = new Set(liveHidden.map(u => u.username));
                } catch (_) { }
            }
            liveArr.forEach(u => addHiddenAccount(u, u.isHidden));
        }

        // 4. Se não estiver na tela oficial ou ainda não obteve a lista oficial, busca diretamente via WBloks / GET
        if (officialHiddenList.length === 0) {
            try {
                const initialScreenUsers = await fetchHideStoryInitialScreen();
                if (Array.isArray(initialScreenUsers) && initialScreenUsers.length > 0) {
                    const hiddenUsers = initialScreenUsers.filter(u => u.isChecked || u.isHidden);
                    if (hiddenUsers.length > 0) {
                        officialHiddenList = hiddenUsers.map(u => ({ ...u, isHidden: true, photoUrl: resolveUserPhoto(u.username, u.photoUrl) }));
                        officialHiddenSet = new Set(hiddenUsers.map(u => (u.username || '').toLowerCase()));
                        try {
                            localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(hiddenUsers));
                            dbHelper.saveCache('hiddenStory', hiddenUsers);
                            dbHelper.saveCache('hideStory', hiddenUsers);
                            if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                            userListCache.hiddenStory = new Set(hiddenUsers.map(u => u.username));
                        } catch (_) { }
                    }
                    initialScreenUsers.forEach(u => addHiddenAccount(u, u.isChecked || u.isHidden));
                }
            } catch (err) {
                console.warn('[IG Tools HideStory] Falha ao carregar tela inicial:', err);
            }
        }

        // Complementa com initialUsers ou cachedHideStory se fornecidos
        if (Array.isArray(initialUsers) && initialUsers.length > 0) {
            initialUsers.forEach(u => addHiddenAccount(u, u.isHidden));
        } else if (Array.isArray(cachedHideStory) && cachedHideStory.length > 0) {
            cachedHideStory.forEach(u => addHiddenAccount(u, u.isHidden));
        }

        const mergedMap = new Map();

        // 1. Contas oficialmente com story ocultado
        officialHiddenList.forEach(u => {
            const k = (u.username || '').toLowerCase().trim();
            if (k && k !== myUname) {
                mergedMap.set(k, { ...u, photoUrl: resolveUserPhoto(u.username, u.photoUrl), isHidden: true });
            }
        });

        // 2. Base list
        baseList.forEach(u => {
            const uname = (u.username || '').toLowerCase().trim();
            if (!uname || !isValidInstagramUsername(uname) || uname === myUname) return;
            const isHid = !!u.isHidden;
            const p = resolveUserPhoto(uname, u.photoUrl);
            if (!mergedMap.has(uname)) {
                mergedMap.set(uname, {
                    ...u,
                    photoUrl: p,
                    isHidden: isHid
                });
            } else {
                const existing = mergedMap.get(uname);
                if (isHid) existing.isHidden = true;
                if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p !== DEFAULT_AVATAR) {
                    existing.photoUrl = p;
                }
            }
        });

        // 3. Meus Seguidores
        followersAccounts.forEach(f => {
            const uname = typeof f === 'string' ? f : f.username;
            if (!uname || !isValidInstagramUsername(uname)) return;
            const k = uname.toLowerCase().trim();
            if (k === myUname) return;
            const pk = (typeof f === 'object' && (f.pk || f.id)) ? String(f.pk || f.id) : (getCachedUserId(uname) || '');
            const p = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
            if (!mergedMap.has(k)) {
                mergedMap.set(k, {
                    username: uname,
                    pk: pk,
                    id: pk,
                    fullName: (typeof f === 'object' && f.fullName) ? f.fullName : '',
                    photoUrl: p,
                    isHidden: officialHiddenSet.has(k)
                });
            } else {
                const existing = mergedMap.get(k);
                if (!existing.pk && pk) existing.pk = pk;
                if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p !== DEFAULT_AVATAR) {
                    existing.photoUrl = p;
                }
            }
        });

        // 4. Meus Seguindo
        followingAccounts.forEach(f => {
            const uname = typeof f === 'string' ? f : f.username;
            if (!uname || !isValidInstagramUsername(uname)) return;
            const k = uname.toLowerCase().trim();
            if (k === myUname) return;
            const pk = (typeof f === 'object' && (f.pk || f.id)) ? String(f.pk || f.id) : (getCachedUserId(uname) || '');
            const p = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
            if (!mergedMap.has(k)) {
                mergedMap.set(k, {
                    username: uname,
                    pk: pk,
                    id: pk,
                    fullName: (typeof f === 'object' && f.fullName) ? f.fullName : '',
                    photoUrl: p,
                    isHidden: officialHiddenSet.has(k)
                });
            } else {
                const existing = mergedMap.get(k);
                if (!existing.pk && pk) existing.pk = pk;
                if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && p !== DEFAULT_AVATAR) {
                    existing.photoUrl = p;
                }
            }
        });

        hideStoryList = Array.from(mergedMap.values()).filter(u => {
            const uname = (u.username || '').toLowerCase().trim();
            const uid = String(u.pk || u.id || '');
            if (!uname || uname === myUname || (myUid && uid === myUid)) return false;
            return isValidInstagramUsername(uname);
        });
        cachedHideStory = hideStoryList;

        const selectedUsers = new Set();
        let currentPage = 1;
        let sortConfig = { key: 'isHidden', direction: 'descending' };

        // 2. MONTAGEM IMEDIATA DO MODAL (0ms - Padrão Amigos Próximos)
        const div = document.createElement("div");
        div.id = "hideStoryModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 840px; max-height: 90vh; border: 1px solid #ccc;
            border-radius: 12px; padding: 20px; z-index: 10000; overflow: auto;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        `;

        const hiddenCount = hideStoryList.filter(u => u.isHidden).length;
        const notHiddenCount = hideStoryList.filter(u => !u.isHidden).length;
        const followersCount = hideStoryList.filter(u => followersSet.has((u.username || '').toLowerCase().trim())).length;
        const followingCount = hideStoryList.filter(u => followingSet.has((u.username || '').toLowerCase().trim())).length;

        div.innerHTML = `
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; cursor: move;">
                <span class="modal-title" style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <span>👁️‍🗨️ Gerenciador de Ocultar Stories</span>
                    <span id="hsSelectedCount" style="font-size:12px; font-weight:normal; color:#0095f6;">(0 selecionados)</span>
                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie quem não pode ver seus Stories e transmissões ao vivo. Oculte ou reexiba contatos individualmente ou em lote com 1 clique.</span></div>
                </span>
                <div class="modal-controls" style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 10px;">
                    <button id="hsMinimizarBtn" title="Minimizar" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 2px 6px; color: #8e8e8e; line-height: 1;">_</button>
                    <button id="hsFecharBtn" title="Fechar" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 2px 6px; color: #8e8e8e; line-height: 1;">X</button>
                </div>
            </div>
            <div id="hsModalBody" style="display: block;">
                <div style="padding: 15px 0 10px 0;">
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                            <button id="hsRefreshBtn" title="Ler e sincronizar dados oficiais via Instagram Web" style="background: #1abc9c; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">🔄 Sincronizar</button>
                            <button id="hsOpenOfficialPageBtn" title="Abre a tela nativa de Ocultar Stories do Instagram para sincronizar instantaneamente em 0ms" style="background: #34495e; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">🌐 Tela Oficial (0ms)</button>
                            <button id="hsImportJsonBtn" title="Importar arquivo JSON de usuários" style="background: #8e44ad; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">📥 Importar JSON</button>
                            <button id="hsHideSelectedBtn" title="Ocultar stories para os selecionados" style="background: #e67e22; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600;">👁️‍🗨️ Ocultar Selecionados</button>
                            <button id="hsUnhideSelectedBtn" title="Reexibir stories para os selecionados" style="background: #27ae60; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600;">👁️ Reexibir Selecionados</button>
                            <button id="hsSelectPageBtn" style="background: #0095f6; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px;">Selecionar Página</button>
                            <button id="hsDeselectAllBtn" style="background: #6c757d; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px;">Desmarcar Todos</button>
                            <input type="file" id="hsJsonFileInput" accept=".json" style="display: none;">
                        </div>
                        <div class="toggle-item" style="padding: 5px 10px; border-radius: 8px; gap: 10px; display: flex; align-items: center;">
                            <span style="font-size: 13px; font-weight: 500;">⚡ Usar API</span>
                            <label class="switch"><input type="checkbox" id="hsUseApiToggle" ${loadSettings().useApi ? 'checked' : ''}><span class="slider"></span></label>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <input type="text" id="hsSearchInput" placeholder="Pesquisar por @usuário, nome ou ID..." style="flex: 2; min-width: 220px; padding: 8px 12px; height: 38px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; outline: none; box-sizing: border-box;">
                    <select id="hsFilterSelect" style="flex: 1; min-width: 260px; padding: 0 10px; height: 38px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; cursor: pointer; outline: none; box-sizing: border-box; font-weight: 500;">
                        <option value="all" selected>🌐 Todos (${hideStoryList.length})</option>
                        <option value="hidden">👁️ Stories Ocultados (${hiddenCount})</option>
                        <option value="not_hidden">👁️ Stories Sem Ocultar (${notHiddenCount})</option>
                        <option value="followers">👥 Meus Seguidores (${followersCount})</option>
                        <option value="following">👤 Meus Seguindo (${followingCount})</option>
                    </select>
                </div>
                <div id="statusHideStory" style="font-weight: 600; font-size: 13px; color: #555; display: flex; justify-content: space-between; align-items: center;">
                    <span>Total: <strong style="color: #e67e22;">${hiddenCount}</strong> contas com story ocultado | <strong style="color: #27ae60;">${notHiddenCount}</strong> contas sem ocultar.</span>
                    <span id="hsSyncInfo" style="font-size: 11px; color: #888;"></span>
                </div>
                <div id="tabelaHideStoryContainer" style="display: block; margin-top: 12px; overflow-x: auto; width: 100%;"></div>
            </div>
        `;

        // Garante instância estritamente única no DOM antes de anexar
        document.querySelectorAll("#hideStoryModal").forEach(m => m.remove());
        document.body.appendChild(div);

        // Controles da janela vinculados imediatamente (garante que fechar e minimizar funcionem sempre)
        const hsCloseBtn = div.querySelector("#hsFecharBtn");
        if (hsCloseBtn) {
            hsCloseBtn.onclick = () => {
                if (window._igHideStoryUsersCapture && typeof captureCallback !== 'undefined') {
                    const idx = window._igHideStoryUsersCapture.callbacks.indexOf(captureCallback);
                    if (idx !== -1) window._igHideStoryUsersCapture.callbacks.splice(idx, 1);
                }
                div.remove();
                document.querySelectorAll("#hideStoryModal").forEach(m => m.remove());
                modalAbertoStory = false;
                window.__isOpeningHideStoryModal = false;
            };
        }

        let isHsMinimized = false;
        const hsMinBtn = div.querySelector("#hsMinimizarBtn");
        if (hsMinBtn) {
            hsMinBtn.onclick = () => {
                const bodyEl = div.querySelector("#hsModalBody");
                isHsMinimized = !isHsMinimized;
                if (bodyEl) bodyEl.style.display = isHsMinimized ? 'none' : 'block';
                div.style.height = isHsMinimized ? 'auto' : '';
                div.style.maxHeight = isHsMinimized ? 'none' : '90vh';
                div.style.width = isHsMinimized ? 'auto' : '90%';
                div.style.minWidth = isHsMinimized ? '380px' : '';
                div.style.maxWidth = isHsMinimized ? '440px' : '840px';
                div.style.padding = isHsMinimized ? '12px 18px' : '20px';
                hsMinBtn.textContent = isHsMinimized ? '_' : '_';
                hsMinBtn.title = isHsMinimized ? 'Maximizar' : 'Minimizar';
            };
        }

        try {
            makeDraggable(div);
        } catch (_) { }

        const container = div.querySelector("#tabelaHideStoryContainer");

        const updateCounts = (paginatedUsers = []) => {
            try {
                const countEl = div.querySelector('#hsSelectedCount');
                if (countEl) countEl.innerText = `(${selectedUsers.size} selecionados)`;

                const selectAllCb = div.querySelector('#selectAllHsCheckbox');
                if (selectAllCb && paginatedUsers.length > 0) {
                    selectAllCb.checked = paginatedUsers.every(u => selectedUsers.has(typeof u === 'string' ? u : u.username));
                }

                const curHiddenCount = hideStoryList.filter(u => u && u.isHidden).length;
                const curNotHiddenCount = hideStoryList.filter(u => u && !u.isHidden).length;
                const curFollowersCount = hideStoryList.filter(u => u && followersSet.has((u.username || '').toLowerCase().trim())).length;
                const curFollowingCount = hideStoryList.filter(u => u && followingSet.has((u.username || '').toLowerCase().trim())).length;
                const curTotalCount = hideStoryList.length;

                const filterSelect = div.querySelector('#hsFilterSelect');
                if (filterSelect && filterSelect.options && filterSelect.options.length >= 5) {
                    filterSelect.options[0].text = `🌐 Todos (${curTotalCount})`;
                    filterSelect.options[1].text = `👁️ Stories Ocultados (${curHiddenCount})`;
                    filterSelect.options[2].text = `👁️ Stories Sem Ocultar (${curNotHiddenCount})`;
                    filterSelect.options[3].text = `👥 Meus Seguidores (${curFollowersCount})`;
                    filterSelect.options[4].text = `👤 Meus Seguindo (${curFollowingCount})`;
                }

                const statusEl = div.querySelector('#statusHideStory');
                if (statusEl) {
                    const totalSpan = statusEl.querySelector('span');
                    if (totalSpan) {
                        totalSpan.innerHTML = `Total: <strong style="color: #e67e22;">${curHiddenCount}</strong> stories ocultados | <strong style="color: #27ae60;">${curNotHiddenCount}</strong> sem ocultar.`;
                    }
                }
            } catch (e) {
                console.warn('[IG Tools HideStory] Erro em updateCounts:', e);
            }
        };

        const renderList = (page = 1) => {
            try {
                const itemsPerPage = loadSettings().itemsPerPage || 10;
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                const searchTerm = (div.querySelector('#hsSearchInput')?.value || '').toLowerCase().trim();
                const filterValue = div.querySelector('#hsFilterSelect')?.value || 'all';

                let filtered = hideStoryList.filter(u => {
                    if (!u) return false;
                    const uname = typeof u === 'string' ? u : (u.username || '');
                    const uLower = uname.toLowerCase().trim();
                    const fLower = (typeof u === 'object' && u.fullName ? u.fullName : '').toLowerCase().trim();
                    const pkStr = String(typeof u === 'object' ? (u.pk || u.id || '') : '');

                    const matchSearch = !searchTerm || uLower.includes(searchTerm) || fLower.includes(searchTerm) || pkStr.includes(searchTerm);
                    if (!matchSearch) return false;

                    if (filterValue === 'hidden') return !!u.isHidden;
                    if (filterValue === 'not_hidden') return !u.isHidden;
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
                    } else if (sortConfig.key === 'isHidden') {
                        valA = a?.isHidden ? 1 : 0;
                        valB = b?.isHidden ? 1 : 0;
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
                                <th style="padding: 8px; width: 36px; text-align: center;"><input type="checkbox" id="selectAllHsCheckbox" title="Selecionar Todos da Página"></th>
                                <th style="padding: 8px;" data-sort-key="username">Usuário ${sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px; text-align: center; width: 110px;" data-sort-key="pk">ID (PK) ${sortConfig.key === 'pk' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px; text-align: center; width: 140px;" data-sort-key="isHidden">Status ${sortConfig.key === 'isHidden' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px; text-align: center; width: 120px;">Ações</th>
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
                                    Você pode clicar em <strong>🔄 Sincronizar</strong> para carregar sua lista de Stories Ocultados diretamente do Instagram Web ou clicar em <strong>📥 Importar JSON</strong>.
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
                        const isHidden = typeof userObj === 'object' ? !!userObj?.isHidden : false;
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

                        tableHtml += `
                            <tr style="border-bottom: 1px solid #dbdbdb;" data-username="${username}">
                                <td style="padding: 8px; text-align: center;"><input type="checkbox" class="hs-user-checkbox" data-username="${username}" style="cursor: pointer;" ${isChecked ? 'checked' : ''}></td>
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
                                    ${isHidden
                                ? `<span class="badge-hs-hidden" style="background: rgba(230, 126, 34, 0.16); color: #f39c12 !important; border: 1px solid rgba(243, 156, 18, 0.45); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">👁️‍🗨️ Story Ocultado</span>`
                                : `<span class="badge-hs-visible" style="background: rgba(39, 174, 96, 0.15); color: #27ae60 !important; border: 1px solid rgba(39, 174, 96, 0.4); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">👁️ Sem Ocultar</span>`
                            }
                                </td>
                                <td style="text-align: center; padding: 8px;">
                                    ${isHidden
                                ? `<button class="btn-action-hs" data-username="${username}" data-uid="${pk}" data-action="unhide" style="background: #27ae60; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">👁️ Reexibir</button>`
                                : `<button class="btn-action-hs" data-username="${username}" data-uid="${pk}" data-action="hide" style="background: #e67e22; color: white; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">👁️‍🗨️ Ocultar</button>`
                            }
                                </td>
                            </tr>
                        `;
                    });
                }

                tableHtml += `</tbody></table>`;

                let paginationHtml = `<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 15px;">`;
                if (page > 1) paginationHtml += `<button id="prevHsPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Anterior</button>`;
                paginationHtml += `<span style="font-size: 13px; font-weight: 600;">Página ${page} de ${totalPages}</span>`;
                if (page < totalPages) paginationHtml += `<button id="nextHsPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; font-size: 13px; cursor: pointer;">Próximo</button>`;
                paginationHtml += `</div>`;

                container.innerHTML = tableHtml + paginationHtml;

                // Checkbox individual listeners
                container.querySelectorAll('.hs-user-checkbox').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const uname = e.target.dataset.username;
                        if (e.target.checked) selectedUsers.add(uname);
                        else selectedUsers.delete(uname);
                        updateCounts(paginatedUsers);
                    });
                });

                // Select all checkbox listener
                const selectAllCb = div.querySelector('#selectAllHsCheckbox');
                if (selectAllCb) {
                    selectAllCb.checked = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(typeof u === 'string' ? u : u.username));
                    selectAllCb.onchange = (e) => {
                        const isChecked = e.target.checked;
                        paginatedUsers.forEach(u => {
                            const uname = typeof u === 'string' ? u : u.username;
                            if (isChecked) selectedUsers.add(uname);
                            else selectedUsers.delete(uname);
                        });
                        container.querySelectorAll('.hs-user-checkbox').forEach(cb => cb.checked = isChecked);
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
                const prevBtn = div.querySelector('#prevHsPageBtn');
                if (prevBtn) prevBtn.onclick = () => renderList(currentPage - 1);
                const nextBtn = div.querySelector('#nextHsPageBtn');
                if (nextBtn) nextBtn.onclick = () => renderList(currentPage + 1);

                // Individual action buttons
                container.querySelectorAll('.btn-action-hs').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const targetBtn = e.currentTarget;
                        const uname = targetBtn.dataset.username;
                        const action = targetBtn.dataset.action;
                        const userObj = hideStoryList.find(u => (typeof u === 'string' ? u : u.username || '').toLowerCase() === uname.toLowerCase());
                        const uid = userObj?.pk || userObj?.id || getCachedUserId(uname) || '';

                        targetBtn.disabled = true;
                        targetBtn.textContent = 'Processando...';

                        try {
                            const res = await executeWbloksHideStory(uid, uname, action);
                            if (res && res.success) {
                                if (userObj && typeof userObj === 'object') {
                                    userObj.isHidden = (action === 'hide');
                                }

                                const userListCache = window.userListCache || {};
                                if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                                if (action === 'hide') {
                                    userListCache.hiddenStory.add(uname.toLowerCase());
                                    showToast(`👁️‍🗨️ Stories ocultados para @${uname}!`);
                                } else {
                                    userListCache.hiddenStory.delete(uname.toLowerCase());
                                    showToast(`👁️ Stories agora visíveis para @${uname}.`);
                                }

                                cachedHideStory = hideStoryList;
                                try {
                                    localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(hideStoryList));
                                    dbHelper.saveCache('hideStory', hideStoryList.filter(u => u && u.isHidden));
                                    dbHelper.saveCache('hiddenStory', Array.from(userListCache.hiddenStory));
                                } catch (_) { }

                                renderList(currentPage);
                                updateCounts();
                            } else {
                                throw new Error(res?.error || 'Falha na requisição');
                            }
                        } catch (err) {
                            console.error('[IG Tools HideStory] Erro:', err);
                            showToast(`Erro ao processar @${uname}.`);
                            targetBtn.disabled = false;
                            targetBtn.textContent = action === 'hide' ? '👁️‍🗨️ Ocultar' : '👁️ Reexibir';
                        }
                    });
                });
            } catch (renderErr) {
                console.error('[IG Tools HideStory] Erro em renderList:', renderErr);
                if (container) {
                    container.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Erro ao exibir lista de usuários: ${renderErr.message}</div>`;
                }
            }
        };

        // Sincronização avançada: busca direta oficial via DOM, paginação WBloks e cache de seguidores/seguindo
        async function sincronizarHideStory(forceScroll = false) {
            const refreshBtn = div.querySelector("#hsRefreshBtn") || document.getElementById("hsRefreshBtn");
            try {
                if (refreshBtn) {
                    refreshBtn.disabled = true;
                    refreshBtn.textContent = "🔄 Sincronizando...";
                }

                const myUname = (getLoggedInUsername() || '').toLowerCase().trim();
                const myUid = getCookie('ds_user_id') || getActorId() || '';

                let extractedUsers = [];
                const isOnHideStoryPage = window.location.pathname.includes('/accounts/hide_story_and_live_from/');

                // 1. Se solicitada varredura profunda ou se já estiver na tela oficial de Ocultar Story
                if (forceScroll || isOnHideStoryPage) {
                    if (!isOnHideStoryPage) {
                        // Navega transparentemente para a rota oficial sem descarregar o modal
                        history.pushState(null, null, '/accounts/hide_story_and_live_from/');
                        window.dispatchEvent(new Event('popstate'));
                        await new Promise(r => setTimeout(r, 1200));
                    }
                    if (refreshBtn) refreshBtn.textContent = "🔄 Mapeando tela oficial...";
                    extractedUsers = await extractHideStoryUsernames(document);
                } else {
                    extractedUsers = await extractHideStoryFromCurrentDomOrFetch();
                }

                // 2. Busca tela oficial via WBloks (contém as contas ocultadas e o cursor de paginação) como garantia
                if (extractedUsers.length === 0 || !window._igHideStoryLastCursor) {
                    try {
                        if (refreshBtn) refreshBtn.textContent = "🔄 Buscando WBloks...";
                        const wbloksUsers = await fetchHideStoryInitialScreen();
                        if (Array.isArray(wbloksUsers) && wbloksUsers.length > 0) {
                            wbloksUsers.forEach(u => {
                                if (!extractedUsers.some(x => x.username.toLowerCase() === u.username.toLowerCase())) {
                                    extractedUsers.push({
                                        username: u.username,
                                        pk: u.pk || '',
                                        id: u.pk || '',
                                        fullName: u.fullName || '',
                                        photoUrl: (u.photoUrl && !u.photoUrl.includes('rsrc.php')) ? u.photoUrl : DEFAULT_AVATAR,
                                        isHidden: !!(u.isChecked || u.isHidden)
                                    });
                                }
                            });
                        }
                    } catch (werr) {
                        console.warn('[IG Tools HideStory] Falha no fetchHideStoryInitialScreen:', werr);
                    }
                }

                const map = new Map();

                // As contas detectadas como ocultadas são a verdade estrita
                const hiddenUsernames = new Set(
                    extractedUsers.filter(u => u.isHidden).map(u => u.username.toLowerCase())
                );

                // Popula contas ocultadas prioritariamente com resolução inteligente de fotos
                if (Array.isArray(extractedUsers) && extractedUsers.length > 0) {
                    extractedUsers.forEach(u => {
                        if (!u.username || !isValidInstagramUsername(u.username)) return;
                        const k = u.username.toLowerCase().trim();
                        const uidStr = String(u.pk || u.id || '');
                        if (k === myUname || (myUid && uidStr === myUid)) return;

                        const photo = resolveUserPhoto(u.username, u.photoUrl);
                        map.set(k, {
                            username: u.username,
                            pk: u.pk || getCachedUserId(u.username) || '',
                            id: u.pk || getCachedUserId(u.username) || '',
                            fullName: u.fullName || '',
                            photoUrl: photo,
                            isHidden: hiddenUsernames.has(k)
                        });
                        if (u.pk) setCachedUserId(u.username, u.pk);
                    });
                }

                // Renderiza imediatamente os dados iniciais obtidos
                hideStoryList = Array.from(map.values()).filter(u => {
                    const k = (u.username || '').toLowerCase().trim();
                    const uidStr = String(u.pk || u.id || '');
                    return k && isValidInstagramUsername(k) && k !== myUname && (!myUid || uidStr !== myUid);
                });
                cachedHideStory = hideStoryList;
                renderList(currentPage);
                updateCounts();

                // 3. Paginação WBloks oficial (com.instagram.pagination.async) para puxar contas adicionais
                if (window._igHideStoryLastCursor) {
                    let curCursor = window._igHideStoryLastCursor;
                    let containerId = window._igHideStoryContainerId || "1178138719";
                    let loadingId = window._igHideStoryLoadingId || "1178138721";
                    let pagesLoaded = 0;
                    const maxPages = 60;

                    while (curCursor && pagesLoaded < maxPages) {
                        pagesLoaded++;
                        if (refreshBtn) refreshBtn.textContent = `🔄 Paginação (${pagesLoaded})...`;
                        const syncInfo = document.getElementById("hsSyncInfo");
                        if (syncInfo) syncInfo.innerText = `Carregando página ${pagesLoaded} de contas...`;

                        const pageRes = await fetchHideStoryPagination(curCursor, containerId, loadingId);
                        if (pageRes && Array.isArray(pageRes.users) && pageRes.users.length > 0) {
                            pageRes.users.forEach(u => {
                                const k = (u.username || '').toLowerCase().trim();
                                if (!k || k === myUname || (myUid && String(u.pk) === String(myUid))) return;
                                if (!map.has(k)) {
                                    const photo = resolveUserPhoto(u.username, u.photoUrl);
                                    map.set(k, {
                                        username: u.username,
                                        pk: u.pk || '',
                                        id: u.pk || '',
                                        fullName: u.fullName || '',
                                        photoUrl: photo,
                                        isHidden: hiddenUsernames.has(k)
                                    });
                                    if (u.pk) setCachedUserId(u.username, u.pk);
                                }
                            });
                            curCursor = pageRes.nextCursor;
                            window._igHideStoryLastCursor = curCursor;

                            hideStoryList = Array.from(map.values()).filter(u => {
                                const k = (u.username || '').toLowerCase().trim();
                                const uidStr = String(u.pk || u.id || '');
                                return k && isValidInstagramUsername(k) && k !== myUname && (!myUid || uidStr !== myUid);
                            });
                            cachedHideStory = hideStoryList;
                            renderList(currentPage);
                            updateCounts();

                            if (!curCursor) break;
                            await new Promise(r => setTimeout(r, 250));
                        } else {
                            break;
                        }
                    }
                }

                // 4. Carrega lista de Seguidores e Seguindo para compor os filtros
                let followersAccounts = [];
                let followingAccounts = [];
                try {
                    const [dbFollowers, dbFollowing] = await Promise.all([
                        dbHelper.loadCache('followers') || dbHelper.getCache('followers'),
                        dbHelper.loadCache('following') || dbHelper.getCache('following')
                    ]);
                    if (Array.isArray(dbFollowers)) followersAccounts = dbFollowers;
                    else if (dbFollowers?.details) followersAccounts = Array.from(dbFollowers.details.values());

                    if (Array.isArray(dbFollowing)) followingAccounts = dbFollowing;
                    else if (dbFollowing?.details) followingAccounts = Array.from(dbFollowing.details.values());
                } catch (_) { }

                if (followersAccounts.length === 0) {
                    try {
                        const raw = localStorage.getItem('ig_tools_cache_followers') || localStorage.getItem('ig_tools_cached_followers');
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (Array.isArray(parsed)) followersAccounts = parsed;
                        }
                    } catch (_) { }
                }
                if (followingAccounts.length === 0) {
                    try {
                        const raw = localStorage.getItem('ig_tools_cache_following') || localStorage.getItem('ig_tools_cached_following');
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (Array.isArray(parsed)) followingAccounts = parsed;
                        }
                    } catch (_) { }
                }
                const cachedData = window.cachedData;
                if (followingAccounts.length === 0 && typeof cachedData !== 'undefined' && cachedData?.seguindo) {
                    followingAccounts = Array.from(cachedData.seguindo).map(u => ({
                        username: u,
                        photoUrl: resolveUserPhoto(u, cachedData.userDetails?.get(u)?.photoUrl),
                        fullName: cachedData.userDetails?.get(u)?.fullName || ''
                    }));
                }
                if (followersAccounts.length === 0 && typeof cachedData !== 'undefined' && cachedData?.seguidores) {
                    followersAccounts = Array.from(cachedData.seguidores).map(u => ({
                        username: u,
                        photoUrl: resolveUserPhoto(u, cachedData.userDetails?.get(u)?.photoUrl),
                        fullName: cachedData.userDetails?.get(u)?.fullName || ''
                    }));
                }

                followersAccounts.forEach(f => {
                    const uname = typeof f === 'string' ? f : f.username;
                    if (!uname || !isValidInstagramUsername(uname)) return;
                    const k = uname.toLowerCase().trim();
                    followersSet.add(k);
                    const uidStr = String((typeof f === 'object' && (f.pk || f.id)) ? (f.pk || f.id) : '');
                    if (k === myUname || (myUid && uidStr === myUid)) return;
                    const photo = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
                    if (!map.has(k)) {
                        const pk = uidStr || (getCachedUserId(uname) || '');
                        map.set(k, {
                            username: uname,
                            pk: pk,
                            id: pk,
                            fullName: (typeof f === 'object' && f.fullName) ? f.fullName : '',
                            photoUrl: photo,
                            isHidden: hiddenUsernames.has(k)
                        });
                    } else {
                        const existing = map.get(k);
                        if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photo !== DEFAULT_AVATAR) {
                            existing.photoUrl = photo;
                        }
                        if (!existing.fullName && typeof f === 'object' && f.fullName) {
                            existing.fullName = f.fullName;
                        }
                    }
                });

                followingAccounts.forEach(f => {
                    const uname = typeof f === 'string' ? f : f.username;
                    if (!uname || !isValidInstagramUsername(uname)) return;
                    const k = uname.toLowerCase().trim();
                    followingSet.add(k);
                    const uidStr = String((typeof f === 'object' && (f.pk || f.id)) ? (f.pk || f.id) : '');
                    if (k === myUname || (myUid && uidStr === myUid)) return;
                    const photo = resolveUserPhoto(uname, (typeof f === 'object' && f.photoUrl) ? f.photoUrl : null);
                    if (!map.has(k)) {
                        const pk = uidStr || (getCachedUserId(uname) || '');
                        map.set(k, {
                            username: uname,
                            pk: pk,
                            id: pk,
                            fullName: (typeof f === 'object' && f.fullName) ? f.fullName : '',
                            photoUrl: photo,
                            isHidden: hiddenUsernames.has(k)
                        });
                    } else {
                        const existing = map.get(k);
                        if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photo !== DEFAULT_AVATAR) {
                            existing.photoUrl = photo;
                        }
                        if (!existing.fullName && typeof f === 'object' && f.fullName) {
                            existing.fullName = f.fullName;
                        }
                    }
                });

                hideStoryList = Array.from(map.values()).filter(u => {
                    const k = (u.username || '').toLowerCase().trim();
                    const uidStr = String(u.pk || u.id || '');
                    return k && isValidInstagramUsername(k) && k !== myUname && (!myUid || uidStr !== myUid);
                });
                cachedHideStory = hideStoryList;

                try {
                    localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(hideStoryList));
                    const hiddenOnly = hideStoryList.filter(u => u.isHidden);
                    await dbHelper.saveCache('hiddenStory', hiddenOnly);
                    await dbHelper.saveCache('hideStory', hiddenOnly);
                    const userListCache = window.userListCache || {};
                    if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                    userListCache.hiddenStory = new Set(hiddenOnly.map(u => u.username));
                } catch (_) { }

                const syncInfo = div.querySelector("#hsSyncInfo");
                if (syncInfo) {
                    syncInfo.innerText = `Sincronizado às ${new Date().toLocaleTimeString()}`;
                }

                const hiddenTotal = hideStoryList.filter(u => u.isHidden).length;
                const notHiddenTotal = hideStoryList.filter(u => !u.isHidden).length;

                renderList(1);
                updateCounts();
                showToast(`Sincronização concluída! ${hiddenTotal} stories ocultados | ${notHiddenTotal} sem ocultar.`);
            } catch (err) {
                console.error('[IG Tools HideStory] Erro ao sincronizar:', err);
                showToast("Falha ao sincronizar Ocultar Story.");
            } finally {
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = "🔄 Sincronizar";
                }
            }
        }

        // Ação do botão Sincronizar
        const btnRefresh = div.querySelector("#hsRefreshBtn");
        if (btnRefresh) {
            btnRefresh.onclick = () => {
                sincronizarHideStory(true);
            };
        }

        // Ação do botão Tela Oficial (0ms)
        const openOfficialBtn = div.querySelector("#hsOpenOfficialPageBtn");
        if (openOfficialBtn) {
            openOfficialBtn.onclick = async () => {
                if (!window.location.pathname.includes('/accounts/hide_story_and_live_from/')) {
                    history.pushState(null, null, '/accounts/hide_story_and_live_from/');
                    window.dispatchEvent(new Event('popstate'));
                    await new Promise(r => setTimeout(r, 1000));
                }
                await sincronizarHideStory(true);
            };
        }

        // Modal de Importação JSON
        const jsonFileInput = div.querySelector("#hsJsonFileInput");
        const btnImportJson = div.querySelector("#hsImportJsonBtn");
        if (btnImportJson) {
            btnImportJson.onclick = () => {
                const importModal = document.createElement("div");
                importModal.className = "submenu-modal";
                importModal.style.cssText = `
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 90%; max-width: 520px; border-radius: 12px; padding: 20px;
                    z-index: 10002; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    background: white; color: black; border: 1px solid #ccc;
                `;
                if (loadSettings().rgbBorder) importModal.classList.add('rgb-border-effect');

                importModal.innerHTML = `
                    <div class="modal-header" style="margin-bottom: 12px;">
                        <h3 style="margin: 0; font-size: 16px;">📥 Importar Lista de Ocultar Story (JSON)</h3>
                        <button id="closeHsImportModal" style="background: none; border: none; font-size: 16px; cursor: pointer; color: inherit;">✖</button>
                    </div>
                    <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">
                        Cole o JSON abaixo ou selecione um arquivo <code>.json</code> exportado do Instagram ou do assistente.
                    </p>
                    <textarea id="hsJsonTextInput" placeholder='Exemplo: ["usuario1", "usuario2"] ou [{"username": "usuario1"}]' style="width: 100%; height: 160px; box-sizing: border-box; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                        <button id="hsUploadFileBtn" style="background: #34495e; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-size: 13px;">📁 Escolher Arquivo</button>
                        <div style="display: flex; gap: 8px;">
                            <button id="cancelHsImportBtn" style="background: #e74c3c; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-size: 13px;">Cancelar</button>
                            <button id="confirmHsImportBtn" style="background: #8e44ad; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: 600; font-size: 13px;">Processar JSON</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(importModal);

                const closeImport = () => importModal.remove();
                document.getElementById("closeHsImportModal").onclick = closeImport;
                document.getElementById("cancelHsImportBtn").onclick = closeImport;

                document.getElementById("hsUploadFileBtn").onclick = () => jsonFileInput.click();

                jsonFileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        const area = document.getElementById("hsJsonTextInput");
                        if (area) area.value = re.target.result;
                    };
                    reader.readAsText(file);
                };

                document.getElementById("confirmHsImportBtn").onclick = async () => {
                    const raw = document.getElementById("hsJsonTextInput").value.trim();
                    if (!raw) return alert("Por favor, cole o conteúdo do JSON ou faça upload de um arquivo.");

                    try {
                        const parsed = JSON.parse(raw);
                        const importedUsers = [];

                        function parseEntry(item) {
                            if (typeof item === 'string') return item.trim();
                            if (typeof item === 'object' && item !== null) {
                                if (item.username) return item.username.trim();
                                if (item.string_list_data && Array.isArray(item.string_list_data) && item.string_list_data[0]?.value) {
                                    return item.string_list_data[0].value.trim();
                                }
                                if (item.title && typeof item.title === 'string' && !item.title.includes(' ')) {
                                    return item.title.trim();
                                }
                            }
                            return null;
                        }

                        if (Array.isArray(parsed)) {
                            parsed.forEach(p => {
                                const u = parseEntry(p);
                                if (u) importedUsers.push(u);
                            });
                        } else if (typeof parsed === 'object' && parsed !== null) {
                            const candidateArrays = [
                                parsed.relationships_hide_stories_from,
                                parsed.story_settings,
                                parsed.hide_story,
                                parsed.users
                            ];
                            for (const arr of candidateArrays) {
                                if (Array.isArray(arr)) {
                                    arr.forEach(p => {
                                        const u = parseEntry(p);
                                        if (u) importedUsers.push(u);
                                    });
                                }
                            }
                        }

                        if (importedUsers.length === 0) {
                            alert("Não foi possível identificar nomes de usuário válidos no JSON fornecido.");
                            return;
                        }

                        const map = new Map();
                        hideStoryList.forEach(u => map.set(u.username.toLowerCase(), u));

                        let newAdditions = 0;
                        importedUsers.forEach(uname => {
                            const k = uname.toLowerCase();
                            if (map.has(k)) {
                                map.get(k).isHidden = true;
                            } else {
                                map.set(k, {
                                    username: uname,
                                    pk: getCachedUserId(uname) || '',
                                    id: getCachedUserId(uname) || '',
                                    fullName: '',
                                    photoUrl: DEFAULT_AVATAR,
                                    isHidden: true
                                });
                                newAdditions++;
                            }
                        });

                        hideStoryList = Array.from(map.values());
                        cachedHideStory = hideStoryList;

                        try {
                            localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(hideStoryList));
                            await dbHelper.saveCache('hideStory', hideStoryList.filter(u => u.isHidden));
                        } catch (_) { }

                        closeImport();
                        renderList(1);
                        updateCounts();
                        alert(`Importação realizada com sucesso! ${importedUsers.length} usuários processados (+${newAdditions} novos adicionados).`);
                    } catch (e) {
                        alert("Erro ao interpretar arquivo JSON. Verifique a sintaxe: " + e.message);
                    }
                };
            };
        }

        // Seleção rápida da página atual
        const btnSelectPage = div.querySelector("#hsSelectPageBtn");
        if (btnSelectPage) {
            btnSelectPage.onclick = () => {
                const itemsPerPage = loadSettings().itemsPerPage || 10;
                const startIndex = (currentPage - 1) * itemsPerPage;
                const searchTerm = (div.querySelector('#hsSearchInput')?.value || '').toLowerCase().trim();
                const filterValue = div.querySelector('#hsFilterSelect')?.value || 'all';

                let listToSelect = hideStoryList.filter(u => {
                    const uLower = (u.username || '').toLowerCase().trim();
                    const fLower = (u.fullName || '').toLowerCase().trim();
                    const pkStr = String(u.pk || u.id || '');
                    const matchSearch = !searchTerm || uLower.includes(searchTerm) || fLower.includes(searchTerm) || pkStr.includes(searchTerm);
                    if (!matchSearch) return false;

                    if (filterValue === 'hidden') return u.isHidden;
                    if (filterValue === 'not_hidden') return !u.isHidden;
                    if (filterValue === 'followers') return followersSet.has(uLower);
                    if (filterValue === 'following') return followingSet.has(uLower);
                    return true;
                });

                const pageUsers = listToSelect.slice(startIndex, startIndex + itemsPerPage);
                pageUsers.forEach(u => selectedUsers.add(u.username));
                container.querySelectorAll('.hs-user-checkbox').forEach(cb => cb.checked = true);
                updateCounts(pageUsers);
            };
        }

        const btnDeselectAll = div.querySelector("#hsDeselectAllBtn");
        if (btnDeselectAll) {
            btnDeselectAll.onclick = () => {
                selectedUsers.clear();
                container.querySelectorAll('.hs-user-checkbox').forEach(cb => cb.checked = false);
                updateCounts();
            };
        }

        const searchInput = div.querySelector("#hsSearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", () => renderList(1));
        }

        const filterSelect = div.querySelector("#hsFilterSelect");
        if (filterSelect) {
            filterSelect.addEventListener("change", () => {
                currentPage = 1;
                renderList(1);
                updateCounts();
            });
        }

        const apiToggle = div.querySelector("#hsUseApiToggle");
        if (apiToggle) {
            apiToggle.addEventListener("change", (e) => {
                const s = loadSettings();
                s.useApi = e.target.checked;
                saveSettings(s);
                showToast(`Modo API ${s.useApi ? 'ativado' : 'desativado'}.`);
            });
        }

        // AÇÃO EM LOTE: Ocultar Selecionados
        const btnHideSelected = div.querySelector("#hsHideSelectedBtn");
        if (btnHideSelected) {
            btnHideSelected.onclick = async () => {
                if (selectedUsers.size === 0) {
                    alert("Nenhum usuário selecionado.");
                    return;
                }

                const usersToHide = Array.from(selectedUsers).filter(uname => {
                    const u = hideStoryList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                    return u && !u.isHidden;
                });

                if (usersToHide.length === 0) {
                    alert("Todos os usuários selecionados já estão com seus stories ocultados.");
                    return;
                }

                if (!confirm(`Deseja ocultar seus stories para ${usersToHide.length} usuário(s)?`)) return;

                const hideBtn = div.querySelector("#hsHideSelectedBtn") || btnHideSelected;
                if (hideBtn) {
                    hideBtn.disabled = true;
                    hideBtn.textContent = "Processando...";
                }

                let successCount = 0;
                const delayMs = loadSettings().requestDelay || 350;

                for (let i = 0; i < usersToHide.length; i++) {
                    const uname = usersToHide[i];
                    const uObj = hideStoryList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                    const uid = uObj?.pk || uObj?.id || getCachedUserId(uname) || '';
                    if (hideBtn) hideBtn.textContent = `Processando (${i + 1}/${usersToHide.length})...`;

                    try {
                        const res = await executeWbloksHideStory(uid, uname, 'hide');
                        if (res && res.success) {
                            if (uObj) uObj.isHidden = true;
                            const userListCache = window.userListCache || {};
                            if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                            userListCache.hiddenStory.add(uname.toLowerCase());
                            successCount++;
                        }
                    } catch (e) {
                        console.warn(`[IG Tools HideStory] Falha ao ocultar @${uname}:`, e);
                    }

                    if (i < usersToHide.length - 1) {
                        await new Promise(r => setTimeout(r, delayMs));
                    }
                }

                cachedHideStory = hideStoryList;
                try {
                    localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(hideStoryList));
                    dbHelper.saveCache('hideStory', hideStoryList.filter(u => u.isHidden));
                    const userListCache = window.userListCache || {};
                    if (userListCache.hiddenStory) {
                        dbHelper.saveCache('hiddenStory', Array.from(userListCache.hiddenStory));
                    }
                } catch (_) { }

                selectedUsers.clear();
                renderList(currentPage);
                updateCounts();

                if (hideBtn) {
                    hideBtn.disabled = false;
                    hideBtn.textContent = "👁️‍🗨️ Ocultar Selecionados";
                }

                showToast(`Sucesso! Stories ocultados para ${successCount} usuário(s).`);
            };
        }

        // AÇÃO EM LOTE: Reexibir Selecionados
        const btnUnhideSelected = div.querySelector("#hsUnhideSelectedBtn");
        if (btnUnhideSelected) {
            btnUnhideSelected.onclick = async () => {
                if (selectedUsers.size === 0) {
                    alert("Nenhum usuário selecionado.");
                    return;
                }

                const usersToUnhide = Array.from(selectedUsers).filter(uname => {
                    const u = hideStoryList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                    return u && u.isHidden;
                });

                if (usersToUnhide.length === 0) {
                    alert("Nenhum dos usuários selecionados está com o story ocultado.");
                    return;
                }

                if (!confirm(`Deseja reexibir seus stories para ${usersToUnhide.length} usuário(s)?`)) return;

                const unhideBtn = div.querySelector("#hsUnhideSelectedBtn") || btnUnhideSelected;
                if (unhideBtn) {
                    unhideBtn.disabled = true;
                    unhideBtn.textContent = "Processando...";
                }

                let successCount = 0;
                const delayMs = loadSettings().requestDelay || 350;

                for (let i = 0; i < usersToUnhide.length; i++) {
                    const uname = usersToUnhide[i];
                    const uObj = hideStoryList.find(x => x.username.toLowerCase() === uname.toLowerCase());
                    const uid = uObj?.pk || uObj?.id || getCachedUserId(uname) || '';
                    if (unhideBtn) unhideBtn.textContent = `Processando (${i + 1}/${usersToUnhide.length})...`;

                    try {
                        const res = await executeWbloksHideStory(uid, uname, 'unhide');
                        if (res && res.success) {
                            if (uObj) uObj.isHidden = false;
                            const userListCache = window.userListCache || {};
                            if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                            userListCache.hiddenStory.delete(uname.toLowerCase());
                            successCount++;
                        }
                    } catch (e) {
                        console.warn(`[IG Tools HideStory] Falha ao reexibir @${uname}:`, e);
                    }

                    if (i < usersToUnhide.length - 1) {
                        await new Promise(r => setTimeout(r, delayMs));
                    }
                }

                cachedHideStory = hideStoryList;
                try {
                    localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(hideStoryList));
                    dbHelper.saveCache('hideStory', hideStoryList.filter(u => u.isHidden));
                    const userListCache = window.userListCache || {};
                    if (userListCache.hiddenStory) {
                        dbHelper.saveCache('hiddenStory', Array.from(userListCache.hiddenStory));
                    }
                } catch (_) { }

                selectedUsers.clear();
                renderList(currentPage);
                updateCounts();

                if (unhideBtn) {
                    unhideBtn.disabled = false;
                    unhideBtn.textContent = "👁️ Reexibir Selecionados";
                }

                showToast(`Sucesso! Stories reexibidos para ${successCount} usuário(s).`);
            };
        }

        // Real-time listener para novos usuários capturados via rolagem na página nativa
        const captureCallback = (newUsers) => {
            let added = 0;
            newUsers.forEach(u => {
                const uname = (u.username || '').toLowerCase().trim();
                if (!uname || uname === myUname || (myUid && String(u.pk) === String(myUid))) return;
                const existing = hideStoryList.find(x => x.username.toLowerCase() === uname);
                const photo = resolveUserPhoto(u.username, u.photoUrl);
                const isHid = !!(u.isHidden || u.isChecked);
                if (!existing) {
                    hideStoryList.push({
                        username: u.username,
                        pk: u.pk || '',
                        id: u.pk || '',
                        fullName: u.fullName || '',
                        photoUrl: photo,
                        isHidden: isHid
                    });
                    added++;
                } else {
                    if (isHid && !existing.isHidden) {
                        existing.isHidden = true;
                        added++;
                    }
                    if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photo !== DEFAULT_AVATAR) {
                        existing.photoUrl = photo;
                    }
                    if (!existing.fullName && u.fullName) existing.fullName = u.fullName;
                }
            });
            if (added > 0) {
                updateCounts();
                renderList(currentPage);
            }
        };
        if (window._igHideStoryUsersCapture) {
            window._igHideStoryUsersCapture.callbacks.push(captureCallback);
        }

        // Inicialização imediata da lista
        renderList(1);
        updateCounts();

        // Dispara sincronização silenciosa em segundo plano para garantir captura de histórias ocultadas e sugestões
        if (hideStoryList.length === 0 || !hideStoryList.some(u => u.isHidden) || hideStoryList.length < 50) {
            sincronizarHideStory(false).then(() => {
                renderList(currentPage);
                updateCounts();
            });
        }
        window.__isOpeningHideStoryModal = false;
    }

    // Exportação para o barramento global
    const hideStoryModule = {
        scanHideStoryDomRows,
        extractHideStoryUsernames,
        extractHideStoryFromCurrentDomOrFetch,
        fetchHideStoryInitialScreen,
        fetchHideStoryPagination,
        abrirModalOcultarStory,
        executeWbloksHideStory
    };

    window.IGTools.HideStory = hideStoryModule;

    // Aliases globais de retrocompatibilidade
    window.scanHideStoryDomRows = scanHideStoryDomRows;
    window.extractHideStoryUsernames = extractHideStoryUsernames;
    window.extractHideStoryFromCurrentDomOrFetch = extractHideStoryFromCurrentDomOrFetch;
    window.fetchHideStoryInitialScreen = fetchHideStoryInitialScreen;
    window.fetchHideStoryPagination = fetchHideStoryPagination;
    window.abrirModalOcultarStory = abrirModalOcultarStory;
})();
