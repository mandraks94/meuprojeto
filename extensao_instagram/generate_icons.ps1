# Script para gerar os ícones da extensão IG Tools Pro em diferentes resoluções
Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\je-md\.gemini\antigravity-ide\brain\f6815751-77aa-43c3-96eb-e02eedbd2c6d\ig_tools_pro_logo_1791084297440.jpg"
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
