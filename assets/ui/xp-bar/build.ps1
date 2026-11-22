$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$source=[Drawing.Bitmap]::new((Join-Path $root 'assets/ui/xp-base.png'))
$parts=@(@('left',0,12),@('middle',110,2),@('right',($source.Width-12),12))
foreach($part in $parts){
 $cut=$source.Clone([Drawing.Rectangle]::new($part[1],0,$part[2],$source.Height),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $cut.Save((Join-Path $PSScriptRoot ($part[0]+'.png')));$cut.Dispose()
}
$source.Dispose()
$fill=[Drawing.Bitmap]::new(1,3)
for($y=0;$y -lt 3;$y++){$fill.SetPixel(0,$y,[Drawing.Color]::FromArgb(255,100,189,76))}
$fill.Save((Join-Path $PSScriptRoot 'fill-green.png'));$fill.Dispose()