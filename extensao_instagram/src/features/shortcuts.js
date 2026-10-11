/**
 * IG Tools Pro - Módulo de Atalhos de Teclado
 * Arquivo: src/features/shortcuts.js
 * Descrição: Captura de teclas, execução via XPath ou Navegação URL,
 * renderização de atalhos configurados e modal de configuração com seletor visual.
 */

(function () {
    'use strict';

    window.IGTools = window.IGTools || {};

    // Helpers seguros com fallback
    const getText = (key) => (typeof window.getText === 'function' ? window.getText(key) : key);
    const loadSettings = () => (typeof window.loadSettings === 'function' ? window.loadSettings() : {});
    const showToast = (msg, duration) => { if (typeof window.showToast === 'function') window.showToast(msg, duration); else console.log(`[IGTools Toast]: ${msg}`); };
    const getInfoIcon = () => window.infoIcon || `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:help; vertical-align: middle; margin-left: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    const simulateClick = (element) => {
        if (window.IGTools?.DOM?.simulateClick) {
            return window.IGTools.DOM.simulateClick(element);
        }
        if (typeof window.simulateClick === 'function') {
            return window.simulateClick(element);
        }
        if (element) {
            element.click();
            return true;
        }
        return false;
    };

    /**
     * Helpers de XPath / Seletores
     */
    function getFullXPath(element) {
        if (typeof window.getFullXPath === 'function') return window.getFullXPath(element);
        if (!element || element.nodeType !== 1) return "";
        if (element.getAttribute('aria-label')) {
            return `//*[@aria-label="${element.getAttribute('aria-label')}"]`;
        }
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
        if (typeof window.getAbsoluteXPath === 'function') return window.getAbsoluteXPath(element);
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
        if (typeof window.getCssSelector === 'function') return window.getCssSelector(el);
        if (!(el instanceof Element)) return "";
        const path = [];
        while (el && el.nodeType === Node.ELEMENT_NODE) {
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
        if (typeof window.startElementPicker === 'function') {
            return window.startElementPicker(callback);
        }
        if (isPickingElement) return;
        isPickingElement = true;
        showToast("🖱️ Clique em um elemento da página para capturar o XPath (ESC para cancelar)");

        const onMouseOver = (e) => {
            if (!isPickingElement) return;
            e.stopPropagation();
            if (lastHoveredElement) lastHoveredElement.classList.remove('ig-tools-highlight');
            lastHoveredElement = e.target.closest('button, a, div[role="button"]') || e.target;
            lastHoveredElement.classList.add('ig-tools-highlight');
        };

        const onClick = (e) => {
            if (!isPickingElement) return;
            e.preventDefault(); e.stopPropagation();
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

    /**
     * Obter atalhos salvos no localStorage
     */
    function getShortcuts() {
        try {
            const saved = JSON.parse(localStorage.getItem('instagram_shortcuts_v2'));
            return Array.isArray(saved) ? saved : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Salvar lista de atalhos no localStorage
     */
    function saveShortcuts(shortcuts) {
        localStorage.setItem('instagram_shortcuts_v2', JSON.stringify(shortcuts));
    }

    /**
     * Formatar atalho para exibição amigável
     */
    function formatShortcutForDisplay(shortcut) {
        if (!shortcut || !shortcut.key) return '';
        const parts = [];
        if (shortcut.ctrlKey) parts.push('Ctrl');
        if (shortcut.altKey) parts.push('Alt');
        if (shortcut.shiftKey) parts.push('Shift');
        parts.push(shortcut.key.toUpperCase());
        return parts.join(' + ');
    }

    /**
     * Executar clique via XPath
     */
    function executeXPathClick(xpath) {
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const element = result.singleNodeValue;
            if (element) {
                simulateClick(element);
                return true;
            }
            console.warn("Atalho: Nenhum elemento encontrado para o XPath:", xpath);
            return false;
        } catch (error) {
            console.error("Atalho: Erro ao executar o XPath:", xpath, error);
            return false;
        }
    }

    /**
     * Listener global para atalhos de teclado
     */
    function initShortcutListener() {
        if (document.body.dataset.shortcutsInitialized) return;
        document.body.dataset.shortcutsInitialized = 'true';

        document.addEventListener('keydown', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
                return;
            }

            if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
                return;
            }

            const shortcuts = getShortcuts();
            const shortcut = shortcuts.find(s =>
                s.key.toLowerCase() === event.key.toLowerCase() &&
                !!s.ctrlKey === event.ctrlKey &&
                !!s.altKey === event.altKey &&
                !!s.shiftKey === event.shiftKey
            );

            if (shortcut) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`Atalho '${formatShortcutForDisplay(shortcut)}' acionado.`);
                if (shortcut.xpath) {
                    executeXPathClick(shortcut.xpath);
                } else if (shortcut.link) {
                    window.location.href = shortcut.link;
                }
            }
        });
    }

    /**
     * Renderizar lista de atalhos na UI
     */
    function renderShortcuts() {
        const list = document.getElementById('shortcuts-list');
        if (!list) return;

        const shortcuts = getShortcuts();
        list.innerHTML = '';

        if (shortcuts.length === 0) {
            list.innerHTML = '<p style="color: #8e8e8e; text-align: center;">Nenhum atalho configurado.</p>';
            return;
        }

        shortcuts.forEach((shortcut, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #efefef;';

            const keyText = formatShortcutForDisplay(shortcut);
            const actionText = shortcut.xpath
                ? `XPath: ${shortcut.xpath.substring(0, 25)}${shortcut.xpath.length > 25 ? '...' : ''}`
                : (shortcut.link ? `Link: ${shortcut.link.substring(0, 25)}${shortcut.link.length > 25 ? '...' : ''}` : 'Nenhuma ação definida');

            item.innerHTML = `
                <div>
                    <strong style="font-size: 16px;">${keyText}</strong>
                    <span style="font-size: 12px; color: #8e8e8e; margin-left: 10px;">${actionText}</span>
                </div>
                <button data-index="${index}" class="delete-shortcut-btn" style="background: #ed4956; color: white; border: none; border-radius: 5px; cursor: pointer; padding: 4px 8px;">Excluir</button>
            `;
            list.appendChild(item);
        });

        document.querySelectorAll('.delete-shortcut-btn').forEach(button => {
            button.onclick = (e) => {
                const indexToDelete = parseInt(e.target.dataset.index, 10);
                let currentShortcuts = getShortcuts();
                currentShortcuts.splice(indexToDelete, 1);
                saveShortcuts(currentShortcuts);
                renderShortcuts();
            };
        });
    }

    /**
     * Modal de Configuração de Atalhos
     */
    function abrirModalAtalhos() {
        if (document.getElementById("shortcutsModal")) return;

        const div = document.createElement("div");
        div.id = "shortcutsModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 500px; border: 1px solid #ccc;
            border-radius: 10px; z-index: 10001;
        `;
        if (loadSettings().rgbBorder) {
            div.classList.add('rgb-border-effect');
        }

        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    Configurar Atalhos
                    <div class="info-tooltip">${getInfoIcon()}<span class="tooltip-text">Crie atalhos de teclado para ações rápidas ou navegação.</span></div>
                </span>
                <div class="modal-controls">
                    <button id="fecharShortcutsBtn" title="Fechar">X</button>
                </div>
            </div>
            <div style="padding: 20px;">
                <form id="shortcut-form" style="display: flex; flex-direction: column; gap: 15px;">
                    <input type="text" id="shortcut-key" placeholder="Clique aqui e pressione as teclas do atalho" required readonly style="padding: 8px; color: black; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; background: #fff;">

                    <div style="display: flex; flex-wrap: wrap; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dbdbdb; font-size: 11px; color: black;">
                        <span style="width: 100%; font-weight: bold; margin-bottom: 2px;">Modo de Captura:</span>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;"><input type="radio" name="captureType" value="xpath" checked> XPath Inteligente</label>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;"><input type="radio" name="captureType" value="fullXpath"> XPath Full</label>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;"><input type="radio" name="captureType" value="selector"> Seletor CSS</label>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;"><input type="radio" name="captureType" value="html"> OuterHTML</label>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <input type="text" id="shortcut-xpath" placeholder="O resultado aparecerá aqui após capturar..." style="flex:1; padding: 8px; color: black; border: 1px solid #ccc; border-radius: 5px;">
                        <button type="button" id="btnPickElement" style="background:#8e44ad; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;" title="Selecionar elemento na página">🎯</button>
                    </div>
                    <input type="text" id="shortcut-link" placeholder="Link de Acesso (opcional)" style="padding: 8px; color: black; border: 1px solid #ccc; border-radius: 5px;">
                    <button type="submit" style="background:#0095f6;color:white;border:none;padding:10px;border-radius:5px;cursor:pointer;">Salvar Atalho</button>
                </form>
                <hr style="border: none; border-top: 1px solid #efefef; margin: 20px 0;">
                <h3 style="margin-bottom: 10px; font-size: 16px;">Atalhos Salvos</h3>
                <div id="shortcuts-list" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        `;
        document.body.appendChild(div);

        renderShortcuts();

        const keyInput = document.getElementById('shortcut-key');
        let capturedShortcut = null;

        const handleShortcutKeyDown = (e) => {
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            capturedShortcut = {
                key: e.key.toLowerCase(),
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
            };

            keyInput.value = formatShortcutForDisplay(capturedShortcut);
            keyInput.style.borderColor = '#ccc';
        };

        keyInput.addEventListener('focus', () => {
            keyInput.value = 'Pressione as teclas do atalho...';
            keyInput.style.borderColor = '#0095f6';
            document.addEventListener('keydown', handleShortcutKeyDown, true);
        });

        keyInput.addEventListener('blur', () => {
            keyInput.style.borderColor = '#ccc';
            document.removeEventListener('keydown', handleShortcutKeyDown, true);
            if (keyInput.value === 'Pressione as teclas do atalho...') {
                keyInput.value = capturedShortcut ? formatShortcutForDisplay(capturedShortcut) : '';
            }
        });

        document.getElementById('btnPickElement').onclick = () => {
            const captureType = div.querySelector('input[name="captureType"]:checked').value;
            startElementPicker((target) => {
                let result = "";
                if (captureType === 'xpath') result = getFullXPath(target);
                else if (captureType === 'fullXpath') result = getAbsoluteXPath(target);
                else if (captureType === 'selector') result = getCssSelector(target);
                else if (captureType === 'html') result = target.outerHTML;

                document.getElementById('shortcut-xpath').value = result;
                showToast("✅ Capturado com sucesso!");
            });
        };

        document.getElementById("fecharShortcutsBtn").onclick = () => {
            document.removeEventListener('keydown', handleShortcutKeyDown, true);
            div.remove();
        };

        document.getElementById("shortcut-form").onsubmit = (e) => {
            e.preventDefault();
            const xpathInput = document.getElementById('shortcut-xpath');
            const linkInput = document.getElementById('shortcut-link');

            const xpath = xpathInput.value.trim();
            const link = linkInput.value.trim();

            if (!capturedShortcut || !capturedShortcut.key) {
                alert("Por favor, defina uma tecla de atalho válida.");
                return;
            }
            if (!xpath && !link) {
                alert("Você deve fornecer um XPath ou um Link.");
                return;
            }

            const newShortcut = { ...capturedShortcut, xpath, link };
            const shortcuts = getShortcuts();

            const existingIndex = shortcuts.findIndex(s =>
                s.key.toLowerCase() === newShortcut.key.toLowerCase() &&
                !!s.ctrlKey === newShortcut.ctrlKey &&
                !!s.altKey === newShortcut.altKey &&
                !!s.shiftKey === newShortcut.shiftKey
            );
            if (existingIndex > -1) {
                if (confirm(`Já existe um atalho para '${formatShortcutForDisplay(newShortcut)}'. Deseja substituí-lo?`)) {
                    shortcuts[existingIndex] = newShortcut;
                } else {
                    return;
                }
            } else {
                shortcuts.push(newShortcut);
            }

            saveShortcuts(shortcuts);
            renderShortcuts();

            keyInput.value = '';
            capturedShortcut = null;
            xpathInput.value = '';
            linkInput.value = '';
        };
    }

    // Inicialização automática dos listeners
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShortcutListener);
    } else {
        initShortcutListener();
    }

    // Exportação do namespace
    window.IGTools.Shortcuts = {
        getShortcuts,
        saveShortcuts,
        formatShortcutForDisplay,
        executeXPathClick,
        initShortcutListener,
        renderShortcuts,
        abrirModalAtalhos,
        startElementPicker,
        getFullXPath,
        getAbsoluteXPath,
        getCssSelector
    };

    // Aliases globais para retrocompatibilidade
    window.getShortcuts = getShortcuts;
    window.saveShortcuts = saveShortcuts;
    window.formatShortcutForDisplay = formatShortcutForDisplay;
    window.executeXPathClick = executeXPathClick;
    window.initShortcutListener = initShortcutListener;
    window.renderShortcuts = renderShortcuts;
    window.abrirModalAtalhos = abrirModalAtalhos;

})();
