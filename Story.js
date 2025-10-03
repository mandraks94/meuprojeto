// ==UserScript==
// @name         Instagram Story Downloader
// @description  Adds download buttons to Instagram stories
// @author       You
// @version      1.0
// @match        https://www.instagram.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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

        // Só habilita o botão se a URL começar com https://www.instagram.com/stories
        if (!window.location.href.startsWith("https://www.instagram.com/stories")) {
            return;
        }

        // Find story media elements
        // Broaden image selector to include all visible images inside story container
        const images = Array.from(document.querySelectorAll('img')).filter(img => {
            // Filter images that are visible and inside story container
            const style = window.getComputedStyle(img);
            return style && style.display !== 'none' && style.visibility !== 'hidden' && img.closest('article, div[role="presentation"], section');
        });
        const videos = document.querySelectorAll('video');

        images.forEach(img => {
            if (!img.parentNode.querySelector('.download-btn')) {
                const btn = document.createElement('button');
                btn.className = 'download-btn';
                btn.innerText = 'Download';
                btn.style.position = 'absolute';
                btn.style.top = '100px';
                btn.style.left = '5px';
                btn.style.zIndex = '2147483647';
                // Set background color gray for photo
                btn.style.background = 'gray';
                btn.style.color = 'white';
                btn.style.border = 'none';
                btn.style.padding = '8px 12px';
                btn.style.fontSize = '14px';
                btn.style.borderRadius = '5px';
                btn.style.cursor = 'pointer';
                btn.style.userSelect = 'none';
                btn.onclick = () => {
                    // For image URLs, force download by fetching blob and creating download link
                    if (img.src.startsWith('http')) {
                        fetch(img.src)
                            .then(response => response.blob())
                            .then(blob => {
                                const blobUrl = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = blobUrl;
                                a.download = 'story.png';
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(blobUrl);
                            })
                            .catch(err => {
                                alert('Erro ao tentar baixar a imagem: ' + err.message);
                            });
                    } else {
                        downloadMedia(img.src, 'story.png', img);
                    }
                };
                img.parentNode.style.position = 'relative';
                img.parentNode.appendChild(btn);
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
                // Set background color white for video
                btn.style.background = 'white';
                btn.style.color = 'black';
                btn.style.border = 'none';
                btn.style.padding = '8px 12px';
                btn.style.fontSize = '14px';
                btn.style.borderRadius = '5px';
                btn.style.cursor = 'pointer';
                btn.style.userSelect = 'none';
                // Try to get video source URL from sources element if available
                let videoUrl = video.src;
                const sourceElem = video.querySelector('source');
                if (sourceElem && sourceElem.src) {
                    videoUrl = sourceElem.src;
                }
                btn.onclick = async () => {
                    if (videoUrl.startsWith('blob:')) {
                        downloadMedia(videoUrl, 'story.mp4', video);
                    } else {
                        try {
                            const response = await fetch('https://meuprojeto-production-580b.up.railway.app/download_story_video', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ story_url: videoUrl })
                            });
                            if (!response.ok) {
                                throw new Error('Resposta do servidor não OK: ' + response.status);
                            }
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = 'story.mp4';
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                            alert('Erro na comunicação com o servidor de download: ' + error.message);
                        }
                    }
                };
                video.parentNode.style.position = 'relative';
                video.parentNode.appendChild(btn);
            }
        });
    }

    async function downloadMedia(url, filename, element = null) {
        console.log('downloadMedia called with:', url, filename);
        try {
            // Se a URL for um blob, tentamos capturar o conteúdo diretamente do elemento
            if (url.startsWith('blob:') && element) {
                // Para vídeo, capturar frame atual via canvas e baixar como imagem
                if (element.tagName.toLowerCase() === 'video') {
                    try {
                        // Para vídeo blob, baixar diretamente o blob sem converter para imagem
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Failed to fetch video blob');
                    const blob = await response.blob();
                    console.log('Video blob MIME type:', blob.type);
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
                        console.error('Erro ao baixar vídeo blob:', error);
                    }
                } else {
                    // Para imagens blob, tentar fetch normal
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Failed to fetch image blob');
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
                // Corrigir URL para ser absoluta se for relativa
                if (url && url.startsWith('/')) {
                    url = window.location.origin + url;
                }
                // For non-blob URLs, fetch HEAD to check content-type
                try {
                    // Removed content-type check to allow download even if content-type is not video/mp4
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
            console.error('Download error:', error);
        }
    }

    // Run on load and when stories change
    window.addEventListener('load', addDownloadButtons);
    const observer = new MutationObserver(addDownloadButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    // Periodically call addDownloadButtons to ensure buttons appear
    setInterval(addDownloadButtons, 2000);

    function openVideoDebugModal(url) {
        // Remove this function as iframe approach is not viable due to Instagram restrictions
    }
})();
