(function() {
    if (location.href.includes("instagram.com")) {
        function injectNaoSegueMenu() {
            let div = document.createElement("div");
            div.id = "naoSegueDiv";
            div.innerHTML = "<h3>Não Seguem de Volta</h3><table><thead><tr><th>ID</th><th>Username</th><th><input type='checkbox' id='masterCheck'></th></tr></thead><tbody></tbody></table><br><button class='naoSegueBtn' onclick='document.querySelectorAll(`.userCheck`).forEach(c=>c.checked=true)'>Selecionar Tudo</button><button class='naoSegueBtn' onclick='document.querySelectorAll(`.userCheck`).forEach(c=>c.checked=false)'>Desmarcar Tudo</button><button class='naoSegueBtn' onclick='alert(`Função de unfollow em desenvolvimento`)'>Unfollow</button>";
            document.body.appendChild(div);
        }

        // Aqui seria o código que manipula o arquivo CSV de seguidores e seguindo, mas esse código só está estruturado para injetar a interface
        injectNaoSegueMenu();
    }
})();