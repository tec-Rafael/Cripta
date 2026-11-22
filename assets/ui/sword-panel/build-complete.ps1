$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$source=[Drawing.Bitmap]::new((Join-Path $root 'assets/tiny-swords/UI Elements/UI Elements/Swords/Swords.png'))
# Complete the deliberately empty middle of the source blade before using it as a HUD background.
for($y=21;$y -le 106;$y++) {
 $tone=if($y -lt 63){$source.GetPixel(210,40)}else{$source.GetPixel(210,80)}
 for($x=106;$x -le 347;$x++) { if(($source.GetPixel($x,$y).A -eq 0) -or ($source.GetPixel($x,$y).R -lt 10 -and $source.GetPixel($x,$y).G -lt 10 -and $source.GetPixel($x,$y).B -lt 10)){$source.SetPixel($x,$y,$tone)} }
}
$cut=$source.Clone([Drawing.Rectangle]::new(23,0,389,128),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cut.Save((Join-Path $PSScriptRoot 'sword-complete.png'));$cut.Dispose();$source.Dispose()


