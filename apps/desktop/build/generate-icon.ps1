# Generate a proper .ico file from favicon.png
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO

$srcPath = "C:\Users\dfajardo\OneDrive - COMISION NACIONAL DE ENERGIA\Documentos\github\delphin-erp\apps\desktop\public\favicon.png"
$buildDir = "C:\Users\dfajardo\OneDrive - COMISION NACIONAL DE ENERGIA\Documentos\github\delphin-erp\apps\desktop\build"
$iconPngPath = Join-Path $buildDir "icon.png"
$iconIcoPath = Join-Path $buildDir "icon.ico"

# Dolphin ERP primary color #1565C0
$primaryColor = [System.Drawing.Color]::FromArgb(255, 0x15, 0x65, 0xC0)

# Load source image
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

# Create 256x256 canvas with blue background
$size = 256
$canvas = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.Clear($primaryColor)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Draw source centered, scaled to 80% of canvas
$drawSize = [math]::Floor($size * 0.8)
$x = [math]::Floor(($size - $drawSize) / 2)
$y = [math]::Floor(($size - $drawSize) / 2)
$g.DrawImage($srcImg, $x, $y, $drawSize, $drawSize)

$g.Dispose()

# Save 256x256 PNG
$canvas.Save($iconPngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Save 512x512 PNG (for potential macOS/Linux)
$canvas512 = New-Object System.Drawing.Bitmap 512, 512
$g512 = [System.Drawing.Graphics]::FromImage($canvas512)
$g512.Clear($primaryColor)
$g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$drawSize512 = [math]::Floor(512 * 0.8)
$x512 = [math]::Floor((512 - $drawSize512) / 2)
$y512 = [math]::Floor((512 - $drawSize512) / 2)
$g512.DrawImage($srcImg, $x512, $y512, $drawSize512, $drawSize512)
$g512.Dispose()
$canvas512.Save((Join-Path $buildDir "icon-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# Generate .ico with PNG-compressed 256x256 (Vista+ format)
# ICO format: ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) * count + image data
# We'll create a single-entry ICO with 256x256 PNG

$pngBytes = [System.IO.File]::ReadAllBytes($iconPngPath)
$pngLen = $pngBytes.Length

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms

# ICONDIR
$bw.Write([ushort]0)      # reserved
$bw.Write([ushort]1)      # type = 1 (ICON)
$bw.Write([ushort]1)      # count = 1

# ICONDIRENTRY (256x256 stored as 0x00)
$bw.Write([byte]0)        # width (0 = 256)
$bw.Write([byte]0)        # height (0 = 256)
$bw.Write([byte]0)        # color count
$bw.Write([byte]0)        # reserved
$bw.Write([ushort]1)      # planes
$bw.Write([ushort]32)     # bit count
$bw.Write([uint]$pngLen)  # bytes in resource
$bw.Write([uint]22)       # image offset (6 + 16 = 22)

# Image data (PNG)
$bw.Write($pngBytes)

$bw.Flush()
[System.IO.File]::WriteAllBytes($iconIcoPath, $ms.ToArray())
$ms.Dispose()
$canvas.Dispose()
$canvas512.Dispose()
$srcImg.Dispose()

Write-Host "Generated:"
Write-Host "  $iconPngPath"
Write-Host "  $iconIcoPath"
Write-Host "  $buildDir\icon-512.png"