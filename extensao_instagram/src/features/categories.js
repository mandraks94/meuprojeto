/**
 * ============================================================================
 * Instagram Tools - Módulo 7: Gerenciador de Categorias & Tags
 * Arquivo: src/features/categories.js
 * Descrição: Sistema para criação, edição, exclusão e associação de categorias/etiquetas
 *            personalizadas para perfis do Instagram. Suporta ações automáticas vinculadas
 *            (Amigos Próximos, Silenciar, Ocultar Story) e sincronização com IndexedDB/Cache.
 * ============================================================================
 */

(() => {
    'use strict';

    window.IGTools = window.IGTools || {};

    const getSettings = () => {
        if (typeof window.loadSettings === 'function') return window.loadSettings();
        try {
            return JSON.parse(localStorage.getItem('ig_tools_settings') || '{}');
        } catch (_) {
            return {};
        }
    };

    const showNotification = (msg) => {
        if (typeof window.showToast === 'function') window.showToast(msg);
        else console.log('[IG Tools Categories]', msg);
    };

    const setLoader = (show, progress = null, text = '') => {
        if (typeof window.toggleLoading === 'function') window.toggleLoading(show, progress, text);
    };

    const getDb = () => {
        return window.IGTools?.Storage?.dbHelper || window.dbHelper || null;
    };

    /**
     * Abre o modal completo para gerenciamento (criação, edição e exclusão) de categorias.
     */
    async function abrirModalGerenciarCategorias() {
        if (document.getElementById("manageCategoriesModal")) return;

        const db = getDb();
        if (!db) {
            alert("Banco de dados local não inicializado.");
            return;
        }

        const div = document.createElement("div");
        div.id = "manageCategoriesModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 400px; border: 1px solid #ccc;
            border-radius: 10px; z-index: 10002; max-height: 80vh; overflow-y: auto;
        `;
        if (getSettings().rgbBorder) div.classList.add('rgb-border-effect');

        const render = async () => {
            const categories = await db.loadCategories();
            let html = `
                <div class="modal-header">
                    <span class="modal-title">🏷️ Gerenciar Categorias</span>
                    <div class="modal-controls"><button id="fecharCategoriasBtn" title="Fechar">X</button></div>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin:0 0 10px 0;">Nova Categoria</h4>
                        <div style="display:flex; flex-direction:column; gap: 10px;">
                            <div style="display:flex; gap: 10px;">
                                <input type="text" id="newCategoryName" placeholder="Nome da Categoria" style="flex: 1; padding: 8px; color: black; border-radius: 5px; border: 1px solid #dbdbdb;">
                                <input type="color" id="newCategoryColor" value="#3498db" style="padding: 0; border: none; background: transparent; width: 40px; height: 40px; cursor: pointer;">
                            </div>
                            <div class="auto-actions-box">
                                <span style="width: 100%; font-weight: bold; margin-bottom: 2px;">Ações Automáticas:</span>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span>🌟 Amigos Próximos</span><label class="switch"><input type="checkbox" id="newCatActionCF"><span class="slider"></span></label>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span>🔇 Silenciar</span><label class="switch"><input type="checkbox" id="newCatActionMute"><span class="slider"></span></label>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span>👁️ Ocultar Story</span><label class="switch"><input type="checkbox" id="newCatActionHide"><span class="slider"></span></label>
                                </div>
                            </div>
                            <button id="addCategoryBtn" style="padding: 8px 12px; background: #2ecc71; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Adicionar</button>
                        </div>
                    </div>
                    <div>
                        <h4 style="margin:0 0 10px 0;">Categorias Existentes</h4>
                        <div id="categoriesList" style="display: flex; flex-direction: column; gap: 8px;">
                            ${categories.length === 0 ? '<p style="color: #888;">Nenhuma categoria criada.</p>' :
                    categories.map(cat => `
                                <div class="category-item-container" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-radius: 5px;">
                                    <div>
                                        <span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background-color: ${cat.color}; margin-right: 8px; vertical-align: middle;"></span>
                                        <span style="font-weight: bold;">${cat.name}</span>
                                        <span style="font-size: 10px; color: #888; margin-left: 5px;" title="Ações Automáticas">
                                            ${cat.actions?.cf ? '🌟' : ''} ${cat.actions?.mute ? '🔇' : ''} ${cat.actions?.hide ? '👁️' : ''}
                                        </span>
                                    </div>
                                    <div style="display: flex; gap: 5px;">
                                        <button class="edit-category-btn" data-id="${cat.id}" style="background: #f39c12; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px; line-height: 24px;" title="Editar">✎</button>
                                        <button class="delete-category-btn" data-id="${cat.id}" style="background: #e74c3c; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px; line-height: 24px;" title="Excluir">X</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            div.innerHTML = html;

            const fecharBtn = document.getElementById("fecharCategoriasBtn");
            if (fecharBtn) fecharBtn.onclick = () => div.remove();

            const addBtn = document.getElementById("addCategoryBtn");
            if (addBtn) {
                addBtn.onclick = async () => {
                    const nameInput = document.getElementById("newCategoryName");
                    const colorInput = document.getElementById("newCategoryColor");
                    const name = nameInput.value.trim();
                    if (!name) return alert("O nome da categoria não pode ser vazio.");

                    await db.saveCategory({
                        id: `cat_${Date.now()}`,
                        name: name,
                        color: colorInput.value,
                        actions: {
                            cf: document.getElementById('newCatActionCF').checked,
                            mute: document.getElementById('newCatActionMute').checked,
                            hide: document.getElementById('newCatActionHide').checked
                        }
                    });
                    nameInput.value = '';
                    render();
                };
            }

            div.querySelectorAll('.edit-category-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.target.dataset.id;
                    const loadedCats = await db.loadCategories();
                    const cat = loadedCats.find(c => c.id === id);
                    if (!cat) return;

                    const nameInput = document.getElementById("newCategoryName");
                    const colorInput = document.getElementById("newCategoryColor");
                    const cfCheck = document.getElementById('newCatActionCF');
                    const muteCheck = document.getElementById('newCatActionMute');
                    const hideCheck = document.getElementById('newCatActionHide');
                    const mainAddBtn = document.getElementById('addCategoryBtn');

                    nameInput.value = cat.name;
                    colorInput.value = cat.color;
                    cfCheck.checked = !!cat.actions?.cf;
                    muteCheck.checked = !!cat.actions?.mute;
                    hideCheck.checked = !!cat.actions?.hide;

                    mainAddBtn.innerText = "Salvar Alterações";
                    mainAddBtn.style.background = "#3498db";

                    const originalOnclick = mainAddBtn.onclick;
                    mainAddBtn.onclick = async () => {
                        await db.saveCategory({
                            id: id,
                            name: nameInput.value.trim(),
                            color: colorInput.value,
                            actions: { cf: cfCheck.checked, mute: muteCheck.checked, hide: hideCheck.checked }
                        });
                        nameInput.value = '';
                        mainAddBtn.innerText = "Adicionar";
                        mainAddBtn.style.background = "#2ecc71";
                        cfCheck.checked = false;
                        muteCheck.checked = false;
                        hideCheck.checked = false;
                        mainAddBtn.onclick = originalOnclick;
                        render();
                    };
                };
            });

            div.querySelectorAll('.delete-category-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const catId = e.target.dataset.id;
                    if (confirm("Tem certeza que deseja excluir esta categoria? Ela será removida de todos os usuários.")) {
                        await db.deleteCategory(catId);
                        render();
                    }
                };
            });
        };

        document.body.appendChild(div);
        await render();
    }

    /**
     * Abre o modal para associar ou desassociar categorias a uma lista de usuários selecionados.
     * @param {string[]} usernames - Array com usernames a serem categorizados.
     */
    async function abrirModalAdicionarACategoria(usernames) {
        if (!Array.isArray(usernames) || usernames.length === 0) {
            return alert("Nenhum usuário selecionado.");
        }
        if (document.getElementById("addToCategoryModal")) return;

        const db = getDb();
        if (!db) {
            alert("Banco de dados local não inicializado.");
            return;
        }

        const categories = await db.loadCategories();
        if (categories.length === 0) {
            return alert("Nenhuma categoria criada. Crie categorias em 'Gerenciar Categorias' primeiro.");
        }

        const div = document.createElement("div");
        div.id = "addToCategoryModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 400px; border: 1px solid #ccc;
            border-radius: 10px; z-index: 10002;
        `;
        if (getSettings().rgbBorder) div.classList.add('rgb-border-effect');

        let html = `
            <div class="modal-header">
                <span class="modal-title">🏷️ Categorias para ${usernames.length} usuário(s)</span>
                <div class="modal-controls"><button id="fecharAddToCatBtn" title="Fechar">X</button></div>
            </div>
            <div style="padding: 20px;">
                <p style="margin-top: 0;">Selecione as categorias:</p>
                <div id="categoryChecklist" style="display: flex; flex-direction: column; gap: 10px; max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
                    ${categories.map(cat => `
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" class="category-checkbox" value="${cat.id}">
                            <span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background-color: ${cat.color};"></span>
                            <span>${cat.name}</span>
                        </label>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancelAddToCatBtn" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Cancelar</button>
                    <button id="removeUserCategoriesBtn" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Remover</button>
                    <button id="addUserCategoriesBtn" style="background: #0095f6; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Adicionar</button>
                </div>
            </div>
        `;
        div.innerHTML = html;
        document.body.appendChild(div);

        const close = () => div.remove();
        document.getElementById("fecharAddToCatBtn").onclick = close;
        document.getElementById("cancelAddToCatBtn").onclick = close;

        document.getElementById("addUserCategoriesBtn").onclick = async () => {
            const selectedCategoryIds = Array.from(div.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);

            const allUserCategories = await db.loadAllUserCategories();

            setLoader(true, 0);
            for (const username of usernames) {
                const existingCategories = allUserCategories.get(username.toLowerCase()) || [];
                const newCategories = new Set([...existingCategories, ...selectedCategoryIds]);
                allUserCategories.set(username.toLowerCase(), Array.from(newCategories));
            }
            await db.saveAllUserCategories(allUserCategories);

            showNotification(`✅ ${usernames.length} usuário(s) atualizados com sucesso!`);
            close();

            // Recarrega o modal de "Seguindo" para refletir as mudanças caso esteja aberto
            const seguindoModal = document.getElementById("seguindoModal");
            if (seguindoModal) {
                seguindoModal.remove();
                if (typeof window.iniciarProcessoSeguindo === 'function') {
                    setTimeout(() => window.iniciarProcessoSeguindo(), 0);
                }
            }
            setLoader(false);
        };

        document.getElementById("removeUserCategoriesBtn").onclick = async () => {
            const selectedCategoryIds = Array.from(div.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);
            const allUserCategories = await db.loadAllUserCategories();

            setLoader(true, 0);
            for (const username of usernames) {
                const existingCategories = allUserCategories.get(username.toLowerCase()) || [];
                const newCategories = existingCategories.filter(id => !selectedCategoryIds.includes(id));
                allUserCategories.set(username.toLowerCase(), newCategories);
            }
            await db.saveAllUserCategories(allUserCategories);
            showNotification(`✅ Categorias removidas de ${usernames.length} usuário(s)!`);
            close();

            // Recarrega o modal de "Seguindo" para refletir as mudanças caso esteja aberto
            const seguindoModal = document.getElementById("seguindoModal");
            if (seguindoModal) {
                seguindoModal.remove();
                if (typeof window.iniciarProcessoSeguindo === 'function') {
                    setTimeout(() => window.iniciarProcessoSeguindo(), 0);
                }
            }
            setLoader(false);
        };
    }

    // Exportação para o barramento oficial e aliases globais
    window.IGTools.Categories = {
        abrirModalGerenciarCategorias,
        abrirModalAdicionarACategoria
    };

    window.abrirModalGerenciarCategorias = abrirModalGerenciarCategorias;
    window.abrirModalAdicionarACategoria = abrirModalAdicionarACategoria;

    console.log('[IG Tools] Módulo 7 (Categorias & Tags) carregado com sucesso.');
})();
