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

    function getText(key) {
        const lang = window.IGTools.Storage?.loadSettings()?.language || 'pt-BR';
        return (translations[lang] && translations[lang][key]) || (translations['pt-BR'] && translations['pt-BR'][key]) || key;
    }

    window.IGTools.I18n = {
        translations,
        getText
    };
})();
