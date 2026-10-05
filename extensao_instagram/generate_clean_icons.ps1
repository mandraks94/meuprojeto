Add-Type -AssemblyName System.Drawing

function Create-AppIcon {
    param(
        [string]$outputPath,
        [int]$size = 512
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Fundo com Gradiente do Instagram (45 graus: Violeta para Laranja Coral)
    $p1 = New-Object System.Drawing.PointF(0, $size)
    $p2 = New-Object System.Drawing.PointF($size, 0)
    $c1 = [System.Drawing.Color]::FromArgb(255, 131, 58, 180)   # #833ab4 (Violeta)
    $c2 = [System.Drawing.Color]::FromArgb(255, 253, 29, 29)    # #fd1d1d (Vermelho Coral)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($p1, $p2, $c1, $c2)

    # Cores intermediárias no gradiente
    $cb = New-Object System.Drawing.Drawing2D.ColorBlend
    $cb.Colors = @(
        [System.Drawing.Color]::FromArgb(255, 131, 58, 180), # Roxo
        [System.Drawing.Color]::FromArgb(255, 193, 53, 132), # Magenta
        [System.Drawing.Color]::FromArgb(255, 225, 48, 108), # Rosa
        [System.Drawing.Color]::FromArgb(255, 253, 29, 29),  # Vermelho
        [System.Drawing.Color]::FromArgb(255, 247, 119, 55)  # Laranja
    )
    $cb.Positions = @(0.0, 0.25, 0.5, 0.75, 1.0)
    $brush.InterpolationColors = $cb

    # Cantos arredondados (squircle moderno)
    $radius = $size * 0.22
    $margin = $size * 0.03
    $rectW = $size - (2 * $margin)
    $rectH = $size - (2 * $margin)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($margin, $margin, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($margin + $rectW - ($radius * 2), $margin, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($margin + $rectW - ($radius * 2), $margin + $rectH - ($radius * 2), $radius * 2, $radius * 2, 0, 90)
    $path.AddArc($margin, $margin + $rectH - ($radius * 2), $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()

    $g.FillPath($brush, $path)

    # 2. Desenho do Símbolo Central em Branco Puro (Eye + Lightning Bolt)
    # Aumentar o traço para ficar super visível até em 16x16
    $whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, ($size * 0.075))
    $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    # Arco superior do olho
    $cx = $size / 2.0
    $cy = $size / 2.0

    # Olho contorno
    $eyeW = $size * 0.68
    $eyeH = $size * 0.36
    $eyeL = $cx - ($eyeW / 2.0)
    $eyeT = $cy - ($eyeH / 2.0)

    $eyePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    # Curva superior
    $eyePath.AddBezier(
        [System.Drawing.PointF]::new($eyeL, $cy),
        [System.Drawing.PointF]::new($eyeL + ($eyeW * 0.25), $cy - ($eyeH * 0.75)),
        [System.Drawing.PointF]::new($eyeL + ($eyeW * 0.75), $cy - ($eyeH * 0.75)),
        [System.Drawing.PointF]::new($eyeL + $eyeW, $cy)
    )
    # Curva inferior
    $eyePath.AddBezier(
        [System.Drawing.PointF]::new($eyeL + $eyeW, $cy),
        [System.Drawing.PointF]::new($eyeL + ($eyeW * 0.75), $cy + ($eyeH * 0.75)),
        [System.Drawing.PointF]::new($eyeL + ($eyeW * 0.25), $cy + ($eyeH * 0.75)),
        [System.Drawing.PointF]::new($eyeL, $cy)
    )
    $eyePath.CloseFigure()
    $g.DrawPath($whitePen, $eyePath)

    # Círculo central (pupila)
    $pupilR = $size * 0.14
    $g.FillEllipse($whiteBrush, ($cx - $pupilR), ($cy - $pupilR), ($pupilR * 2), ($pupilR * 2))

    # Raio recortado no meio da pupila com a cor de fundo
    $boltPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bx = $cx
    $by = $cy
    $bw = $size * 0.08
    $bh = $size * 0.18

    # Formato do raio
    $points = @(
        [System.Drawing.PointF]::new($bx + ($bw * 0.3), $by - $bh),
        [System.Drawing.PointF]::new($bx - ($bw * 0.9), $by + ($bh * 0.05)),
        [System.Drawing.PointF]::new($bx - ($bw * 0.1), $by + ($bh * 0.05)),
        [System.Drawing.PointF]::new($bx - ($bw * 0.5), $by + $bh),
        [System.Drawing.PointF]::new($bx + ($bw * 0.9), $by - ($bh * 0.05)),
        [System.Drawing.PointF]::new($bx + ($bw * 0.1), $by - ($bh * 0.05))
    )
    $boltPath.AddPolygon($points)
    $g.FillPath($brush, $boltPath)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $whitePen.Dispose()
    $whiteBrush.Dispose()
    $path.Dispose()
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

$destDir = Join-Path $PSScriptRoot "icons"
$sizes = @(16, 32, 48, 128, 512)
foreach ($s in $sizes) {
    $outPath = Join-Path $destDir ("icon" + $s + ".png")
    Create-AppIcon -outputPath $outPath -size $s
    Write-Host "Gerado $s x $s -> $outPath"
}
