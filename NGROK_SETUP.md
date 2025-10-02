# Guia para Configurar e Rodar ngrok com Backend Flask

Este guia explica como configurar e rodar o ngrok para expor seu backend Flask localmente na internet, garantindo que o ngrok encaminhe as requisições para a porta correta.

## Passos

1. **Certifique-se que o backend Flask está rodando**

   - Execute seu backend Flask localmente, por exemplo:
     ```
     python app.py
     ```
   - Verifique que ele está rodando na porta 8080 (padrão no código).

2. **Baixe e instale o ngrok**

   - Acesse https://ngrok.com/download e faça o download para seu sistema operacional.
   - Extraia o executável e coloque-o em um local acessível.

3. **Inicie o ngrok apontando para a porta correta**

   - Abra um terminal e execute:
     ```
     ngrok http 8080
   - Isso fará o ngrok criar uma URL pública que encaminha para seu backend local na porta 8080.

4. **Use a URL pública do ngrok no seu userscript**

   - Atualize a URL do backend no seu userscript para a URL HTTPS gerada pelo ngrok.
   - Exemplo:
     ```
     https://<seu-subdominio>.ngrok.io/download_story_video
     ```

5. **Teste a comunicação**

   - Acesse a URL pública do ngrok no navegador para verificar se a rota raiz responde.
   - Use Postman ou curl para testar o endpoint `/download_story_video`.

6. **Observações**

   - A versão gratuita do ngrok pode exibir uma página de aviso para novos visitantes.
   - Para evitar essa página, considere hospedar o backend em um serviço como Heroku.

## Comandos úteis

- Ver backend rodando:
  ```
  curl https://<seu-subdominio>.ngrok.io/
  ```

- Testar download de story:
  ```
  curl -X POST https://<seu-subdominio>.ngrok.io/download_story_video -H "Content-Type: application/json" -d "{\"story_url\":\"https://www.instagram.com/stories/username/story_id/\"}"
  ```

---

Se precisar de ajuda para configurar ou testar, estou à disposição.
