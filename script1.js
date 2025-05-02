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
            `;

            document.body.appendChild(mainBtn);
            document.body.appendChild(menu);

            mainBtn.addEventListener("click", () => {
                menu.style.display = menu.style.display === "flex" ? "none" : "flex";
            });

            // Functionality for buttons
            let usernames = new Set();
            let downloadStarted = false;

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

            function updateProgressBar() {
                let bar = document.getElementById("progressBar");
                let fill = document.getElementById("progressFill");
                let text = document.getElementById("progressText");

                if (!bar) {
                    bar = document.createElement("div");
                    bar.id = "progressBar";
                    bar.style.cssText =
                        "position:fixed;top:20px;left:50%;transform:translateX(-50%);width:80%;height:30px;background:#ccc;z-index:9999;color:black;font-weight:bold;font-size:14px;text-align:center;line-height:30px;";
                    fill = document.createElement("div");
                    fill.id = "progressFill";
                    fill.style.cssText =
                        "height:100%;width:0%;background:#4caf50;position:absolute;";
                    text = document.createElement("div");
                    text.id = "progressText";
                    text.style.position = "relative";
                    text.innerText = "0%";
                    bar.appendChild(fill);
                    bar.appendChild(text);
                    document.body.appendChild(bar);
                }

                const total =
                    document.querySelectorAll(".x1ul6b6.x1e558fc.x10wlt62").length ||
                    usernames.size;
                const percent = Math.min((usernames.size / total) * 100, 100);
                fill.style.width = percent + "%";
                text.innerText = `${Math.floor(percent)}% (${usernames.size}/${total})`;
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
                const interval = setInterval(() => {
                    extractUsernames();
                    updateProgressBar();

                    if (downloadStarted) {
                        clearInterval(interval);
                        return;
                    }

                    if (scrollDiv.scrollTop + scrollDiv.clientHeight >= scrollDiv.scrollHeight) {
                        waitTime += 2;
                        if (waitTime >= 10) {
                            clearInterval(interval);
                            startDownload();
                            downloadStarted = true;
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

                // Função para criar o submenu "Não segue de volta"
            document.getElementById("naoSegueDeVoltaBtn").addEventListener("click", () => {
                createNaoSegueDeVoltaSubmenu();
            });

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