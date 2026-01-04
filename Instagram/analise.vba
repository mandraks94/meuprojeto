Option Explicit
 
'---------------------------------------------------------------------------------------
' Procedure : Analisar
' Author    : Gemini Code Assist (revisado)
' Date      : [Data Atual]
' Purpose   : Automatiza a coleta de dados do portal Numerário Tecban,
'             lendo ATMs de uma planilha, consultando-os no site,
'             analisando os resultados em várias abas e escrevendo
'             as conclusões de volta na planilha.
'---------------------------------------------------------------------------------------
Sub Analisar()
    ' --- Declaração de Variáveis ---
    Dim cd As New WebDriver
    Dim ws As Worksheet
    Dim ultimaLinha As Long, i As Long
    Dim atm As String, dataPeriodo As String, valorDiferenca As Double
    Dim tableRows As WebElements, tableRow As WebElement, temDadosNaAba As Boolean
    Dim linhaEncontrada As Boolean
    Dim periodoSite As String
    ' Dim evento As String, if_ As String, observacao As String ' Variáveis comentadas, pois não estão em uso
 
    ' --- Configuração Inicial ---
    Set ws = ThisWorkbook.Sheets("Modelo")
    ultimaLinha = ws.Cells(ws.Rows.Count, "B").End(xlUp).Row
 
    ' Inicia o navegador e acessa o site
    cd.Start "edge", "https://numerario.tecban.com/portal-cca"
    cd.Get "/"
    cd.Window.Maximize
 
    Application.Wait Now + TimeValue("0:00:02")
 
    With cd
        .FindElementById("j_id_y_0").Click
        Application.Wait Now + TimeValue("0:00:02")
        .FindElementByXPath("//a[contains(@href, 'consultaPeriodoContaAtm.xhtml')]").Click
        Application.Wait Now + TimeValue("0:00:02")
    End With
    
    ' Flag para controlar o primeiro acesso à aba ARS
    Dim primeiroAcessoARS As Boolean: primeiroAcessoARS = True
 
    ' --- Loop Principal para processar a planilha ---
    For i = 8 To ultimaLinha
        ' Extrai os dados da linha atual da planilha
        atm = ws.Cells(i, 2).Value ' Coluna B: PC/ATM
        dataPeriodo = Format(ws.Cells(i, 3).Value, "dd/mm/yyyy") ' Coluna C: Período Inicial
        valorDiferenca = ws.Cells(i, "E").Value ' Coluna E: Valor da diferença
 
        ' Se não houver ATM na linha, pula para a próxima
        If atm = "" Then GoTo ProximoLoop
        
        ' VERIFICAÇÃO: Se o valor da diferença for expressivo, anota e pula para o próximo.
        If valorDiferenca >= 1000 Or valorDiferenca <= -1000 Then
            ws.Cells(i, "BE").Value = "diferença expressiva"
            GoTo ProximoLoop
        End If
 
        ' Interações com o site
        With cd
            ' Lógica robusta para limpar e inserir o PC, simulando Ctrl+A e Delete
            Dim inputPC As WebElement
            Set inputPC = .FindElementById("codigoPC_input")
            inputPC.SendKeys .Keys.Control & "a" ' Seleciona todo o texto
            inputPC.SendKeys .Keys.Delete       ' Apaga o texto selecionado
            Application.Wait Now + TimeValue("0:00:01")
            inputPC.SendKeys atm
            Application.Wait Now + TimeValue("0:00:02")
 
            .FindElementById("btnConsultar").Click
            Application.Wait Now + TimeValue("0:00:02")
        End With
 
        ' --- NOVA LÓGICA PARA ENCONTRAR A LINHA CORRETA PELA DATA ---
        linhaEncontrada = False
 
        ' --- LÓGICA ANTI-STALE ELEMENT ---
        ' Em vez de pegar todas as linhas de uma vez (o que pode causar o erro StaleElementReferenceError),
        ' vamos contar as linhas e iterar por índice, buscando a linha a cada passo.
        Dim rowCount As Long
        Dim j As Long
        rowCount = cd.FindElementsByXPath("//*[@id='resultadoDataTable_data']/tr").Count
 
        For j = 1 To rowCount
            ' Busca a linha e a célula da data na iteração atual para garantir que está "fresca"
            periodoSite = cd.FindElementByXPath("//*[@id='resultadoDataTable_data']/tr[" & j & "]/td[2]").Text
 
            ' Compara se o texto do período no site COMEÇA com a data da planilha
            If periodoSite Like dataPeriodo & "*" Then
                ' Encontrou a linha correta, agora clica no botão de detalhe DENTRO dessa linha
                cd.FindElementByXPath("//*[@id='resultadoDataTable_data']/tr[" & j & "]//*[contains(@id, 'btnDetalhe')]").Click
                linhaEncontrada = True
                Exit For ' Sai do loop de linhas pois já encontrou a correta
            End If
        Next j
 
        If Not linhaEncontrada Then
            MsgBox "Não foi encontrada nenhuma ocorrência para o ATM " & atm & " com a data " & dataPeriodo & ". Pulando para o próximo.", vbExclamation
            GoTo ProximoLoop
        End If
 
        ' --- INÍCIO: LÓGICA DAS ABAS ---
        ' Aguarda o modal de detalhes carregar
        Application.Wait Now + TimeValue("0:00:02")
       
        With cd
            ' --- ABA 1: Diagnóstico ---
            .FindElementByXPath("//a[@href='#tabPeriodo:abaDiagnosticoID']").Click
            Application.Wait Now + TimeValue("0:00:02") ' Espera o conteúdo da aba carregar
           
            ' NOVA LÓGICA: Verifica se o botão "Reabrir Periodo" existe.
            ' Se existir, o período está encerrado. Preenche a planilha e pula para o próximo PC.
            If .FindElementsByXPath("//button[contains(@id, 'tabPeriodo:j_id_cl')]/span[text()='Reabrir Periodo']").Count > 0 Then
                ws.Cells(i, "BE").Value = "Periodo já encerrado"
                ws.Cells(i, "BF").Value = "Periodo já encerrado"
                ' Fecha o modal e vai para o próximo loop
                .FindElementByXPath("//*[@id='dlgDetalheContaATM']/div[1]/a").Click
                Application.Wait Now + TimeValue("0:00:02")
                GoTo ProximoLoop
            Else
                ' LÓGICA ANTIGA: Se o botão não existe, verifica se a tabela de diagnóstico tem dados.
                ' A forma mais robusta é verificar pela classe da linha de "mensagem vazia" (ui-datatable-empty-message)
                If .FindElementsByXPath("//*[@id='tabPeriodo:itensDiagnostico_data']/tr[contains(@class, 'ui-datatable-empty-message')]").Count > 0 Then
                    temDadosNaAba = False
                Else
                    temDadosNaAba = True
                End If
               
                ' Escreve o resultado na planilha
                If temDadosNaAba Then
                    ws.Cells(i, "BE").Value = "Sim"
                Else
                    ws.Cells(i, "BE").Value = "Não"
                End If
            End If
 
            ' --- ABA 2: Lotes ---
            .FindElementByXPath("/html/body/div[13]/div[2]/div/form/div[3]/ul/li[3]").Click
            Application.Wait Now + TimeValue("0:00:02") ' Espera o conteúdo da aba carregar
           
            ' A forma mais robusta é verificar pela classe da linha de "mensagem vazia" (ui-datatable-empty-message)
            ' que só existe quando não há dados.
            If .FindElementsByXPath("//*[@id='tabPeriodo:itensLotes_data']/tr[contains(@class, 'ui-datatable-empty-message')]").Count > 0 Then
                temDadosNaAba = False
            Else
                temDadosNaAba = True
            End If
           
            ' Escreve o resultado na planilha
            If temDadosNaAba Then ' Se temDadosNaAba for True, significa que a mensagem NÃO foi encontrada, logo, há dados.
                ws.Cells(i, "AW").Value = "Sim"
            Else ' Se for False, a mensagem FOI encontrada, logo, não há dados.
                ws.Cells(i, "AW").Value = "Não"
            End If
 
            ' --- ABA 2: Observação ---
            .FindElementByXPath("//a[@href='#tabPeriodo:abaObservacaoID']").Click
            Application.Wait Now + TimeValue("0:00:02")
            ' A lógica é a mesma da aba Lote, verificando a classe da mensagem de "sem dados".
            If .FindElementsByXPath("//*[@id='tabPeriodo:itensObservacao_data']/tr[contains(@class, 'ui-datatable-empty-message')]").Count > 0 Then
                ' Se encontrou a mensagem, não há dados.
                ws.Cells(i, "AX").Value = "Não"
            Else
                ' Se não encontrou a mensagem, há dados.
                ws.Cells(i, "AX").Value = "Sim"
            End If
 
            '--- ABA 3: Erros Saques ---
            .FindElementByXPath("//a[@href='#tabPeriodo:abaErrosID']").Click
            Application.Wait Now + TimeValue("0:00:02")
           
            ' Verifica se a tabela de erros está vazia
            If .FindElementsByXPath("//*[@id='tabPeriodo:itensErros_data']/tr[contains(@class, 'ui-datatable-empty-message')]").Count > 0 Then
                ' Se encontrou a mensagem, não há dados.
                ws.Cells(i, "AY").Value = "Não"
            Else
                ' Se há dados, processa a tabela para montar a string de resumo.
                Dim errosDict As Object ' Scripting.Dictionary
                Dim statusDict As Object ' Scripting.Dictionary
                Dim errorRows As WebElements, errorRow As WebElement
                Dim errorCode As String, errorStatus As String
                Dim outputString As String, key As Variant, subKey As Variant
               
                Set errosDict = CreateObject("Scripting.Dictionary")
               
                ' Pega todas as linhas da tabela de erros
                Set errorRows = .FindElementsByXPath("//*[@id='tabPeriodo:itensErros_data']/tr")
               
                For Each errorRow In errorRows
                    ' Pega o status primeiro para verificar se a linha é válida
                    errorStatus = errorRow.FindElementByXPath("./td[19]").Text
                   
                    ' Ponto 2: Se o status não estiver em branco, processa a linha (ignora totalizadores)
                    If Trim(errorStatus) <> "" Then
                        ' Ponto 1: Pega apenas os 3 primeiros caracteres do código do erro
                        errorCode = Left(errorRow.FindElementByXPath("./td[9]").Text, 3)
                       
                        If Not errosDict.Exists(errorCode) Then
                            Set statusDict = CreateObject("Scripting.Dictionary")
                            errosDict.Add errorCode, statusDict
                        End If
                       
                        errosDict(errorCode)(errorStatus) = errosDict(errorCode)(errorStatus) + 1
                    End If
                Next errorRow
               
                ' Monta a string de saída
                outputString = ""
                For Each key In errosDict.Keys
                    Dim totalErros As Long
                    totalErros = 0
                    Dim statusString As String
                    statusString = ""
                    For Each subKey In errosDict(key).Keys
                        totalErros = totalErros + errosDict(key)(subKey)
                        statusString = statusString & errosDict(key)(subKey) & " " & LCase(subKey) & " e "
                    Next subKey
                    statusString = Left(statusString, Len(statusString) - 3) ' Remove o último " e "
                   
                    outputString = outputString & totalErros & " erro" & IIf(totalErros > 1, "s", "") & " " & key & " (" & statusString & "); "
                Next key
               
                outputString = Left(outputString, Len(outputString) - 2) ' Remove o último "; "
                ws.Cells(i, "AY").Value = outputString
            End If
 
            ' --- ABA 4: Céd. Sem Valor (Stand-by) ---
            .FindElementByXPath("//a[@href='#tabPeriodo:abaCedulaMutiladaID']").Click
            Application.Wait Now + TimeValue("0:00:02")
             ' Lógica para a Aba 4 (Céd. Sem Valor)
             If .FindElementsByXPath("//*[@id='tabPeriodo:itensCedulaMutiladas_data']/tr[contains(@class, 'ui-datatable-empty-message')]").Count > 0 Then
                ' Se encontrou a mensagem, não há dados.
                ws.Cells(i, "AZ").Value = "Não"
            Else
                ' Se não encontrou a mensagem, há dados.
                ws.Cells(i, "AZ").Value = "Sim"
            End If
 
            ' --- ABA 5: Chamados ARS (Stand-by) ---
            .FindElementByXPath("//a[@href='#tabPeriodo:abaChamadosARSID']").Click
            Application.Wait Now + TimeValue("0:00:01")
           
            ' Lógica para a Aba 5 (Chamados ARS)
            ' Espera o "block" da tela sumir antes de prosseguir.
            ' A primeira vez (i=8) tem um timeout maior, as próximas um timeout menor. Monitora o #statusDialog.
            Dim startTime As Double
            Dim statusDialog As WebElement
            Dim timeout As Long
           
            ' LÓGICA CORRIGIDA: Usa uma flag para o primeiro acesso, em vez de depender da linha.
            If primeiroAcessoARS Then
                timeout = 160 ' Timeout de 120s (2 min) para a primeira execução
                primeiroAcessoARS = False ' Desativa a flag para as próximas execuções
            Else
                timeout = 15  ' Timeout de 15s para as execuções seguintes
            End If
           
            startTime = Timer
            Do
                ' Procura pelo diálogo de carregamento pelo ID
                Set statusDialog = .FindElementById("statusDialog", raise:=False)
                If Not statusDialog Is Nothing Then
                    ' Verifica se o estilo do diálogo contém "display: none;" para saber se sumiu
                    If InStr(1, statusDialog.Attribute("style"), "display: none;") > 0 Then Exit Do
                Else
                    Exit Do ' Sai se o elemento de diálogo desaparecer completamente do DOM
                End If
                Application.Wait Now + TimeValue("0:00:01")
            Loop While Timer - startTime < timeout
           
            ' Clica no botão consultar (agora que a tela terminou de carregar)
            .FindElementById("tabPeriodo:btnConsultarChamadosARS").Click
            Application.Wait Now + TimeValue("0:00:02") ' Aguarda o carregamento dos chamados
           
            ' Verifica se a tabela de chamados está vazia
            If .FindElementsByXPath("//*[@id='tabPeriodo:dtTableChamadosARS_data']/tr[contains(@class, 'ui-datatable-empty-message')]").Count > 0 Then
                ' Se encontrou a mensagem de "vazio", não há dados.
                ws.Cells(i, "BA").Value = "Não"
            Else
                ' Se há dados, processa a tabela para montar a string de resumo.
                Dim arsRows As WebElements, arsRow As WebElement
                Dim arsCount As Long
                Dim arsValues As String
                Dim arsValue As String
               
                arsValues = ""
                arsCount = 0
               
                ' Pega todas as linhas da tabela de chamados
                Set arsRows = .FindElementsByXPath("//*[@id='tabPeriodo:dtTableChamadosARS_data']/tr")
               
                For Each arsRow In arsRows
                    arsCount = arsCount + 1
                    ' Pega o valor da 13ª coluna (td[13])
                    arsValue = arsRow.FindElementByXPath("./td[13]").Text
                    arsValues = arsValues & "1 BH no valor de R$ " & arsValue & "; "
                Next arsRow
               
                ' Remove o último "; "
                If Len(arsValues) > 2 Then
                    arsValues = Left(arsValues, Len(arsValues) - 2)
                End If
               
                ' Monta a string final e escreve na planilha
                ws.Cells(i, "BA").Value = arsCount & " chamado" & IIf(arsCount > 1, "s", "") & " - (" & arsValues & ")"
            End If
 
            ' --- ABA 6: Conciliação ---
            .FindElementByXPath("//a[@href='#tabPeriodo:abaConciliacaoID']").Click
            Application.Wait Now + TimeValue("0:00:02")
            Dim valorConciliacao As Double
            Dim valorExtrato As Double
            Dim strConciliacao As String
            Dim strExtrato As String
           
            ' Pega o valor da aba Conciliação (X)
            strConciliacao = .FindElementByXPath("//*[@id='tabPeriodo:pnlGridFooterTotalConc']/tbody/tr/td[3]").Text
            valorConciliacao = ConverterParaNumero(strConciliacao)
           
            ' Vai para a aba Extrato para pegar o outro valor
            .FindElementByXPath("//a[@href='#tabPeriodo:abaExtratoID']").Click
            Application.Wait Now + TimeValue("0:00:02")
           
            ' Pega o valor da aba Extrato (Y)
            strExtrato = .FindElementById("tabPeriodo:j_id_98").Text
            valorExtrato = ConverterParaNumero(strExtrato)
           
            ' Compara os valores e escreve na planilha
            If valorConciliacao = valorExtrato Then
                ws.Cells(i, "BB").Value = "não"
            Else
                ws.Cells(i, "BB").Value = "Diferenças no saldo lógico/ressarcimentos"
            End If
 
            ' --- ABA 7: Compens. Falta GV (Stand-by) ---
            '.FindElementByXPath("//a[@href='#tabPeriodo:abaCompensFaltaGVID']").Click
            'Application.Wait Now + TimeValue("0:00:02")
            ' ' Lógica para a Aba 7 (Compens. Falta GV) aqui...
 
            ' --- FINALIZAÇÃO: Fecha o modal de "Detalhes" para ir para o próximo item ---
            ' Este seletor parece ser o botão "X" para fechar a janela de detalhes.
            .FindElementByXPath("//*[@id='dlgDetalheContaATM']/div[1]/a").Click
            Application.Wait Now + TimeValue("0:00:02")
        End With
 
        ' --- FIM: LÓGICA DAS ABAS ---
 
ProximoLoop:
    Next i
 
    cd.Quit
    ws.Activate
End Sub
 
'''
' Converte uma string de valor monetário (ex: "-1.234,56" ou "(1.234,56)") para um número do tipo Double.
' @param valorString A string a ser convertida.
' @return O valor numérico como Double.
'''
Private Function ConverterParaNumero(ByVal valorString As String) As Double
    On Error GoTo TratarErro
   
    Dim tempString As String
    tempString = Trim(valorString)
   
    ' Remove parênteses e adiciona sinal de negativo
    If Left(tempString, 1) = "(" And Right(tempString, 1) = ")" Then
        tempString = "-" & Replace(Replace(tempString, "(", ""), ")", "")
    End If
   
    ' Padroniza separadores: remove ponto de milhar e troca vírgula por ponto decimal
    tempString = Replace(tempString, ".", "")
    tempString = Replace(tempString, ",", ".")
   
    ConverterParaNumero = CDbl(tempString)
    Exit Function
 
TratarErro:
    ConverterParaNumero = 0 ' Retorna 0 em caso de erro na conversão
End Function