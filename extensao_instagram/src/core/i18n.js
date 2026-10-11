// Camada 1: Core - Internacionalização (i18n)
window.IGTools = window.IGTools || {};

(function () {
    const translations = {
        'pt-BR': {
            likes: 'Curtidas', comments: 'Comentários', blocked: 'Bloqueados', messages: 'Mensagens',
            notFollowingBack: 'Não segue de volta', following: 'Seguindo', closeFriends: 'Amigos Próximos',
            hideStory: 'Ocultar Story', mutedAccounts: 'Contas Silenciadas', interactions: 'Interações',
            reelsMenu: 'Menu de Reels', downloadStory: 'Baixar Story', settings: 'Configurações',
            darkMode: 'Modo Escuro', rgbBorder: 'Borda RGB', shortcuts: 'Atalhos', parameters: 'Parâmetros',
            language: 'Idioma', anonymousStories: 'Stories Anônimo', useApi: 'Usar API (Rápido)',
            validateProfileStatus: 'Validar Status (P/A)'
        },
        'en-US': {
            likes: 'Likes', comments: 'Comments', blocked: 'Blocked', messages: 'Messages',
            notFollowingBack: 'Not Following Back', following: 'Following', closeFriends: 'Close Friends',
            hideStory: 'Hide Story', mutedAccounts: 'Muted Accounts', interactions: 'Interactions',
            reelsMenu: 'Reels Menu', downloadStory: 'Download Story', settings: 'Settings',
            darkMode: 'Dark Mode', rgbBorder: 'RGB Border', shortcuts: 'Shortcuts', parameters: 'Parameters',
            language: 'Language', anonymousStories: 'Anonymous Stories', useApi: 'Use API (Fast)',
            validateProfileStatus: 'Validate Status (P/O)'
        },
        'es-ES': {
            likes: 'Me gusta', comments: 'Comentarios', blocked: 'Bloqueados', messages: 'Mensajes',
            notFollowingBack: 'No te sigue', following: 'Siguiendo', closeFriends: 'Mejores Amigos',
            hideStory: 'Ocultar Historia', mutedAccounts: 'Cuentas Silenciadas', interactions: 'Interacciones',
            reelsMenu: 'Menú de Reels', downloadStory: 'Descargar Historia', settings: 'Configuración',
            darkMode: 'Modo Oscuro', rgbBorder: 'Borde RGB', shortcuts: 'Atajos', parameters: 'Parámetros',
            language: 'Idioma', anonymousStories: 'Historias Anónimas', useApi: 'Usar API (Rápido)',
            validateProfileStatus: 'Validar Estado (P/A)'
        },
        'fr-FR': {
            likes: 'J\'aime', comments: 'Commentaires', blocked: 'Bloqués', messages: 'Messages',
            notFollowingBack: 'Ne suit pas en retour', following: 'Abonnements', closeFriends: 'Amis Proches',
            hideStory: 'Masquer Story', mutedAccounts: 'Comptes Muets', interactions: 'Interactions',
            reelsMenu: 'Menu Reels', downloadStory: 'Télécharger Story', settings: 'Paramètres',
            darkMode: 'Mode Sombre', rgbBorder: 'Bordure RGB', shortcuts: 'Raccourcis', parameters: 'Paramètres',
            language: 'Langue', anonymousStories: 'Stories Anonymes', useApi: 'Utiliser API (Rapide)',
            validateProfileStatus: 'Valider Statut (P/O)'
        },
        'it-IT': {
            likes: 'Mi piace', comments: 'Commenti', blocked: 'Bloccati', messages: 'Messaggi',
            notFollowingBack: 'Non ti segue', following: 'Seguiti', closeFriends: 'Amici Più Stretti',
            hideStory: 'Nascondi Storia', mutedAccounts: 'Account Silenziati', interactions: 'Interazioni',
            reelsMenu: 'Menu Reels', downloadStory: 'Scarica Storia', settings: 'Impostazioni',
            darkMode: 'Modalità Scura', rgbBorder: 'Bordo RGB', shortcuts: 'Scorciatoie', parameters: 'Parametri',
            language: 'Lingua', anonymousStories: 'Storie Anonime', useApi: 'Usa API (Veloce)',
            validateProfileStatus: 'Valida Stato (P/A)'
        },
        'de-DE': {
            likes: 'Gefällt mir', comments: 'Kommentare', blocked: 'Blockiert', messages: 'Nachrichten',
            notFollowingBack: 'Folgt nicht zurück', following: 'Abonniert', closeFriends: 'Engste Freunde',
            hideStory: 'Story verbergen', mutedAccounts: 'Stummgeschaltete', interactions: 'Interaktionen',
            reelsMenu: 'Reels Menü', downloadStory: 'Story herunterladen', settings: 'Einstellungen',
            darkMode: 'Dunkelmodus', rgbBorder: 'RGB-Rand', shortcuts: 'Verknüpfungen', parameters: 'Parameter',
            language: 'Sprache', anonymousStories: 'Anonyme Stories', useApi: 'API verwenden (Schnell)',
            validateProfileStatus: 'Status validieren (P/Ö)'
        }
    };

    function getCurrentLanguage() {
        try {
            if (window.IGTools?.Storage?.loadSettings) {
                return window.IGTools.Storage.loadSettings()?.language || 'pt-BR';
            }
            if (typeof window.loadSettings === 'function') {
                return window.loadSettings()?.language || 'pt-BR';
            }
            const saved = JSON.parse(localStorage.getItem('instagramToolsSettings_v2') || '{}');
            return saved.language || 'pt-BR';
        } catch (_) {
            return 'pt-BR';
        }
    }

    function getText(key) {
        const lang = getCurrentLanguage();
        return (translations[lang] && translations[lang][key]) || (translations['pt-BR'] && translations['pt-BR'][key]) || key;
    }

    function updateInterfaceLanguage(lang) {
        if (!lang) return;
        
        // 1. Salva a preferência
        try {
            if (window.IGTools?.Storage?.saveSettings) {
                window.IGTools.Storage.saveSettings({ language: lang });
            } else if (typeof window.saveSettings === 'function') {
                window.saveSettings({ language: lang });
            } else {
                const current = JSON.parse(localStorage.getItem('instagramToolsSettings_v2') || '{}');
                current.language = lang;
                localStorage.setItem('instagramToolsSettings_v2', JSON.stringify(current));
            }
        } catch (e) {
            console.error("[IG Tools i18n] Erro ao salvar idioma:", e);
        }

        // 2. Atualiza elementos com atributo data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const trans = (translations[lang] && translations[lang][key]) || (translations['pt-BR'] && translations['pt-BR'][key]) || key;
                if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                    el.value = trans;
                } else {
                    el.textContent = trans;
                }
            }
        });

        // 3. Atualiza os itens do menu flutuante (assistive-menu) caso não possuam data-i18n ainda
        const menuSelectors = {
            '#curtidasBtn': 'likes',
            '#comentariosBtn': 'comments',
            '#bloqueadosBtn': 'blocked',
            '#mensagensBtn': 'messages',
            '#naoSegueDeVoltaBtn': 'notFollowingBack',
            '#seguindoBtn': 'following',
            '#closeFriendsBtn': 'closeFriends',
            '#hideStoryBtn': 'hideStory',
            '#mutedAccountsBtn': 'mutedAccounts',
            '#interacoesBtn': 'interactions',
            '#reelsMenuBtn': 'reelsMenu',
            '#baixarStoryBtn': 'downloadStory',
            '#settingsBtn': 'settings'
        };

        Object.entries(menuSelectors).forEach(([btnId, k]) => {
            const btn = document.querySelector(btnId);
            if (btn && btn.parentElement) {
                const span = btn.parentElement.querySelector('span');
                if (span) {
                    const trans = (translations[lang] && translations[lang][k]) || (translations['pt-BR'] && translations['pt-BR'][k]) || k;
                    span.textContent = trans;
                    span.setAttribute('data-i18n', k);
                }
            }
        });

        // 4. Atualiza o modal de configurações se estiver aberto
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            const titleEl = settingsModal.querySelector('.modal-title');
            if (titleEl) {
                const textNodes = Array.from(titleEl.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    textNodes[0].textContent = (translations[lang] && translations[lang]['settings']) || 'Configurações';
                }
            }
        }

        // 5. Emite evento para que qualquer componente possa reagir
        window.dispatchEvent(new CustomEvent('igtools:languageChanged', { detail: { language: lang } }));
    }

    window.IGTools.I18n = {
        translations,
        getText,
        updateInterfaceLanguage,
        getCurrentLanguage
    };

    window.getText = getText;
    window.updateInterfaceLanguage = updateInterfaceLanguage;
})();
