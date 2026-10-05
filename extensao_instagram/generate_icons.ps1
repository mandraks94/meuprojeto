# Script para gerar os ícones da extensão IG Tools Pro em diferentes resoluções
Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\je-md\.gemini\antigravity-ide\brain\08191e00-6bb4-4c39-9b28-d6475044e91c\.user_uploaded\media_1791161946694.png"
$destDir = Join-Path $PSScriptRoot "icons"

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

if (Test-Path $srcPath) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $sizes = @(16, 32, 48, 128, 512)

    foreach ($size in $sizes) {
        $destBmp = New-Object System.Drawing.Bitmap($size, $size)
        $g = [System.Drawing.Graphics]::FromImage($destBmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.DrawImage($srcImg, 0, 0, $size, $size)
        $g.Dispose()
        
        $outPath = Join-Path $destDir ("icon" + $size + ".png")
        $destBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $destBmp.Dispose()
        Write-Host "Ícone gerado com sucesso: $outPath"
    }
    $srcImg.Dispose()
} else {
    Write-Warning "Imagem fonte não encontrada em $srcPath"
}
