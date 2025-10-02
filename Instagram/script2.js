    (function () {
        if (window.location.href.includes("instagram.com")) {
            function injectMenu() {
                if (document.getElementById("assistiveTouchMenu")) return;

                // Add dynamic styles
                const style = document.createElement("style");
                style.id = "dynamicMenuStyle";
                document.head.appendChild(style);

                function updateColors() {
                    const bgColor = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bgColor.match(/\d+/g);
                    if (!rgb) return;

                    const brightness =
                        (parseInt(rgb[0]) * 299 +
                            parseInt(rgb[1]) * 587 +
                            parseInt(rgb[2]) * 114) /
                        1000;

                    const textColor = brightness < 128 ? "white" : "black";
                    style.innerHTML = `
                        .assistive-touch {
                            position: fixed;
                            bottom: 50%;
                            right: 20px;
                            transform: translateY(50%);
                            width: 60px;
                            height: 60px;
                            background-color: #0077cc;
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
                            background: #fff;
                            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                        }
                        .menu-item span {
                            font-size: 14px;
                            color: ${textColor};
                            font-weight: bold;
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
                        <button id="extrairSeguidoresBtn">👥</button>
                        <span>Seguidores</span>
                    </div>
                    <div class="menu-item">
                        <button id="extrairSeguindoBtn">➡️</button>
                        <span>Seguindo</span>
                    </div>
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
                        <button id="closeFriendsBtn">🌟</button>
                        <span>Amigos Próximos</span>
                    </div>
                    <div class="menu-item">
                        <button id="hideStoryBtn">👁️‍🗨️</button>
                        <span>Ocultar Story</span>
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

                function getTotalFollowersOrFollowing() {
                    let total = 0;
                    const stats = document.querySelectorAll("header section ul li");

                    if (stats && stats.length > 0) {
                        const url = window.location.href;

                        // Verificar se estamos na página de seguidores ou seguindo
                        if (url.includes("/followers/")) {
                            stats.forEach((stat) => {
                                if (stat.innerText.includes("seguidores")) {
                                    total = parseInt(stat.innerText.replace(/\D/g, "")) || 0; // Número de seguidores
                                }
                            });
                        } else if (url.includes("/following/")) {
                            stats.forEach((stat) => {
                                if (stat.innerText.includes("seguindo")) {
                                    total = parseInt(stat.innerText.replace(/\D/g, "")) || 0; // Número de seguindo
                                }
                            });
                        }
                    }

                    return total > 0 ? total : 1; // Retornar 1 como fallback para evitar divisão por zero
                }

                function updateProgressBar() {
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

                    // Capturar o número total de seguidores ou seguindo
                    const total = getTotalFollowersOrFollowing();

                    // Calcular a porcentagem
                    const progress = usernames.size;
                    const percent = Math.min((progress / total) * 100, 100);

                    // Atualizar a barra de progresso
                    fill.style.width = percent + "%";
                    text.innerText = `${Math.floor(percent)}% (${progress}/${total})`;
                }

                function startScroll() {
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
                        updateProgressBar();

                        if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight) {
                            waitTime += 2;
                            if (waitTime >= 10) {
                                clearInterval(scrollInterval);
                                startDownload();
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
                    a.download = "export.csv";
                    a.click();
                }

                // Button event listeners
                document
                    .getElementById("extrairSeguidoresBtn")
                    .addEventListener("click", () => {
                        usernames.clear();
                        startScroll();
                    });

                document
                    .getElementById("extrairSeguindoBtn")
                    .addEventListener("click", () => {
                        usernames.clear();
                        startScroll();
                    });

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
                    createNaoSegueDeVoltaSubmenu();
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

function extractCloseFriendsUsernames() {
    return new Promise((resolve) => {
        const maxAttempts = 20;
        let attempts = 0;

        function tryExtract() {
            attempts++;
            const users = [];
            // Select all elements with data-bloks-name="bk.components.Flexbox" that contain spans with data-bloks-name="bk.components.Text"
            const userElements = Array.from(document.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
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

    modalAberto = true; // Marca que modal foi aberto para evitar loop

    // Extract users asynchronously (username and photoUrl)
    const users = await extractCloseFriendsUsernames();

    // Monta a div
    const div = document.createElement("div");
    div.id = "allCloseFriendsDiv";
    div.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        width: 60vw;
        max-width: 600px;
        max-height: 60vh;
        overflow: auto;
        background: white;
        border: 2px solid #32b643;
        border-radius: 10px;
        z-index: 2147483647;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;

    let html = `<h2 style="color: black;">Amigos Próximos</h2>`;
    html += `
        <div style="margin-bottom:10px;">
            <button id="closeFriendsFecharBtn" style="background:#e74c3c;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Fechar</button>
            <button id="closeFriendsMarcarTodosBtn" style="background:#32b643;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
            <button id="closeFriendsDesmarcarTodosBtn" style="background:#f1c40f;color:black;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
            <button id="closeFriendsAplicarBtn" style="background:#0077cc;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Aplicar</button>
        </div>
        <div style="margin-bottom:15px;">
            <input type="text" id="closeFriendsSearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
        </div>
        <ul id="closeFriendsList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
    `;

    // Build list items with checkboxes pre-checked if official checkbox is selected
    users.forEach(({ username, photoUrl }, idx) => {
        // Find the official checkbox container for this username
        const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
        let isChecked = false;
        for (const flex of flexboxes) {
            const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
            if (userText === username) {
                const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
                if (officialCheckboxContainer) {
                    // Check if the official checkbox is selected by background color or filled icon
                    const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                    if (iconDiv) {
                        // Check for blue background color #0095F6 or filled icon style
                        const bgColor = window.getComputedStyle(iconDiv).backgroundColor;
                        if (bgColor === "rgb(0, 149, 246)" || iconDiv.style.backgroundImage.includes('circle-check__filled')) {
                            isChecked = true;
                        }
                    }
                }
                break;
            }
        }

        html += `
            <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                <label class="custom-checkbox" for="cfcb_${idx}" style="margin:0;">
                    <input type="checkbox" class="closeFriendCheckbox" id="cfcb_${idx}" data-username="${username}" ${isChecked ? "checked" : ""}>
                    <span class="checkmark"></span>
                </label>
                <img src="${photoUrl || 'https://via.placeholder.com/32'}" alt="${username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <span style="cursor:pointer; color: black;">${username}</span>
            </li>
        `;
    });
    html += "</ul>";

    div.innerHTML = html;
    document.body.appendChild(div);

    document.getElementById("closeFriendsFecharBtn").onclick = () => {
        div.remove();
        modalAberto = false; // Permite abrir novamente depois de fechar
    };
    document.getElementById("closeFriendsMarcarTodosBtn").onclick = () => {
        document.querySelectorAll(".closeFriendCheckbox").forEach(cb => cb.checked = true);
    };
    document.getElementById("closeFriendsDesmarcarTodosBtn").onclick = () => {
        document.querySelectorAll(".closeFriendCheckbox").forEach(cb => cb.checked = false);
    };

    // Search input filtering
    const searchInput = document.getElementById("closeFriendsSearchInput");
    searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const listItems = div.querySelectorAll("#closeFriendsList li");
        listItems.forEach(li => {
            // The username span is the third child element (index 2) of li (after label and img)
            const usernameSpan = li.children[2];
            if (usernameSpan) {
                const text = usernameSpan.textContent.toLowerCase();
                li.style.display = text.includes(filter) ? "" : "none";
            }
        });
    });

    // Store initial checkbox states when modal opens
    const initialCheckboxStates = new Map();
    document.querySelectorAll(".closeFriendCheckbox").forEach(cb => {
        initialCheckboxStates.set(cb.dataset.username, cb.checked);
    });

    document.getElementById("closeFriendsAplicarBtn").onclick = async () => {
        isApplyingChanges = true; // Set flag true before starting toggling

        // Get all checkboxes
        const allCheckboxes = Array.from(document.querySelectorAll(".closeFriendCheckbox"));

        // Filter users whose checkbox state changed compared to initial state
        const changedUsers = allCheckboxes.filter(cb => {
            const initialState = initialCheckboxStates.get(cb.dataset.username);
            return initialState !== cb.checked;
        });

        if (changedUsers.length === 0) {
            alert("Nenhuma alteração para aplicar.");
            isApplyingChanges = false; // Reset flag if no changes
            return;
        }

        // Function to create and update progress bar for "Aplicar"
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

        // Navigate to the official Instagram close friends page if not already there
        if (window.location.pathname !== "/accounts/close_friends/") {
            history.pushState(null, null, "/accounts/close_friends/");
            window.dispatchEvent(new Event("popstate"));
            // Wait a bit for navigation to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Function to toggle official checkbox for a given username
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

        // Sequentially toggle official checkboxes for changed users with 2 seconds delay
        for (let i = 0; i < changedUsers.length; i++) {
            updateAplicarProgressBar(i, changedUsers.length);
            await toggleOfficialCheckbox(changedUsers[i].dataset.username);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay
        }
        updateAplicarProgressBar(changedUsers.length, changedUsers.length); // 100%

        // After all toggling, refresh modal checkboxes states to match intended final states from changedUsers
        const modalCheckboxes = Array.from(document.querySelectorAll(".closeFriendCheckbox"));
        modalCheckboxes.forEach(modalCb => {
            const username = modalCb.dataset.username;
            // Find the changed user checkbox state for this username
            const changedUser = changedUsers.find(cb => cb.dataset.username === username);
            if (changedUser) {
                modalCb.checked = changedUser.checked;
            }
        });

        // Remove progress bar after completion
        if (aplicarProgressBar) {
            aplicarProgressBar.remove();
        }
        isApplyingChanges = false; // Reset flag after completion
    };

    // Removed event listener on modal checkboxes to prevent immediate toggle of official checkboxes
    // Changes in modal checkboxes will only be applied when "Aplicar" button is clicked

    let isApplyingChanges = false; // Flag to indicate if "Aplicar" process is running

    // Sincroniza quando o usuário clica na checkbox oficial do Instagram
    setTimeout(() => {
        const flexboxes = Array.from(document.querySelectorAll('[data-bloks-name="bk.components.Flexbox"]'));
        flexboxes.forEach(flex => {
            const officialCheckboxContainer = Array.from(flex.querySelectorAll('div[tabindex="0"][role="button"]')).find(el => el.getAttribute('aria-label')?.includes('Alternar caixa de seleção'));
            if (!officialCheckboxContainer) return;
            if (officialCheckboxContainer._customSyncListener) return;
            officialCheckboxContainer._customSyncListener = true;
            officialCheckboxContainer.addEventListener("click", function () {
                if (isApplyingChanges) return; // Skip updating modal checkboxes during "Aplicar" process
                const userText = flex.innerText && flex.innerText.trim().split('\n')[0];
                const customCheckbox = document.querySelector(`.closeFriendCheckbox[data-username="${userText}"]`);
                if (customCheckbox) {
                    // Determine new checked state by checking if the official checkbox icon div has the filled background image
                    const iconDiv = officialCheckboxContainer.querySelector('[data-bloks-name="ig.components.Icon"]');
                    const isChecked = iconDiv && iconDiv.style.backgroundImage.includes('circle-check__filled');
                    if (customCheckbox.checked !== isChecked) {
                        customCheckbox.checked = isChecked;
                    }
                }
            });
        });
    }, 500);

    // Modify the "Aplicar" button handler to set/reset the flag
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

let tentativasUser = 0;
let modalAberto = false; // Flag para evitar loop infinito
                // --- FIM DO MENU AMIGOS PRÓXIMOS ---

                // --- NOVO MENU: OCULTAR STORY ---
function extractHideStoryUsernames() {
    return new Promise((resolve) => {
        const maxAttempts = 20;
        let attempts = 0;

        function tryExtract() {
            attempts++;
            const users = [];
            // Select all elements with data-bloks-name="bk.components.Flexbox" that contain spans with data-bloks-name="bk.components.Text"
            const userElements = Array.from(document.querySelectorAll('div[data-bloks-name="bk.components.Flexbox"]')).filter(el =>
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
    div.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: 70vw;
        max-width: 700px;
        max-height: 85vh;
        overflow: auto;
        background: white;
        border: 2px solid #f39c12;
        border-radius: 10px;
        z-index: 2147483647;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        color: #222222;
    `;
    function renderPage(page) {
        let html = `<h2 style="color: black;">Ocultar Story</h2>`;
        html += `
            <div style="margin-bottom:10px;">
                <button id="hideStoryFecharBtn" style="background:#e74c3c;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Fechar</button>
                <button id="hideStoryMarcarTodosBtn" style="background:#f39c12;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Selecionar</button>
                <button id="hideStoryDesmarcarTodosBtn" style="background:#27ae60;color:black;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;margin-right:10px;">Desmarcar</button>
                <button id="hideStoryAplicarBtn" style="background:#0077cc;color:white;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;">Aplicar</button>
            </div>
            <div style="margin-bottom:15px;">
                <input type="text" id="hideStorySearchInput" placeholder="Pesquisar..." style="width: 100%; padding: 6px 10px; border-radius: 5px; border: 1px solid #ccc; color: black;">
            </div>
            <ul id="hideStoryList" style='list-style:none;padding:0;max-height:40vh;overflow:auto;'>
        `;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, users.length);
        const pageUsers = users.slice(startIndex, endIndex);
        pageUsers.forEach(({ username, photoUrl }, idx) => {
            const globalIdx = startIndex + idx;
            const isChecked = modalStates.get(username) || false;
            html += `
                <li style="padding:5px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                    <label class="custom-checkbox" for="hsb_${globalIdx}" style="margin:0;">
                        <input type="checkbox" class="hideStoryCheckbox" id="hsb_${globalIdx}" data-username="${username}" ${isChecked ? "checked" : ""}>
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
        document.getElementById("hideStoryFecharBtn").onclick = () => {
            div.remove();
            modalAbertoStory = false;
        };
        document.getElementById("hideStoryMarcarTodosBtn").onclick = () => {
            document.querySelectorAll("#hideStoryList .hideStoryCheckbox").forEach(cb => {
                cb.checked = true;
                modalStates.set(cb.dataset.username, true);
            });
        };
        document.getElementById("hideStoryDesmarcarTodosBtn").onclick = () => {
            document.querySelectorAll("#hideStoryList .hideStoryCheckbox").forEach(cb => {
                cb.checked = false;
                modalStates.set(cb.dataset.username, false);
            });
        };
        const searchInput = document.getElementById("hideStorySearchInput");
        searchInput.addEventListener("input", () => {
            const filter = searchInput.value.toLowerCase();
            const listItems = div.querySelectorAll("#hideStoryList li");
            listItems.forEach(li => {
                const usernameSpan = li.children[2];
                if (usernameSpan) {
                    const text = usernameSpan.textContent.toLowerCase();
                    li.style.display = text.includes(filter) ? "" : "none";
                }
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
        document.querySelectorAll(".hideStoryCheckbox").forEach(cb => {
            cb.addEventListener("change", () => {
                modalStates.set(cb.dataset.username, cb.checked);
            });
        });
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
                updateAplicarProgressBar(i, changedUsers.length);
                await toggleOfficialCheckbox(changedUsers[i].dataset.username);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            updateAplicarProgressBar(changedUsers.length, changedUsers.length);
            changedUsers.forEach(({ dataset: { username }, checked }) => {
                officialStates.set(username, checked);
            });
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

                // Função para criar o submenu "Não segue de volta"
                function createNaoSegueDeVoltaSubmenu() {
                    // Remove submenu existente, se houver
                    const existingDiv = document.getElementById("naoSegueDeVoltaDiv");
                    if (existingDiv) existingDiv.remove();
                
                    // Cria a div do submenu
                    const div = document.createElement("div");
                    div.id = "naoSegueDeVoltaDiv";
                    div.style.cssText = `
                        position: fixed;
                        top: 10%;
                        left: 10%;
                        width: 80%;
                        height: 80%;
                        background: white;
                        border: 1px solid #ccc;
                        border-radius: 10px;
                        padding: 20px;
                        z-index: 10000;
                        overflow: auto;
                        color: black;
                    `;
                
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h2 style="color: black;">Não segue de volta</h2>
                            <button id="fecharSubmenuBtn" style="background: red; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer;">Fechar</button>
                        </div>
                        <div style="margin-top: 20px;">
                            <label for="seguidoresCsv" style="color: black; font-weight: bold;">Arquivo de Seguidores:</label>
                            <input type="file" id="seguidoresCsv" accept=".csv" />
                        </div>
                        <div style="margin-top: 20px;">
                            <label for="seguindoCsv" style="color: black; font-weight: bold;">Arquivo de Seguindo:</label>
                            <input type="file" id="seguindoCsv" accept=".csv" />
                        </div>
                        <button id="compararCsvBtn" style="margin-top: 20px;">Comparar</button>
                        <table id="naoSegueDeVoltaTable" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #ccc; padding: 10px; color: black;">ID</th>
                                    <th style="border: 1px solid #ccc; padding: 10px; color: black;">Username</th>
                                    <th style="border: 1px solid #ccc; padding: 10px; color: black;">Check</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                        <div style="margin-top: 20px;">
                            <button id="selecionarTodosBtn">Selecionar Todos</button>
                            <button id="desmarcarTodosBtn">Desmarcar Todos</button>
                            <button id="unfollowBtn">Unfollow</button>
                        </div>
                    `;
                
                    document.body.appendChild(div);
                
                    // Adiciona eventos aos botões
                    document.getElementById("fecharSubmenuBtn").addEventListener("click", () => {
                        div.remove();
                    });
                
                    document.getElementById("compararCsvBtn").addEventListener("click", compararCsv);
                
                    document.getElementById("seguindoCsv").addEventListener("change", () => {
                        const seguidoresFile = document.getElementById("seguidoresCsv").files[0];
                        const seguindoFile = document.getElementById("seguindoCsv").files[0];
                
                        if (seguidoresFile && seguindoFile && seguidoresFile.name === seguindoFile.name) {
                            alert("Os arquivos selecionados não podem ser iguais. Por favor, escolha outro arquivo.");
                            document.getElementById("seguindoCsv").value = ""; // Limpa o campo do segundo arquivo
                        }
                    });
                
                    document.getElementById("selecionarTodosBtn").addEventListener("click", selecionarTodos);
                    document.getElementById("desmarcarTodosBtn").addEventListener("click", desmarcarTodos);
                    document.getElementById("unfollowBtn").addEventListener("click", unfollowSelecionados);
                }

                function compararCsv() {
                    const seguidoresFile = document.getElementById("seguidoresCsv").files[0];
                    const seguindoFile = document.getElementById("seguindoCsv").files[0];

                    if (!seguidoresFile || !seguindoFile) {
                        alert("Por favor, selecione os dois arquivos CSV.");
                        return;
                    }

                    const seguidoresReader = new FileReader();
                    const seguindoReader = new FileReader();

                    seguidoresReader.onload = function (e) {
                        const seguidores = e.target.result.split("\n").map((line) => line.trim());
                        seguindoReader.onload = function (e) {
                            const seguindo = e.target.result.split("\n").map((line) => line.trim());
                            const naoSegueDeVolta = seguindo.filter((user) => !seguidores.includes(user));
                            preencherTabela(naoSegueDeVolta);
                        };
                        seguindoReader.readAsText(seguindoFile);
                    };
                    seguidoresReader.readAsText(seguidoresFile);
                }

                function preencherTabela(naoSegueDeVolta) {
                    const tbody = document.querySelector("#naoSegueDeVoltaTable tbody");
                    tbody.innerHTML = ""; // Limpa a tabela
                
                    const itemsPerPage = 10; // Número de itens por página
                    const maxPageButtons = 5; // Número máximo de botões de página exibidos
                    let currentPage = 1; // Página atual
                
                    function renderTable(page) {
                        tbody.innerHTML = ""; // Limpa a tabela para a nova página
                        const startIndex = (page - 1) * itemsPerPage;
                        const endIndex = Math.min(startIndex + itemsPerPage, naoSegueDeVolta.length);
                
                        naoSegueDeVolta.slice(startIndex, endIndex).forEach((username, index) => {
                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                                <td style="border: 1px solid #ccc; padding: 10px;">${startIndex + index + 1}</td>
                                <td style="border: 1px solid #ccc; padding: 10px;">
                                    <a href="https://www.instagram.com/${username}" target="_blank">${username}</a>
                                </td>
                                <td style="border: 1px solid #ccc; padding: 10px;">
                                    <input type="checkbox" class="unfollowCheckbox" data-username="${username}" />
                                </td>
                            `;
                            tbody.appendChild(tr);
                        });
                
                        updatePaginationControls();
                    }
                
                    function updatePaginationControls() {
                        const paginationDiv = document.getElementById("paginationControls");
                        if (!paginationDiv) return;
                
                        paginationDiv.innerHTML = ""; // Limpa os controles de paginação
                
                        const totalPages = Math.ceil(naoSegueDeVolta.length / itemsPerPage);
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
                        document.getElementById("naoSegueDeVoltaDiv").appendChild(paginationDiv);
                    }
                
                    renderTable(currentPage); // Renderiza a primeira página
                }

                function selecionarTodos() {
                    document.querySelectorAll(".unfollowCheckbox").forEach((checkbox) => {
                        checkbox.checked = true;
                    });
                }

                function desmarcarTodos() {
                    document.querySelectorAll(".unfollowCheckbox").forEach((checkbox) => {
                        checkbox.checked = false;
                    });
                }

                function unfollowSelecionados() {
                    const selecionados = Array.from(document.querySelectorAll(".unfollowCheckbox:checked")).map(
                        (checkbox) => checkbox.dataset.username
                    );

                    if (selecionados.length === 0) {
                        alert("Nenhum usuário selecionado para Unfollow.");
                        return;
                    }

                    alert(`Unfollow nos seguintes usuários: ${selecionados.join(", ")}`);
                    // Aqui você pode implementar a lógica de Unfollow, se necessário.
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

                // Detectar o tipo de dispositivo e executar o código apropriado
                if (isMobileDevice()) {
                    // Código para navegador de celular
document.getElementById("extrairSeguidoresBtn").addEventListener("click", () => {
    if (!window.location.href.includes("followers")) {
        alert("Você precisa estar na página de seguidores para iniciar este processo.");
        return;
    }
    usernames.clear();
    startScrollMobile();
});

document.getElementById("extrairSeguindoBtn").addEventListener("click", () => {
    if (!window.location.href.includes("following")) {
        alert("Você precisa estar na página de seguindo para iniciar este processo.");
        return;
    }
    usernames.clear();
    startScrollMobile();
});
                } else {
                    // Código para navegador de computador (já existente no script2.js)
document.getElementById("extrairSeguidoresBtn").addEventListener("click", () => {
    if (!window.location.href.includes("followers")) {
        alert("Você precisa estar na página de seguidores para iniciar este processo.");
        return;
    }
    usernames.clear();
    startScroll();
});

document.getElementById("extrairSeguindoBtn").addEventListener("click", () => {
    if (!window.location.href.includes("following")) {
        alert("Você precisa estar na página de seguindo para iniciar este processo.");
        return;
    }
    usernames.clear();
    startScroll();
});
                }
            }

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
        }
    })();

    (function () {
        function injectBlockedSearchBar() {
            if (
                window.location.pathname === "/accounts/blocked_accounts/" &&
                !document.getElementById("blockedSearchBar")
            ) {
                // Procura o container dos usuários bloqueados de forma mais flexível
                let container = null;
                // Tenta encontrar pelo seletor mais estável (últimos níveis)
                const candidates = document.querySelectorAll('div.wbloks_1.wbloks_79 > div > div > div > div:nth-child(2) > div > div > div > div:nth-child(1)');
                candidates.forEach(div => {
                    // Verifica se há pelo menos um card de usuário dentro
                    if (div.querySelector('div[role="button"]')) {
                        container = div;
                    }
                });
                if (!container) return;

                // Cria a barra de pesquisa com z-index alto e fundo branco
                const searchDiv = document.createElement("div");
                searchDiv.id = "blockedSearchBar";
                searchDiv.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60vw;
                    display: flex;
                    justify-content: center;
                    z-index: 2147483647;
                    background: white;
                    padding: 16px 0 8px 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    border-radius: 8px;
                `;

                const input = document.createElement("input");
                input.type = "text";
                input.placeholder = "Pesquisar usuário bloqueado...";
                input.style.cssText = `
                    width: 100%;
                    padding: 10px 16px;
                    font-size: 18px;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                    z-index: 2147483647;
                    background: white;
                    outline: none;
                `;
                input.autocomplete = "off";
                input.spellcheck = false;
                input.tabIndex = 0;
                input.readOnly = false;
                input.disabled = false;

                searchDiv.appendChild(input);

                // Adiciona a barra de pesquisa ao body (não ao container interno)
                document.body.appendChild(searchDiv);

                // Função de filtro
                input.addEventListener("input", function () {
                    const searchValue = input.value.trim().toLowerCase();
                    const userCards = container.querySelectorAll('div[role="button"][tabindex="0"], div[role="button"]');
                    userCards.forEach((card) => {
                        // Tenta pegar o username pelo primeiro link (a) dentro do card
                        let username = "";
                        const usernameLink = card.querySelector('a[href^="/"]');
                        if (usernameLink) {
                            username = usernameLink.innerText.trim().toLowerCase();
                        } else {
                            // Fallback: pega a primeira linha do texto do card
                            username = card.innerText.split('\n')[0].trim().toLowerCase();
                        }

                        // Sobe até o card externo (ajuste para 1 ou 2 se necessário)
                        let cardContainer = card;
                        for (let i = 0; i < 1; i++) {
                            if (cardContainer.parentElement) cardContainer = cardContainer.parentElement;
                        }

                        if (!searchValue) {
                            cardContainer.style.display = "";
                        } else if (username.includes(searchValue)) {
                            cardContainer.style.display = "";
                        } else {
                            cardContainer.style.display = "none";
                        }
                    });
                });
            }
        }
    })();

    /**
     * Simula um clique na checkbox da sua div customizada de Amigos Próximos.
     * Pode ser chamada passando o índice da checkbox (ex: 0 para a primeira).
     */
    function simularCliqueCheckboxAmigosProximos(idx) {
        // Busca o Flexbox customizado da sua lista
        const flexbox = document.querySelectorAll('#allCloseFriendsDiv [data-bloks-name="ig.components.Icon"]')[idx];
        if (flexbox) {
            const checkbox = flexbox.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.click();
            }
        }
    }

    // Exemplo de uso: simularCliqueCheckboxAmigosProximos(0); // Clica na primeira checkbox da sua lista
