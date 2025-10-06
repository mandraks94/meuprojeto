// ==UserScript==
// @name         Instagram Story and Feed Downloader
// @description  Adds download buttons to Instagram stories, feed images, and videos
// @author       You
// @version      1.0
// @match        https://www.instagram.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function addDownloadButtons() {
        // Download stories images and videos - only on URLs containing https://www.instagram.com/stories
        if (window.location.href.startsWith("https://www.instagram.com/stories")) {
            // Use a broader selector to catch story images and videos
            const imgs = document.querySelectorAll('img[src*="scontent"], img[src*="cdninstagram"]');
            imgs.forEach(img => {
                if (!img.dataset.downloadInjected) {
                    const btn = document.createElement('button');
                    btn.className = 'download-btn-story';
                    btn.innerText = 'Download Story';
                    btn.style.position = 'absolute';
                    btn.style.top = '100px';
                    btn.style.left = '5px';
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
                        downloadMedia(img.src, 'story.png', img);
                    };
                    img.parentNode.style.position = 'relative';
                    img.parentNode.appendChild(btn);
                    img.dataset.downloadInjected = "true";
                }
            });
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                if (!video.parentNode.dataset.downloadInjected) {
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
                    video.parentNode.dataset.downloadInjected = "true";
                }
            });
        }

        // Download feed images - only on URLs NOT starting with https://www.instagram.com/stories
        if (!window.location.href.startsWith("https://www.instagram.com/stories")) {
            // Select all images inside article, including those in carousels and multi-photo posts
            const feedImages = Array.from(document.querySelectorAll('article img'));
            // Also select images inside carousel <li> elements with class "acaz"
            const carouselImages = Array.from(document.querySelectorAll('li.acaz img'));
            const allFeedImages = [...new Set([...feedImages, ...carouselImages])];
            allFeedImages.forEach(img => {
                // Avoid adding button to story images
                if (img.closest('div[role="presentation"]')) {
                    return; // skip images inside story container
                }
                // Add download button only if not already added
                if (!img.parentNode.querySelector('.download-btn-feed')) {
                    const btn = document.createElement('button');
                    btn.className = 'download-btn-feed';
                    btn.innerText = 'Download Feed Image';
                    btn.style.position = 'absolute';
                    btn.style.top = '5px';
                    btn.style.left = '5px';
                    btn.style.zIndex = '2147483647';
                    btn.style.background = 'red'; // fundo vermelho para imagens do feed
                    btn.style.color = 'white';
                    btn.style.border = 'none';
                    btn.style.padding = '5px 8px';
                    btn.style.fontSize = '12px';
                    btn.style.borderRadius = '3px';
                    btn.style.cursor = 'pointer';
                    btn.style.userSelect = 'none';
                    btn.onclick = () => {
                        downloadMedia(img.src, 'feed_image.jpg', img);
                    };
                    img.parentNode.style.position = 'relative';
                    img.parentNode.appendChild(btn);
                }
            });
        }

        // Download videos
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            // Check if video is inside story container
            if (!video.closest('div[role="presentation"]')) {
                return; // skip videos not in story container
            }
            if (!video.parentNode.querySelector('.download-btn-video')) {
                const btn = document.createElement('button');
                btn.className = 'download-btn-video';
                btn.innerText = 'Download Video';
                btn.style.position = 'absolute';
                btn.style.top = '5px';
                btn.style.left = '5px';
                btn.style.zIndex = '2147483647';
                btn.style.background = 'white'; // fundo branco para vídeos do story
                btn.style.color = 'black';
                btn.style.border = 'none';
                btn.style.padding = '5px 8px';
                btn.style.fontSize = '12px';
                btn.style.borderRadius = '3px';
                btn.style.cursor = 'pointer';
                btn.style.userSelect = 'none';
                btn.onclick = () => {
                    let videoUrl = video.currentSrc || video.src;
                    downloadMedia(videoUrl, 'video.mp4', video);
                };
                video.parentNode.style.position = 'relative';
                video.parentNode.appendChild(btn);
            }
        });
    }

    async function downloadMedia(url, filename, element = null) {
        try {
            const realUrl = element?.currentSrc || url;
            // For mobile devices, open media in new tab for manual download
            if (/Mobi|Android/i.test(navigator.userAgent)) {
                window.open(realUrl, '_blank');
                alert('Download automático não suportado em dispositivos móveis. O arquivo foi aberto em uma nova aba para download manual.');
                return;
            }
            const response = await fetch(realUrl);
            if (!response.ok) throw new Error('Failed to fetch media');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            alert('Erro ao tentar baixar o arquivo: ' + error.message);
            console.error('Download error:', error);
        }
    }

    window.addEventListener('load', addDownloadButtons);
    let debounceTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(addDownloadButtons, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(addDownloadButtons, 1000);
})();
