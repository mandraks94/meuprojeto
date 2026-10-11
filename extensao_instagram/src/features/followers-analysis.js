/**
 * IG Tools Pro - Módulo de Análise de Seguidores & Gerenciador de "Seguindo"
 * Arquivo: src/features/followers-analysis.js
 * Descrição: Análise comparativa (não segue de volta, seguidores mútuos, novos seguidores,
 * seguidores perdidos, histórico de unfollow) e gerenciamento completo da lista de "Seguindo"
 * com filtros por status, categorias, interações e atualização exclusiva via Polaris GraphQL.
 */

(function () {
    'use strict';

    window.IGTools = window.IGTools || {};

    const DEFAULT_AVATAR = window.DEFAULT_AVATAR || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%23ccc'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6 0-8 3-8 6v1h16v-1c0-3-2-6-8-6z'/></svg>";
    const infoIcon = window.infoIcon || `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;

    // Helpers seguros com fallback
    const loadSettings = () => (typeof window.loadSettings === 'function' ? window.loadSettings() : { useApi: true, itemsPerPage: 10, unfollowDelay: 1500, requestDelay: 250, requestBatchSize: 50 });
    const saveSettings = (s) => { if (typeof window.saveSettings === 'function') window.saveSettings(s); };
    const getText = (k) => (typeof window.getText === 'function' ? window.getText(k) : k);
    const toggleLoading = (show, progress, text) => { if (typeof window.toggleLoading === 'function') window.toggleLoading(show, progress, text); };
    const showToast = (msg, duration) => { if (typeof window.showToast === 'function') window.showToast(msg, duration); else console.log(`[IGTools Toast]: ${msg}`); };
    const createCancellableProgressBar = () => (typeof window.createCancellableProgressBar === 'function' ? window.createCancellableProgressBar() : { bar: document.createElement('div'), update: () => { }, closeButton: document.createElement('button') });

    const getDbHelper = () => window.IGTools?.Storage?.dbHelper || window.dbHelper || {
        loadCache: async () => null,
        saveCache: async () => { },
        loadExceptions: async () => new Set(),
        saveException: async () => { },
        loadUnfollowHistory: async () => [],
        saveUnfollowHistory: async () => { },
        deleteUnfollowHistory: async () => { },
        loadCategories: async () => [],
        loadAllUserCategories: async () => new Map(),
        saveAllUserCategories: async () => { }
    };

    const dbHelper = new Proxy({}, {
        get: (_, prop) => {
            const helper = getDbHelper();
            const val = helper[prop];
            return typeof val === 'function' ? val.bind(helper) : val;
        }
    });

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

    const getCachedUserId = (u) => (typeof window.getCachedUserId === 'function' ? window.getCachedUserId(u) : null);
    const setCachedUserId = (u, id) => { if (typeof window.setCachedUserId === 'function') window.setCachedUserId(u, id); };
    const getUserId = async (u) => (typeof window.getUserId === 'function' ? await window.getUserId(u) : null);
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    };
    const getActorId = () => (typeof window.getActorId === 'function' ? window.getActorId() : (getCookie('ds_user_id') || ''));
    const resolveTargetOrLoggedUsername = async () => (typeof window.resolveTargetOrLoggedUsername === 'function' ? await window.resolveTargetOrLoggedUsername() : (getCookie('ds_user_id') || ''));
    const safeFetchProfileInfo = async (u) => (typeof window.safeFetchProfileInfo === 'function' ? await window.safeFetchProfileInfo(u) : null);
    const executeGraphqlUserHoverCard = async (uid) => (typeof window.executeGraphqlUserHoverCard === 'function' ? await window.executeGraphqlUserHoverCard(uid) : null);
    const executeGraphqlFollow = async (uid) => (typeof window.executeGraphqlFollow === 'function' ? await window.executeGraphqlFollow(uid) : { success: false });
    const executeGraphqlUnfollow = async (uid) => (typeof window.executeGraphqlUnfollow === 'function' ? await window.executeGraphqlUnfollow(uid) : { success: false });
    const executeGraphqlBlockMany = async (uids) => (typeof window.executeGraphqlBlockMany === 'function' ? await window.executeGraphqlBlockMany(uids) : { success: false });
    const executeGraphqlSetBesties = async (adds, removes) => (typeof window.executeGraphqlSetBesties === 'function' ? await window.executeGraphqlSetBesties(adds, removes) : { success: false });
    const executeWbloksHideStory = async (uid, u, action) => (typeof window.executeWbloksHideStory === 'function' ? await window.executeWbloksHideStory(uid, u, action) : { success: false });
    const executeGraphqlMute = async (uid, targetType = 'stories', action = 'mute') => (
        typeof window.IGTools?.MutedAccounts?.executeGraphqlMute === 'function'
            ? await window.IGTools.MutedAccounts.executeGraphqlMute(uid, targetType, action)
            : (typeof window.executeGraphqlMute === 'function'
                ? await window.executeGraphqlMute(uid, targetType, action)
                : { success: false })
    );

    const preencherTabela = (...args) => {
        if (typeof window.IGTools?.BulkActions?.preencherTabela === 'function') {
            window.IGTools.BulkActions.preencherTabela(...args);
        } else if (typeof window.preencherTabela === 'function') {
            window.preencherTabela(...args);
        }
    };

    const handleActionOnSelected = (...args) => {
        if (typeof window.IGTools?.BulkActions?.handleActionOnSelected === 'function') {
            return window.IGTools.BulkActions.handleActionOnSelected(...args);
        } else if (typeof window.handleActionOnSelected === 'function') {
            return window.handleActionOnSelected(...args);
        }
    };

    const toggleListMembership = (...args) => {
        if (typeof window.IGTools?.BulkActions?.toggleListMembership === 'function') {
            return window.IGTools.BulkActions.toggleListMembership(...args);
        } else if (typeof window.toggleListMembership === 'function') {
            return window.toggleListMembership(...args);
        }
    };

    const unmuteUsers = (...args) => {
        if (typeof window.IGTools?.MutedAccounts?.unmuteUsers === 'function') {
            return window.IGTools.MutedAccounts.unmuteUsers(...args);
        } else if (typeof window.unmuteUsers === 'function') {
            return window.unmuteUsers(...args);
        }
    };

    const checkProfilePrivacy = async (u, badgeSpan) => {
        if (typeof window.checkProfilePrivacy === 'function') {
            return await window.checkProfilePrivacy(u, badgeSpan);
        }
        return null;
    };

    const fetchUserInteractionsData = async (u, uid, onStatus) => {
        if (typeof window.IGTools?.ProfileInteractions?.fetchUserInteractionsData === 'function') {
            return await window.IGTools.ProfileInteractions.fetchUserInteractionsData(u, uid, onStatus);
        }
        if (typeof window.fetchUserInteractionsData === 'function') {
            return await window.fetchUserInteractionsData(u, uid, onStatus);
        }
        return { total: 0, posts: [], stories: [], highlights: [] };
    };

    const renderSubrowInteracoesContent = (...args) => {
        if (typeof window.IGTools?.ProfileInteractions?.renderSubrowInteracoesContent === 'function') {
            window.IGTools.ProfileInteractions.renderSubrowInteracoesContent(...args);
        } else if (typeof window.renderSubrowInteracoesContent === 'function') {
            window.renderSubrowInteracoesContent(...args);
        }
    };

    /**
     * Extração de listas (Seguidores / Seguindo) com suporte a endpoints Web oficiais e Polaris GraphQL
     */
    async function fetchUserListPolarisGraphQL(userId, type, total, updateProgressBar, isCancelledCheck, userDetailsMap, asObjects = false) {
        const returnObjects = (typeof asObjects === 'boolean') ? asObjects : (type === 'following' && !userDetailsMap);
        const userList = returnObjects ? [] : new Set();
        let nextMaxId = '';
        let hasNextPage = true;
        let hasError = false;

        const isFollowers = type === 'followers';
        const rawBatchSize = loadSettings().requestBatchSize || 50;
        // O Instagram Web impõe limite estrito de 50 itens por página
        const batchSize = Math.min(Math.max(1, Number(rawBatchSize) || 50), 50);
        const delay = loadSettings().requestDelay || 250;

        while (hasNextPage && !isCancelledCheck() && !hasError) {
            try {
                const headers = {
                    'Accept': '*/*',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-IG-App-ID': '936619743392459',
                    'X-CSRFToken': getCookie('csrftoken') || '',
                    'X-ASBD-ID': '129477'
                };

                let response = null;
                let data = null;

                // 1. Tenta a rota Web nativa (/api/v1/friendships/...)
                try {
                    const queryParams = new URLSearchParams({ count: String(batchSize) });
                    if (nextMaxId) {
                        queryParams.append('max_id', nextMaxId);
                    }
                    if (isFollowers) {
                        queryParams.append('search_surface', 'follow_list_page');
                    }
                    const apiUrl = `https://www.instagram.com/api/v1/friendships/${userId}/${type}/?${queryParams.toString()}`;
                    response = await fetch(apiUrl, {
                        headers,
                        credentials: 'include'
                    });
                    if (response.ok) {
                        data = await response.json();
                    }
                } catch (eNet) {
                    console.warn(`[IG Tools] Requisição Web API de ${type} falhou, tentando fallback...`, eNet);
                }

                // 2. Se a rota Web não respondeu ok, tenta fallback GraphQL
                if (!data) {
                    const variables = {
                        id: String(userId),
                        include_reel: true,
                        fetch_mutual: false,
                        first: batchSize
                    };
                    if (nextMaxId && typeof nextMaxId === 'string' && nextMaxId.trim().length > 0) {
                        variables.after = nextMaxId.trim();
                    }

                    const postBody = new URLSearchParams({
                        doc_id: isFollowers ? '17874548601085229' : '17874548601085229',
                        variables: JSON.stringify(variables)
                    });
                    const lsd = getLsdToken();
                    if (lsd) postBody.append('lsd', lsd);

                    const gqlRes = await fetch('https://www.instagram.com/api/graphql', {
                        method: 'POST',
                        headers: {
                            ...headers,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: postBody.toString(),
                        credentials: 'include'
                    });

                    if (gqlRes.ok) {
                        const rawText = await gqlRes.text();
                        let cleanedText = rawText.trim();
                        if (cleanedText.startsWith('for (;;);')) cleanedText = cleanedText.slice(9).trim();
                        data = JSON.parse(cleanedText);
                    }
                }

                if (!data) {
                    throw new Error(`Não foi possível obter dados de ${type} (Status: ${response ? response.status : 'Falha'})`);
                }

                // Processa tanto formato de objeto com 'users' quanto 'edges'
                if (data.users && Array.isArray(data.users)) {
                    data.users.forEach(user => {
                        if (!user || !user.username) return;
                        const unameLower = user.username.toLowerCase();
                        const pk = String(user.pk || user.id || '');
                        if (pk) setCachedUserId(user.username, pk);

                        const userItem = {
                            username: user.username,
                            photoUrl: user.profile_pic_url,
                            id: pk
                        };

                        if (userDetailsMap) {
                            userDetailsMap.set(unameLower, userItem);
                        }

                        if (returnObjects) {
                            userList.push(userItem);
                        } else {
                            userList.add(unameLower);
                        }
                    });

                    if (data.next_max_id) {
                        nextMaxId = String(data.next_max_id);
                    } else {
                        hasNextPage = false;
                    }
                } else {
                    const userObj = data?.data?.user || data?.user;
                    const edgeContainer = isFollowers ? userObj?.edge_followed_by : userObj?.edge_follow;
                    if (!edgeContainer) {
                        console.warn(`[IG Tools] Estrutura inesperada na resposta de ${type}:`, data);
                        break;
                    }

                    const edges = edgeContainer.edges || [];
                    edges.forEach(({ node }) => {
                        if (!node || !node.username) return;
                        const unameLower = node.username.toLowerCase();
                        const pk = String(node.id || node.pk || '');
                        if (pk) setCachedUserId(node.username, pk);

                        const userItem = {
                            username: node.username,
                            photoUrl: node.profile_pic_url,
                            id: pk
                        };

                        if (userDetailsMap) {
                            userDetailsMap.set(unameLower, userItem);
                        }

                        if (returnObjects) {
                            userList.push(userItem);
                        } else {
                            userList.add(unameLower);
                        }
                    });

                    const pageInfo = edgeContainer.page_info;
                    if (pageInfo && pageInfo.has_next_page && pageInfo.end_cursor) {
                        nextMaxId = pageInfo.end_cursor;
                    } else {
                        hasNextPage = false;
                    }
                }

                const currentCount = returnObjects ? userList.length : userList.size;
                if (typeof updateProgressBar === 'function') {
                    updateProgressBar(currentCount, total, `Extraindo ${isFollowers ? 'Seguidores' : 'Seguindo'}:`);
                }

                await new Promise(r => setTimeout(r, delay));
            } catch (error) {
                console.error(`Erro ao buscar ${type}:`, error);
                alert(`Ocorreu um erro ao buscar a lista de ${type}: ${error.message}.\n\nSe necessário, verifique sua conexão ou aumente o 'Intervalo Requisições' nas configurações.`);
                hasError = true;
                hasNextPage = false;
            }
        }

        if (hasError) return null;
        return isCancelledCheck() ? null : userList;
    }


    /**
     * 1. LÓGICA UNIFICADA PARA "NÃO SEGUE DE VOLTA"
     */
    async function iniciarProcessoNaoSegueDeVolta(initialTab = 'tabNaoSegueDeVolta') {
        if (document.getElementById("naoSegueDeVoltaDiv")) return;

        toggleLoading(true, null, "Identificando usuário...");
        const username = await resolveTargetOrLoggedUsername();
        toggleLoading(false);

        if (!username) {
            alert("Por favor, acesse a página de um perfil ou efetue login para usar esta função.");
            return;
        }

        const dbHelper = getDbHelper();
        let isUnfollowing = false;
        let processoCancelado = false;

        const div = document.createElement("div");
        div.id = "naoSegueDeVoltaDiv";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            border: 1px solid #ccc;
            border-radius: 10px;
            padding: 20px;
            z-index: 10000;
            overflow: auto;
        `;
        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    Análise de Seguidores <span id="naoSegueSelectedCount" style="font-size: 12px; font-weight: normal; margin-left: 10px; color: #0095f6;">(0 selecionados)</span>
                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Veja quem você segue mas não te segue de volta. Também mostra novos seguidores e histórico de unfollows.</span></div>
                </span>
                <div class="modal-controls">
                    <button id="naoSegueDeVoltaMinimizarBtn" title="Minimizar">_</button>
                    <button id="fecharSubmenuBtn" title="Fechar">X</button>
                </div>
            </div>
            <div id="statusNaoSegue" style="margin-top: 20px; font-weight: bold;"></div>
            <div id="tabelaContainer" style="display: block; margin-top: 15px;"></div>
        `;
        document.body.appendChild(div);
        toggleLoading(false);

        document.getElementById("fecharSubmenuBtn").addEventListener("click", () => {
            processoCancelado = true;
            document.getElementById("progressBar")?.remove();
            div.remove();
        });

        document.getElementById("naoSegueDeVoltaMinimizarBtn").onclick = () => {
            const modal = document.getElementById('naoSegueDeVoltaDiv');
            const contentToToggle = [
                modal.querySelector('.tab-container'),
                modal.querySelector('#statusNaoSegue'),
                modal.querySelector('#tabelaContainer')
            ].filter(Boolean);

            const btn = document.getElementById('naoSegueDeVoltaMinimizarBtn');
            const isMinimized = modal.dataset.minimized === 'true';

            contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');
            modal.dataset.minimized = !isMinimized;
            btn.textContent = isMinimized ? '_' : '□';
            modal.style.maxHeight = isMinimized ? '90vh' : 'auto';
        };

        const statusDiv = document.getElementById("statusNaoSegue");
        const selectedUsers = new Set();

        const cachedData = {
            seguindo: null,
            seguidores: null,
            naoSegueDeVolta: null,
            novosSeguidores: null,
            novosSeguindo: null,
            seguidoresMutuos: null,
            unfollows: null,
            seguidoresPerdidos: null,
            exceptions: null,
            profileInfo: null,
            userDetails: new Map()
        };

        const updateSelectedCountDisplay = () => {
            const countEl = document.getElementById('naoSegueSelectedCount');
            if (countEl) {
                countEl.innerText = `(${selectedUsers.size} selecionados)`;
            }
        };

        let lists = {};
        let currentTabId = initialTab || 'tabNaoSegueDeVolta';

        const fetchUserList = async (userId, type, total) => {
            let bar = document.getElementById("progressBar");
            if (bar) bar.remove();

            bar = document.createElement("div");
            bar.id = "progressBar";
            bar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#e0e0e0;border-radius:15px;overflow:hidden;z-index:10001;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 15px;box-shadow:0 4px 12px rgba(0,0,0,0.2);";

            const fill = document.createElement("div");
            fill.style.cssText = "height:100%;width:0%;background:#28a745;position:absolute;left:0;top:0;z-index:1;transition:width 0.25s ease-in-out;";

            const text = document.createElement("div");
            text.style.cssText = "position:relative;z-index:2;text-shadow:0 0 2px rgba(255,255,255,0.8);";

            const closeButton = document.createElement("button");
            closeButton.innerText = "Cancelar";
            closeButton.style.cssText = "position:relative;z-index:2;background:#dc3545;color:white;border:none;border-radius:5px;padding:3px 10px;cursor:pointer;font-weight:bold;";
            closeButton.onclick = () => {
                processoCancelado = true;
                bar.remove();
                if (statusDiv) statusDiv.innerText = "Processo interrompido.";
            };

            bar.appendChild(fill);
            bar.appendChild(text);
            bar.appendChild(closeButton);
            document.body.appendChild(bar);

            const updateLocalProgressBar = (progress, totalCount, message) => {
                const totalNum = Number(totalCount) || 0;
                let percent = totalNum > 0 ? Math.min((progress / totalNum) * 100, 100) : Math.min(progress * 2, 95);
                fill.style.width = `${percent}%`;
                const textTotal = totalNum > 0 ? totalNum : '?';
                text.innerText = `${message} ${Math.floor(percent)}% (${progress}/${textTotal})`;
            };

            const result = await fetchUserListPolarisGraphQL(userId, type, total, updateLocalProgressBar, () => processoCancelado, cachedData.userDetails);
            if (bar) bar.remove();
            return result;
        };

        async function carregarDadosIniciais() {
            statusDiv.innerText = 'Carregando dados do Banco de Dados...';

            let dbFollowers = await dbHelper.loadCache('followers');
            let dbFollowing = await dbHelper.loadCache('following');
            let dbExceptions = await dbHelper.loadExceptions();
            let dbLostFollowers = await dbHelper.loadCache('seguidoresPerdidos');
            let dbMutuals = await dbHelper.loadCache('seguidoresMutuos');

            const normalizeAndCache = (set) => {
                const newSet = new Set();
                if (set) {
                    set.forEach(u => {
                        if (u) newSet.add(typeof u === 'object' ? u.username?.toLowerCase() : u.toLowerCase());
                    });
                    if (set.details) {
                        set.details.forEach((val, key) => cachedData.userDetails.set(key.toLowerCase(), val));
                    }
                }
                return newSet;
            };

            dbFollowers = normalizeAndCache(dbFollowers);
            dbFollowing = normalizeAndCache(dbFollowing);
            dbLostFollowers = normalizeAndCache(dbLostFollowers);
            dbMutuals = normalizeAndCache(dbMutuals);
            cachedData.exceptions = dbExceptions || new Set();

            cachedData.seguidores = dbFollowers;
            cachedData.seguindo = dbFollowing;

            cachedData.naoSegueDeVolta = [...dbFollowing].filter(user => !dbFollowers.has(user) && !cachedData.exceptions.has(user));

            let mutuosCalculados = [...dbFollowing].filter(user => dbFollowers.has(user));
            if (mutuosCalculados.length === 0 && dbMutuals && dbMutuals.size > 0) {
                mutuosCalculados = [...dbMutuals];
            }
            cachedData.seguidoresMutuos = mutuosCalculados;
            cachedData.seguidoresPerdidos = dbLostFollowers ? [...dbLostFollowers] : [];

            cachedData.profileInfo = await safeFetchProfileInfo(username);
            if (cachedData.profileInfo?.data?.user?.id === '936619743392459') {
                cachedData.profileInfo.data.user.id = getCookie('ds_user_id') || getActorId() || '';
            }

            const toObjects = (names) => {
                if (!names) return [];
                return (Array.isArray(names) ? names : Array.from(names)).map(item => {
                    if (!item) return { username: '', photoUrl: null };
                    if (typeof item === 'object') {
                        return {
                            username: item.username || '',
                            photoUrl: item.photoUrl || item.profile_pic_url || null,
                            id: item.id || item.pk || ''
                        };
                    }
                    const lower = String(item).toLowerCase();
                    return cachedData.userDetails.get(lower) || { username: String(item), photoUrl: null };
                });
            };

            let listNaoSegueDeVolta = toObjects(cachedData.naoSegueDeVolta);
            let listNovosSeguidores = [];
            let listNovosSeguindo = [];
            let listSeguidoresMutuos = toObjects(cachedData.seguidoresMutuos);
            let listSeguidoresPerdidos = toObjects(cachedData.seguidoresPerdidos);
            let listNaoSigoDeVolta = toObjects([...dbFollowers].filter(u => !dbFollowing.has(u)));
            let listHistorico = await dbHelper.loadUnfollowHistory();

            if ((!dbMutuals || dbMutuals.size === 0) && listSeguidoresMutuos.length > 0) {
                dbHelper.saveCache('seguidoresMutuos', listSeguidoresMutuos).catch(e => console.warn(e));
            }

            const totalFollowers = cachedData.profileInfo?.data?.user?.edge_followed_by?.count ?? 'N/A';
            const totalFollowing = cachedData.profileInfo?.data?.user?.edge_follow?.count ?? 'N/A';

            statusDiv.innerText = `Dados carregados do cache. Seguidores: ${dbFollowers.size} (Oficial: ${totalFollowers}) | Seguindo: ${dbFollowing.size} (Oficial: ${totalFollowing})`;

            const tabelaContainer = document.getElementById("tabelaContainer");
            const tabsHtml = `
                <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <button id="btnUpdateApi" style="background: #0095f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">🔄 Atualizar Dados</button>
                    <div class="toggle-item" style="padding: 5px 10px; border-radius: 8px; gap: 10px; border: 1px solid #dbdbdb;">
                        <span style="font-size: 14px; font-weight: 500;">⚡ ${getText('useApi')}</span>
                        <label class="switch">
                            <input type="checkbox" id="naoSegueUseApiToggle" ${loadSettings().useApi ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div style="margin-bottom: 15px; padding: 0 5px;">
                    <input type="text" id="naoSegueSearchInput" placeholder="Pesquisar usuários nesta lista..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; box-sizing: border-box; outline: none;">
                </div>
                <div class="cards-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px;">
                    <div id="tabNaoSegueDeVolta" class="card-tab active" style="background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; cursor: pointer; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Não Segue de Volta</div>
                        <div id="countNaoSegue" style="font-size: 20px; font-weight: bold; color: #e74c3c;">${listNaoSegueDeVolta.length}</div>
                    </div>
                    <div id="tabNovosSeguidores" class="card-tab" style="background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; cursor: pointer; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Novos Seguidores</div>
                        <div id="countNovosSeguidores" style="font-size: 20px; font-weight: bold; color: #2ecc71;">${listNovosSeguidores.length}</div>
                    </div>
                    <div id="tabNovosSeguindo" class="card-tab" style="background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; cursor: pointer; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Novos Seguindo</div>
                        <div id="countNovosSeguindo" style="font-size: 20px; font-weight: bold; color: #0095f6;">${listNovosSeguindo.length}</div>
                    </div>
                    <div id="tabSeguidoresMutuos" class="card-tab" style="background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; cursor: pointer; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Seguidores Mútuos</div>
                        <div id="countSeguidoresMutuos" style="font-size: 20px; font-weight: bold; color: #9b59b6;">${listSeguidoresMutuos.length}</div>
                    </div>
                    <div id="tabSeguidoresPerdidos" class="card-tab" style="background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; cursor: pointer; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Seguidores Perdidos</div>
                        <div id="countSeguidoresPerdidos" style="font-size: 20px; font-weight: bold; color: #e74c3c;">${listSeguidoresPerdidos.length}</div>
                    </div>
                    <div id="tabNaoSigoDeVolta" class="card-tab" style="background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; cursor: pointer; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Não Sigo de Volta</div>
                        <div id="countNaoSigo" style="font-size: 20px; font-weight: bold; color: #f39c12;">${listNaoSigoDeVolta.length}</div>
                    </div>
                    <div id="tabHistorico" class="card-tab" style="background: #f8f9fa; border: 1px solid #dbdbdb; border-radius: 8px; padding: 15px; cursor: pointer; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Histórico</div>
                        <div id="countHistorico" style="font-size: 20px; font-weight: bold; color: #333;">${listHistorico.length}</div>
                    </div>
                </div>
                <div id="tabContent"></div>
            `;

            tabelaContainer.innerHTML = tabsHtml;

            lists = {
                'tabNaoSegueDeVolta': listNaoSegueDeVolta,
                'tabNovosSeguidores': listNovosSeguidores,
                'tabNovosSeguindo': listNovosSeguindo,
                'tabSeguidoresMutuos': listSeguidoresMutuos,
                'tabSeguidoresPerdidos': listSeguidoresPerdidos,
                'tabNaoSigoDeVolta': listNaoSigoDeVolta,
                'tabHistorico': listHistorico
            };

            currentTabId = initialTab || 'tabNaoSegueDeVolta';
            let currentList = lists[currentTabId] || lists['tabNaoSegueDeVolta'];

            async function renderCurrentTab() {
                document.querySelectorAll('.card-tab').forEach(b => {
                    b.style.borderColor = '#dbdbdb';
                    b.style.background = '#f8f9fa';
                });

                const contentDiv = document.getElementById("tabContent");
                if (!currentTabId) {
                    contentDiv.innerHTML = '';
                    return;
                }

                const activeBtn = document.getElementById(currentTabId);
                if (activeBtn) {
                    activeBtn.style.borderColor = '#0095f6';
                    activeBtn.style.background = '#e8f0fe';
                }

                if (currentTabId === 'tabHistorico') {
                    currentList = await dbHelper.loadUnfollowHistory();
                    const countHistEl = document.getElementById('countHistorico');
                    if (countHistEl) countHistEl.innerText = currentList.length;
                } else {
                    currentList = lists[currentTabId];
                }

                const searchTerm = document.getElementById('naoSegueSearchInput')?.value.toLowerCase() || '';
                let filteredList = currentList;
                if (searchTerm && Array.isArray(currentList)) {
                    filteredList = currentList.filter(u => {
                        const uname = (u && typeof u === 'object') ? u.username : String(u);
                        return uname.toLowerCase().includes(searchTerm);
                    });
                }

                const tableId = currentTabId === 'tabHistorico' ? 'historicoTable' : 'naoSegueDeVoltaTable';
                contentDiv.innerHTML = `
                    <div style="margin-bottom: 10px;"></div>
                    <table id="${tableId}" style="width: 100%; border-collapse: collapse; margin-top: 20px;"></table>
                    <div style="margin-top: 20px;">
                        <button id="selecionarTodosBtn">Selecionar Todos</button>
                        <button id="desmarcarTodosBtn">Desmarcar Todos</button>
                        ${(currentTabId === 'tabNaoSegueDeVolta' || currentTabId === 'tabSeguidoresPerdidos' || currentTabId === 'tabSeguidoresMutuos') ? `
                            <button id="unfollowBtn">Unfollow</button>
                            <button id="bloquearBtn" style="margin-left: 10px; background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Bloquear</button>
                            ${currentTabId === 'tabNaoSegueDeVolta' ? `<button id="corrigirBtn" style="margin-left: 10px; background-color: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;" title="Remove usuários selecionados desta lista permanentemente">Corrigir (Já Sigo)</button>` : ''}
                        ` : ''}
                        ${currentTabId === 'tabNaoSigoDeVolta' ? `<button id="followBackBtn" style="background:#0095f6;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Seguir de Volta</button>` : ''}
                        ${currentTabId === 'tabHistorico' ? `
                            <button id="seguirNovamenteBtn" style="background:#0095f6;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;margin-right:10px;">Seguir Novamente</button>
                            <button id="limparHistoricoBtn" style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Limpar Selecionados</button>
                        ` : ''}
                    </div>
                `;

                preencherTabela(filteredList, true, currentTabId === 'tabHistorico', selectedUsers, updateSelectedCountDisplay);

                document.getElementById("selecionarTodosBtn").onclick = () => {
                    document.querySelectorAll(`#${tableId} .unfollowCheckbox`).forEach(cb => {
                        cb.checked = true;
                        selectedUsers.add(cb.dataset.username);
                    });
                    updateSelectedCountDisplay();
                };
                document.getElementById("desmarcarTodosBtn").onclick = () => {
                    document.querySelectorAll(`#${tableId} .unfollowCheckbox`).forEach(cb => {
                        cb.checked = false;
                        selectedUsers.delete(cb.dataset.username);
                    });
                    updateSelectedCountDisplay();
                };

                if (document.getElementById("unfollowBtn")) {
                    document.getElementById("unfollowBtn").onclick = () => unfollowSelecionados(selectedUsers, updateSelectedCountDisplay);
                }
                if (document.getElementById("bloquearBtn")) {
                    document.getElementById("bloquearBtn").onclick = () => bloquearSelecionados(selectedUsers, updateSelectedCountDisplay);
                }
                if (document.getElementById("corrigirBtn")) {
                    document.getElementById("corrigirBtn").onclick = async () => {
                        const selecionados = Array.from(selectedUsers);
                        if (selecionados.length === 0) return alert("Selecione os usuários que você já segue para corrigir.");

                        if (confirm(`Marcar ${selecionados.length} usuários como 'Já Sigo'? Eles não aparecerão mais nesta lista.`)) {
                            const { bar, update, closeButton } = createCancellableProgressBar();
                            let cancelled = false;
                            closeButton.onclick = () => { cancelled = true; bar.remove(); alert("Processo interrompido."); };

                            update(0, selecionados.length, "Corrigindo...");
                            for (const u of selecionados) {
                                await dbHelper.saveException(u);
                                cachedData.exceptions.add(u);
                            }
                            cachedData.naoSegueDeVolta = [...cachedData.seguindo].filter(user => !cachedData.seguidores.has(user) && !cachedData.exceptions.has(user));
                            lists['tabNaoSegueDeVolta'] = toObjects(cachedData.naoSegueDeVolta);
                            currentList = lists['tabNaoSegueDeVolta'];
                            document.getElementById('countNaoSegue').innerText = currentList.length;
                            renderCurrentTab();
                        }
                    };
                }
                if (document.getElementById("followBackBtn")) {
                    document.getElementById("followBackBtn").onclick = async () => {
                        const selecionados = Array.from(selectedUsers);
                        if (selecionados.length === 0) return alert("Selecione os usuários para seguir de volta.");

                        const btn = document.getElementById("followBackBtn");
                        btn.disabled = true;
                        btn.textContent = "Processando...";
                        processoCancelado = false;

                        followUsers(selecionados, 0, async () => {
                            btn.disabled = false;
                            btn.textContent = "Seguir de Volta";
                            selectedUsers.clear();
                            document.querySelectorAll('#naoSegueDeVoltaTable .unfollowCheckbox, #historicoTable .unfollowCheckbox').forEach(cb => {
                                cb.checked = false;
                            });
                            updateSelectedCountDisplay();
                            showToast(`Processo de seguir finalizado.`);
                            renderCurrentTab();
                        }, selectedUsers, updateSelectedCountDisplay);
                    };
                }
                if (document.getElementById("seguirNovamenteBtn")) {
                    document.getElementById("seguirNovamenteBtn").onclick = async () => {
                        const selecionados = Array.from(selectedUsers);
                        if (selecionados.length === 0) return alert("Selecione usuários para seguir.");

                        const btn = document.getElementById("seguirNovamenteBtn");
                        btn.disabled = true;
                        btn.textContent = "Processando...";
                        processoCancelado = false;

                        followUsers(selecionados, 0, async () => {
                            btn.disabled = false;
                            btn.textContent = "Seguir Novamente";
                            const seguidos = selecionados.filter(u => !selectedUsers.has(u));
                            if (seguidos.length > 0) {
                                await dbHelper.deleteUnfollowHistory(seguidos);
                            }
                            selectedUsers.clear();
                            document.querySelectorAll('#naoSegueDeVoltaTable .unfollowCheckbox, #historicoTable .unfollowCheckbox').forEach(cb => {
                                cb.checked = false;
                            });
                            updateSelectedCountDisplay();
                            showToast(`${seguidos.length} usuário(s) seguido(s) e removido(s) do histórico.`);
                            renderCurrentTab();
                        }, selectedUsers, updateSelectedCountDisplay);
                    };
                }
                if (document.getElementById("limparHistoricoBtn")) {
                    document.getElementById("limparHistoricoBtn").onclick = async () => {
                        const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(cb => cb.dataset.username);
                        if (selecionados.length === 0) return alert("Selecione itens para limpar.");
                        if (confirm(`Excluir ${selecionados.length} itens do histórico?`)) {
                            await dbHelper.deleteUnfollowHistory(selecionados);
                            renderCurrentTab();
                        }
                    };
                }
            }

            renderCurrentTab();

            const searchInput = document.getElementById("naoSegueSearchInput");
            if (searchInput) {
                searchInput.addEventListener('input', () => renderCurrentTab());
            }

            const tabs = ['tabNaoSegueDeVolta', 'tabNovosSeguidores', 'tabNovosSeguindo', 'tabSeguidoresMutuos', 'tabSeguidoresPerdidos', 'tabNaoSigoDeVolta', 'tabHistorico'];
            tabs.forEach(tabId => {
                document.getElementById(tabId).addEventListener('click', () => {
                    currentTabId = tabId;
                    renderCurrentTab();
                });
            });

            document.getElementById('naoSegueUseApiToggle').onchange = (e) => {
                saveSettings({ useApi: e.target.checked });
                showToast(`Modo API ${e.target.checked ? 'Ativado' : 'Desativado'}`);
            };

            document.getElementById("btnUpdateApi").onclick = () => {
                showUpdateOptionsModalNaoSegue();
            };

            function showUpdateOptionsModalNaoSegue() {
                const optDiv = document.createElement("div");
                optDiv.className = "submenu-modal";
                optDiv.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; padding: 20px; border: 1px solid #ccc; border-radius: 10px; z-index: 2147483648; background: white; color: black; display: flex; flex-direction: column; gap: 10px;`;
                if (loadSettings().rgbBorder) optDiv.classList.add('rgb-border-effect');

                optDiv.innerHTML = `
                    <h3 style="margin: 0 0 10px 0;">O que deseja atualizar?</h3>
                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="chkFollowers" checked> Seguidores</label>
                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="chkFollowing" checked> Seguindo</label>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button id="btnUpdateSelectedNaoSegue" style="flex: 1; padding: 8px; background: #0095f6; color: white; border: none; border-radius: 5px; cursor: pointer;">Atualizar</button>
                        <button id="btnCancelUpdateNaoSegue" style="flex: 1; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancelar</button>
                    </div>
                `;
                document.body.appendChild(optDiv);

                document.getElementById('btnCancelUpdateNaoSegue').onclick = () => optDiv.remove();
                document.getElementById('btnUpdateSelectedNaoSegue').onclick = async () => {
                    const updateFollowers = document.getElementById('chkFollowers').checked;
                    const updateFollowing = document.getElementById('chkFollowing').checked;
                    optDiv.remove();

                    if (!updateFollowers && !updateFollowing) return alert("Selecione pelo menos uma opção.");

                    await executarAtualizacao(updateFollowers, updateFollowing);
                    selectedUsers.clear();
                };
            }

            async function executarAtualizacao(updateFollowers, updateFollowing) {
                try {
                    let profileId = cachedData.profileInfo?.data?.user?.id ? String(cachedData.profileInfo.data.user.id) : '';
                    if (!profileId || profileId === '936619743392459') {
                        statusDiv.innerText = "Buscando ID do usuário...";
                        const info = await safeFetchProfileInfo(username);
                        if (info && info.data?.user?.id && String(info.data.user.id) !== '936619743392459') {
                            cachedData.profileInfo = info;
                            profileId = String(info.data.user.id);
                        } else {
                            let fallbackId = getCookie('ds_user_id') || getActorId() || getCachedUserId(username);
                            if (fallbackId === '936619743392459') fallbackId = null;
                            if (!fallbackId) fallbackId = await getUserId(username);
                            if (fallbackId && fallbackId !== '936619743392459') {
                                profileId = String(fallbackId);
                                cachedData.profileInfo = {
                                    data: {
                                        user: {
                                            id: profileId,
                                            edge_follow: { count: 1000 },
                                            edge_followed_by: { count: 1000 }
                                        }
                                    }
                                };
                            } else {
                                alert("Não foi possível identificar o ID do usuário no Instagram. Verifique se está logado e tente novamente.");
                                return;
                            }
                        }
                    }
                    toggleLoading(true, null, "Atualizando dados via Polaris GraphQL...");

                    const userId = profileId;
                    const parsedFollowing = Number(cachedData.profileInfo?.data?.user?.edge_follow?.count);
                    const parsedFollowers = Number(cachedData.profileInfo?.data?.user?.edge_followed_by?.count);
                    let totalFollowing = (parsedFollowing && parsedFollowing !== 1000) ? parsedFollowing : (cachedData.seguindo?.size || parsedFollowing || 1000);
                    let totalFollowers = (parsedFollowers && parsedFollowers !== 1000) ? parsedFollowers : (cachedData.seguidores?.size || parsedFollowers || 1000);

                    if ((totalFollowing === 1000 || totalFollowers === 1000) && userId && typeof executeGraphqlUserHoverCard === 'function') {
                        try {
                            const hCard = await executeGraphqlUserHoverCard(userId);
                            if (hCard && hCard.following) totalFollowing = Number(hCard.following);
                            if (hCard && hCard.followers) totalFollowers = Number(hCard.followers);
                        } catch (_) { }
                    }

                    let apiFollowing = null;
                    let apiFollowers = null;

                    if (updateFollowing) {
                        apiFollowing = await fetchUserList(userId, 'following', totalFollowing);
                        if (processoCancelado || !apiFollowing) return;
                    } else {
                        apiFollowing = cachedData.seguindo;
                    }

                    if (updateFollowers) {
                        apiFollowers = await fetchUserList(userId, 'followers', totalFollowers);
                        if (processoCancelado || !apiFollowers) return;
                    } else {
                        apiFollowers = cachedData.seguidores;
                    }

                    statusDiv.innerText = "Calculando diferenças e sincronizando com o Banco de Dados...";

                    let novosSeguidoresSet = [];
                    if (updateFollowers && apiFollowers) {
                        novosSeguidoresSet = [...apiFollowers].filter(u => !cachedData.seguidores.has(u));
                    }

                    let novosSeguindoSet = [];
                    if (updateFollowing && apiFollowing) {
                        novosSeguindoSet = [...apiFollowing].filter(u => !cachedData.seguindo.has(u));
                    }

                    let seguidoresPerdidosSet = [];
                    if (updateFollowers && apiFollowers) {
                        const recemPerdidos = [...cachedData.seguidores].filter(u => !apiFollowers.has(u));
                        const historicoPerdidos = cachedData.seguidoresPerdidos || [];
                        const setPerdidos = new Set([...historicoPerdidos, ...recemPerdidos]);
                        seguidoresPerdidosSet = Array.from(setPerdidos);
                    } else {
                        seguidoresPerdidosSet = cachedData.seguidoresPerdidos || [];
                    }

                    const finalSeguindo = apiFollowing || cachedData.seguindo || new Set();
                    const finalSeguidores = apiFollowers || cachedData.seguidores || new Set();
                    let seguidoresMutuosSet = [];
                    if (finalSeguindo.size > 0 && finalSeguidores.size > 0) {
                        seguidoresMutuosSet = [...finalSeguindo].filter(u => finalSeguidores.has(u));
                    } else {
                        seguidoresMutuosSet = cachedData.seguidoresMutuos || [];
                    }

                    try {
                        if (updateFollowers && apiFollowers) {
                            const followersToSave = [...apiFollowers].map(u => cachedData.userDetails.get(u) || { username: u, photoUrl: null });
                            await dbHelper.saveCache('followers', followersToSave);
                            cachedData.seguidores = apiFollowers;
                        }

                        if (updateFollowing && apiFollowing) {
                            const followingToSave = [...apiFollowing].map(u => cachedData.userDetails.get(u) || { username: u, photoUrl: null });
                            await dbHelper.saveCache('following', followingToSave);
                            cachedData.seguindo = apiFollowing;
                        }

                        if (seguidoresMutuosSet.length > 0 || (apiFollowing && apiFollowers)) {
                            const mutuosToSave = seguidoresMutuosSet.map(u => cachedData.userDetails.get(u) || { username: u, photoUrl: null });
                            await dbHelper.saveCache('seguidoresMutuos', mutuosToSave);
                            cachedData.seguidoresMutuos = seguidoresMutuosSet;
                        }

                        if (updateFollowers && apiFollowers) {
                            const perdidosToSave = seguidoresPerdidosSet.map(u => cachedData.userDetails.get(u) || { username: u, photoUrl: null });
                            await dbHelper.saveCache('seguidoresPerdidos', perdidosToSave);
                            cachedData.seguidoresPerdidos = seguidoresPerdidosSet;
                        }
                    } catch (saveErr) {
                        console.warn("[IG Tools] Erro ao sincronizar nuvem:", saveErr);
                    }

                    if (apiFollowing && apiFollowers) {
                        cachedData.naoSegueDeVolta = [...apiFollowing].filter(user => !apiFollowers.has(user) && !cachedData.exceptions.has(user));
                        lists['tabNaoSegueDeVolta'] = toObjects(cachedData.naoSegueDeVolta);
                    }

                    lists['tabSeguidoresMutuos'] = toObjects(seguidoresMutuosSet);

                    if (updateFollowers && apiFollowers) {
                        lists['tabNovosSeguidores'] = toObjects(novosSeguidoresSet);
                        lists['tabSeguidoresPerdidos'] = toObjects(seguidoresPerdidosSet);
                    }

                    if (updateFollowing && apiFollowing) {
                        lists['tabNovosSeguindo'] = toObjects(novosSeguindoSet);
                    }

                    if (cachedData.seguidores && cachedData.seguindo) {
                        lists['tabNaoSigoDeVolta'] = toObjects([...cachedData.seguidores].filter(u => !cachedData.seguindo.has(u)));
                    }

                    if (document.getElementById('countNaoSegue')) document.getElementById('countNaoSegue').innerText = lists['tabNaoSegueDeVolta']?.length || 0;
                    if (document.getElementById('countNovosSeguidores')) document.getElementById('countNovosSeguidores').innerText = lists['tabNovosSeguidores']?.length || 0;
                    if (document.getElementById('countNovosSeguindo')) document.getElementById('countNovosSeguindo').innerText = lists['tabNovosSeguindo']?.length || 0;
                    if (document.getElementById('countSeguidoresMutuos')) document.getElementById('countSeguidoresMutuos').innerText = lists['tabSeguidoresMutuos']?.length || 0;
                    if (document.getElementById('countSeguidoresPerdidos')) document.getElementById('countSeguidoresPerdidos').innerText = lists['tabSeguidoresPerdidos']?.length || 0;
                    if (document.getElementById('countNaoSigo')) document.getElementById('countNaoSigo').innerText = lists['tabNaoSigoDeVolta']?.length || 0;

                    statusDiv.innerText = "Dados atualizados com sucesso via Polaris GraphQL!";
                    currentList = lists[currentTabId];
                    renderCurrentTab();
                } catch (errGeral) {
                    console.error("[IG Tools] Erro na atualização:", errGeral);
                    statusDiv.innerText = "Processo finalizado com avisos.";
                } finally {
                    toggleLoading(false);
                }
            }
        }

        async function bloquearSelecionados(usersSet, updateCountCb) {
            const selecionados = Array.from(usersSet);
            if (selecionados.length === 0) {
                alert("Nenhum usuário selecionado para Bloquear.");
                return;
            }
            if (!confirm(`Bloquear ${selecionados.length} usuário(s)? Atenção: o Instagram deixará de seguir e bloqueará estes perfis.`)) {
                return;
            }

            const btn = document.getElementById("bloquearBtn");
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Processando...";
            }

            toggleLoading(true, 0, "Iniciando Bloqueio...");
            const blockDelay = loadSettings().unfollowDelay || 1500;

            for (let i = 0; i < selecionados.length; i++) {
                if (processoCancelado) break;
                const uname = selecionados[i];
                const percent = Math.round(((i + 1) / selecionados.length) * 100);
                toggleLoading(true, percent, `Bloqueando ${uname} (${i + 1}/${selecionados.length})...`);
                if (statusDiv) statusDiv.innerText = `Bloqueando ${uname} (${i + 1}/${selecionados.length})...`;

                let uid = getCachedUserId(uname);
                if (!uid && cachedData?.userDetails) {
                    const details = cachedData.userDetails.get(uname.toLowerCase());
                    if (details?.id) uid = String(details.id);
                }
                if (!uid) uid = await getUserId(uname);

                if (!uid) {
                    console.warn(`[IG Tools] Não foi possível obter o ID de ${uname}`);
                    showToast(`⚠️ ID de ${uname} não encontrado`);
                    continue;
                }

                try {
                    const apiResult = await executeGraphqlBlockMany([uid]);
                    if (apiResult.success || apiResult.result?.status === 'ok') {
                        showToast(`🚫 Bloqueou ${uname}`);
                        usersSet.delete(uname);
                        if (updateCountCb) updateCountCb();

                        const activeTab = currentTabId || 'tabNaoSegueDeVolta';
                        const naoSegueList = lists ? lists[activeTab] : null;
                        if (naoSegueList) {
                            const userIndex = naoSegueList.findIndex(u => (typeof u === 'object' ? u?.username : u)?.toLowerCase() === uname.toLowerCase());
                            if (userIndex > -1) naoSegueList.splice(userIndex, 1);
                            const countEl = document.getElementById(activeTab === 'tabNaoSegueDeVolta' ? 'countNaoSegue' : (activeTab === 'tabSeguidoresPerdidos' ? 'countSeguidoresPerdidos' : (activeTab === 'tabSeguidoresMutuos' ? 'countSeguidoresMutuos' : '')));
                            if (countEl) countEl.innerText = naoSegueList.length;
                        }

                        const lowerUser = uname.toLowerCase();
                        if (cachedData?.seguindo && cachedData.seguindo.has(lowerUser)) {
                            cachedData.seguindo.delete(lowerUser);
                            const newFollowingList = Array.from(cachedData.seguindo).map(u =>
                                cachedData.userDetails ? (cachedData.userDetails.get(u) || { username: u, photoUrl: null }) : { username: u, photoUrl: null }
                            );
                            dbHelper.saveCache('following', newFollowingList).catch(e => console.error(e));
                        }

                        const rows = document.querySelectorAll(`tr[data-username="${uname}"]`);
                        rows.forEach(r => r.remove());
                    } else {
                        showToast(`❌ Falha ao bloquear ${uname}`);
                    }
                } catch (err) {
                    console.error(`[IG Tools Block] Erro ao bloquear ${uname}:`, err);
                    showToast(`❌ Erro ao bloquear ${uname}`);
                }

                if (i < selecionados.length - 1) {
                    await new Promise(r => setTimeout(r, blockDelay));
                }
            }

            toggleLoading(false);
            usersSet.clear();
            document.querySelectorAll('#naoSegueDeVoltaTable .unfollowCheckbox, #historicoTable .unfollowCheckbox').forEach(cb => {
                cb.checked = false;
            });
            if (updateCountCb) updateCountCb();

            if (btn) {
                btn.disabled = false;
                btn.textContent = "Bloquear";
            }
            if (statusDiv) statusDiv.innerText = "Processo de bloqueio finalizado.";
            alert("Processo de bloqueio finalizado.");
        }

        function unfollowSelecionados(usersSet, updateCountCb) {
            if (isUnfollowing) {
                alert("Processo de unfollow já em andamento.");
                return;
            }

            const selecionados = Array.from(usersSet);
            if (selecionados.length === 0) {
                alert("Nenhum usuário selecionado para Unfollow.");
                return;
            }

            const unfollowBtn = document.getElementById("unfollowBtn");
            unfollowBtn.disabled = true;
            unfollowBtn.textContent = "Processando...";
            isUnfollowing = true;

            toggleLoading(true, 0, "Iniciando Unfollows...");
            unfollowUsers(selecionados, 0, () => {
                toggleLoading(false);
                unfollowBtn.disabled = false;
                unfollowBtn.textContent = "Unfollow";
                isUnfollowing = false;
                usersSet.clear();
                document.querySelectorAll('#naoSegueDeVoltaTable .unfollowCheckbox, #historicoTable .unfollowCheckbox').forEach(cb => {
                    cb.checked = false;
                });
                if (updateCountCb) updateCountCb();

                const tabHistorico = document.getElementById('tabHistorico');
                if (tabHistorico) tabHistorico.click();
            }, usersSet, updateCountCb);
        }

        function unfollowUsers(users, index, callback, selectedUsersSet, updateCountCb) {
            if (index >= users.length || processoCancelado) {
                if (!processoCancelado) {
                    showToast("✅ Unfollow concluído!");
                    alert("Unfollow concluído.");
                }
                if (callback) callback();
                return;
            }

            const uname = users[index];
            if (statusDiv) statusDiv.innerText = `Deixando de seguir ${uname} (${index + 1}/${users.length})...`;

            const finishUserSuccess = (photoUrl, userId = null) => {
                dbHelper.saveUnfollowHistory({
                    username: uname,
                    id: userId ? String(userId) : (getCachedUserId(uname) || null),
                    photoUrl: photoUrl || null,
                    unfollowDate: new Date().toISOString()
                }).catch(err => console.error(`Falha ao salvar ${uname} no histórico:`, err));

                if (selectedUsersSet) selectedUsersSet.delete(uname);
                if (updateCountCb) updateCountCb();

                const naoSegueList = lists ? lists['tabNaoSegueDeVolta'] : null;
                if (naoSegueList) {
                    const userIndex = naoSegueList.findIndex(u => (typeof u === 'object' ? u?.username : u)?.toLowerCase() === uname.toLowerCase());
                    if (userIndex > -1) naoSegueList.splice(userIndex, 1);
                    const countSpan = document.getElementById('countNaoSegue');
                    if (countSpan) countSpan.innerText = naoSegueList.length;
                }

                const lowerUser = uname.toLowerCase();
                if (cachedData?.seguindo && cachedData.seguindo.has(lowerUser)) {
                    cachedData.seguindo.delete(lowerUser);
                    const newFollowingList = Array.from(cachedData.seguindo).map(u =>
                        cachedData.userDetails ? (cachedData.userDetails.get(u) || { username: u, photoUrl: null }) : { username: u, photoUrl: null }
                    );
                    dbHelper.saveCache('following', newFollowingList).catch(e => console.error(e));
                }

                const rows = document.querySelectorAll(`tr[data-username="${uname}"]`);
                rows.forEach(r => r.remove());
            };

            // Modo API via Polaris GraphQL
            if (loadSettings().useApi) {
                if (statusDiv) statusDiv.innerText = `Deixando de seguir ${uname} (${index + 1}/${users.length}) via GraphQL...`;
                toggleLoading(true, ((index + 1) / users.length) * 100, `Deixando de seguir ${uname}...`);

                (async () => {
                    let uid = getCachedUserId(uname);
                    if (!uid && cachedData?.userDetails) {
                        const details = cachedData.userDetails.get(uname.toLowerCase());
                        if (details?.id) uid = String(details.id);
                    }
                    if (!uid) uid = await getUserId(uname);

                    if (!uid) {
                        showToast(`⚠️ ID de ${uname} não encontrado.`);
                        setTimeout(() => unfollowUsers(users, index + 1, callback, selectedUsersSet, updateCountCb), loadSettings().unfollowDelay);
                        return;
                    }

                    try {
                        const apiResult = await executeGraphqlUnfollow(uid);
                        if (apiResult.success || apiResult.result?.status === 'ok') {
                            const photoUrl = cachedData?.userDetails ? (cachedData.userDetails.get(uname.toLowerCase())?.photoUrl || null) : null;
                            finishUserSuccess(photoUrl, uid);
                            showToast(`✅ Deixou de seguir ${uname}`);
                        } else {
                            showToast(`❌ Falha no unfollow de ${uname}`);
                        }
                    } catch (e) {
                        console.error(`[IG Tools] Erro no Unfollow para ${uname}:`, e);
                    }

                    setTimeout(() => unfollowUsers(users, index + 1, callback, selectedUsersSet, updateCountCb), loadSettings().unfollowDelay);
                })();
                return;
            }

            // Modo navegação humana
            toggleLoading(true, ((index + 1) / users.length) * 100, `Deixando de seguir ${uname}...`);
            if (!window.location.pathname.includes(`/${uname}`)) {
                history.pushState(null, null, `/${uname}/`);
                window.dispatchEvent(new Event("popstate"));
            }

            const unfollowDelay = loadSettings().unfollowDelay;
            setTimeout(() => {
                if (processoCancelado) { if (callback) callback(); return; }

                const followBtn = Array.from(document.querySelectorAll('header button, header div[role="button"], button')).find(el => {
                    const txt = (el.textContent || '').trim();
                    return ['Seguindo', 'Following', 'Siguiendo'].includes(txt);
                });

                if (followBtn) {
                    followBtn.click();
                    setTimeout(() => {
                        if (processoCancelado) { if (callback) callback(); return; }

                        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], div[aria-modal="true"]'));
                        let confirmBtn = null;
                        for (const dialog of dialogs) {
                            const btns = Array.from(dialog.querySelectorAll('button, div[role="button"]'));
                            confirmBtn = btns.find(b => ['Deixar de seguir', 'Unfollow', 'Dejar de seguir'].some(t => (b.textContent || '').includes(t)));
                            if (confirmBtn) break;
                        }

                        if (confirmBtn) {
                            confirmBtn.click();
                            const photoUrl = cachedData?.userDetails?.get(uname.toLowerCase())?.photoUrl || null;
                            finishUserSuccess(photoUrl);
                            setTimeout(() => {
                                unfollowUsers(users, index + 1, callback, selectedUsersSet, updateCountCb);
                            }, unfollowDelay);
                        } else {
                            unfollowUsers(users, index + 1, callback, selectedUsersSet, updateCountCb);
                        }
                    }, 2000);
                } else {
                    unfollowUsers(users, index + 1, callback, selectedUsersSet, updateCountCb);
                }
            }, 3500);
        }

        function followUsers(users, index, callback, selectedUsersSet, updateCountCb) {
            if (index >= users.length || processoCancelado) {
                toggleLoading(false);
                document.querySelectorAll('#naoSegueDeVoltaTable .unfollowCheckbox, #historicoTable .unfollowCheckbox').forEach(cb => {
                    cb.checked = false;
                });
                if (selectedUsersSet) selectedUsersSet.clear();
                if (updateCountCb) updateCountCb();
                if (!processoCancelado && users.length > 0) {
                    alert("Processo de seguir concluído.");
                }
                if (callback) callback();
                return;
            }

            const uname = users[index];
            toggleLoading(true, ((index + 1) / users.length) * 100, `Seguindo ${uname}...`);
            if (statusDiv) statusDiv.innerText = `Seguindo ${uname} (${index + 1}/${users.length})...`;

            (async () => {
                try {
                    let uid = getCachedUserId(uname);
                    if (!uid && cachedData?.userDetails) {
                        const details = cachedData.userDetails.get(uname.toLowerCase());
                        if (details?.id) uid = String(details.id);
                    }
                    if (!uid) uid = await getUserId(uname);

                    if (uid) {
                        const apiResult = await executeGraphqlFollow(uid);
                        const isOk = apiResult.success || (apiResult.response && apiResult.response.ok && (
                            apiResult.result?.status === 'ok' ||
                            apiResult.result?.result === 'following' ||
                            apiResult.result?.result === 'requested' ||
                            apiResult.result?.friendship_status?.following === true
                        ));

                        if (isOk) {
                            if (selectedUsersSet) selectedUsersSet.delete(uname);
                            if (updateCountCb) updateCountCb();
                            const lowerUser = uname.toLowerCase();
                            if (cachedData?.seguindo) cachedData.seguindo.add(lowerUser);

                            if (lists && lists['tabNaoSigoDeVolta']) {
                                const uIdx = lists['tabNaoSigoDeVolta'].findIndex(u => (typeof u === 'object' ? u?.username : u)?.toLowerCase() === lowerUser);
                                if (uIdx > -1) {
                                    lists['tabNaoSigoDeVolta'].splice(uIdx, 1);
                                    const countSpan = document.getElementById('countNaoSigo');
                                    if (countSpan) countSpan.innerText = lists['tabNaoSigoDeVolta'].length;
                                }
                            }
                            const rows = document.querySelectorAll(`tr[data-username="${uname}"]`);
                            rows.forEach(r => r.remove());
                            showToast(`✅ Agora você está seguindo ${uname}`);
                        } else {
                            showToast(`❌ Falha ao seguir ${uname}`);
                        }
                    } else {
                        showToast(`⚠️ ID de ${uname} não encontrado.`);
                    }
                } catch (e) {
                    console.error(`Erro ao seguir ${uname}`, e);
                    showToast(`❌ Erro ao seguir ${uname}`);
                }

                const delay = loadSettings().requestDelay || 1500;
                setTimeout(() => followUsers(users, index + 1, callback, selectedUsersSet, updateCountCb), delay);
            })();
        }

        carregarDadosIniciais();
    }

    /**
     * 2. LÓGICA COMPLETA PARA GERENCIADOR DE "SEGUINDO"
     */
    async function iniciarProcessoSeguindo(updateOptions = null) {
        if (document.getElementById("seguindoModal")) return;

        const originalPath = window.location.pathname;

        toggleLoading(true, null, "Identificando usuário...");
        const username = await resolveTargetOrLoggedUsername();
        toggleLoading(false);

        if (!username) {
            alert("Por favor, acesse a página de um perfil ou efetue login para usar esta função.");
            return;
        }

        const dbHelper = getDbHelper();
        const userListCache = getUserListCache();

        const shouldUpdate = (key) => {
            if (!updateOptions) return false;
            if (updateOptions === true) return true;
            return !!updateOptions[key];
        };
        const isUpdate = updateOptions !== null;

        if (isUpdate) {
            const statusModal = document.createElement("div");
            statusModal.id = "automationStatusModal";
            statusModal.className = "submenu-modal";
            statusModal.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 90%; max-width: 500px; border: 1px solid #ccc;
                border-radius: 10px; padding: 20px; z-index: 10001;
            `;
            statusModal.innerHTML = `
                <div class="modal-header">
                    <span class="modal-title">Coletando Dados via Polaris GraphQL...</span>
                </div>
                <div style="padding: 15px;">
                    <p>Por favor, aguarde. Sincronizando informações do seu perfil.</p>
                    <ul style="list-style: none; padding: 0; margin-top: 20px;">
                        <li id="status-step-1" style="margin-bottom: 10px;"><span>⏳</span> Carregando lista de "Seguindo"...</li>
                        <li id="status-step-2" style="margin-bottom: 10px;"><span>⏳</span> Carregando "Melhores Amigos"...</li>
                        <li id="status-step-3" style="margin-bottom: 10px;"><span>⏳</span> Carregando "Ocultar Stories"...</li>
                        <li id="status-step-4" style="margin-bottom: 10px;"><span>⏳</span> Carregando "Contas Silenciadas"...</li>
                    </ul>
                </div>
            `;
            document.body.appendChild(statusModal);
        }

        const updateStatus = (step, success, message = '') => {
            if (!isUpdate) return;
            const stepLi = document.getElementById(`status-step-${step}`);
            if (stepLi) {
                stepLi.innerHTML = `<span>${success ? '✅' : '❌'}</span> ${stepLi.innerText.substring(2)} ${message}`;
            }
        };

        const loadCacheFromDB = async (key) => {
            try {
                let set = new Set();
                let hasLoadedAny = false;
                const data = await dbHelper.loadCache(key);

                let localKey = '';
                if (key === 'muted') localKey = 'ig_tools_cached_muted';
                else if (key === 'closeFriends') localKey = 'ig_tools_cached_close_friends';
                else if (key === 'hiddenStory') localKey = 'ig_tools_cached_hide_story';

                let localData = null;
                if (localKey) {
                    try {
                        const raw = localStorage.getItem(localKey);
                        if (raw !== null) {
                            localData = JSON.parse(raw);
                        }
                    } catch (_) { }
                }

                if (!userListCache.mutedDetails) {
                    userListCache.mutedDetails = new Map();
                }

                const populateFrom = (source) => {
                    if (!source) return;
                    hasLoadedAny = true;
                    if (source instanceof Set) {
                        source.forEach(item => {
                            if (item) {
                                const uname = typeof item === 'object' ? (item.username || '') : String(item);
                                if (uname) {
                                    set.add(uname);
                                    set.add(uname.toLowerCase());
                                }
                            }
                        });
                        if (source.details && source.details instanceof Map) {
                            source.details.forEach((val, uname) => {
                                if (key === 'closeFriends' && (val?.isCloseFriend === false || val?.isChecked === false)) return;
                                if (key === 'hiddenStory' && (val?.isHidden === false || val?.isChecked === false)) return;
                                if (key === 'muted' && val?.isMuted === false) return;
                                const uStr = String(uname);
                                const uLower = uStr.toLowerCase();
                                set.add(uStr);
                                set.add(uLower);
                                if (key === 'muted') {
                                    const s = (typeof val === 'object' ? val?.status : val) || 'Silenciado';
                                    userListCache.mutedDetails.set(uStr, s);
                                    userListCache.mutedDetails.set(uLower, s);
                                }
                            });
                        }
                    } else if (Array.isArray(source)) {
                        source.forEach(item => {
                            if (item) {
                                const uname = typeof item === 'object' ? (item.username || '') : String(item);
                                if (uname) {
                                    if (typeof item === 'object') {
                                        if (key === 'closeFriends' && (item.isCloseFriend === false || item.isChecked === false)) return;
                                        if (key === 'hiddenStory' && (item.isHidden === false || item.isChecked === false)) return;
                                        if (key === 'muted' && item.isMuted === false) return;
                                    }
                                    const uStr = String(uname);
                                    const uLower = uStr.toLowerCase();
                                    set.add(uStr);
                                    set.add(uLower);
                                    if (key === 'muted') {
                                        const s = (typeof item === 'object' ? item.status : 'Silenciado') || 'Silenciado';
                                        userListCache.mutedDetails.set(uStr, s);
                                        userListCache.mutedDetails.set(uLower, s);
                                    }
                                }
                            }
                        });
                    }
                };

                populateFrom(data);
                populateFrom(localData);

                if (hasLoadedAny || data !== null || localData !== null) {
                    userListCache[key] = set;
                } else {
                    userListCache[key] = null;
                }
            } catch (e) {
                console.warn(`[IG Tools] Erro ao carregar cache de ${key}:`, e);
                userListCache[key] = new Set();
            }
        };

        const div = document.createElement("div");
        div.id = "seguindoModal";
        div.className = "submenu-modal";
        let processoCancelado = false;

        let styleEl = document.getElementById("seguindoResponsiveStyle");
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "seguindoResponsiveStyle";
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            #seguindoModal {
                width: 96vw !important;
                max-width: 1420px !important;
                max-height: 94vh !important;
                box-sizing: border-box !important;
            }
            #tabelaSeguindoContainer {
                width: 100% !important;
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                box-sizing: border-box !important;
                padding-bottom: 6px;
            }
            #tabelaSeguindoContainer table {
                width: 100% !important;
                min-width: 820px !important;
                border-collapse: separate !important;
                border-spacing: 0 !important;
            }
        `;

        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 96vw; max-width: 1420px; max-height: 94vh; border: 1px solid #ccc;
            border-radius: 12px; padding: 16px 20px; z-index: 10000; overflow-y: auto; overflow-x: hidden;
            box-sizing: border-box;
        `;
        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    Gerenciador de "Seguindo" <span id="seguindoSelectedCount" style="font-size:12px; font-weight:normal; color:#3498db;">(0 selecionados)</span>
                    <div class="info-tooltip">${infoIcon}<span class="tooltip-text">Gerencie quem você segue. Filtre por quem é Melhor Amigo, Silenciado ou tem Story Oculto.</span></div>
                </span>
                <div class="modal-controls"><button id="seguindoMinimizarBtn" title="Minimizar">_</button><button id="fecharSeguindoBtn" title="Fechar">X</button></div>
            </div>
            <div style="padding: 10px 0;">
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div class="seguindo-header-actions" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button id="atualizarSeguindoBtn" title="Atualizar Dados" style="background: #1abc9c; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer;">🔄️ Atualizar</button>
                        <button id="executarSeguindoBtn" style="background: #3498db; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer;">🚀 Executar</button>
                        <button id="unfollowSeguindoBtn" style="background: #e74c3c; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer;">Deixar de Seguir</button>
                        <button id="blockSeguindoBtn" style="background: #c0392b; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer;">Bloquear</button>
                        <button id="loadStatsSeguindoBtn" style="background: #e67e22; color: white; border: none; border-radius: 5px; padding: 8px 14px; cursor: pointer;">Carregar Stats (Página)</button>
                    </div>
                    <div class="toggle-item" style="padding: 5px 10px; border-radius: 8px; gap: 10px;">
                        <span style="font-size: 14px; font-weight: 500;">⚡ ${getText('useApi')}</span>
                        <label class="switch"><input type="checkbox" id="seguindoUseApiToggle" ${loadSettings().useApi ? 'checked' : ''}><span class="slider"></span></label>
                    </div>
                </div>
            </div>
            <div class="seguindo-search-bar" style="margin: 0 0 12px 0; display: flex; gap: 10px;">
                <input type="text" id="seguindoSearchInput" placeholder="Pesquisar..." style="flex: 2; padding: 8px 12px; height: 40px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; outline: none; box-sizing: border-box;">
                <select id="seguindoFilterSelect" style="flex: 1; padding: 0 10px; height: 40px; border-radius: 8px; border: 1px solid #dbdbdb; color: black; background: white; cursor: pointer; outline: none; box-sizing: border-box;">
                    <option value="all">Todos</option>
                    <option value="no_category">⚪ Sem Categoria (Em Branco)</option>
                    <option value="muted_stories">Silenciado (Stories)</option>
                    <option value="muted_posts">Silenciado (Publicações)</option>
                    <option value="muted_all">Silenciado (Ambos)</option>
                    <option value="close_friends">Melhores Amigos</option>
                    <option value="hidden_stories">Ocultar Stories</option>
                </select>
            </div>
            <div id="statusSeguindo" style="margin-top: 10px; font-weight: bold; padding: 0;"></div>
            <div id="tabelaSeguindoContainer" style="display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 10px; box-sizing: border-box;"></div>
        `;
        document.body.appendChild(div);

        const attachStaticListeners = () => {
            document.getElementById("fecharSeguindoBtn").addEventListener("click", () => {
                processoCancelado = true;
                document.getElementById("progressBar")?.remove();
                div.remove();
            });

            document.getElementById("seguindoMinimizarBtn").addEventListener("click", () => {
                const modal = document.getElementById('seguindoModal');
                const contentToToggle = [
                    modal.querySelector('input[type="text"]')?.parentElement,
                    modal.querySelector('#tabelaSeguindoContainer')
                ].filter(Boolean);

                const btn = document.getElementById('seguindoMinimizarBtn');
                const isMinimized = modal.dataset.minimized === 'true';

                contentToToggle.forEach(el => el.style.display = isMinimized ? '' : 'none');
                modal.dataset.minimized = !isMinimized;
                btn.textContent = isMinimized ? 'Minimizar' : 'Maximizar';
                modal.style.maxHeight = isMinimized ? '90vh' : 'none';
            });

            document.getElementById("atualizarSeguindoBtn").addEventListener("click", () => {
                showUpdateOptionsModal();
            });
        };
        attachStaticListeners();

        const statusDiv = document.getElementById("statusSeguindo");
        const container = document.getElementById("tabelaSeguindoContainer");
        let seguindoList = [];
        let currentPaginatedUsers = [];
        const selectedUsers = new Set();
        let allCategories = [];
        let userCategoryMap = new Map();
        const seguindoInteracoesCache = new Map();
        const activeInteracoesSubrows = new Set();

        async function carregarSeguindo() {
            allCategories = await dbHelper.loadCategories();
            userCategoryMap = await dbHelper.loadAllUserCategories();

            statusDiv.innerText = 'Buscando informações do perfil...';
            const profileInfo = await safeFetchProfileInfo(username);
            if (processoCancelado) return;

            let userId = profileInfo?.data?.user?.id;
            if (!userId || userId === '936619743392459') {
                userId = getCookie('ds_user_id') || getActorId() || (await getUserId(username));
            }
            if (!userId || userId === '936619743392459') {
                alert('Não foi possível obter as informações do perfil. Por favor, aguarde alguns minutos e tente novamente.');
                div.remove();
                return;
            }

            const totalFollowing = profileInfo?.data?.user?.edge_follow?.count || 1000;

            await Promise.all([
                loadCacheFromDB('closeFriends'),
                loadCacheFromDB('hiddenStory'),
                loadCacheFromDB('muted')
            ]);

            const dbFollowing = await dbHelper.loadCache('following');

            if (!shouldUpdate('following') && dbFollowing) {
                if (dbFollowing.details) {
                    seguindoList = Array.from(dbFollowing.details.values());
                } else if (dbFollowing instanceof Set) {
                    seguindoList = Array.from(dbFollowing).map(u => ({ username: u, photoUrl: DEFAULT_AVATAR }));
                } else if (Array.isArray(dbFollowing)) {
                    seguindoList = dbFollowing;
                } else {
                    seguindoList = [];
                }
                if (isUpdate) updateStatus(1, true, '(Cache)');
            } else {
                seguindoList = await fetchUserListPolarisGraphQL(userId, 'following', totalFollowing, null, () => processoCancelado, null, true);
                if (seguindoList) {
                    if (isUpdate) updateStatus(1, true);
                    await dbHelper.saveCache('following', seguindoList);
                } else {
                    if (isUpdate) updateStatus(1, false);
                    seguindoList = [];
                }
            }

            if (isUpdate) {
                const statusModal = document.getElementById("automationStatusModal");
                if (statusModal) statusModal.remove();
                document.body.appendChild(div);
                attachStaticListeners();
            }
            statusDiv.innerText = `Total: ${seguindoList.length} perfis seguidos.`;

            let currentPage = 1;
            const itemsPerPage = loadSettings().itemsPerPage || 10;
            let sortConfig = { key: 'username', direction: 'ascending' };

            const renderList = (page) => {
                currentPage = page;
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                const searchTerm = document.getElementById('seguindoSearchInput')?.value.toLowerCase() || '';
                const filterValue = document.getElementById('seguindoFilterSelect')?.value || 'all';

                let filteredUsers = seguindoList;
                if (searchTerm) {
                    filteredUsers = seguindoList.filter(user => user.username.toLowerCase().includes(searchTerm));
                }

                if (filterValue === 'close_friends') {
                    filteredUsers = filteredUsers.filter(user => userListCache.closeFriends && userListCache.closeFriends.has(user.username.toLowerCase()));
                } else if (filterValue === 'hidden_stories') {
                    filteredUsers = filteredUsers.filter(user => userListCache.hiddenStory && userListCache.hiddenStory.has(user.username.toLowerCase()));
                } else if (filterValue.startsWith('muted_')) {
                    filteredUsers = filteredUsers.filter(user => {
                        const uLower = user.username.toLowerCase();
                        if (userListCache.muted && userListCache.muted.has(uLower)) {
                            const detail = userListCache.mutedDetails?.get(uLower) || '';
                            const dLower = detail.toLowerCase();
                            const isStories = dLower.includes('stories') || dLower.includes('story');
                            const isPosts = dLower.includes('publicações') || dLower.includes('posts');
                            if (filterValue === 'muted_all') return isStories && isPosts;
                            if (filterValue === 'muted_stories') return isStories && !isPosts;
                            if (filterValue === 'muted_posts') return isPosts && !isStories;
                            return true;
                        }
                        return false;
                    });
                } else if (filterValue === 'no_category') {
                    filteredUsers = filteredUsers.filter(user => {
                        const cats = userCategoryMap.get(user.username.toLowerCase());
                        return !cats || cats.length === 0;
                    });
                } else if (filterValue.startsWith('category_')) {
                    const categoryId = filterValue.replace('category_', '');
                    filteredUsers = filteredUsers.filter(user => {
                        return userCategoryMap.get(user.username.toLowerCase())?.includes(categoryId);
                    });
                }

                let tableHtml = `
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 14px;">
                        <thead style="cursor: pointer;">
                            <tr style="text-align: left;">
                                <th style="padding: 8px 4px; width: 30px; text-align: center; border-bottom: 2px solid #dbdbdb;"><input type="checkbox" id="selectAllCheckbox" title="Selecionar Todos"></th>
                                <th style="padding: 8px 6px; min-width: 140px; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="username">Usuário ${sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px 4px; text-align: center; white-space: nowrap; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="isMuted" title="${userListCache.muted === null ? 'Visite o menu Contas Silenciadas para carregar estes dados.' : ''}">Silenciado? ${userListCache.muted === null ? '??' : (sortConfig.key === 'isMuted' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                <th style="padding: 8px 4px; text-align: center; white-space: nowrap; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="isCloseFriend" title="${userListCache.closeFriends === null ? 'Visite o menu Amigos Próximos para carregar estes dados.' : ''}">Melhores Amigos? ${userListCache.closeFriends === null ? '??' : (sortConfig.key === 'isCloseFriend' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                <th style="padding: 8px 4px; text-align: center; white-space: nowrap; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="isStoryHidden" title="${userListCache.hiddenStory === null ? 'Visite o menu Ocultar Story para carregar estes dados.' : ''}">Ocultar Stories? ${userListCache.hiddenStory === null ? '??' : (sortConfig.key === 'isStoryHidden' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                <th style="padding: 8px 4px; text-align: center; white-space: nowrap; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="followers">Seguidores ${sortConfig.key === 'followers' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px 4px; text-align: center; white-space: nowrap; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="following">Seguindo ${sortConfig.key === 'following' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px 4px; text-align: center; white-space: nowrap; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="status">Status ${sortConfig.key === 'status' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px 6px; white-space: nowrap; border-bottom: 2px solid #dbdbdb; cursor: pointer; user-select: none;" data-sort-key="categories">Categorias ${sortConfig.key === 'categories' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                <th style="padding: 8px 6px; text-align: center; white-space: nowrap; border-bottom: 2px solid #dbdbdb;">Interações</th>
                            </tr>
                        </thead>
                        <tbody style="max-height: 60vh; overflow-y: auto;">
                `;

                const sortedUsers = [...filteredUsers].sort((a, b) => {
                    const getSortValue = (user, key) => {
                        const uLower = user.username.toLowerCase();
                        if (key === 'username') return uLower;
                        if (key === 'isMuted') return userListCache.muted ? ((userListCache.muted.has(user.username) || userListCache.muted.has(uLower)) ? 1 : 2) : 3;
                        if (key === 'isCloseFriend') return userListCache.closeFriends ? ((userListCache.closeFriends.has(user.username) || userListCache.closeFriends.has(uLower)) ? 1 : 2) : 3;
                        if (key === 'isStoryHidden') return userListCache.hiddenStory ? ((userListCache.hiddenStory.has(user.username) || userListCache.hiddenStory.has(uLower)) ? 1 : 2) : 3;
                        if (key === 'followers') return (Number(user.followers) || 0);
                        if (key === 'following') return (Number(user.following) || 0);
                        if (key === 'status') {
                            if (user.followers !== undefined && user.following !== undefined && user.following > user.followers) {
                                return 1;
                            }
                            return 2;
                        }
                        if (key === 'categories') {
                            const cats = userCategoryMap.get(uLower) || [];
                            return cats.map(cid => allCategories.find(c => c.id === cid)?.name || '').filter(Boolean).sort().join(', ');
                        }
                        return 0;
                    };

                    const valA = getSortValue(a, sortConfig.key);
                    const valB = getSortValue(b, sortConfig.key);

                    if (typeof valA === 'string' && typeof valB === 'string') {
                        const cmp = valA.localeCompare(valB);
                        return sortConfig.direction === 'ascending' ? cmp : -cmp;
                    }

                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                });

                const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
                currentPaginatedUsers = paginatedUsers;

                if (paginatedUsers.length === 0) {
                    tableHtml += `<tr><td colspan="10" style="text-align: center; padding: 20px;">Nenhum usuário encontrado com os filtros aplicados.</td></tr>`;
                } else {
                    paginatedUsers.forEach((userObj) => {
                        const { username: uname, photoUrl } = userObj;
                        const isChecked = selectedUsers.has(uname);
                        const unameLower = uname.toLowerCase();
                        const isMutedSimple = userListCache.muted ? ((userListCache.muted.has(uname) || userListCache.muted.has(unameLower)) ? "Sim" : "Não") : "??";
                        const isCloseFriend = userListCache.closeFriends ? ((userListCache.closeFriends.has(uname) || userListCache.closeFriends.has(unameLower)) ? "Sim" : "Não") : "??";
                        const isStoryHidden = userListCache.hiddenStory ? ((userListCache.hiddenStory.has(uname) || userListCache.hiddenStory.has(unameLower)) ? "Sim" : "Não") : "??";

                        let mutedDetailText = '';
                        if (isMutedSimple === "Sim") {
                            const detail = userListCache.mutedDetails?.get(uname) || userListCache.mutedDetails?.get(unameLower) || '';
                            const dLower = detail.toLowerCase();
                            if ((dLower.includes('stories') || dLower.includes('story')) && (dLower.includes('publicações') || dLower.includes('posts'))) {
                                mutedDetailText = '(Stories e Publicações)';
                            } else if (dLower.includes('stories') || dLower.includes('story')) {
                                mutedDetailText = '(Stories)';
                            } else if (dLower.includes('publicações') || dLower.includes('posts')) {
                                mutedDetailText = '(Publicações)';
                            } else if (detail) {
                                mutedDetailText = `(${detail})`;
                            }
                        }

                        const userCategories = userCategoryMap.get(unameLower) || [];
                        const categorySpans = userCategories.map(catId => {
                            const category = allCategories.find(c => c.id === catId);
                            if (!category) return '';
                            return `<span style="background-color: ${category.color}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-right: 4px; display: inline-block;">${category.name}</span>`;
                        }).join('');

                        const getStatusStyle = (status, type) => {
                            if (status === 'Sim') {
                                const colors = {
                                    muted: { bg: '#e74c3c', text: 'white' },
                                    closeFriend: { bg: '#2ecc71', text: 'white' },
                                    storyHidden: { bg: '#f39c12', text: 'white' }
                                };
                                return `background-color: ${colors[type].bg}; color: ${colors[type].text};`;
                            }
                            if (status === 'Não') {
                                return 'background-color: #ecf0f1; color: #7f8c8d;';
                            }
                            return '';
                        };

                        const cleanUser = unameLower;
                        const userInteractions = seguindoInteracoesCache.get(cleanUser);
                        const isSubrowOpen = activeInteracoesSubrows.has(cleanUser);

                        let btnInteracoesHtml = '';
                        if (userInteractions) {
                            btnInteracoesHtml = `
                                <button class="btn-seguindo-interacoes" data-username="${uname}" data-userid="${userObj.id || ''}" style="background: ${userInteractions.total > 0 ? '#e74c3c' : '#7f8c8d'}; color: white; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer;">
                                    <span>${userInteractions.total > 0 ? `❤️ ${userInteractions.total}` : '0'}</span>
                                </button>
                            `;
                        } else {
                            btnInteracoesHtml = `
                                <button class="btn-seguindo-interacoes" data-username="${uname}" data-userid="${userObj.id || ''}" style="background: #0095f6; color: white; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer;">
                                    <span>🔍 Interações</span>
                                </button>
                            `;
                        }

                        tableHtml += `
                            <tr style="border-bottom: 1px solid #dbdbdb;" data-username="${uname}">
                                <td style="padding: 6px 4px; text-align: center;"><input type="checkbox" class="user-checkbox" data-username="${uname}" style="cursor: pointer;" ${isChecked ? 'checked' : ''}></td>
                                <td style="padding: 6px 6px;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <img src="${photoUrl || DEFAULT_AVATAR}" onerror="this.onerror=null; this.src=DEFAULT_AVATAR;" alt="${uname}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; flex-shrink: 0;">
                                        <div style="display:flex; flex-direction:column; overflow: hidden; max-width: 140px;">
                                            <div style="display:flex; align-items:center; gap:4px; overflow: hidden;">
                                                <a href="https://www.instagram.com/${uname}" target="_blank" style="text-decoration:none; color:inherit; font-weight:600; font-size:13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${uname}</a>
                                                ${loadSettings().validateProfileStatus ? `<span class="seguindo-privacy-badge" data-username="${uname}"></span>` : ''}
                                            </div>
                                            ${mutedDetailText ? `<span class="muted-detail-label" style="font-size:10px; color:gray; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${mutedDetailText}">${mutedDetailText}</span>` : `<span class="muted-detail-label" style="display:none; font-size:10px; color:gray; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></span>`}
                                        </div>
                                    </div>
                                </td>
                                <td style="text-align: center; padding: 6px 4px;">
                                    <button class="btn-toggle-status" data-type="muted" data-username="${uname}" data-userid="${userObj.id || ''}" data-current="${isMutedSimple}" title="Clique para alternar Silenciado" style="padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); cursor: pointer; font-weight: bold; font-size: 11px; transition: all 0.2s; ${getStatusStyle(isMutedSimple, 'muted')}">
                                        ${isMutedSimple}
                                    </button>
                                </td>
                                <td style="text-align: center; padding: 6px 4px;">
                                    <button class="btn-toggle-status" data-type="closeFriends" data-username="${uname}" data-userid="${userObj.id || ''}" data-current="${isCloseFriend}" title="Clique para alternar Melhores Amigos" style="padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); cursor: pointer; font-weight: bold; font-size: 11px; transition: all 0.2s; ${getStatusStyle(isCloseFriend, 'closeFriend')}">
                                        ${isCloseFriend}
                                    </button>
                                </td>
                                <td style="text-align: center; padding: 6px 4px;">
                                    <button class="btn-toggle-status" data-type="hiddenStory" data-username="${uname}" data-userid="${userObj.id || ''}" data-current="${isStoryHidden}" title="Clique para alternar Ocultar Stories" style="padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); cursor: pointer; font-weight: bold; font-size: 11px; transition: all 0.2s; ${getStatusStyle(isStoryHidden, 'storyHidden')}">
                                        ${isStoryHidden}
                                    </button>
                                </td>
                                <td style="text-align: center; padding: 6px 4px; font-size: 12px;">${userObj.followers !== undefined ? userObj.followers.toLocaleString() : '-'}</td>
                                <td style="text-align: center; padding: 6px 4px; font-size: 12px;">${userObj.following !== undefined ? userObj.following.toLocaleString() : '-'}</td>
                                <td style="text-align: center; padding: 6px 4px; font-size: 12px;">${userObj.following > userObj.followers ? '<span style="color:#e74c3c;font-weight:bold;">Unfollow</span>' : '-'}</td>
                                <td style="padding: 6px 6px; min-width: 90px;">${categorySpans}</td>
                                <td style="text-align: center; padding: 6px 6px;">${btnInteracoesHtml}</td>
                            </tr>
                            <tr class="subrow-interacoes" id="subrow-interacoes-${cleanUser}" style="display: ${isSubrowOpen ? 'table-row' : 'none'}; background: rgba(0, 149, 246, 0.04);">
                                <td colspan="10" style="padding: 10px 14px;">
                                    <div id="subrow-content-${cleanUser}"></div>
                                </td>
                            </tr>
                        `;
                    });
                }
                tableHtml += `</tbody></table>`;

                const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
                let paginationHtml = `<div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:20px;">`;
                if (page > 1) paginationHtml += `<button id="prevPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; cursor: pointer;">Anterior</button>`;
                paginationHtml += `<span>Página ${page} de ${totalPages || 1}</span>`;
                if (page < totalPages) paginationHtml += `<button id="nextPageBtn" style="padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; cursor: pointer;">Próximo</button>`;
                paginationHtml += `</div>`;

                container.innerHTML = tableHtml + paginationHtml;

                // Adiciona eventos de clique para ordenação nos cabeçalhos
                container.querySelectorAll('th[data-sort-key]').forEach(th => {
                    th.addEventListener('click', () => {
                        const key = th.dataset.sortKey;
                        if (sortConfig.key === key) {
                            sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
                        } else {
                            sortConfig.key = key;
                            sortConfig.direction = (key === 'followers' || key === 'following') ? 'descending' : 'ascending';
                        }
                        currentPage = 1;
                        renderList(1);
                    });
                });

                const prevBtn = document.getElementById("prevPageBtn");
                if (prevBtn) prevBtn.onclick = () => renderList(--currentPage);
                const nextBtn = document.getElementById("nextPageBtn");
                if (nextBtn) nextBtn.onclick = () => renderList(++currentPage);

                document.querySelectorAll('#seguindoModal .user-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const uname = e.target.dataset.username;
                        if (e.target.checked) selectedUsers.add(uname);
                        else selectedUsers.delete(uname);
                        if (document.getElementById('seguindoSelectedCount')) document.getElementById('seguindoSelectedCount').innerText = `(${selectedUsers.size} selecionados)`;
                    });
                });

                const selectAllCheckbox = document.getElementById('selectAllCheckbox');
                if (selectAllCheckbox) {
                    selectAllCheckbox.addEventListener('change', (e) => {
                        const isChecked = e.target.checked;
                        document.querySelectorAll('#tabelaSeguindoContainer .user-checkbox').forEach(checkbox => {
                            checkbox.checked = isChecked;
                            const uname = checkbox.dataset.username;
                            if (isChecked) selectedUsers.add(uname);
                            else selectedUsers.delete(uname);
                        });
                        if (document.getElementById('seguindoSelectedCount')) document.getElementById('seguindoSelectedCount').innerText = `(${selectedUsers.size} selecionados)`;
                    });
                }

                const searchInput = document.getElementById("seguindoSearchInput");
                searchInput.oninput = () => {
                    currentPage = 1;
                    renderList(1);
                };

                const filterSelect = document.getElementById("seguindoFilterSelect");
                filterSelect.onchange = () => {
                    currentPage = 1;
                    renderList(1);
                };

                // Popula dinamicamente as categorias no filtro
                Array.from(filterSelect.options).forEach(opt => {
                    if (opt.value.startsWith('category_') || opt.value === 'no_categories') opt.remove();
                });
                if (allCategories && allCategories.length > 0) {
                    allCategories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = `category_${cat.id}`;
                        option.textContent = `Categoria: ${cat.name}`;
                        filterSelect.appendChild(option);
                    });
                } else {
                    const option = document.createElement('option');
                    option.value = `no_categories`;
                    option.textContent = `Nenhuma categoria`;
                    option.disabled = true;
                    filterSelect.appendChild(option);
                }
                // Restaura o valor do filtro selecionado
                filterSelect.value = filterValue;

                // Botões de Interações
                document.querySelectorAll('#seguindoModal .btn-seguindo-interacoes').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const uname = btn.dataset.username;
                        const explicitUid = btn.dataset.userid || null;
                        if (!uname) return;
                        const cleanUser = uname.toLowerCase();
                        const subrow = document.getElementById(`subrow-interacoes-${cleanUser}`);
                        const contentDiv = document.getElementById(`subrow-content-${cleanUser}`);
                        if (!subrow || !contentDiv) return;

                        if (subrow.style.display !== 'none') {
                            subrow.style.display = 'none';
                            activeInteracoesSubrows.delete(cleanUser);
                            return;
                        }

                        subrow.style.display = 'table-row';
                        activeInteracoesSubrows.add(cleanUser);

                        if (seguindoInteracoesCache.has(cleanUser)) {
                            renderSubrowInteracoesContent(uname, seguindoInteracoesCache.get(cleanUser), contentDiv, btn);
                        } else {
                            btn.disabled = true;
                            contentDiv.innerHTML = `<div style="text-align:center;padding:12px;">Buscando interações de @${uname}...</div>`;
                            const data = await fetchUserInteractionsData(cleanUser, explicitUid, (msg) => {
                                contentDiv.innerHTML = `<div style="text-align:center;padding:12px;">${msg}</div>`;
                            });
                            seguindoInteracoesCache.set(cleanUser, data);
                            btn.disabled = false;
                            btn.innerHTML = `<span>${data.total > 0 ? `❤️ ${data.total}` : '0'}</span>`;
                            btn.style.background = data.total > 0 ? '#e74c3c' : '#7f8c8d';
                            renderSubrowInteracoesContent(uname, data, contentDiv, btn);
                        }
                    });
                });

                // Botões de alternância rápida de status individual (Silenciado, Melhores Amigos, Ocultar Stories)
                document.querySelectorAll('#seguindoModal .btn-toggle-status').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const type = btn.dataset.type;
                        const uname = btn.dataset.username;
                        const explicitUid = btn.dataset.userid || null;
                        const current = btn.dataset.current;
                        if (!uname || !type) return;

                        const unameLower = uname.toLowerCase();
                        let uid = explicitUid || null;
                        if (!uid && typeof seguindoList !== 'undefined' && Array.isArray(seguindoList)) {
                            const found = seguindoList.find(x => (typeof x === 'object' ? x?.username : x)?.toLowerCase() === unameLower);
                            if (found && (found.id || found.pk)) uid = String(found.id || found.pk);
                        }
                        if (!uid) uid = getCachedUserId(uname) || (await getUserId(uname));
                        if (!uid) {
                            showToast(`⚠️ Não foi possível obter o ID de @${uname}.`);
                            return;
                        }

                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        const originalText = btn.textContent;
                        btn.textContent = '...';

                        try {
                            const isCurrentlyActive = current === 'Sim';

                            if (type === 'muted') {
                                const action = isCurrentlyActive ? 'unmute' : 'mute';
                                const resStories = await executeGraphqlMute(uid, 'stories', action);
                                const resPosts = await executeGraphqlMute(uid, 'posts', action);
                                const isSuccess = resStories?.success || resPosts?.success;

                                if (isSuccess) {
                                    if (action === 'mute') {
                                        userListCache.muted.add(uname);
                                        userListCache.muted.add(unameLower);
                                        if (userListCache.mutedDetails) {
                                            userListCache.mutedDetails.set(uname, 'Stories e Publicações');
                                            userListCache.mutedDetails.set(unameLower, 'Stories e Publicações');
                                        }
                                    } else {
                                        userListCache.muted.delete(uname);
                                        userListCache.muted.delete(unameLower);
                                        for (const item of userListCache.muted) {
                                            if (typeof item === 'string' && item.toLowerCase() === unameLower) {
                                                userListCache.muted.delete(item);
                                            }
                                        }
                                        if (userListCache.mutedDetails) {
                                            userListCache.mutedDetails.delete(uname);
                                            userListCache.mutedDetails.delete(unameLower);
                                        }
                                    }
                                    try {
                                        let cachedMuted = JSON.parse(localStorage.getItem('ig_tools_cached_muted') || '[]');
                                        if (action === 'mute') {
                                            if (!cachedMuted.some(u => (u.username || '').toLowerCase() === unameLower)) {
                                                cachedMuted.push({ username: uname, isMuted: true, status: 'Stories e Publicações' });
                                            }
                                        } else {
                                            cachedMuted = cachedMuted.filter(u => (u.username || '').toLowerCase() !== unameLower);
                                        }
                                        localStorage.setItem('ig_tools_cached_muted', JSON.stringify(cachedMuted));
                                        await dbHelper.saveCache('muted', Array.from(userListCache.muted));
                                    } catch (_) { }

                                    const newStatus = action === 'mute' ? 'Sim' : 'Não';
                                    btn.dataset.current = newStatus;
                                    btn.textContent = newStatus;
                                    btn.style.backgroundColor = newStatus === 'Sim' ? '#e74c3c' : '#ecf0f1';
                                    btn.style.color = newStatus === 'Sim' ? 'white' : '#7f8c8d';

                                    const userRow = document.querySelector(`tr[data-username="${uname}"]`);
                                    const detailSpan = userRow?.querySelector('.muted-detail-label');
                                    if (detailSpan) {
                                        detailSpan.textContent = action === 'mute' ? '(Stories e Publicações)' : '';
                                        detailSpan.style.display = action === 'mute' ? '' : 'none';
                                    }

                                    showToast(`🔇 @${uname} ${action === 'mute' ? 'silenciado(a)' : 'reativado(a)'}!`);
                                } else {
                                    throw new Error("Falha na chamada da API");
                                }
                            } else if (type === 'closeFriends') {
                                const isRemove = isCurrentlyActive;
                                const res = await executeGraphqlSetBesties(isRemove ? [] : [uid], isRemove ? [uid] : []);
                                if (res?.success) {
                                    if (isRemove) {
                                        userListCache.closeFriends.delete(uname);
                                        userListCache.closeFriends.delete(unameLower);
                                        for (const item of userListCache.closeFriends) {
                                            if (typeof item === 'string' && item.toLowerCase() === unameLower) {
                                                userListCache.closeFriends.delete(item);
                                            }
                                        }
                                    } else {
                                        userListCache.closeFriends.add(uname);
                                        userListCache.closeFriends.add(unameLower);
                                    }
                                    try {
                                        let cachedCF = JSON.parse(localStorage.getItem('ig_tools_cached_close_friends') || '[]');
                                        if (!isRemove) {
                                            if (!cachedCF.some(u => (typeof u === 'string' ? u : u.username || '').toLowerCase() === unameLower)) cachedCF.push(uname);
                                        } else {
                                            cachedCF = cachedCF.filter(u => (typeof u === 'string' ? u : u.username || '').toLowerCase() !== unameLower);
                                        }
                                        localStorage.setItem('ig_tools_cached_close_friends', JSON.stringify(cachedCF));
                                        await dbHelper.saveCache('closeFriends', Array.from(userListCache.closeFriends));
                                    } catch (_) { }

                                    const newStatus = isRemove ? 'Não' : 'Sim';
                                    btn.dataset.current = newStatus;
                                    btn.textContent = newStatus;
                                    btn.style.backgroundColor = newStatus === 'Sim' ? '#2ecc71' : '#ecf0f1';
                                    btn.style.color = newStatus === 'Sim' ? 'white' : '#7f8c8d';
                                    showToast(`🌟 @${uname} ${isRemove ? 'removido(a) de' : 'adicionado(a) a'} Melhores Amigos!`);
                                } else {
                                    throw new Error("Falha na chamada da API");
                                }
                            } else if (type === 'hiddenStory') {
                                const action = isCurrentlyActive ? 'unhide' : 'hide';
                                const res = await executeWbloksHideStory(uid, uname, action);
                                if (res?.success) {
                                    if (action === 'hide') {
                                        userListCache.hiddenStory.add(uname);
                                        userListCache.hiddenStory.add(unameLower);
                                    } else {
                                        userListCache.hiddenStory.delete(uname);
                                        userListCache.hiddenStory.delete(unameLower);
                                        for (const item of userListCache.hiddenStory) {
                                            if (typeof item === 'string' && item.toLowerCase() === unameLower) {
                                                userListCache.hiddenStory.delete(item);
                                            }
                                        }
                                    }
                                    try {
                                        let cachedHide = JSON.parse(localStorage.getItem('ig_tools_cached_hide_story') || '[]');
                                        if (action === 'hide') {
                                            if (!cachedHide.some(u => (typeof u === 'string' ? u : u.username || '').toLowerCase() === unameLower)) cachedHide.push(uname);
                                        } else {
                                            cachedHide = cachedHide.filter(u => (typeof u === 'string' ? u : u.username || '').toLowerCase() !== unameLower);
                                        }
                                        localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(cachedHide));
                                        await dbHelper.saveCache('hiddenStory', Array.from(userListCache.hiddenStory));
                                    } catch (_) { }

                                    const newStatus = action === 'hide' ? 'Sim' : 'Não';
                                    btn.dataset.current = newStatus;
                                    btn.textContent = newStatus;
                                    btn.style.backgroundColor = newStatus === 'Sim' ? '#f39c12' : '#ecf0f1';
                                    btn.style.color = newStatus === 'Sim' ? 'white' : '#7f8c8d';
                                    showToast(`👁️ Stories ${action === 'hide' ? 'ocultados para' : 'desocultados para'} @${uname}!`);
                                } else {
                                    throw new Error("Falha na chamada da API");
                                }
                            }
                        } catch (err) {
                            console.error("[IG Tools] Erro ao alternar status:", err);
                            btn.textContent = originalText;
                            showToast(`❌ Erro ao alterar status de @${uname}.`);
                        } finally {
                            btn.disabled = false;
                            btn.style.opacity = '1';
                        }
                    });
                });
            };

            const updateLocalState = async (users, dbStore) => {
                if (dbStore === 'following') {
                    const lowerUsers = users.map(u => (typeof u === 'string' ? u : u.username).toLowerCase());
                    seguindoList = seguindoList.filter(user => {
                        const uName = (typeof user === 'object' ? user?.username : user) || '';
                        return !lowerUsers.includes(uName.toLowerCase());
                    });
                    await dbHelper.saveCache('following', seguindoList);
                    if (statusDiv) statusDiv.innerText = `Total: ${seguindoList.length} perfis seguidos.`;
                }
                allCategories = await dbHelper.loadCategories();
                userCategoryMap = await dbHelper.loadAllUserCategories();
                renderList(currentPage);
                selectedUsers.clear();
                if (document.getElementById('seguindoSelectedCount')) {
                    document.getElementById('seguindoSelectedCount').innerText = `(0 selecionados)`;
                }
            };

            const getFollowersAndFollowing = async (username, existingId = null) => {
                let uid = existingId || getCachedUserId(username);
                if (!uid && typeof seguindoList !== 'undefined' && Array.isArray(seguindoList)) {
                    const item = seguindoList.find(x => (typeof x === 'object' ? x?.username : x)?.toLowerCase() === username.toLowerCase());
                    if (item && typeof item === 'object') {
                        const foundId = item.id || item.pk || item.pk_id;
                        if (foundId) {
                            uid = String(foundId);
                            setCachedUserId(username, uid);
                        }
                    }
                }
                if (!uid) {
                    uid = await getUserId(username);
                }

                if (uid) {
                    const graphqlStats = await executeGraphqlUserHoverCard(uid);
                    if (graphqlStats) return graphqlStats;
                }

                const info = await safeFetchProfileInfo(username);
                if (info && info.data?.user && info.data.user.edge_followed_by?.count !== undefined) {
                    return {
                        followers: info.data.user.edge_followed_by?.count || 0,
                        following: info.data.user.edge_follow?.count || 0
                    };
                }
                return null;
            };

            const loadStatsBtn = document.getElementById('loadStatsSeguindoBtn');
            if (loadStatsBtn) {
                loadStatsBtn.onclick = async () => {
                    loadStatsBtn.disabled = true;
                    const originalText = loadStatsBtn.textContent;
                    loadStatsBtn.textContent = 'Carregando...';

                    for (let i = 0; i < currentPaginatedUsers.length; i++) {
                        if (processoCancelado) break;
                        const user = currentPaginatedUsers[i];

                        loadStatsBtn.textContent = `Carregando (${i + 1}/${currentPaginatedUsers.length})...`;
                        const stats = await getFollowersAndFollowing(user.username, user.id || user.pk);
                        if (stats) {
                            user.followers = stats.followers;
                            user.following = stats.following;

                            const mainUser = seguindoList.find(u => (typeof u === 'object' ? u?.username : u)?.toLowerCase() === user.username.toLowerCase());
                            if (mainUser && typeof mainUser === 'object') {
                                mainUser.followers = stats.followers;
                                mainUser.following = stats.following;
                            }

                            const tr = document.querySelector(`tr[data-username="${user.username}"]`);
                            if (tr) {
                                const tds = tr.querySelectorAll('td');
                                if (tds[5]) tds[5].textContent = stats.followers.toLocaleString();
                                if (tds[6]) tds[6].textContent = stats.following.toLocaleString();
                                if (tds[7]) {
                                    if (stats.following > stats.followers) {
                                        tds[7].innerHTML = '<span style="color:#e74c3c;font-weight:bold;">Unfollow</span>';
                                    } else {
                                        tds[7].textContent = '-';
                                    }
                                }
                            }
                        }
                        await new Promise(r => setTimeout(r, 400));
                    }
                    loadStatsBtn.disabled = false;
                    loadStatsBtn.textContent = originalText;
                    try {
                        await dbHelper.saveCache('following', seguindoList);
                    } catch (_) { }
                };
            }

            document.getElementById('unfollowSeguindoBtn').onclick = () => handleActionOnSelected(Array.from(selectedUsers), 'unfollow', updateLocalState);
            document.getElementById('blockSeguindoBtn').onclick = () => handleActionOnSelected(Array.from(selectedUsers), 'block', updateLocalState);
            document.getElementById('executarSeguindoBtn').onclick = () => abrirModalExecutarSeguindo(Array.from(selectedUsers), updateLocalState, userListCache, seguindoList);

            renderList(currentPage);
        }

        carregarSeguindo();
    }

    /**
     * 3. MODAL DE AÇÕES EM MASSA PARA SEGUINDO
     */
    async function abrirModalExecutarSeguindo(selectedUsernames, updateCallback, userListCacheParam = null, seguindoListParam = null) {
        if (!selectedUsernames || selectedUsernames.length === 0) return alert("Selecione pelo menos um usuário na tabela.");
        if (document.getElementById("executarModal")) return;

        const dbHelper = getDbHelper();
        const userListCache = userListCacheParam || getUserListCache();
        const categories = await dbHelper.loadCategories();

        const execDiv = document.createElement("div");
        execDiv.id = "executarModal";
        execDiv.className = "submenu-modal";
        execDiv.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 400px; border: 1px solid #ccc; border-radius: 10px; z-index: 10002; max-height: 80vh; overflow-y: auto; padding: 20px;`;
        if (loadSettings().rgbBorder) execDiv.classList.add('rgb-border-effect');

        execDiv.innerHTML = `
            <div class="modal-header" style="margin: -20px -20px 20px -20px;">
                <span class="modal-title">Executar Ações (${selectedUsernames.length})</span>
                <div class="modal-controls"><button id="fecharExecutarBtn">X</button></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div class="toggle-item"><span>🔇 Silenciar</span><label class="switch"><input type="checkbox" id="execMuteToggle"><span class="slider"></span></label></div>
                <div id="muteSubOptions" style="display: none; margin-left: 20px; flex-direction: column; gap: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                    <div style="display: flex; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="muteAction" value="mute" checked> Silenciar</label>
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="muteAction" value="unmute"> Reativar Som</label>
                    </div>
                    <div class="toggle-item" style="background: transparent; border: none; padding: 0;"><span style="font-size: 14px;">Stories</span><label class="switch"><input type="checkbox" id="execMuteStories" checked><span class="slider"></span></label></div>
                    <div class="toggle-item" style="background: transparent; border: none; padding: 0;"><span style="font-size: 14px;">Publicações</span><label class="switch"><input type="checkbox" id="execMutePosts" checked><span class="slider"></span></label></div>
                </div>
                <div class="toggle-item"><span>🌟 Melhores Amigos</span><label class="switch"><input type="checkbox" id="execCFToggle"><span class="slider"></span></label></div>
                <div id="cfSubOptions" style="display: none; margin-left: 20px; flex-direction: column; gap: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                    <div style="display: flex; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="cfAction" value="add" checked> Adicionar</label>
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="cfAction" value="remove"> Remover</label>
                    </div>
                </div>
                <div class="toggle-item"><span>👁️ Ocultar Story</span><label class="switch"><input type="checkbox" id="execHideToggle"><span class="slider"></span></label></div>
                <div id="hideSubOptions" style="display: none; margin-left: 20px; flex-direction: column; gap: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                    <div style="display: flex; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="hideAction" value="hide" checked> Ocultar</label>
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="hideAction" value="unhide"> Desocultar</label>
                    </div>
                </div>
                <div class="toggle-item"><span>📁 Categorias</span><label class="switch"><input type="checkbox" id="execCatToggle"><span class="slider"></span></label></div>
                <div id="catSubOptions" style="display: none; margin-left: 20px; flex-direction: column; gap: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="catAction" value="add" checked> Adicionar</label>
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="catAction" value="remove"> Remover</label>
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="radio" name="catAction" value="replace"> Substituir</label>
                    </div>
                    <div style="max-height: 150px; overflow-y: auto; border: 1px solid #eee; padding: 5px; border-radius: 5px;">
                        ${categories.length === 0 ? '<p style="font-size: 12px; color: gray;">Nenhuma categoria cadastrada.</p>' :
                categories.map(cat => `<div class="toggle-item" style="background: transparent; border: none; padding: 0;"><div style="display: flex; align-items: center; gap: 5px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: ${cat.color};"></span><span style="font-size: 14px;">${cat.name}</span></div><label class="switch"><input type="checkbox" class="execCatItem" value="${cat.id}"><span class="slider"></span></label></div>`).join('')
            }
                    </div>
                </div>
                <button id="aplicarExecutarBtn" style="margin-top: 10px; background: #3498db; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Aplicar Ações</button>
            </div>
        `;
        document.body.appendChild(execDiv);

        document.getElementById('execMuteToggle').onchange = (e) => document.getElementById('muteSubOptions').style.display = e.target.checked ? 'flex' : 'none';
        document.getElementById('execCFToggle').onchange = (e) => document.getElementById('cfSubOptions').style.display = e.target.checked ? 'flex' : 'none';
        document.getElementById('execHideToggle').onchange = (e) => document.getElementById('hideSubOptions').style.display = e.target.checked ? 'flex' : 'none';
        document.getElementById('execCatToggle').onchange = (e) => document.getElementById('catSubOptions').style.display = e.target.checked ? 'flex' : 'none';
        document.getElementById('fecharExecutarBtn').onclick = () => execDiv.remove();

        document.getElementById('aplicarExecutarBtn').onclick = async () => {
            const doMute = document.getElementById('execMuteToggle').checked;
            const doCF = document.getElementById('execCFToggle').checked;
            const doHide = document.getElementById('execHideToggle').checked;
            const doCat = document.getElementById('execCatToggle').checked;
            const cfAction = execDiv.querySelector('input[name="cfAction"]:checked')?.value || 'add';
            const muteAction = execDiv.querySelector('input[name="muteAction"]:checked')?.value || 'mute';
            const hideAction = execDiv.querySelector('input[name="hideAction"]:checked')?.value || 'hide';
            const catAction = execDiv.querySelector('input[name="catAction"]:checked')?.value || 'add';

            if (!doMute && !doCF && !doHide && !doCat) return alert("Selecione pelo menos uma ação.");

            const muteType = (document.getElementById('execMuteStories').checked && document.getElementById('execMutePosts').checked) ? 'all' : (document.getElementById('execMuteStories').checked ? 'stories' : 'posts');
            const selectedCats = Array.from(execDiv.querySelectorAll('.execCatItem:checked')).map(i => i.value);
            execDiv.remove();

            toggleLoading(true, 0, "Executando ações...");
            try {
                if (doCat) {
                    let allUserCategories = await dbHelper.loadAllUserCategories();
                    for (const u of selectedUsernames) {
                        const lowerUsername = u.toLowerCase();
                        const existing = allUserCategories.get(lowerUsername) || [];
                        let updated = existing;
                        if (catAction === 'add') updated = Array.from(new Set([...existing, ...selectedCats]));
                        else if (catAction === 'remove') updated = existing.filter(cid => !selectedCats.includes(cid));
                        else if (catAction === 'replace') updated = selectedCats;
                        allUserCategories.set(lowerUsername, updated);
                    }
                    await dbHelper.saveAllUserCategories(allUserCategories);
                }

                if (doMute) {
                    await new Promise(resolve => unmuteUsers(selectedUsernames, resolve, muteAction, muteType));
                    if (!userListCache.muted) userListCache.muted = new Set();
                    if (!userListCache.mutedDetails) userListCache.mutedDetails = new Map();

                    const statusStr = muteType === 'all' ? 'Stories e Publicações' : (muteType === 'stories' ? 'Stories' : 'Publicações');
                    selectedUsernames.forEach(u => {
                        const uLower = u.toLowerCase();
                        if (muteAction === 'unmute') {
                            userListCache.muted.delete(u);
                            userListCache.muted.delete(uLower);
                            userListCache.mutedDetails.delete(u);
                            userListCache.mutedDetails.delete(uLower);
                        } else {
                            userListCache.muted.add(u);
                            userListCache.muted.add(uLower);
                            userListCache.mutedDetails.set(u, statusStr);
                            userListCache.mutedDetails.set(uLower, statusStr);
                        }
                    });

                    try {
                        let cachedMuted = JSON.parse(localStorage.getItem('ig_tools_cached_muted') || '[]');
                        selectedUsernames.forEach(u => {
                            const uLower = u.toLowerCase();
                            if (muteAction === 'unmute') {
                                cachedMuted = cachedMuted.filter(item => (item.username || '').toLowerCase() !== uLower);
                            } else {
                                const existing = cachedMuted.find(item => (item.username || '').toLowerCase() === uLower);
                                if (existing) {
                                    existing.isMuted = true;
                                    existing.status = statusStr;
                                } else {
                                    cachedMuted.push({ username: u, isMuted: true, status: statusStr });
                                }
                            }
                        });
                        localStorage.setItem('ig_tools_cached_muted', JSON.stringify(cachedMuted));
                        await dbHelper.saveCache('muted', Array.from(userListCache.muted));
                    } catch (_) { }
                }

                const getTargetUid = async (u) => {
                    const uLower = u.toLowerCase();
                    if (seguindoListParam && Array.isArray(seguindoListParam)) {
                        const found = seguindoListParam.find(x => (typeof x === 'object' ? x?.username : x)?.toLowerCase() === uLower);
                        if (found && (found.id || found.pk)) return String(found.id || found.pk);
                    }
                    return getCachedUserId(u) || (await getUserId(u));
                };

                if (doCF) {
                    if (loadSettings().useApi) {
                        const adds = [];
                        const removes = [];
                        for (const u of selectedUsernames) {
                            const uid = await getTargetUid(u);
                            if (uid) {
                                if (cfAction === 'remove') removes.push(String(uid));
                                else adds.push(String(uid));
                            }
                        }
                        if (adds.length > 0 || removes.length > 0) {
                            const res = await executeGraphqlSetBesties(adds, removes);
                            if (res?.success) {
                                if (!userListCache.closeFriends) userListCache.closeFriends = new Set();
                                selectedUsernames.forEach(u => {
                                    const uLower = u.toLowerCase();
                                    if (cfAction === 'remove') {
                                        userListCache.closeFriends.delete(u);
                                        userListCache.closeFriends.delete(uLower);
                                        for (const item of userListCache.closeFriends) {
                                            if (typeof item === 'string' && item.toLowerCase() === uLower) {
                                                userListCache.closeFriends.delete(item);
                                            }
                                        }
                                    } else {
                                        userListCache.closeFriends.add(u);
                                        userListCache.closeFriends.add(uLower);
                                    }
                                });
                                try {
                                    let cachedCF = JSON.parse(localStorage.getItem('ig_tools_cached_close_friends') || '[]');
                                    selectedUsernames.forEach(u => {
                                        const uLower = u.toLowerCase();
                                        if (cfAction === 'remove') {
                                            cachedCF = cachedCF.filter(item => (typeof item === 'string' ? item : item.username || '').toLowerCase() !== uLower);
                                        } else {
                                            if (!cachedCF.some(item => (typeof item === 'string' ? item : item.username || '').toLowerCase() === uLower)) cachedCF.push(u);
                                        }
                                    });
                                    localStorage.setItem('ig_tools_cached_close_friends', JSON.stringify(cachedCF));
                                } catch (_) { }
                                await dbHelper.saveCache('closeFriends', Array.from(userListCache.closeFriends));
                                showToast(`🌟 Melhores Amigos: ${cfAction === 'remove' ? 'removido(s)' : 'adicionado(s)'}!`);
                            }
                        }
                    } else {
                        await toggleListMembership(selectedUsernames, '/accounts/close_friends/', 'closeFriends', () => { });
                    }
                }

                if (doHide) {
                    if (loadSettings().useApi) {
                        for (const u of selectedUsernames) {
                            const uid = await getTargetUid(u);
                            if (uid) {
                                const res = await executeWbloksHideStory(uid, u, hideAction);
                                if (res?.success) {
                                    if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                                    const uLower = u.toLowerCase();
                                    if (hideAction === 'unhide') {
                                        userListCache.hiddenStory.delete(u);
                                        userListCache.hiddenStory.delete(uLower);
                                        for (const item of userListCache.hiddenStory) {
                                            if (typeof item === 'string' && item.toLowerCase() === uLower) {
                                                userListCache.hiddenStory.delete(item);
                                            }
                                        }
                                    } else {
                                        userListCache.hiddenStory.add(u);
                                        userListCache.hiddenStory.add(uLower);
                                    }
                                }
                            }
                            await new Promise(r => setTimeout(r, loadSettings().requestDelay || 400));
                        }
                        if (userListCache.hiddenStory) {
                            try {
                                let cachedHide = JSON.parse(localStorage.getItem('ig_tools_cached_hide_story') || '[]');
                                selectedUsernames.forEach(u => {
                                    const uLower = u.toLowerCase();
                                    if (hideAction === 'unhide') {
                                        cachedHide = cachedHide.filter(item => (typeof item === 'string' ? item : item.username || '').toLowerCase() !== uLower);
                                    } else {
                                        if (!cachedHide.some(item => (typeof item === 'string' ? item : item.username || '').toLowerCase() === uLower)) cachedHide.push(u);
                                    }
                                });
                                localStorage.setItem('ig_tools_cached_hide_story', JSON.stringify(cachedHide));
                            } catch (_) { }
                            await dbHelper.saveCache('hiddenStory', Array.from(userListCache.hiddenStory));
                        }
                        showToast(`👁️ Stories: ${hideAction === 'unhide' ? 'desocultado(s)' : 'ocultado(s)'}!`);
                    } else {
                        await toggleListMembership(selectedUsernames, '/accounts/hide_story_and_live_from/', 'hiddenStory', () => { });
                    }
                }
            } finally {
                toggleLoading(false);
            }

            // Atualização visual imediata das linhas na tabela aberta
            selectedUsernames.forEach(u => {
                const uLower = u.toLowerCase();
                const row = document.querySelector(`tr[data-username="${u}"]`) || Array.from(document.querySelectorAll('#seguindoModal tr[data-username]')).find(tr => tr.dataset.username?.toLowerCase() === uLower);
                if (row) {
                    if (doCF) {
                        const cfBtn = row.querySelector('.btn-toggle-status[data-type="closeFriends"]');
                        if (cfBtn) {
                            const newCF = cfAction === 'remove' ? 'Não' : 'Sim';
                            cfBtn.dataset.current = newCF;
                            cfBtn.textContent = newCF;
                            cfBtn.style.backgroundColor = newCF === 'Sim' ? '#2ecc71' : '#ecf0f1';
                            cfBtn.style.color = newCF === 'Sim' ? 'white' : '#7f8c8d';
                        }
                    }
                    if (doMute) {
                        const muteBtn = row.querySelector('.btn-toggle-status[data-type="muted"]');
                        if (muteBtn) {
                            const newMute = muteAction === 'unmute' ? 'Não' : 'Sim';
                            muteBtn.dataset.current = newMute;
                            muteBtn.textContent = newMute;
                            muteBtn.style.backgroundColor = newMute === 'Sim' ? '#e74c3c' : '#ecf0f1';
                            muteBtn.style.color = newMute === 'Sim' ? 'white' : '#7f8c8d';
                        }
                        const detailSpan = row.querySelector('.muted-detail-label');
                        if (detailSpan) {
                            const statusStr = muteType === 'all' ? '(Stories e Publicações)' : (muteType === 'stories' ? '(Stories)' : '(Publicações)');
                            detailSpan.textContent = muteAction === 'unmute' ? '' : statusStr;
                            detailSpan.style.display = muteAction === 'unmute' ? 'none' : '';
                        }
                    }
                    if (doHide) {
                        const hideBtn = row.querySelector('.btn-toggle-status[data-type="hiddenStory"]');
                        if (hideBtn) {
                            const newHide = hideAction === 'unhide' ? 'Não' : 'Sim';
                            hideBtn.dataset.current = newHide;
                            hideBtn.textContent = newHide;
                            hideBtn.style.backgroundColor = newHide === 'Sim' ? '#f39c12' : '#ecf0f1';
                            hideBtn.style.color = newHide === 'Sim' ? 'white' : '#7f8c8d';
                        }
                    }
                }
            });

            if (updateCallback) await updateCallback(selectedUsernames, 'exec');
            showToast("Ações concluídas!");
        };
    }

    /**
     * 4. MODAL DE OPÇÕES DE ATUALIZAÇÃO (Melhores Amigos, Stories, Silenciados, Seguindo)
     */
    function showUpdateOptionsModal() {
        const div = document.createElement("div");
        div.className = "submenu-modal";
        div.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; padding: 20px; border: 1px solid #ccc; border-radius: 10px; z-index: 2147483648; background: white; color: black; display: flex; flex-direction: column; gap: 10px;`;
        if (loadSettings().rgbBorder) div.classList.add('rgb-border-effect');

        div.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">O que deseja atualizar?</h3>
            <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="chkCloseFriends" checked> Melhores Amigos</label>
            <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="chkHiddenStory" checked> Ocultar Stories</label>
            <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="chkMuted" checked> Contas Silenciadas</label>
            <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="chkFollowing" checked> Lista Seguindo</label>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button id="btnUpdateSelected" style="flex: 1; padding: 8px; background: #0095f6; color: white; border: none; border-radius: 5px; cursor: pointer;">Atualizar</button>
                <button id="btnCancelUpdate" style="flex: 1; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancelar</button>
            </div>
        `;
        document.body.appendChild(div);

        document.getElementById('btnCancelUpdate').onclick = () => div.remove();
        document.getElementById('btnUpdateSelected').onclick = () => {
            const options = {
                closeFriends: document.getElementById('chkCloseFriends').checked,
                hiddenStory: document.getElementById('chkHiddenStory').checked,
                muted: document.getElementById('chkMuted').checked,
                following: document.getElementById('chkFollowing').checked
            };
            div.remove();
            const seguindoModal = document.getElementById("seguindoModal");
            if (seguindoModal) seguindoModal.remove();
            iniciarProcessoSeguindo(options);
        };
    }

    // Exportação do namespace
    window.IGTools.FollowersAnalysis = {
        iniciarProcessoNaoSegueDeVolta,
        iniciarProcessoSeguindo,
        abrirModalExecutarSeguindo,
        showUpdateOptionsModal,
        fetchUserListPolarisGraphQL
    };

    // Aliases globais para retrocompatibilidade
    window.iniciarProcessoNaoSegueDeVolta = iniciarProcessoNaoSegueDeVolta;
    window.iniciarProcessoSeguindo = iniciarProcessoSeguindo;
    window.abrirModalExecutarSeguindo = abrirModalExecutarSeguindo;
    window.showUpdateOptionsModal = showUpdateOptionsModal;

    console.log("[IG Tools] Módulo de Análise de Seguidores carregado com sucesso.");
})();
