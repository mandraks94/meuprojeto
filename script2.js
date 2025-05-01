javascript:(function(){
    if(window.location.href.includes("instagram.com")){
        // Redirecionar para a página de Curtidas
        document.getElementById('curtidasBtn').addEventListener('click', function(){
            window.location.href = 'https://www.instagram.com/your_activity/interactions/likes/';
        });

        // Redirecionar para a página de Comentários
        document.getElementById('comentariosBtn').addEventListener('click', function(){
            window.location.href = 'https://www.instagram.com/your_activity/interactions/comments/';
        });

        // Redirecionar para a página de Bloqueados
        document.getElementById('bloqueadosBtn').addEventListener('click', function(){
            window.location.href = 'https://www.instagram.com/accounts/access_tool/block_list/';
        });

        // Redirecionar para a página de Direct
        document.getElementById('mensagensBtn').addEventListener('click', function(){
            window.location.href = 'https://www.instagram.com/direct/inbox/';
        });
    }
})();
