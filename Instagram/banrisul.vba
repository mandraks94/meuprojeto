Sub Analisar()
    ' --- Declaração de Variáveis ---
    Dim cd As New WebDriver
    Dim ws As Worksheet
    Dim ultimaLinha As Long, i As Long
    Dim atm As String, periodoPlanilhaData As String, valorDiferenca As Double
    Dim ultimaLinha As Long, i As Long, valorDiferenca As Double
    Dim atm As String
    Dim periodoPlanilhaCompleto As String ' Nova variável para data e hora
    Dim tableRows As WebElements, tableRow As WebElement, temDadosNaAba As Boolean
    Dim linhaEncontrada As Boolean
    Dim periodoSite As String
 
    ' Dim evento As String, if_ As String, observacao As String ' Variáveis comentadas, pois não estão em uso
    ' --- Configuração Inicial ---
    Set ws = ThisWorkbook.Sheets("Ciclos")
    ultimaLinha = ws.Cells(ws.Rows.Count, "D").End(xlUp).Row
    ' Inicia o navegador e acessa o site
    cd.Start "edge", "https://numerario.tecban.com/portal-cca"
    cd.Get "/"
    cd.Window.Maximize
    Application.Wait Now + TimeValue("0:00:02")
    With cd
       .FindElementById("j_id_y_0").Click
       Application.Wait Now + TimeValue("0:00:02")
       .FindElementByXPath("//a[contains(@href, 'consultaPeriodoContaAtmUnificado.xhtml')]").Click
       Application.Wait Now + TimeValue("0:00:02")
   End With
   ' Dim cd2 As WebDriver
   ' Set cd2 = New WebDriver
   ' cd2.Start "edge", "https://numerario.tecban.com/portal-cca/consultaProcessoFaltaRecuperarGV.xhtml"
    'cd2.Window.Maximize
   ' Application.Wait Now + TimeValue("0:00:03")
    ' Flag para controlar o primeiro acesso à aba ARS
    Dim primeiroAcessoARS As Boolean: primeiroAcessoARS = True

    ' --- Loop Principal para processar a planilha ---
    For i = 2 To ultimaLinha
    ' --- Simula atividade para evitar bloqueio de tela ---
    Dim wsh As Object
    Set wsh = CreateObject("WScript.Shell")
    wsh.SendKeys "{F15}"
 
    If ws.Rows(i).EntireRow.Hidden = False Then
        ' Extrai os dados da linha atual da planilha
        atm = ws.Cells(i, "D").Value ' Coluna B: PC/ATM
    ' Monta a data e hora da planilha no mesmo padrão do portal
        periodoPlanilhaData = Format(ws.Cells(i, "J").Value, "dd/mm/yyyy")
        valorDiferenca = ws.Cells(i, "N").Value ' Coluna E: Valor da diferença
        
        ' Combina a data da coluna J e a hora da coluna K no formato esperado pelo site
        periodoPlanilhaCompleto = Format(ws.Cells(i, "J").Value, "dd/mm/yyyy") & " " & Format(ws.Cells(i, "K").Value, "hh:mm:ss")
        
        ' valorDiferenca = ws.Cells(i, "N").Value ' Coluna E: Valor da diferença
        ' Se não houver ATM na linha, pula para a próxima
        If atm = "" Then GoTo ProximoLoop
        ' VERIFICAÇÃO: Se o valor da diferença for expressivo, anota e pula para o próximo.
       ' If valorDiferenca >= 1000 Or valorDiferenca <= -1000 Then
        '    ws.Cells(i, "BE").Value = "diferença expressiva"
         '   GoTo ProximoLoop
        'End If
        ' Interações com o site
        With cd
            ' Lógica robusta para limpar e inserir o PC, simulando Ctrl+A e Delete
            Dim inputPC As WebElement
            Set inputPC = .FindElementById("codigoPC_input")
            If inputPC.Attribute("value") <> atm Then
                inputPC.SendKeys .Keys.Control & "a"
                inputPC.SendKeys .Keys.Delete
                Application.Wait Now + TimeValue("0:00:01")
                inputPC.SendKeys atm
                Application.Wait Now + TimeValue("0:00:02")
                .FindElementById("btnConsultar").Click
                Application.Wait Now + TimeValue("0:00:02")
            End If

 

            Dim selectElement As WebElement
            Set selectElement = .FindElementByXPath("//select[@name='resultadoDataTable_rppDD']")
            ' Verifica o valor atual do seletor
            Dim valorAtual As String
            valorAtual = selectElement.Attribute("value")
            If valorAtual <> "50" Then
                selectElement.SendKeys "50"
                Application.Wait Now + TimeValue("0:00:02")
            End If
 
 
        End With
        ' --- NOVA LÓGICA PARA ENCONTRAR A LINHA CORRETA PELA DATA ---
        linhaEncontrada = False
        ' --- LÓGICA ANTI-STALE ELEMENT ---
        ' Em vez de pegar todas as linhas de uma vez (o que pode causar o erro StaleElementReferenceError),
        ' vamos contar as linhas e iterar por índice, buscando a linha a cada passo.
        Dim rowCount As Long
        Dim j As Long
 
            
        rowCount = cd.FindElementsByXPath("//*[@id='resultadoDataTable_data']/tr").Count
        Application.Wait Now + TimeValue("0:00:01")
        For j = 1 To rowCount
            ' Captura o texto do span correto dentro da coluna Período
            periodoSite = cd.FindElementByXPath("//*[@id='resultadoDataTable_data']/tr[" & j & "]/td[3]/span[2]").Text
            ' Compara apenas a data (primeiros 10 caracteres)
            ' Compara se o período do site CONTÉM o período da planilha.
            ' Isso é mais flexível do que uma comparação exata.
            If InStr(1, Trim(periodoSite), periodoPlanilhaCompleto, vbTextCompare) > 0 Then
                ' Clica no botão de detalhe da primeira ocorrência encontrada
                cd.FindElementByXPath("//*[@id='resultadoDataTable_data']/tr[" & j & "]//*[contains(@id, 'btnDetalhe')]").Click
                linhaEncontrada = True
                Exit For
            End If
        Next j

 
            If Not linhaEncontrada Then
                ws.Cells(i, "AF").Value = "Periodo não encontrado"
                GoTo ProximoLoop
            End If
 
 

        ' --- INÍCIO: LÓGICA DAS ABAS ---
        ' Aguarda o modal de detalhes carregar
        Application.Wait Now + TimeValue("0:00:02")
        With cd

 
 
        ' --- ABA EXTRATO ---
        Dim extratoRows As WebElements, extratoRow As WebElement
        Dim textoAcao As String, valorAcao As String
        Dim valoresAbastecimento As String, valoresConfirmacao As String, valoresTratamento As String
        Dim encontrouAbastecimento As Boolean, encontrouConfirmacao As Boolean, encontrouTratamento As Boolean
        encontrouAbastecimento = False
        encontrouConfirmacao = False
        encontrouTratamento = False
        valoresAbastecimento = ""
        valoresConfirmacao = ""
        valoresTratamento = ""
        ' Captura todas as linhas da tabela do extrato
        Set extratoRows = cd.FindElementsByXPath("//*[@id='tabPeriodo:dtItensContaAtms_data']/tr")
        For Each extratoRow In extratoRows
            ' Pega o texto da coluna 5 (ação)
            textoAcao = UCase(Trim(extratoRow.FindElementByXPath("./td[5]").Text))
            ' Verifica se é Abastecimento
            If textoAcao Like "*ABASTECIMENTO*" Then
                encontrouAbastecimento = True
                valorAcao = Trim(extratoRow.FindElementByXPath("./td[6]").Text)
                If valoresAbastecimento = "" Then
                    valoresAbastecimento = valorAcao
                Else
                    valoresAbastecimento = valoresAbastecimento & "; " & valorAcao
                End If
            End If
            ' Verifica se é Confirmação
            If textoAcao Like "*CONFIRMACAO*" Then
                encontrouConfirmacao = True
                valorAcao = Trim(extratoRow.FindElementByXPath("./td[6]").Text)
                If valoresConfirmacao = "" Then
                    valoresConfirmacao = valorAcao
                Else
                    valoresConfirmacao = valoresConfirmacao & "; " & valorAcao
                End If
            End If
            ' Verifica se é Tratamento Operador Auditoria
            If textoAcao Like "*TRATAMENTO OPERADOR AUDITORIA*" Then
                encontrouTratamento = True
                valorAcao = Trim(extratoRow.FindElementByXPath("./td[7]").Text)
                If valoresTratamento = "" Then
                    valoresTratamento = valorAcao
                Else
                    valoresTratamento = valoresTratamento & "; " & valorAcao
                End If
            End If
        Next extratoRow
        ' Preenche planilha
        If encontrouAbastecimento Then
            ws.Cells(i, "Y").Value = "Sim"
            ws.Cells(i, "Z").Value = valoresAbastecimento
        Else
            ws.Cells(i, "Y").Value = "Não"
        End If
        If encontrouConfirmacao Then
            ws.Cells(i, "AA").Value = "Sim"
            ws.Cells(i, "AB").Value = valoresConfirmacao
        Else
            ws.Cells(i, "AA").Value = "Não"
        End If
        If encontrouTratamento Then
            ws.Cells(i, "AD").Value = "Sim"
            ws.Cells(i, "AE").Value = valoresTratamento
        Else
            ws.Cells(i, "AD").Value = "Não"
        End If
        ' Captura o valor do seletor <label id="tabPeriodo:j_id_95"> e coloca na coluna AC
        Dim valorLabel As String
        valorLabel = cd.FindElementById("tabPeriodo:j_id_95").Text
        valorLabel = Replace(Replace(valorLabel, "(", ""), ")", "") ' Remove parênteses
        ws.Cells(i, "AC").Value = valorLabel

                    .FindElementByXPath("//*[@id='dlgDetalheContaATM']/div[1]/a").Click
            Application.Wait Now + TimeValue("0:00:02")
        End With
        ' --- FIM: LÓGICA DAS ABAS ---
ProximoLoop:
    End If
    Next i
    cd.Quit
    ws.Activate
End Sub