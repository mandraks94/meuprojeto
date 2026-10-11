// ==UserScript==
// @name         Instagram_novo_2
// @description  Adds download buttons to Instagram stories
// @author       You
// @version      1.0
// @match        https://www.instagram.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @connect      www.googleapis.com
// @connect      accounts.google.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
    'use strict';
    console.log("[IG Tools] Script injetado e rodando.");

    function initScript() {
        if (window.location.href.includes("instagram.com")) {

            // Utilitários de DOM e Notificações (modularizados em src/core/dom-utils.js)
            const showToast = window.IGTools?.DOMUtils?.showToast || window.showToast;
            const playAlertSound = window.IGTools?.DOMUtils?.playAlertSound || window.playAlertSound;
            const showUnfollowFloatingPopup = window.IGTools?.DOMUtils?.showUnfollowFloatingPopup || window.showUnfollowFloatingPopup;
            const toggleLoading = window.IGTools?.DOMUtils?.toggleLoading || window.toggleLoading;

            // --- CONFIGURAÇÃO GOOGLE DRIVE ---
            const GDRIVE_CONFIG = {
                clientId: '118908063115-j6fj7f069urt69vh5fa6ha1luh4fgvea.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/drive.appdata', // Usa a pasta oculta de dados do app
                fileName: 'ig_tools_data.json'
            };

            // Interface de armazenamento segura (Fallback para localStorage caso o Tampermonkey falhe)
            const storage = {
                get: (key) => {
                    try {
                        return typeof GM_getValue !== 'undefined' ? GM_getValue(key) : localStorage.getItem('ig_tools_' + key);
                    } catch (e) { return localStorage.getItem('ig_tools_' + key); }
                },
                set: (key, val) => {
                    try {
                        if (typeof GM_setValue !== 'undefined') GM_setValue(key, val);
                        localStorage.setItem('ig_tools_' + key, val);
                    } catch (e) { localStorage.setItem('ig_tools_' + key, val); }
                }
            };

            const googleAuth = {
                getAccessToken: () => {
                    const token = storage.get('gdrive_token');
                    if (!token) return null;
                    const savedTime = Number(localStorage.getItem('ig_tools_gdrive_token_timestamp')) || 0;
                    const expiresIn = Number(localStorage.getItem('ig_tools_gdrive_expires_in')) || 3600;
                    // O Google expira o access_token em 1 hora. Se passou a validade, limpa automaticamente
                    if (savedTime && (Date.now() - savedTime > (expiresIn - 60) * 1000)) {
                        console.log("[IG Tools] Sessão do Google Drive expirada.");
                        googleAuth.setAccessToken(null);
                        return null;
                    }
                    return token;
                },
                isConnected: function () {
                    return !!this.getAccessToken();
                },
                setAccessToken: (token) => {
                    storage.set('gdrive_token', token);
                    if (!token) {
                        try {
                            localStorage.removeItem('ig_tools_gdrive_token');
                            localStorage.removeItem('ig_tools_gdrive_token_timestamp');
                            localStorage.removeItem('ig_tools_gdrive_expires_in');
                        } catch (_) { }
                    }
                },

                login: function () {
                    if (GDRIVE_CONFIG.clientId.includes('SEU_CLIENT_ID')) {
                        alert("ERRO: Você precisa configurar seu Client ID do Google Cloud no código!");
                        window.open('https://console.cloud.google.com/');
                        return;
                    }
                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GDRIVE_CONFIG.clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/')}&response_type=token&scope=${encodeURIComponent(GDRIVE_CONFIG.scope)}`;
                    window.location.href = authUrl;
                },

                checkUrlToken: function () {
                    const hash = window.location.hash;
                    if (hash && hash.includes('access_token=')) {
                        console.log("[IG Tools] Hash detectado após login.");
                        const params = new URLSearchParams(hash.substring(1));
                        const token = params.get('access_token');
                        const expiresIn = Number(params.get('expires_in')) || 3600;
                        console.log("[IG Tools] Sucesso! Token Google Drive recebido.");
                        this.setAccessToken(token);
                        try {
                            localStorage.setItem('ig_tools_gdrive_token', token);
                            localStorage.setItem('ig_tools_gdrive_token_timestamp', String(Date.now()));
                            localStorage.setItem('ig_tools_gdrive_expires_in', String(expiresIn));
                        } catch (_) { }
                        showToast("✅ Google Drive conectado com sucesso!");
                        window.location.hash = ''; // Limpa a URL apenas após salvar
                    }
                }
            };
            googleAuth.checkUrlToken();
            window.googleAuth = googleAuth;
            if (window.IGTools && window.IGTools.Storage) {
                window.IGTools.Storage.googleAuth = googleAuth;
            }

            // Alerta discreto no carregamento caso o Google Drive não esteja conectado
            if (!googleAuth.isConnected()) {
                console.log("[IG Tools] Google Drive desconectado. Operando com armazenamento local.");
                const hasWarnedThisSession = sessionStorage.getItem('ig_tools_gdrive_warned');
                if (!hasWarnedThisSession) {
                    sessionStorage.setItem('ig_tools_gdrive_warned', 'true');
                    setTimeout(() => {
                        showToast("☁️ Google Drive desconectado. Conecte nas Configurações para sincronizar seu backup.");
                    }, 4000);
                }
            }

            const gDriveApi = {
                execute: function (options) {
                    const token = googleAuth.getAccessToken();
                    if (!token) {
                        showToast("⚠️ Faça login no Google nas Configurações");
                        return Promise.reject("Sem token");
                    }
                    return new Promise((resolve, reject) => {
                        const httpHandler = (typeof GM_xmlhttpRequest !== 'undefined')
                            ? GM_xmlhttpRequest
                            : (window.IGTools?.HttpClient?.request || null);

                        if (httpHandler) {
                            try {
                                httpHandler({
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
                                        } else if (res.status === 401) {
                                            googleAuth.setAccessToken(null);
                                            resolve({});
                                        } else {
                                            resolve({});
                                        }
                                    },
                                    onerror: () => {
                                        resolve({});
                                    }
                                });
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error("Canal HTTP da extensão indisponível."));
                        }
                    });
                },

                getFileId: async function () {
                    const data = await this.execute({
                        method: 'GET',
                        url: `https://www.googleapis.com/drive/v3/files?q=name='${GDRIVE_CONFIG.fileName}'&spaces=appDataFolder`
                    });
                    if (data.files && data.files.length > 0) {
                        console.log("[IG Tools] Arquivo encontrado no Drive ID:", data.files[0].id);
                        return data.files[0].id;
                    }
                    return null;
                },

                saveData: async function (allData) {
                    let fileId = await this.getFileId();
                    const method = fileId ? 'PATCH' : 'POST';
                    const url = fileId
                        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
                        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

                    if (!fileId) {
                        // Criação inicial (Multipart)
                        console.log("[IG Tools] Criando novo arquivo no Google Drive...");
                        const metadata = { name: GDRIVE_CONFIG.fileName, parents: ['appDataFolder'] };
                        const body = `--foo\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(allData)}\r\n--foo--`;
                        return this.execute({
                            method,
                            url,
                            headers: { 'Content-Type': 'multipart/related; boundary=foo' },
                            data: body
                        });
                    } else {
                        // Atualização simples
                        console.log("[IG Tools] Atualizando arquivo existente no Drive...");
                        return this.execute({ method, url, data: JSON.stringify(allData) });
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
                        // O execute retorna o texto se não for JSON, então parseamos aqui
                        return typeof response === 'string' ? JSON.parse(response) : response;
                    } catch (e) {
                        console.error("[IG Tools] Erro ao parsear dados do arquivo:", e);
                        return {};
                    }
                }
            };

            const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;

            // Helper para Cookie
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            }

            function getActorId() {
                const dsUser = getCookie('ds_user_id');
                if (dsUser && dsUser !== '936619743392459') return dsUser;
                try {
                    const rur = getCookie('rur') || '';
                    const decoded = decodeURIComponent(rur).replace(/\\054/g, ',');
                    const match = decoded.match(/,\s*(\d{5,15})\s*,/);
                    if (match && match[1] && match[1] !== '936619743392459') return match[1];
                } catch (_) { }
                return '';
            }

            function getLoggedInUsername() {
                try {
                    if (window._sharedData?.config?.viewer?.username) return window._sharedData.config.viewer.username.toLowerCase();
                    if (window.__initialData?.data?.viewer?.username) return window.__initialData.data.viewer.username.toLowerCase();
                    if (window.__cu?.username) return window.__cu.username.toLowerCase();

                    // Se estiver no próprio perfil (detectado pelo botão "Editar perfil" ou similares no DOM)
                    if (document.querySelector('a[href*="/accounts/edit/"]') || document.querySelector('a[href*="/archive/stories/"]')) {
                        const h2 = document.querySelector('header h2, header h1, section main header h2');
                        if (h2 && h2.textContent) {
                            const u = h2.textContent.trim().toLowerCase();
                            if (u && !u.includes(' ') && u.length >= 2) {
                                try { localStorage.setItem('ig_tools_logged_user', u); } catch (_) { }
                                return u;
                            }
                        }
                        const firstSeg = window.location.pathname.split('/').filter(Boolean)[0];
                        if (firstSeg && !['accounts', 'direct', 'explore', 'reels', 'stories'].includes(firstSeg.toLowerCase())) {
                            try { localStorage.setItem('ig_tools_logged_user', firstSeg.toLowerCase()); } catch (_) { }
                            return firstSeg.toLowerCase();
                        }
                    }

                    // Avatar de perfil no menu lateral/navegação
                    const navProfileLink = document.querySelector('div[role="navigation"] a[href^="/"][role="link"] img[alt*="perfil"], div[role="navigation"] a[href^="/"][role="link"] img[alt*="profile"], nav a[href^="/"] img[alt*="perfil"]');
                    if (navProfileLink) {
                        const href = navProfileLink.closest('a')?.getAttribute('href') || '';
                        const clean = href.replace(/\//g, '').trim().toLowerCase();
                        if (clean && !['accounts', 'direct', 'explore', 'reels', 'stories'].includes(clean)) {
                            try { localStorage.setItem('ig_tools_logged_user', clean); } catch (_) { }
                            return clean;
                        }
                    }

                    // Links de perfil com avatar próprio
                    const selfLink = document.querySelector('a[href^="/"][role="link"]:has(img[data-testid="user-avatar"]), a[href^="/"]:has(img[alt*="foto do perfil"]), a[href^="/"]:has(img[alt*="profile photo"])');
                    if (selfLink) {
                        const href = selfLink.getAttribute('href') || '';
                        const clean = href.replace(/\//g, '').trim().toLowerCase();
                        if (clean && !['accounts', 'direct', 'explore', 'reels', 'stories'].includes(clean)) {
                            try { localStorage.setItem('ig_tools_logged_user', clean); } catch (_) { }
                            return clean;
                        }
                    }

                    // Busca em links do menu lateral por texto "Perfil" ou "Profile"
                    const navLinks = document.querySelectorAll('div[role="navigation"] a[href^="/"], nav a[href^="/"]');
                    const systemWords = ['accounts', 'direct', 'explore', 'reels', 'stories', 'p', 'reel'];
                    for (const a of navLinks) {
                        const txt = (a.textContent || '').toLowerCase();
                        const aria = (a.getAttribute('aria-label') || '').toLowerCase();
                        if (txt.includes('perfil') || txt.includes('profile') || aria.includes('perfil') || aria.includes('profile')) {
                            const href = a.getAttribute('href') || '';
                            const clean = href.replace(/\//g, '').trim().toLowerCase();
                            if (clean && !systemWords.includes(clean)) {
                                try { localStorage.setItem('ig_tools_logged_user', clean); } catch (_) { }
                                return clean;
                            }
                        }
                    }

                    const cached = localStorage.getItem('ig_tools_logged_user');
                    if (cached && /^[a-zA-Z0-9._]+$/.test(cached)) return cached.toLowerCase();
                } catch (_) { }
                return '';
            }

            async function resolveTargetOrLoggedUsername() {
                // 1. Se estiver no perfil de alguém (ou no próprio perfil), usa esse perfil
                const profUser = (typeof getProfilePageUsername === 'function') ? getProfilePageUsername() : null;
                if (profUser) {
                    return profUser;
                }

                // 2. Tenta obter o usuário logado via DOM, session ou cache local
                let logged = getLoggedInUsername();
                if (logged) {
                    try { localStorage.setItem('ig_tools_logged_user', logged); } catch (_) { }
                    return logged;
                }

                // 3. Fallback pelo ID do usuário logado (ds_user_id) via GraphQL HoverCard
                const actorId = getActorId();
                if (actorId && typeof executeGraphqlUserHoverCard === 'function') {
                    try {
                        const stats = await executeGraphqlUserHoverCard(actorId);
                        if (stats?.username) {
                            try { localStorage.setItem('ig_tools_logged_user', stats.username); } catch (_) { }
                            return stats.username;
                        }
                    } catch (_) { }
                }

                // 4. Se ainda assim não encontrar, solicita uma única vez ao usuário
                const promptUser = prompt("Não foi possível identificar seu @username nesta tela. Por favor, digite seu @username (salvaremos para as próximas vezes):");
                if (promptUser) {
                    const clean = promptUser.trim().toLowerCase().replace(/^@/, '');
                    if (clean && /^[a-zA-Z0-9._]+$/.test(clean)) {
                        try { localStorage.setItem('ig_tools_logged_user', clean); } catch (_) { }
                        return clean;
                    }
                }

                return '';
            }

            function getDeviceId() {
                const cookie = getCookie('ig_did');
                return cookie ? cookie : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
            }

            let cachedRolloutHash = "";
            function getRolloutHash() {
                if (cachedRolloutHash) return cachedRolloutHash;
                try {
                    if (window.__p && window.__p.rollout_hash) {
                        cachedRolloutHash = window.__p.rollout_hash;
                        return cachedRolloutHash;
                    }
                    const scripts = document.querySelectorAll("script");
                    for (let i = 0; i < scripts.length; i++) {
                        const text = scripts[i].innerText;
                        if (text.includes('"rollout_hash"')) {
                            const match = text.match(/"rollout_hash":"([a-z0-9]+)"/);
                            if (match) {
                                cachedRolloutHash = match[1];
                                return cachedRolloutHash;
                            }
                        }
                    }
                } catch (e) { }
                return "1";
            }

            let cachedWWWClaim = "0";
            function getWWWClaim() {
                if (cachedWWWClaim && cachedWWWClaim !== "" && cachedWWWClaim !== "0") return cachedWWWClaim;
                try {
                    // Tenta obter de múltiplas fontes globais do Instagram
                    const claim = window.__p?.www_claim ||
                        window._sharedData?.config?.viewer?.www_claim ||
                        window.__cu?.www_claim ||
                        window.__v?.www_claim ||
                        window.__DTS?.www_claim ||
                        window._sharedData?.config?.viewer?.www_claim;

                    if (claim && claim !== "0" && claim !== "") {
                        cachedWWWClaim = claim;
                        return cachedWWWClaim;
                    }
                } catch (e) { }
                return "0";
            }

            function getApiHeaders(isPost = false) {
                const headers = {
                    "X-IG-App-ID": "936619743392459",
                    "X-CSRFToken": getCookie("csrftoken") || "",
                    "X-Requested-With": "XMLHttpRequest",
                };
                const rollout = getRolloutHash();
                if (rollout && rollout !== "1" && rollout !== "") {
                    headers["X-Instagram-AJAX"] = rollout;
                }
                const claim = getWWWClaim();
                if (claim && claim !== "0" && claim !== "") {
                    headers["X-IG-WWW-Claim"] = claim;
                }
                if (isPost) {
                    headers["Content-Type"] = "application/x-www-form-urlencoded";
                }
                return headers;
            }

            function getMainWorldTokens() {
                try {
                    let dtsg = window.__fb_dtsg || window.DTSGInitialData?.token || (typeof window.DTSG?.getToken === 'function' ? window.DTSG.getToken() : '');
                    if (!dtsg && typeof window.require === 'function') {
                        try { dtsg = window.require('DTSGInitialData')?.token || ''; } catch (_) { }
                    }
                    let lsd = window.__lsd || window.LSD?.token || '';
                    if (!lsd && typeof window.require === 'function') {
                        try { lsd = window.require('LSD')?.token || ''; } catch (_) { }
                    }
                    const spin_r = window.__spin_r || window._spin_r || '';
                    const spin_t = window.__spin_t || window._spin_t || '';
                    const hsi = window.__hsi || '';
                    const dyn = window.__dyn || '';
                    const csr = window.__csr || '';

                    return { dtsg, lsd, spin_r, spin_t, hsi, dyn, csr };
                } catch (_) {
                    return {};
                }
            }

            function getDtsgToken() {
                try {
                    if (window.__fb_dtsg) return window.__fb_dtsg;
                    if (window.DTSGInitialData?.token) return window.DTSGInitialData.token;
                    if (typeof window.DTSG?.getToken === 'function') return window.DTSG.getToken();
                    if (typeof window.require === 'function') {
                        const reqToken = window.require('DTSGInitialData')?.token;
                        if (reqToken) return reqToken;
                    }
                } catch (e) { }

                const live = getMainWorldTokens();
                if (live.dtsg) return live.dtsg;

                const input = document.querySelector('input[name="fb_dtsg"]');
                if (input?.value) return input.value;
                const meta = document.querySelector('meta[name="fb_dtsg"]');
                if (meta?.content) return meta.content;

                try {
                    const scripts = document.querySelectorAll('script');
                    for (const s of scripts) {
                        const txt = s.textContent || '';
                        if (!txt || (!txt.includes('token') && !txt.includes('DTSG') && !txt.includes('async_get_token'))) continue;
                        const m = txt.match(/\["DTSGInitialData",\s*\[\],\s*\{"token"\s*:\s*"([^"]+)"/i) ||
                            txt.match(/"DTSGInitialData"[^>]*?"token"\s*:\s*"([^"]+)"/i) ||
                            txt.match(/(?:DTSGInitialData|DTSGInitData|dtsg)[^]*?"token"\s*:\s*"([a-zA-Z0-9_\-\:]{20,})"/i) ||
                            txt.match(/"async_get_token"\s*:\s*"([a-zA-Z0-9_\-\:]{20,})"/i) ||
                            txt.match(/"token"\s*:\s*"([a-zA-Z0-9_\-\:]{20,})"/);
                        if (m && m[1]) {
                            window.__fb_dtsg = m[1];
                            return m[1];
                        }
                    }
                } catch (e) { }

                try {
                    const html = document.documentElement.innerHTML;
                    const m = html.match(/\["DTSGInitialData",\s*\[\],\s*\{"token"\s*:\s*"([^"]+)"/i) ||
                        html.match(/"DTSGInitialData"[^>]*?"token"\s*:\s*"([^"]+)"/i) ||
                        html.match(/"async_get_token"\s*:\s*"([a-zA-Z0-9_\-\:]{20,})"/i) ||
                        html.match(/(?:DTSGInitialData|DTSGInitData|dtsg)[^]*?"token"\s*:\s*"([a-zA-Z0-9_\-\:]{20,})"/i);
                    if (m && m[1]) {
                        window.__fb_dtsg = m[1];
                        return m[1];
                    }
                } catch (e) { }

                try {
                    const cached = localStorage.getItem('ig_tools_fb_dtsg');
                    if (cached) return cached;
                } catch (_) { }

                return '';
            }

            function getLsdToken() {
                try {
                    if (window.__lsd) return window.__lsd;
                    if (window.LSD?.token) return window.LSD.token;
                    if (typeof window.require === 'function') {
                        const reqLsd = window.require('LSD')?.token;
                        if (reqLsd) return reqLsd;
                    }
                } catch (e) { }

                const live = getMainWorldTokens();
                if (live.lsd) return live.lsd;

                const input = document.querySelector('input[name="lsd"]');
                if (input?.value) return input.value;

                try {
                    const scripts = document.querySelectorAll('script');
                    for (const s of scripts) {
                        const txt = s.textContent || '';
                        if (!txt || !txt.includes('LSD')) continue;
                        const m = txt.match(/\["LSD",\s*\[\],\s*\{"token"\s*:\s*"([^"]+)"/i) ||
                            txt.match(/"LSDInitialData"[^>]*?"token"\s*:\s*"([^"]+)"/i) ||
                            txt.match(/"lsd"\s*:\s*"([^"]+)"/i);
                        if (m && m[1]) {
                            window.__lsd = m[1];
                            return m[1];
                        }
                    }
                } catch (e) { }

                try {
                    const html = document.documentElement.innerHTML;
                    const m = html.match(/\["LSD",\s*\[\],\s*\{"token"\s*:\s*"([^"]+)"/i) ||
                        html.match(/"LSDInitialData"[^>]*?"token"\s*:\s*"([^"]+)"/i) ||
                        html.match(/"lsd"\s*:\s*"([^"]+)"/i);
                    if (m && m[1]) {
                        window.__lsd = m[1];
                        return m[1];
                    }
                } catch (e) { }

                try {
                    const cached = localStorage.getItem('ig_tools_lsd');
                    if (cached) return cached;
                } catch (_) { }

                return '';
            }

            function computeJazoest(token) {
                if (!token) return '26367';
                let sum = 0;
                for (let i = 0; i < token.length; i++) {
                    sum += token.charCodeAt(i);
                }
                return '2' + sum;
            }

            function getSpinParams() {
                let r = '', t = '';
                try {
                    const html = document.documentElement.innerHTML;
                    const mr = html.match(/"__spin_r"\s*:\s*(\d+)/) || html.match(/"server_revision"\s*:\s*(\d+)/);
                    if (mr && mr[1]) r = mr[1];
                    const mt = html.match(/"__spin_t"\s*:\s*(\d+)/);
                    if (mt && mt[1]) t = mt[1];
                } catch (e) { }
                return {
                    spin_r: r || '1048569652',
                    spin_b: 'trunk',
                    spin_t: t || String(Math.floor(Date.now() / 1000))
                };
            }

            function isValidInstagramUsername(uname) {
                if (!uname || typeof uname !== 'string') return false;
                const clean = uname.trim().toLowerCase();
                if (clean.length < 1 || clean.length > 30) return false;

                // Não pode ser formato de dimensão de imagem (ex: 192x192, 75x75, 120x120, etc.)
                if (/^\d+x\d+$/i.test(clean)) return false;

                // Apenas caracteres válidos no Instagram (letras, números, '.', '_')
                if (!/^[a-zA-Z0-9._]+$/.test(clean)) return false;

                // Não pode começar ou terminar com ponto, nem ter dois pontos consecutivos
                if (clean.startsWith('.') || clean.endsWith('.') || clean.includes('..')) return false;

                // Não pode ser puramente numérico com muitos dígitos (são IDs ou timestamps, não usernames)
                if (/^\d+$/.test(clean) && clean.length > 4) return false;

                // Termos HTML, CSS, JavaScript, bundles e palavras reservadas
                const invalidWords = new Set([
                    'hr', 'icon', 'preconnect', 'viewport', 'preload', 'stylesheet', 'anonymous',
                    'manifest_base_uri', '_api', 'api', 'sorted', 'main', 'true', 'false', 'null',
                    'undefined', 'default', 'components', 'flexbox', 'text', 'image', 'action',
                    'bloks', 'const', 'button', 'screen', 'view', 'hide_story', 'close_friends',
                    'story', 'stories', 'uri', 'url', 'src', 'width', 'height', 'scale', 'fit',
                    'center', 'cover', 'style', 'color', 'background', 'border', 'padding', 'margin',
                    'font', 'size', 'weight', 'bold', 'normal', 'auto', 'row', 'column', 'flex',
                    'none', 'solid', 'hidden', 'visible', 'scroll', 'inherit', 'type', 'id', 'pk',
                    'key', 'value', 'items', 'item', 'data', 'props', 'children', 'node', 'nodes',
                    'edges', 'edge', 'account', 'accounts', 'profile', 'user', 'users', 'status',
                    'title', 'graphql', 'query', 'variables', 'response', 'request', 'token',
                    'csrf', 'session', 'hash', 'relay', 'polaris', 'facebook', 'meta', 'instagram',
                    'threads', 'crossorigin', 'referrerpolicy', 'dns-prefetch', 'manifest',
                    'undefined', 'avatar', 'img', 'div', 'span', 'script', 'link'
                ]);

                if (invalidWords.has(clean)) return false;
                if (clean.endsWith('.js') || clean.endsWith('.css') || clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.webp')) return false;

                return true;
            }

            function getInstagramFormToken(name) {
                if (name === 'fb_dtsg') return getDtsgToken();
                if (name === 'lsd') return getLsdToken();
                const input = document.querySelector(`input[name="${name}"]`);
                if (input?.value) return input.value;
                const meta = document.querySelector(`meta[name="${name}"]`);
                if (meta?.content) return meta.content;
                const html = document.documentElement.innerHTML;
                const pattern = new RegExp(`"${name}"\\s*:\\s*"([^"]+)"`);
                const match = html.match(pattern);
                return match ? match[1] : '';
            }

            async function executeGraphqlUnfollow(uid) {
                if (!uid) return { response: { ok: false, status: 0 }, success: false, result: null, text: 'no_uid' };

                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26418';
                const spin = getSpinParams();

                const variables = {
                    target_user_id: String(uid),
                    container_module: 'profile',
                    nav_chain: 'PolarisProfilePostsTabRoot:profilePage:1:via_cold_start'
                };

                const body = new URLSearchParams();
                if (fbDtsg) body.append('fb_dtsg', fbDtsg);
                if (jazoest) body.append('jazoest', jazoest);
                if (lsd) body.append('lsd', lsd);
                if (spin.spin_r) body.append('__spin_r', spin.spin_r);
                body.append('__spin_b', spin.spin_b || 'trunk');
                if (spin.spin_t) body.append('__spin_t', spin.spin_t);
                body.append('__crn', 'comet.igweb.PolarisProfilePostsTabRoute');
                body.append('qpl_active_flow_ids', '37919374');
                body.append('fb_api_caller_class', 'RelayModern');
                body.append('fb_api_req_friendly_name', 'usePolarisUnfollowMutation');
                body.append('server_timestamps', 'true');
                body.append('variables', JSON.stringify(variables));
                body.append('doc_id', '27789106940691111');
                body.append('fb_api_analytics_tags', '["qpl_active_flow_ids=37919374"]');

                const headers = {
                    ...getApiHeaders(true),
                    'X-ASBD-ID': '359341',
                    'X-FB-LSD': lsd,
                    'X-FB-Friendly-Name': 'usePolarisUnfollowMutation',
                    'X-IG-Max-Touch-Points': '0'
                };

                try {
                    console.log(`[IG Tools Unfollow] Enviando mutação GraphQL para UID ${uid}...`, variables);
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

                    console.log('[IG Tools Unfollow] Resposta GraphQL:', {
                        status: response.status,
                        ok: response.ok,
                        data,
                        rawPreview: rawText.slice(0, 200)
                    });

                    const hasData = !!(data?.data?.xdt_destroy_friendship || data?.data);
                    const isDestroySuccess = data?.data?.xdt_destroy_friendship?.friendship_status?.following === false;
                    const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0 && !hasData;
                    const success = response.ok && !hasErrors && (isDestroySuccess || hasData);

                    return {
                        response,
                        success,
                        result: { status: success ? 'ok' : 'fail', data },
                        text: rawText,
                        data
                    };
                } catch (e) {
                    console.error('[IG Tools Unfollow] Erro na requisição GraphQL:', e);
                    return { response: { ok: false, status: 0 }, success: false, result: null, text: String(e) };
                }
            }

            async function executeGraphqlBlockMany(targetUserIds = []) {
                const idList = (Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds]).filter(Boolean).map(String);
                if (idList.length === 0) {
                    console.warn("[IG Tools Block] Nenhum ID fornecido para bloqueio.");
                    return { response: { ok: false, status: 0 }, success: false, result: null, text: 'empty_ids' };
                }

                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26629';
                const spin = getSpinParams();

                const variables = {
                    surface: null,
                    target_user_ids: idList
                };

                const body = new URLSearchParams();
                body.append('__comet_req', '7');
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
                    ...getApiHeaders(true),
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
                    const response = await fetch('https://www.instagram.com/graphql/query', {
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

                    console.log('[IG Tools Block] Resposta GraphQL:', {
                        status: response.status,
                        ok: response.ok,
                        data,
                        rawPreview: rawText.slice(0, 200)
                    });

                    const hasData = !!(data?.data?.xdt_block_many || data?.data);
                    const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0 && !hasData;
                    const success = response.ok && !hasErrors && hasData;

                    return {
                        response,
                        success,
                        result: { status: success ? 'ok' : 'fail', data },
                        text: rawText,
                        data
                    };
                } catch (e) {
                    console.error('[IG Tools Block] Erro na requisição GraphQL:', e);
                    return { response: { ok: false, status: 0 }, success: false, result: null, text: String(e) };
                }
            }

            async function executeGraphqlUnblock(uid) {
                if (!uid) {
                    console.warn("[IG Tools Unblock] Nenhum UID fornecido para desbloqueio.");
                    return { response: { ok: false, status: 0 }, success: false, result: null, text: 'no_uid' };
                }

                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26261';
                const spin = getSpinParams();

                const variables = {
                    target_user_id: String(uid)
                };

                const body = new URLSearchParams();
                body.append('__comet_req', '7');
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
                    ...getApiHeaders(true),
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
                    const response = await fetch('https://www.instagram.com/graphql/query', {
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

                    console.log('[IG Tools Unblock] Resposta GraphQL:', {
                        status: response.status,
                        ok: response.ok,
                        data,
                        rawPreview: rawText.slice(0, 200)
                    });

                    const hasData = !!(data?.data?.xdt_unblock || data?.data);
                    const isUnblocked = data?.data?.xdt_unblock?.friendship_status?.blocking === false;
                    const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0 && !hasData;
                    const success = response.ok && !hasErrors && (isUnblocked || hasData);

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

                // Mutação oficial GraphQL do Instagram (usePolarisUnblockMutation)
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

            async function executeApiBlock(uid, username = '') {
                if (!uid) return { success: false, error: 'no_uid' };

                // Mutação oficial Polaris GraphQL do Instagram (usePolarisBlockManyMutation)
                try {
                    const gqlRes = await executeGraphqlBlockMany([uid]);
                    if (gqlRes.success) {
                        console.log(`[IG Tools Block] Sucesso via Polaris GraphQL para UID ${uid} (@${username})`);
                        return { success: true, data: gqlRes.data, method: 'graphql' };
                    }
                    console.warn(`[IG Tools Block] Falha na mutação Polaris GraphQL para @${username}:`, gqlRes);
                    return { success: false, error: 'graphql_failed', data: gqlRes.data };
                } catch (e) {
                    console.error(`[IG Tools Block] Erro no Polaris GraphQL para @${username}:`, e);
                    return { success: false, error: String(e) };
                }
            }

            async function executeGraphqlUserHoverCard(userId) {
                if (!userId) return null;
                const uid = String(userId);

                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26239';
                const spin = getSpinParams();

                const variables = {
                    userID: uid
                };

                const body = new URLSearchParams();
                body.append('__comet_req', '7');
                if (fbDtsg) body.append('fb_dtsg', fbDtsg);
                if (jazoest) body.append('jazoest', jazoest);
                if (lsd) body.append('lsd', lsd);
                if (spin.spin_r) body.append('__spin_r', spin.spin_r);
                body.append('__spin_b', spin.spin_b || 'trunk');
                if (spin.spin_t) body.append('__spin_t', spin.spin_t);
                body.append('__crn', 'comet.igweb.PolarisFeedRoute');
                body.append('fb_api_caller_class', 'RelayModern');
                body.append('fb_api_req_friendly_name', 'PolarisUserHoverCardContentV2Query');
                body.append('server_timestamps', 'true');
                body.append('variables', JSON.stringify(variables));
                body.append('doc_id', '28949219061332276');

                const headers = {
                    ...getApiHeaders(true),
                    'X-ASBD-ID': '359341',
                    'X-CSRFToken': getCookie('csrftoken') || '',
                    'X-FB-Friendly-Name': 'PolarisUserHoverCardContentV2Query',
                    'X-FB-LSD': lsd,
                    'X-IG-App-ID': '936619743392459',
                    'X-IG-Max-Touch-Points': '0'
                };

                try {
                    console.log(`[IG Tools Stats] Buscando hovercard via GraphQL para UID ${uid}...`);
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
                                if (parsed?.data) {
                                    data = parsed;
                                    break;
                                }
                            } catch (_) { }
                        }
                    }

                    console.log(`[IG Tools Stats] Resposta HoverCard para UID ${uid}:`, data);

                    const user = data?.data?.xig_user_by_igid_v2?.user_dict || data?.data?.user || data?.data?.xdt_user || data?.data;
                    if (user) {
                        let followers = null;
                        let following = null;

                        if (user.follower_count !== undefined) followers = user.follower_count;
                        else if (user.edge_followed_by?.count !== undefined) followers = user.edge_followed_by.count;
                        else if (user.followers_count !== undefined) followers = user.followers_count;

                        if (user.following_count !== undefined) following = user.following_count;
                        else if (user.edge_follow?.count !== undefined) following = user.edge_follow.count;
                        else if (user.following_tag_count !== undefined) following = user.following_tag_count;

                        if (followers !== null || following !== null || user.profile_pic_url) {
                            return {
                                followers: Number(followers) || 0,
                                following: Number(following) || 0,
                                isPrivate: user.is_private !== undefined ? user.is_private : null,
                                mediaCount: user.media_count !== undefined ? user.media_count : null,
                                profilePicUrl: user.profile_pic_url || user.hd_profile_pic_url_info?.url || null,
                                biography: user.biography || user.bio || '',
                                fullName: user.full_name || '',
                                username: user.username || ''
                            };
                        }
                    }
                    return null;
                } catch (e) {
                    console.error(`[IG Tools Stats] Erro ao buscar stats via GraphQL para UID ${uid}:`, e);
                    return null;
                }
            }

            async function executeGraphqlProfilePosts(username, after = null) {
                if (!username) return null;
                const cleanUsername = String(username).trim().toLowerCase();

                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26239';
                const spin = getSpinParams();

                const variables = {
                    after: after || null,
                    before: null,
                    data: {
                        count: 12,
                        include_reel_media_seen_timestamp: true,
                        include_relationship_info: true,
                        latest_besties_reel_media: true,
                        latest_reel_media: true
                    },
                    first: 12,
                    include_multi_captions: true,
                    last: null,
                    username: cleanUsername,
                    __relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider: true,
                    __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: false,
                    __relay_internal__pv__PolarisReelsRecoDebugOverlayEnabledrelayprovider: false
                };

                const body = new URLSearchParams();
                body.append('__comet_req', '7');
                if (fbDtsg) body.append('fb_dtsg', fbDtsg);
                if (jazoest) body.append('jazoest', jazoest);
                if (lsd) body.append('lsd', lsd);
                if (spin.spin_r) body.append('__spin_r', spin.spin_r);
                body.append('__spin_b', spin.spin_b || 'trunk');
                if (spin.spin_t) body.append('__spin_t', spin.spin_t);
                body.append('__crn', 'comet.igweb.PolarisProfilePostsTabRoute');
                body.append('fb_api_caller_class', 'RelayModern');
                body.append('fb_api_req_friendly_name', 'PolarisProfilePostsTabContentQuery_connection');
                body.append('server_timestamps', 'true');
                body.append('variables', JSON.stringify(variables));
                body.append('doc_id', '28975909992013618');

                const headers = {
                    ...getApiHeaders(true),
                    'X-ASBD-ID': '359341',
                    'X-CSRFToken': getCookie('csrftoken') || '',
                    'X-FB-Friendly-Name': 'PolarisProfilePostsTabContentQuery_connection',
                    'X-FB-LSD': lsd,
                    'X-IG-App-ID': '936619743392459',
                    'X-IG-Max-Touch-Points': '0'
                };

                try {
                    console.log(`[IG Tools Interações] Buscando posts via GraphQL para @${cleanUsername} (cursor: ${after ? after.substring(0, 15) + '...' : 'início'})...`);
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
                                if (parsed?.data) {
                                    data = parsed;
                                    break;
                                }
                            } catch (_) { }
                        }
                    }

                    const connection = data?.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
                    return connection || null;
                } catch (e) {
                    console.error(`[IG Tools Interações] Erro ao buscar posts via GraphQL para @${cleanUsername}:`, e);
                    return null;
                }
            }

            async function executeGraphqlSetBesties(adds = [], removes = []) {
                const addList = (Array.isArray(adds) ? adds : [adds]).filter(Boolean).map(String);
                const removeList = (Array.isArray(removes) ? removes : [removes]).filter(Boolean).map(String);

                if (addList.length === 0 && removeList.length === 0) {
                    console.warn("[IG Tools Besties] Nenhum ID fornecido para adicionar ou remover.");
                    return { success: false, error: 'empty_ids' };
                }

                const viewerId = getCookie('ds_user_id') || getInstagramFormToken('av') || '';
                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26367';
                const spin = getSpinParams();

                console.log("[IG Tools Besties] Enviando mutação GraphQL:", {
                    viewerId,
                    hasFbDtsg: !!fbDtsg,
                    fbDtsgSnippet: fbDtsg ? fbDtsg.substring(0, 20) + '...' : '(vazio)',
                    hasLsd: !!lsd,
                    jazoest,
                    adds: addList,
                    removes: removeList
                });

                const body = new URLSearchParams({
                    __comet_req: '7',
                    fb_api_caller_class: 'RelayModern',
                    fb_api_req_friendly_name: 'usePolarisSetBestiesMutation',
                    server_timestamps: 'true',
                    variables: JSON.stringify({
                        add: addList,
                        remove: removeList,
                        source: 'profile'
                    }),
                    doc_id: '27495272076736910'
                });

                if (viewerId) body.append('av', viewerId);
                if (fbDtsg) body.append('fb_dtsg', fbDtsg);
                if (jazoest) body.append('jazoest', jazoest);
                if (lsd) body.append('lsd', lsd);
                if (spin.spin_r) body.append('__spin_r', spin.spin_r);
                if (spin.spin_b) body.append('__spin_b', spin.spin_b);
                if (spin.spin_t) body.append('__spin_t', spin.spin_t);

                const headers = {
                    ...getApiHeaders(true),
                    'X-FB-LSD': lsd,
                    'X-FB-Friendly-Name': 'usePolarisSetBestiesMutation'
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

                console.log("[IG Tools Besties] Resposta recebida da API GraphQL:", {
                    status: response.status,
                    ok: response.ok,
                    parsedData: data,
                    rawPreview: rawText.slice(0, 300)
                });

                const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0;
                const mutationData = data?.data?.xdt_set_besties ?? data?.data?.set_besties ?? data?.data;
                let success = response.ok && !hasErrors && (mutationData !== null && mutationData !== undefined);

                if (!success && cleanedText && (cleanedText.startsWith('<!DOCTYPE') || !response.ok)) {
                    try {
                        console.log("[IG Tools Besties] Tentando endpoint alternativo Polaris graphql/query...");
                        const altResponse = await fetch('https://www.instagram.com/graphql/query', {
                            method: 'POST',
                            headers,
                            body: body.toString(),
                            credentials: 'include',
                            cache: 'no-store'
                        });
                        if (altResponse.ok) {
                            const altRaw = await altResponse.text();
                            let altCleaned = altRaw.trim();
                            if (altCleaned.startsWith('for (;;);')) altCleaned = altCleaned.slice(9).trim();
                            const altData = JSON.parse(altCleaned);
                            if (altData && !altData.errors) {
                                return { response: altResponse, success: true, data: altData };
                            }
                        }
                    } catch (_) { }
                }

                return { response, success, data, rawText };
            }

            async function executeGraphqlMute(uid, targetType = 'stories', action = 'mute') {
                if (!uid) return { success: false, error: 'no_uid' };

                const viewerId = getCookie('ds_user_id') || getInstagramFormToken('av') || '';
                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26367';
                const spin = getSpinParams();

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
                    ...getApiHeaders(true),
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

            window.executeGraphqlMute = executeGraphqlMute;
            window.executePolarisMute = executePolarisMute;
            window.executeGraphqlSetBesties = window.executeGraphqlSetBesties || ((...args) => window.IGTools?.CloseFriends?.executeGraphqlSetBesties?.(...args));

            async function executeWbloksHideStory(uid, username, action = 'hide') {
                if (!uid) return { success: false, error: 'no_uid' };

                const viewerId = getCookie('ds_user_id') || getInstagramFormToken('av') || '';
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

                console.log(`[IG Tools HideStory] Enviando Wbloks (${action}):`, params);

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

                    console.log(`[IG Tools HideStory] Resposta Wbloks (${action}):`, {
                        status: response.status,
                        ok: response.ok,
                        data,
                        rawPreview: rawText.slice(0, 200)
                    });

                    const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0;
                    return { response, success: response.ok && !hasErrors, data, rawText };
                } catch (err) {
                    console.error(`[IG Tools HideStory] Erro Wbloks:`, err);
                    return { success: false, error: err };
                }
            }

            // Fetch do total oficial de stories ocultados via WBloks count_updater
            async function fetchWbloksHideStoryCount() {
                try {
                    const viewerId = getCookie('ds_user_id') || getActorId() || '';
                    const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                    const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                    const jazoest = computeJazoest(fbDtsg) || '26342';
                    const spin = getSpinParams();

                    const url = 'https://www.instagram.com/async/wbloks/fetch/?appid=com.instagram.portable_settings.privacy.hide_story_from_screen.hide_story_count_updater&type=action&__bkv=bebad2b121ef373e1847b0445ffd0ce996417496c088e54f6b5d2f5c6501842d';

                    const dyn = getInstagramFormToken('__dyn') || '7xeUjG1mxu1syaxG4Vp41twpUnwgU7SbzEdF8vyUco2qwJyEiw50x609vCwjE1EEc87m0yE462mcw5Mx62G5UswoEcE7O2l0Fwqo5W1yw9O1lwxwQzXwae4UaEW2G0AEco5G0zK5o4q0HU1wEbUGdwtUeo9UaQ0Lo6-bwHwKG6Ufk0zU8oC1IwjUpwlAcwBwUQp1yU426V8aUuwm8jxK1mwa6bBK4o16UeUGq2Kq11whE984O0XEdoCQ1jw';
                    const csr = getInstagramFormToken('__csr') || 'iMB0FNX5N22j9eUHPWl8iGkV-eGXT8G5OPdP8VIzehP8KBh9pV9cNGWnip9Wh4BGfld8Dif4W4au9Irs8F4l9JbhAF4gJ7l95AFagBBBAkDiq9uVdppZDJykAch9QvAKiXjAV4HgzDBoLaaGh3Q68K9zGzay9pUC8yEj-dyWxe9zEGK9zXBzWzWyuQmbyWxaZ3KFEgxjhj1ycBzk5uVoGdgK8Ax3AAHV8K5GgG22maG1UUK1sweq7okw5ww08Ha00Y8EcU0vn2UKkMoQ18xgE0h1opw6yCtw2TU0hyS0Koqguw8Z0BwiUdK0qW5Eo6jw4dU3HwbWq3G8wTg1iV2By84iUy8guGywqodE2YrRrw1s2i1lG5o06KC02qu2K9g6rw0E5weS0fcw';
                    const hsdp = getInstagramFormToken('__hsdp') || 'gjMb_j1GkkCPcx4Pn9lEHV2NOEO99KXjQ3pyigsojx5AqI9xeGG48qx222boGwm9cwnoAV4A-FUK19gZ91G8woHuSHG4u7dChF4mmQ4B8fCK68G2GUC9wzz84e11wywkqwHxS3u6Ed98S19wDxedwm8qwk8szofoKU28wJwok32361dyUO0j-0pC2O0cPwpE0B20YEnwtE0mCw5Ywa20zi08-5o0Guew5fxvw2GA0gW09Iwww5GwmU887K0kO0BVk7nu';
                    const hblp = getInstagramFormToken('__hblp') || getInstagramFormToken('_hblp') || '0Cx-1xwUyU4ScCACy23pEiwh84q8wwx6cihEOWAVCegSEdEgyQHxGi6A1zzVbwJDgqyh98jgjUkWUCVoG7966F9bCBGiVUpG5kfg9UhyEtwYhXG48CU4O74eDjyEnx-4USGK4oixHu33wJHwyCxqq3KfDwor-iucwCzodUS4oeoiwwy8GHwlzVbwhUG1DwSwq86S3Lwi82vwc63q7U1PU3fw5qw8q0jm1cxa0m-0lo7y8Aw20U2kwu8dU4q1uw8q0AE5W1nwhEa88mm5okwxBxC1wwbu0ra2W0F82uU4aUy0j50aN04Pw7qwzwgQ1CwEwhU5y1-xi1PgS360E8861lwQwkey5F82pIGqaw';
                    const sjsp = getInstagramFormToken('__sjsp') || getInstagramFormToken('_sjsp') || 'grgacmRNQ4ipiKhLjOkhd6R4qd8AbeyAerVEbZpas4EaGo468wg8rx22mg5p9224I7wbO3q6EAi68aQ1Dg4e3q0G8';
                    const sParam = getInstagramFormToken('__s') || 'z3nm3y:imx696:n7ke1q';
                    const hsi = getInstagramFormToken('__hsi') || '7689958851794881797';
                    const hs = getInstagramFormToken('__hs') || '20722.HYP:instagram_web_pkg.2.1...0';

                    const body = new URLSearchParams({
                        __d: 'www',
                        __user: viewerId || '0',
                        __a: '1',
                        __req: '7',
                        __hs: hs,
                        dpr: '2',
                        __ccg: 'EXCELLENT',
                        __rev: spin.spin_r || '1049106301',
                        __s: sParam,
                        __hsi: hsi,
                        __dyn: dyn,
                        __csr: csr,
                        __hsdp: hsdp,
                        _hblp: hblp,
                        __hblp: hblp,
                        _sjsp: sjsp,
                        __sjsp: sjsp,
                        _comet_req: '7',
                        __comet_req: '7',
                        server_timestamps: 'true',
                        _spin_r: spin.spin_r || '1049106301',
                        __spin_r: spin.spin_r || '1049106301',
                        _spin_b: spin.spin_b || 'trunk',
                        __spin_b: spin.spin_b || 'trunk',
                        _spin_t: spin.spin_t || String(Math.floor(Date.now() / 1000)),
                        __spin_t: spin.spin_t || String(Math.floor(Date.now() / 1000)),
                        _crn: 'comet.igweb.PolarisSettingsHideStoryAndLiveFromRoute',
                        __crn: 'comet.igweb.PolarisSettingsHideStoryAndLiveFromRoute',
                        params: '{}'
                    });

                    if (viewerId) {
                        body.append('av', viewerId);
                        body.append('__user', viewerId);
                    }
                    if (fbDtsg) body.append('fb_dtsg', fbDtsg);
                    if (jazoest) body.append('jazoest', jazoest);
                    if (lsd) body.append('lsd', lsd);

                    const headers = {
                        ...getApiHeaders(true),
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                        'X-FB-LSD': lsd
                    };

                    const res = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: body.toString(),
                        credentials: 'include',
                        cache: 'no-store',
                        signal: AbortSignal.timeout(6000)
                    });

                    if (res.ok) {
                        const rawText = await res.text();
                        const match = rawText.match(/privacy_settings_number_users_story_hidden_from[^\d]*(\d+)/);
                        if (match && match[1]) {
                            window._igHideStoryTotalCount = parseInt(match[1], 10);
                            console.log(`[IG Tools HideStory] fetchWbloksHideStoryCount obteve total oficial: ${window._igHideStoryTotalCount}`);
                            return window._igHideStoryTotalCount;
                        }
                    }
                } catch (e) {
                    console.warn('[IG Tools HideStory] Falha no fetchWbloksHideStoryCount:', e);
                }
                return null;
            }



            async function executeGraphqlFollow(uid) {
                if (!uid) return { response: { ok: false, status: 0 }, success: false, result: null, text: 'no_uid' };

                const lsd = getLsdToken() || getInstagramFormToken('lsd') || '';
                const fbDtsg = getDtsgToken() || getInstagramFormToken('fb_dtsg') || '';
                const jazoest = computeJazoest(fbDtsg) || '26275';
                const spin = getSpinParams();

                const variables = {
                    target_user_id: String(uid),
                    container_module: 'profile',
                    nav_chain: 'PolarisProfilePostsTabRoot:profilePage:1:via_cold_start'
                };

                const body = new URLSearchParams();
                body.append('__comet_req', '7');
                if (fbDtsg) body.append('fb_dtsg', fbDtsg);
                if (jazoest) body.append('jazoest', jazoest);
                if (lsd) body.append('lsd', lsd);
                if (spin.spin_r) body.append('__spin_r', spin.spin_r);
                body.append('__spin_b', spin.spin_b || 'trunk');
                if (spin.spin_t) body.append('__spin_t', spin.spin_t);
                body.append('__crn', 'comet.igweb.PolarisProfilePostsTabRoute');
                body.append('fb_api_caller_class', 'RelayModern');
                body.append('fb_api_req_friendly_name', 'usePolarisFollowMutation');
                body.append('server_timestamps', 'true');
                body.append('variables', JSON.stringify(variables));
                body.append('doc_id', '26508036048874888');

                const headers = {
                    ...getApiHeaders(true),
                    'X-ASBD-ID': '359341',
                    'X-CSRFToken': getCookie('csrftoken') || '',
                    'X-FB-Friendly-Name': 'usePolarisFollowMutation',
                    'X-FB-LSD': lsd,
                    'X-IG-App-ID': '936619743392459',
                    'X-IG-Max-Touch-Points': '0'
                };

                try {
                    console.log(`[IG Tools Follow] Enviando mutação GraphQL para UID ${uid}...`, variables);
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

                    console.log('[IG Tools Follow] Resposta GraphQL:', {
                        status: response.status,
                        ok: response.ok,
                        data,
                        rawPreview: rawText.slice(0, 200)
                    });

                    const hasData = !!(data?.data?.xdt_create_friendship || data?.data);
                    const isFollowSuccess = data?.data?.xdt_create_friendship?.friendship_status?.following === true ||
                        data?.data?.xdt_create_friendship?.friendship_status?.outgoing_request === true;
                    const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0 && !hasData;
                    const success = response.ok && !hasErrors && (isFollowSuccess || hasData);

                    return {
                        response,
                        success,
                        result: { status: success ? 'ok' : 'fail', data },
                        text: rawText,
                        data
                    };
                } catch (e) {
                    console.error('[IG Tools Follow] Erro na requisição GraphQL:', e);
                    return { response: { ok: false, status: 0 }, success: false, result: null, text: String(e) };
                }
            }

            function getCachedUserId(username) {
                if (!username) return null;
                try {
                    const cache = JSON.parse(localStorage.getItem('ig_tools_id_cache') || '{}');
                    const id = cache[username] || cache[username.toLowerCase()] || null;
                    if (id && String(id) === '936619743392459') {
                        delete cache[username];
                        delete cache[username.toLowerCase()];
                        localStorage.setItem('ig_tools_id_cache', JSON.stringify(cache));
                        return null;
                    }
                    return id ? String(id) : null;
                } catch (e) { return null; }
            }

            function setCachedUserId(username, id) {
                if (!username || !id) return;
                const strId = String(id).trim();
                if (strId === '936619743392459' || strId === '0' || strId === 'current' || !/^\d+$/.test(strId)) return;
                try {
                    const cache = JSON.parse(localStorage.getItem('ig_tools_id_cache') || '{}');
                    cache[username] = strId;
                    cache[username.toLowerCase()] = strId;
                    localStorage.setItem('ig_tools_id_cache', JSON.stringify(cache));
                } catch (e) { }
            }

            // Helper para obter ID de usuário
            async function getUserId(username) {
                if (!username) return null;
                const cleanUsername = username.trim().toLowerCase();
                const loggedUser = ((typeof getLoggedInUsername === 'function' ? getLoggedInUsername() : '') || localStorage.getItem('ig_tools_logged_user') || '').toLowerCase();

                // 1. Se for o próprio usuário logado, obtém instantaneamente via cookie de sessão canônico ds_user_id ou getActorId
                if (cleanUsername === loggedUser || (!loggedUser && typeof getActorId === 'function' && getActorId())) {
                    const actorId = getCookie('ds_user_id') || (typeof getActorId === 'function' ? getActorId() : null);
                    if (actorId && String(actorId) !== '936619743392459') {
                        setCachedUserId(cleanUsername, String(actorId));
                        return String(actorId);
                    }
                }

                // 2. Procura na lista de seguindo em memória
                try {
                    if (typeof seguindoList !== 'undefined' && Array.isArray(seguindoList)) {
                        const item = seguindoList.find(x => (typeof x === 'object' ? x?.username : x)?.toLowerCase() === cleanUsername);
                        const foundId = item && typeof item === 'object' ? (item.id || item.pk || item.pk_id) : null;
                        if (foundId && String(foundId) !== '936619743392459') {
                            setCachedUserId(cleanUsername, String(foundId));
                            return String(foundId);
                        }
                    }
                } catch (e) { }

                // 3. Procura em cachedData.userDetails
                try {
                    if (typeof cachedData !== 'undefined' && cachedData?.userDetails && cachedData.userDetails.has(cleanUsername)) {
                        const details = cachedData.userDetails.get(cleanUsername);
                        if (details && details.id && String(details.id) !== '936619743392459') {
                            const id = String(details.id);
                            setCachedUserId(cleanUsername, id);
                            return id;
                        }
                    }
                } catch (e) { }

                // 4. Cache persistente (localStorage)
                const cachedId = getCachedUserId(cleanUsername);
                if (cachedId && String(cachedId) !== '936619743392459') return String(cachedId);

                // 5. Se for o perfil atualmente aberto na página, tenta obter do DOM / React
                try {
                    const currentProf = (typeof getProfilePageUsername === 'function') ? getProfilePageUsername() : null;
                    if (currentProf === cleanUsername) {
                        const actorId = getCookie('ds_user_id') || getActorId();
                        if (actorId && actorId !== '936619743392459' && document.querySelector('header a[href*="/' + cleanUsername + '/"]')) {
                            setCachedUserId(cleanUsername, String(actorId));
                            return String(actorId);
                        }
                    }
                } catch (_) { }

                // 6. Fallback HTML do perfil (extrai ID sem acionar limite 429 de endpoints REST)
                try {
                    const profileResponse = await fetch(`https://www.instagram.com/${encodeURIComponent(cleanUsername)}/`, {
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    if (profileResponse.ok) {
                        const html = await profileResponse.text();
                        const isNotAppId = (val) => val && String(val) !== '936619743392459' && /^\d{5,}$/.test(String(val));

                        const mProps = html.match(/"(?:props_id|user_id|target_id|profile_id)"\s*:\s*"?(\d{5,})"?/i);
                        if (mProps && isNotAppId(mProps[1])) {
                            setCachedUserId(cleanUsername, String(mProps[1]));
                            return String(mProps[1]);
                        }

                        const mOwner = html.match(/"owner"\s*:\s*\{\s*"id"\s*:\s*"(\d{5,})"/i);
                        if (mOwner && isNotAppId(mOwner[1])) {
                            setCachedUserId(cleanUsername, String(mOwner[1]));
                            return String(mOwner[1]);
                        }

                        const usernamePattern = new RegExp(`"username"\\s*:\\s*"${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
                        const usernameMatch = usernamePattern.exec(html);
                        if (usernameMatch) {
                            const nearby = html.slice(Math.max(0, usernameMatch.index - 3000), usernameMatch.index + 3000);
                            const idMatches = [...nearby.matchAll(/"(?:pk|id|user_id|pk_id)"\s*:\s*"?(\d+)"?/g)];
                            for (let i = idMatches.length - 1; i >= 0; i--) {
                                const cand = idMatches[i]?.[1];
                                if (isNotAppId(cand)) {
                                    setCachedUserId(cleanUsername, String(cand));
                                    console.log(`[IG Tools] ID obtido pelo HTML contextual de ${cleanUsername}: ${cand}`);
                                    return String(cand);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`[IG Tools] Falha ao obter o HTML do perfil de ${cleanUsername}:`, e);
                }

                // 7. Fallback final topsearch apenas se os métodos anteriores falharem
                try {
                    const searchRes = await fetch(`https://www.instagram.com/api/v1/web/search/topsearch/?context=blended&query=${encodeURIComponent(cleanUsername)}`, {
                        headers: getApiHeaders(),
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        if (searchData.users && Array.isArray(searchData.users)) {
                            const exact = searchData.users.find(u => u?.user?.username && u.user.username.toLowerCase() === cleanUsername);
                            if (exact?.user) {
                                const id = String(exact.user.pk || exact.user.id || exact.user.pk_id || '');
                                if (id && id !== '936619743392459') {
                                    setCachedUserId(cleanUsername, id);
                                    return id;
                                }
                            }
                        }
                    }
                } catch (e) { }

                return null;
            }

            const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.37-2.57 5.05-2.57s5.02.91 5.05 2.57C15.8 19.15 14.03 20 12 20z'/%3E%3C/svg%3E";
            try { window.DEFAULT_AVATAR = DEFAULT_AVATAR; } catch (_) { }
            try { if (typeof unsafeWindow !== 'undefined') unsafeWindow.DEFAULT_AVATAR = DEFAULT_AVATAR; } catch (_) { }

            // Helper moderno para buscar informações do perfil sem depender de endpoints REST descontinuados (evita 429)
            async function safeFetchProfileInfo(username) {
                if (!username) return null;
                const cleanUsername = username.trim().toLowerCase();
                const loggedUser = ((typeof getLoggedInUsername === 'function' ? getLoggedInUsername() : '') || localStorage.getItem('ig_tools_logged_user') || '').toLowerCase();
                const isLogged = cleanUsername === loggedUser || !loggedUser;

                // 1. Se estiver na página do perfil, tenta extrair com precisão do DOM
                try {
                    const currentProf = (typeof getProfilePageUsername === 'function') ? getProfilePageUsername() : null;
                    if (currentProf === cleanUsername) {
                        const header = document.querySelector('header') || document.querySelector('main');
                        if (header) {
                            let followers = 0;
                            let following = 0;

                            // Varre links, botões, itens de lista e spans procurando números de seguidores e seguindo
                            const items = header.querySelectorAll('a, button, li, span');
                            for (const el of items) {
                                const href = (el.getAttribute && el.getAttribute('href')) || '';
                                const txt = (el.textContent || '').trim();
                                const cleanTxt = txt.replace(/[,.\s]/g, '');

                                // Seguidores
                                if (!followers && (href.includes('/followers/') || txt.toLowerCase().includes('seguidor') || txt.toLowerCase().includes('follower'))) {
                                    const m = cleanTxt.match(/(\d+)/);
                                    if (m) followers = parseInt(m[1], 10);
                                }
                                // Seguindo
                                if (!following && (href.includes('/following/') || txt.toLowerCase().includes('seguindo') || txt.toLowerCase().includes('following'))) {
                                    const m = cleanTxt.match(/(\d+)/);
                                    if (m) following = parseInt(m[1], 10);
                                }
                            }

                            const avatarImg = header.querySelector('img[alt*="perfil"], img[alt*="profile"], img');
                            const photoUrl = avatarImg ? avatarImg.src : null;
                            const uid = (isLogged ? (getCookie('ds_user_id') || getActorId()) : getCachedUserId(cleanUsername)) || '';

                            // CRÍTICO: Só retorna direto do DOM se REALMENTE encontrou contagens válidas (> 0)!
                            // Se followers ou following forem 0, NÃO invente 1000 aqui; deixe cair no GraphQL HoverCard oficial abaixo!
                            if (followers > 0 && following > 0 && uid && uid !== '936619743392459') {
                                return {
                                    data: {
                                        user: {
                                            id: String(uid || 'current'),
                                            pk: String(uid || 'current'),
                                            username: cleanUsername,
                                            profile_pic_url: photoUrl,
                                            edge_followed_by: { count: followers },
                                            edge_follow: { count: following },
                                            edge_owner_to_timeline_media: { count: 0 }
                                        }
                                    }
                                };
                            }
                        }
                    }
                } catch (_) { }

                // 2. Obtém o ID do usuário (sem aceitar o appID 936619743392459)
                let uid = null;
                if (isLogged) {
                    uid = getCookie('ds_user_id') || (typeof getActorId === 'function' ? getActorId() : null);
                    if (uid === '936619743392459') uid = null;
                }
                if (!uid) {
                    uid = getCachedUserId(cleanUsername);
                }
                if (!uid && typeof getUserId === 'function') {
                    uid = await getUserId(cleanUsername);
                }
                if (uid === '936619743392459') uid = null;

                // 3. Com o ID, busca via GraphQL Oficial (PolarisUserHoverCardContentV2Query)
                if (uid && typeof executeGraphqlUserHoverCard === 'function') {
                    try {
                        const stats = await executeGraphqlUserHoverCard(uid);
                        if (stats && (stats.followers !== null || stats.following !== null || stats.profilePicUrl)) {
                            return {
                                data: {
                                    user: {
                                        id: String(uid),
                                        pk: String(uid),
                                        username: cleanUsername,
                                        full_name: stats.fullName || '',
                                        biography: stats.biography || '',
                                        is_private: Boolean(stats.isPrivate),
                                        profile_pic_url: stats.profilePicUrl || null,
                                        edge_followed_by: { count: Number(stats.followers) || 1000 },
                                        edge_follow: { count: Number(stats.following) || 1000 },
                                        edge_owner_to_timeline_media: { count: Number(stats.mediaCount) || 0 }
                                    }
                                }
                            };
                        }
                    } catch (e) {
                        console.warn(`[IG Tools] Falha no GraphQL HoverCard para ${cleanUsername}:`, e);
                    }
                }

                // 4. Fallback HTML da página do perfil (extrai contagens e dados embutidos)
                try {
                    const profileRes = await fetch(`https://www.instagram.com/${encodeURIComponent(cleanUsername)}/`, {
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    if (profileRes.ok) {
                        const html = await profileRes.text();
                        let foundId = uid;
                        if (!foundId || foundId === '936619743392459') {
                            const isNotAppId = (val) => val && String(val) !== '936619743392459' && /^\d{5,}$/.test(String(val));
                            const mProps = html.match(/"(?:props_id|user_id|target_id|profile_id)"\s*:\s*"?(\d{5,})"?/i);
                            if (mProps && isNotAppId(mProps[1])) {
                                foundId = mProps[1];
                                setCachedUserId(cleanUsername, foundId);
                            }
                        }

                        const followersMatch = html.match(/"(?:follower_count|edge_followed_by)"\s*:\s*(?:{"count"\s*:\s*)?(\d+)/i);
                        const followingMatch = html.match(/"(?:following_count|edge_follow)"\s*:\s*(?:{"count"\s*:\s*)?(\d+)/i);
                        const picMatch = html.match(/"profile_pic_url(?:_hd)?"\s*:\s*"([^"]+)"/i);
                        const privMatch = html.match(/"is_private"\s*:\s*(true|false)/i);

                        const followers = followersMatch ? parseInt(followersMatch[1], 10) : 0;
                        const following = followingMatch ? parseInt(followingMatch[1], 10) : 0;
                        const pic = picMatch ? picMatch[1].replace(/\\u0026/g, '&') : null;
                        const isPriv = privMatch ? (privMatch[1].toLowerCase() === 'true') : false;

                        const validId = (foundId && foundId !== '936619743392459') ? foundId : (isLogged ? getCookie('ds_user_id') : null);

                        if (validId || followers > 0 || following > 0) {
                            return {
                                data: {
                                    user: {
                                        id: String(validId || ''),
                                        pk: String(validId || ''),
                                        username: cleanUsername,
                                        is_private: isPriv,
                                        profile_pic_url: pic,
                                        edge_followed_by: { count: followers || 1000 },
                                        edge_follow: { count: following || 1000 },
                                        edge_owner_to_timeline_media: { count: 0 }
                                    }
                                }
                            };
                        }
                    }
                } catch (e) {
                    console.warn(`[IG Tools] Falha ao extrair perfil via HTML para ${cleanUsername}:`, e);
                }

                // 5. Fallback com ID resolvido
                if (uid && uid !== '936619743392459') {
                    return {
                        data: {
                            user: {
                                id: String(uid),
                                pk: String(uid),
                                username: cleanUsername,
                                edge_follow: { count: 1000 },
                                edge_followed_by: { count: 1000 }
                            }
                        }
                    };
                }

                return null;
            }

            // Helper para identificar requisições de visualização de Stories (URL ou Corpo da requisição GraphQL)
            function isStorySeenPayload(url, body) {
                if (!url) return false;
                const urlStr = String(url);
                if (urlStr.includes('/stories/reel/seen') || urlStr.includes('/api/v1/stories/reel/seen')) {
                    return true;
                }
                if (urlStr.includes('graphql/query') || urlStr.includes('/api/v1/') || urlStr.includes('/graphql/')) {
                    if (!body) return false;
                    let bodyStr = '';
                    if (typeof body === 'string') {
                        bodyStr = body;
                    } else if (typeof body === 'object') {
                        try {
                            if (body instanceof URLSearchParams) bodyStr = body.toString();
                            else if (body instanceof FormData) {
                                for (let pair of body.entries()) { bodyStr += pair[0] + '=' + pair[1] + '&'; }
                            } else bodyStr = JSON.stringify(body);
                        } catch (e) { }
                    }
                    if (bodyStr.includes('PolarisProfilePostsTabContentQuery')) {
                        return false;
                    }
                    if (bodyStr.includes('seen') ||
                        bodyStr.includes('StoriesV2Seen') ||
                        bodyStr.includes('PolarisStoriesSeenMutation') ||
                        bodyStr.includes('reel_media')) {
                        return true;
                    }
                }
                return false;
            }

            // --- INTERCEPTOR STORIES ANÔNIMO ---
            if (!window._anonymousInterceptorInstalled) {
                window._anonymousInterceptorInstalled = true;
                console.log("[IG Tools] Instalando interceptores de rede avançados (XHR, Fetch, Beacon)...");
                // Variável compartilhada para capturar dados de bloqueados via Bloks
                if (!window._igBlockedUsersCapture) {
                    window._igBlockedUsersCapture = { users: new Map(), data: [], callbacks: [] };
                }
                // Variável compartilhada para capturar dados de silenciados via Bloks (incluindo paginação)
                if (!window._igMutedUsersCapture) {
                    window._igMutedUsersCapture = { users: new Map(), callbacks: [] };
                }
                // Variável compartilhada para capturar dados de ocultar story via Bloks (incluindo paginação)
                if (!window._igHideStoryUsersCapture) {
                    window._igHideStoryUsersCapture = { users: new Map(), callbacks: [] };
                }
                // Variável compartilhada para capturar dados de amigos próximos via Bloks (incluindo paginação)
                if (!window._igCloseFriendsUsersCapture) {
                    window._igCloseFriendsUsersCapture = { users: new Map(), callbacks: [] };
                }

                function parseHideStoryBloksText(text) {
                    if (!text || typeof text !== 'string') return [];

                    // Se for um documento HTML completo, extrai todos os scripts relevantes para processar
                    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<head>')) {
                        try {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(text, 'text/html');
                            const scripts = Array.from(doc.querySelectorAll('script'));
                            for (const s of scripts) {
                                if (s.textContent && (s.textContent.includes('hide_story') || s.textContent.includes('should_unhide') || s.textContent.includes('username'))) {
                                    parseHideStoryBloksText(s.textContent);
                                }
                            }
                            if (window._igHideStoryUsersCapture?.users && window._igHideStoryUsersCapture.users.size > 0) {
                                return Array.from(window._igHideStoryUsersCapture.users.values());
                            }
                        } catch (_) { }
                    }

                    if (!window._igHideStoryUsersCapture) {
                        window._igHideStoryUsersCapture = { users: new Map(), callbacks: [] };
                    }

                    const usersMap = window._igHideStoryUsersCapture.users;
                    let newCount = 0;

                    // 1. Normaliza escapes sem corromper barras ou chaves
                    let cleanText = text.trim();
                    if (cleanText.startsWith('for (;;);')) {
                        cleanText = cleanText.slice(9).trim();
                    }
                    const normalized = cleanText.replace(/\\+"/g, '"').replace(/\\\//g, '/');

                    // Nome do próprio usuário logado e ID para nunca incluir a si mesmo
                    const currentLoggedUser = (getLoggedInUsername() || '').toLowerCase().trim();
                    const currentLoggedUid = getCookie('ds_user_id') || getActorId() || '';

                    // 2. Extrai total oficial de stories ocultados se presente no Consistency Store
                    const countMatch = normalized.match(/privacy_settings_number_users_story_hidden_from[^\d]*(\d+)/);
                    if (countMatch && countMatch[1]) {
                        window._igHideStoryTotalCount = parseInt(countMatch[1], 10);
                        console.log(`[IG Tools HideStory] Total oficial de stories ocultados no Instagram: ${window._igHideStoryTotalCount}`);
                    }

                    // 2.1. Extrai cursor e container de paginação se presentes (WBloks com.instagram.pagination.async)
                    const cursorMatch = text.match(/"cursor"\s*:\s*"([^"]+)"/) ||
                        normalized.match(/cursor\\*"\s*:\s*\\*"([^"\\\\]+)/) ||
                        text.match(/cursor["\\]*\s*:\s*["\\]*([^"\\,\s\}]+)/);
                    if (cursorMatch && cursorMatch[1]) {
                        window._igHideStoryLastCursor = cursorMatch[1];
                        console.log(`[IG Tools HideStory] Novo cursor de paginação detectado: ${window._igHideStoryLastCursor.slice(0, 20)}...`);
                    }
                    const containerMatch = text.match(/"container_id"\s*:\s*"(\d+)"/) ||
                        normalized.match(/container_id\\*"\s*:\s*\\*"(\d+)/);
                    if (containerMatch && containerMatch[1]) {
                        window._igHideStoryContainerId = containerMatch[1];
                    }
                    const loadingMatch = text.match(/"loading_component_id"\s*:\s*"(\d+)"/) ||
                        normalized.match(/loading_component_id\\*"\s*:\s*\\*"(\d+)/);
                    if (loadingMatch && loadingMatch[1]) {
                        window._igHideStoryLoadingId = loadingMatch[1];
                    }

                    const isPaginationOnly = normalized.includes('com.instagram.pagination.async') &&
                        !normalized.includes('hide_story_from_screen.hide_story_from');

                    // 3. Identifica posições dos blocos de Ocultados e Sugestões
                    let posSel = normalized.search(/1799674124(?:_0)?/);
                    let posUnsel = normalized.search(/1799674125(?:_0)?/);
                    if (posUnsel === -1) posUnsel = normalized.search(/selection_list_component\.unselected_users/i);
                    if (posUnsel === -1) posUnsel = normalized.search(/unselected_users/i);
                    if (posUnsel === -1) posUnsel = normalized.search(/autoload_params/i);
                    if (posUnsel === -1) posUnsel = normalized.search(/"sugest|"sugerid|"sugerencias|"suggest/i);

                    console.log('[IG Tools HideStory] Parser acionado. Blocos:', { posSel, posUnsel, totalOficial: window._igHideStoryTotalCount, isPaginationOnly, len: normalized.length });

                    const hasHiddenSignal = (strLower) => {
                        return /should_unhide["\s]*:\s*(?:true|1)/i.test(strLower) ||
                            /is_checked["\s]*:\s*(?:true|1)/i.test(strLower) ||
                            /is_selected["\s]*:\s*(?:true|1)/i.test(strLower) ||
                            /["']selected["']\s*:\s*(?:true|1)/i.test(strLower) ||
                            strLower.includes('circle-check') ||
                            strLower.includes('boolean.const, true') ||
                            strLower.includes('boolean.const,true') ||
                            strLower.includes('bk.action.bool.const, true') ||
                            strLower.includes('bk.action.bool.const,true');
                    };

                    // Padrão Universal: Varredura de usernames no payload com extração de contexto local
                    const userRegex = /"username"\s*:\s*"([a-zA-Z0-9._]{2,30})"/g;
                    let um;
                    while ((um = userRegex.exec(normalized)) !== null) {
                        const uname = um[1];
                        if (!uname || !isValidInstagramUsername(uname) || uname === 'instagram' || uname === 'threads') continue;
                        if (currentLoggedUser && uname.toLowerCase() === currentLoggedUser) continue;

                        const start = Math.max(0, um.index - 800);
                        const end = Math.min(normalized.length, um.index + 1200);
                        const chunk = normalized.slice(start, end);
                        const chunkLower = chunk.toLowerCase();

                        const pkMatch = chunk.match(/"pk"\s*:\s*"?(\d+)"?/) ||
                            chunk.match(/"user_id"\s*:\s*"?(\d+)"?/) ||
                            chunk.match(/"id"\s*:\s*"?(\d+)"?/) ||
                            chunk.match(/bk\.action\.(?:i32|i64)\.Const[,\s]+"?(\d+)"?/);
                        const pk = pkMatch ? pkMatch[1] : '';
                        if (pk && currentLoggedUid && String(pk) === String(currentLoggedUid)) continue;
                        if (pk) setCachedUserId(uname, pk);

                        const picMatch = chunk.match(/"profile_pic_url"\s*:\s*"([^"]+)"/) ||
                            chunk.match(/"(https?:\/\/[^"\s]+(?:fbcdn\.net|cdninstagram\.com|\/v\/t51|\/s150x150)[^"\s]*)"/);
                        const rawPic = picMatch ? (picMatch[1] || picMatch[0]) : '';
                        const photoUrl = (rawPic && !rawPic.includes('rsrc.php') && !rawPic.includes('static.xx')) ? rawPic.replace(/\\/g, '').replace(/\\u0026/g, '&') : DEFAULT_AVATAR;

                        const nameMatch = chunk.match(/"full_name"\s*:\s*"([^"]+)"/) || chunk.match(/"name"\s*:\s*"([^"]+)"/);
                        let fullName = nameMatch ? nameMatch[1] : '';
                        try { fullName = JSON.parse(`"${fullName}"`); } catch (_) { }

                        let isUserHidden = false;
                        if (!isPaginationOnly) {
                            if (chunkLower.includes('should_unhide":true') ||
                                chunkLower.includes('should_unhide": true') ||
                                chunkLower.includes('should_unhide\\":true') ||
                                chunkLower.includes('should_unhide\\": true') ||
                                chunkLower.includes('"should_unhide":1') ||
                                hasHiddenSignal(chunkLower)) {
                                isUserHidden = true;
                            } else if (posUnsel !== -1 && um.index < posUnsel) {
                                isUserHidden = true;
                            } else if (posUnsel === -1 && window._igHideStoryTotalCount && usersMap.size < window._igHideStoryTotalCount) {
                                isUserHidden = true;
                            }
                        }

                        if (!usersMap.has(uname)) {
                            usersMap.set(uname, {
                                username: uname,
                                fullName: fullName,
                                photoUrl: photoUrl,
                                pk: pk,
                                id: pk,
                                isChecked: isUserHidden,
                                isHidden: isUserHidden
                            });
                            newCount++;
                        } else {
                            const ex = usersMap.get(uname);
                            if (isUserHidden) {
                                ex.isChecked = true;
                                ex.isHidden = true;
                            }
                            if (!ex.pk && pk) ex.pk = pk;
                            if (!ex.id && pk) ex.id = pk;
                            if (!ex.fullName && fullName) ex.fullName = fullName;
                            if ((!ex.photoUrl || ex.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) ex.photoUrl = photoUrl;
                        }
                    }

                    // Padrão Lispy adicional (arrays de paginação com Const)
                    const lispyArrayRegex = /\(bk\.action\.(?:i32|i64)\.Const,\s*(\d+)\),\s*"([a-zA-Z0-9._]{2,30})",\s*"([^"]*)",\s*"(https?:\/\/[^"\s]+)"/g;
                    let lam;
                    while ((lam = lispyArrayRegex.exec(normalized)) !== null) {
                        const pk = lam[1];
                        const uname = lam[2];
                        if (!isValidInstagramUsername(uname) || uname === 'instagram' || uname === 'threads') continue;
                        if (currentLoggedUser && uname.toLowerCase() === currentLoggedUser) continue;
                        if (pk && currentLoggedUid && String(pk) === String(currentLoggedUid)) continue;

                        let fullName = lam[3] || '';
                        try { fullName = JSON.parse(`"${fullName}"`); } catch (_) { }

                        let rawPic = lam[4] || '';
                        rawPic = rawPic.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
                        const photoUrl = (rawPic && !rawPic.includes('rsrc.php') && !rawPic.includes('static.xx')) ? rawPic : DEFAULT_AVATAR;

                        if (pk) setCachedUserId(uname, pk);

                        let isUserHidden = false;
                        if (!isPaginationOnly) {
                            if (posUnsel !== -1 && lam.index < posUnsel) {
                                isUserHidden = true;
                            } else if (posUnsel === -1 && window._igHideStoryTotalCount && usersMap.size < window._igHideStoryTotalCount) {
                                isUserHidden = true;
                            }
                        }

                        if (!usersMap.has(uname)) {
                            usersMap.set(uname, {
                                username: uname,
                                fullName: fullName,
                                photoUrl: photoUrl,
                                pk: pk,
                                id: pk,
                                isChecked: isUserHidden,
                                isHidden: isUserHidden
                            });
                            newCount++;
                        } else {
                            const existing = usersMap.get(uname);
                            if (isUserHidden) {
                                existing.isChecked = true;
                                existing.isHidden = true;
                            }
                            if (!existing.pk && pk) existing.pk = pk;
                            if (!existing.id && pk) existing.id = pk;
                            if (!existing.fullName && fullName) existing.fullName = fullName;
                            if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) existing.photoUrl = photoUrl;
                        }
                    }

                    // Padrão 4: Formato JSON de usuário (com e sem aspas no key, suportando username e user_name)
                    const jsonUserRegex = /(?:["']?username["']?|["']?user_name["']?)\s*[:=]\s*["']([a-zA-Z0-9._]{2,30})["']/g;
                    let jm;
                    while ((jm = jsonUserRegex.exec(normalized)) !== null) {
                        const uname = jm[1];
                        if (!isValidInstagramUsername(uname)) continue;
                        if (currentLoggedUser && uname.toLowerCase() === currentLoggedUser) continue;
                        const windowSlice = normalized.slice(Math.max(0, jm.index - 350), Math.min(normalized.length, jm.index + 450));
                        const winLower = windowSlice.toLowerCase();
                        const picMatch = windowSlice.match(/"(?:profile_pic_url|avatar_url|profile_pic)"\s*:\s*"([^"]+)"/);
                        const rawPic = picMatch ? picMatch[1].replace(/\\/g, '').replace(/\\u0026/g, '&') : '';
                        const photoUrl = (rawPic && !rawPic.includes('rsrc.php') && !rawPic.includes('static.xx')) ? rawPic : DEFAULT_AVATAR;
                        const pkMatch = windowSlice.match(/"(?:pk|id|user_id)"\s*:\s*"?(\d+)"?/) || windowSlice.match(/\b(\d{7,15})\b/);
                        const pk = pkMatch ? pkMatch[1] : (getCachedUserId(uname) || '');
                        if (pk && currentLoggedUid && String(pk) === String(currentLoggedUid)) continue;
                        if (pk) setCachedUserId(uname, pk);

                        const nameMatch = windowSlice.match(/"(?:full_name|name)"\s*:\s*"([^"]+)"/);
                        let fullName = nameMatch ? nameMatch[1] : '';
                        try { fullName = JSON.parse(`"${fullName}"`); } catch (_) { }

                        let isUserHidden = false;
                        if (!isPaginationOnly) {
                            if (hasHiddenSignal(winLower)) {
                                isUserHidden = true;
                            } else if (posUnsel !== -1 && jm.index < posUnsel) {
                                isUserHidden = true;
                            } else if (posUnsel === -1 && window._igHideStoryTotalCount && usersMap.size < window._igHideStoryTotalCount) {
                                isUserHidden = true;
                            }
                        }

                        if (!usersMap.has(uname)) {
                            usersMap.set(uname, {
                                username: uname,
                                fullName: fullName,
                                photoUrl: photoUrl,
                                pk: pk,
                                id: pk,
                                isChecked: isUserHidden,
                                isHidden: isUserHidden
                            });
                            newCount++;
                        } else {
                            const existing = usersMap.get(uname);
                            if (isUserHidden) {
                                existing.isChecked = true;
                                existing.isHidden = true;
                            }
                            if (!existing.pk && pk) existing.pk = pk;
                            if (!existing.id && pk) existing.id = pk;
                            if (!existing.fullName && fullName) existing.fullName = fullName;
                            if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) existing.photoUrl = photoUrl;
                        }
                    }

                    // Retorna os usuários mapeados com base estrita nos dados reais

                    const usersArray = Array.from(usersMap.values());
                    console.log(`[IG Tools HideStory] Parse finalizado. Total de usuários mapeados: ${usersArray.length} (${usersArray.filter(u => u.isChecked || u.isHidden).length} ocultados).`);
                    if (usersArray.length === 0) {
                        console.warn('[IG Tools HideStory] Nenhum usuário extraído do payload. Primeiros 200 caracteres:', text.slice(0, 200));
                    }

                    if (window._igHideStoryUsersCapture.callbacks) {
                        window._igHideStoryUsersCapture.callbacks.forEach(cb => {
                            try { cb(usersArray); } catch (_) { }
                        });
                    }

                    return usersArray;
                }
                window.parseHideStoryBloksText = parseHideStoryBloksText;
                window.executeWbloksHideStory = executeWbloksHideStory;
                window.fetchWbloksHideStoryCount = fetchWbloksHideStoryCount;

                function extractBlockedPaginationParams(text) {
                    if (!text || typeof text !== 'string') return null;
                    let cursor = null;
                    let containerId = null;
                    let loadingId = null;
                    let listId = null;
                    let rowsId = null;

                    const mCursor = text.match(/cursor\\*"\s*:\s*\\*"([^"\\\\]{15,500})/i) ||
                        text.match(/"cursor"\s*:\s*"([^"]{15,500})"/i);
                    if (mCursor && mCursor[1]) cursor = mCursor[1];

                    const mContainer = text.match(/container_id\\*"\s*:\s*\\*"(\d+)/i) ||
                        text.match(/"container_id"\s*:\s*"(\d+)"/i);
                    if (mContainer && mContainer[1]) containerId = mContainer[1];

                    const mLoading = text.match(/loading_component_id\\*"\s*:\s*\\*"(\d+)/i) ||
                        text.match(/"loading_component_id"\s*:\s*"(\d+)"/i);
                    if (mLoading && mLoading[1]) loadingId = mLoading[1];

                    const mList = text.match(/container_id_of_list\\*"\s*:\s*\\*"(\d+)/i) ||
                        text.match(/"container_id_of_list"\s*:\s*"(\d+)"/i);
                    if (mList && mList[1]) listId = mList[1];

                    const mRows = text.match(/container_id_of_rows\\*"\s*:\s*\\*"(\d+)/i) ||
                        text.match(/"container_id_of_rows"\s*:\s*"(\d+)"/i);
                    if (mRows && mRows[1]) rowsId = mRows[1];

                    return { cursor, containerId, loadingId, listId, rowsId };
                }
                window.extractBlockedPaginationParams = extractBlockedPaginationParams;

                function isForbiddenBlockedUsername(uname) {
                    if (!uname || typeof uname !== 'string') return true;
                    const clean = uname.toLowerCase().trim();
                    const myUname = (typeof getLoggedInUsername === 'function' ? (getLoggedInUsername() || '') : '').toLowerCase().trim();
                    const forbidden = [
                        'destaques', 'novo', 'highlights', 'new', 'salvar', 'save',
                        'concluído', 'done', 'editar', 'edit', 'cancelar', 'cancel',
                        'pesquisar', 'search', 'configurações', 'settings', 'instagram',
                        'threads', 'publicações', 'stories', 'reels', 'seguidores', 'seguindo'
                    ];
                    if (forbidden.includes(clean)) return true;
                    if (myUname && clean === myUname) return true;
                    if (typeof isValidInstagramUsername === 'function' && !isValidInstagramUsername(clean)) return true;
                    return false;
                }
                window.isForbiddenBlockedUsername = isForbiddenBlockedUsername;

                function parseBlockedBloksText(text) {
                    if (!text) return [];
                    if (typeof text !== 'string') {
                        try { text = JSON.stringify(text); } catch (_) { return []; }
                    }

                    const usersMap = new Map();

                    function processLispyString(lispyStr) {
                        if (!lispyStr || typeof lispyStr !== 'string') return;

                        // Regex 1: Tupla padrão Lispy com auto_blocked
                        // (bk.action.array.Make, "1298329065", "_jenniferoj", "...", (bk.action.bool.Const, false), "https://...", (bk.action.bool.Const, true))
                        const r1 = /\(bk\.action\.array\.Make,\s*"(\d+)",\s*"([a-zA-Z0-9._]{1,40})",\s*"((?:\\.|[^"\\])*)",\s*\(bk\.action\.bool\.Const,\s*(?:true|false)\),\s*"([^"]*)",\s*\(bk\.action\.bool\.Const,\s*(true|false)\)/g;
                        let m;
                        while ((m = r1.exec(lispyStr)) !== null) {
                            const pk = m[1];
                            const uname = m[2];
                            let rawSec = m[3] || '';
                            let picUrl = (m[4] || '').replace(/\\/g, '');
                            const isAutoBlocked = m[5] === 'true';

                            try { rawSec = JSON.parse(`"${rawSec}"`); } catch (_) { }

                            if (uname && uname !== 'instagram' && uname !== 'threads' && !isForbiddenBlockedUsername(uname)) {
                                const isAutoText = rawSec.toLowerCase().includes('outras contas') || rawSec.toLowerCase().includes('other accounts');
                                const fullName = isAutoText ? '' : rawSec;
                                const secondaryText = isAutoText ? 'Inclui outras contas que o usuário tiver ou criar' : rawSec;

                                if (pk) setCachedUserId(uname, pk);

                                usersMap.set(uname.toLowerCase(), {
                                    username: uname,
                                    pk: pk,
                                    id: pk,
                                    fullName: fullName,
                                    secondaryText: secondaryText,
                                    photoUrl: (picUrl && !picUrl.includes('rsrc.php')) ? picUrl : DEFAULT_AVATAR,
                                    isAutoBlocked: isAutoBlocked || isAutoText
                                });
                            }
                        }

                        // Regex 2: Formato Lispy genérico de usuário com id, username e foto
                        const r2 = /\(bk\.action\.array\.Make,\s*"(\d+)",\s*"([a-zA-Z0-9._]{1,40})",\s*"((?:\\.|[^"\\])*)"(?:,\s*\(bk\.action\.bool\.Const,\s*(?:true|false)\))?,\s*"([^"]*)"/g;
                        let m2;
                        while ((m2 = r2.exec(lispyStr)) !== null) {
                            const pk = m2[1];
                            const uname = m2[2];
                            const key = uname.toLowerCase();
                            if (!usersMap.has(key) && uname !== 'instagram' && uname !== 'threads' && !isForbiddenBlockedUsername(uname)) {
                                let rawSec = m2[3] || '';
                                let picUrl = (m2[4] || '').replace(/\\/g, '');
                                try { rawSec = JSON.parse(`"${rawSec}"`); } catch (_) { }
                                const isAutoText = rawSec.toLowerCase().includes('outras contas') || rawSec.toLowerCase().includes('other accounts');
                                if (pk) setCachedUserId(uname, pk);
                                usersMap.set(key, {
                                    username: uname,
                                    pk: pk,
                                    id: pk,
                                    fullName: isAutoText ? '' : rawSec,
                                    secondaryText: rawSec,
                                    photoUrl: (picUrl && !picUrl.includes('rsrc.php')) ? picUrl : DEFAULT_AVATAR,
                                    isAutoBlocked: isAutoText
                                });
                            }
                        }

                        // Regex 3 (Altamente flexível e tolerante a escapes de build de produção):
                        // Captura (bk.action.array.Make, "ID", "USERNAME"...) em qualquer contexto Lispy
                        const rFlexible = /\(bk\.action\.array\.Make,\s*\\*"\s*(\d{4,25})\s*\\*",\s*\\*"\s*([a-zA-Z0-9._]{1,40})\s*\\*"/g;
                        let mf;
                        while ((mf = rFlexible.exec(lispyStr)) !== null) {
                            const pk = mf[1];
                            const uname = mf[2];
                            const key = uname.toLowerCase();
                            if (!usersMap.has(key) && uname !== 'instagram' && uname !== 'threads' && !isForbiddenBlockedUsername(uname)) {
                                const chunk = lispyStr.slice(mf.index, mf.index + 800);
                                let photoUrl = DEFAULT_AVATAR;
                                const picMatch = chunk.match(/https?:\\?\/\\?\/[^"\s)]+(?:cdninstagram|fbcdn)[^"\s)]+/i);
                                if (picMatch) {
                                    photoUrl = picMatch[0].replace(/\\/g, '').replace(/\\u0026/g, '&');
                                }

                                const isAutoText = chunk.toLowerCase().includes('outras contas') ||
                                    chunk.toLowerCase().includes('other accounts') ||
                                    chunk.includes('is_auto_blocked');

                                let fullName = '';
                                const nameMatch = chunk.match(/\(bk\.action\.array\.Make,\s*\\*"\d+\\*",\s*\\*"[^"]+\\*",\s*\\*"((?:\\.|[^"\\])+)\\"/);
                                if (nameMatch && nameMatch[1] && !isAutoText) {
                                    try { fullName = JSON.parse(`"${nameMatch[1]}"`); } catch (_) { fullName = nameMatch[1]; }
                                }

                                if (pk) setCachedUserId(uname, pk);
                                usersMap.set(key, {
                                    username: uname,
                                    pk: pk,
                                    id: pk,
                                    fullName: fullName || '',
                                    secondaryText: isAutoText ? 'Inclui outras contas que o usuário tiver ou criar' : (fullName || ''),
                                    photoUrl: (photoUrl && !photoUrl.includes('rsrc.php')) ? photoUrl : DEFAULT_AVATAR,
                                    isAutoBlocked: isAutoText
                                });
                            }
                        }
                    }

                    // 1. Tenta parsear como JSON para extrair campos initial_lispy nativos sem problemas de escape
                    let parsedJson = null;
                    let cleanText = text.trim();
                    if (cleanText.startsWith('for (;;);')) {
                        cleanText = cleanText.slice(9).trim();
                    }

                    try {
                        parsedJson = JSON.parse(cleanText);
                    } catch (_) {
                        const lines = cleanText.split('\n');
                        for (const l of lines) {
                            try {
                                const p = JSON.parse(l.replace(/^for \(;;\);/, '').trim());
                                if (p?.payload || p?.data) { parsedJson = p; break; }
                            } catch (_) { }
                        }
                    }

                    if (parsedJson) {
                        function collectLispy(val) {
                            if (!val) return;
                            if (typeof val === 'string') {
                                if (val.includes('bk.action.array.Make')) {
                                    processLispyString(val);
                                }
                            } else if (Array.isArray(val)) {
                                val.forEach(collectLispy);
                            } else if (typeof val === 'object') {
                                if (val.initial_lispy && typeof val.initial_lispy === 'string') {
                                    processLispyString(val.initial_lispy);
                                }
                                for (const k in val) {
                                    collectLispy(val[k]);
                                }
                            }
                        }
                        collectLispy(parsedJson);
                    }

                    // 2. Processa também diretamente no texto cru e texto normalizado
                    if (usersMap.size === 0) {
                        processLispyString(cleanText);
                        const normalized = cleanText
                            .replace(/\\+"/g, '"')
                            .replace(/\\\//g, '/');
                        processLispyString(normalized);

                        // Fallback para JSON tradicional no texto cru
                        const jsonUserRegex = /"username"\s*:\s*"([a-zA-Z0-9._]{1,40})"/g;
                        let mj;
                        while ((mj = jsonUserRegex.exec(normalized)) !== null) {
                            const uname = mj[1];
                            const key = uname.toLowerCase();
                            if (uname && !usersMap.has(key) && uname !== 'instagram' && uname !== 'threads' && !isForbiddenBlockedUsername(uname)) {
                                const start = Math.max(0, mj.index - 350);
                                const end = Math.min(normalized.length, mj.index + 500);
                                const chunk = normalized.slice(start, end);

                                const picMatch = chunk.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
                                const photoUrl = picMatch ? picMatch[1].replace(/\\/g, '') : DEFAULT_AVATAR;

                                const pkMatch = chunk.match(/"(?:pk|id|user_id)"\s*:\s*"?(\d+)"?/);
                                const pk = pkMatch ? pkMatch[1] : (getCachedUserId(uname) || '');
                                if (pk) setCachedUserId(uname, pk);

                                usersMap.set(key, {
                                    username: uname,
                                    pk: pk,
                                    id: pk,
                                    fullName: '',
                                    secondaryText: '',
                                    photoUrl: (photoUrl && !photoUrl.includes('rsrc.php')) ? photoUrl : DEFAULT_AVATAR,
                                    isAutoBlocked: false
                                });
                            }
                        }
                    }

                    // 3. Salva cursor e container IDs globais se existirem
                    const pInfo = extractBlockedPaginationParams(cleanText);
                    if (pInfo && pInfo.cursor) {
                        window._igBlockedCursorInfo = {
                            ...(window._igBlockedCursorInfo || {}),
                            ...pInfo
                        };
                    }

                    return Array.from(usersMap.values());
                }
                window.parseBlockedBloksText = parseBlockedBloksText;

                function handleBloksResponseText(urlString, text) {
                    if (!text || typeof text !== 'string') return;
                    try {
                        const path = window.location.pathname;
                        const isMutedContext = urlString.includes('muted_accounts') ||
                            (path.includes('muted_accounts') && (urlString.includes('com.instagram.pagination.async') || urlString.includes('/async/wbloks/fetch/')));

                        const isBlockedContext = urlString.includes('blocked_accounts') ||
                            text.includes('is_auto_blocked') ||
                            (path.includes('blocked_accounts') && (urlString.includes('com.instagram.pagination.async') || urlString.includes('/async/wbloks/fetch/')));

                        const isHideStoryContext = urlString.includes('hide_story') ||
                            (path.includes('hide_story_and_live_from') && (urlString.includes('com.instagram.pagination.async') || urlString.includes('/async/wbloks/fetch/')));

                        const isCloseFriendsContext = urlString.includes('close_friends') || urlString.includes('close_friend') ||
                            (path.includes('close_friends') && (urlString.includes('com.instagram.pagination.async') || urlString.includes('/async/wbloks/fetch/')));

                        if (isMutedContext) {
                            const userRegex = /"username":"([a-zA-Z0-9._]+)"/g;
                            let match;
                            let newCount = 0;
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
                                if (chunkLower.includes('posts e story') || chunkLower.includes('publicações e stories') || chunkLower.includes('stories e publicações') || chunkLower.includes('posts and stories') || chunkLower.includes('publicaciones e historias')) {
                                    status = "Stories e Publicações";
                                } else if (chunkLower.includes('story') || chunkLower.includes('stories') || chunkLower.includes('historias')) {
                                    status = "Stories";
                                } else if (chunkLower.includes('post') || chunkLower.includes('publica') || chunkLower.includes('publicaciones')) {
                                    status = "Publicações";
                                }

                                if (!window._igMutedUsersCapture.users.has(uname)) {
                                    window._igMutedUsersCapture.users.set(uname, { username: uname, photoUrl, pk, status });
                                    newCount++;
                                } else {
                                    const existing = window._igMutedUsersCapture.users.get(uname);
                                    if (!existing.pk && pk) existing.pk = pk;
                                    if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) existing.photoUrl = photoUrl;
                                    if (existing.status === 'Silenciado' && status !== 'Silenciado') existing.status = status;
                                }
                            }
                            if (newCount > 0 || window._igMutedUsersCapture.users.size > 0) {
                                console.log(`[IG Tools] Bloks interceptou ${window._igMutedUsersCapture.users.size} usuário(s) silenciado(s) (+${newCount} novos).`);
                                const usersArray = Array.from(window._igMutedUsersCapture.users.values());
                                window._igMutedUsersCapture.callbacks.forEach(cb => {
                                    try { cb(usersArray); } catch (e) { }
                                });
                            }
                        } else if (isBlockedContext) {
                            let newCount = 0;
                            // 1. Extração estruturada via parser Bloks Lispy oficial
                            const parsed = parseBlockedBloksText(text);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                parsed.forEach(u => {
                                    if (!u || !u.username || isForbiddenBlockedUsername(u.username)) return;
                                    const uname = u.username;
                                    if (!window._igBlockedUsersCapture.users.has(uname)) {
                                        window._igBlockedUsersCapture.users.set(uname, u);
                                        newCount++;
                                    } else {
                                        const existing = window._igBlockedUsersCapture.users.get(uname);
                                        if (!existing.pk && u.pk) { existing.pk = u.pk; existing.id = u.pk; }
                                        if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && u.photoUrl !== DEFAULT_AVATAR) {
                                            existing.photoUrl = u.photoUrl;
                                        }
                                        if (u.isAutoBlocked) existing.isAutoBlocked = true;
                                    }
                                    if (u.pk) setCachedUserId(uname, u.pk);
                                });
                            }

                            // 2. Fallback via regex de JSON tradicional
                            const userRegex = /"username":"([a-zA-Z0-9._]+)"/g;
                            let match;
                            while ((match = userRegex.exec(text)) !== null) {
                                const uname = match[1];
                                if (!uname || uname === 'instagram' || uname === 'threads' || isForbiddenBlockedUsername(uname)) continue;

                                const start = Math.max(0, match.index - 300);
                                const end = Math.min(text.length, match.index + 500);
                                const chunk = text.slice(start, end);

                                const picMatch = chunk.match(/"profile_pic_url":"([^"]+)"/);
                                const photoUrl = picMatch ? picMatch[1].replace(/\\/g, '').replace(/\\u0026/g, '&') : DEFAULT_AVATAR;

                                const pkMatch = chunk.match(/"pk":"?(\d+)"?/);
                                const pk = pkMatch ? pkMatch[1] : '';
                                if (pk) setCachedUserId(uname, pk);

                                if (!window._igBlockedUsersCapture.users.has(uname)) {
                                    window._igBlockedUsersCapture.users.set(uname, { username: uname, photoUrl, pk, id: pk, isAutoBlocked: false });
                                    newCount++;
                                } else {
                                    const existing = window._igBlockedUsersCapture.users.get(uname);
                                    if (!existing.pk && pk) { existing.pk = pk; existing.id = pk; }
                                    if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) existing.photoUrl = photoUrl;
                                }
                            }

                            const usersArray = Array.from(window._igBlockedUsersCapture.users.values());
                            window._igBlockedUsersCapture.data = usersArray;
                            if (newCount > 0 || usersArray.length > 0) {
                                console.log(`[IG Tools] Bloks interceptou ${usersArray.length} usuário(s) bloqueado(s) (+${newCount} novos).`);
                                window._igBlockedUsersCapture.callbacks.forEach(cb => {
                                    try { cb(usersArray); } catch (e) { }
                                });
                            }
                        } else if (isHideStoryContext) {
                            const parsed = parseHideStoryBloksText(text);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                const hidden = parsed.filter(u => u.isHidden || u.isChecked);
                                if (hidden.length > 0) {
                                    try {
                                        localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(parsed));
                                        dbHelper.saveCache('hiddenStory', hidden);
                                        dbHelper.saveCache('hideStory', hidden);
                                        if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                                        hidden.forEach(u => userListCache.hiddenStory.add(u.username));
                                    } catch (_) { }
                                }
                                if (window._igHideStoryUsersCapture && window._igHideStoryUsersCapture.callbacks) {
                                    const usersArray = Array.from(window._igHideStoryUsersCapture.users.values());
                                    window._igHideStoryUsersCapture.callbacks.forEach(cb => {
                                        try { cb(usersArray); } catch (_) { }
                                    });
                                }
                            }
                        } else if (isCloseFriendsContext) {
                            const userRegex = /"username":"([a-zA-Z0-9._]+)"/g;
                            let match;
                            let newCount = 0;
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

                                let isChecked = false;
                                const chunkLower = chunk.toLowerCase();
                                if (chunkLower.includes('circle-check') || chunkLower.includes('"is_selected":true') || chunkLower.includes('"selected":true')) {
                                    isChecked = true;
                                }

                                if (!window._igCloseFriendsUsersCapture.users.has(uname)) {
                                    window._igCloseFriendsUsersCapture.users.set(uname, { username: uname, photoUrl, pk, isChecked });
                                    newCount++;
                                } else {
                                    const existing = window._igCloseFriendsUsersCapture.users.get(uname);
                                    if (!existing.pk && pk) existing.pk = pk;
                                    if ((!existing.photoUrl || existing.photoUrl === DEFAULT_AVATAR) && photoUrl !== DEFAULT_AVATAR) existing.photoUrl = photoUrl;
                                    if (!existing.isChecked && isChecked) existing.isChecked = true;
                                }
                            }
                            if (newCount > 0 || window._igCloseFriendsUsersCapture.users.size > 0) {
                                console.log(`[IG Tools] Bloks interceptou ${window._igCloseFriendsUsersCapture.users.size} usuário(s) em Amigos Próximos (+${newCount} novos).`);
                                const usersArray = Array.from(window._igCloseFriendsUsersCapture.users.values());
                                window._igCloseFriendsUsersCapture.callbacks.forEach(cb => {
                                    try { cb(usersArray); } catch (e) { }
                                });
                            }
                        }
                    } catch (e) { /* silencia erros de parse */ }
                }
                window.handleBloksResponseText = handleBloksResponseText;

                // Auto-captura em segundo plano ao acessar a rota nativa de Ocultar Story
                if (window.location.pathname.includes('/accounts/hide_story_and_live_from/')) {
                    const runDomScanAuto = () => {
                        try {
                            const scanned = scanHideStoryDomRows(document);
                            const list = Array.from(scanned.values());
                            const hidden = list.filter(u => u.isHidden);
                            if (hidden.length > 0) {
                                console.log(`[IG Tools HideStory] Auto-scan nativo detectou ${hidden.length} contas com story ocultado! Gravando cache...`);
                                localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(list));
                                dbHelper.saveCache('hideStory', hidden);
                            }
                        } catch (_) { }
                    };
                    setTimeout(runDomScanAuto, 800);
                    setTimeout(runDomScanAuto, 2000);
                    setTimeout(runDomScanAuto, 4000);
                }

                function captureLiveTokensFromPayload(body) {
                    if (!body) return;
                    try {
                        let str = '';
                        if (typeof body === 'string') {
                            str = body;
                        } else if (body instanceof URLSearchParams) {
                            str = body.toString();
                        } else if (body instanceof FormData) {
                            if (body.has('fb_dtsg')) {
                                const val = body.get('fb_dtsg');
                                if (val && typeof val === 'string' && val.length > 15) {
                                    window.__fb_dtsg = val;
                                    localStorage.setItem('ig_tools_fb_dtsg', val);
                                }
                            }
                            if (body.has('lsd')) {
                                const val = body.get('lsd');
                                if (val && typeof val === 'string') {
                                    window.__lsd = val;
                                    localStorage.setItem('ig_tools_lsd', val);
                                }
                            }
                            return;
                        }

                        if (str && str.includes('fb_dtsg=')) {
                            const m = str.match(/(?:^|&)fb_dtsg=([^&]+)/);
                            if (m && m[1]) {
                                const val = decodeURIComponent(m[1]);
                                if (val && val.length > 15) {
                                    window.__fb_dtsg = val;
                                    localStorage.setItem('ig_tools_fb_dtsg', val);
                                }
                            }
                            const mLsd = str.match(/(?:^|&)lsd=([^&]+)/);
                            if (mLsd && mLsd[1]) {
                                const val = decodeURIComponent(mLsd[1]);
                                if (val) {
                                    window.__lsd = val;
                                    localStorage.setItem('ig_tools_lsd', val);
                                }
                            }
                            const mSpinR = str.match(/(?:^|&)(?:__)?spin_r=([^&]+)/);
                            if (mSpinR && mSpinR[1]) {
                                window.__spin_r = decodeURIComponent(mSpinR[1]);
                            }
                            const mSpinT = str.match(/(?:^|&)(?:__)?spin_t=([^&]+)/);
                            if (mSpinT && mSpinT[1]) {
                                window.__spin_t = decodeURIComponent(mSpinT[1]);
                            }
                        }
                    } catch (_) { }
                }

                const targetWindows = [window];
                if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
                    targetWindows.push(unsafeWindow);
                }

                targetWindows.forEach(tw => {
                    try {
                        const originalOpen = tw.XMLHttpRequest.prototype.open;
                        const originalSend = tw.XMLHttpRequest.prototype.send;

                        tw.XMLHttpRequest.prototype.open = function (method, url) {
                            this._url = url;
                            this._method = method;
                            return originalOpen.apply(this, arguments);
                        };

                        tw.XMLHttpRequest.prototype.send = function (body) {
                            captureLiveTokensFromPayload(body);

                            if (isStorySeenPayload(this._url, body)) {
                                let isAnon = false;
                                try {
                                    const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                                    if (saved) isAnon = saved.anonymousStories;
                                } catch (e) { }

                                if (isAnon) {
                                    console.log("%c[IG Tools] Bloqueado request de visto (XHR): " + this._url, "color: orange; font-weight: bold;");
                                    showToast("👁️ Story visto anonimamente!");
                                    return;
                                } else {
                                    console.log("[IG Tools] Request de visto PERMITIDO (Modo Anônimo OFF): " + this._url);
                                }
                            }
                            this.addEventListener('load', function () {
                                try {
                                    const url = this._url || '';
                                    if (url.includes('/async/wbloks/fetch/') || url.includes('pagination.async') || url.includes('muted_accounts') || url.includes('blocked_accounts') || url.includes('hide_story') || url.includes('close_friends') || url.includes('close_friend')) {
                                        handleBloksResponseText(url, this.responseText);
                                    }
                                } catch (e) { }
                            });
                            return originalSend.apply(this, arguments);
                        };
                    } catch (_) { }

                    try {
                        const originalFetch = tw.fetch;
                        tw.fetch = async function (input, init) {
                            let urlString = '';
                            if (typeof input === 'string') {
                                urlString = input;
                            } else if (input instanceof URL) {
                                urlString = input.toString();
                            } else if (input && input.url) {
                                urlString = input.url;
                            }

                            const bodyData = init?.body || (input && typeof input === 'object' ? input.body : null);
                            captureLiveTokensFromPayload(bodyData);

                            if (isStorySeenPayload(urlString, bodyData)) {
                                let isAnon = false;
                                try {
                                    const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                                    if (saved) isAnon = saved.anonymousStories;
                                } catch (e) { }

                                if (isAnon) {
                                    console.log("%c[IG Tools] Bloqueado request de visto (Fetch): " + urlString, "color: orange; font-weight: bold;");
                                    showToast("👁️ Story visto anonimamente!");
                                    return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                                } else {
                                    console.log("[IG Tools] Request de visto PERMITIDO (Modo Anônimo OFF): " + urlString);
                                }
                            }

                            // Sniffer automático e completo de queries GraphQL (GET, POST, FormData, URLSearchParams, etc.)
                            let snifferReqName = '';
                            let snifferDocId = '';
                            let snifferVars = '';
                            try {
                                if (urlString) {
                                    try {
                                        const parsedUrl = new URL(urlString, window.location.origin);
                                        snifferDocId = parsedUrl.searchParams.get('doc_id') || parsedUrl.searchParams.get('query_hash') || '';
                                        snifferVars = parsedUrl.searchParams.get('variables') || '';
                                        snifferReqName = parsedUrl.searchParams.get('fb_api_req_friendly_name') || '';
                                    } catch (_) { }
                                }
                                if (bodyData) {
                                    if (typeof bodyData === 'string') {
                                        const params = new URLSearchParams(bodyData);
                                        snifferReqName = snifferReqName || params.get('fb_api_req_friendly_name') || '';
                                        snifferDocId = snifferDocId || params.get('doc_id') || '';
                                        snifferVars = snifferVars || params.get('variables') || '';
                                    } else if (bodyData instanceof FormData || bodyData instanceof URLSearchParams) {
                                        snifferReqName = snifferReqName || bodyData.get('fb_api_req_friendly_name') || '';
                                        snifferDocId = snifferDocId || bodyData.get('doc_id') || '';
                                        snifferVars = snifferVars || bodyData.get('variables') || '';
                                    }
                                }
                                if ((snifferReqName || snifferDocId) && !snifferReqName.includes('PolarisScreenTimeLogger')) {
                                    console.log(`%c[IG Sniffer] ${snifferReqName || 'GraphQL Query'} (doc_id: ${snifferDocId || 'N/A'})`, 'color: #00ffaa; background: #003311; font-weight: bold; padding: 2px 6px; border-radius: 3px;', snifferVars);
                                }
                            } catch (_) { }
                            // Verifica se é resposta Bloks de contas silenciadas, bloqueadas, ocultar story, amigos próximos ou paginação assíncrona
                            if (urlString.includes('com.instagram.pagination.async') ||
                                urlString.includes('bloks/apps/com.instagram.interactions.privacy') ||
                                urlString.includes('blocked_accounts') ||
                                urlString.includes('muted_accounts') ||
                                urlString.includes('hide_story') ||
                                urlString.includes('close_friends') ||
                                urlString.includes('close_friend') ||
                                urlString.includes('/async/wbloks/fetch/')) {
                                return originalFetch.apply(this, arguments).then(async response => {
                                    try {
                                        const clone = response.clone();
                                        const text = await clone.text();
                                        handleBloksResponseText(urlString, text);
                                    } catch (e) { /* silencia erros de parse */ }
                                    return response;
                                });
                            }
                            // Detector de respostas de Stories / Destaques via GraphQL ou Rotas Web (ignora posts do feed)
                            const isProfilePostsReq = urlString.includes('PolarisProfilePostsTabContentQuery') ||
                                                      snifferReqName.includes('PolarisProfilePosts') ||
                                                      snifferReqName.includes('ProfilePosts') ||
                                                      urlString.includes('/feed/user/');

                            if (!isProfilePostsReq && (urlString.includes('graphql') || urlString.includes('stories') || urlString.includes('highlights')) && !urlString.includes('PolarisScreenTimeLogger')) {
                                return originalFetch.apply(this, arguments).then(async response => {
                                    try {
                                        const clone = response.clone();
                                        const text = await clone.text();
                                        const isReelOrHighlightPayload = text.includes('xdt_api__v1__feed__reels_media') ||
                                                                         text.includes('reels_media') ||
                                                                         text.includes('highlight_reel') ||
                                                                         text.includes('GraphHighlightReel') ||
                                                                         (urlString.includes('/stories/') && (text.includes('story_like') || text.includes('viewer_has_liked') || text.includes('has_liked')));

                                        if (isReelOrHighlightPayload) {
                                            console.log(`%c[IG Sniffer STORY/DESTAQUE DETECTADO!]`, 'color: yellow; background: #660066; font-size: 13px; font-weight: bold;', { url: urlString, name: snifferReqName, docId: snifferDocId });
                                            window._igRecentStoryItemsMap = window._igRecentStoryItemsMap || new Map();
                                            try {
                                                let cleanT = text.trim();
                                                if (cleanT.startsWith('for (;;);')) cleanT = cleanT.slice(9).trim();
                                                const parsed = JSON.parse(cleanT);
                                                const extractDeep = (obj) => {
                                                    if (!obj || typeof obj !== 'object') return;
                                                    if (Array.isArray(obj)) { obj.forEach(extractDeep); return; }
                                                    if ((obj.id || obj.pk) && ('story_like' in obj || 'viewer_has_liked' in obj || 'has_liked' in obj || obj.reel_type === 'highlight_reel' || obj.story_media_id)) {
                                                        const mId = String(obj.id || obj.pk).split('_')[0];
                                                        window._igRecentStoryItemsMap.set(mId, obj);
                                                    }
                                                    if (Array.isArray(obj.items)) obj.items.forEach(extractDeep);
                                                    Object.keys(obj).forEach(k => {
                                                        if (k !== 'items' && typeof obj[k] === 'object') extractDeep(obj[k]);
                                                    });
                                                };
                                                extractDeep(parsed);
                                            } catch (_) { }
                                        }
                                    } catch (_) { }
                                    return response;
                                });
                            }
                            return originalFetch.apply(this, arguments);
                        };
                    } catch (_) { }
                });

                // Interceptor para Beacon
                if (navigator.sendBeacon) {
                    const originalSendBeacon = navigator.sendBeacon;
                    navigator.sendBeacon = function (url, data) {
                        if (isStorySeenPayload(url, data)) {
                            let isAnon = false;
                            try {
                                const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                                if (saved) isAnon = saved.anonymousStories;
                            } catch (e) { }

                            if (isAnon) {
                                console.log("%c[IG Tools] Bloqueado request de visto (Beacon): " + url, "color: orange; font-weight: bold;");
                                showToast("👁️ Story visto anonimamente!");
                                return true;
                            } else {
                                console.log("[IG Tools] Request de visto PERMITIDO (Modo Anônimo OFF): " + url);
                            }
                        }
                        return originalSendBeacon.apply(this, arguments);
                    };
                }
            }

            function getFullXPath(element) {
                if (!element || element.nodeType !== 1) return "";

                // Prioridade 1: Atributos de acessibilidade (mais estáveis no Instagram)
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel) {
                    return `//${element.tagName.toLowerCase()}[@aria-label="${ariaLabel}"]`;
                }

                // Prioridade 2: ID (ignorando IDs dinâmicos do sistema "mount_")
                if (element.id && !element.id.startsWith('mount_') && !element.id.includes('mount_')) {
                    return `//*[@id="${element.id}"]`;
                }

                if (element === document.body) return "/html/body";

                const parent = element.parentNode;
                if (!parent || parent.nodeType !== 1) return "/" + element.tagName.toLowerCase();

                const siblings = Array.from(parent.children).filter(s => s.tagName === element.tagName);
                const index = siblings.indexOf(element) + 1;
                const tagName = element.tagName.toLowerCase();
                const pathSegment = siblings.length > 1 ? `${tagName}[${index}]` : tagName;

                return getFullXPath(parent) + "/" + pathSegment;
            }

            function getAbsoluteXPath(element) {
                if (!element || element.nodeType !== 1) return "";
                if (element === document.body) return "/html/body";
                const parent = element.parentNode;
                const siblings = Array.from(parent.children).filter(s => s.tagName === element.tagName);
                const index = siblings.indexOf(element) + 1;
                const tagName = element.tagName.toLowerCase();
                const pathSegment = siblings.length > 1 ? `${tagName}[${index}]` : tagName;
                return getAbsoluteXPath(parent) + "/" + pathSegment;
            }

            function getCssSelector(el) {
                if (!(el instanceof Element)) return "";
                const path = [];
                while (el.nodeType === Node.ELEMENT_NODE) {
                    let selector = el.nodeName.toLowerCase();
                    if (el.id && !el.id.startsWith('mount_') && !el.id.includes('mount_')) {
                        selector += '#' + el.id;
                        path.unshift(selector);
                        break;
                    } else {
                        let sib = el, nth = 1;
                        while (sib = sib.previousElementSibling) {
                            if (sib.nodeName.toLowerCase() == selector) nth++;
                        }
                        if (nth != 1) selector += ":nth-of-type(" + nth + ")";
                    }
                    path.unshift(selector);
                    el = el.parentNode;
                }
                return path.join(" > ");
            }

            let isPickingElement = false;
            let lastHoveredElement = null;
            function startElementPicker(callback) {
                if (isPickingElement) return;
                isPickingElement = true;
                showToast("🖱️ Clique em um elemento da página para capturar o XPath (ESC para cancelar)");

                const onMouseOver = (e) => {
                    if (!isPickingElement) return;
                    e.stopPropagation();
                    if (lastHoveredElement) lastHoveredElement.classList.remove('ig-tools-highlight');
                    // Destaca o elemento interativo mais próximo
                    lastHoveredElement = e.target.closest('button, a, div[role="button"]') || e.target;
                    lastHoveredElement.classList.add('ig-tools-highlight');
                };

                const onClick = (e) => {
                    if (!isPickingElement) return;
                    e.preventDefault(); e.stopPropagation();
                    // Se clicar em um ícone (SVG), captura o botão/link pai
                    const target = e.target.closest('button, a, div[role="button"]') || e.target;
                    stopPicker();
                    callback(target);
                };

                const onKeyDown = (e) => { if (e.key === 'Escape') stopPicker(); };

                function stopPicker() {
                    isPickingElement = false;
                    if (lastHoveredElement) lastHoveredElement.classList.remove('ig-tools-highlight');
                    document.removeEventListener('mouseover', onMouseOver, true);
                    document.removeEventListener('click', onClick, true);
                    document.removeEventListener('keydown', onKeyDown, true);
                }
                document.addEventListener('mouseover', onMouseOver, true);
                document.addEventListener('click', onClick, true);
                document.addEventListener('keydown', onKeyDown, true);
            }

            // Helper consolidado para Google Drive (Substitui o IndexedDB completamente)
            const dbHelper = {
                _cache: null,
                _init: async function () {
                    if (!this._cache) {
                        try {
                            console.log("[IG Tools] Sincronizando com Google Drive...");
                            this._cache = await gDriveApi.loadData();
                            // Garante que o cache seja um objeto e não nulo/texto
                            if (!this._cache || typeof this._cache !== 'object') {
                                this._cache = {};
                            }
                            if (Object.keys(this._cache).length > 0) {
                                console.log("[IG Tools] Dados carregados com sucesso.");
                            }
                        } catch (e) {
                            console.error("[IG Tools] Erro ao carregar dados da nuvem:", e);
                            this._cache = {};
                        }

                        // Merge inteligente na inicialização para nunca perder dados locais do localStorage
                        try {
                            const localUnblocked = JSON.parse(localStorage.getItem('ig_tools_cached_unblocked'));
                            if (Array.isArray(localUnblocked) && localUnblocked.length > 0) {
                                const cloudUnblocked = Array.isArray(this._cache.unblockedAccounts) ? this._cache.unblockedAccounts : [];
                                const map = new Map();
                                cloudUnblocked.forEach(u => { if (u && u.username) map.set(u.username.toLowerCase(), u); });
                                let addedFromLocal = false;
                                localUnblocked.forEach(u => {
                                    if (u && u.username && !map.has(u.username.toLowerCase())) {
                                        map.set(u.username.toLowerCase(), u);
                                        addedFromLocal = true;
                                    }
                                });
                                this._cache.unblockedAccounts = Array.from(map.values());
                                localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(this._cache.unblockedAccounts));
                                if (addedFromLocal && googleAuth.isConnected()) {
                                    gDriveApi.saveData(this._cache).catch(err => console.warn('[IG Tools] Auto-sync local unblocked to Drive failed:', err));
                                }
                            }
                        } catch (_) { }
                    }
                    return this._cache;
                },
                openDB: function () { return this._init(); },
                saveCache: async function (storeName, data) {
                    await this._init();
                    // Ensure data is an array of objects with username and photoUrl
                    let formattedData = [];
                    if (data instanceof Set) {
                        formattedData = Array.from(data).map(u => ({ username: u, photoUrl: null })); // Default photoUrl
                    } else if (Array.isArray(data)) {
                        formattedData = data.map(item => {
                            if (typeof item === 'string') return { username: item, photoUrl: null };
                            return item; // Assume it's already an object with username and photoUrl
                        });
                    } else {
                        console.warn("[IG Tools] saveCache received unexpected data type:", data);
                        formattedData = [];
                    }
                    this._cache[storeName] = formattedData;
                    try {
                        localStorage.setItem('ig_tools_cache_' + storeName, JSON.stringify(formattedData));
                        await gDriveApi.saveData(this._cache);
                    } catch (errSync) {
                        console.warn(`[IG Tools] Aviso: Dados salvos localmente, sincronização em nuvem pendente (${storeName}):`, errSync);
                    }
                },
                loadCache: async function (storeName) {
                    await this._init();
                    const data = this._cache[storeName]; // This will be an array of objects
                    if (!data) return null;
                    const set = new Set(data.map(u => u.username));
                    set.details = new Map(data.map(u => [u.username, u]));
                    return set;
                },
                saveUnfollowHistory: async function (userData) {
                    await this._init();
                    if (!this._cache.unfollowHistory) this._cache.unfollowHistory = [];
                    this._cache.unfollowHistory.push(userData);
                    await gDriveApi.saveData(this._cache);
                },
                deleteUnfollowHistory: async function (usernames) {
                    await this._init();
                    this._cache.unfollowHistory = (this._cache.unfollowHistory || []).filter(u => !usernames.includes(u.username));
                    await gDriveApi.saveData(this._cache);
                },
                loadUnfollowHistory: async function () {
                    await this._init();
                    return (this._cache.unfollowHistory || []).sort((a, b) => new Date(b.unfollowDate) - new Date(a.unfollowDate));
                },
                saveException: async function (username) {
                    await this._init();
                    if (!this._cache.exceptions) this._cache.exceptions = [];
                    if (!this._cache.exceptions.includes(username)) this._cache.exceptions.push(username);
                    await gDriveApi.saveData(this._cache);
                },
                loadExceptions: async function () {
                    await this._init();
                    return new Set(this._cache.exceptions || []);
                },
                saveCategory: async function (category) {
                    await this._init();
                    if (!this._cache.categories) this._cache.categories = [];
                    const idx = this._cache.categories.findIndex(c => c.id === category.id);
                    if (idx > -1) this._cache.categories[idx] = category;
                    else this._cache.categories.push(category);
                    await gDriveApi.saveData(this._cache);
                },
                loadCategories: async function () {
                    await this._init();
                    return (this._cache.categories || []).sort((a, b) => a.name.localeCompare(b.name));
                },
                deleteCategory: async function (categoryId) {
                    await this._init();
                    this._cache.categories = (this._cache.categories || []).filter(c => c.id !== categoryId);
                    if (this._cache.userCategories) {
                        Object.keys(this._cache.userCategories).forEach(user => {
                            this._cache.userCategories[user] = this._cache.userCategories[user].filter(id => id !== categoryId);
                        });
                    }
                    await gDriveApi.saveData(this._cache);
                },
                saveUserCategories: async function (username, categoryIds) {
                    await this._init();
                    if (!this._cache.userCategories) this._cache.userCategories = {};
                    this._cache.userCategories[username.toLowerCase()] = categoryIds;
                    await gDriveApi.saveData(this._cache);
                },
                loadAllUserCategories: async function () {
                    await this._init();
                    const map = new Map();
                    const data = this._cache.userCategories || {};
                    Object.keys(data).forEach(user => map.set(user, data[user]));
                    return map;
                },
                saveAllUserCategories: async function (categoryMap) {
                    await this._init();
                    // Convert Map to a plain object for JSON serialization
                    this._cache.userCategories = Object.fromEntries(categoryMap);
                    await gDriveApi.saveData(this._cache);
                },
                loadCacheRaw: async function (storeName) {
                    await this._init();
                    const data = this._cache[storeName];
                    if (!data) return null;
                    Object.keys(data).forEach(user => map.set(user, data[user]));
                    return map;
                },
                saveAllUserCategories: async function (categoryMap) {
                    await this._init();
                    this._cache.userCategories = Object.fromEntries(categoryMap);
                    await gDriveApi.saveData(this._cache);
                },
                saveUnblockedAccounts: async function (accounts) {
                    await this._init();
                    this._cache.unblockedAccounts = accounts;
                    try {
                        localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(accounts));
                    } catch (_) { }

                    if (googleAuth.isConnected()) {
                        try {
                            let cloudData = {};
                            try {
                                cloudData = await gDriveApi.loadData();
                                if (!cloudData || typeof cloudData !== 'object') cloudData = {};
                            } catch (_) { }

                            const cloudUnblocked = Array.isArray(cloudData.unblockedAccounts) ? cloudData.unblockedAccounts : [];
                            const map = new Map();
                            cloudUnblocked.forEach(u => {
                                if (u && u.username) map.set(u.username.toLowerCase(), u);
                            });
                            accounts.forEach(u => {
                                if (u && u.username) map.set(u.username.toLowerCase(), u);
                            });
                            const merged = Array.from(map.values());
                            this._cache = { ...(this._cache || {}), ...cloudData, unblockedAccounts: merged };
                            await gDriveApi.saveData(this._cache);

                            // Reconciliação automática: remove contas desbloqueadas do cache de bloqueados
                            try {
                                const cachedBlocked = JSON.parse(localStorage.getItem('ig_tools_cached_blocked'));
                                if (Array.isArray(cachedBlocked) && cachedBlocked.length > 0) {
                                    const unblockedSet = new Set(merged.map(u => (u.username || '').toLowerCase()));
                                    const filteredBlocked = cachedBlocked.filter(u => !unblockedSet.has((u.username || '').toLowerCase()));
                                    if (filteredBlocked.length !== cachedBlocked.length) {
                                        localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(filteredBlocked));
                                        if (typeof cachedBlockedAccounts !== 'undefined') cachedBlockedAccounts = filteredBlocked;
                                    }
                                }
                            } catch (_) { }

                            return merged;
                        } catch (errSync) {
                            console.warn('[IG Tools] Erro ao sincronizar contas desbloqueadas com Drive:', errSync);
                            throw errSync;
                        }
                    } else {
                        console.warn('[IG Tools] Google Drive desconectado. Contas salvas apenas localmente.');
                        throw new Error("Google Drive não conectado. Faça login nas Configurações para sincronizar com outros dispositivos.");
                    }
                },
                loadUnblockedAccounts: async function (forceRefresh = false) {
                    let localList = [];
                    try {
                        const local = JSON.parse(localStorage.getItem('ig_tools_cached_unblocked'));
                        if (Array.isArray(local)) localList = local;
                    } catch (_) { }

                    if (googleAuth.isConnected()) {
                        if (forceRefresh || !this._cache || !Array.isArray(this._cache.unblockedAccounts)) {
                            try {
                                console.log("[IG Tools] Buscando contas desbloqueadas mais recentes do Google Drive...");
                                const cloudData = await gDriveApi.loadData();
                                if (cloudData && typeof cloudData === 'object') {
                                    this._cache = { ...(this._cache || {}), ...cloudData };
                                }
                            } catch (e) {
                                console.error("[IG Tools] Erro ao recarregar contas da nuvem:", e);
                            }
                        }
                        const cloudUnblocked = (this._cache && Array.isArray(this._cache.unblockedAccounts)) ? this._cache.unblockedAccounts : [];
                        const map = new Map();
                        cloudUnblocked.forEach(u => { if (u && u.username) map.set(u.username.toLowerCase(), u); });
                        let addedFromLocal = false;
                        localList.forEach(u => {
                            if (u && u.username && !map.has(u.username.toLowerCase())) {
                                map.set(u.username.toLowerCase(), u);
                                addedFromLocal = true;
                            }
                        });
                        const merged = Array.from(map.values());
                        if (merged.length > 0) {
                            this._cache.unblockedAccounts = merged;
                            try {
                                localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify(merged));
                            } catch (_) { }

                            // Reconciliação automática: remove contas desbloqueadas do cache de bloqueados
                            try {
                                const cachedBlocked = JSON.parse(localStorage.getItem('ig_tools_cached_blocked'));
                                if (Array.isArray(cachedBlocked) && cachedBlocked.length > 0) {
                                    const unblockedSet = new Set(merged.map(u => (u.username || '').toLowerCase()));
                                    const filteredBlocked = cachedBlocked.filter(u => !unblockedSet.has((u.username || '').toLowerCase()));
                                    if (filteredBlocked.length !== cachedBlocked.length) {
                                        localStorage.setItem('ig_tools_cached_blocked', JSON.stringify(filteredBlocked));
                                        if (typeof cachedBlockedAccounts !== 'undefined') cachedBlockedAccounts = filteredBlocked;
                                    }
                                }
                            } catch (_) { }

                            if (addedFromLocal) {
                                gDriveApi.saveData(this._cache).catch(err => console.warn('[IG Tools] Sync back to drive failed:', err));
                            }
                            return merged;
                        }
                    }
                    if (this._cache && Array.isArray(this._cache.unblockedAccounts) && this._cache.unblockedAccounts.length > 0) {
                        return this._cache.unblockedAccounts;
                    }
                    return localList;
                },
                clearCache: async function (storeName) {
                    await this._init();
                    delete this._cache[storeName];

                    // Limpa chaves do localStorage associadas à tabela
                    try {
                        localStorage.removeItem('ig_tools_cache_' + storeName);
                        localStorage.removeItem('ig_tools_cached_' + storeName);
                    } catch (_) { }

                    // Se for unblockedAccounts ou unblocked, garante limpeza completa
                    if (storeName === 'unblockedAccounts' || storeName === 'unblocked') {
                        this._cache.unblockedAccounts = [];
                        try {
                            localStorage.removeItem('ig_tools_cached_unblocked');
                            localStorage.setItem('ig_tools_cached_unblocked', JSON.stringify([]));
                        } catch (_) { }
                        if (typeof cachedUnblockedAccounts !== 'undefined') {
                            cachedUnblockedAccounts = [];
                        }
                    }

                    if (googleAuth.isConnected()) {
                        await gDriveApi.saveData(this._cache);
                    }
                }
            };

            // --- FUNÇÕES SILENCIOSAS DE SEGUIDORES E NOTIFICAÇÃO POR E-MAIL ---
            async function fetchUserListAPISilent(userId, type) {
                const userList = [];
                let nextMaxId = '';
                let hasNextPage = true;
                const appID = '936619743392459';
                const settings = loadSettings();
                // O Instagram limita requisições de seguidores a um máximo de 50/100 itens.
                // Forçamos o lote para 50 para evitar erros HTTP 400 Bad Request.
                const batchSize = 50;
                const delay = settings.requestDelay || 250;

                try {
                    while (hasNextPage) {
                        const queryParams = new URLSearchParams({ count: batchSize });
                        if (nextMaxId) {
                            queryParams.append('max_id', nextMaxId);
                        }
                        const response = await fetch(`https://www.instagram.com/api/v1/friendships/${userId}/${type}/?${queryParams.toString()}`, {
                            headers: getApiHeaders()
                        });
                        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
                        const data = await response.json();
                        if (!data || !data.users) throw new Error("Resposta inválida da API do Instagram");

                        data.users.forEach(user => {
                            userList.push({
                                username: user.username,
                                photoUrl: user.profile_pic_url
                            });
                        });

                        if (data.next_max_id) {
                            nextMaxId = data.next_max_id;
                        } else {
                            hasNextPage = false;
                        }
                        await new Promise(r => setTimeout(r, delay));
                    }
                } catch (error) {
                    console.error(`[IG Tools] Erro silencioso ao buscar ${type}:`, error);
                    return null; // Retorna null para sinalizar falha ou busca incompleta
                }
                return userList;
            }

            function sendUnfollowEmailNotification(unfollowers, recipient, webhookUrl) {
                if (!webhookUrl) {
                    console.error("[IG Tools] Webhook URL de e-mail não configurada.");
                    return Promise.reject("Webhook URL não configurada");
                }
                console.log("[IG Tools] Enviando notificação de unfollow por e-mail...");
                return new Promise((resolve, reject) => {
                    const httpHandler = (typeof GM_xmlhttpRequest !== 'undefined')
                        ? GM_xmlhttpRequest
                        : (window.IGTools?.HttpClient?.request || null);

                    const postData = JSON.stringify({
                        recipient: recipient,
                        unfollowers: unfollowers
                    });

                    if (httpHandler) {
                        httpHandler({
                            method: "POST",
                            url: webhookUrl,
                            anonymous: true,
                            headers: {
                                "Content-Type": "application/json"
                            },
                            data: postData,
                            onload: function (response) {
                                console.log("[IG Tools] Resposta do webhook de e-mail:", response.status, response.responseText);
                                if (response.status >= 200 && response.status < 300) {
                                    resolve(response.responseText);
                                } else {
                                    reject("Erro no envio do e-mail: " + response.status);
                                }
                            },
                            onerror: function (err) {
                                console.error("[IG Tools] Erro ao enviar e-mail via webhook:", err);
                                reject(err);
                            }
                        });
                    } else {
                        fetch(webhookUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: postData
                        })
                            .then(async (res) => {
                                const text = await res.text();
                                if (res.ok) resolve(text);
                                else reject("Erro no envio do e-mail: " + res.status);
                            })
                            .catch((err) => {
                                console.error("[IG Tools] Erro ao enviar e-mail via webhook:", err);
                                reject(err);
                            });
                    }
                });
            }

            async function executarVerificacaoAgendadaUnfollow() {
                const settings = loadSettings();
                if (!settings.unfollowEmailEnabled || !settings.unfollowEmailWebhookUrl) {
                    return;
                }

                // Verifica se passou pelo menos 1 hora (3600000 ms)
                const horaEmMs = 3600000;
                const agora = Date.now();
                if (agora - settings.lastUnfollowEmailCheck < horaEmMs) {
                    console.log("[IG Tools] Verificação agendada de unfollow: Menos de 1 hora se passou desde a última verificação.");
                    return;
                }

                const userId = getCookie('ds_user_id');
                if (!userId) {
                    console.log("[IG Tools] Verificação agendada de unfollow: Usuário não está logado no Instagram.");
                    return;
                }

                // Atualiza o timestamp temporariamente para evitar múltiplas execuções simultâneas
                saveSettings({ lastUnfollowEmailCheck: agora });
                console.log("[IG Tools] Iniciando verificação agendada de unfollow em segundo plano...");

                try {
                    // 1. Carrega seguidores anteriores do Google Drive
                    const dbFollowers = await dbHelper.loadCache('followers');
                    if (!dbFollowers) {
                        console.log("[IG Tools] Primeiro carregamento de seguidores. Salvando lista atual no Google Drive sem enviar e-mail.");
                        const currentFollowersList = await fetchUserListAPISilent(userId, 'followers');
                        if (currentFollowersList && currentFollowersList.length > 0) {
                            await dbHelper.saveCache('followers', currentFollowersList);
                        }
                        return;
                    }

                    // 2. Busca seguidores atuais do Instagram
                    const currentFollowersList = await fetchUserListAPISilent(userId, 'followers');
                    if (!currentFollowersList) {
                        console.warn("[IG Tools] A busca de seguidores atuais falhou ou foi parcial. Abortando verificação para evitar falsos positivos.");
                        // Restaura o timestamp para permitir nova tentativa em breve
                        saveSettings({ lastUnfollowEmailCheck: 0 });
                        return;
                    }

                    // Cria um Set dos seguidores atuais para busca rápida
                    const currentFollowersSet = new Set(currentFollowersList.map(u => u.username.toLowerCase()));

                    // 3. Compara: Quem estava no cache do Drive (dbFollowers) mas não está na lista atual?
                    const unfollowers = [];
                    dbFollowers.forEach(prevUsername => {
                        const lowerPrev = prevUsername.toLowerCase();
                        if (!currentFollowersSet.has(lowerPrev)) {
                            const details = dbFollowers.details?.get(prevUsername) || { username: prevUsername, photoUrl: null };
                            unfollowers.push({
                                username: details.username || prevUsername,
                                photoUrl: details.photoUrl || null
                            });
                        }
                    });

                    // 4. Se houver unfollowers, envia a notificação por e-mail e salva no histórico
                    if (unfollowers.length > 0) {
                        console.log(`[IG Tools] Detectados ${unfollowers.length} unfollowers! Enviando e-mail...`);
                        try {
                            await sendUnfollowEmailNotification(
                                unfollowers,
                                settings.unfollowEmailRecipient || '',
                                settings.unfollowEmailWebhookUrl
                            );

                            // Adiciona ao histórico de unfollows local/Drive
                            for (const unfollower of unfollowers) {
                                await dbHelper.saveUnfollowHistory({
                                    username: unfollower.username,
                                    photoUrl: unfollower.photoUrl,
                                    unfollowDate: new Date().toISOString()
                                });
                            }
                            console.log("[IG Tools] Notificação de e-mail enviada e histórico atualizado.");
                        } catch (emailErr) {
                            console.error("[IG Tools] Falha ao enviar e-mail de notificação:", emailErr);
                        }
                    } else {
                        console.log("[IG Tools] Nenhum unfollow detectado nesta verificação.");
                    }

                    // 5. Salva a nova lista de seguidores atualizada no Google Drive
                    await dbHelper.saveCache('followers', currentFollowersList);
                    console.log("[IG Tools] Lista de seguidores atualizada salva no Google Drive.");

                } catch (err) {
                    console.error("[IG Tools] Erro na verificação agendada de unfollow:", err);
                    // Reseta o timestamp em caso de erro crítico
                    saveSettings({ lastUnfollowEmailCheck: 0 });
                }
            }

            // --- LÓGICA DE CONFIGURAÇÕES ---
            function loadSettings() {
                const defaults = {
                    darkMode: false,
                    rgbBorder: false,
                    language: 'pt-BR',
                    unfollowDelay: 5000,
                    itemsPerPage: 10,
                    requestDelay: 250,
                    requestBatchSize: 50,
                    maxRequests: 0,
                    anonymousStories: false,
                    useApi: true,
                    unfollowEmailEnabled: false,
                    unfollowEmailRecipient: '',
                    unfollowEmailWebhookUrl: '',
                    lastUnfollowEmailCheck: 0,
                    validateProfileStatus: true,
                };
                try {
                    const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2'));
                    return { ...defaults, ...saved };
                } catch (e) {
                    return defaults;
                }
            }

            const translations = {
                'pt-BR': { likes: 'Curtidas', comments: 'Comentários', blocked: 'Bloqueados', messages: 'Mensagens', notFollowingBack: 'Não segue de volta', following: 'Seguindo', closeFriends: 'Amigos Próximos', hideStory: 'Ocultar Story', mutedAccounts: 'Contas Silenciadas', interactions: 'Interações', reelsMenu: 'Menu de Reels', downloadStory: 'Baixar Story', settings: 'Configurações', darkMode: 'Modo Escuro', rgbBorder: 'Borda RGB', shortcuts: 'Atalhos', parameters: 'Parâmetros', language: 'Idioma', anonymousStories: 'Stories Anônimo', useApi: 'Usar API (Rápido)', validateProfileStatus: 'Validar Status (P/A)' },
                'en-US': { likes: 'Likes', comments: 'Comments', blocked: 'Blocked', messages: 'Messages', notFollowingBack: 'Not Following Back', following: 'Following', closeFriends: 'Close Friends', hideStory: 'Hide Story', mutedAccounts: 'Muted Accounts', interactions: 'Interactions', reelsMenu: 'Reels Menu', downloadStory: 'Download Story', settings: 'Settings', darkMode: 'Dark Mode', rgbBorder: 'RGB Border', shortcuts: 'Shortcuts', parameters: 'Parameters', language: 'Language', anonymousStories: 'Anonymous Stories', useApi: 'Use API (Fast)', validateProfileStatus: 'Validate Status (P/O)' },
                'es-ES': { likes: 'Me gusta', comments: 'Comentarios', blocked: 'Bloqueados', messages: 'Mensajes', notFollowingBack: 'No te sigue', following: 'Siguiendo', closeFriends: 'Mejores Amigos', hideStory: 'Ocultar Historia', mutedAccounts: 'Cuentas Silenciadas', interactions: 'Interacciones', reelsMenu: 'Menú de Reels', downloadStory: 'Descargar Historia', settings: 'Configuración', darkMode: 'Modo Oscuro', rgbBorder: 'Borde RGB', shortcuts: 'Atajos', parameters: 'Parámetros', language: 'Idioma', anonymousStories: 'Historias Anónimas', useApi: 'Usar API (Rápido)', validateProfileStatus: 'Validar Estado (P/A)' },
                'fr-FR': { likes: 'J\'aime', comments: 'Commentaires', blocked: 'Bloqués', messages: 'Messages', notFollowingBack: 'Ne suit pas en retour', following: 'Abonnements', closeFriends: 'Amis Proches', hideStory: 'Masquer Story', mutedAccounts: 'Comptes Muets', interactions: 'Interactions', reelsMenu: 'Menu Reels', downloadStory: 'Télécharger Story', settings: 'Paramètres', darkMode: 'Mode Sombre', rgbBorder: 'Bordure RGB', shortcuts: 'Raccourcis', parameters: 'Paramètres', language: 'Langue', anonymousStories: 'Stories Anonymes', useApi: 'Utiliser API (Rapide)', validateProfileStatus: 'Valider Statut (P/O)' },
                'it-IT': { likes: 'Mi piace', comments: 'Commenti', blocked: 'Bloccati', messages: 'Messaggi', notFollowingBack: 'Non ti segue', following: 'Seguiti', closeFriends: 'Amici Più Stretti', hideStory: 'Nascondi Storia', mutedAccounts: 'Account Silenziati', interactions: 'Interazioni', reelsMenu: 'Menu Reels', downloadStory: 'Scarica Storia', settings: 'Impostazioni', darkMode: 'Modalità Scura', rgbBorder: 'Bordo RGB', shortcuts: 'Scorciatoie', parameters: 'Parametri', language: 'Lingua', anonymousStories: 'Storie Anonime', useApi: 'Usa API (Veloce)', validateProfileStatus: 'Valida Stato (P/A)' },
                'de-DE': { likes: 'Gefällt mir', comments: 'Kommentare', blocked: 'Blockiert', messages: 'Nachrichten', notFollowingBack: 'Folgt nicht zurück', following: 'Abonniert', closeFriends: 'Engste Freunde', hideStory: 'Story verbergen', mutedAccounts: 'Stummgeschaltete', interactions: 'Interaktionen', reelsMenu: 'Reels Menü', downloadStory: 'Story herunterladen', settings: 'Einstellungen', darkMode: 'Dunkelmodus', rgbBorder: 'RGB-Rand', shortcuts: 'Verknüpfungen', parameters: 'Parameter', language: 'Sprache', anonymousStories: 'Anonyme Stories', useApi: 'API verwenden (Schnell)', validateProfileStatus: 'Status validieren (P/Ö)' }
            };

            function getText(key) {
                const lang = loadSettings().language || 'pt-BR';
                return translations[lang]?.[key] || translations['pt-BR'][key] || key;
            }

            function saveSettings(newSettings) {
                const current = loadSettings();
                const updated = { ...current, ...newSettings };
                localStorage.setItem('instagramToolsSettings_v2', JSON.stringify(updated));
            }

            function toggleDarkMode(enabled) {
                document.body.classList.toggle('dark-mode', enabled);
                const btn = document.getElementById("settingsDarkModeBtn");
                if (btn) btn.style.background = enabled ? '#4c5c75' : '';
            }

            function toggleRgbBorder(enabled) {
                const elements = document.querySelectorAll('.submenu-modal, .assistive-menu');
                elements.forEach(el => {
                    el.classList.toggle('rgb-border-effect', enabled);
                });
                const btn = document.getElementById("settingsRgbBorderBtn");
                if (btn) btn.style.background = enabled ? '#4c5c75' : '';
            }

            function toggleAnonymousStories(enabled) {
                const btn = document.getElementById("settingsAnonymousStoriesBtn");
                if (btn) btn.style.background = enabled ? '#4c5c75' : '';
            }

            function toggleUseApi(enabled) {
                const btn = document.getElementById("settingsUseApiBtn");
                if (btn) btn.style.background = enabled ? '#4c5c75' : '';
            }

            function applyInitialSettings() {
                const settings = loadSettings();
                toggleDarkMode(settings.darkMode);
                toggleRgbBorder(settings.rgbBorder);
                toggleAnonymousStories(settings.anonymousStories);
                toggleUseApi(settings.useApi);
                if (settings.validateProfileStatus && typeof validateCurrentPagePrivacy === 'function') {
                    validateCurrentPagePrivacy();
                }
            }

            // --- LISTENER PARA AÇÕES VINDAS DO POPUP DO IPHONE ---
            window.addEventListener('message', (event) => {
                if (!event.data || event.data.source !== 'IG_TOOLS_BRIDGE') return;

                console.log("[IG Tools] Mensagem do popup iPhone recebida no Instagram:", event.data);

                // Consulta ultra-rápida de contagem de seguidores via GraphQL HoverCard oficial (Sem 429)
                if (event.data.action === 'GET_FOLLOWERS_COUNT_FROM_MAIN') {
                    const uid = event.data.userId;
                    const reqId = event.data.id;
                    (async () => {
                        let count = null;
                        try {
                            if (typeof executeGraphqlUserHoverCard === 'function') {
                                const stats = await executeGraphqlUserHoverCard(uid);
                                if (stats && typeof stats.followers === 'number') {
                                    count = stats.followers;
                                    console.log(`[IG Tools] Contagem oficial obtida via GraphQL HoverCard: ${count}`);
                                }
                            }
                        } catch (e) {
                            console.warn('[IG Tools] Falha no GraphQL HoverCard:', e);
                        }

                        if (count === null) {
                            const headerLinks = document.querySelectorAll('header a, header span');
                            for (const el of headerLinks) {
                                const text = el.innerText || '';
                                if (text.toLowerCase().includes('seguidor') || text.toLowerCase().includes('follower')) {
                                    const numMatch = text.match(/[\d.,]+/);
                                    if (numMatch) {
                                        const parsed = parseInt(numMatch[0].replace(/\D/g, ''), 10);
                                        if (parsed > 0) { count = parsed; break; }
                                    }
                                }
                            }
                        }

                        window.postMessage({
                            source: 'IG_TOOLS_MAIN',
                            action: 'RESPONSE_FOLLOWERS_COUNT',
                            id: reqId,
                            count: count
                        }, '*');
                    })();
                    return;
                }

                // Disparo de Pop-up Visual de Unfollow na tela do Instagram
                if (event.data.action === 'SHOW_UNFOLLOW_POPUP') {
                    showUnfollowFloatingPopup(event.data.payload || {});
                    return;
                }

                if (event.data.action === 'IG_POPUP_TOGGLE' && event.data.payload) {
                    const { setting, value } = event.data.payload;
                    if (setting === 'darkMode') toggleDarkMode(value);
                    if (setting === 'rgbBorder') toggleRgbBorder(value);
                    if (setting === 'anonymousStories') toggleAnonymousStories(value);
                    if (setting === 'useApi') toggleUseApi(value);
                    if (setting === 'validateProfileStatus') {
                        saveSettings({ validateProfileStatus: value });
                        if (value && typeof validateCurrentPagePrivacy === 'function') validateCurrentPagePrivacy();
                        else {
                            document.querySelectorAll('.ig-privacy-badge').forEach(b => b.remove());
                            document.querySelectorAll('[data-privacy-processed]').forEach(el => el.removeAttribute('data-privacy-processed'));
                        }
                    }
                    saveSettings({ [setting]: value });
                }

                if (event.data.action === 'IG_POPUP_OPEN_MODAL' && event.data.payload) {
                    const { modal } = event.data.payload;
                    console.log("[IG Tools] Abrindo modal:", modal);

                    document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                    ['settingsModal', 'manageCategoriesModal', 'shortcutsModal', 'paramsModal', 'langModal', 'naoSegueDeVoltaDiv', 'closeFriendsModal', 'hideStoryModal'].forEach(id => {
                        document.getElementById(id)?.remove();
                    });

                    if (typeof injectMenu === 'function') injectMenu();
                    const modals = window.__igToolsModals || {};

                    if (modal === 'settings' && modals.openSettings) modals.openSettings();
                    else if (modal === 'voice' && modals.openVoice) modals.openVoice();
                    else if (modal === 'categories' && modals.openCategories) modals.openCategories();
                    else if (modal === 'shortcuts' && modals.openShortcuts) modals.openShortcuts();
                    else if (modal === 'parameters' && modals.openParameters) modals.openParameters();
                    else if (modal === 'language' && modals.openLanguage) modals.openLanguage();
                    else if (modal === 'notFollowingBack' && modals.openNotFollowingBack) modals.openNotFollowingBack('tabNaoSegueDeVolta');
                    else if (modal === 'unfollowHistory' && modals.openNotFollowingBack) modals.openNotFollowingBack('tabHistorico');
                    else if (modal === 'closeFriends' && modals.openCloseFriends) modals.openCloseFriends();
                    else if (modal === 'hideStory' && modals.openHideStory) modals.openHideStory();
                    else if (modal === 'muted' && modals.openMuted) modals.openMuted();
                    else if (modal === 'interactions' && modals.openInteractions) modals.openInteractions();
                    else if (modal === 'reels' && modals.openReels) modals.openReels();
                    else if (modal === 'following' && modals.openFollowing) modals.openFollowing();
                    else if (modal === 'blocked' && modals.openBlocked) modals.openBlocked();
                    else {
                        // Fallback direto
                        if (modal === 'settings' && typeof abrirModalConfiguracoes === 'function') abrirModalConfiguracoes();
                        if (modal === 'voice' && typeof abrirModalComandosVoz === 'function') abrirModalComandosVoz();
                        if (modal === 'categories' && typeof abrirModalGerenciarCategorias === 'function') abrirModalGerenciarCategorias();
                        if (modal === 'shortcuts' && typeof abrirModalAtalhos === 'function') abrirModalAtalhos();
                        if (modal === 'parameters' && typeof abrirModalParametros === 'function') abrirModalParametros();
                        if (modal === 'language' && typeof abrirModalIdioma === 'function') abrirModalIdioma();
                        if (modal === 'notFollowingBack' && typeof iniciarProcessoNaoSegueDeVolta === 'function') iniciarProcessoNaoSegueDeVolta('tabNaoSegueDeVolta');
                        if (modal === 'unfollowHistory' && typeof iniciarProcessoNaoSegueDeVolta === 'function') iniciarProcessoNaoSegueDeVolta('tabHistorico');
                        if (modal === 'closeFriends' && typeof abrirModalAmigosProximos === 'function') abrirModalAmigosProximos();
                    }
                }
            });

            // ========================================================
            // MÓDULO DE ATALHOS DE TECLADO (Modularizado em src/features/shortcuts.js)
            // ========================================================
            const getShortcuts = window.IGTools?.Shortcuts?.getShortcuts || window.getShortcuts;
            const saveShortcuts = window.IGTools?.Shortcuts?.saveShortcuts || window.saveShortcuts;
            const formatShortcutForDisplay = window.IGTools?.Shortcuts?.formatShortcutForDisplay || window.formatShortcutForDisplay;
            const executeXPathClick = window.IGTools?.Shortcuts?.executeXPathClick || window.executeXPathClick;
            const initShortcutListener = window.IGTools?.Shortcuts?.initShortcutListener || window.initShortcutListener;

            function injectMenu() {
                // Expõe os gerenciadores de modais globalmente para acesso imediato via popup do iPhone, atalhos, etc.
                window.__igToolsModals = {
                    openSettings: () => {
                        document.getElementById("settingsModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalConfiguracoes === 'function') abrirModalConfiguracoes();
                    },
                    openVoice: () => {
                        document.getElementById("voiceCommandsModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalComandosVoz === 'function') abrirModalComandosVoz();
                    },
                    openCategories: () => {
                        document.getElementById("manageCategoriesModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalGerenciarCategorias === 'function') abrirModalGerenciarCategorias();
                    },
                    openShortcuts: () => {
                        document.getElementById("shortcutsModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalAtalhos === 'function') abrirModalAtalhos();
                    },
                    openParameters: () => {
                        document.getElementById("paramsModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalParametros === 'function') abrirModalParametros();
                    },
                    openLanguage: () => {
                        document.getElementById("langModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalIdioma === 'function') abrirModalIdioma();
                    },
                    openNotFollowingBack: (tab) => {
                        document.getElementById("naoSegueDeVoltaDiv")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof iniciarProcessoNaoSegueDeVolta === 'function') iniciarProcessoNaoSegueDeVolta(tab || 'tabNaoSegueDeVolta');
                    },
                    openCloseFriends: () => {
                        document.getElementById("closeFriendsModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalAmigosProximos === 'function') abrirModalAmigosProximos();
                    },
                    openHideStory: () => {
                        document.querySelectorAll("#hideStoryModal").forEach(m => m.remove());
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        modalAbertoStory = false;
                        window.__isOpeningHideStoryModal = false;
                        if (typeof abrirModalOcultarStory === 'function') abrirModalOcultarStory();
                    },
                    openMuted: () => {
                        document.getElementById("mutedAccountsModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        const openMuted = window.IGTools?.MutedAccounts?.abrirModalContasSilenciadas || window.abrirModalContasSilenciadas || (typeof abrirModalContasSilenciadas === 'function' ? abrirModalContasSilenciadas : null);
                        if (typeof openMuted === 'function') openMuted();
                    },
                    openInteractions: () => {
                        document.getElementById("interacoesModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalInteracoes === 'function') abrirModalInteracoes();
                    },
                    openReels: () => {
                        document.getElementById("reelsModal")?.remove();
                        document.querySelectorAll('.submenu-modal').forEach(m => m.remove());
                        if (typeof abrirModalReels === 'function') abrirModalReels();
                    },
                    openBlocked: () => {
                        if (typeof iniciarProcessoBloqueados === 'function') iniciarProcessoBloqueados();
                    },
                    openFollowing: () => {
                        if (typeof iniciarProcessoSeguindo === 'function') iniciarProcessoSeguindo();
                    }
                };

                if ((document.getElementById("assistiveTouchMenu") || document.querySelector('.assistive-menu')) && document.getElementById("instagramToolsSidebarBtn")) return;

                // ========================================================
                // MÓDULO DE CONTROLE DE VOZ (Modularizado em src/features/voice-control.js)
                // ========================================================
                const voiceControl = window.IGTools?.VoiceControl?.voiceControl || window.voiceControl || {
                    init: () => {},
                    start: () => {},
                    stop: () => {},
                    toggle: () => false,
                    isListening: false
                };

                // --- Funções auxiliares ---
                function findSidebarContainer() {
                    const homeLink = document.querySelector('a[href="/"]');
                    const exploreLink = document.querySelector('a[href="/explore/"]');
                    if (homeLink && exploreLink) {
                        let parent = homeLink.parentElement;
                        while (parent) {
                            if (parent.contains(exploreLink)) return parent;
                            parent = parent.parentElement;
                        }
                    }
                    return document.querySelector('div.x78zum5.xaw8158.xh8yej3');
                }

                function findItemToClone(container, link) {
                    if (!container || !link) return null;
                    let element = link;
                    while (element && element.parentElement) {
                        if (element.parentElement === container) return element;
                        element = element.parentElement;
                    }
                    return null;
                }

                // Add dynamic styles
                if (!document.getElementById("dynamicMenuStyle")) {
                    const style = document.createElement("style");
                    style.id = "dynamicMenuStyle";
                    document.head.appendChild(style);

                    function updateColors() {
                        style.innerHTML = `
                            .assistive-menu {
                                position: fixed;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                display: none;
                                flex-direction: column;
                                gap: 10px;
                                z-index: 2147483647;
                                background: white;
                                padding: 20px;
                                border-radius: 12px;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                width: 300px;
                                max-height: 80vh;
                                overflow-y: auto;
                            }
                            .menu-item {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                            }
                            .menu-item button {
                                width: 50px;
                                height: 50px;
                                border-radius: 50%;
                                border: none;
                                background: transparent;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                transition: background 0.2s;
                                color: inherit;
                            }
                            .menu-item button:hover {
                                background: rgba(0, 0, 0, 0.05);
                                border-radius: 8px;
                            }
                            .menu-item span {
                                font-size: 14px;
                                color: black;
                                font-weight: 500;
                            }
                            .submenu-modal {
                                background: white;
                                color: black;
                            }
                                    .submenu-modal h2, .submenu-modal span, .submenu-modal th, .submenu-modal td, .submenu-modal li span, .submenu-modal label {
                                color: black !important;
                            }
                                    .submenu-modal input, .submenu-modal select, .submenu-modal option {
                                        background: white !important;
                                        color: black !important;
                                    }
                            .dark-mode .assistive-menu {
                                background: black !important;
                                border: 1px solid #333;
                            }
                            .dark-mode .menu-item span {
                                color: white !important;
                            }
                            .dark-mode .menu-item button {
                                color: white;
                            }
                            .dark-mode .menu-item button:hover {
                                background: rgba(255, 255, 255, 0.1);
                            }
                            .dark-mode #allCloseFriendsDiv {
                                background: black;
                                color: white;
                            }
                            .dark-mode #allHideStoryDiv {
                                background: black;
                                color: white;
                            }
                            .dark-mode #naoSegueDeVoltaDiv {
                                background: black;
                                color: white;
                            }
                            .dark-mode .submenu-modal {
                                background: black !important;
                                color: white !important;
                            }
                            .dark-mode .submenu-modal h2 {
                                color: white !important;
                            }
                                    .dark-mode .submenu-modal span, .dark-mode .submenu-modal th, .dark-mode .submenu-modal td, .dark-mode .submenu-modal li span, .dark-mode .submenu-modal a, .dark-mode .submenu-modal label {
                                color: white !important;
                            }
                            .dark-mode .badge-hs-hidden {
                                background: rgba(230, 126, 34, 0.25) !important;
                                color: #f39c12 !important;
                                border: 1px solid rgba(230, 126, 34, 0.5) !important;
                            }
                            .dark-mode .badge-hs-visible, .dark-mode .badge-cf-following {
                                background: rgba(108, 117, 125, 0.25) !important;
                                color: #adb5bd !important;
                                border: 1px solid rgba(108, 117, 125, 0.5) !important;
                            }
                            .dark-mode .badge-cf-active {
                                background: rgba(46, 204, 113, 0.25) !important;
                                color: #2ecc71 !important;
                                border: 1px solid rgba(46, 204, 113, 0.5) !important;
                            }
                            /* Correção para visibilidade de categorias no modo escuro */
                            .dark-mode .category-item-container {
                                background: #262626 !important;
                            }

                            /* Modal de Interações - Padrão de Fontes e Cores */
                            #interacoesModal, #interacoesModal * {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                            }
                            #interacoesModal {
                                border: 1px solid #ccc;
                            }
                            .dark-mode #interacoesModal {
                                border: 1px solid #333 !important;
                            }
                            .submenu-modal .interacoes-input {
                                width: 100%;
                                padding: 11px 14px;
                                border-radius: 8px;
                                box-sizing: border-box;
                                font-size: 14px;
                                outline: none;
                                transition: border-color 0.2s, background 0.2s;
                                background: #ffffff !important;
                                color: #000000 !important;
                                border: 1px solid #dbdbdb !important;
                            }
                            .dark-mode .submenu-modal .interacoes-input {
                                background: #262626 !important;
                                color: #ffffff !important;
                                border: 1px solid #555 !important;
                            }
                            .submenu-modal #interacoesSuggestions {
                                position: absolute;
                                top: calc(100% + 4px);
                                left: 0;
                                right: 0;
                                border-radius: 8px;
                                max-height: 220px;
                                overflow-y: auto;
                                overflow-x: hidden;
                                z-index: 10001;
                                display: none;
                                scrollbar-width: thin;
                                background: #ffffff !important;
                                border: 1px solid #dbdbdb !important;
                                box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
                            }
                            .dark-mode .submenu-modal #interacoesSuggestions {
                                background: #262626 !important;
                                border: 1px solid #444 !important;
                                box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
                            }
                            .submenu-modal .interacoes-suggestion-item {
                                color: #000000 !important;
                            }
                            .submenu-modal .interacoes-suggestion-item:hover {
                                background: rgba(0, 0, 0, 0.06) !important;
                            }
                            .dark-mode .submenu-modal .interacoes-suggestion-item {
                                color: #ffffff !important;
                            }
                            .dark-mode .submenu-modal .interacoes-suggestion-item:hover {
                                background: rgba(255, 255, 255, 0.1) !important;
                            }
                            .submenu-modal #interacoesUserNameDisplay {
                                color: #262626 !important;
                            }
                            .submenu-modal #interacoesUserBioDisplay {
                                color: #737373 !important;
                            }
                            .submenu-modal #detalhesTitulo {
                                color: #262626 !important;
                            }
                            .submenu-modal .interacoes-status-text {
                                color: #262626 !important;
                            }
                            .dark-mode .submenu-modal #interacoesUserNameDisplay {
                                color: #ffffff !important;
                            }
                            .dark-mode .submenu-modal #interacoesUserBioDisplay {
                                color: #a8a8a8 !important;
                            }
                            .dark-mode .submenu-modal #detalhesTitulo {
                                color: #ffffff !important;
                            }
                            .dark-mode .submenu-modal .interacoes-status-text {
                                color: #e0e0e0 !important;
                            }

                            /* Tema Claro: Modal Claro -> Cards Escuros */
                            .submenu-modal .interacoes-stat-card {
                                background: #262626 !important;
                                border: 1px solid #3d3d3d !important;
                                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25) !important;
                            }
                            .submenu-modal .interacoes-stat-card .card-count {
                                color: #0095f6 !important;
                            }
                            .submenu-modal .interacoes-stat-card .card-label,
                            .submenu-modal .interacoes-stat-card span,
                            .submenu-modal .interacoes-stat-card div:not(.card-count) {
                                color: #ffffff !important;
                            }

                            /* Tema Escuro: Modal Escuro -> Cards Claros */
                            .dark-mode .submenu-modal .interacoes-stat-card {
                                background: #ffffff !important;
                                border: 1px solid #e0e0e0 !important;
                                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15) !important;
                            }
                            .dark-mode .submenu-modal .interacoes-stat-card .card-count {
                                color: #0095f6 !important;
                            }
                            .dark-mode .submenu-modal .interacoes-stat-card .card-label,
                            .dark-mode .submenu-modal .interacoes-stat-card span,
                            .dark-mode .submenu-modal .interacoes-stat-card div:not(.card-count) {
                                color: #262626 !important;
                            }

                            /* Badges da Coluna Tipo de Bloqueio com alto contraste */
                            .submenu-modal .badge-tipo-bloqueio,
                            .dark-mode .submenu-modal .badge-tipo-bloqueio {
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                padding: 4px 10px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: 700 !important;
                            }
                            .submenu-modal .badge-auto-blocked,
                            .dark-mode .submenu-modal .badge-auto-blocked {
                                background: #fde8e8 !important;
                                color: #b71c1c !important;
                                border: 1px solid #f8b4b4 !important;
                            }
                            .submenu-modal .badge-standard,
                            .dark-mode .submenu-modal .badge-standard {
                                background: #e8f4fd !important;
                                color: #0d47a1 !important;
                                border: 1px solid #90caf9 !important;
                            }

                            .menu-item-button {
                                background: #f8f9fa; border: 1px solid #dbdbdb; padding: 10px; border-radius: 8px; cursor: pointer; text-align: left; font-size: 15px; color: black; transition: background 0.2s, border-color 0.2s;
                            }
                            .dark-mode .submenu-modal .menu-item-button,
                            .dark-mode #settingsModal .menu-item-button,
                            .dark-mode #reelsSubmenuModal .menu-item-button {
                                background: #262626 !important;
                                color: #ffffff !important;
                                border-color: #555 !important;
                            }
                            .dark-mode .submenu-modal .menu-item-button:hover,
                            .dark-mode #settingsModal .menu-item-button:hover,
                            .dark-mode #reelsSubmenuModal .menu-item-button:hover {
                                background: #333333 !important;
                            }
                            .dark-mode #googleLoginBtn {
                                background: #262626 !important;
                                color: #ffffff !important;
                                border: 1px solid #555 !important;
                            }
                            .dark-mode #googleLoginBtn:hover {
                                background: #333333 !important;
                            }

                            /* Estilo da fonte e fundo dos botões de paginação em todos os modais */
                            #prevCfPageBtn, #nextCfPageBtn,
                            #prevHsPageBtn, #nextHsPageBtn,
                            #prevMutedPageBtn, #nextMutedPageBtn,
                            #prevBlockedPageBtn, #nextBlockedPageBtn,
                            #prevPageBtn, #nextPageBtn,
                            #paginationControls button {
                                color: #111111 !important;
                                background: #f8f9fa !important;
                                border: 1px solid #dbdbdb !important;
                                font-weight: 600 !important;
                                font-size: 13px !important;
                                cursor: pointer !important;
                                line-height: 1.4 !important;
                            }
                            #prevCfPageBtn:hover, #nextCfPageBtn:hover,
                            #prevHsPageBtn:hover, #nextHsPageBtn:hover,
                            #prevMutedPageBtn:hover, #nextMutedPageBtn:hover,
                            #prevBlockedPageBtn:hover, #nextBlockedPageBtn:hover,
                            #prevPageBtn:hover, #nextPageBtn:hover,
                            #paginationControls button:hover:not(:disabled) {
                                background: #e9ecef !important;
                                color: #000000 !important;
                            }
                            #paginationControls button:disabled {
                                opacity: 0.4 !important;
                                cursor: not-allowed !important;
                            }
                            .tab-container {
                                display: flex;
                                border-bottom: 1px solid #dbdbdb;
                                margin-bottom: 15px;
                            }
                            .tab-button {
                                padding: 10px 20px;
                                cursor: pointer;
                                border: none;
                                background-color: transparent;
                                color: #8e8e8e;
                                font-weight: 600;
                            }
                            .tab-button.active {
                                color: #262626;
                                border-bottom: 2px solid #262626;
                            }
                            .modal-header {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 10px;
                                background-color: #f0f0f0;
                                border-bottom: 1px solid #dbdbdb;
                                cursor: move; /* Para arrastar a janela */
                                border-top-left-radius: 10px;
                                border-top-right-radius: 10px;
                            }
                            .dark-mode .modal-header {
                                background-color: #262626;
                                border-bottom: 1px solid #363636;
                            }
                            .modal-title { font-weight: bold; }
                            .modal-controls button {
                                background: none; border: none; font-size: 16px;
                                cursor: pointer; padding: 5px;
                                color: #8e8e8e;
                            }
                            @keyframes rgb-border-animation {
                                0% { border-color: rgb(255, 0, 0); }
                                15% { border-color: rgb(255, 128, 0); }
                                30% { border-color: rgb(255, 255, 0); }
                                45% { border-color: rgb(0, 255, 0); }
                                60% { border-color: rgb(0, 128, 255); }
                                75% { border-color: rgb(128, 0, 255); }
                                90% { border-color: rgb(255, 0, 255); }
                                100% { border-color: rgb(255, 0, 0); }
                            }
                            .rgb-border-effect {
                                border-style: solid !important;
                                border-width: 2px !important;
                                animation: rgb-border-animation 5s linear infinite;
                            }

                            /* Loading Spinner */
                            .loading-overlay {
                                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                                background: rgba(255, 255, 255, 0.7);
                                display: flex; flex-direction: column; justify-content: center; align-items: center;
                                z-index: 10005; border-radius: 10px;
                            }
                            .dark-mode .loading-overlay { background: rgba(0, 0, 0, 0.7); }
                            .spinner {
                                width: 40px; height: 40px;
                                border: 4px solid #f3f3f3;
                                border-top: 4px solid #3498db;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                            }
                            .loading-text { margin-top: 10px; font-weight: bold; color: #0095f6; font-size: 16px; font-family: sans-serif; }
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                            .info-tooltip { position: relative; display: inline-block; cursor: help; color: #8e8e8e; vertical-align: middle; }
                            .info-tooltip .tooltip-text { visibility: hidden; width: 220px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 8px; position: absolute; z-index: 100000; top: 100%; margin-top: 10px; left: 50%; margin-left: -110px; opacity: 0; transition: opacity 0.3s; font-size: 12px; font-weight: normal; line-height: 1.4; box-shadow: 0 2px 10px rgba(0,0,0,0.2); pointer-events: none; }
                            .info-tooltip .tooltip-text::after { content: ""; position: absolute; bottom: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: transparent transparent #333 transparent; }
                            .info-tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }

                            /* Toggle Switch Styles */
                            .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
                            .switch input { opacity: 0; width: 0; height: 0; }
                            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
                            .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
                            input:checked + .slider { background-color: #0095f6; }
                            input:checked + .slider:before { transform: translateX(20px); }
                            .toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; font-size: 16px; color: black; }
                            .dark-mode .toggle-item { background: #262626 !important; color: white !important; border-color: #555 !important; }

                            /* Loading Spinner */
                            .loading-overlay {
                                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                                background: rgba(255, 255, 255, 0.7);
                                display: flex; flex-direction: column; justify-content: center; align-items: center;
                                z-index: 10005; border-radius: 10px;
                            }
                            .dark-mode .loading-overlay { background: rgba(0, 0, 0, 0.7); }
                            .spinner {
                                width: 40px; height: 40px;
                                border: 4px solid #f3f3f3;
                                border-top: 4px solid #3498db;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                            }
                            .loading-text { margin-top: 10px; font-weight: bold; color: #0095f6; font-size: 16px; font-family: sans-serif; }
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `;
                    }

                    updateColors();
                }

                // Create menu
                let menu = document.querySelector('.assistive-menu') || document.getElementById("assistiveTouchMenu");
                if (!menu) {
                    menu = document.createElement("div");
                    menu.id = "assistiveTouchMenu";
                    menu.className = "assistive-menu";
                    menu.innerHTML = `
                        <div class="menu-item">
                            <button id="curtidasBtn"><svg aria-label="Curtidas" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.843.118 3.377.135 4.234-.149a4.21 4.21 0 0 1 1.675-1.792z"></path></svg></button>
                            <span data-i18n="likes">${getText('likes')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="comentariosBtn"><svg aria-label="Comentários" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg></button>
                            <span data-i18n="comments">${getText('comments')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="bloqueadosBtn"><svg aria-label="Bloqueados" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle><line x1="4.93" y1="19.07" x2="19.07" y2="4.93" stroke="currentColor" stroke-width="2"></line></svg></button>
                            <span data-i18n="blocked">${getText('blocked')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="mensagensBtn"><svg aria-label="Mensagens" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="22" x2="9.218" y1="3" y2="10.083"></line><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></polygon></svg></button>
                            <span data-i18n="messages">${getText('messages')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="naoSegueDeVoltaBtn"><svg aria-label="Não segue de volta" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8z"></path><path d="M15.5 11h-7a1 1 0 0 0 0 2h7a1 1 0 0 0 0-2z"></path></svg></button>
                            <span data-i18n="notFollowingBack">${getText('notFollowingBack')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="seguindoBtn"><svg aria-label="Seguindo" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12.004 12.002c3.309 0 6-2.691 6-6s-2.691-6-6-6-6 2.691-6 6 2.691 6 6 6zm0-10c2.206 0 4 1.794 4 4s-1.794 4-4 4-4-1.794-4-4 1.794-4 4-4zm0 12c-2.67 0-8 1.337-8 4v2h16v-2c0-2.663-5.33-4-8-4zm-6 4c.22-.72 3.02-2 6-2s5.78 1.28 6 2H6.004z"></path></svg></button>
                            <span data-i18n="following">${getText('following')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="closeFriendsBtn"><svg aria-label="Amigos Próximos" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" fill="none" r="10" stroke="currentColor" stroke-width="2"></circle><polygon points="12 16.63 7.85 19.33 9.15 14.48 5.24 11.24 10.19 10.96 12 6.38 13.81 10.96 18.76 11.24 14.85 14.48 16.15 19.33 12 16.63" fill="currentColor"></polygon></svg></button>
                            <span data-i18n="closeFriends">${getText('closeFriends')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="hideStoryBtn"><svg aria-label="Ocultar Story" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="none" stroke="currentColor" stroke-width="2"></path><line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="2"></line></svg></button>
                            <span data-i18n="hideStory">${getText('hideStory')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="mutedAccountsBtn"><svg aria-label="Contas Silenciadas" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="none" stroke="currentColor" stroke-width="2"></path><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"></line><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"></line></svg></button>
                            <span data-i18n="mutedAccounts">${getText('mutedAccounts')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="interacoesBtn"><svg aria-label="Interações" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path></svg></button>
                            <span data-i18n="interactions">${getText('interactions')}</span>
                        </div>

                        <div class="menu-item">
                            <button id="reelsMenuBtn"><svg aria-label="Reels" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12.87 1.51l-2.54 2.6-2.53-2.6a.86.86 0 0 0-.61-.25c-.23 0-.45.09-.61.25l-2.54 2.6-2.53-2.6A.86.86 0 0 0 .9 1.26c-.23 0-.45.09-.61.25L.1 1.7a.88.88 0 0 0 0 1.23l2.54 2.6-2.53 2.6a.88.88 0 0 0 0 1.23l.19.19c.16.16.38.25.61.25.23 0 .45-.09.61-.25l2.54-2.6 2.53 2.6c.16.16.38.25.61.25.23 0 .45-.09.61-.25l2.54-2.6 2.53 2.6c.16.16.38.25.61.25.23 0 .45-.09.61-.25l.19-.19a.88.88 0 0 0 0-1.23l-2.53-2.6 2.53-2.6a.88.88 0 0 0 0-1.23l-.19-.19a.86.86 0 0 0-.61-.25z" fill="currentColor"></path><rect height="16" rx="3" ry="3" width="18" x="3" y="7" fill="none" stroke="currentColor" stroke-width="2"></rect></svg></button>
                            <span data-i18n="reelsMenu">${getText('reelsMenu')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="baixarStoryBtn"><svg aria-label="Baixar Story" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg></button>
                            <span data-i18n="downloadStory">${getText('downloadStory')}</span>
                        </div>
                        <div class="menu-item">
                            <button id="settingsBtn"><svg aria-label="Configurações" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" stroke-width="2"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.09 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"></path></svg></button>
                            <span data-i18n="settings">${getText('settings')}</span>
                        </div>
                    `;

                    document.body.appendChild(menu);
                }

                // Fechar submenu ao clicar fora (Comportamento nativo)
                if (!document.body.dataset.menuClickListenerAttached) {
                    document.addEventListener('click', (e) => {
                        const menu = document.querySelector('.assistive-menu');
                        const btn = document.getElementById('instagramToolsSidebarBtn');
                        if (menu && menu.style.display === 'flex') {
                            // Se o clique não foi no menu nem no botão que o abre
                            if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                                menu.style.display = 'none';
                            }
                        }
                    });
                    document.body.dataset.menuClickListenerAttached = 'true';
                }

                // Tenta encontrar o container da sidebar oficial usando o seletor fornecido
                const sidebarContainer = findSidebarContainer();
                if (!sidebarContainer) return; // Aguarda o carregamento da sidebar

                const homeLink = sidebarContainer.querySelector('a[href="/"]');
                const itemToClone = findItemToClone(sidebarContainer, homeLink);


                if (itemToClone) {
                    const newItem = itemToClone.cloneNode(true);
                    const link = newItem.querySelector('a');
                    if (link) {
                        link.id = "instagramToolsSidebarBtn";
                        link.href = "#";
                        link.removeAttribute('aria-label');

                        // Substitui o ícone original pelo ícone de engrenagem
                        const svg = link.querySelector('svg');
                        if (svg) {
                            // SVG de Engrenagem estilo Instagram
                            const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                            newSvg.setAttribute("aria-label", "Ferramentas");
                            newSvg.setAttribute("class", "x1lliihq x1n2onr6 x5n08af");
                            newSvg.setAttribute("fill", "currentColor");
                            newSvg.setAttribute("height", "24");
                            newSvg.setAttribute("role", "img");
                            newSvg.setAttribute("viewBox", "0 0 24 24");
                            newSvg.setAttribute("width", "24");
                            newSvg.innerHTML = '<circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" stroke-width="2"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.09 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"></path>';
                            svg.replaceWith(newSvg);
                        }

                        // Adiciona o texto "IG Tools" (para visualização PC)
                        // Procura por elementos de texto dentro do link clonado de forma mais abrangente
                        const allDescendants = link.querySelectorAll('*');
                        allDescendants.forEach(el => {
                            // Verifica se é um elemento folha (sem filhos tags)
                            if (el.children.length === 0 && el.textContent.trim().length > 0) {
                                // Ignora se estiver dentro de um SVG ou for o próprio SVG
                                if (el.closest('svg')) return;

                                const text = el.textContent.trim();
                                // Ignora números (notificações) e textos muito curtos
                                if (isNaN(parseInt(text)) && text.length > 1) {
                                    el.textContent = "IG Tools";
                                }
                            }
                        });

                        link.addEventListener("click", (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Lógica de posicionamento inteligente (PC vs Mobile)
                            const isDesktop = window.innerWidth >= 1024;
                            if (isDesktop) {
                                const sidebar = findSidebarContainer();
                                const rect = sidebar ? sidebar.getBoundingClientRect() : { right: 72 };
                                menu.style.left = (rect.right + 15) + 'px';
                                menu.style.bottom = '20px';
                                menu.style.top = 'auto';
                                menu.style.transform = 'none';
                            } else {
                                menu.style.left = '50%';
                                menu.style.top = '50%';
                                menu.style.bottom = 'auto';
                                menu.style.transform = 'translate(-50%, -50%)';
                            }

                            menu.style.display = menu.style.display === "flex" ? "none" : "flex";
                        });
                    }
                    sidebarContainer.appendChild(newItem);
                }

                function closeMenu() {
                    menu.style.display = 'none';
                }

                // Functionality for buttons
                let usernames = new Set();
                let downloadStarted = false;
                let scrollInterval; // Variável global para armazenar o intervalo
                let isUnfollowing = false; // Flag para prevenir múltiplas execuções
                let currentExtraction = ''; // Para rastrear se é seguidores ou seguindo
                let isDarkMode = false;
                let isReelsScrolling = false;
                let currentVideoEndedListener = null;
                let reelsScrollInterval = null;

                // Cache global para listas de usuários, para evitar buscas repetidas
                const userListCache = {
                    muted: null,       // Será um Set de usernames
                    mutedDetails: new Map(), // Map username -> status string
                    closeFriends: null,  // Será um Set de usernames
                    hiddenStory: null    // Será um Set de usernames
                };

                function extractUsernames() {
                    document
                        .querySelectorAll('a[href^="/"][role="link"]')
                        .forEach((a) => {
                            if (
                                a.innerText.trim() &&
                                ![
                                    "Página inicial",
                                    "Reels",
                                    "Explorar",
                                    "Messenger",
                                    "Notificações",
                                    "Criar",
                                    "Pesquisar",
                                    "Mais",
                                    "Editar perfil",
                                    "Itens Arquivados",
                                    "seguidores",
                                    "seguindo",
                                    "Privacidade",
                                    "Termos",
                                    "Instagram Lite",
                                    "Meta Verified",
                                    "outras pessoas",
                                    "Ver todos os 2 comentários",
                                    "Localizações",
                                ].includes(a.innerText.trim())
                            ) {
                                usernames.add(a.innerText.trim());
                            }
                        });
                }

                function getTotalFollowersOrFollowing(type) {
                    // Encontra o cabeçalho principal da página de perfil.
                    const header = document.querySelector('main header');
                    if (!header) return 1;

                    // Encontra todos os itens da lista de estatísticas (Posts, Seguidores, Seguindo).
                    const stats = header.querySelectorAll('ul li');
                    let targetStatElement;

                    if (type === 'followers') {
                        // Encontra o item que contém o texto "seguidores".
                        targetStatElement = Array.from(stats).find(li => li.innerText.toLowerCase().includes('seguidores'));
                    } else if (type === 'following') {
                        // Encontra o item que contém o texto "seguindo".
                        targetStatElement = Array.from(stats).find(li => li.innerText.toLowerCase().includes('seguindo'));
                    }

                    if (targetStatElement) {
                        // Prioridade 1: Tenta encontrar um <span> com um atributo 'title', que geralmente tem o número exato.
                        const titleSpan = targetStatElement.querySelector('span[title]');
                        if (titleSpan && titleSpan.title) {
                            return parseInt(titleSpan.title.replace(/\D/g, ''), 10) || 1;
                        }
                        // Prioridade 2 (Fallback): Extrai o número do texto visível.
                        const numberString = targetStatElement.innerText.split(' ')[0].replace(/\./g, '').replace(/,/g, '');
                        return parseInt(numberString, 10) || 1;
                    }
                    return 1; // Retorna 1 como fallback para evitar divisão por zero
                }

                function updateProgressBar(progress, total, message = "") {
                    let bar = document.getElementById("progressBar");
                    let fill = document.getElementById("progressFill");
                    let text = document.getElementById("progressText");
                    let closeButton = document.getElementById("progressCloseBtn");

                    if (!bar) {
                        bar = document.createElement("div");
                        bar.id = "progressBar";
                        bar.style.cssText =
                            "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#e0e0e0;border-radius:15px;overflow:hidden;z-index:9999;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-shadow:0 4px 12px rgba(0,0,0,0.2);";

                        fill = document.createElement("div");
                        fill.id = "progressFill";
                        fill.style.cssText =
                            "height:100%;width:0%;background:#28a745;position:absolute;left:0;top:0;z-index:1;transition:width 0.25s ease-in-out;";

                        text = document.createElement("div");
                        text.id = "progressText";
                        text.style.cssText = "position:relative;z-index:2;text-shadow:0 0 2px rgba(255,255,255,0.8);";
                        text.innerText = "0%";

                        closeButton = document.createElement("button");
                        closeButton.id = "progressCloseBtn";
                        closeButton.innerText = "Fechar";
                        closeButton.style.cssText =
                            "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";

                        closeButton.addEventListener("click", () => {
                            if (scrollInterval) {
                                clearInterval(scrollInterval); // Interrompe o processo de rolagem
                                scrollInterval = null; // Reseta a variável
                            }
                            bar.remove(); // Remove a barra de progresso
                            alert("Processo interrompido pelo usuário.");
                        });

                        bar.appendChild(fill);
                        bar.appendChild(text);
                        bar.appendChild(closeButton);
                        document.body.appendChild(bar);
                    }

                    const percent = Math.min((progress / total) * 100, 100);

                    // Atualizar a barra de progresso
                    fill.style.width = percent + "%";
                    text.innerText = `${Math.floor(percent)}% (${progress}/${total})`;
                }

                function startScroll(totalCount, onProgress) {
                    // Busca dinâmica do contêiner de scroll (Desktop/Mobile)
                    let scrollDiv = document.querySelector('div[role="dialog"] ._aano') ||
                        document.querySelector('div[role="dialog"] div[style*="overflow-y: auto"]');

                    if (!scrollDiv) {
                        scrollDiv = document.querySelector('div.xyi19xy.x1ccrb07.xtf3nb5.x1pc53ja.x1lliihq.x1iyjqo2.xs83m0k.xz65tgg.x1rife3k.x1n2onr6');
                    }

                    if (!scrollDiv) {
                        alert("Div com scroll não encontrada.");
                        return;
                    }

                    let waitTime = 0;
                    scrollInterval = setInterval(() => {
                        extractUsernames();
                        onProgress(usernames.size, totalCount);

                        if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight) {
                            waitTime += 2;
                            if (waitTime >= 10) {
                                clearInterval(scrollInterval);
                                onProgress(usernames.size, totalCount, " - Concluído!");
                            }
                        } else {
                            scrollDiv.scrollTop = scrollDiv.scrollHeight;
                            waitTime = 0;
                        }
                    }, 2000);
                }

                function startDownload() {
                    const csv = "Username\n" + [...usernames].join("\n");
                    const a = document.createElement("a");
                    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
                    a.download = currentExtraction + ".csv";
                    a.click();
                    // Remove a barra de progresso após o download
                    let bar = document.getElementById("progressBar");
                    if (bar) bar.remove();
                }

                /**
                 * Cria uma barra de progresso com um botão de cancelar.
                 * @param {function} onCancel - Callback a ser executado quando o botão de cancelar é clicado.
                 * @returns {object} - Um objeto com as funções { update, remove }.
                 */
                function createCancellableProgressBar() {
                    document.getElementById("cancellableProgressBar")?.remove();

                    const bar = document.createElement("div");
                    bar.id = "cancellableProgressBar";
                    bar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:2147483647;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";

                    const fill = document.createElement("div");
                    fill.style.cssText = "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";

                    const text = document.createElement("div");
                    text.style.position = "relative";

                    const closeButton = document.createElement("button");
                    closeButton.innerText = "Cancelar";
                    closeButton.style.cssText = "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";

                    bar.appendChild(fill);
                    bar.appendChild(text);
                    bar.appendChild(closeButton);
                    document.body.appendChild(bar);

                    const update = (current, total, message = '') => {
                        const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
                        fill.style.width = `${percent}%`;
                        text.innerText = `${message} ${Math.floor(percent)}% (${current}/${total})`;
                    };

                    return { bar, update, closeButton };
                }

                const elCurtidas = document.getElementById("curtidasBtn");
                if (elCurtidas) elCurtidas.onclick = (e) => {
                    e.preventDefault();
                    history.pushState(null, null, "/your_activity/interactions/likes/");
                    window.dispatchEvent(new Event("popstate"));
                };

                const elComentarios = document.getElementById("comentariosBtn");
                if (elComentarios) elComentarios.onclick = (e) => {
                    e.preventDefault();
                    history.pushState(null, null, "/your_activity/interactions/comments/");
                    window.dispatchEvent(new Event("popstate"));
                };

                const elMensagens = document.getElementById("mensagensBtn");
                if (elMensagens) elMensagens.onclick = (e) => {
                    e.preventDefault();
                    history.pushState(null, null, "/direct/inbox/");
                    window.dispatchEvent(new Event("popstate"));
                };

                const elBloqueados = document.getElementById("bloqueadosBtn");
                if (elBloqueados) elBloqueados.onclick = () => {
                    closeMenu();
                    iniciarProcessoBloqueados();
                };

                const elNaoSegue = document.getElementById("naoSegueDeVoltaBtn");
                if (elNaoSegue) elNaoSegue.onclick = () => {
                    closeMenu();
                    iniciarProcessoNaoSegueDeVolta();
                };

                const elSeguindo = document.getElementById("seguindoBtn");
                if (elSeguindo) elSeguindo.onclick = () => {
                    closeMenu();
                    iniciarProcessoSeguindo();
                };

                // --- NOVO MENU: AMIGOS PRÓXIMOS ---
                const elCloseFriends = document.getElementById("closeFriendsBtn");
                if (elCloseFriends) elCloseFriends.onclick = () => {
                    closeMenu();
                    abrirModalAmigosProximos();
                };

                // --- NOVO MENU: OCULTAR STORY ---
                const elHideStory = document.getElementById("hideStoryBtn");
                if (elHideStory) elHideStory.onclick = () => {
                    closeMenu();
                    abrirModalOcultarStory();
                };

                const elMuted = document.getElementById("mutedAccountsBtn");
                if (elMuted) elMuted.onclick = () => {
                    closeMenu();
                    const openMuted = window.IGTools?.MutedAccounts?.abrirModalContasSilenciadas || window.abrirModalContasSilenciadas || (typeof abrirModalContasSilenciadas === 'function' ? abrirModalContasSilenciadas : null);
                    if (typeof openMuted === 'function') {
                        openMuted();
                    } else {
                        console.error("[IG Tools] Função abrirModalContasSilenciadas não encontrada!");
                    }
                };

                const elInteracoes = document.getElementById("interacoesBtn");
                if (elInteracoes) elInteracoes.onclick = () => {
                    closeMenu();
                    abrirModalInteracoes();
                };

                // --- NOVO MENU: REELS ---
                const elReels = document.getElementById("reelsMenuBtn");
                if (elReels) elReels.onclick = () => {
                    closeMenu();
                    abrirModalReels();
                };
                const elBaixarStory = document.getElementById("baixarStoryBtn");
                if (elBaixarStory) elBaixarStory.onclick = () => { baixarStoryAtual(); };

                const elSettings = document.getElementById("settingsBtn");
                if (elSettings) elSettings.onclick = () => {
                    closeMenu();
                    abrirModalConfiguracoes();
                };

                // ========================================================
                // MÓDULO DE AMIGOS PRÓXIMOS (Modularizado em src/features/close-friends.js)
                // ========================================================
                const extractCloseFriendsUsernames = window.IGTools?.CloseFriends?.extractCloseFriendsUsernames || window.extractCloseFriendsUsernames;

                const extractCloseFriendsFromCurrentDomOrFetch = window.IGTools?.CloseFriends?.extractCloseFriendsFromCurrentDomOrFetch || window.extractCloseFriendsFromCurrentDomOrFetch;
                const executeGraphqlSetBesties = window.IGTools?.CloseFriends?.executeGraphqlSetBesties || window.executeGraphqlSetBesties;

                const abrirModalAmigosProximos = window.IGTools?.CloseFriends?.abrirModalAmigosProximos || window.abrirModalAmigosProximos;

                // --- FIM DO MENU AMIGOS PRÓXIMOS ---

                // ========================================================
                // MÓDULO DE OCULTAR STORY (Modularizado em src/features/hide-story.js)
                // ========================================================
                const scanHideStoryDomRows = window.IGTools?.HideStory?.scanHideStoryDomRows || window.scanHideStoryDomRows;
                const extractHideStoryUsernames = window.IGTools?.HideStory?.extractHideStoryUsernames || window.extractHideStoryUsernames;
                const extractHideStoryFromCurrentDomOrFetch = window.IGTools?.HideStory?.extractHideStoryFromCurrentDomOrFetch || window.extractHideStoryFromCurrentDomOrFetch;
                const fetchHideStoryInitialScreen = window.IGTools?.HideStory?.fetchHideStoryInitialScreen || window.fetchHideStoryInitialScreen;
                const fetchHideStoryPagination = window.IGTools?.HideStory?.fetchHideStoryPagination || window.fetchHideStoryPagination;
                const abrirModalOcultarStory = window.IGTools?.HideStory?.abrirModalOcultarStory || window.abrirModalOcultarStory;

                // ========================================================
                // MÓDULO DE CONTAS SILENCIADAS (Modularizado em src/features/muted-accounts.js)
                // ========================================================
                const showMuteOptionsModal = window.IGTools?.MutedAccounts?.showMuteOptionsModal || window.showMuteOptionsModal;
                const scanMutedAccountsDomRows = window.IGTools?.MutedAccounts?.scanMutedAccountsDomRows || window.scanMutedAccountsDomRows;
                const extractMutedAccountsUsernames = window.IGTools?.MutedAccounts?.extractMutedAccountsUsernames || window.extractMutedAccountsUsernames;
                const abrirModalContasSilenciadas = window.IGTools?.MutedAccounts?.abrirModalContasSilenciadas || window.abrirModalContasSilenciadas;
                const unmuteUsers = window.IGTools?.MutedAccounts?.unmuteUsers || window.unmuteUsers;
                const executeGraphqlMute = window.IGTools?.MutedAccounts?.executeGraphqlMute || window.executeGraphqlMute;
                const executePolarisMute = window.IGTools?.MutedAccounts?.executePolarisMute || window.executePolarisMute;

                // --- FIM DO MENU CONTAS SILENCIADAS ---

                // ========================================================
                // MÓDULO DE CONTAS BLOQUEADAS (Modularizado em src/features/blocked-accounts.js)
                // ========================================================
                const isForbiddenBlockedUsername = window.IGTools?.BlockedAccounts?.isForbiddenBlockedUsername || window.isForbiddenBlockedUsername;
                const sanitizeBlockedList = window.IGTools?.BlockedAccounts?.sanitizeBlockedList || window.sanitizeBlockedList;
                const fetchBlockedAccountsWbloks = window.IGTools?.BlockedAccounts?.fetchBlockedAccountsWbloks || window.fetchBlockedAccountsWbloks;
                const fetchBlockedAccountsPageHtml = window.IGTools?.BlockedAccounts?.fetchBlockedAccountsPageHtml || window.fetchBlockedAccountsPageHtml;
                const extractBlockedAccountsUsernames = window.IGTools?.BlockedAccounts?.extractBlockedAccountsUsernames || window.extractBlockedAccountsUsernames;

                const iniciarProcessoBloqueados = window.IGTools?.BlockedAccounts?.iniciarProcessoBloqueados || window.iniciarProcessoBloqueados;
                const unblockUsers = window.IGTools?.BlockedAccounts?.unblockUsers || window.unblockUsers;
                const blockUsers = window.IGTools?.BlockedAccounts?.blockUsers || window.blockUsers;

                // --- FIM DO MENU CONTAS BLOQUEADAS ---

                // Verifica se há um pedido de reabertura do modal de bloqueados após navegação forçada
                if (sessionStorage.getItem('ig_tools_reopen_blocked') === '1' &&
                    window.location.pathname.startsWith('/accounts/blocked_accounts')) {
                    sessionStorage.removeItem('ig_tools_reopen_blocked');
                    const autoExtract = sessionStorage.getItem('ig_tools_auto_polaris_extract') === '1';
                    sessionStorage.removeItem('ig_tools_auto_polaris_extract');
                    // Aguarda a página carregar os elementos e reabre o modal no modo Polaris scroll
                    setTimeout(() => {
                        console.log('[IG Tools] Reabrindo modal de bloqueados após navegação forçada (modo Polaris scroll)...');
                        iniciarProcessoBloqueados(autoExtract);
                    }, 2000);
                }

                function simulateClick(element, triggerChangeEvent = false) {
                    if (!element) return;
                    const dispatch = (event) => element.dispatchEvent(event);

                    // Simula eventos de toque, mais confiáveis em mobile
                    dispatch(new TouchEvent('touchstart', { bubbles: true, cancelable: true, view: window }));
                    dispatch(new TouchEvent('touchend', { bubbles: true, cancelable: true, view: window }));

                    // Mantém os eventos de mouse como fallback
                    dispatch(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    dispatch(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    dispatch(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    if (triggerChangeEvent) {
                        dispatch(new Event('change', { bubbles: true }));
                    }
                }


                // ========================================================
                // MÓDULO DE DOWNLOAD DE STORIES (Modularizado em src/features/media-downloader.js)
                // ========================================================
                const baixarStoryAtual = window.IGTools?.MediaDownloader?.baixarStoryAtual || window.baixarStoryAtual;
                const injectStoryFloatingButton = window.IGTools?.MediaDownloader?.injectStoryFloatingButton || window.injectStoryFloatingButton;

                // ========================================================
                // MÓDULO DE SEGUIDORES E SEGUINDO (Modularizado em src/features/followers-analysis.js)
                // ========================================================
                const iniciarProcessoNaoSegueDeVolta = window.IGTools?.FollowersAnalysis?.iniciarProcessoNaoSegueDeVolta || window.iniciarProcessoNaoSegueDeVolta;
                const iniciarProcessoSeguindo = window.IGTools?.FollowersAnalysis?.iniciarProcessoSeguindo || window.iniciarProcessoSeguindo;
                const abrirModalExecutarSeguindo = window.IGTools?.FollowersAnalysis?.abrirModalExecutarSeguindo || window.abrirModalExecutarSeguindo;
                const showUpdateOptionsModal = window.IGTools?.FollowersAnalysis?.showUpdateOptionsModal || window.showUpdateOptionsModal;

                // ========================================================
                // MÓDULO DE CONFIGURAÇÕES (Modularizado em src/features/settings.js)
                // ========================================================
                const abrirModalConfiguracoes = window.IGTools?.Settings?.abrirModalConfiguracoes || window.abrirModalConfiguracoes;

                const abrirModalIdioma = window.IGTools?.Settings?.abrirModalIdioma || window.abrirModalIdioma;

                const renderShortcuts = window.IGTools?.Shortcuts?.renderShortcuts || window.renderShortcuts;


                // ========================================================
                // MÓDULO DE COMANDOS DE VOZ - MODAL (Modularizado em src/features/voice-control.js)
                // ========================================================
                const abrirModalComandosVoz = window.IGTools?.VoiceControl?.abrirModalComandosVoz || window.abrirModalComandosVoz;


                // ========================================================
                // MÓDULO DE ATALHOS - MODAL (Modularizado em src/features/shortcuts.js)
                // ========================================================
                const abrirModalAtalhos = window.IGTools?.Shortcuts?.abrirModalAtalhos || window.abrirModalAtalhos;

                // ========================================================
                // MÓDULO DE PARÂMETROS DO SCRIPT (Modularizado em src/features/settings.js)
                // ========================================================
                const abrirModalParametros = window.IGTools?.Settings?.abrirModalParametros || window.abrirModalParametros;

                // ========================================================
                // MÓDULO DE CATEGORIAS E TAGS (Modularizado em src/features/categories.js)
                // ========================================================
                const abrirModalGerenciarCategorias = window.IGTools?.Categories?.abrirModalGerenciarCategorias || window.abrirModalGerenciarCategorias;
                const abrirModalAdicionarACategoria = window.IGTools?.Categories?.abrirModalAdicionarACategoria || window.abrirModalAdicionarACategoria;

                // Adiciona a classe RGB em novos modais
                const originalAppendChild = document.body.appendChild;
                document.body.appendChild = function (node) {
                    if (node.classList && (node.classList.contains('submenu-modal') || node.classList.contains('assistive-menu')) && loadSettings().rgbBorder) {
                        node.classList.add('rgb-border-effect');
                    }
                    return originalAppendChild.apply(this, arguments);
                };

                // ========================================================
                // MÓDULO DE REELS & MÍDIA (Modularizado em src/features/reels.js)
                // ========================================================
                const abrirModalReels = window.IGTools?.Reels?.abrirModalReels || window.abrirModalReels;
                const toggleRolagemAutomaticaReels = window.IGTools?.Reels?.toggleRolagemAutomaticaReels || window.toggleRolagemAutomaticaReels;
                const stopReelsAutoScroll = window.IGTools?.Reels?.stopReelsAutoScroll || window.stopReelsAutoScroll;
                const startReelsAutoScroll = window.IGTools?.Reels?.startReelsAutoScroll || window.startReelsAutoScroll;
                const iniciarAnaliseReels = window.IGTools?.Reels?.iniciarAnaliseReels || window.iniciarAnaliseReels;
                const abrirModalTabelaReels = window.IGTools?.Reels?.abrirModalTabelaReels || window.abrirModalTabelaReels;
                const baixarReelAtual = window.IGTools?.Reels?.baixarReelAtual || window.baixarReelAtual;
                const copiarLegendaReel = window.IGTools?.Reels?.copiarLegendaReel || window.copiarLegendaReel;

                // ========================================================
                // MÓDULO DE INTERAÇÕES E DESCURTIR (Modularizado em src/features/profile-interactions.js)
                // ========================================================
                const executeGraphqlUnlikeStory = window.IGTools?.ProfileInteractions?.executeGraphqlUnlikeStory;
                const executeGraphqlUnlikePost = window.IGTools?.ProfileInteractions?.executeGraphqlUnlikePost;
                const unlikeMedia = window.IGTools?.ProfileInteractions?.unlikeMedia || window.unlikeMedia;
                const fetchUserInteractionsData = window.IGTools?.ProfileInteractions?.fetchUserInteractionsData || window.fetchUserInteractionsData;
                const renderSubrowInteracoesContent = window.IGTools?.ProfileInteractions?.renderSubrowInteracoesContent || window.renderSubrowInteracoesContent;
                const abrirModalInteracoes = window.IGTools?.ProfileInteractions?.abrirModalInteracoes || window.abrirModalInteracoes;

                // ========================================================
                // MÓDULO DE AÇÕES EM MASSA & OPERAÇÕES DE LISTA (Modularizado em src/features/bulk-actions.js)
                // ========================================================
                window.executeGraphqlUnfollow = executeGraphqlUnfollow;
                window.executeGraphqlBlockMany = executeGraphqlBlockMany;
                window.executeGraphqlSetBesties = executeGraphqlSetBesties;
                window.executeWbloksHideStory = executeWbloksHideStory;
                window.executeApiUnblock = executeApiUnblock;
                window.executeGraphqlUserHoverCard = executeGraphqlUserHoverCard;
                window.getCachedUserId = getCachedUserId;
                window.setCachedUserId = setCachedUserId;
                window.getUserId = getUserId;
                window.createCancellableProgressBar = createCancellableProgressBar;
                window.simulateClick = simulateClick;
                window.DEFAULT_AVATAR = DEFAULT_AVATAR;

                const handleActionOnSelected = window.IGTools?.BulkActions?.handleActionOnSelected || window.handleActionOnSelected;
                const performActionOnProfile = window.IGTools?.BulkActions?.performActionOnProfile || window.performActionOnProfile;
                const toggleListMembership = window.IGTools?.BulkActions?.toggleListMembership || window.toggleListMembership;
                const getProfilePic = window.IGTools?.BulkActions?.getProfilePic || window.getProfilePic;
                const preencherTabela = window.IGTools?.BulkActions?.preencherTabela || window.preencherTabela;
                const isMobileDevice = window.IGTools?.BulkActions?.isMobileDevice || window.isMobileDevice;
                const startScrollMobile = window.IGTools?.BulkActions?.startScrollMobile || window.startScrollMobile;
                voiceControl.init();
            }

            // ========================================================
            // MÓDULO DE DOWNLOAD DE MÍDIA (Modularizado em src/features/media-downloader.js)
            // ========================================================
            const downloadMedia = window.IGTools?.MediaDownloader?.downloadMedia || window.downloadMedia;

            // --- FIM DA LÓGICA DE DOWNLOAD DE STORIES ---

            dbHelper.openDB(); // Abre a conexão com o IndexedDB na inicialização
            applyInitialSettings(); // Aplica as configurações salvas na inicialização
            injectMenu();
            // Protege contra o erro de hidratação do React (#418) aguardando o carregamento inicial completo
            if (document.readyState === 'complete') {
                setTimeout(addFeedDownloadButtons, 1500);
            } else {
                window.addEventListener('load', () => setTimeout(addFeedDownloadButtons, 1500));
            }
            initShortcutListener();

            // Inicializa a verificação agendada de unfollow por e-mail
            setTimeout(executarVerificacaoAgendadaUnfollow, 10000); // Executa 10s após inicialização
            setInterval(executarVerificacaoAgendadaUnfollow, 600000); // Checa a cada 10 minutos (para ver se passou 1h)

            // Re-inject menu on navigation
            const push = history.pushState;
            history.pushState = function () {
                push.apply(history, arguments);
                setTimeout(() => {
                    if (window.location.href.includes("instagram.com")) injectMenu();
                }, 500);
            };

            window.addEventListener("popstate", () => {
                setTimeout(() => {
                    if (window.location.href.includes("instagram.com")) injectMenu();
                    // Aplica as configurações após a navegação também
                    if (document.getElementById("assistiveTouchMenu")) applyInitialSettings();
                }, 500);
            });

            // Garante que o menu seja injetado periodicamente caso o DOM mude (SPA)
            setInterval(() => {
                if (window.location.href.includes("instagram.com")) {
                    injectMenu();
                    if (loadSettings().validateProfileStatus) {
                        validateCurrentPagePrivacy();
                    }
                }
            }, 1000);

            // --- VERIFICAÇÃO DE PRIVACIDADE DO PERFIL (STATUS P/A) ---
            const privacyCache = new Map();
            const privacyPending = new Map();
            const privacyErrorCooldown = new Map();
            const privacyQueue = [];
            let isProcessingQueue = false;

            async function processPrivacyQueue() {
                if (isProcessingQueue) return;
                isProcessingQueue = true;

                while (privacyQueue.length > 0) {
                    const task = privacyQueue.shift();
                    try {
                        const result = await task.fn();
                        task.resolve(result);
                    } catch (e) {
                        task.reject(e);
                    }
                    await new Promise(r => setTimeout(r, 200));
                }

                isProcessingQueue = false;
            }

            function getProfilePageUsername() {
                try {
                    const path = window.location.pathname;
                    const parts = path.split('/').filter(Boolean);
                    if (parts.length === 1) {
                        const u = parts[0].toLowerCase();
                        const nonUsernames = ['explore', 'reels', 'stories', 'direct', 'accounts', 'emails', 'developer', 'about', 'legal', 'privacy', 'p', 'reel'];
                        if (!nonUsernames.includes(u) && /^[a-zA-Z0-9._]+$/.test(u)) {
                            return u;
                        }
                    }
                } catch (_) { }
                return null;
            }

            // Extrai o status de privacidade diretamente da árvore React da página (0 requisições, sem REST)
            function extractPrivacyFromReact(element) {
                if (!element) return null;

                const nodesToScan = [];
                if (Array.isArray(element)) {
                    nodesToScan.push(...element);
                } else {
                    nodesToScan.push(element);
                    if (element.querySelectorAll) {
                        const imgs = element.querySelectorAll('header img, img');
                        for (const img of imgs) nodesToScan.push(img);
                        const links = element.querySelectorAll('header a, a');
                        for (const a of links) nodesToScan.push(a);
                    }
                }

                function scan(val, depth) {
                    if (!val || depth > 6 || typeof val !== 'object') return null;
                    if (typeof val.is_private === 'boolean') return val.is_private;
                    if (typeof val.isPrivate === 'boolean') return val.isPrivate;

                    if (val.user && typeof val.user.is_private === 'boolean') return val.user.is_private;
                    if (val.user && typeof val.user.isPrivate === 'boolean') return val.user.isPrivate;
                    if (val.owner && typeof val.owner.is_private === 'boolean') return val.owner.is_private;
                    if (val.owner && typeof val.owner.isPrivate === 'boolean') return val.owner.isPrivate;
                    if (val.author && typeof val.author.is_private === 'boolean') return val.author.is_private;
                    if (val.user_dict && typeof val.user_dict.is_private === 'boolean') return val.user_dict.is_private;
                    if (val.post?.user && typeof val.post.user.is_private === 'boolean') return val.post.user.is_private;
                    if (val.post?.owner && typeof val.post.owner.is_private === 'boolean') return val.post.owner.is_private;
                    if (val.item?.user && typeof val.item.user.is_private === 'boolean') return val.item.user.is_private;
                    if (val.media?.user && typeof val.media.user.is_private === 'boolean') return val.media.user.is_private;
                    if (val.data?.user && typeof val.data.user.is_private === 'boolean') return val.data.user.is_private;

                    const priorityKeys = ['user', 'owner', 'author', 'user_dict', 'item', 'post', 'media', 'data', 'props', 'targetUser'];
                    for (const k of priorityKeys) {
                        if (val[k] && typeof val[k] === 'object') {
                            const res = scan(val[k], depth + 1);
                            if (res !== null) return res;
                        }
                    }

                    if (val.children) {
                        if (Array.isArray(val.children)) {
                            for (const c of val.children) {
                                if (c && typeof c === 'object') {
                                    const res = scan(c, depth + 1);
                                    if (res !== null) return res;
                                }
                            }
                        } else if (typeof val.children === 'object') {
                            const res = scan(val.children, depth + 1);
                            if (res !== null) return res;
                        }
                    }

                    return null;
                }

                for (const node of nodesToScan) {
                    if (!node) continue;
                    try {
                        const propsKey = Object.keys(node).find(k => k.startsWith('__reactProps$'));
                        if (propsKey && node[propsKey]) {
                            const found = scan(node[propsKey], 0);
                            if (found !== null) return found;
                        }

                        const fiberKey = Object.keys(node).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                        if (fiberKey && node[fiberKey]) {
                            let curr = node[fiberKey];
                            let steps = 0;
                            while (curr && steps < 25) {
                                if (curr.memoizedProps) {
                                    const found = scan(curr.memoizedProps, 0);
                                    if (found !== null) return found;
                                }
                                if (curr.memoizedState) {
                                    const found = scan(curr.memoizedState, 0);
                                    if (found !== null) return found;
                                }
                                curr = curr.return;
                                steps++;
                            }
                        }
                    } catch (_) { }
                }

                return null;
            }

            function checkProfilePrivacy(username, ...domElements) {
                if (!loadSettings().validateProfileStatus) {
                    return Promise.resolve(null);
                }
                const cleanUsername = String(username || '').trim().toLowerCase().replace(/^@/, '');
                if (!cleanUsername) {
                    return Promise.resolve(null);
                }

                // 1. Cache em memória
                if (privacyCache.has(cleanUsername)) {
                    return Promise.resolve(privacyCache.get(cleanUsername));
                }

                // 2. Extração instantânea do React Fiber/Props (zero requisições de rede!)
                for (const el of domElements) {
                    if (!el) continue;
                    const fromReact = extractPrivacyFromReact(el);
                    if (typeof fromReact === 'boolean') {
                        privacyCache.set(cleanUsername, fromReact);
                        return Promise.resolve(fromReact);
                    }
                }

                // 3. Verificação pelo DOM se for o perfil atualmente aberto
                const currentProfile = getProfilePageUsername();
                if (currentProfile === cleanUsername) {
                    const bodyText = (document.body && document.body.innerText) || '';
                    const isPrivateDom = bodyText.includes('Esta conta é privada') ||
                        bodyText.includes('This account is private') ||
                        bodyText.includes('Esta cuenta es privada') ||
                        Boolean(document.querySelector('svg[aria-label*="privad"], svg[aria-label*="Private"], svg[aria-label*="lock"]'));
                    if (isPrivateDom) {
                        privacyCache.set(cleanUsername, true);
                        return Promise.resolve(true);
                    }
                    const hasVisiblePosts = Boolean(document.querySelector('main a[href*="/p/"], main a[href*="/reel/"]'));
                    if (hasVisiblePosts) {
                        privacyCache.set(cleanUsername, false);
                        return Promise.resolve(false);
                    }
                }

                // 4. Se já há requisição pendente
                if (privacyPending.has(cleanUsername)) {
                    return privacyPending.get(cleanUsername);
                }

                // 5. Cooldown para evitar loops em caso de falha
                if (privacyErrorCooldown.has(cleanUsername) && Date.now() - privacyErrorCooldown.get(cleanUsername) < 45000) {
                    return Promise.resolve(null);
                }

                const promise = new Promise((resolve, reject) => {
                    privacyQueue.push({
                        fn: async () => {
                            try {
                                // Tentativa 1: GraphQL Oficial PolarisUserHoverCardContentV2Query
                                let uid = getCachedUserId(cleanUsername);
                                if (!uid && typeof getUserId === 'function') {
                                    uid = await getUserId(cleanUsername);
                                }
                                if (uid && typeof executeGraphqlUserHoverCard === 'function') {
                                    try {
                                        const stats = await executeGraphqlUserHoverCard(uid);
                                        if (stats && typeof stats.isPrivate === 'boolean') {
                                            privacyCache.set(cleanUsername, stats.isPrivate);
                                            privacyErrorCooldown.delete(cleanUsername);
                                            return stats.isPrivate;
                                        }
                                    } catch (_) { }
                                }

                                // Tentativa 2: HTML direto da página do perfil (extrai dados Relay/GraphQL embutidos)
                                try {
                                    const profileRes = await fetch(`https://www.instagram.com/${encodeURIComponent(cleanUsername)}/`, {
                                        credentials: 'include'
                                    });
                                    if (profileRes.ok) {
                                        const html = await profileRes.text();
                                        const match = html.match(/"is_private"\s*:\s*(true|false)/i);
                                        if (match) {
                                            const isPrivate = match[1].toLowerCase() === 'true';
                                            privacyCache.set(cleanUsername, isPrivate);
                                            privacyErrorCooldown.delete(cleanUsername);
                                            return isPrivate;
                                        }
                                        if (html.includes('Esta conta é privada') || html.includes('This account is private')) {
                                            privacyCache.set(cleanUsername, true);
                                            privacyErrorCooldown.delete(cleanUsername);
                                            return true;
                                        }
                                    }
                                } catch (_) { }

                                privacyErrorCooldown.set(cleanUsername, Date.now());
                                return null;
                            } catch (e) {
                                privacyErrorCooldown.set(cleanUsername, Date.now());
                                return null;
                            }
                        },
                        resolve,
                        reject
                    });
                });

                privacyPending.set(cleanUsername, promise);
                promise.finally(() => {
                    privacyPending.delete(cleanUsername);
                });

                processPrivacyQueue();
                return promise;
            }

            function processProfilePagePrivacy() {
                if (!loadSettings().validateProfileStatus) {
                    const badge = document.querySelector('.ig-profile-header-privacy-badge');
                    if (badge) badge.remove();
                    return;
                }

                const username = getProfilePageUsername();
                if (!username) return;

                const header = document.querySelector('header');
                if (!header) return;

                // Encontra o elemento do título do perfil com o username
                let titleEl = null;
                const headings = header.querySelectorAll('h2, h1');
                for (const h of headings) {
                    const text = h.textContent.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
                    if (text === username || text.startsWith(username)) {
                        titleEl = h;
                        break;
                    }
                }
                if (!titleEl) {
                    for (const el of header.querySelectorAll('span, div')) {
                        const text = el.textContent.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
                        if (text === username && el.children.length === 0) {
                            titleEl = el;
                            break;
                        }
                    }
                }
                if (!titleEl) return;

                let existingBadge = header.querySelector('.ig-profile-header-privacy-badge');
                if (existingBadge) {
                    if (existingBadge.getAttribute('data-badge-username') === username) return;
                    existingBadge.remove();
                }

                const renderBadge = (isPrivate) => {
                    if (!header.contains(titleEl)) return;
                    if (header.querySelector('.ig-profile-header-privacy-badge')) return;

                    const badge = document.createElement('span');
                    badge.className = 'ig-privacy-badge ig-profile-header-privacy-badge';
                    badge.setAttribute('data-badge-username', username);
                    badge.style.cssText = `
                        margin-left: 8px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        padding: 3px 8px;
                        font-size: 13px;
                        font-weight: 700;
                        border-radius: 6px;
                        color: #ffffff;
                        vertical-align: middle;
                        background-color: ${isPrivate ? '#e1306c' : '#28a745'};
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        cursor: default;
                        user-select: none;
                    `;
                    badge.innerText = isPrivate ? 'P' : 'A';
                    badge.title = isPrivate ? 'Perfil Privado (P)' : 'Perfil Aberto / Público (A)';

                    if (titleEl.nextSibling) {
                        titleEl.parentNode.insertBefore(badge, titleEl.nextSibling);
                    } else if (titleEl.parentNode) {
                        titleEl.parentNode.appendChild(badge);
                    } else {
                        titleEl.appendChild(badge);
                    }
                };

                if (privacyCache.has(username)) {
                    renderBadge(privacyCache.get(username));
                } else {
                    checkProfilePrivacy(username, titleEl, header).then(isPrivate => {
                        if (isPrivate !== null) {
                            renderBadge(isPrivate);
                        }
                    });
                }
            }

            function getPostAuthorElement(article) {
                const header = article.querySelector('header') || article;
                const links = header.querySelectorAll('a[href]');
                const systemPaths = ['explore', 'reels', 'stories', 'direct', 'accounts', 'p', 'reel', 'tv'];

                for (const link of links) {
                    const href = link.getAttribute('href');
                    if (!href) continue;
                    const cleanPath = href.split('?')[0].split('#')[0];
                    const parts = cleanPath.split('/').filter(Boolean);
                    if (parts.length === 1) {
                        const username = parts[0].toLowerCase();
                        if (!systemPaths.includes(username) && /^[a-zA-Z0-9._]+$/.test(username)) {
                            const text = link.textContent.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
                            if (text.includes(username) || text === username) {
                                return { username, element: link };
                            }
                        }
                    }
                }

                // Fallback para qualquer link de perfil no cabeçalho
                for (const link of links) {
                    const href = link.getAttribute('href');
                    if (!href) continue;
                    const cleanPath = href.split('?')[0].split('#')[0];
                    const parts = cleanPath.split('/').filter(Boolean);
                    if (parts.length === 1) {
                        const username = parts[0].toLowerCase();
                        if (!systemPaths.includes(username) && /^[a-zA-Z0-9._]+$/.test(username)) {
                            return { username, element: link };
                        }
                    }
                }
                return null;
            }

            async function processArticlePrivacy(article) {
                if (!loadSettings().validateProfileStatus) return;
                if (article.getAttribute('data-privacy-processed') === 'true') return;

                const authorInfo = getPostAuthorElement(article);
                if (!authorInfo) return;

                const { username, element } = authorInfo;
                article.setAttribute('data-privacy-processed', 'true');

                // Passa tanto o link quanto o artigo para extração de React (sem rede!)
                const isPrivate = await checkProfilePrivacy(username, element, article);
                if (isPrivate === null) {
                    article.removeAttribute('data-privacy-processed');
                    return;
                }

                if (element.querySelector('.ig-privacy-badge') || element.parentElement?.querySelector('.ig-privacy-badge')) return;

                const badge = document.createElement('span');
                badge.className = 'ig-privacy-badge';
                badge.style.cssText = `
                    margin-left: 6px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px 6px;
                    font-size: 11px;
                    font-weight: bold;
                    border-radius: 4px;
                    color: #ffffff;
                    vertical-align: middle;
                    background-color: ${isPrivate ? '#e1306c' : '#28a745'};
                    user-select: none;
                    cursor: default;
                `;
                badge.innerText = isPrivate ? 'P' : 'A';
                badge.title = isPrivate ? 'Perfil Privado (P)' : 'Perfil Aberto / Público (A)';
                badge.addEventListener('click', (e) => e.stopPropagation());

                if (element.nextSibling) {
                    element.parentNode.insertBefore(badge, element.nextSibling);
                } else if (element.parentNode) {
                    element.parentNode.appendChild(badge);
                } else {
                    element.appendChild(badge);
                }
            }

            function processDialogPrivacy() {
                if (!loadSettings().validateProfileStatus) return;
                const dialogs = document.querySelectorAll('div[role="dialog"]');
                if (!dialogs.length) return;

                dialogs.forEach(dialog => {
                    if (dialog.closest('.assistive-menu') || dialog.closest('.submenu-modal')) return;

                    const userLinks = dialog.querySelectorAll('a[href]:not([data-privacy-processed="true"])');
                    const systemPaths = ['explore', 'reels', 'stories', 'direct', 'accounts', 'p', 'reel'];

                    userLinks.forEach(async (link) => {
                        const href = link.getAttribute('href');
                        if (!href) return;
                        const cleanPath = href.split('?')[0].split('#')[0];
                        const parts = cleanPath.split('/').filter(Boolean);
                        if (parts.length === 1) {
                            const username = parts[0].toLowerCase();
                            if (systemPaths.includes(username) || !/^[a-zA-Z0-9._]+$/.test(username)) return;

                            const text = link.textContent.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
                            if (!text.includes(username)) return;

                            link.setAttribute('data-privacy-processed', 'true');
                            if (link.querySelector('.ig-privacy-badge') || link.parentElement?.querySelector('.ig-privacy-badge')) return;

                            const isPrivate = await checkProfilePrivacy(username, link);
                            if (isPrivate === null) {
                                link.removeAttribute('data-privacy-processed');
                                return;
                            }

                            if (link.querySelector('.ig-privacy-badge') || link.parentElement?.querySelector('.ig-privacy-badge')) return;

                            const badge = document.createElement('span');
                            badge.className = 'ig-privacy-badge';
                            badge.style.cssText = `
                                margin-left: 6px;
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                padding: 1px 5px;
                                font-size: 10px;
                                font-weight: bold;
                                border-radius: 4px;
                                color: #ffffff;
                                vertical-align: middle;
                                background-color: ${isPrivate ? '#e1306c' : '#28a745'};
                                user-select: none;
                                cursor: default;
                            `;
                            badge.innerText = isPrivate ? 'P' : 'A';
                            badge.title = isPrivate ? 'Perfil Privado (P)' : 'Perfil Aberto / Público (A)';
                            badge.addEventListener('click', (e) => e.stopPropagation());

                            if (link.nextSibling) {
                                link.parentNode.insertBefore(badge, link.nextSibling);
                            } else if (link.parentNode) {
                                link.parentNode.appendChild(badge);
                            } else {
                                link.appendChild(badge);
                            }
                        }
                    });
                });
            }

            function validateCurrentPagePrivacy() {
                if (!loadSettings().validateProfileStatus) return;
                processProfilePagePrivacy();
                document.querySelectorAll('article:not([data-privacy-processed="true"])').forEach(processArticlePrivacy);
                processDialogPrivacy();
            }

            // ========================================================
            // RASTREADOR DE STORIES & DESTAQUES CURTIDOS (Modularizado em src/features/media-downloader.js)
            // ========================================================
            const trackActiveLikedStoryInDom = window.IGTools?.MediaDownloader?.trackActiveLikedStoryInDom || window.trackActiveLikedStoryInDom;

            // ========================================================
            // MÓDULO DE DOWNLOAD DE FEED (Modularizado em src/features/media-downloader.js)
            // ========================================================
            const addFeedDownloadButtons = window.IGTools?.MediaDownloader?.addFeedDownloadButtons || window.addFeedDownloadButtons;
            const addDownloadButtonToMedia = window.IGTools?.MediaDownloader?.addDownloadButtonToMedia || window.addDownloadButtonToMedia;
            const createAndAttachButton = window.IGTools?.MediaDownloader?.createAndAttachButton || window.createAndAttachButton;
        } // Esta chave fecha o if (window.location.href.includes("instagram.com"))
    }

    // Inicialização: Tenta rodar assim que o body estiver pronto
    // Isso garante que o prompt de login apareça mesmo que o layout do IG demore a carregar
    if (document.body) {
        initScript();
    } else {
        const observer = new MutationObserver((mutations, obs) => {
            if (document.body) {
                console.log("[IG Tools] Body detectado, iniciando.");
                initScript();
                obs.disconnect();
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
})();