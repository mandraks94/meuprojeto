        // ==UserScript==
        // @name         Instagram Tools
        // @namespace    http://tampermonkey.net/
        // @version      1.0
        // @description  Instagram automation tools
        // @author       You
        // @match        https://www.instagram.com/*
        // @grant        none1111111111
        // ==/UserScript==

        (function() {
            'use strict';
            
            function initScript() {
                if (window.location.href.includes("instagram.com")) {
                        function injectMenu() {
                            if (document.getElementById("assistiveTouchMenu")) return;

                            // Add dynamic styles
                            const style = document.createElement("style");
                            style.id = "dynamicMenuStyle";
                            document.head.appendChild(style);

                            function updateColors() {
                                style.innerHTML = `
                                    .assistive-touch {
                                        position: fixed;
                                        bottom: 50%;
                                        right: 20px;
                                        transform: translateY(50%);
                                        width: 60px;
                                        height: 60px;
                                        background-color: #0095f6;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        z-index: 9999;
                                        cursor: pointer;
                                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                                        transition: all 0.3s ease;
                                    }
                                    .assistive-menu {
                                        position: fixed;
                                        bottom: 50%;
                                        right: 90px;
                                        transform: translateY(50%);
                                        display: none;
                                        flex-direction: column;
                                        gap: 10px;
                                        z-index: 9998;
                                        background: white;
                                        padding: 10px;
                                        border-radius: 12px;
                                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
                                        background: #f8f9fa;
                                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        cursor: pointer;
                                        transition: background 0.2s;
                                    }
                                    .menu-item button:hover {
                                        background: #e9ecef;
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
                                    .dark-mode .assistive-menu {
                                        background: black !important;
                                    }
                                    .dark-mode .menu-item span {
                                        color: white !important;
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
                                    .dark-mode .submenu-modal span, .dark-mode .submenu-modal th, .dark-mode .submenu-modal td, .dark-mode .submenu-modal li span, .dark-mode .submenu-modal a, .dark-mode .submenu-modal label, .dark-mode .submenu-modal input[type="file"] {
                                        color: white !important;
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
                                `;
                            }

                            updateColors();

                            // Create main button
                            const mainBtn = document.createElement("div");
                            mainBtn.id = "assistiveTouchMenu";
                            mainBtn.className = "assistive-touch";
                            mainBtn.innerHTML = "⚙️";

                            // Create menu
                            const menu = document.createElement("div");
                            menu.className = "assistive-menu";
                            menu.innerHTML = `
                                <div class="menu-item">
                                    <button id="curtidasBtn">❤️</button>
                                    <span>Curtidas</span>
                                </div>
                                <div class="menu-item">
                                    <button id="comentariosBtn">💬</button>
                                    <span>Comentários</span>
                                </div>
                                <div class="menu-item">
                                    <button id="bloqueadosBtn">⛔</button>
                                    <span>Bloqueados</span>
                                </div>
                                <div class="menu-item">
                                    <button id="mensagensBtn">✉️</button>
                                    <span>Mensagens</span>
                                </div>
                                <div class="menu-item">
                                    <button id="naoSegueDeVoltaBtn">🔄</button>
                                    <span>Não segue de volta</span>
                                </div>
                                <div class="menu-item">
                                    <button id="seguindoBtn">➡️</button>
                                    <span>Seguindo</span>
                                </div>
                                <div class="menu-item">
                                    <button id="closeFriendsBtn">🌟</button>
                                    <span>Amigos Próximos</span>
                                </div>
                                <div class="menu-item">
                                    <button id="hideStoryBtn">👁️‍🗨️</button>
                                    <span>Ocultar Story</span>
                                </div>
                                <div class="menu-item">
                                    <button id="mutedAccountsBtn">🔇</button>
                                    <span>Contas Silenciadas</span>
                                </div>

                                <div class="menu-item">
                                    <button id="baixarStoryBtn">⬇️</button>
                                    <span>Baixar Story</span>
                                </div>
                                <div class="menu-item">
                                    <button id="darkModeBtn">🌙</button>
                                    <span>Modo Escuro</span>
                                </div>
                            `;

                            document.body.appendChild(mainBtn);
                            document.body.appendChild(menu);

                            mainBtn.addEventListener("click", () => {
                                menu.style.display = menu.style.display === "flex" ? "none" : "flex";
                            });

                            // Functionality for buttons
                            let usernames = new Set();
                            let downloadStarted = false;
                            let scrollInterval; // Variável global para armazenar o intervalo
                            let isUnfollowing = false; // Flag para prevenir múltiplas execuções
                            let currentExtraction = ''; // Para rastrear se é seguidores ou seguindo
                            let isDarkMode = false;

                            // Cache global para listas de usuários, para evitar buscas repetidas
                            const userListCache = {
                                muted: null,       // Será um Set de usernames
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
                                        "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:9999;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";

                                    fill = document.createElement("div");
                                    fill.id = "progressFill";
                                    fill.style.cssText =
                                        "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";

                                    text = document.createElement("div");
                                    text.id = "progressText";
                                    text.style.position = "relative";
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
                                const scrollDiv = document.querySelector(
                                    "body > div.x1n2onr6.xzkaem6 > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z > div > div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div.x7r02ix.xf1ldfh.x131esax.xdajt7p.xxfnqb6.xb88tzc.xw2csxc.x1odjw0f.x5fp0pe > div > div > div.xyi19xy.x1ccrb07.xtf3nb5.x1pc53ja.x1lliihq.x1iyjqo2.xs83m0k.xz65tgg.x1rife3k.x1n2onr6"
                                );

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

                            document
                                .getElementById("curtidasBtn")
                                .addEventListener("click", (e) => {
                                    e.preventDefault();
                                    history.pushState(null, null, "/your_activity/interactions/likes/");
                                    window.dispatchEvent(new Event("popstate"));
                                });

                            document
                                .getElementById("comentariosBtn")
                                .addEventListener("click", (e) => {
                                    e.preventDefault();
                                    history.pushState(null, null, "/your_activity/interactions/comments/");
                                    window.dispatchEvent(new Event("popstate"));
                                });

                            document
                                .getElementById("mensagensBtn")
                                .addEventListener("click", (e) => {
                                    e.preventDefault();
                                    history.pushState(null, null, "/direct/inbox/");
                                    window.dispatchEvent(new Event("popstate"));
                                });

                            document
                                .getElementById("bloqueadosBtn")
                                .addEventListener("click", (e) => {
                                    e.preventDefault();
                                    history.pushState(null, null, "/accounts/blocked_accounts/");
                                    window.dispatchEvent(new Event("popstate"));
                                });

                            document.getElementById("naoSegueDeVoltaBtn").addEventListener("click", () => {
                                iniciarProcessoNaoSegueDeVolta();
                            });

                            document.getElementById("seguindoBtn").addEventListener("click", () => {
                                iniciarProcessoSeguindo();
                            });

                            document.getElementById("seguindoBtn").addEventListener("click", () => {
                                iniciarProcessoSeguindo();
                            });

                            // --- NOVO MENU: AMIGOS PRÓXIMOS ---
            document.getElementById("closeFriendsBtn").addEventListener("click", () => {
                console.log("Botão Amigos Próximos clicado");
                // Direcionar para a página de amigos próximos se não estiver lá
                if (window.location.pathname !== "/accounts/close_friends/") {
                    console.log("Navegando para /accounts/close_friends/");
                    history.pushState(null, null, "/accounts/close_friends/");
                    window.dispatchEvent(new Event("popstate"));
                    // Abrir o modal independente do resultado da função buscarUsernames
                    setTimeout(() => {
                        console.log("Abrindo modal após navegação");
                        abrirModalAmigosProximos();
                    }, 1000);
                } else {
                    console.log("Já na página /accounts/close_friends/, abrindo modal");
                    abrirModalAmigosProximos();
                }
            });

            // --- NOVO MENU: OCULTAR STORY ---
                            document.getElementById("hideStoryBtn").addEventListener("click", () => {
                console.log("Botão Ocultar Story clicado");
                // Direcionar para a página de ocultar story se não estiver lá
                if (window.location.pathname !== "/accounts/hide_story_and_live_from/") {
                    console.log("Navegando para /accounts/hide_story_and_live_from/");
                    history.pushState(null, null, "/accounts/hide_story_and_live_from/");
                    window.dispatchEvent(new Event("popstate"));
                    // Abrir o modal independente do resultado da função buscarUsernames
                    setTimeout(() => {
                        console.log("Abrindo modal após navegação");
                        abrirModalOcultarStory();
                    }, 1000);
                } else {
                    console.log("Já na página /accounts/hide_story_and_live_from/, abrindo modal");
                    abrirModalOcultarStory();
                }
            });

            document.getElementById("mutedAccountsBtn").addEventListener("click", () => {
                console.log("Botão Contas Silenciadas clicado");
                if (window.location.pathname !== "/accounts/muted_accounts/") {
                    console.log("Navegando para /accounts/muted_accounts/");
                    history.pushState(null, null, "/accounts/muted_accounts/");
                    window.dispatchEvent(new Event("popstate"));
                    setTimeout(() => {
                        abrirModalContasSilenciadas();
                    }, 1000);
                } else {
                    abrirModalContasSilenciadas();
                }
            });
            document.getElementById("baixarStoryBtn").addEventListener("click", () => {
                baixarStoryAtual();
            });

            document.getElementById("darkModeBtn").addEventListener("click", () => {
                isDarkMode = !isDarkMode;
                if (isDarkMode) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            });

            function extractCloseFriendsUsernames(doc = document) {
                return new Promise((resolve) => {
                    const maxAttempts = 20;
                    let attempts = 0;

                    function tryExtract() {
                        attempts++;
                        const users = [];
                        // Select all elements with data-bloks-name="bk.components.Flexbox" that contain spans with data-bloks-name="bk.components.Text"
                        const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                            el.querySelector('span[data-bloks-name="bk.components.Text"]')
                        );

                        if (userElements.length === 0) {
                            console.log("No user elements found for close friends usernames, attempt", attempts);
                            if (attempts < maxAttempts) {
                                setTimeout(tryExtract, 500);
                            } else {
                                resolve(users);
                            }
                            return;
                        }

                        console.log("User elements found:", userElements.length);

                        for (let i = 0; i < userElements.length; i++) {
                            const userElement = userElements[i];
                            let username = "";
                            let photoUrl = "";
                            const usernameSpan = userElement.querySelector('span[data-bloks-name="bk.components.Text"]');
                            if (usernameSpan) {
                                username = usernameSpan.innerText.trim();
                            } else {
                                username = userElement.innerText.trim().split('\n')[0];
                            }
                            // Try to find an img tag or div with background-image for photo inside userElement
                            const imgTag = userElement.querySelector('img');
                            if (imgTag && imgTag.src) {
                                photoUrl = imgTag.src;
                            } else {
                                // Try to find div with background-image style
                                const bgDiv = userElement.querySelector('div[style*="background-image"]');
                                if (bgDiv) {
                                    const bgStyle = bgDiv.style.backgroundImage;
                                    const match = bgStyle.match(/url\\(["']?(.*?)["']?\\)/);
                                    if (match && match[1]) {
                                        photoUrl = match[1];
                                    }
                                }
                            }
                            if (
                                username.length > 0 &&
                                !username.includes(" ") &&
                                photoUrl && // Apenas adiciona se tiver foto
                                !users.some(u => u.username === username) &&
                                /^[a-zA-Z0-9_.]+$/.test(username)
                            ) {
                                users.push({ username, photoUrl });
                            }
                        }
                        console.log("Extracted users:", users);
                        resolve(users);
                    }

                    tryExtract();
                });
            }

            async function abrirModalAmigosProximos() {
                if (modalAberto) return; // Se modal já aberto, não faz nada

                modalAberto = true; // Marca que modal foi aberto para evitar loop infinito

                // Extract users asynchronously (username and photoUrl)
                const users = await extractCloseFriendsUsernames();

                // Monta a div
                const div = document.createElement("div");
                div.id = "allCloseFriendsDiv";
                div.className = "submenu-modal";
                div.style.cssText = `
                    position: fixed;
                    top: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70vw;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: auto;
                    border: 2px solid #0095f6;
                    border-radius: 10px;
                    z-index: 2147483647;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

                const itemsPerPage = 30;
                let currentPage = 1;
                let currentTab = 'nao_selecionados'; // 'selecionados' or 'nao_selecionados'

                // Cache official checkbox states for performance
                const officialCheckboxStates = new Map();
                const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                flexboxes.forEach(flex => {
                    const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                    if (userText) {
                        const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                        if (officialCheckboxContainer) {
                            const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                            const bgColor = window.getComputedStyle(iconDiv).backgroundColor;
                            const isChecked = (bgColor === "rgb(0, 149, 246)" || iconDiv.style.backgroundImage.includes('circle-check__filled'));
                            officialCheckboxStates.set(userText, isChecked);
                        }
                    }
                });

                // Filtra e armazena no cache APENAS os usuários que estão realmente marcados
                const closeFriendsUsernames = users
                    .filter(u => officialCheckboxStates.get(u.username) === true)
                    .map(u => u.username);
                userListCache.closeFriends = new Set(closeFriendsUsernames);
                console.log(`Cache atualizado com ${userListCache.closeFriends.size} melhores amigos.`);

                // Gerenciamento de estado para os checkboxes do modal, similar a "Ocultar Story"
                const modalStates = new Map();
                users.forEach(({ username }) => {
                    modalStates.set(username, officialCheckboxStates.get(username) || false);
                });

                // Armazena os estados iniciais para comparar no "Aplicar"
                const initialStates = new Map(modalStates);

                function renderPage(page) {
                    let html = `<h2 style="color: black;">Amigos Próximos</h2>`;
                    html += `
                        <div style="margin-bottom:10px;">
                            <button id="closeFriendsFecharBtn" style="background:#e74c3c;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Fechar</button>
                            <button id="closeFriendsMarcarTodosBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                            <button id="closeFriendsDesmarcarTodosBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                            <button id="closeFriendsAplicarBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Aplicar</button>
                        </div>
                        <div style="margin-bottom:15px;">
                            <input type="text" id="closeFriendsSearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                        </div>
                        <div class="tab-container">
                            <button id="tabSelecionados" class="tab-button ${currentTab === 'selecionados' ? 'active' : ''}">Melhores Amigos</button>
                            <button id="tabNaoSelecionados" class="tab-button ${currentTab === 'nao_selecionados' ? 'active' : ''}">Amigos</button>
                        </div>
                        <ul id="closeFriendsList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
                    `;

                    // Filter users based on tab
                    let filteredUsers = users;
                    if (currentTab === 'selecionados') {
                        filteredUsers = users.filter(({
                            username
                        }) => {
                            return modalStates.get(username) === true;
                        });
                    } else if (currentTab === 'nao_selecionados') {
                        filteredUsers = users.filter(({
                            username
                        }) => !modalStates.get(username));
                    }

                    const startIndex = (page - 1) * itemsPerPage;
                    const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                    const pageUsers = filteredUsers.slice(startIndex, endIndex);

                    pageUsers.forEach(({ username, photoUrl }, idx) => {
                        const isChecked = modalStates.get(username) || false;

                        html += `
                            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                                <label class="custom-checkbox" for="cfcb_${username}" style="margin:0;">
                                    <input type="checkbox" class="closeFriendCheckbox" id="cfcb_${username}" data-username="${username}" ${isChecked ? "checked" : ""}>
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="cursor:pointer; color: black;">${username}</span>
                            </li>
                        `;
                    });
                    html += "</ul>";
                    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                    html += `<div id="paginationControls" style="margin-top:20px; display:flex; justify-content:center; align-items:center; gap:10px;">`;
                    if (totalPages > 1) {
                        if (page > 1) html += `<button id="prevPageBtn">Anterior</button>`;
                        html += `<span style="font-weight:bold;">Página ${page} de ${totalPages}</span>`;
                        if (page < totalPages) html += `<button id="nextPageBtn">Próximo</button>`;
                    }
                    html += `</div>`;
                    div.innerHTML = html;
                    document.body.appendChild(div);

                    document.getElementById("closeFriendsFecharBtn").onclick = () => {
                        div.remove();
                        modalAberto = false;
                    };
                    document.getElementById("closeFriendsMarcarTodosBtn").onclick = () => {
                        // Filtra os usuários da aba atual e depois pega apenas os da página visível
                        const filteredUsers = users.filter(({ username }) => {
                            return currentTab === 'selecionados' ? modalStates.get(username) : !modalStates.get(username);
                        });
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                        const pageUsers = filteredUsers.slice(startIndex, endIndex);

                        pageUsers.forEach(({ username }) => modalStates.set(username, true));
                        renderPage(currentPage);
                    };
                    document.getElementById("closeFriendsDesmarcarTodosBtn").onclick = () => {
                        // Filtra os usuários da aba atual e depois pega apenas os da página visível
                        const filteredUsers = users.filter(({ username }) => {
                            return currentTab === 'selecionados' ? modalStates.get(username) : !modalStates.get(username);
                        });
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                        const pageUsers = filteredUsers.slice(startIndex, endIndex);

                        pageUsers.forEach(({ username }) => modalStates.set(username, false));
                        renderPage(currentPage);
                    };

                    const searchInput = document.getElementById("closeFriendsSearchInput");
                    searchInput.addEventListener("input", () => {
                        const filter = searchInput.value.toLowerCase();
                        const listItems = div.querySelectorAll("#closeFriendsList li");
                        listItems.forEach(li => {
                            const usernameSpan = li.children[2];
                            if (usernameSpan) {
                                const text = usernameSpan.textContent.toLowerCase();
                                li.style.display = text.includes(filter) ? "" : "none";
                            }
                        });
                    });

                    document.getElementById("tabSelecionados").onclick = () => {
                        if (currentTab !== 'selecionados') {
                            currentTab = 'selecionados';
                            currentPage = 1;
                            renderPage(currentPage);
                        }
                    };
                    document.getElementById("tabNaoSelecionados").onclick = () => {
                        if (currentTab !== 'nao_selecionados') {
                            currentTab = 'nao_selecionados';
                            currentPage = 1;
                            renderPage(currentPage);
                        }
                    };

                    const prevBtn = document.getElementById("prevPageBtn");
                    if (prevBtn) prevBtn.onclick = () => {
                        currentPage--;
                        renderPage(currentPage);
                    };
                    const nextBtn = document.getElementById("nextPageBtn");
                    if (nextBtn) nextBtn.onclick = () => {
                        currentPage++;
                        renderPage(currentPage);
                    };

                    // Adiciona eventos para os checkboxes na página atual
                    document.querySelectorAll('.closeFriendCheckbox').forEach(cb => {
                        cb.addEventListener('change', () => {
                            modalStates.set(cb.dataset.username, cb.checked);
                        });
                    });

                    document.getElementById("closeFriendsAplicarBtn").onclick = async () => {
                        isApplyingChanges = true;
                        const changedUsers = Array.from(modalStates.entries()).filter(([username, checked]) => {
                            return initialStates.get(username) !== checked;
                        });
                        if (changedUsers.length === 0) {
                            alert("Nenhuma alteração para aplicar.");
                            isApplyingChanges = false;
                            return;
                        }
                        let aplicarProgressBar = null;
                        let aplicarProgressFill = null;
                        let aplicarProgressText = null;
                        let aplicarCloseButton = null;
                        function updateAplicarProgressBar(current, total) {
                            if (!aplicarProgressBar) {
                                aplicarProgressBar = document.createElement("div");
                                aplicarProgressBar.id = "aplicarProgressBar";
                                aplicarProgressBar.style.cssText =
                                    "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:9999;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";
                                aplicarProgressFill = document.createElement("div");
                                aplicarProgressFill.id = "aplicarProgressFill";
                                aplicarProgressFill.style.cssText =
                                    "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";
                                aplicarProgressText = document.createElement("div");
                                aplicarProgressText.id = "aplicarProgressText";
                                aplicarProgressText.style.position = "relative";
                                aplicarProgressText.innerText = "0%";
                                aplicarCloseButton = document.createElement("button");
                                aplicarCloseButton.id = "aplicarProgressCloseBtn";
                                aplicarCloseButton.innerText = "Fechar";
                                aplicarCloseButton.style.cssText =
                                    "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";
                                aplicarCloseButton.addEventListener("click", () => {
                                    aplicarProgressBar.remove();
                                    alert("Processo interrompido pelo usuário.");
                                    isApplyingChanges = false;
                                });
                                aplicarProgressBar.appendChild(aplicarProgressFill);
                                aplicarProgressBar.appendChild(aplicarProgressText);
                                aplicarProgressBar.appendChild(aplicarCloseButton);
                                document.body.appendChild(aplicarProgressBar);
                            }
                            const percent = Math.min((current / total) * 100, 100);
                            aplicarProgressFill.style.width = percent + "%";
                            aplicarProgressText.innerText = `${Math.floor(percent)}% (${current}/${total})`;
                        }
                        if (window.location.pathname !== "/accounts/close_friends/") {
                            history.pushState(null, null, "/accounts/close_friends/");
                            window.dispatchEvent(new Event("popstate"));
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        async function toggleOfficialCheckbox(username) {
                            return new Promise((resolve) => {
                                let attempts = 0;
                                function tryToggle() {
                                    attempts++;
                                    const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                                    let found = false;
                                    for (const flex of flexboxes) {
                                        const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                        if (userText === username) {
                                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                                            if (officialCheckboxContainer) {
                                                officialCheckboxContainer.click();
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (found || attempts >= 30) {
                                        resolve();
                                    } else {
                                        setTimeout(tryToggle, 300);
                                    }
                                }
                                tryToggle();
                            });
                        }
                        for (let i = 0; i < changedUsers.length; i++) {
                            if (!isApplyingChanges) break;
                            updateAplicarProgressBar(i, changedUsers.length);
                            const [username, isChecked] = changedUsers[i];
                            await toggleOfficialCheckbox(username);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            // Atualiza o estado inicial para o próximo "Aplicar"
                            initialStates.set(username, isChecked);
                        }
                        updateAplicarProgressBar(changedUsers.length, changedUsers.length);
                        if (aplicarProgressBar) {
                            aplicarProgressBar.remove();
                        }
                        isApplyingChanges = false;
                    };

                    let isApplyingChanges = false;
                    setTimeout(() => {
                        const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                        flexboxes.forEach(flex => {
                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                            if (!officialCheckboxContainer) return;
                            if (officialCheckboxContainer._customSyncListener) return;
                            officialCheckboxContainer._customSyncListener = true;
                            officialCheckboxContainer.addEventListener("click", function () {
                                if (isApplyingChanges) return;
                                const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                const customCheckbox = document.querySelector(`.closeFriendCheckbox[data-username="${userText}"]`);
                                if (customCheckbox) {
                                    const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                    const isChecked = iconDiv && iconDiv.style.backgroundImage.includes('circle-check__filled');
                                    if (customCheckbox.checked !== isChecked) {
                                        customCheckbox.checked = isChecked;
                                    }
                                }
                            });
                        });
                    }, 500);
                    const aplicarBtn = document.getElementById("closeFriendsAplicarBtn");
                    if (aplicarBtn) {
                        const originalHandler = aplicarBtn.onclick;
                        aplicarBtn.onclick = async function () {
                            isApplyingChanges = true;
                            if (originalHandler) {
                                await originalHandler.apply(this, arguments);
                            }
                            isApplyingChanges = false;
                        };
                    }
                }

                renderPage(currentPage);
            }

            let tentativasUser = 0;
            let modalAberto = false; // Flag para evitar loop infinito
                            // --- FIM DO MENU AMIGOS PRÓXIMOS ---

                            // --- NOVO MENU: OCULTAR STORY ---
            function extractHideStoryUsernames(doc = document) {
                return new Promise((resolve) => {
                    const maxAttempts = 20;
                    let attempts = 0;

                    function tryExtract() {
                        attempts++;
                        const users = [];
                        // Select all elements with data-bloks-name="bk.components.Flexbox" that contain spans with data-bloks-name="bk.components.Text"
                        const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                            el.querySelector('span[data-bloks-name="bk.components.Text"]')
                        );

                        if (userElements.length === 0) {
                            console.log("No user elements found for hide story usernames, attempt", attempts);
                            if (attempts < maxAttempts) {
                                setTimeout(tryExtract, 500);
                            } else {
                                resolve(users);
                            }
                            return;
                        }

                        console.log("User elements found:", userElements.length);

                        for (let i = 0; i < userElements.length; i++) {
                            const userElement = userElements[i];
                            let username = "";
                            let photoUrl = "";
                            const usernameSpan = userElement.querySelector('span[data-bloks-name="bk.components.Text"]');
                            if (usernameSpan) {
                                username = usernameSpan.innerText.trim();
                            } else {
                                username = userElement.innerText.trim().split('\n')[0];
                            }
                            // Try to find an img tag or div with background-image for photo inside userElement
                            const imgTag = userElement.querySelector('img');
                            if (imgTag && imgTag.src) {
                                photoUrl = imgTag.src;
                            } else {
                                // Try to find div with background-image style
                                const bgDiv = userElement.querySelector('div[style*="background-image"]');
                                if (bgDiv) {
                                    const bgStyle = bgDiv.style.backgroundImage;
                                    const match = bgStyle.match(/url\\(["']?(.*?)["']?\\)/);
                                    if (match && match[1]) {
                                        photoUrl = match[1];
                                    }
                                }
                            }
                            if (
                                username.length > 0 &&
                                !username.includes(" ") &&
                                photoUrl && // Apenas adiciona se tiver foto
                                !users.some(u => u.username === username) &&
                                /^[a-zA-Z0-9_.]+$/.test(username)
                            ) {
                                users.push({ username, photoUrl });
                            }
                        }
                        console.log("Extracted users:", users);
                        resolve(users);
                    }

                    tryExtract();
                });
            }

            async function abrirModalOcultarStory() {
                if (modalAbertoStory) return;
                modalAbertoStory = true;

                const users = await extractHideStoryUsernames();
                const officialStates = new Map();
                const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                flexboxes.forEach(flex => {
                    const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                    if (userText) {
                        const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                        if (officialCheckboxContainer) {
                            const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                            const isChecked = iconDiv && (window.getComputedStyle(iconDiv).backgroundColor === "rgb(0, 149, 246)" || iconDiv.style.backgroundImage.includes('circle-check__filled'));
                            officialStates.set(userText, isChecked);
                        }
                    }
                });
                const modalStates = new Map(officialStates);
                const itemsPerPage = 30;
                let currentPage = 1;
                const div = document.createElement("div");
                div.id = "allHideStoryDiv";
                div.className = "submenu-modal";
                div.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70vw;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: auto;
                    border: 2px solid #f39c12;
                    border-radius: 10px;
                    z-index: 2147483647;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

            // Filtra e armazena no cache APENAS os usuários que estão realmente marcados
            const hiddenStoryUsernames = users
                .filter(u => modalStates.get(u.username) === true)
                .map(u => u.username);
            userListCache.hiddenStory = new Set(hiddenStoryUsernames);
            console.log(`Cache atualizado com ${userListCache.hiddenStory.size} usuários com story oculto.`);

            let currentTab = 'ocultados'; // 'ocultados' ou 'amigos'

                function renderPage(page) {
                    let html = `<h2 style="color: black;">Ocultar Story</h2>`;
                    html += `
                        <div style="margin-bottom:10px;">
                            <button id="hideStoryFecharBtn" style="background:#e74c3c;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Fechar</button>
                            <button id="hideStoryMarcarTodosBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                            <button id="hideStoryDesmarcarTodosBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                            <button id="hideStoryAplicarBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Aplicar</button>
                        </div>
                        <div style="margin-bottom:15px;">
                            <input type="text" id="hideStorySearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                        </div>
                    <div class="tab-container">
                        <button id="tabOcultados" class="tab-button ${currentTab === 'ocultados' ? 'active' : ''}">Ocultados</button>
                        <button id="tabAmigos" class="tab-button ${currentTab === 'amigos' ? 'active' : ''}">Amigos</button>
                    </div>
                        <ul id="hideStoryList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
                    `;

                // Filtra usuários com base na aba
                let filteredUsers;
                if (currentTab === 'ocultados') {
                    filteredUsers = users.filter(({ username }) => modalStates.get(username));
                } else { // amigos
                    filteredUsers = users.filter(({ username }) => !modalStates.get(username));
                }

                // Filtra por pesquisa
                const searchTerm = document.getElementById('hideStorySearchInput')?.value.toLowerCase() || '';
                if (searchTerm) {
                    filteredUsers = filteredUsers.filter(({ username }) => username.toLowerCase().includes(searchTerm));
                }

                    const startIndex = (page - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
                const pageUsers = filteredUsers.slice(startIndex, endIndex);

                    pageUsers.forEach(({ username, photoUrl }, idx) => {
                        const isChecked = modalStates.get(username) || false;
                        html += `
                            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                            <label class="custom-checkbox" for="hsb_${username}" style="margin:0;">
                                <input type="checkbox" class="hideStoryCheckbox" id="hsb_${username}" data-username="${username}" ${isChecked ? "checked" : ""}>
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="cursor:pointer; color: black;">${username}</span>
                            </li>
                        `;
                    });
                    html += "</ul>";
                const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                    html += `<div id="paginationControls" style="margin-top:20px; display:flex; justify-content:center; align-items:center; gap:10px;">`;
                    if (totalPages > 1) {
                        if (page > 1) html += `<button id="prevPageBtn">Anterior</button>`;
                        html += `<span style="font-weight:bold;">Página ${page} de ${totalPages}</span>`;
                        if (page < totalPages) html += `<button id="nextPageBtn">Próximo</button>`;
                    }
                    html += `</div>`;
                    div.innerHTML = html;
                    document.body.appendChild(div);
                    document.getElementById("hideStoryFecharBtn").onclick = () => {
                        div.remove();
                        modalAbertoStory = false;
                    };
                    document.getElementById("hideStoryMarcarTodosBtn").onclick = () => {
                    pageUsers.forEach(({ username }) => modalStates.set(username, true));
                    renderPage(currentPage);
                    };
                    document.getElementById("hideStoryDesmarcarTodosBtn").onclick = () => {
                    pageUsers.forEach(({ username }) => modalStates.set(username, false));
                    renderPage(currentPage);
                    };
                    const searchInput = document.getElementById("hideStorySearchInput");
                    searchInput.addEventListener("input", () => {
                    currentPage = 1;
                    renderPage(currentPage);
                });

                // Eventos das abas
                document.getElementById("tabOcultados").onclick = () => {
                    if (currentTab !== 'ocultados') {
                        currentTab = 'ocultados';
                        currentPage = 1;
                        renderPage(currentPage);
                    }
                };
                document.getElementById("tabAmigos").onclick = () => {
                    if (currentTab !== 'amigos') {
                        currentTab = 'amigos';
                        currentPage = 1;
                        renderPage(currentPage);
                    }
                };

                // Eventos dos checkboxes
                document.querySelectorAll(".hideStoryCheckbox").forEach(cb => {
                    cb.addEventListener("change", () => {
                        modalStates.set(cb.dataset.username, cb.checked);
                    });
                    });
                    const prevBtn = document.getElementById("prevPageBtn");
                    if (prevBtn) prevBtn.onclick = () => {
                        currentPage--;
                        renderPage(currentPage);
                    };
                    const nextBtn = document.getElementById("nextPageBtn");
                    if (nextBtn) nextBtn.onclick = () => {
                        currentPage++;
                        renderPage(currentPage);
                    };
                    document.getElementById("hideStoryAplicarBtn").onclick = async () => {
                        isApplyingChangesStory = true;
                        const changedUsers = Array.from(modalStates.entries()).filter(([username, checked]) => officialStates.get(username) !== checked).map(([username, checked]) => ({ dataset: { username }, checked }));
                        if (changedUsers.length === 0) {
                            alert("Nenhuma alteração para aplicar.");
                            isApplyingChangesStory = false;
                            return;
                        }
                        let aplicarProgressBar = null;
                        let aplicarProgressFill = null;
                        let aplicarProgressText = null;
                        let aplicarCloseButton = null;
                        function updateAplicarProgressBar(current, total) {
                            if (!aplicarProgressBar) {
                                aplicarProgressBar = document.createElement("div");
                                aplicarProgressBar.id = "aplicarProgressBarStory";
                                aplicarProgressBar.style.cssText =
                                    "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:9999;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";
                                aplicarProgressFill = document.createElement("div");
                                aplicarProgressFill.id = "aplicarProgressFillStory";
                                aplicarProgressFill.style.cssText =
                                    "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";
                                aplicarProgressText = document.createElement("div");
                                aplicarProgressText.id = "aplicarProgressTextStory";
                                aplicarProgressText.style.position = "relative";
                                aplicarProgressText.innerText = "0%";
                                aplicarCloseButton = document.createElement("button");
                                aplicarCloseButton.id = "aplicarProgressCloseBtnStory";
                                aplicarCloseButton.innerText = "Fechar";
                                aplicarCloseButton.style.cssText =
                                    "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";
                                aplicarCloseButton.addEventListener("click", () => {
                                    aplicarProgressBar.remove();
                                    alert("Processo interrompido pelo usuário.");
                                    isApplyingChangesStory = false;
                                });
                                aplicarProgressBar.appendChild(aplicarProgressFill);
                                aplicarProgressBar.appendChild(aplicarProgressText);
                                aplicarProgressBar.appendChild(aplicarCloseButton);
                                document.body.appendChild(aplicarProgressBar);
                            }
                            const percent = Math.min((current / total) * 100, 100);
                            aplicarProgressFill.style.width = percent + "%";
                            aplicarProgressText.innerText = `${Math.floor(percent)}% (${current}/${total})`;
                        }
                        if (window.location.pathname !== "/accounts/hide_story_and_live_from/") {
                            history.pushState(null, null, "/accounts/hide_story_and_live_from/");
                            window.dispatchEvent(new Event("popstate"));
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        async function toggleOfficialCheckbox(username) {
                            return new Promise((resolve) => {
                                let attempts = 0;
                                function tryToggle() {
                                    attempts++;
                                    const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                                    let found = false;
                                    for (const flex of flexboxes) {
                                        const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                        if (userText === username) {
                                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                                            if (officialCheckboxContainer) {
                                                officialCheckboxContainer.click();
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (found || attempts >= 30) {
                                        resolve();
                                    } else {
                                        setTimeout(tryToggle, 300);
                                    }
                                }
                                tryToggle();
                            });
                        }
                        for (let i = 0; i < changedUsers.length; i++) {
                            if (!isApplyingChangesStory) break;
                            updateAplicarProgressBar(i, changedUsers.length);
                            await toggleOfficialCheckbox(changedUsers[i].dataset.username);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            officialStates.set(changedUsers[i].dataset.username, changedUsers[i].checked);
                            // Redesenha a página atual para refletir a mudança em tempo real
                            renderPage(currentPage);
                        }
                        updateAplicarProgressBar(changedUsers.length, changedUsers.length);
                        if (aplicarProgressBar) {
                            aplicarProgressBar.remove();
                        }
                        isApplyingChangesStory = false;
                    };
                    let isApplyingChangesStory = false;
                    setTimeout(() => {
                        const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                        flexboxes.forEach(flex => {
                            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                            if (!officialCheckboxContainer) return;
                            if (officialCheckboxContainer._customSyncListenerStory) return;
                            officialCheckboxContainer._customSyncListenerStory = true;
                            officialCheckboxContainer.addEventListener("click", function () {
                                if (isApplyingChangesStory) return;
                                const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                const customCheckbox = document.querySelector(`.hideStoryCheckbox[data-username="${userText}"]`);
                                if (customCheckbox) {
                                    const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                    const isChecked = iconDiv && iconDiv.style.backgroundImage.includes('circle-check__filled');
                                    if (customCheckbox.checked !== isChecked) {
                                        customCheckbox.checked = isChecked;
                                    }
                                }
                            });
                        });
                    }, 500);
                    const aplicarBtn = document.getElementById("hideStoryAplicarBtn");
                    if (aplicarBtn) {
                        const originalHandler = aplicarBtn.onclick;
                        aplicarBtn.onclick = async function () {
                            isApplyingChangesStory = true;
                            if (originalHandler) {
                                await originalHandler.apply(this, arguments);
                            }
                            isApplyingChangesStory = false;
                        };
                    }
                }
                renderPage(currentPage);
            }

            let modalAbertoStory = false;
                            // --- FIM DO MENU OCULTAR STORY ---

                            // --- NOVO MENU: CONTAS SILENCIADAS ---
            function extractMutedAccountsUsernames(doc = document) {
                return new Promise((resolve) => {
                    const maxAttempts = 20;
                    let attempts = 0;

                    function tryExtract() {
                        attempts++;
                        const users = [];
                        // O seletor é similar ao de "Amigos Próximos" e "Ocultar Story"
                        const userElements = Array.from(doc.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
                            el.querySelector('span[data-bloks-name="bk.components.Text"]')
                        );

                        if (userElements.length === 0) {
                            console.log("Nenhum elemento de usuário encontrado para Contas Silenciadas, tentativa", attempts);
                            if (attempts < maxAttempts) {
                                setTimeout(tryExtract, 500);
                            } else {
                                resolve(users);
                            }
                            return;
                        }

                        console.log("Elementos de usuário encontrados:", userElements.length);

                        for (let i = 0; i < userElements.length; i++) {
                            const userElement = userElements[i];
                            let username = "";
                            let photoUrl = "";
                            const usernameSpan = userElement.querySelector('span[data-bloks-name="bk.components.Text"]');
                            if (usernameSpan) {
                                username = usernameSpan.innerText.trim();
                            } else {
                                username = userElement.innerText.trim().split('\n')[0];
                            }
                            const imgTag = userElement.querySelector('img');
                            if (imgTag && imgTag.src) {
                                photoUrl = imgTag.src;
                            }
                            if (
                                username.length > 0 &&
                                !username.includes(" ") &&
                                photoUrl &&
                                !users.some(u => u.username === username) &&
                                /^[a-zA-Z0-9_.]+$/.test(username)
                            ) {
                                users.push({ username, photoUrl });
                            }
                        }
                        console.log("Usuários extraídos:", users);
                        resolve(users);
                    }

                    tryExtract();
                });
            }

            async function abrirModalContasSilenciadas() {
                if (modalAbertoMuted) return;
                modalAbertoMuted = true;

                const users = await extractMutedAccountsUsernames();

                // Armazena a lista no cache global
                userListCache.muted = new Set(users.map(u => u.username));
                console.log(`Cache atualizado com ${userListCache.muted.size} contas silenciadas.`);

                const modalStates = new Map();
                users.forEach(({ username }) => modalStates.set(username, false)); // Inicia todos desmarcados

                const itemsPerPage = 30;
                let currentPage = 1;

                const div = document.createElement("div");
                div.id = "allMutedAccountsDiv";
                div.className = "submenu-modal";
                div.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70vw;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: auto;
                    border: 2px solid #8e44ad;
                    border-radius: 10px;
                    z-index: 2147483647;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                `;

                function renderPage(page) {
                    let html = `<h2>Contas Silenciadas</h2>`;
                    html += `
                        <div style="margin-bottom:10px;">
                            <button id="mutedFecharBtn" style="background:#e74c3c;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Fechar</button>
                            <button id="mutedMarcarTodosBtn" style="background:#0095f6;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                            <button id="mutedDesmarcarTodosBtn" style="background:#6c757d;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                            <button id="mutedAplicarBtn" style="background:#8e44ad;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Reativar Som</button>
                        </div>
                        <div style="margin-bottom:15px;">
                            <input type="text" id="mutedSearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
                        </div>
                        <ul id="mutedList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
                    `;
                    const startIndex = (page - 1) * itemsPerPage;
                    const endIndex = Math.min(startIndex + itemsPerPage, users.length);
                    const pageUsers = users.slice(startIndex, endIndex);

                    pageUsers.forEach(({ username, photoUrl }, idx) => {
                        const globalIdx = startIndex + idx;
                        const isChecked = modalStates.get(username) || false;
                        html += `
                            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                                <label class="custom-checkbox" for="muted_cb_${globalIdx}" style="margin:0;">
                                    <input type="checkbox" class="mutedCheckbox" id="muted_cb_${globalIdx}" data-username="${username}" ${isChecked ? "checked" : ""}>
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                                <span style="cursor:pointer; color: black;">${username}</span>
                            </li>
                        `;
                    });
                    html += "</ul>";
                    const totalPages = Math.ceil(users.length / itemsPerPage);
                    html += `<div id="paginationControls" style="margin-top:20px; display:flex; justify-content:center; align-items:center; gap:10px;">`;
                    if (totalPages > 1) {
                        if (page > 1) html += `<button id="prevPageBtn">Anterior</button>`;
                        html += `<span style="font-weight:bold;">Página ${page} de ${totalPages}</span>`;
                        if (page < totalPages) html += `<button id="nextPageBtn">Próximo</button>`;
                    }
                    html += `</div>`;
                    div.innerHTML = html;
                    document.body.appendChild(div);

                    document.getElementById("mutedFecharBtn").onclick = () => { div.remove(); modalAbertoMuted = false; };
                    document.getElementById("mutedMarcarTodosBtn").onclick = () => {
                        document.querySelectorAll("#mutedList .mutedCheckbox").forEach(cb => { cb.checked = true; modalStates.set(cb.dataset.username, true); });
                    };
                    document.getElementById("mutedDesmarcarTodosBtn").onclick = () => {
                        document.querySelectorAll("#mutedList .mutedCheckbox").forEach(cb => { cb.checked = false; modalStates.set(cb.dataset.username, false); });
                    };

                    const searchInput = document.getElementById("mutedSearchInput");
                    searchInput.addEventListener("input", () => {
                        const filter = searchInput.value.toLowerCase();
                        div.querySelectorAll("#mutedList li").forEach(li => {
                            const text = li.querySelector('span').textContent.toLowerCase();
                            li.style.display = text.includes(filter) ? "" : "none";
                        });
                    });

                    const prevBtn = document.getElementById("prevPageBtn");
                    if (prevBtn) prevBtn.onclick = () => { currentPage--; renderPage(currentPage); };
                    const nextBtn = document.getElementById("nextPageBtn");
                    if (nextBtn) nextBtn.onclick = () => { currentPage++; renderPage(currentPage); };

                    document.querySelectorAll(".mutedCheckbox").forEach(cb => {
                        cb.addEventListener("change", () => modalStates.set(cb.dataset.username, cb.checked));
                    });

                    document.getElementById("mutedAplicarBtn").onclick = async () => {
                        const usersToUnmute = Array.from(modalStates.entries())
                            .filter(([_, checked]) => checked)
                            .map(([username]) => username);

                        if (usersToUnmute.length === 0) {
                            alert("Nenhum usuário selecionado para reativar o som.");
                            return;
                        }

                        const aplicarBtn = document.getElementById("mutedAplicarBtn");
                        aplicarBtn.disabled = true;
                        aplicarBtn.textContent = "Processando...";

                        await unmuteUsers(usersToUnmute, () => {
                            aplicarBtn.disabled = false;
                            aplicarBtn.textContent = "Reativar Som";
                            alert(`${usersToUnmute.length} usuário(s) tiveram o som reativado.`);
                            // Recarrega o modal para refletir as mudanças
                            div.remove();
                            modalAbertoMuted = false;
                            abrirModalContasSilenciadas();
                        });
                    };
                }
                renderPage(currentPage);
            }

            async function unmuteUsers(usersToUnmute, callback) {
                let progressBar, progressFill, progressText;

                function updateProgressBar(current, total) {
                    if (!progressBar) {
                        progressBar = document.createElement("div");
                        progressBar.id = "unmuteProgressBar";
                        progressBar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:2147483647;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;";
                        progressFill = document.createElement("div");
                        progressFill.style.cssText = "height:100%;width:0%;background:#8e44ad;position:absolute;left:0;top:0;z-index:-1;";
                        progressText = document.createElement("div");
                        progressText.style.position = "relative";
                        progressBar.appendChild(progressFill);
                        progressBar.appendChild(progressText);
                        document.body.appendChild(progressBar);
                    }
                    const percent = Math.min((current / total) * 100, 100);
                    progressFill.style.width = percent + "%";
                    progressText.innerText = `Reativando som: ${current} de ${total}`;
                }

                const originalPath = window.location.pathname;

                for (let i = 0; i < usersToUnmute.length; i++) {
                    const username = usersToUnmute[i];
                    updateProgressBar(i + 1, usersToUnmute.length);

                    // 1. Navegar para o perfil do usuário
                    history.pushState(null, null, `/${username}/`);
                    window.dispatchEvent(new Event("popstate"));
                    await new Promise(resolve => setTimeout(resolve, 4000)); // Espera o perfil carregar

                    // 2. Clicar no botão "Seguindo"
                    const followingButton = Array.from(document.querySelectorAll('button, div[role="button"]')).find(el => ['Seguindo', 'Following'].includes(el.innerText));
                    if (!followingButton) {
                        console.warn(`Botão 'Seguindo' não encontrado para ${username}. Pulando.`);
                        continue;
                    }
                    simulateClick(followingButton);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Espera o menu dropdown aparecer

                    // 3. Clicar na opção "Silenciar"
                    // Seletor mais robusto, similar ao de unfollow, para encontrar a opção "Silenciar"
                    const muteOption = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], div[role="menuitem"]')).find(el => 
                        el.innerText.trim() === 'Silenciar' || 
                        (el.querySelector('span') && el.querySelector('span').innerText.trim() === 'Silenciar')
                    );
                    if (!muteOption) {
                        console.warn(`Opção 'Silenciar' não encontrada para ${username}. Pulando.`);
                        // Tenta fechar o menu se ele abriu
                        if (followingButton) simulateClick(followingButton);
                        continue;
                    }
                    simulateClick(muteOption);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Espera o modal de silenciar abrir

                    // 4. Desativar os toggles de "Publicações" e "Stories"
                    console.log('Procurando pelo diálogo de "Silenciar"...');
                    const dialog = document.querySelector('div[role="dialog"]');
                    if (dialog) {
                        console.log('Diálogo de "Silenciar" encontrado.', dialog);
                        const optionsToUnmute = ['Publicações', 'Posts', 'Stories'];
                        let togglesClicked = 0;

                        for (const optionText of optionsToUnmute) {
                            console.log(`--- Verificando opção: "${optionText}" ---`);
                            // Encontra o elemento de texto ("Publicações" ou "Stories")
                            const textElement = Array.from(dialog.querySelectorAll('span, div')).find(el => el.innerText.trim() === optionText);
                            if (!textElement) {
                                console.log(`Elemento de texto para "${optionText}" não encontrado.`);
                                continue;
                            }
                            console.log(`Elemento de texto para "${optionText}" encontrado:`, textElement);

                            // Sobe na árvore DOM para encontrar o contêiner da linha inteira, que é clicável
                            const rowContainer = textElement.closest('div[role="button"]');
                            if (rowContainer) {
                                console.log(`Contêiner clicável para "${optionText}" encontrado:`, rowContainer);
                                // O Instagram usa um input[type="checkbox"] como indicador de estado.
                                const stateIndicator = rowContainer.querySelector('input[type="checkbox"], div[role="switch"]');

                                if (stateIndicator) {
                                    const isChecked = stateIndicator.getAttribute('aria-checked');
                                    console.log(`Indicador de estado para "${optionText}" encontrado. Estado (aria-checked): ${isChecked}`);
                                    if (isChecked === 'true') {
                                        console.log(`Clicando para desativar o silenciamento de "${optionText}"...`);
                                        simulateClick(rowContainer); // Clica na linha inteira
                                        togglesClicked++;
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                    }
                                } else {
                                    console.warn(`Indicador de estado (checkbox/switch) não encontrado para "${optionText}".`);
                                }
                            } else {
                                console.warn(`Contêiner clicável (div[role="button"]) não encontrado para a opção: "${optionText}".`);
                            }
                        }

                        // 5. Clicar no botão para salvar/concluir
                        console.log('Procurando pelo botão "Salvar" ou "Concluído"...');
                        const doneButton = Array.from(dialog.querySelectorAll('button, div[role="button"]')).find(
                            btn => {
                                const buttonText = btn.innerText.trim();
                                if (['Concluído', 'Done', 'Salvar', 'Save'].includes(buttonText)) return true;
                                const innerDiv = btn.querySelector('div');
                                if (innerDiv) {
                                    const innerText = innerDiv.innerText.trim();
                                    return ['Concluído', 'Done', 'Salvar', 'Save'].includes(innerText);
                                }
                                return false;
                            }
                        );
                        
                        if (doneButton) {
                            console.log('Botão "Salvar/Concluído" encontrado. Clicando...', doneButton);
                            simulateClick(doneButton);
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        } else if (togglesClicked === 0) {
                            // Se nenhum toggle foi clicado e não há botão "Concluído", fecha o modal para prosseguir
                            const closeButton = dialog.querySelector('button[aria-label="Fechar"], button[aria-label="Close"]');
                            if (closeButton) simulateClick(closeButton);
                        }
                    } else {
                        console.error('ERRO: Diálogo de "Silenciar" não foi encontrado na página.');
                    }

                    await new Promise(resolve => setTimeout(resolve, 2000)); // Espera final

                    // Remove a linha do modal para feedback visual imediato
                    const modalLi = document.querySelector(`#mutedList li input[data-username="${username}"]`);
                    if (modalLi) modalLi.closest('li').remove();
                }

                if (progressBar) {
                    progressBar.remove();
                }

                // Retorna para a página original de contas silenciadas
                history.pushState(null, null, originalPath);
                window.dispatchEvent(new Event("popstate"));
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (callback) callback();
            }

            let modalAbertoMuted = false;
                            // --- FIM DO MENU CONTAS SILENCIADAS ---
            
            function simulateClick(element) {
                if (!element) return;
                const dispatch = (event) => element.dispatchEvent(event);
                dispatch(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                dispatch(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                dispatch(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            }


                            // --- FUNÇÃO PARA BAIXAR STORY ATUAL (IMAGEM OU VÍDEO) ---
                            function baixarStoryAtual() {
                                if (!window.location.href.includes('/stories/')) {
                                    alert('Esta função só pode ser usada na tela de visualização de Stories.');
                                    return;
                                }

                                // Função auxiliar para verificar se um elemento está visível na tela
                                const isElementVisible = (el) => {
                                    if (!el) return false;
                                    const rect = el.getBoundingClientRect();
                                    const viewHeight = window.innerHeight || document.documentElement.clientHeight;

                                    // Considera visível se pelo menos 50% da altura do elemento estiver na tela.
                                    // Isso ajuda a ignorar elementos pré-carregados fora da tela.
                                    return (
                                        rect.bottom > 0 &&
                                        rect.top < viewHeight &&
                                        rect.width > 0 &&
                                        rect.height > 0
                                    );
                                };

                                let visibleImage;
                                let visibleVideo;

                                // 1. Tentar encontrar um vídeo visível primeiro
                                visibleVideo = Array.from(document.querySelectorAll('video')).find(isElementVisible);

                                if (isMobileDevice()) {
                                    // Lógica para celular: Procura por uma imagem que tenha 'srcset', um indicador comum para a imagem principal do story.
                                    // Isso é mais robusto do que um seletor de CSS fixo.
                                    visibleImage = Array.from(document.querySelectorAll('img[src]')).find(img => {
                                        const rect = img.getBoundingClientRect();
                                        return isElementVisible(img) && rect.height > (window.innerHeight * 0.5);
                                    });
                                } else {
                                    // Lógica para PC: Encontra a imagem grande que está visível.
                                    visibleImage = Array.from(document.querySelectorAll('section img')).find(img => {
                                        const rect = img.getBoundingClientRect();
                                        return isElementVisible(img) && rect.height > (window.innerHeight * 0.5);
                                    });
                                }

                                if (visibleVideo && visibleVideo.src) {
                                    console.log("Vídeo do story encontrado:", visibleVideo.src);
                                    // Se for um blob, pode ser uma imagem com música.
                                    if (visibleVideo.src.startsWith('blob:')) {
                                        console.log("Vídeo é um blob, tentando capturar como imagem.");
                                        // Tirar "print" do vídeo
                                        const canvas = document.createElement('canvas');
                                        canvas.width = visibleVideo.videoWidth;
                                        canvas.height = visibleVideo.videoHeight;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(visibleVideo, 0, 0, canvas.width, canvas.height);
                                        const dataUrl = canvas.toDataURL('image/png');
                                        downloadMedia(dataUrl, `story_img_${Date.now()}.png`);
                                    } else {
                                        // Se for um vídeo normal, tenta baixar diretamente.
                                        downloadMedia(visibleVideo.src, `story_video_${Date.now()}.mp4`);
                                    }
                                    return;
                                }

                                // 2. Se não houver vídeo, procurar por uma imagem visível
                                if (visibleImage && visibleImage.src) {
                                    console.log("Imagem do story encontrada:", visibleImage.src);
                                    // Prioriza a imagem de maior resolução do srcset, se disponível.
                                    const imageUrl = visibleImage.srcset
                                        ? visibleImage.srcset.split(',').slice(-1)[0].trim().split(' ')[0]
                                        : visibleImage.src;

                                    downloadMedia(imageUrl, `story_img_${Date.now()}.jpg`);
                                    return;
                                }

                                // 3. Se não encontrar nenhum dos dois
                                alert('Nenhuma imagem ou vídeo de story encontrado para baixar.');
                            }

                            // --- LÓGICA UNIFICADA PARA "NÃO SEGUE DE VOLTA" ---
                            async function iniciarProcessoNaoSegueDeVolta() {
                                const pathParts = window.location.pathname.split('/').filter(Boolean);
                                if (document.getElementById("naoSegueDeVoltaDiv")) return; // Evita abrir múltiplos modais
                                const username = pathParts[0];
                                const appID = '936619743392459'; // ID público do app web do Instagram
                                if (!username || pathParts.length > 1 && !['followers', 'following'].includes(pathParts[1])) {
                                    alert("Por favor, vá para a página de perfil de um usuário para usar esta função.");
                                    return;
                                }

                                // 1. Criar o modal de progresso
                                const div = document.createElement("div");
                                div.id = "naoSegueDeVoltaDiv";
                                div.className = "submenu-modal";
                                let processoCancelado = false; // Variável de controle de cancelamento

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
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <h2>Análise de Seguidores</h2>
                                        <button id="fecharSubmenuBtn" style="background: red; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer;">Cancelar</button>
                                    </div>
                                    <div class="tab-container">
                                        <button class="tab-button active" data-tab="nao-segue">Não Segue de Volta</button>
                                    </div>
                                    <div id="statusNaoSegue" style="margin-top: 20px; font-weight: bold;"></div>
                                    <div id="tabelaContainer" style="display: block; margin-top: 15px;"></div>
                                `;
                                document.body.appendChild(div);

                                document.getElementById("fecharSubmenuBtn").addEventListener("click", () => {
                                    processoCancelado = true; // Sinaliza que o processo deve ser cancelado
                                    document.getElementById("progressBar")?.remove();
                                    div.remove();
                                });

                                div.querySelectorAll('.tab-button').forEach(button => {
                                    button.addEventListener('click', (e) => handleTabClick(e.target.dataset.tab));
                                });

                                const statusDiv = document.getElementById("statusNaoSegue");

                                // Cache para armazenar os dados e evitar novas buscas
                                const cachedData = {
                                    seguindo: null,
                                    seguidores: null,
                                    naoSegueDeVolta: null,
                                    novosSeguidores: null,
                                    unfollows: null,
                                    profileInfo: null
                                };

                                // Função para extrair lista de usuários via API (muito mais rápido)
                                const fetchUserListAPI = async (userId, type, total) => {
                                    const userList = new Set();
                                    let nextMaxId = '';
                                    let hasNextPage = true;

                                    // --- Lógica da Barra de Progresso ---
                                    let bar = document.getElementById("progressBar");
                                    if (bar) bar.remove();

                                    bar = document.createElement("div");
                                    bar.id = "progressBar";
                                    bar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:10001;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;";

                                    const fill = document.createElement("div");
                                    fill.style.cssText = "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";

                                    const text = document.createElement("div");
                                    text.style.position = "relative";

                                    const closeButton = document.createElement("button");
                                    closeButton.innerText = "Cancelar";
                                    closeButton.style.cssText = "background:red;color:white;border:none;border-radius:5px;padding:5px 10px;cursor:pointer;";
                                    closeButton.onclick = () => { processoCancelado = true; bar.remove(); statusDiv.innerText = "Processo interrompido."; };

                                    bar.appendChild(fill);
                                    bar.appendChild(text);
                                    bar.appendChild(closeButton);
                                    document.body.appendChild(bar);

                                    const updateLocalProgressBar = (progress, total, message) => {
                                        const percent = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
                                        fill.style.width = `${percent}%`;
                                        text.innerText = `${message} ${Math.floor(percent)}% (${progress}/${total})`;
                                    };
                                    // --- Fim da lógica da Barra de Progresso ---

                                    while (hasNextPage && !processoCancelado) {
                                        try {
                                            const response = await fetch(`https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=50&max_id=${nextMaxId}`, {
                                                headers: { 'X-IG-App-ID': appID }
                                            });
                                            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
                                            const data = await response.json();

                                            data.users.forEach(user => userList.add(user.username));
                                            updateLocalProgressBar(userList.size, total, `Extraindo ${type}:`);

                                            if (data.next_max_id) {
                                                nextMaxId = data.next_max_id;
                                            } else {
                                                hasNextPage = false;
                                            }
                                            await new Promise(r => setTimeout(r, 250)); // Pequena pausa para não sobrecarregar
                                        } catch (error) {
                                            console.error(`Erro ao buscar ${type}:`, error);
                                            alert(`Ocorreu um erro ao buscar a lista de ${type}. Tente novamente mais tarde.`);
                                            hasNextPage = false; // Interrompe em caso de erro
                                        }
                                    }
                                    let progressBarElement = document.getElementById("progressBar");
                                    if (progressBarElement) progressBarElement.remove();
                                    return processoCancelado ? null : userList;
                                };

                                async function handleTabClick(tab) {
                                    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                                    document.querySelector(`.tab-button[data-tab="${tab}"]`).classList.add('active');
                                    const tabelaContainer = document.getElementById("tabelaContainer");
                                    tabelaContainer.innerHTML = '';

                                    // Se os dados ainda não foram carregados, mostra uma mensagem e aguarda.
                                    if (!cachedData.seguidores || !cachedData.seguindo) {
                                        statusDiv.innerText = "Aguarde, carregando dados iniciais...";
                                        return;
                                    }
                                    const userId = cachedData.profileInfo.data.user.id;

                                    if (tab === 'nao-segue') {
                                        const naoSegueDeVolta = cachedData.naoSegueDeVolta;
                                        statusDiv.innerText = `Análise concluída: ${naoSegueDeVolta.length} usuários não seguem você de volta.`;

                                        if (naoSegueDeVolta.length > 0) {
                                            tabelaContainer.innerHTML = `
                                                <table id="naoSegueDeVoltaTable" style="width: 100%; border-collapse: collapse; margin-top: 20px;"></table>
                                                <div style="margin-top: 20px;">
                                                <button id="selecionarTodosBtn">Selecionar Todos</button>
                                                <button id="desmarcarTodosBtn">Desmarcar Todos</button>
                                                <button id="unfollowBtn">Unfollow</button>
                                            </div>
                                        `;
                                        preencherTabela(naoSegueDeVolta);
                                        document.getElementById("selecionarTodosBtn").addEventListener("click", selecionarTodos);
                                        document.getElementById("desmarcarTodosBtn").addEventListener("click", desmarcarTodos);
                                        document.getElementById("unfollowBtn").addEventListener("click", unfollowSelecionados);
                                        }

                                    }
                                }

                                // Função principal que carrega os dados UMA VEZ
                                async function carregarDadosIniciais() {
                                    statusDiv.innerText = 'Buscando informações do perfil...';
                                    const profileInfoResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                                    if (processoCancelado) return;
                                    const profileInfo = await profileInfoResponse.json();
                                    const userId = profileInfo.data?.user?.id;
                                    if (!userId) { alert('Não foi possível obter o ID do usuário.'); div.remove(); return; }
                                    cachedData.profileInfo = profileInfo;

                                    const totalFollowing = profileInfo.data.user.edge_follow.count;
                                    const totalFollowers = profileInfo.data.user.edge_followed_by.count;

                                    // Busca "seguindo"
                                    const seguindo = await fetchUserListAPI(userId, 'following', totalFollowing);
                                    if (processoCancelado || !seguindo) return;
                                    cachedData.seguindo = seguindo;
                                    statusDiv.innerText = `Encontrados ${seguindo.size} usuários que você segue. Buscando seguidores...`;

                                    // Busca "seguidores"
                                    const seguidores = await fetchUserListAPI(userId, 'followers', totalFollowers);
                                    if (processoCancelado || !seguidores) return;
                                    cachedData.seguidores = seguidores;
                                    statusDiv.innerText = `Encontrados ${seguidores.size} seguidores. Comparando...`;
                                    await new Promise(r => setTimeout(r, 500));

                                    // Calcula e armazena em cache
                                    cachedData.naoSegueDeVolta = [...seguindo].filter(user => !seguidores.has(user));

                                    // Finalmente, exibe a primeira aba com os dados já carregados
                                    handleTabClick('nao-segue');
                                }

                                carregarDadosIniciais();
                            }

                            // --- LÓGICA PARA "SEGUINDO" ---
                            async function iniciarProcessoSeguindo() {
                                if (document.getElementById("seguindoModal")) return;
                                if (document.getElementById("automationStatusModal")) return;

                                const originalPath = window.location.pathname;

                                const pathParts = window.location.pathname.split('/').filter(Boolean);
                                const username = pathParts[0];
                                const appID = '936619743392459';
                                if (!username || (pathParts.length > 1 && !['followers', 'following'].includes(pathParts[1]))) {
                                    alert("Por favor, vá para a página de perfil de um usuário para usar esta função.");
                                    return;
                                }

                                // 1. Criar o modal de status da automação
                                const statusModal = document.createElement("div");
                                statusModal.id = "automationStatusModal";
                                statusModal.className = "submenu-modal";
                                statusModal.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 500px; border: 1px solid #ccc;
                                    border-radius: 10px; padding: 20px; z-index: 10001;
                                `;
                                statusModal.innerHTML = `
                                    <h2>Automatizando Coleta de Dados...</h2>
                                    <p>Por favor, aguarde. O script está navegando para buscar as informações necessárias.</p>
                                    <ul style="list-style: none; padding: 0; margin-top: 20px;">
                                        <li id="status-step-1" style="margin-bottom: 10px;"><span>⏳</span> Carregando lista de "Seguindo"...</li>
                                    <li id="status-step-2" style="margin-bottom: 10px;"><span>⏳</span> Carregando cache de "Melhores Amigos"...</li>
                                    <li id="status-step-3" style="margin-bottom: 10px;"><span>⏳</span> Carregando cache de "Ocultar Stories"...</li>
                                    <li id="status-step-4" style="margin-bottom: 10px;"><span>⏳</span> Carregando cache de "Contas Silenciadas"...</li>
                                    </ul>
                                <div id="automation-result" style="margin-top: 20px; font-weight: bold; color: red;"></div>
                                `;
                                document.body.appendChild(statusModal);

                                const updateStatus = (step, success, message = '') => {
                                    const stepLi = document.getElementById(`status-step-${step}`);
                                    if (stepLi) {
                                        stepLi.innerHTML = `<span>${success ? '✅' : '❌'}</span> ${stepLi.innerText.substring(2)} ${message}`;
                                    }
                                };

                                // Função para navegar, extrair e retornar
                                const fetchAndCache = async (url, extractorFn, cacheKey, step) => {
                                    if (userListCache[cacheKey] !== null) {
                                        updateStatus(step, true, '(Já em cache)');
                                        return true;
                                    }
                                    try {
                                        history.pushState(null, null, url);
                                        window.dispatchEvent(new Event("popstate"));
                                        await new Promise(r => setTimeout(r, 3000)); // Espera a página carregar

                                        const users = await extractorFn();
                                        if (url.includes('muted_accounts')) {
                                            userListCache[cacheKey] = new Set(users.map(u => u.username));
                                        } else {
                                            const officialStates = new Map();
                                            const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
                                            flexboxes.forEach(flex => {
                                                const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                                                if (userText) {
                                                    const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                                                    if (officialCheckboxContainer) {
                                                        const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                                                        const isChecked = iconDiv && (window.getComputedStyle(iconDiv).backgroundColor === "rgb(0, 149, 246)" || iconDiv.style.backgroundImage.includes('circle-check__filled'));
                                                        officialStates.set(userText, isChecked);
                                                    }
                                                }
                                            });
                                            const filteredUsernames = users.filter(u => officialStates.get(u.username) === true).map(u => u.username);
                                            userListCache[cacheKey] = new Set(filteredUsernames);
                                        }
                                        updateStatus(step, true);
                                        return true;
                                    } catch (error) {
                                        console.error(`Falha ao buscar dados para ${cacheKey}:`, error);
                                        updateStatus(step, false);
                                        return false;
                                    }
                                };

                                const div = document.createElement("div");
                                div.id = "seguindoModal";
                                div.className = "submenu-modal";
                                let processoCancelado = false;

                                div.style.cssText = `
                                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                    width: 90%; max-width: 800px; max-height: 90vh; border: 1px solid #ccc;
                                    border-radius: 10px; padding: 20px; z-index: 10000; overflow: auto;
                                `;
                                div.innerHTML = `
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <h2>Seguindo</h2>
                                        <div>
                                            <button id="bloquearSeguindoBtn" style="background: #3498db; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; margin-right: 10px;">Bloquear</button>
                                            <button id="restringirSeguindoBtn" style="background: #f39c12; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer; margin-right: 10px;">Restringir</button>
                                            <button id="fecharSeguindoBtn" style="background: #e74c3c; color: white; border: none; border-radius: 5px; padding: 8px 16px; cursor: pointer;">Fechar</button>
                                        </div>
                                    </div>
                                    <div id="statusSeguindo" style="margin-top: 20px; font-weight: bold;"></div>
                                    <div id="tabelaSeguindoContainer" style="display: block; margin-top: 15px;"></div>
                                `;
                                document.body.appendChild(div);

                                document.getElementById("fecharSeguindoBtn").addEventListener("click", () => {
                                    processoCancelado = true;
                                    document.getElementById("progressBar")?.remove();
                                    div.remove();
                                });

                                const statusDiv = document.getElementById("statusSeguindo");
                                const container = document.getElementById("tabelaSeguindoContainer");
                                let seguindoList = [];

                            const fetchUserListAPISeguindo = async (userId, type, total) => {
                                const userList = [];
                                let nextMaxId = '';
                                let hasNextPage = true;
                                let bar, fill, text;

                                const setupProgressBar = () => {
                                    bar = document.createElement("div");
                                    bar.id = "progressBar";
                                    bar.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:10001;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;";
                                    fill = document.createElement("div");
                                    fill.style.cssText = "height:100%;width:0%;background:#4caf50;position:absolute;left:0;top:0;z-index:-1;";
                                    text = document.createElement("div");
                                    text.style.position = "relative";
                                    bar.appendChild(fill);
                                    bar.appendChild(text);
                                    document.body.appendChild(bar);
                                };

                                const updateLocalProgressBar = (progress, total) => {
                                    if (!bar) setupProgressBar();
                                    const percent = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
                                    fill.style.width = `${percent}%`;
                                    text.innerText = `Buscando: ${progress} de ${total}`;
                                };

                                while (hasNextPage && !processoCancelado) {
                                    const response = await fetch(`https://www.instagram.com/api/v1/friendships/${userId}/${type}/?count=50&max_id=${nextMaxId}`, { headers: { 'X-IG-App-ID': appID } });
                                    const data = await response.json();
                                    data.users.forEach(user => userList.push({ username: user.username, photoUrl: user.profile_pic_url }));
                                    updateLocalProgressBar(userList.length, total);
                                    hasNextPage = !!data.next_max_id;
                                    nextMaxId = data.next_max_id;
                                    await new Promise(r => setTimeout(r, 250));
                                }
                                if (bar) bar.remove();
                                return processoCancelado ? null : userList;
                            };

                                async function carregarSeguindo() {
                                    statusDiv.innerText = 'Buscando informações do perfil...';
                                    const profileInfoResponse = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, { headers: { 'X-IG-App-ID': appID } });
                                    if (processoCancelado) return;
                                    const profileInfo = await profileInfoResponse.json();
                                    const userId = profileInfo.data?.user?.id;
                                    if (!userId) { alert('Não foi possível obter o ID do usuário.'); div.remove(); return; }

                                    const totalFollowing = profileInfo.data.user.edge_follow.count;

                                    // Inicia o processo de automação
                                const step2Success = await fetchAndCache('/accounts/close_friends/', extractCloseFriendsUsernames, 'closeFriends', 2);
                                const step3Success = await fetchAndCache('/accounts/hide_story_and_live_from/', extractHideStoryUsernames, 'hiddenStory', 3);
                                const step4Success = await fetchAndCache('/accounts/muted_accounts/', extractMutedAccountsUsernames, 'muted', 4);

                                const step1Success = await (async () => {
                                    if (!step2Success || !step3Success || !step4Success) {
                                        updateStatus(1, false, '(Abortado)');
                                        return false;
                                    }
                                        seguindoList = await fetchUserListAPISeguindo(userId, 'following', totalFollowing);
                                        const success = seguindoList !== null;
                                        updateStatus(1, success);
                                        return success;
                                    })();

                                    // Retorna para a página original
                                    history.pushState(null, null, originalPath);
                                    window.dispatchEvent(new Event("popstate"));
                                    await new Promise(r => setTimeout(r, 500));

                                if (!step1Success || !step2Success || !step3Success || !step4Success) {
                                        document.getElementById('automation-result').innerHTML = 'Falha na coleta automática. Por favor, abra os menus "Melhores Amigos", "Ocultar Story" e "Contas Silenciadas" manualmente para carregar os dados e tente novamente.';
                                        return; // Interrompe se alguma etapa falhou
                                    }

                                    statusModal.remove(); // Remove o modal de status
                                    document.body.appendChild(div); // Adiciona o modal principal

                                    statusDiv.innerText = `Total: ${seguindoList.length} perfis seguidos.`;

                                    let currentPage = 1; // Reinicia a paginação
                                    const itemsPerPage = 20;

                                    // Configuração para ordenação da tabela
                                    let sortConfig = { key: 'username', direction: 'ascending' };

                                    const renderList = (page) => {
                                        const startIndex = (page - 1) * itemsPerPage;
                                        const endIndex = startIndex + itemsPerPage;
                                        // A lista já foi ordenada, apenas paginamos

                                        let tableHtml = `
                                            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                                <thead style="cursor: pointer;">
                                                    <tr style="text-align: left; border-bottom: 2px solid #dbdbdb;">
                                                        <th style="padding: 8px; width: 20px;"></th>
                                                        <th style="padding: 8px;" data-sort-key="username">Usuário ${sortConfig.key === 'username' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                                        <th style="padding: 8px; text-align: center;" data-sort-key="isMuted" title="${userListCache.muted === null ? 'Visite o menu Contas Silenciadas para carregar estes dados.' : ''}">Silenciado? ${userListCache.muted === null ? '??' : (sortConfig.key === 'isMuted' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                                        <th style="padding: 8px; text-align: center;" data-sort-key="isCloseFriend" title="${userListCache.closeFriends === null ? 'Visite o menu Amigos Próximos para carregar estes dados.' : ''}">Melhores Amigos? ${userListCache.closeFriends === null ? '??' : (sortConfig.key === 'isCloseFriend' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                                        <th style="padding: 8px; text-align: center;" data-sort-key="isStoryHidden" title="${userListCache.hiddenStory === null ? 'Visite o menu Ocultar Story para carregar estes dados.' : ''}">Ocultar Stories? ${userListCache.hiddenStory === null ? '??' : (sortConfig.key === 'isStoryHidden' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody style="max-height: 60vh; overflow-y: auto;">
                                        `;

                                        // Ordena a lista antes de paginar
                                        const sortedUsers = [...seguindoList].sort((a, b) => {
                                            const getSortValue = (user, key) => {
                                                if (key === 'username') return user.username.toLowerCase();
                                                if (key === 'isMuted') return userListCache.muted ? (userListCache.muted.has(user.username) ? 1 : 2) : 3;
                                                if (key === 'isCloseFriend') return userListCache.closeFriends ? (userListCache.closeFriends.has(user.username) ? 1 : 2) : 3;
                                                if (key === 'isStoryHidden') return userListCache.hiddenStory ? (userListCache.hiddenStory.has(user.username) ? 1 : 2) : 3;
                                                return 0;
                                            };

                                            const valA = getSortValue(a, sortConfig.key);
                                            const valB = getSortValue(b, sortConfig.key);

                                            if (valA < valB) {
                                                return sortConfig.direction === 'ascending' ? -1 : 1;
                                            }
                                            if (valA > valB) {
                                                return sortConfig.direction === 'ascending' ? 1 : -1;
                                            }
                                            return 0;
                                        });

                                        const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

                                        paginatedUsers.forEach(({ username, photoUrl }) => {
                                            // Verifica os dados no cache global
                                            const isMuted = userListCache.muted ? (userListCache.muted.has(username) ? "Sim" : "Não") : "??";
                                            const isCloseFriend = userListCache.closeFriends ? (userListCache.closeFriends.has(username) ? "Sim" : "Não") : "??";
                                            const isStoryHidden = userListCache.hiddenStory ? (userListCache.hiddenStory.has(username) ? "Sim" : "Não") : "??";

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
                                                return ''; // Estilo padrão para '??'
                                            };

                                            tableHtml += `
                                                <tr style="border-bottom: 1px solid #dbdbdb;">
                                                    <td style="padding: 8px;"><input type="checkbox" class="user-checkbox" data-username="${username}" style="cursor: pointer;"></td>
                                                    <td style="padding: 8px; display:flex; align-items:center; gap:10px;">
                                                        <img src="${photoUrl}" alt="${username}" style="width:40px; height:40px; border-radius:50%;">
                                                        <a href="https://www.instagram.com/${username}" target="_blank" style="text-decoration:none; color:inherit; font-weight:600;">${username}</a>
                                                    </td>
                                                    <td style="text-align: center; padding: 8px;"><span style="padding: 4px 8px; border-radius: 5px; font-weight: bold; ${getStatusStyle(isMuted, 'muted')}">${isMuted}</span></td>
                                                    <td style="text-align: center; padding: 8px;"><span style="padding: 4px 8px; border-radius: 5px; font-weight: bold; ${getStatusStyle(isCloseFriend, 'closeFriend')}">${isCloseFriend}</span></td>
                                                    <td style="text-align: center; padding: 8px;"><span style="padding: 4px 8px; border-radius: 5px; font-weight: bold; ${getStatusStyle(isStoryHidden, 'storyHidden')}">${isStoryHidden}</span></td>
                                                </tr>
                                            `;
                                        });
                                        tableHtml += `</tbody></table>`;

                                        const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
                                        let paginationHtml = `<div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:20px;">`;
                                        if (page > 1) paginationHtml += `<button id="prevPageBtn" style="padding:5px 10px;">Anterior</button>`;
                                        paginationHtml += `<span>Página ${page} de ${totalPages}</span>`;
                                        if (page < totalPages) paginationHtml += `<button id="nextPageBtn" style="padding:5px 10px;">Próximo</button>`;
                                        paginationHtml += `</div>`;

                                        container.innerHTML = tableHtml + paginationHtml;

                                        const prevBtn = document.getElementById("prevPageBtn");
                                        if (prevBtn) prevBtn.onclick = () => renderList(--currentPage);
                                        const nextBtn = document.getElementById("nextPageBtn");
                                        if (nextBtn) nextBtn.onclick = () => renderList(++currentPage);

                                        // Adiciona eventos de clique para ordenação nos cabeçalhos
                                        document.querySelectorAll('#seguindoModal th[data-sort-key]').forEach(th => {
                                            th.addEventListener('click', () => {
                                                const key = th.dataset.sortKey;
                                                if (sortConfig.key === key) {
                                                    sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
                                                } else {
                                                    sortConfig = { key, direction: 'ascending' };
                                                }
                                                renderList(1); // Volta para a primeira página ao reordenar
                                            });
                                        });
                                    };

                                    if (seguindoList.length > 0) renderList(currentPage);
                                }
                                carregarSeguindo();
                            }


                            async function getProfilePic(username) {
                                try {
                                    // Usa a API interna do Instagram, que é mais estável que raspar o HTML.
                                    const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                                        headers: {
                                            // ID público do aplicativo web do Instagram
                                            'X-IG-App-ID': '936619743392459'
                                        }
                                    });
                                    const data = await response.json();
                                    return data.data.user.profile_pic_url || 'https://via.placeholder.com/32';
                                } catch (error) {
                                    console.error(`Erro ao buscar foto para ${username}:`, error);
                                    return 'https://via.placeholder.com/32';
                                }
                            }

                            function preencherTabela(userList, showCheckbox = true) {
                                const table = document.getElementById("naoSegueDeVoltaTable");
                                if (!table) return;

                                table.innerHTML = `
                                    <thead>
                                        <tr>
                                            <th style="border: 1px solid #ccc; padding: 10px;">ID</th>
                                            <th style="border: 1px solid #ccc; padding: 10px;">Username</th>
                                            <th style="border: 1px solid #ccc; padding: 10px;">Foto</th>
                                            ${showCheckbox ? '<th style="border: 1px solid #ccc; padding: 10px;">Check</th>' : ''}
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                `;
                                // Seleciona o tbody APÓS a tabela ser criada
                                const tbody = table.querySelector("tbody");
                                if (!tbody) return;

                                const itemsPerPage = 10; // Número de itens por página
                                const maxPageButtons = 5; // Número máximo de botões de página exibidos
                                let currentPage = 1; // Página atual

                                function renderTable(page) {
                                    tbody.innerHTML = ""; // Limpa a tabela para a nova página
                                    const startIndex = (page - 1) * itemsPerPage;
                                    const endIndex = Math.min(startIndex + itemsPerPage, userList.length);

                                    userList.slice(startIndex, endIndex).forEach((username, index) => {
                                        const tr = document.createElement("tr");
                                        tr.setAttribute('data-username', username);
                                        tr.innerHTML = `
                                            <td style="border: 1px solid #ccc; padding: 10px;">${startIndex + index + 1}</td>
                                            <td style="border: 1px solid #ccc; padding: 10px;">
                                                <a href="https://www.instagram.com/${username}" target="_blank">${username}</a>
                                            </td>
                                            <td style="border: 1px solid #ccc; padding: 10px;">
                                                <img id="img_${username}" src="https://via.placeholder.com/32" alt="${username}" style="width:32px; height:32px; border-radius:50%;">
                                            </td>` +
                                            (showCheckbox ? `<td style="border: 1px solid #ccc; padding: 10px;">
                                                <input type="checkbox" class="unfollowCheckbox" data-username="${username}" />
                                            </td>` : '') + `
                                        `;
                                        tbody.appendChild(tr);
                                        getProfilePic(username).then(url => {
                                            const img = document.getElementById(`img_${username}`);
                                            if (img) img.src = url;
                                        });
                                    });

                                    updatePaginationControls();
                                }

                                function updatePaginationControls() {
                                    const paginationDiv = document.getElementById("paginationControls");
                                    if (!paginationDiv) return;

                                    paginationDiv.innerHTML = ""; // Limpa os controles de paginação

                                    const totalPages = Math.ceil(userList.length / itemsPerPage);
                                    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
                                    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

                                    // Indicador de página
                                    const pageIndicator = document.createElement("span");
                                    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
                                    pageIndicator.style.marginRight = "20px";
                                    pageIndicator.style.fontWeight = "bold";
                                    paginationDiv.appendChild(pageIndicator);

                                    // Botão "Anterior"
                                    const prevButton = document.createElement("button");
                                    prevButton.textContent = "Anterior";
                                    prevButton.disabled = currentPage === 1;
                                    prevButton.style.marginRight = "10px";
                                    prevButton.addEventListener("click", () => {
                                        if (currentPage > 1) {
                                            currentPage--;
                                            renderTable(currentPage);
                                        }
                                    });
                                    paginationDiv.appendChild(prevButton);

                                    // Botões de página (limitados ao conjunto atual)
                                    for (let i = startPage; i <= endPage; i++) {
                                        const pageButton = document.createElement("button");
                                        pageButton.textContent = i;
                                        pageButton.style.marginRight = "5px";
                                        pageButton.disabled = i === currentPage;
                                        pageButton.addEventListener("click", () => {
                                            currentPage = i;
                                            renderTable(currentPage);
                                        });
                                        paginationDiv.appendChild(pageButton);
                                    }

                                    // Botão "Próximo"
                                    const nextButton = document.createElement("button");
                                    nextButton.textContent = "Próximo";
                                    nextButton.disabled = currentPage === totalPages;
                                    nextButton.style.marginLeft = "10px";
                                    nextButton.addEventListener("click", () => {
                                        if (currentPage < totalPages) {
                                            currentPage++;
                                            renderTable(currentPage);
                                        }
                                    });
                                    paginationDiv.appendChild(nextButton);
                                }

                                // Adiciona os controles de paginação
                                let paginationDiv = document.getElementById("paginationControls");
                                if (!paginationDiv) {
                                    paginationDiv = document.createElement("div");
                                    paginationDiv.id = "paginationControls";
                                    paginationDiv.style.marginTop = "20px";
                                    document.getElementById("tabelaContainer").appendChild(paginationDiv);
                                }

                                renderTable(currentPage); // Renderiza a primeira página
                            }

                            function selecionarTodos(e, tableId = "naoSegueDeVoltaTable") {
                                document.querySelectorAll(`#${tableId} .unfollowCheckbox`).forEach((checkbox) => {
                                    checkbox.checked = true;
                                });
                            }

                            function desmarcarTodos(e, tableId = "naoSegueDeVoltaTable") {
                                document.querySelectorAll(".unfollowCheckbox").forEach((checkbox) => {
                                    checkbox.checked = false;
                                });
                            }

                            function unfollowSelecionados(e, tableId = "naoSegueDeVoltaTable") {
                                const selecionados = getSelectedUsers(tableId);
                                // ... resto da função unfollowSelecionados
                            }


                            function unfollowSelecionados() {
                                if (isUnfollowing) {
                                    alert("Processo de unfollow já em andamento.");
                                    return;
                                }

                                const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(
                                    (checkbox) => checkbox.dataset.username
                                );

                                if (selecionados.length === 0) {
                                    alert("Nenhum usuário selecionado para Unfollow.");
                                    return;
                                }

                                // Desabilitar botão para evitar múltiplas execuções
                                const unfollowBtn = document.getElementById("unfollowBtn");
                                unfollowBtn.disabled = true;
                                unfollowBtn.textContent = "Processando...";
                                isUnfollowing = true;

                                // Iniciar processo de unfollow
                                unfollowUsers(selecionados, 0, () => {
                                    // Reabilitar botão ao finalizar
                                    unfollowBtn.disabled = false;
                                    unfollowBtn.textContent = "Unfollow";
                                    isUnfollowing = false;
                                });
                            }

                            function unfollowUsers(users, index, callback) {
                                if (index >= users.length) {
                                    console.log("Todos os usuários processados. Unfollow concluído.");
                                    alert("Unfollow concluído.");
                                    if (callback) callback();
                                    return;
                                }

                                const username = users[index];
                                console.log(`Iniciando unfollow para: ${username}, índice: ${index} de ${users.length - 1}`);
                                // Navegar para o perfil
                                history.pushState(null, null, `/${username}/`);
                                window.dispatchEvent(new Event("popstate"));

                                // Aguardar carregamento da página
                                setTimeout(() => {
                                    // Encontrar botão Seguindo (tentar vários seletores e textos alternativos)
                                    function getButtonByDescendantText(texts) {
                                        for (const text of texts) {
                                            const xpath = `//button[descendant::*[normalize-space(text())='${text}']]`;
                                            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            if (result.singleNodeValue) {
                                                console.log(`Botão encontrado via XPath para texto: ${text}`);
                                                return result.singleNodeValue;
                                            }
                                        }
                                        return null;
                                    }
                                    let followBtn = getButtonByDescendantText(['Seguindo', 'Following', 'Siguiendo']);
                                    if (!followBtn) {
                                        const candidates = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
                                        for (const el of candidates) {
                                            const text = el.textContent.trim();
                                            console.log("Candidato texto:", text);
                                            if (text === 'Seguindo' || text === 'Following' || text === 'Siguiendo') {
                                                followBtn = el;
                                                break;
                                            }
                                        }
                                    }
                                    if (!followBtn) {
                                        const allElements = Array.from(document.querySelectorAll('*'));
                                        for (const el of allElements) {
                                            const text = el.textContent.trim();
                                            if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && (text === 'Seguindo' || text === 'Following' || text === 'Siguiendo')) {
                                                followBtn = el;
                                                break;
                                            }
                                        }
                                    }
                                    if (followBtn) {
                                        followBtn.click();
                                        console.log("Botão 'Seguindo' clicado para " + username);
                                        // Aguardar diálogo abrir
                                        setTimeout(() => {
                                            // Encontrar botão Deixar de seguir dentro da caixa de diálogo
                                            let confirmBtn = document.querySelector('button[aria-label*="Deixar de seguir"], div[aria-label*="Deixar de seguir"], span[aria-label*="Deixar de seguir"]');
                                            if (!confirmBtn) {
                                                confirmBtn = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]')).find(el => {
                                                    const text = el.textContent.trim();
                                                    return text === 'Deixar de seguir' || text === 'Unfollow' || text === 'Dejar de seguir';
                                                });
                                            }
                                            if (!confirmBtn) {
                                                confirmBtn = Array.from(document.querySelectorAll('*')).find(el => {
                                                    const text = el.textContent.trim();
                                                    return (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && (text === 'Deixar de seguir' || text === 'Unfollow' || text === 'Dejar de seguir');
                                                });
                                            }
                                            if (confirmBtn) {
                                                confirmBtn.click();
                                                console.log("Botão 'Deixar de seguir' clicado para " + username);
                                                // Aguardar antes do próximo
                                                setTimeout(() => {
                                                    console.log(`Avançando para o próximo usuário, índice: ${index + 1}`);
                                                    unfollowUsers(users, index + 1, callback);
                                                }, 5000);
                                                // Remove the row after unfollow
                                                setTimeout(() => {
                                                    const row = document.querySelector(`tr[data-username="${username}"]`);
                                                    if (row) row.remove();
                                                }, 6000);
                                            } else {
                                                console.log(`Botão de confirmação não encontrado para ${username}, pulando para o próximo`);
                                                alert(`Não conseguiu confirmar unfollow para ${username}`);
                                                unfollowUsers(users, index + 1, callback);
                                            }
                                        }, 2000); // Aumentar para 2 segundos para a caixa abrir
                                    } else {
                                        console.log(`Botão Seguindo não encontrado para ${username}, pulando para o próximo`);
                                        alert(`Botão Seguindo não encontrado para ${username}`);
                                        unfollowUsers(users, index + 1, callback);
                                    }
                                }, 4000); // Aumentar para 4 segundos para carregamento da página
                            }

                            function isMobileDevice() {
                                // Detectar se o dispositivo é móvel
                                return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                            }

                            function startScrollMobile() {
                                let lastScrollTop = 0; // Para verificar se o scroll mudou
                                let waitTime = 0; // Tempo de espera para detectar o fim do scroll

                                scrollInterval = setInterval(() => {
                                    // Extrair usernames visíveis na página
                                    extractUsernames();
                                    updateProgressBar();

                                    // Rolar para baixo
                                    window.scrollTo(0, document.body.scrollHeight);

                                    // Verificar se o scroll parou
                                    const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                                    if (currentScrollTop === lastScrollTop) {
                                        waitTime += 1; // Incrementa o tempo de espera
                                        if (waitTime >= 10) { // Se não houver mudança no scroll por 10 ciclos (10 segundos)
                                            clearInterval(scrollInterval); // Parar o intervalo
                                            startDownload(); // Iniciar o download
                                        }
                                    } else {
                                        waitTime = 0; // Resetar o tempo de espera se o scroll mudou
                                    }

                                    lastScrollTop = currentScrollTop; // Atualizar a posição do scroll
                                }, 1000); // Intervalo de 1 segundo
                            }
                        }

                        async function downloadMedia(url, filename) {
                            alert(`Iniciando download de: ${filename}`);
                            try {
                                // Se for uma data URL (do canvas), não precisa de fetch
                                if (url.startsWith('data:')) {
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    return;
                                }

                                const response = await fetch(url);
                                if (!response.ok) throw new Error('A resposta da rede não foi ok.');
                                const blob = await response.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                            } catch (error) {
                                console.error('Erro ao baixar mídia:', error);
                                alert('Não foi possível baixar automaticamente. Abrindo em uma nova aba para download manual.');
                                window.open(url, '_blank');
                            }
                        }

                        // --- FIM DA LÓGICA DE DOWNLOAD DE STORIES ---

                        addFeedDownloadButtons();
                        injectMenu();

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
                            }, 500);
                        });

                    // --- DOWNLOAD DE MÍDIA DO FEED E REELS ---
                    function addFeedDownloadButtons() {
                        const observer = new MutationObserver(mutations => {
                            mutations.forEach(mutation => {
                                if (mutation.addedNodes.length) {
                                    // Busca por posts (articles) que ainda não foram processados
                                    const articles = document.querySelectorAll('article:not([data-download-processed])');
                                    articles.forEach(article => {
                                        article.setAttribute('data-download-processed', 'true');
                                        addDownloadButtonToMedia(article);
                                    });
                                }
                            });
                        });

                        observer.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                    }

                    function addDownloadButtonToMedia(article) {
                        // Função para processar e adicionar botão a um container de mídia
                        const processContainer = (container) => {
                            const mediaElement = container.querySelector('img, video');
                            // Pula se não houver mídia, se o botão já existir, ou se for imagem de perfil
                            if (!mediaElement || container.querySelector('.feed-download-btn') || container.closest('header')) {
                                return;
                            }
                            createAndAttachButton(container);
                        };

                        // Processa mídias já existentes no artigo
                        article.querySelectorAll('ul > li, div[role="presentation"], ._aagv').forEach(processContainer);

                        // Cria um observador específico para este artigo para lidar com o carregamento dinâmico do carrossel
                        const articleObserver = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                if (mutation.addedNodes.length) {
                                    mutation.addedNodes.forEach(node => {
                                        if (node.nodeType === 1) { // Se for um elemento
                                            // Procura por containers de mídia dentro dos nós adicionados
                                            node.querySelectorAll('ul > li, div[role="presentation"], ._aagv').forEach(processContainer);
                                            // Verifica o próprio nó adicionado
                                            if (node.matches('ul > li, div[role="presentation"], ._aagv')) {
                                                processContainer(node);
                                            }
                                        }
                                    });
                                }
                            });
                        });

                        articleObserver.observe(article, { childList: true, subtree: true });
                    }

                    function createAndAttachButton(container) {
                        if (!container) return;

                        // Evita adicionar botão em imagens de perfil nos comentários
                        const closestCommentSection = container.closest('ul[class*="x78zum5"]');
                        if (closestCommentSection) {
                            const commentAuthorLink = closestCommentSection.querySelector('a[href*="/p/"]');
                            if (!commentAuthorLink) { // Se não achar link de post, é provável que seja a lista de comentários principal
                                return;
                            }
                        }

                        // Evita adicionar botão em imagens de perfil no header do post
                        if (container.closest('header')) {
                            return;
                        }

                        // Se o botão já existe, não faz nada
                        if (container.querySelector('.feed-download-btn')) return;

                        const btn = document.createElement('button');
                        btn.innerHTML = '⬇️';
                        btn.className = 'feed-download-btn';
                        btn.style.cssText = `
                            position: absolute;
                            top: 15px;
                            left: 15px;
                            z-index: 100;
                            background-color: rgba(0, 0, 0, 0.6);
                            color: white;
                            border: none;
                            border-radius: 50%;
                            width: 32px;
                            height: 32px;
                            font-size: 16px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            line-height: 1;
                        `;

                        // Impede que o evento 'mousedown' se propague para os elementos pais.
                        // Isso é crucial para evitar que o Instagram abra o pop-up da postagem
                        // e cause o erro 'aria-hidden'.
                        btn.addEventListener('mousedown', (e) => {
                            e.stopPropagation();
                        });

                        btn.onclick = (e) => {
                            e.stopPropagation();
                            e.preventDefault();

                            // Lógica para baixar a mídia contida no container do botão
                            const activeMedia = container.querySelector('video, img');

                            if (activeMedia) {
                                const isVideo = activeMedia.tagName === 'VIDEO';
                                let mediaUrl = activeMedia.src;

                                // Para vídeos (especialmente Reels), a URL pode estar em um elemento <source>
                                if (isVideo) {
                                    const sourceElement = activeMedia.querySelector('source');
                                    if (sourceElement && sourceElement.src) {
                                        mediaUrl = sourceElement.src;
                                    }
                                }

                                const filename = `instagram_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
                                downloadMedia(mediaUrl, filename);
                            } else {
                                alert('Não foi possível encontrar a mídia para download.');
                            }
                        };
                        container.style.position = 'relative';
                        container.appendChild(btn);
                    }
                } // Esta chave fecha o if (window.location.href.includes("instagram.com"))
            }

            // Aguarda o DOM estar pronto para iniciar o script
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initScript);
            } else {
                setTimeout(initScript, 1000); // Fallback para garantir a execução
            }
        })();