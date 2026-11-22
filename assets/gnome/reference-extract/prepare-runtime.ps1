$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$src=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot 'Portrait.png'))
$badge=[Drawing.Bitmap]::new($src.Width,$src.Height)
$shape=[Drawing.Drawing2D.GraphicsPath]::new()
$shape.AddPolygon([Drawing.Point[]]@([Drawing.Point]::new(0,0),[Drawing.Point]::new(158,0),[Drawing.Point]::new(158,73),[Drawing.Point]::new(174,73),[Drawing.Point]::new(180,90),[Drawing.Point]::new(174,117),[Drawing.Point]::new(167,132),[Drawing.Point]::new(83,186),[Drawing.Point]::new(0,194)))
for($y=0;$y -lt $src.Height;$y++){for($x=0;$x -lt $src.Width;$x++){
 $c=$src.GetPixel($x,$y)
 $sea=$c.G -gt 110 -and $c.B -gt 110 -and $c.R -lt $c.G*.65
 if($c.A -gt 0 -and -not $sea -and $shape.IsVisible($x+.5,$y+.5)){$badge.SetPixel($x,$y,$c)}
}}
$badge.Save((Join-Path $PSScriptRoot 'Badge.png'));$badge.Dispose();$src.Dispose();$shape.Dispose()
$src=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot 'Strike.png'))
$combat=[Drawing.Bitmap]::new(7*192,192);$g=[Drawing.Graphics]::FromImage($combat)
# Reference frames 0..6 form one complete swing; frame 4 is contact.
for($i=0;$i -lt 7;$i++){$g.DrawImage($src,[Drawing.Rectangle]::new($i*192,0,192,192),[Drawing.Rectangle]::new($i*192,0,192,192),[Drawing.GraphicsUnit]::Pixel)}
$combat.Save((Join-Path $PSScriptRoot 'Strike-Combat.png'));$g.Dispose();$src.Dispose();$combat.Dispose()