/**
 * IG Tools Pro - Módulo de Ações em Massa & Operações de Lista
 * Arquivo: src/features/bulk-actions.js
 * Descrição: Execução em lote de unfollow, bloqueio, silenciamento, melhores amigos,
 * ocultação de stories, navegação humana vs API Polaris e paginação de tabelas.
 */

(function () {
    'use strict';

    window.IGTools = window.IGTools || {};

    const DEFAULT_AVATAR = window.DEFAULT_AVATAR || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%23ccc'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6 0-8 3-8 6v1h16v-1c0-3-2-6-8-6z'/></svg>";

    // Helpers seguros com fallback
    const loadSettings = () => (typeof window.loadSettings === 'function' ? window.loadSettings() : { useApi: true, itemsPerPage: 10, unfollowDelay: 1500, requestDelay: 500 });
    const toggleLoading = (show, progress, text) => { if (typeof window.toggleLoading === 'function') window.toggleLoading(show, progress, text); };
    const showToast = (msg, duration) => { if (typeof window.showToast === 'function') window.showToast(msg, duration); else console.log(`[IGTools Toast]: ${msg}`); };
    const createCancellableProgressBar = () => (typeof window.createCancellableProgressBar === 'function' ? window.createCancellableProgressBar() : { bar: document.createElement('div'), update: () => { }, closeButton: document.createElement('button') });
    const simulateClick = (el) => { if (typeof window.simulateClick === 'function') window.simulateClick(el); else el?.click(); };
    const getCachedUserId = (username) => (typeof window.getCachedUserId === 'function' ? window.getCachedUserId(username) : null);
    const setCachedUserId = (username, id) => { if (typeof window.setCachedUserId === 'function') window.setCachedUserId(username, id); };
    const getUserId = async (username) => (typeof window.getUserId === 'function' ? await window.getUserId(username) : null);

    const getDbHelper = () => window.dbHelper || {
        saveUnfollowHistory: async () => { },
        saveCache: async () => { }
    };

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

    /**
     * Obtém foto do perfil do usuário via HoverCard GraphQL
     */
    async function getProfilePic(username) {
        const uid = getCachedUserId(username);
        if (uid && typeof window.executeGraphqlUserHoverCard === 'function') {
            try {
                const stats = await window.executeGraphqlUserHoverCard(uid);
                if (stats?.profilePicUrl) return stats.profilePicUrl;
            } catch (e) { }
        }
        return DEFAULT_AVATAR;
    }

    /**
     * Executa ação em lote sobre usuários selecionados (mute, closeFriends, hideStory, unfollow, block)
     */
    async function handleActionOnSelected(selectedUsers, actionType, updateCallback) {
        if (!selectedUsers || selectedUsers.length === 0) {
            alert("Nenhum usuário selecionado.");
            return;
        }

        const dbHelper = getDbHelper();
        const userListCache = getUserListCache();

        const actionConfig = {
            mute: {
                buttonId: 'silenciarSeguindoBtn',
                text: 'Silenciar/Reativar',
                dbStore: 'muted',
                func: (users, cb) => {
                    const showUnmuteOptionsModal = window.IGTools?.MutedAccounts?.showUnmuteOptionsModal || window.showUnmuteOptionsModal;
                    const unmuteUsers = window.IGTools?.MutedAccounts?.unmuteUsers || window.unmuteUsers;
                    if (typeof showUnmuteOptionsModal === 'function' && typeof unmuteUsers === 'function') {
                        showUnmuteOptionsModal((targetType) => {
                            unmuteUsers(users, cb, true, targetType);
                        });
                    } else {
                        alert("Módulo de silenciamento não encontrado.");
                        if (cb) cb();
                    }
                }
            },
            closeFriends: {
                buttonId: 'closeFriendsSeguindoBtn',
                text: 'Melhores Amigos',
                dbStore: 'closeFriends',
                func: async (users, cb) => {
                    if (loadSettings().useApi && typeof window.executeGraphqlSetBesties === 'function') {
                        const adds = [];
                        const removes = [];
                        for (const u of users) {
                            const uid = getCachedUserId(u) || await getUserId(u);
                            if (uid) {
                                const isCurrentlyCF = userListCache.closeFriends && userListCache.closeFriends.has(u);
                                if (isCurrentlyCF) removes.push(uid);
                                else adds.push(uid);
                            }
                        }
                        if (adds.length > 0 || removes.length > 0) {
                            const res = await window.executeGraphqlSetBesties(adds, removes);
                            if (res.success) {
                                if (!userListCache.closeFriends) userListCache.closeFriends = new Set();
                                users.forEach(u => {
                                    if (userListCache.closeFriends.has(u)) userListCache.closeFriends.delete(u);
                                    else userListCache.closeFriends.add(u);
                                });
                                await dbHelper.saveCache('closeFriends', Array.from(userListCache.closeFriends));
                            }
                        }
                        if (cb) cb();
                    } else {
                        await toggleListMembership(users, '/accounts/close_friends/', 'closeFriends', cb);
                    }
                }
            },
            hideStory: {
                buttonId: 'hideStorySeguindoBtn',
                text: 'Ocultar Story',
                dbStore: 'hiddenStory',
                func: (users, cb) => toggleListMembership(users, '/accounts/hide_story_and_live_from/', 'hiddenStory', cb)
            },
            unfollow: {
                buttonId: 'unfollowSeguindoBtn',
                text: 'Deixar de Seguir',
                dbStore: 'following',
                func: async (users, cb) => {
                    if (!confirm(`Deixar de seguir ${users.length} usuário(s)?`)) {
                        const b = document.getElementById('unfollowSeguindoBtn');
                        if (b) { b.disabled = false; b.textContent = 'Deixar de Seguir'; }
                        toggleLoading(false);
                        return;
                    }

                    if (loadSettings().useApi && typeof window.executeGraphqlUnfollow === 'function') {
                        const unfollowDelay = loadSettings().unfollowDelay || 1500;
                        for (let i = 0; i < users.length; i++) {
                            const username = users[i];
                            const percent = Math.round(((i + 1) / users.length) * 100);
                            toggleLoading(true, percent, `Deixando de seguir ${username} (${i + 1}/${users.length})...`);

                            let uid = getCachedUserId(username);
                            if (!uid && typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList)) {
                                const item = window.seguindoList.find(x => (typeof x === 'object' ? x?.username : x)?.toLowerCase() === username.toLowerCase());
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

                            if (!uid) {
                                console.warn(`[IG Tools] Não foi possível obter o ID de ${username}`);
                                showToast(`⚠️ ID de ${username} não encontrado`);
                                continue;
                            }

                            try {
                                console.log(`[IG Tools] Enviando unfollow via API para ${username} (UID: ${uid})...`);
                                const apiResult = await window.executeGraphqlUnfollow(uid);
                                console.log(`[IG Tools] Resultado unfollow para ${username}:`, apiResult);

                                if (apiResult.success || apiResult.result?.status === 'ok') {
                                    showToast(`✅ Deixou de seguir ${username}`);

                                    const photoUrl = (typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList))
                                        ? (window.seguindoList.find(u => (typeof u === 'object' ? u?.username : u)?.toLowerCase() === username.toLowerCase())?.photoUrl || null)
                                        : null;

                                    dbHelper.saveUnfollowHistory({
                                        username: username,
                                        id: String(uid),
                                        photoUrl: photoUrl,
                                        unfollowDate: new Date().toISOString()
                                    }).catch(e => console.error("Erro ao salvar no histórico de unfollow:", e));

                                    if (typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList)) {
                                        window.seguindoList = window.seguindoList.filter(u => (typeof u === 'object' ? u?.username : u)?.toLowerCase() !== username.toLowerCase());
                                        await dbHelper.saveCache('following', window.seguindoList).catch(e => console.error(e));
                                    }

                                    const rows = document.querySelectorAll(`tr[data-username="${username}"]`);
                                    rows.forEach(r => r.remove());
                                } else {
                                    console.error(`[IG Tools] Falha no unfollow de ${username}:`, apiResult);
                                    showToast(`❌ Falha ao deixar de seguir ${username}`);
                                }
                            } catch (err) {
                                console.error(`[IG Tools] Erro ao deixar de seguir ${username}:`, err);
                                showToast(`❌ Erro ao deixar de seguir ${username}`);
                            }

                            if (i < users.length - 1) {
                                await new Promise(r => setTimeout(r, unfollowDelay));
                            }
                        }

                        if (cb) await cb();
                    } else {
                        await performActionOnProfile(users, ['Deixar de seguir', 'Unfollow'], cb);
                    }
                }
            },
            block: {
                buttonId: 'blockSeguindoBtn',
                text: 'Bloquear',
                dbStore: 'following',
                func: async (users, cb) => {
                    if (!confirm(`Bloquear ${users.length} usuário(s)? Atenção: o Instagram deixará de seguir e bloqueará estes perfis.`)) {
                        const b = document.getElementById('blockSeguindoBtn');
                        if (b) { b.disabled = false; b.textContent = 'Bloquear'; }
                        toggleLoading(false);
                        return;
                    }

                    if (loadSettings().useApi && typeof window.executeGraphqlBlockMany === 'function') {
                        const blockDelay = loadSettings().unfollowDelay || 1500;
                        for (let i = 0; i < users.length; i++) {
                            const username = users[i];
                            const percent = Math.round(((i + 1) / users.length) * 100);
                            toggleLoading(true, percent, `Bloqueando ${username} (${i + 1}/${users.length})...`);

                            let uid = getCachedUserId(username);
                            if (!uid && typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList)) {
                                const item = window.seguindoList.find(x => (typeof x === 'object' ? x?.username : x)?.toLowerCase() === username.toLowerCase());
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

                            if (!uid) {
                                console.warn(`[IG Tools] Não foi possível obter o ID de ${username}`);
                                showToast(`⚠️ ID de ${username} não encontrado`);
                                continue;
                            }

                            try {
                                console.log(`[IG Tools] Enviando bloqueio via API para ${username} (UID: ${uid})...`);
                                const apiResult = await window.executeGraphqlBlockMany([uid]);
                                console.log(`[IG Tools] Resultado bloqueio para ${username}:`, apiResult);

                                if (apiResult.success || apiResult.result?.status === 'ok') {
                                    showToast(`🚫 Bloqueou ${username}`);

                                    if (typeof window.seguindoList !== 'undefined' && Array.isArray(window.seguindoList)) {
                                        window.seguindoList = window.seguindoList.filter(u => (typeof u === 'object' ? u?.username : u)?.toLowerCase() !== username.toLowerCase());
                                        await dbHelper.saveCache('following', window.seguindoList).catch(e => console.error(e));
                                    }

                                    const rows = document.querySelectorAll(`tr[data-username="${username}"]`);
                                    rows.forEach(r => r.remove());
                                } else {
                                    console.error(`[IG Tools] Falha ao bloquear ${username}:`, apiResult);
                                    showToast(`❌ Falha ao bloquear ${username}`);
                                }
                            } catch (err) {
                                console.error(`[IG Tools] Erro ao bloquear ${username}:`, err);
                                showToast(`❌ Erro ao bloquear ${username}`);
                            }

                            if (i < users.length - 1) {
                                await new Promise(r => setTimeout(r, blockDelay));
                            }
                        }

                        if (cb) await cb();
                    } else {
                        await performActionOnProfile(users, ['Bloquear', 'Block'], cb);
                    }
                }
            }
        };

        const config = actionConfig[actionType];
        if (!config) return;

        const btn = document.getElementById(config.buttonId);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Processando...';
        }

        toggleLoading(true, 0, "Processando...");
        await config.func(selectedUsers, async () => {
            toggleLoading(false);
            if (btn) {
                btn.disabled = false;
                btn.textContent = config.text;
            }
            alert(`Ação "${config.text}" concluída para ${selectedUsers.length} usuário(s).`);
            if (updateCallback && config.dbStore) await updateCallback(selectedUsers, config.dbStore);
        }, selectedUsers, updateCallback);
    }

    /**
     * Executa ações diretamente no perfil do usuário via navegação humana ou chamada de API
     */
    async function performActionOnProfile(users, menuTexts, callback) {
        const originalPath = window.location.pathname;
        let cancelled = false;
        const { bar, update, closeButton } = createCancellableProgressBar();
        closeButton.onclick = () => {
            cancelled = true;
            bar.remove();
            alert("Processo interrompido.");
        };
        const isCancelled = () => cancelled;
        toggleLoading(true, 0, "Processando perfis...");

        const userListCache = getUserListCache();
        const dbHelper = getDbHelper();

        // Função interna para ação humana (navegação e clique)
        const executeHumanAction = async (username) => {
            history.pushState(null, null, `/${username}/`);
            window.dispatchEvent(new Event("popstate"));
            await new Promise(resolve => setTimeout(resolve, 4000));

            const followingButton = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]')).find(el => {
                const text = el.innerText.trim();
                return text === 'Seguindo' || text === 'Following';
            });
            if (!followingButton) { console.warn(`Botão 'Seguindo' não encontrado para ${username}.`); return; }
            simulateClick(followingButton);
            await new Promise(resolve => setTimeout(resolve, 1500));
            const actionOption = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"]')).find(el =>
                menuTexts.some(text => el.innerText.includes(text))
            );
            if (actionOption) { simulateClick(actionOption); console.log(`Ação executada para ${username}.`); }
            else { console.warn(`Opção não encontrada para ${username}.`); simulateClick(followingButton); }
            await new Promise(resolve => setTimeout(resolve, 2000));
        };

        // Lógica API vs Humana
        if (loadSettings().useApi) {
            for (let i = 0; i < users.length; i++) {
                if (isCancelled()) break;
                const username = users[i];
                update(i + 1, users.length, `Processando ${username}...`);
                toggleLoading(true, ((i + 1) / users.length) * 100, `Processando ${username}...`);
                const uid = await getUserId(username);
                let success = false;
                if (uid) {
                    try {
                        if (menuTexts.some(t => t.includes('Amigos Próximos') || t.includes('Amigo próximo')) && typeof window.executeGraphqlSetBesties === 'function') {
                            const isCurrentlyCF = userListCache.closeFriends && userListCache.closeFriends.has(username);
                            const adds = isCurrentlyCF ? [] : [uid];
                            const removes = isCurrentlyCF ? [uid] : [];
                            const res = await window.executeGraphqlSetBesties(adds, removes);
                            if (res.success) {
                                success = true;
                                if (isCurrentlyCF) userListCache.closeFriends.delete(username);
                                else userListCache.closeFriends.add(username);
                                await dbHelper.saveCache('closeFriends', Array.from(userListCache.closeFriends));
                                console.log(`[IG Tools] GraphQL Success: ${username} (Close Friends)`);
                            }
                        } else if (menuTexts.some(t => t.includes('Desbloquear') || t.includes('Unblock')) && typeof window.executeApiUnblock === 'function') {
                            const res = await window.executeApiUnblock(uid, username);
                            if (res.success) {
                                success = true;
                                console.log(`[IG Tools] API Unblock Sucesso: ${username}`);
                            }
                        }
                    } catch (e) { console.error(`Erro API Action ${username}`, e); }
                }

                if (!success) {
                    console.log(`Fallback para humano: ${username}`);
                    await executeHumanAction(username);
                } else {
                    await new Promise(r => setTimeout(r, loadSettings().requestDelay || 500));
                }
            }
            bar.remove();
            history.pushState(null, null, originalPath); window.dispatchEvent(new Event("popstate"));
            if (callback) callback();
            return;
        }

        for (let i = 0; i < users.length; i++) {
            if (isCancelled()) break;
            update(i + 1, users.length, "Processando:");
            await executeHumanAction(users[i]);
        }

        bar.remove();
        history.pushState(null, null, originalPath);
        window.dispatchEvent(new Event("popstate"));
        await new Promise(r => setTimeout(r, 1000));

        if (callback) callback(users);
    }

    /**
     * Alterna a participação de usuários em listas (/accounts/close_friends/, /accounts/hide_story_and_live_from/)
     */
    async function toggleListMembership(users, pageUrl, cacheKey, callback) {
        const originalPath = window.location.pathname;
        let cancelled = false;
        const { bar, update, closeButton } = createCancellableProgressBar();
        closeButton.onclick = () => {
            cancelled = true;
            bar.remove();
            alert("Processo interrompido.");
        };
        const isCancelled = () => cancelled;
        toggleLoading(true, 0, "Processando lista...");

        const userListCache = getUserListCache();
        const dbHelper = getDbHelper();

        const executeHumanToggle = async (username) => {
            if (window.location.pathname !== pageUrl) {
                history.pushState(null, null, pageUrl);
                window.dispatchEvent(new Event("popstate"));
                await new Promise(r => setTimeout(r, 3000));
            }

            const searchInput = document.querySelector('input[data-bloks-name="bk.components.TextInput"], input[placeholder*="Pesquisar"], input[placeholder*="Search"]');
            if (searchInput) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeInputValueSetter.call(searchInput, username);
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 3500));
            }

            const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"], div.wbloks_1'));
            let found = false;
            for (const flex of flexboxes) {
                const spans = Array.from(flex.querySelectorAll('span'));
                const userText = (spans.length > 0 ? spans[0].innerText.trim() : (flex.innerText && flex.innerText.trim().split('\n')[0])) || '';
                if (userText.toLowerCase() === username.toLowerCase()) {
                    const checkboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"], div[aria-label*="caixa de seleção"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção') || el.getAttribute('aria-label')?.includes('Toggle checkbox') || el.getAttribute('role') === 'button');
                    if (checkboxContainer) {
                        checkboxContainer.click();
                        found = true;
                        if (cacheKey === 'closeFriends') {
                            if (!userListCache.closeFriends) userListCache.closeFriends = new Set();
                            if (userListCache.closeFriends.has(username)) userListCache.closeFriends.delete(username);
                            else userListCache.closeFriends.add(username);
                            await dbHelper.saveCache('closeFriends', Array.from(userListCache.closeFriends));
                        } else if (cacheKey === 'hiddenStory') {
                            if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                            if (userListCache.hiddenStory.has(username)) userListCache.hiddenStory.delete(username);
                            else userListCache.hiddenStory.add(username);
                            await dbHelper.saveCache('hiddenStory', Array.from(userListCache.hiddenStory));
                        }
                        await new Promise(r => setTimeout(r, 2000));
                        break;
                    }
                }
            }
            if (!found) {
                console.warn(`Não foi possível encontrar o checkbox para ${username} na página ${pageUrl}.`);
            }

            if (searchInput) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeInputValueSetter.call(searchInput, "");
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 1500));
            } else {
                await new Promise(r => setTimeout(r, 1000));
            }
        };

        if (loadSettings().useApi) {
            for (let i = 0; i < users.length; i++) {
                if (isCancelled()) break;
                const username = users[i];
                toggleLoading(true, ((i + 1) / users.length) * 100, `Processando ${username}...`);
                update(i + 1, users.length, `Processando ${username}...`);
                const uid = await getUserId(username);
                let success = false;
                if (uid) {
                    try {
                        if (cacheKey === 'hiddenStory' && typeof window.executeWbloksHideStory === 'function') {
                            if (!userListCache.hiddenStory) userListCache.hiddenStory = new Set();
                            const isCurrentlyHidden = userListCache.hiddenStory.has(username);
                            const action = isCurrentlyHidden ? 'unhide' : 'hide';
                            const res = await window.executeWbloksHideStory(uid, username, action);
                            if (res.success) {
                                success = true;
                                if (isCurrentlyHidden) userListCache.hiddenStory.delete(username);
                                else userListCache.hiddenStory.add(username);
                                await dbHelper.saveCache('hiddenStory', Array.from(userListCache.hiddenStory));
                                console.log(`[IG Tools] API Success: ${username} (${action})`);
                            }
                        }
                    } catch (e) {
                        console.error(`Erro API Toggle List ${username}`, e);
                    }
                }

                if (!success) {
                    console.log(`Fallback para humano: ${username}`);
                    await executeHumanToggle(username);
                } else {
                    await new Promise(r => setTimeout(r, loadSettings().requestDelay || 500));
                }
            }
            bar.remove();
            history.pushState(null, null, originalPath); window.dispatchEvent(new Event("popstate"));
            if (callback) callback();
            return;
        }

        history.pushState(null, null, pageUrl);
        window.dispatchEvent(new Event("popstate"));
        await new Promise(r => setTimeout(r, 3000));

        for (let i = 0; i < users.length; i++) {
            if (isCancelled()) break;
            update(i + 1, users.length, "Processando:");
            await executeHumanToggle(users[i]);
        }

        bar.remove();
        history.pushState(null, null, originalPath);
        window.dispatchEvent(new Event("popstate"));
        await new Promise(r => setTimeout(r, 1000));

        if (callback) callback(users);
    }

    /**
     * Renderiza e gerencia a paginação de tabelas (Não Segue de Volta / Histórico)
     */
    function preencherTabela(userList, showCheckbox = true, isHistory = false, selectedSet = null, onCountChange = null) {
        const tableId = isHistory ? "historicoTable" : "naoSegueDeVoltaTable";
        const table = document.getElementById(tableId);
        if (!table) return;

        table.innerHTML = `
            <thead>
                <tr>
                    <th style="border: 1px solid #ccc; padding: 10px;">ID</th>
                    <th style="border: 1px solid #ccc; padding: 10px;">Username</th>
                    <th style="border: 1px solid #ccc; padding: 10px;">Foto</th>
                    ${isHistory ? '<th style="border: 1px solid #ccc; padding: 10px;">Data do Unfollow</th>' : ''}
                    ${showCheckbox ? '<th style="border: 1px solid #ccc; padding: 10px;">Check</th>' : ''}
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        const itemsPerPage = loadSettings().itemsPerPage || 10;
        const maxPageButtons = 5;
        let currentPage = 1;

        function renderTable(page) {
            tbody.innerHTML = "";
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, userList.length);

            userList.slice(startIndex, endIndex).forEach((userData, index) => {
                const isObject = typeof userData === 'object' && userData !== null;
                const username = isObject ? userData.username : userData;
                const photoUrl = isObject ? userData.photoUrl : null;
                if (isObject && userData.id) {
                    setCachedUserId(username, String(userData.id));
                }
                let unfollowDate = null;
                if (isHistory) {
                    try {
                        unfollowDate = userData.unfollowDate ? new Date(userData.unfollowDate).toLocaleString('pt-BR') : 'Data desconhecida';
                    } catch (e) { unfollowDate = 'Data inválida'; }
                }

                const tr = document.createElement("tr");
                tr.setAttribute('data-username', username);
                tr.innerHTML = `
                    <td style="border: 1px solid #ccc; padding: 10px;">${startIndex + index + 1}</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">
                        <a href="https://www.instagram.com/${username}" target="_blank">${username}</a>
                    </td>
                    <td style="border: 1px solid #ccc; padding: 10px;">
                        <img id="img_${username}_${isHistory ? 'hist' : 'main'}" src="${photoUrl || DEFAULT_AVATAR}" onerror="this.onerror=null; this.src=DEFAULT_AVATAR;" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    </td>` +
                    (isHistory ? `<td style="border: 1px solid #ccc; padding: 10px;">${unfollowDate}</td>` : '') +
                    (showCheckbox ? `<td style="border: 1px solid #ccc; padding: 10px;">
                        <input type="checkbox" class="unfollowCheckbox" data-username="${username}" ${selectedSet && selectedSet.has(username) ? 'checked' : ''} />
                    </td>` : '') + `
                `;

                if (showCheckbox && selectedSet) {
                    tr.querySelector('.unfollowCheckbox').addEventListener('change', (e) => {
                        if (e.target.checked) selectedSet.add(username);
                        else selectedSet.delete(username);
                        if (onCountChange) onCountChange();
                    });
                }

                const img = tr.querySelector('img');
                if (img) {
                    img.onerror = function () {
                        this.onerror = null;
                        this.src = DEFAULT_AVATAR;
                    };
                }

                tbody.appendChild(tr);
            });

            updatePaginationControls();
        }

        function updatePaginationControls() {
            const paginationDiv = document.getElementById("paginationControls");
            if (!paginationDiv) return;

            paginationDiv.innerHTML = "";

            const totalPages = Math.ceil(userList.length / itemsPerPage);
            const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
            const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

            const pageIndicator = document.createElement("span");
            pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
            pageIndicator.style.marginRight = "20px";
            pageIndicator.style.fontWeight = "bold";
            paginationDiv.appendChild(pageIndicator);

            const prevButton = document.createElement("button");
            prevButton.textContent = "Anterior";
            prevButton.disabled = currentPage === 1;
            prevButton.style.cssText = "padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; cursor: " + (currentPage === 1 ? "not-allowed" : "pointer") + "; margin-right: 10px;";
            if (currentPage === 1) prevButton.style.opacity = "0.4";
            prevButton.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable(currentPage);
                }
            });
            paginationDiv.appendChild(prevButton);

            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement("button");
                pageButton.textContent = i;
                const isActive = i === currentPage;
                pageButton.style.cssText = `padding: 5px 10px; border-radius: 5px; border: 1px solid ${isActive ? '#0095f6' : '#dbdbdb'}; background: ${isActive ? '#0095f6' : '#f8f9fa'}; color: ${isActive ? '#ffffff' : '#111111'} !important; font-weight: 600; cursor: ${isActive ? 'default' : 'pointer'}; margin-right: 5px;`;
                pageButton.disabled = isActive;
                pageButton.addEventListener("click", () => {
                    currentPage = i;
                    renderTable(currentPage);
                });
                paginationDiv.appendChild(pageButton);
            }

            const nextButton = document.createElement("button");
            nextButton.textContent = "Próximo";
            nextButton.disabled = currentPage === totalPages;
            nextButton.style.cssText = "padding: 5px 12px; border-radius: 5px; border: 1px solid #dbdbdb; background: #f8f9fa; color: #111111 !important; font-weight: 600; cursor: " + (currentPage === totalPages ? "not-allowed" : "pointer") + "; margin-left: 10px;";
            if (currentPage === totalPages) nextButton.style.opacity = "0.4";
            nextButton.addEventListener("click", () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable(currentPage);
                }
            });
            paginationDiv.appendChild(nextButton);
        }

        let paginationDiv = document.getElementById("paginationControls");
        if (!paginationDiv) {
            const container = document.getElementById("tabelaContainer");
            if (container) {
                paginationDiv = document.createElement("div");
                paginationDiv.id = "paginationControls";
                paginationDiv.style.marginTop = "20px";
                container.appendChild(paginationDiv);
            }
        }

        renderTable(currentPage);
    }

    /**
     * Detecta se o dispositivo do usuário é móvel
     */
    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    /**
     * Executa rolagem contínua para extração em dispositivos móveis
     */
    function startScrollMobile() {
        let lastScrollTop = 0;
        let waitTime = 0;

        const scrollInterval = setInterval(() => {
            if (typeof window.extractUsernames === 'function') window.extractUsernames();
            if (typeof window.updateProgressBar === 'function') window.updateProgressBar();

            window.scrollTo(0, document.body.scrollHeight);

            const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            if (currentScrollTop === lastScrollTop) {
                waitTime += 1;
                if (waitTime >= 10) {
                    clearInterval(scrollInterval);
                    if (typeof window.startDownload === 'function') window.startDownload();
                }
            } else {
                waitTime = 0;
            }

            lastScrollTop = currentScrollTop;
        }, 1000);
    }

    // Registro no barramento global
    window.IGTools.BulkActions = {
        handleActionOnSelected,
        performActionOnProfile,
        toggleListMembership,
        getProfilePic,
        preencherTabela,
        isMobileDevice,
        startScrollMobile
    };

    // Aliases diretos para compatibilidade com chamadas existentes
    window.handleActionOnSelected = handleActionOnSelected;
    window.performActionOnProfile = performActionOnProfile;
    window.toggleListMembership = toggleListMembership;
    window.getProfilePic = getProfilePic;
    window.preencherTabela = preencherTabela;
    window.isMobileDevice = isMobileDevice;
    window.startScrollMobile = startScrollMobile;

})();
