// ==UserScript==
// @name         Instagram Tools
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Instagram automation tools
// @author       You
// @match        https://www.instagram.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    setTimeout(() => {
        if (!window.location.href.includes("instagram.com")) return;
        
        // Create main button
        const mainBtn = document.createElement("div");
        mainBtn.id = "assistiveTouchMenu";
        mainBtn.style.cssText = `
            position: fixed;
            bottom: 50%;
            right: 20px;
            transform: translateY(50%);
            width: 60px;
            height: 60px;
            background-color: #0095f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;
        mainBtn.innerHTML = "⚙️";
        
        // Create menu
        const menu = document.createElement("div");
        menu.style.cssText = `
            position: fixed;
            bottom: 50%;
            right: 90px;
            transform: translateY(50%);
            display: none;
            flex-direction: column;
            gap: 10px;
            z-index: 9998;
            background: white;
            padding: 10px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        menu.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <button id="baixarStoriesBtn" style="width: 50px; height: 50px; border-radius: 50%; border: none; background: #f8f9fa; cursor: pointer;">📱</button>
                <span style="font-size: 14px; color: black;">Baixar Stories</span>
            </div>
        `;
        
        document.body.appendChild(mainBtn);
        document.body.appendChild(menu);
        
        mainBtn.addEventListener("click", () => {
            menu.style.display = menu.style.display === "flex" ? "none" : "flex";
        });
        
        // Baixar Stories function
        document.getElementById("baixarStoriesBtn").addEventListener("click", () => {
            const div = document.createElement("div");
            div.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                background: white;
                border: 2px solid #0095f6;
                border-radius: 10px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            
            div.innerHTML = `
                <h2 style="color: black; margin-bottom: 20px;">Baixar Stories</h2>
                <div style="margin-bottom: 15px;">
                    <label style="color: black; font-weight: bold;">URL do Story:</label>
                    <input type="text" id="storyUrlInput" placeholder="Cole a URL do story aqui..." 
                           style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 5px; color: black;">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelarStoryBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Cancelar</button>
                    <button id="downloadStoryBtn" style="background: #0095f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Download</button>
                </div>
            `;
            
            document.body.appendChild(div);
            
            document.getElementById("cancelarStoryBtn").onclick = () => div.remove();
            
            document.getElementById("downloadStoryBtn").onclick = () => {
                const url = document.getElementById("storyUrlInput").value.trim();
                if (!url) {
                    alert("Por favor, insira uma URL válida.");
                    return;
                }
                
                // Criar link direto para download
                const link = document.createElement('a');
                link.href = url;
                link.download = `story_${Date.now()}`;
                link.target = '_blank';
                link.click();
                
                alert("Download iniciado! Se não funcionar, clique com botão direito na URL e 'Salvar como'.");
                div.remove();
            };
        });
        
    }, 3000);
})();