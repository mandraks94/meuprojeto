// src/core/dom-utils.js - Utilitários de Interface, Som e Notificações (DOM)
window.IGTools = window.IGTools || {};

(function () {
    'use strict';

    // Helper para Toast (Notificação Visual na tela)
    function showToast(message) {
        if (!document.body) { console.log("[IG Tools]", message); return; }
        const toast = document.createElement('div');
        toast.innerText = message;
        toast.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; z-index: 2147483647; font-size: 14px; pointer-events: none; transition: opacity 0.5s;";
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // Som sutil de notificação estilo iOS
    function playAlertSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        } catch (_) { }
    }

    // POP-UP FLUTUANTE VISUAL NA TELA DO INSTAGRAM
    function showUnfollowFloatingPopup(data = {}) {
        if (!document.body) return;
        document.getElementById('igToolsUnfollowFloatingPopup')?.remove();

        playAlertSound();

        const popup = document.createElement('div');
        popup.id = 'igToolsUnfollowFloatingPopup';
        popup.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            width: 360px;
            max-width: 90vw;
            background: rgba(18, 18, 28, 0.96);
            backdrop-filter: blur(25px) saturate(180%);
            -webkit-backdrop-filter: blur(25px) saturate(180%);
            border: 1px solid rgba(255, 75, 43, 0.55);
            border-radius: 18px;
            padding: 14px 16px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 25px rgba(255, 75, 43, 0.25);
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #ffffff;
            transform: translateY(-30px);
            opacity: 0;
            transition: all 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;

        const title = data.title || 'Alerta de Unfollow';
        const message = data.message || 'Alguem deixou de seguir, entra no menu não segue de volta para descobrir.';
        const detail = data.detail || '';

        popup.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:20px;filter:drop-shadow(0 2px 4px rgba(255,75,43,0.5));">💔</span>
                    <span style="font-size:12px;font-weight:700;color:#ff7675;letter-spacing:0.3px;text-transform:uppercase;">${title}</span>
                </div>
                <button id="closeFloatingUnfollowPopup" style="background:rgba(255,255,255,0.14);border:none;color:#ffffff;width:22px;height:22px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;transition:background 0.2s;">✕</button>
            </div>
            <div style="font-size:13px;font-weight:600;line-height:1.4;color:#f1f2f6;">${message}</div>
            ${detail ? `<div style="font-size:11px;color:rgba(255,255,255,0.6);">${detail}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:4px;">
                <button id="btnFloatingGoUnfollow" style="flex:1;background:linear-gradient(135deg,#ff416c,#ff4b2b);border:none;border-radius:10px;padding:8px 12px;color:#ffffff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(255,65,108,0.4);display:flex;align-items:center;justify-content:center;gap:6px;transition:transform 0.2s;">
                    <span>💔 Abrir Não Segue de Volta</span>
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        requestAnimationFrame(() => {
            popup.style.transform = 'translateY(0)';
            popup.style.opacity = '1';
        });

        const closePopup = () => {
            popup.style.transform = 'translateY(-20px)';
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 380);
        };

        popup.querySelector('#closeFloatingUnfollowPopup').onclick = closePopup;

        popup.querySelector('#btnFloatingGoUnfollow').onclick = () => {
            closePopup();
            const modals = window.__igToolsModals || {};
            if (modals.openNotFollowingBack) {
                modals.openNotFollowingBack('tabNaoSegueDeVolta');
            } else if (typeof window.iniciarProcessoNaoSegueDeVolta === 'function') {
                window.iniciarProcessoNaoSegueDeVolta('tabNaoSegueDeVolta');
            }
        };

        // Fecha automaticamente após 14 segundos
        setTimeout(() => {
            if (document.body.contains(popup)) closePopup();
        }, 14000);
    }

    // Helper para Loading (Centralizado para evitar erros de redeclaração)
    function toggleLoading(isLoading, progress = null, message = "Carregando...") {
        const modal = document.querySelector('.submenu-modal'); // Detecta o modal ativo
        if (!modal) return;
        if (isLoading) {
            let overlay = modal.querySelector('.loading-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.innerHTML = `<div class="spinner"></div><div class="loading-text">${message}</div>`;
                modal.appendChild(overlay);
            }
            const textDiv = overlay.querySelector('.loading-text');
            if (textDiv) {
                if (progress !== null) {
                    textDiv.innerText = `${message} ${Math.floor(progress)}%`;
                } else {
                    textDiv.innerText = message;
                }
            }
        } else {
            modal.querySelector('.loading-overlay')?.remove();
        }
    }

    // Funções essenciais de Autenticação e Polaris GraphQL
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
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
                if (text && text.includes('"rollout_hash"')) {
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
            return { dtsg: '', lsd: '', spin_r: '', spin_t: '', hsi: '', dyn: '', csr: '' };
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

    function getInstagramFormToken(name) {
        if (name === 'fb_dtsg') return getDtsgToken();
        if (name === 'lsd') return getLsdToken();
        try {
            const html = document.documentElement.innerHTML;
            const pattern = new RegExp(`"${name}"\\s*:\\s*"([^"]+)"`);
            const match = html.match(pattern);
            return match ? match[1] : '';
        } catch (_) { return ''; }
    }

    function isValidInstagramUsername(username) {
        if (!username) return false;
        const clean = String(username).replace(/^@/, '').trim();
        if (!clean) return false;
        return /^[a-zA-Z0-9._]{1,30}$/.test(clean);
    }

    // Exporta para o barramento window.IGTools e escopo global
    window.IGTools.DOMUtils = {
        showToast,
        playAlertSound,
        showUnfollowFloatingPopup,
        toggleLoading,
        isValidInstagramUsername
    };

    window.IGTools.Polaris = {
        getCookie,
        getRolloutHash,
        getWWWClaim,
        getMainWorldTokens,
        getDtsgToken,
        getLsdToken,
        computeJazoest,
        getSpinParams,
        getInstagramFormToken,
        getApiHeaders
    };

    window.showToast = showToast;
    window.playAlertSound = playAlertSound;
    window.showUnfollowFloatingPopup = showUnfollowFloatingPopup;
    window.toggleLoading = toggleLoading;
    window.isValidInstagramUsername = isValidInstagramUsername;

    window.getCookie = getCookie;
    window.getRolloutHash = getRolloutHash;
    window.getWWWClaim = getWWWClaim;
    window.getMainWorldTokens = getMainWorldTokens;
    window.getDtsgToken = getDtsgToken;
    window.getLsdToken = getLsdToken;
    window.computeJazoest = computeJazoest;
    window.getSpinParams = getSpinParams;
    window.getInstagramFormToken = getInstagramFormToken;
    window.getApiHeaders = getApiHeaders;
})();
