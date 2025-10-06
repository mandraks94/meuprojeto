    // ==UserScript==
    // @name         Instagram Story Downloader
    // @description  Adds download buttons to Instagram stories
    // @author       You
    // @version      1.1
    // @match        https://www.instagram.com/*
    // @grant        none
    // ==/UserScript==

    (function() {
        'use strict';

        // Flag para controlar se a interceptação está ativa
        let interceptacaoAtiva = false;

        // Set para armazenar URLs dos segmentos baixados
        const segmentosBaixados = new Set();

        // Variável para armazenar o link do manifesto
        let linkManifesto = null;

        // Função para salvar o arquivo de concatenação para mp4 com os segmentos baixados
        function salvarScriptConcatMp4() {
            const concatCommand = Array.from(segmentosBaixados).map(f => f).join('|');
            const scriptContent = `ffmpeg -i "concat:${concatCommand}" -c copy output.mp4\n`;
            const blob = new Blob([scriptContent], {type: 'text/plain'});
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'concat_mp4.sh';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            console.log('Script concat_mp4.sh salvo para juntar os segmentos mp4.');
        }

        // Função para salvar o script para download do manifesto
        function salvarScriptDownloadManifesto() {
            if (!linkManifesto) {
                console.log('Link do manifesto não encontrado ainda. Reproduza o vídeo para capturar o manifesto.');
                return;
            }
            const scriptContent = `ffmpeg -i "${linkManifesto}" -c copy video_completo.mp4\n`;
            const blob = new Blob([scriptContent], {type: 'text/plain'});
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'download_manifest.sh';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            console.log('Script download_manifest.sh salvo para baixar o vídeo completo.');
        }

        // Função para instalar interceptação fetch/XHR para capturar vídeos
        function instalarInterceptacao() {
            if (window._interceptFetchInstalled) {
                console.log('Interceptação já instalada');
                return;
            }
            window._interceptFetchInstalled = true;

            const origFetch = window.fetch;
            window.fetch = async function(input, init) {
                const res = await origFetch.apply(this, arguments);
                try {
                    const url = (typeof input === 'string') ? input : input.url;
                    if (/\.m3u8($|\\?)/i.test(url) || /\.mpd($|\\?)/i.test(url)) {
                        linkManifesto = url;
                        console.log('Manifesto capturado:', linkManifesto);
                    }
                    if (/\.mp4($|\\?)/i.test(url) || /\.m4s($|\\?)/i.test(url) || /\.ts($|\\?)/i.test(url)) {
                        segmentosBaixados.add(url);
                        console.log('Segmento capturado:', url);
                    }
                } catch(e) {
                    console.error(e);
                }
                return res;
            };

            const origOpen = XMLHttpRequest.prototype.open;
            const origSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function(method, url) {
                this._url = url;
                return origOpen.apply(this, arguments);
            };
            XMLHttpRequest.prototype.send = function(body) {
                this.addEventListener('load', () => {
                    try {
                        const url = this._url || '';
                        if (/\.m3u8($|\\?)/i.test(url) || /\.mpd($|\\?)/i.test(url)) {
                            linkManifesto = url;
                            console.log('Manifesto capturado via XHR:', linkManifesto);
                        }
                        if (/\.mp4($|\\?)/i.test(url) || /\.m4s($|\\?)/i.test(url) || /\.ts($|\\?)/i.test(url)) {
                            segmentosBaixados.add(url);
                            console.log('Segmento capturado via XHR:', url);
                        }
                    } catch(e) {
                        console.warn('erro intercept xhr', e);
                    }
                });
                return origSend.apply(this, arguments);
            };
            console.log('Interceptador instalado: fetch + XHR. Reproduza o vídeo para capturar os recursos.');
        }

        function addDownloadButtons() {
            // Adiciona botão para extrair seguidores e seguindo na página do usuário específico
            if (window.location.href === "https://www.instagram.com/jehnfison_/") {
                if (!document.querySelector('#extract-followers-btn')) {
                    const btn = document.createElement('button');
                    btn.id = 'extract-followers-btn';
                    btn.innerText = 'Extrair Seguidores e Seguindo';
                    btn.style.position = 'fixed';
                    btn.style.top = '80px';
                    btn.style.right = '20px';
                    btn.style.zIndex = '2147483647';
                    btn.style.background = '#3897f0';
                    btn.style.color = 'white';
                    btn.style.border = 'none';
                    btn.style.padding = '10px 15px';
                    btn.style.fontSize = '16px';
                    btn.style.borderRadius = '5px';
                    btn.style.cursor = 'pointer';
                    btn.style.userSelect = 'none';
                    btn.onclick = async () => {
                        try {
                            const response = await fetch('https://meuprojeto-production-580b.up.railway.app/extract_followers_following', {
                                method: 'GET',
                            });
                            if (!response.ok) {
                                throw new Error('Resposta do servidor não OK: ' + response.status);
                            }
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = 'followers_following.json';
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                            alert('Erro na comunicação com o servidor: ' + error.message);
                        }
                    };
                    document.body.appendChild(btn);
                }
            }



            // Find story media elements
            // Only find the currently visible story image to avoid infinite loop
            const images = Array.from(document.querySelectorAll('img'));
            console.log('Images found:', images.length);
            // Remove duplicate declaration of videos variable
            // const videos = document.querySelectorAll('video');
            
            images.forEach(img => {
                if (!img.parentNode.querySelector('.download-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'download-btn';
                    btn.innerText = 'Download';
                    btn.style.zIndex = '2147483647';
                    btn.style.background = 'gray';
                    btn.style.color = 'white';
                    btn.style.border = 'none';
                    btn.style.padding = '8px 12px';
                    btn.style.fontSize = '14px';
                    btn.style.borderRadius = '5px';
                    btn.style.cursor = 'pointer';
                    btn.style.userSelect = 'none';
                    btn.onclick = () => {
                        console.log('Botão de download de imagem clicado');
                        // Start download only on click
                        const a = document.createElement('a');
                        a.href = img.src;
                        a.download = 'story.png';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    };
                    if (window.location.href.includes('stories')) {
                        btn.style.position = 'fixed';
                        btn.style.top = '20px';
                        btn.style.left = '20px';
                        btn.style.width = '40px';
                        btn.style.height = '40px';
                        btn.style.borderRadius = '50%';
                        btn.style.background = 'rgba(0,0,0,0.5)';
                        btn.style.color = 'white';
                        btn.style.fontSize = '12px';
                        btn.style.padding = '0';
                        btn.style.textAlign = 'center';
                        btn.style.lineHeight = '40px';
                        btn.style.fontWeight = 'bold';
                        btn.style.zIndex = '2147483647';
                        document.body.appendChild(btn);
                    } else {
                        btn.style.position = 'absolute';
                        btn.style.top = '10px';
                        btn.style.left = '10px';
                        img.parentNode.style.position = 'relative';
                        img.parentNode.appendChild(btn);
                    }
                }
            });
            const videos = document.querySelectorAll('video');

            images.forEach(img => {
                if (!img.parentNode.querySelector('.download-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'download-btn';
                    btn.innerText = 'Download';
                    btn.style.zIndex = '2147483647';
                    btn.style.background = 'gray';
                    btn.style.color = 'white';
                    btn.style.border = 'none';
                    btn.style.padding = '8px 12px';
                    btn.style.fontSize = '14px';
                    btn.style.borderRadius = '5px';
                    btn.style.cursor = 'pointer';
                    btn.style.userSelect = 'none';
                    btn.onclick = () => {
                        console.log('Botão de download de imagem clicado');
                        const a = document.createElement('a');
                        a.href = img.src;
                        a.download = 'story.png';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    };
                    if (window.location.href.includes('stories')) {
                        btn.style.position = 'fixed';
                        btn.style.top = '20px';
                        btn.style.left = '20px';
                        btn.style.width = '40px';
                        btn.style.height = '40px';
                        btn.style.borderRadius = '50%';
                        btn.style.background = 'rgba(0,0,0,0.5)';
                        btn.style.color = 'white';
                        btn.style.fontSize = '12px';
                        btn.style.padding = '0';
                        btn.style.textAlign = 'center';
                        btn.style.lineHeight = '40px';
                        btn.style.fontWeight = 'bold';
                        btn.style.zIndex = '2147483647';
                        document.body.appendChild(btn);
                    } else {
                        btn.style.position = 'absolute';
                        btn.style.top = '10px';
                        btn.style.left = '10px';
                        img.parentNode.style.position = 'relative';
                        img.parentNode.appendChild(btn);
                    }
                }
            });

            videos.forEach(video => {
                if (!video.parentNode.querySelector('.download-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'download-btn';
                    btn.innerText = 'Download';
                    btn.style.position = 'absolute';
                    btn.style.top = '100px';
                    btn.style.left = '5px';
                    btn.style.zIndex = '2147483647';
                    btn.style.background = 'white';
                    btn.style.color = 'black';
                    btn.style.border = 'none';
                    btn.style.padding = '8px 12px';
                    btn.style.fontSize = '14px';
                    btn.style.borderRadius = '5px';
                    btn.style.cursor = 'pointer';
                    btn.style.userSelect = 'none';

                    btn.onclick = () => {
                        let videoUrl = video.src || '';
                        const sourceElem = video.querySelector('source');
                        if (sourceElem && sourceElem.src) {
                            videoUrl = sourceElem.src;
                        }
                        if (!videoUrl && video.hasAttribute('srcset')) {
                            videoUrl = video.getAttribute('srcset').split(',')[0].split(' ')[0];
                        }
                        if (!videoUrl && video.hasAttribute('data-src')) {
                            videoUrl = video.getAttribute('data-src');
                        }
                        if (videoUrl) {
                            window.open(videoUrl, '_blank');
                        } else {
                            alert('Não foi possível encontrar o URL do vídeo para abrir em nova aba.');
                        }
                    };

                    video.parentNode.style.position = 'relative';
                    video.parentNode.appendChild(btn);
                }
            });
        }

        async function downloadMedia(url, filename, element = null) {
            console.log('downloadMedia chamado com:', url, filename);
            try {
                if (url.startsWith('blob:') && element) {
                    if (element.tagName.toLowerCase() === 'video') {
                        try {
                            const response = await fetch(url);
                            if (!response.ok) throw new Error('Falha ao buscar blob de vídeo');
                            const blob = await response.blob();
                            console.log('Tipo MIME do blob de vídeo:', blob.type);
                            if (blob.type !== 'video/mp4') {
                                alert('O arquivo de vídeo não está no formato MP4 suportado. Tipo detectado: ' + blob.type);
                                return;
                            }
                            const blobUrl = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                            const userChoice = confirm('Não foi possível baixar o vídeo automaticamente devido a restrições do navegador. Deseja abrir o vídeo em uma nova aba para baixar manualmente?');
                            if (userChoice) {
                                window.open(url, '_blank');
                            }
                            console.error('Erro ao baixar blob de vídeo:', error);
                        }
                    } else {
                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Falha ao buscar blob de imagem');
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(blobUrl);
                    }
                } else {
                    if (url && url.startsWith('/')) {
                        url = window.location.origin + url;
                    }
                    try {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    } catch (error) {
                        alert('Erro ao tentar baixar o arquivo: ' + error.message);
                        console.error('Erro ao tentar baixar o arquivo:', error);
                    }
                }
            } catch (error) {
                alert('Erro ao tentar baixar o arquivo: ' + error.message);
                console.error('Erro no download:', error);
            }
        }

        window.addEventListener('load', addDownloadButtons);
        const observer = new MutationObserver(addDownloadButtons);
        observer.observe(document.body, { childList: true, subtree: true });
        setInterval(addDownloadButtons, 2000);

    })();
