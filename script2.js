javascript:(function(){
    if (window.location.href.includes("instagram.com")) {
        // Função para simular a navegação sem recarregar a página
        function navigateTo(url) {
            // Atualiza a URL no navegador sem recarregar
            history.pushState(null, '', url);
            console.log(`Navegando para: ${url}`);
        }

        // Função para inicializar os eventos de clique
        window.initializeMenuEvents = function() {
            document.getElementById('curtidasBtn').addEventListener('click', function() {
                navigateTo('https://www.instagram.com/your_activity/interactions/likes/');
            });

            document.getElementById('comentariosBtn').addEventListener('click', function() {
                navigateTo('https://www.instagram.com/your_activity/interactions/comments/');
            });

            document.getElementById('bloqueadosBtn').addEventListener('click', function() {
                navigateTo('https://www.instagram.com/accounts/access_tool/block_list/');
            });

            document.getElementById('mensagensBtn').addEventListener('click', function() {
                navigateTo('https://www.instagram.com/direct/inbox/');
            });

            console.log('Eventos de clique vinculados aos botões.');
        };
    }
})();