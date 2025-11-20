// ==UserScript==
// @name         TECBAN
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Botão flutuante com submenus para automação
// @match        https://numerario.tecban.com/*
// @grant        none
// ==/UserScript==
 
(function() {
    'use strict';
 
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
    script.onload = iniciarScript;
    document.head.appendChild(script);
 
    function iniciarScript() {
        setTimeout(() => {
            const botao = document.createElement('div');
            botao.innerText = '⚙️';
            botao.style.position = 'fixed';
            botao.style.bottom = '20px';
            botao.style.right = '20px';
            botao.style.background = '#28a745';
            botao.style.color = '#fff';
            botao.style.padding = '10px';
            botao.style.borderRadius = '50%';
            botao.style.cursor = 'pointer';
            botao.style.zIndex = '9999';
            botao.style.width = '50px';
            botao.style.height = '50px';
            botao.style.textAlign = 'center';
            botao.style.lineHeight = '30px';
            botao.style.border = '2px solid #fff';
            botao.title = 'Abrir menu de análise';
            document.body.appendChild(botao);
 
            const menu = document.createElement('div');
            menu.style.position = 'fixed';
            menu.style.bottom = '70px';
            menu.style.right = '20px';
            menu.style.background = '#fff';
            menu.style.border = '1px solid #ccc';
            menu.style.borderRadius = '8px';
            menu.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
            menu.style.padding = '10px';
            menu.style.display = 'none';
            menu.style.zIndex = '9999';
 
            const opcoes = [
                { texto: 'Analisar contas', acao: analisarContas },
                { texto: 'Analisar custódia', acao: analisarCustodia },
                { texto: 'Analisar saldo IF', acao: analisarSaldoIF }
            ];
 
            opcoes.forEach(op => {
                const item = document.createElement('div');
                item.innerText = op.texto;
                item.style.padding = '5px 10px';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid #eee';
                item.addEventListener('click', () => {
                    op.acao();
                    menu.style.display = 'none';
                });
                menu.appendChild(item);
            });
 
            document.body.appendChild(menu);
 
            botao.addEventListener('click', () => {
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            });
 
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.background = '#fff';
            modal.style.border = '1px solid #ccc';
            modal.style.borderRadius = '8px';
            modal.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            modal.style.padding = '20px';
            modal.style.zIndex = '10000';
            modal.style.display = 'none';
            modal.style.maxHeight = '80vh';
            modal.style.overflowY = 'auto';
 
            const titulo = document.createElement('h3');
            titulo.innerText = '📂 Carregar arquivo .xlsx';
            modal.appendChild(titulo);
 
            const btnAnalisar = document.createElement('button');
            btnAnalisar.innerText = 'Analisar selecionados';
            btnAnalisar.style.marginBottom = '10px';
            btnAnalisar.addEventListener('click', processarLinhasSelecionadas);
            modal.appendChild(btnAnalisar);
 
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xls';
            input.style.marginBottom = '10px';
            modal.appendChild(input);
 
            const resultado = document.createElement('div');
            modal.appendChild(resultado);
 
            const fechar = document.createElement('button');
            fechar.innerText = 'Fechar';
            fechar.style.marginTop = '15px';
            fechar.addEventListener('click', () => {
                modal.style.display = 'none';
                resultado.innerHTML = '';
                input.value = '';
            });
            modal.appendChild(fechar);
 
            document.body.appendChild(modal);
 
            input.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;
 
                const reader = new FileReader();
                reader.onload = function(e) {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
 
                    if (!workbook.SheetNames.includes('Modelo')) {
                        resultado.innerHTML = '<p style="color:red;">❌ A aba "Modelo" não foi encontrada no arquivo.</p>';
                        return;
                    }
 
                    const sheet = workbook.Sheets['Modelo'];
 
const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1 });
 
// Cabeçalho na linha 7 (índice 6)
const colunas = linhas[6];
 
// Colunas principais
const colunasFixas = ['PC', 'Inicial', 'Final', 'Valor R$', 'Empresa Abastecedora', 'Mutilada'];
const colunasMutiladas = ['332','534','572','688','937','725','727','46','989','901','206','207','881','878','879'];
 
// Índices das colunas fixas
const indicesFixos = colunas
  .map((col, idx) => colunasFixas.includes(col) ? idx : -1)
  .filter(idx => idx !== -1);
 
// Índices das colunas mutiladas
const indicesMutiladas = colunas
  .map((col, idx) => colunasMutiladas.includes(String(col)) ? idx : -1)
  .filter(idx => idx !== -1);
 
// Criar tabela
const tabela = document.createElement('table');
tabela.style.width = '100%';
tabela.style.borderCollapse = 'collapse';
 
// Cabeçalho
const header = document.createElement('tr');
const thCheckbox = document.createElement('th');
thCheckbox.innerText = '✔️';
thCheckbox.style.border = '1px solid #ccc';
thCheckbox.style.padding = '5px';
thCheckbox.style.background = '#f0f0f0';
header.appendChild(thCheckbox);
 
// Adiciona colunas fixas
indicesFixos.forEach(idx => {
  const th = document.createElement('th');
  th.innerText = colunas[idx];
  th.style.border = '1px solid #ccc';
  th.style.padding = '5px';
  th.style.background = '#f0f0f0';
  header.appendChild(th);
});
 
// Adiciona colunas mutiladas
indicesMutiladas.forEach(idx => {
  const th = document.createElement('th');
  th.innerText = colunas[idx];
  th.style.border = '1px solid #ccc';
  th.style.padding = '5px';
  th.style.background = '#f0f0f0';
  header.appendChild(th);
});
 
tabela.appendChild(header);
 
// Linhas de dados
for (let i = 7; i < linhas.length; i++) {
  const linha = linhas[i];
  const dadosFixos = indicesFixos.map(idx => linha[idx]);
  const dadosMutiladas = indicesMutiladas.map(idx => linha[idx]);
 
  // Verifica se há pelo menos uma coluna mutilada preenchida
  const temMutilada = dadosMutiladas.some(val => val !== undefined && val !== null && String(val).trim() !== '');
 
  if (!temMutilada) continue;
 
  const tr = document.createElement('tr');
  tr.classList.add('linha-xlsx');
 
  const tdCheckbox = document.createElement('td');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  tdCheckbox.appendChild(checkbox);
  tdCheckbox.style.border = '1px solid #ccc';
  tdCheckbox.style.padding = '5px';
  tr.appendChild(tdCheckbox);
 
  // Adiciona dados fixos
  dadosFixos.forEach((celula, idx) => {
    const td = document.createElement('td');
    td.innerText = formatarCelula(celula, colunas[indicesFixos[idx]]);
    td.style.border = '1px solid #ccc';
    td.style.padding = '5px';
    tr.appendChild(td);
  });
 
  // Adiciona dados mutiladas
  dadosMutiladas.forEach((celula, idx) => {
    const td = document.createElement('td');
    td.innerText = formatarCelula(celula, colunas[indicesMutiladas[idx]]);
    td.style.border = '1px solid #ccc';
    td.style.padding = '5px';
    tr.appendChild(td);
  });
 
  tabela.appendChild(tr);
 
}
 
// Paginação
const linhasPorPagina = 5;
let paginaAtual = 1;
const totalPaginas = Math.ceil(tabela.rows.length / linhasPorPagina);
 
// Função para renderizar página
function renderizarPagina(pagina) {
  // Limpa resultado
  resultado.innerHTML = '';
 
  // Cria nova tabela
  const tabelaPaginada = document.createElement('table');
  tabelaPaginada.style.width = '100%';
  tabelaPaginada.style.borderCollapse = 'collapse';
 
  // Adiciona cabeçalho
  tabelaPaginada.appendChild(tabela.rows[0].cloneNode(true));
 
  // Adiciona linhas da página atual
  const inicio = (pagina - 1) * linhasPorPagina + 1;
  const fim = Math.min(inicio + linhasPorPagina, tabela.rows.length);
  for (let i = inicio; i < fim; i++) {
    tabelaPaginada.appendChild(tabela.rows[i].cloneNode(true));
  }
 
  resultado.appendChild(tabelaPaginada);
 
  // Controles de navegação
  const nav = document.createElement('div');
  nav.style.marginTop = '10px';
  nav.style.textAlign = 'center';
 
  const btnAnterior = document.createElement('button');
  btnAnterior.innerText = '⬅️ Anterior';
  btnAnterior.disabled = pagina === 1;
  btnAnterior.onclick = () => {
    paginaAtual--;
    renderizarPagina(paginaAtual);
  };
 
  const btnProxima = document.createElement('button');
  btnProxima.innerText = 'Próxima ➡️';
  btnProxima.disabled = pagina === totalPaginas;
  btnProxima.onclick = () => {
    paginaAtual++;
    renderizarPagina(paginaAtual);
  };
 
  const infoPagina = document.createElement('span');
  infoPagina.innerText = ` Página ${pagina} de ${totalPaginas} `;
  infoPagina.style.margin = '0 10px';
 
  nav.appendChild(btnAnterior);
  nav.appendChild(infoPagina);
  nav.appendChild(btnProxima);
  resultado.appendChild(nav);
}
 
// Renderiza primeira página
renderizarPagina(paginaAtual);
 
                };
 
                reader.readAsArrayBuffer(file);
            });
 
            function formatarCelula(valor, nomeColuna) {
                if (!valor) return '';
                const nome = typeof nomeColuna === 'string' ? nomeColuna.toLowerCase() : '';
                const isData = nome.includes('inicial') || nome.includes('final');
 
                if (isData) {
                    const data = typeof valor === 'number' ? XLSX.SSF.parse_date_code(valor) : new Date(valor);
                    if (!data || !data.y || !data.m || !data.d) return valor;
                    const dia = String(data.d).padStart(2, '0');
                    const mes = String(data.m).padStart(2, '0');
                    const ano = String(data.y);
                    return `${dia}/${mes}/${ano}`;
                }
 
                return valor;
            }
 
            /**
             * Processa de forma assíncrona cada linha de PC selecionada no modal.
             */
            async function processarLinhasSelecionadas() {
                const selecionados = document.querySelectorAll('.linha-xlsx input[type="checkbox"]:checked');
                if (selecionados.length === 0) {
                    alert('⚠️ Nenhuma linha selecionada para análise.');
                    return;
                }

                // Seletores mais robustos para os elementos da página
                const inputPC = document.querySelector('input[id*="codigoPC"]');
                const botaoBuscar = document.querySelector('button[id*="btnConsultar"]');

                if (!inputPC || !botaoBuscar) {
                    alert('❌ Não foi possível encontrar os campos de consulta de PC na página.');
                    return;
                }

                for (const checkbox of selecionados) {
                    const linha = checkbox.closest('tr');
                    const celulas = linha.querySelectorAll('td');
                    const valorPC = celulas[1]?.innerText?.trim(); // Coluna 'PC'
                    const dataInicial = celulas[2]?.innerText?.trim(); // Coluna 'Inicial'

                    if (!valorPC) {
                        alert('❌ Valor de PC não encontrado em uma das linhas selecionadas. Pulando...');
                        continue;
                    }

                    // Preenche o campo e simula a busca
                    await preencherEBuscarPC(inputPC, botaoBuscar, valorPC);

                    // Espera de forma inteligente o cabeçalho da tabela de resultados aparecer
                    const seletorCabecalho = 'table[id*="resultadoDataTable"] thead';
                    const cabecalho = await esperarElemento(seletorCabecalho);

                    if (!cabecalho) continue; // Se não encontrar o cabeçalho após o tempo limite, pula para o próximo

                    // Clica na lupa correspondente à data
                    clicarNaLupaPorData(dataInicial);

                    // Pausa antes de processar o próximo item
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                alert('✅ Análise de todos os itens selecionados concluída.');
            }

            async function preencherEBuscarPC(inputEl, botaoEl, valorPC) {
                console.log(`Buscando pelo PC: ${valorPC}`);
                inputEl.value = valorPC;
                // Dispara eventos para que frameworks como Angular/React reconheçam a alteração
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                inputEl.dispatchEvent(new Event('blur', { bubbles: true }));

                await new Promise(resolve => setTimeout(resolve, 500)); // Pequena pausa
                botaoEl.click();
                simularClique(botaoEl);
            }

            /**
             * Aguarda um elemento aparecer no DOM.
             * @param {string} seletor - O seletor CSS do elemento a ser aguardado.
             * @param {number} timeout - Tempo máximo de espera em milissegundos.
             * @returns {Promise<Element|null>} O elemento encontrado ou null se o tempo esgotar.
             */
            function esperarElemento(seletor, timeout = 10000) {
                console.log(`⏳ Aguardando pelo elemento: ${seletor}`);
                return new Promise(resolve => {
                    const startTime = Date.now();
                    const interval = setInterval(() => {
                        const elemento = document.querySelector(seletor);
                        if (elemento) {
                            console.log(`✅ Elemento encontrado: ${seletor}`);
                            clearInterval(interval);
                            resolve(elemento);
                        } else if (Date.now() - startTime > timeout) {
                            console.error(`❌ Tempo esgotado. Elemento não encontrado: ${seletor}`);
                            clearInterval(interval);
                            resolve(null);
                        }
                    }, 500); // Verifica a cada 500ms
                });
            }

            /**
             * Simula um clique mais robusto em um elemento, disparando múltiplos eventos de mouse.
             * @param {Element} elemento - O elemento a ser clicado.
             */
            function simularClique(elemento) {
                if (!elemento) return;

                // Dispara uma sequência completa de eventos para simular um clique real
                const eventos = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
                eventos.forEach(tipoEvento => {
                    const evento = new PointerEvent(tipoEvento, {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    elemento.dispatchEvent(evento);
                });
            }

            function clicarNaLupaPorData(dataDesejada) {
                if (!dataDesejada) {
                    console.log("⚠️ Data desejada não foi fornecida para a busca da lupa.");
                    return;
                }

                console.log(`🔎 Iniciando busca da lupa para a data: "${dataDesejada}"`);

                const seletorTabela = 'table[id*="resultadoDataTable"]';
                const todasAsLinhas = document.querySelectorAll(`${seletorTabela} tbody tr`);
                let linhaParaClicar = null;

                // 1. Encontrar todas as linhas que contêm um <span> com estilo 'color: red'
                const linhasVermelhas = Array.from(todasAsLinhas).filter(linha =>
                    linha.querySelector('span[style*="color: red"]')
                );
                
                if (linhasVermelhas.length === 1) {
                    // Caso 1: Apenas uma linha vermelha encontrada, usa essa.
                    console.log("✅ Uma linha vermelha encontrada. Usando esta linha para o clique.");
                    linhaParaClicar = linhasVermelhas[0];
                } else if (linhasVermelhas.length > 1) {
                    // Caso 2: Múltiplas linhas vermelhas, refina a busca pela data.
                    console.log(`⚠️ Múltiplas linhas vermelhas (${linhasVermelhas.length}) encontradas. Refinando busca pela data: "${dataDesejada}"`);

                    const cabecalho = document.querySelector(`${seletorTabela} thead`);
                    if (!cabecalho) {
                        console.error("❌ Não foi possível encontrar o cabeçalho da tabela de resultados para desempate.");
                        return;
                    }
                    const ths = Array.from(cabecalho.querySelectorAll('th'));
                    
                    const indiceColunaPeriodo = ths.findIndex(th => th.innerText.trim() === 'Período');
    
                    if (indiceColunaPeriodo === -1) {
                        console.error("❌ Não foi possível encontrar a coluna 'Período' na tabela de resultados para desempate.");
                        return;
                    }
    
                    linhaParaClicar = linhasVermelhas.find(linha => {
                        const celulaPeriodo = linha.cells[indiceColunaPeriodo];
                        return celulaPeriodo && celulaPeriodo.innerText.trim().startsWith(dataDesejada);
                    });
                } else {
                    // Caso 3: Nenhuma linha vermelha, busca pela data em todas as linhas.
                    console.log(`⚠️ Nenhuma linha vermelha encontrada. Buscando pela data: "${dataDesejada}" em todas as linhas.`);

                    const cabecalho = document.querySelector(`${seletorTabela} thead`);
                    if (!cabecalho) {
                        console.error("❌ Não foi possível encontrar o cabeçalho da tabela de resultados para busca.");
                        return;
                    }
                    const ths = Array.from(cabecalho.querySelectorAll('th'));
                    
                    const indiceColunaPeriodo = ths.findIndex(th => th.innerText.trim() === 'Período');
    
                    if (indiceColunaPeriodo === -1) {
                        console.error("❌ Não foi possível encontrar a coluna 'Período' na tabela de resultados para busca.");
                        return;
                    }
    
                    linhaParaClicar = Array.from(todasAsLinhas).find(linha => {
                        const celulaPeriodo = linha.cells[indiceColunaPeriodo];
                        return celulaPeriodo && celulaPeriodo.innerText.trim().startsWith(dataDesejada);
                    });
                }

                if (linhaParaClicar) {
                    console.log("✅ Linha encontrada!", linhaParaClicar);
                    // O clique deve ser no link (<a>) que envolve o ícone, não no ícone em si.

                    const linkDaLupa = linhaParaClicar.querySelector('a[id*="btnDetalhe"]');
                    if (linkDaLupa) {
                        console.log("✅ Link da lupa encontrado. Clicando...", linkDaLupa);
                        simularClique(linkDaLupa);
                    } else {
                        console.error("❌ Erro: O link da lupa não foi encontrado na linha encontrada.");
                    }
                } else {
                    console.warn(`❌ Nenhuma linha correspondente encontrada na tabela para a data: "${dataDesejada}" (nem vermelha, nem por data).`);
                }
            }
            function analisarContas() {
                modal.style.display = 'block';
            }
 
            function analisarCustodia() {
                alert('📦 Iniciando análise de custódia...');
            }
 
            function analisarSaldoIF() {
                alert('💰 Iniciando análise de saldo IF...');
            }
        }, 2000);
    }
})();