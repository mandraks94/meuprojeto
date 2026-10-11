/**
 * IG Tools Pro - Módulo de Controle de Voz
 * Arquivo: src/features/voice-control.js
 * Descrição: Reconhecimento de fala via Web Speech API, execução de comandos
 * pré-definidos e modal de gerenciamento/personalização de comandos de voz.
 */

(function () {
    'use strict';

    window.IGTools = window.IGTools || {};

    // Helpers seguros com fallback
    const loadSettings = () => (typeof window.loadSettings === 'function' ? window.loadSettings() : {});
    const getInfoIcon = () => window.infoIcon || `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:help; vertical-align: middle; margin-left: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    /**
     * Mapeamento de ações disponíveis para comandos de voz
     */
    const availableActions = [
        { value: "downloadStory", label: "Baixar Story" },
        { value: "openSettings", label: "Abrir Configurações" },
        { value: "closeMenu", label: "Fechar Menu" },
        { value: "toggleReelsScroll", label: "Rolar Reels" },
        { value: "downloadReel", label: "Baixar Reel" },
        { value: "openCloseFriends", label: "Amigos Próximos" },
        { value: "openHideStory", label: "Ocultar Story" },
        { value: "openMuted", label: "Contas Silenciadas" },
        { value: "openNotFollowingBack", label: "Não Segue de Volta" },
        { value: "openFollowing", label: "Seguindo" },
        { value: "openBlocked", label: "Bloqueados" },
        { value: "analyzeReels", label: "Análise Reels" },
        { value: "openInteractions", label: "Interações" }
    ];

    /**
     * Motor de Controle por Voz
     */
    const voiceControl = {
        recognition: null,
        isListening: false,
        commands: [],
        init: function () {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                console.warn("Web Speech API não suportada.");
                return;
            }
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.lang = loadSettings().language || 'pt-BR';
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const last = event.results.length - 1;
                const command = event.results[last][0].transcript.trim().toLowerCase();
                console.log("Comando de voz:", command);
                this.executeCommand(command);
            };

            this.recognition.onerror = (event) => {
                console.error("Erro voz:", event.error);
                if (event.error === 'not-allowed') {
                    this.stop();
                    alert("Permissão de microfone negada.");
                }
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    try { this.recognition.start(); } catch (e) { }
                }
            };

            this.loadCommands();
            if (localStorage.getItem('instagram_voice_enabled') === 'true') {
                try { this.start(); } catch (e) { console.log("Autostart voz bloqueado"); }
            }
        },
        loadCommands: function () {
            const defaults = [
                { phrase: "baixar story", action: "downloadStory", description: "Baixa o story atual" },
                { phrase: "abrir configurações", action: "openSettings", description: "Abre configurações" },
                { phrase: "fechar menu", action: "closeMenu", description: "Fecha o menu" },
                { phrase: "rolar reels", action: "toggleReelsScroll", description: "Rolagem de Reels" },
                { phrase: "baixar reel", action: "downloadReel", description: "Baixa o Reel atual" },
                { phrase: "amigos próximos", action: "openCloseFriends", description: "Menu Amigos Próximos" },
                { phrase: "ocultar story", action: "openHideStory", description: "Menu Ocultar Story" },
                { phrase: "contas silenciadas", action: "openMuted", description: "Menu Contas Silenciadas" },
                { phrase: "não segue de volta", action: "openNotFollowingBack", description: "Análise Não Segue de Volta" },
                { phrase: "seguindo", action: "openFollowing", description: "Gerenciador Seguindo" },
                { phrase: "bloqueados", action: "openBlocked", description: "Lista de Bloqueados" },
                { phrase: "análise reels", action: "analyzeReels", description: "Análise de Reels" },
                { phrase: "interações", action: "openInteractions", description: "Verificar Interações" }
            ];
            try {
                const saved = JSON.parse(localStorage.getItem('instagram_voice_commands'));
                this.commands = saved || defaults;
            } catch (e) { this.commands = defaults; }
        },
        saveCommands: function () {
            localStorage.setItem('instagram_voice_commands', JSON.stringify(this.commands));
        },
        start: function () {
            if (!this.recognition) this.init();
            if (this.recognition && !this.isListening) {
                try {
                    this.recognition.start();
                    this.isListening = true;
                    localStorage.setItem('instagram_voice_enabled', 'true');
                    console.log("Voz iniciada.");
                } catch (e) { console.error(e); }
            }
        },
        stop: function () {
            if (this.recognition && this.isListening) {
                this.recognition.stop();
                this.isListening = false;
                localStorage.setItem('instagram_voice_enabled', 'false');
                console.log("Voz parada.");
            }
        },
        toggle: function () {
            if (this.isListening) this.stop();
            else this.start();
            return this.isListening;
        },
        executeCommand: function (transcript) {
            const cmd = this.commands.find(c => transcript.includes(c.phrase.toLowerCase()));
            if (cmd) {
                console.log("Executando:", cmd.action);
                const toast = document.createElement('div');
                toast.innerText = `🎤 ${cmd.phrase}`;
                toast.style.cssText = "position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; z-index: 100000; font-size: 14px; pointer-events: none;";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);

                switch (cmd.action) {
                    case 'downloadStory':
                        if (typeof window.baixarStoryAtual === 'function') window.baixarStoryAtual();
                        break;
                    case 'openSettings':
                        if (typeof window.abrirModalConfiguracoes === 'function') window.abrirModalConfiguracoes();
                        break;
                    case 'closeMenu':
                        const m = document.querySelector('.assistive-menu');
                        if (m) m.style.display = 'none';
                        break;
                    case 'toggleReelsScroll':
                        if (typeof window.toggleRolagemAutomaticaReels === 'function') window.toggleRolagemAutomaticaReels();
                        else if (window.IGTools?.Reels?.toggleRolagemAutomaticaReels) window.IGTools.Reels.toggleRolagemAutomaticaReels();
                        break;
                    case 'downloadReel':
                        if (typeof window.baixarReelAtual === 'function') window.baixarReelAtual();
                        else if (window.IGTools?.Reels?.baixarReelAtual) window.IGTools.Reels.baixarReelAtual();
                        break;
                    case 'openCloseFriends':
                        if (typeof window.abrirModalAmigosProximos === 'function') window.abrirModalAmigosProximos();
                        else if (window.IGTools?.CloseFriends?.abrirModalAmigosProximos) window.IGTools.CloseFriends.abrirModalAmigosProximos();
                        break;
                    case 'openHideStory':
                        if (typeof window.abrirModalOcultarStory === 'function') window.abrirModalOcultarStory();
                        else if (window.IGTools?.HideStory?.abrirModalOcultarStory) window.IGTools.HideStory.abrirModalOcultarStory();
                        break;
                    case 'openMuted':
                        if (typeof window.abrirModalContasSilenciadas === 'function') window.abrirModalContasSilenciadas();
                        else if (window.IGTools?.MutedAccounts?.abrirModalContasSilenciadas) window.IGTools.MutedAccounts.abrirModalContasSilenciadas();
                        break;
                    case 'openNotFollowingBack':
                        if (typeof window.iniciarProcessoNaoSegueDeVolta === 'function') window.iniciarProcessoNaoSegueDeVolta();
                        break;
                    case 'openFollowing':
                        if (typeof window.iniciarProcessoSeguindo === 'function') window.iniciarProcessoSeguindo();
                        break;
                    case 'openBlocked':
                        if (typeof window.iniciarProcessoBloqueados === 'function') window.iniciarProcessoBloqueados();
                        else if (window.IGTools?.BlockedAccounts?.iniciarProcessoBloqueados) window.IGTools.BlockedAccounts.iniciarProcessoBloqueados();
                        break;
                    case 'analyzeReels':
                        if (typeof window.iniciarAnaliseReels === 'function') window.iniciarAnaliseReels();
                        else if (window.IGTools?.Reels?.iniciarAnaliseReels) window.IGTools.Reels.iniciarAnaliseReels();
                        break;
                    case 'openInteractions':
                        if (typeof window.abrirModalInteracoes === 'function') window.abrirModalInteracoes();
                        else if (window.IGTools?.ProfileInteractions?.abrirModalInteracoes) window.IGTools.ProfileInteractions.abrirModalInteracoes();
                        break;
                }
            }
        }
    };

    /**
     * Modal de Configuração de Comandos de Voz
     */
    function abrirModalComandosVoz() {
        if (document.getElementById("voiceCommandsModal")) return;

        const div = document.createElement("div");
        div.id = "voiceCommandsModal";
        div.className = "submenu-modal";
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 500px; border: 1px solid #ccc;
            border-radius: 10px; z-index: 10001; max-height: 90vh; overflow-y: auto;
        `;
        if (loadSettings().rgbBorder) {
            div.classList.add('rgb-border-effect');
        }

        const isListening = voiceControl.isListening;

        div.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">
                    Comandos de Voz
                    <div class="info-tooltip">${getInfoIcon()}<span class="tooltip-text">Controle o script usando sua voz.</span></div>
                </span>
                <div class="modal-controls">
                    <button id="fecharVoiceBtn" title="Fechar">X</button>
                </div>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 20px; text-align: center;">
                    <button id="toggleVoiceBtn" style="background: ${isListening ? '#e74c3c' : '#2ecc71'}; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-size: 16px; font-weight: bold;">
                        ${isListening ? '🛑 Parar Escuta' : '🎙️ Iniciar Escuta'}
                    </button>
                    <p id="voiceStatusText" style="font-size: 12px; color: #666; margin-top: 5px;">Status: ${isListening ? 'Ouvindo...' : 'Parado'}</p>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="font-size: 16px; margin: 0;">Lista de Comandos</h3>
                    <button id="addVoiceCommandBtn" style="background: #0095f6; color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-weight: bold; font-size: 18px;">+</button>
                </div>

                <div id="voiceCommandForm" style="display: none; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #dbdbdb;">
                    <h4 id="formTitle" style="margin-top: 0; margin-bottom: 10px; font-size: 14px;">Novo Comando</h4>
                    <input type="hidden" id="editIndex" value="-1">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 12px; margin-bottom: 5px;">Frase de Comando:</label>
                        <input type="text" id="commandPhrase" placeholder="Ex: abrir menu" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc; box-sizing: border-box; color: black;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 12px; margin-bottom: 5px;">Ação:</label>
                        <select id="commandAction" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc; box-sizing: border-box; color: black;">
                            ${availableActions.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancelCommandBtn" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Cancelar</button>
                        <button id="saveCommandBtn" style="background: #0095f6; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Salvar</button>
                    </div>
                </div>

                <div id="voiceCommandsList" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 5px;"></div>
            </div>
        `;
        document.body.appendChild(div);

        const formDiv = document.getElementById('voiceCommandForm');
        const phraseInput = document.getElementById('commandPhrase');
        const actionSelect = document.getElementById('commandAction');
        const editIndexInput = document.getElementById('editIndex');
        const formTitle = document.getElementById('formTitle');

        const renderList = () => {
            const list = document.getElementById('voiceCommandsList');
            list.innerHTML = '';
            if (voiceControl.commands.length === 0) {
                list.innerHTML = '<div style="padding: 15px; text-align: center; color: #888;">Nenhum comando configurado.</div>';
                return;
            }
            voiceControl.commands.forEach((cmd, index) => {
                const item = document.createElement('div');
                item.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;";

                const actionLabel = availableActions.find(a => a.value === cmd.action)?.label || cmd.action;

                item.innerHTML = `
                    <div>
                        <div style="font-weight: bold; color: #333;">"${cmd.phrase}"</div>
                        <div style="font-size: 12px; color: #888;">Ação: ${actionLabel}</div>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="edit-voice-btn" data-index="${index}" style="background: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">✏️</button>
                        <button class="delete-voice-btn" data-index="${index}" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">🗑️</button>
                    </div>
                `;
                list.appendChild(item);
            });

            document.querySelectorAll('.delete-voice-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    if (confirm('Excluir este comando?')) {
                        voiceControl.commands.splice(idx, 1);
                        voiceControl.saveCommands();
                        renderList();
                    }
                };
            });

            document.querySelectorAll('.edit-voice-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    const cmd = voiceControl.commands[idx];
                    phraseInput.value = cmd.phrase;
                    actionSelect.value = cmd.action;
                    editIndexInput.value = idx;
                    formTitle.innerText = "Editar Comando";
                    formDiv.style.display = 'block';
                    phraseInput.focus();
                };
            });
        };

        renderList();

        document.getElementById("fecharVoiceBtn").onclick = () => div.remove();

        document.getElementById("toggleVoiceBtn").onclick = () => {
            const listening = voiceControl.toggle();
            const btn = document.getElementById("toggleVoiceBtn");
            const status = document.getElementById("voiceStatusText");

            if (listening) {
                btn.style.background = '#e74c3c';
                btn.innerText = '🛑 Parar Escuta';
                status.innerText = 'Status: Ouvindo...';
            } else {
                btn.style.background = '#2ecc71';
                btn.innerText = '🎙️ Iniciar Escuta';
                status.innerText = 'Status: Parado';
            }
        };

        document.getElementById("addVoiceCommandBtn").onclick = () => {
            phraseInput.value = '';
            actionSelect.selectedIndex = 0;
            editIndexInput.value = -1;
            formTitle.innerText = "Novo Comando";
            formDiv.style.display = 'block';
            phraseInput.focus();
        };

        document.getElementById("cancelCommandBtn").onclick = () => {
            formDiv.style.display = 'none';
        };

        document.getElementById("saveCommandBtn").onclick = () => {
            const phrase = phraseInput.value.trim().toLowerCase();
            const action = actionSelect.value;
            const idx = parseInt(editIndexInput.value);

            if (!phrase) return alert("Digite uma frase para o comando.");

            const newCmd = {
                phrase,
                action,
                description: availableActions.find(a => a.value === action)?.label
            };

            if (idx >= 0) {
                voiceControl.commands[idx] = newCmd;
            } else {
                if (voiceControl.commands.some(c => c.phrase === phrase)) {
                    return alert("Já existe um comando com essa frase.");
                }
                voiceControl.commands.push(newCmd);
            }

            voiceControl.saveCommands();
            renderList();
            formDiv.style.display = 'none';
        };
    }

    // Exportação do namespace
    window.IGTools.VoiceControl = {
        voiceControl,
        abrirModalComandosVoz,
        availableActions
    };

    // Aliases globais
    window.voiceControl = voiceControl;
    window.abrirModalComandosVoz = abrirModalComandosVoz;

})();
