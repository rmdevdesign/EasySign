$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectRoot 'public'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$bitmap = [System.Drawing.Bitmap]::new(1200, 630)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
function Brush([string]$hex) { return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex)) }
function Text([string]$value, [float]$x, [float]$y, [float]$size, [string]$color, [bool]$bold = $false, [string]$family = 'Segoe UI') {
    $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $font = [System.Drawing.Font]::new($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $paint = Brush $color
    try { $graphics.DrawString($value, $font, $paint, $x, $y) } finally { $font.Dispose(); $paint.Dispose() }
}
function Rounded([float]$x, [float]$y, [float]$w, [float]$h, [float]$radius, [string]$color) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = 2 * $radius
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc(($x + $w - $diameter), $y, $diameter, $diameter, 270, 90)
    $path.AddArc(($x + $w - $diameter), ($y + $h - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($x, ($y + $h - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $paint = Brush $color
    try { $graphics.FillPath($paint, $path) } finally { $paint.Dispose(); $path.Dispose() }
}
try {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f4ef'))
    Rounded 64 49 52 52 14 '#244e40'
    Text 'e' 77 43 48 '#ffffff' $true
    Text 'easy sign' 131 52 37 '#244e40' $true
    Rounded 313 61 47 27 6 '#e6ebdc'
    Text 'PDF' 322 65 14 '#5b7050' $true

    Text 'Remplissez.' 61 164 62 '#244e40' $true
    Text 'Signez.' 61 239 62 '#244e40' $true
    Text "C’est prêt." 61 314 62 '#869476' $true
    Text 'Directement dans votre navigateur.' 67 413 23 '#687762'
    Text 'Vos documents restent sur votre appareil.' 67 448 20 '#687762'
    Rounded 67 515 256 42 21 '#e7eddd'
    Text 'Sans compte. Sans abonnement.' 82 526 15 '#49673e'

    Rounded 665 73 477 483 30 '#e4e9da'
    Rounded 724 108 359 420 9 '#d4dccb'
    Rounded 714 98 359 420 9 '#fffefa'
    Text 'AUTORISATION' 744 128 21 '#244e40' $true
    Text 'Un document prêt à partager.' 745 163 13 '#8a9480'
    $line = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#e0e5d8'), 3)
    $graphics.DrawLine($line, 745, 211, 1040, 211)
    $graphics.DrawLine($line, 745, 226, 964, 226)
    Text 'Nom et prénom' 745 248 12 '#89947e'
    Rounded 745 273 284 47 5 '#edf2e3'
    Text 'Camille Martin' 758 283 20 '#244e40'
    $outline = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#93a780'), 1.5)
    $graphics.DrawRectangle($outline, 745, 273, 284, 47)
    $graphics.DrawLine($line, 745, 351, 1040, 351)
    Text 'Signature' 745 371 12 '#89947e'
    $signatureOutline = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#91a681'), 1.5)
    $signatureOutline.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $graphics.DrawRectangle($signatureOutline, 745, 400, 250, 65)
    Text 'Camille' 755 399 38 '#244e40' $false 'Segoe Script'
    Rounded 987 456 16 16 3 '#527b45'
    Text 'Écrire   ·   Déplacer   ·   Signer' 742 567 16 '#6d805e'
    Text 'rmdevdesign.github.io/EasySign' 68 588 14 '#8a967e'
    $bitmap.Save((Join-Path $outputDirectory 'easy-sign-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $line.Dispose(); $outline.Dispose(); $signatureOutline.Dispose()
} finally { $graphics.Dispose(); $bitmap.Dispose() }
