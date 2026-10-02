// Camada 1: Core - Configurações e Constantes
window.IGTools = window.IGTools || {};

window.IGTools.Config = {
    GDRIVE_CONFIG: {
        clientId: '118908063115-j6fj7f069urt69vh5fa6ha1luh4fgvea.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.appdata',
        fileName: 'ig_tools_data.json'
    },
    DEFAULT_AVATAR: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23ccc"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 4-8 4v2h16v-2s-2-4-8-4z"/></svg>',
    INFO_ICON: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: text-bottom; margin-left: 5px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`,
    DEFAULT_SETTINGS: {
        darkMode: false,
        rgbBorder: false,
        language: 'pt-BR',
        unfollowDelay: 5000,
        itemsPerPage: 10,
        requestDelay: 250,
        requestBatchSize: 50,
        maxRequests: 0,
        anonymousStories: false,
        useApi: true,
        unfollowEmailEnabled: false,
        unfollowEmailRecipient: '',
        unfollowEmailWebhookUrl: '',
        lastUnfollowEmailCheck: 0,
        validateProfileStatus: true
    }
};
