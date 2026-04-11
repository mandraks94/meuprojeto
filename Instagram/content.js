(function() {
    'use strict';
    console.log("[IG Tools] Script injetado e rodando.");

    function initScript() {
        if (window.location.href.includes("instagram.com")) {
            const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;

            // Helper para Cookie
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
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
                } catch (e) {}
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
                } catch (e) {}
                return "0";
            }

            function getApiHeaders() {
                return {
                    "X-IG-App-ID": "936619743392459",
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest",
                    "X-ASBD-ID": "129477",
                    "X-Instagram-AJAX": getRolloutHash(),
                    "X-IG-WWW-Claim": getWWWClaim(),
                    "Content-Type": "application/x-www-form-urlencoded",
                };
            }

            // Helper para obter ID de usuário
            async function getUserId(username) {
                try {
                    const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                        headers: { 'X-IG-App-ID': '936619743392459' }
                    });
                    const data = await response.json();
                    return data.data?.user?.id;
                } catch (e) {
                    console.error("Erro ao obter ID:", e);
                    return null;
                }
            }

            // Helper para Toast (Notificação Visual)
            function showToast(message) {
                const toast = document.createElement('div');
                toast.innerText = message;
                toast.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; z-index: 2147483647; font-size: 14px; pointer-events: none; transition: opacity 0.5s;";
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 500);
                }, 3000);
            }

            // --- INTERCEPTOR STORIES ANÔNIMO ---
