$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$source=[Drawing.Bitmap]::new((Join-Path $root 'assets/tiny-swords/UI Elements/UI Elements/Swords/Swords.png'))
$parts=@(@('hilt',23,88),@('blade',190,2),@('tip',348,64))
foreach($part in $parts){
 $cut=$source.Clone([Drawing.Rectangle]::new($part[1],0,$part[2],128),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $cut.Save((Join-Path $PSScriptRoot ($part[0]+'.png')));$cut.Dispose()
}
$source.Dispose()
$fill=[Drawing.Bitmap]::new(1,3)
for($y=0;$y -lt 3;$y++){$fill.SetPixel(0,$y,[Drawing.Color]::FromArgb(255,255,62,62))}
$fill.Save((Join-Path $PSScriptRoot 'fill-red.png'));$fill.Dispose()