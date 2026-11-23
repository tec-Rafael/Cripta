$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot
$specs=@(
 @{name='mbqmms-reference';x=338;y=36;w=180;h=174;points=@(0,60,32,35,60,15,100,0,150,0,167,55,169,90,180,108,180,145,148,159,108,153,73,161,18,158,0,135)},
 @{name='rzcefm-reference';x=330;y=40;w=158;h=166;points=@(0,65,23,40,49,10,120,0,130,33,148,35,155,98,143,123,112,149,74,159,15,146,0,115)}
)
foreach($spec in $specs){
 $folder=Join-Path $PSScriptRoot $spec.name
 $src=[Drawing.Bitmap]::new((Join-Path $folder 'reference-frame.png'))
 $out=[Drawing.Bitmap]::new($spec.w,$spec.h)
 $path=[Drawing.Drawing2D.GraphicsPath]::new();$points=[Collections.Generic.List[Drawing.Point]]::new()
 for($i=0;$i -lt $spec.points.Count;$i+=2){$points.Add([Drawing.Point]::new($spec.points[$i],$spec.points[$i+1]))}
 $path.AddPolygon($points.ToArray())
 for($y=0;$y -lt $spec.h;$y++){for($x=0;$x -lt $spec.w;$x++){
  $c=$src.GetPixel($spec.x+$x,$spec.y+$y)
  $sea=$c.G -gt $c.R*1.45 -and $c.B -gt $c.R*1.45
  $panel=($spec.name -eq 'mbqmms-reference' -and $x -ge 168 -and $c.R -gt 130 -and $c.G -gt 110) -or ($spec.name -eq 'rzcefm-reference' -and $x -ge 140 -and $y -lt 40)
  if(-not $sea -and -not $panel -and $path.IsVisible($x+.5,$y+.5)){$out.SetPixel($x,$y,$c)}
 }}
 $out.Save((Join-Path $folder 'Badge.png'));$out.Dispose();$src.Dispose();$path.Dispose()
}
