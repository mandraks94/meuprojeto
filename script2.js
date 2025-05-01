javascript:(function(){
    if (window.location.href.includes("instagram.com")) {
        // Função para simular a navegação sem recarregar a página
        function navigateTo(url) {
            // Atualiza a URL no navegador sem recarregar
            history.pushState(null, '', url);

            // Simula o carregamento do conteúdo (você pode personalizar isso)
            document.body.innerHTML = `<h1>Carregando conteúdo de ${url}...</h1>`;
            
            // Aqui você pode adicionar lógica para carregar o conteúdo dinamicamente
            // Exemplo: Fazer uma requisição AJAX para buscar o conteúdo da página
        }

        // Adiciona os eventos de clique
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
    }
})();
