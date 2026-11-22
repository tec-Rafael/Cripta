$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$source=[Drawing.Bitmap]::new((Join-Path $root 'assets/tiny-swords/UI Elements/UI Elements/Swords/Swords.png'))
# Reconstruct gaps with complete columns from the intact blade section.
# Copy its original edge pixels, cream/gray texture and white center ridge.
$reference=$source.Clone()
for($x=106;$x -le 347;$x++) {
 $sampleX=192+(($x-106)%64)
 for($y=0;$y -lt 128;$y++) {
  $pixel=$reference.GetPixel($x,$y)
  if($pixel.A -eq 0 -or ($pixel.R -lt 10 -and $pixel.G -lt 10 -and $pixel.B -lt 10)) {
   $sample=$reference.GetPixel($sampleX,$y)
   if($sample.A -gt 0 -and ($sample.R -ge 10 -or $sample.G -ge 10 -or $sample.B -ge 10)) {
    $source.SetPixel($x,$y,$sample)
   }
  }
 }
}
$reference.Dispose()
$cut=$source.Clone([Drawing.Rectangle]::new(23,0,389,128),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cut.Save((Join-Path $PSScriptRoot 'sword-complete.png'));$cut.Dispose();$source.Dispose()
