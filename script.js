async function buscarStories() {
  const username = document.getElementById("username").value.trim();
  const resultado = document.getElementById("resultado");
  resultado.innerHTML = "Buscando stories...";

  if (!username) {
    resultado.innerHTML = "Por favor, digite um nome de usuário.";
    return;
  }

  try {
    const res = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const data = await res.json();
    const userId = data.data.user.id;

    resultado.innerHTML = `ID do usuário: ${userId}<br><br>Para buscar stories, você precisará de um backend que acesse a API privada do Instagram com autenticação.`;

    // Aqui você pode conectar com seu backend futuramente
  } catch (error) {
    resultado.innerHTML = "Erro ao buscar perfil. Verifique se o nome está correto.";
    console.error(error);
  }
}
