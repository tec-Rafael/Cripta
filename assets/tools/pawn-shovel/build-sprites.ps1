$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$palette=@(@(22,28,46),@(105,119,127),@(160,179,182),@(218,243,238))
$wood=@(@(22,28,46),@(111,77,61),@(166,117,77),@(211,165,103))
function Clean-Pixels($bitmap){
 for($y=0;$y -lt $bitmap.Height;$y++){for($x=0;$x -lt $bitmap.Width;$x++){
  $c=$bitmap.GetPixel($x,$y)
  if($c.A -lt 160){$bitmap.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0));continue}
  $list=if($c.R -gt $c.B*1.12 -and $c.R -gt $c.G*1.05){$wood}else{$palette}
  $best=$list[0];$score=[double]::PositiveInfinity
  foreach($rgb in $list){$d=[Math]::Pow($c.R-$rgb[0],2)+[Math]::Pow($c.G-$rgb[1],2)+[Math]::Pow($c.B-$rgb[2],2);if($d -lt $score){$score=$d;$best=$rgb}}
  $bitmap.SetPixel($x,$y,[Drawing.Color]::FromArgb(255,$best[0],$best[1],$best[2]))
 }}
}
function Resize-Part($source,$rect,$width,$height){
 $bitmap=[Drawing.Bitmap]::new($width,$height);$g=[Drawing.Graphics]::FromImage($bitmap)
 $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
 $g.DrawImage($source,[Drawing.Rectangle]::new(0,0,$width,$height),$rect,[Drawing.GraphicsUnit]::Pixel);$g.Dispose();return $bitmap
}
$concept=[Drawing.Bitmap]::new((Join-Path $root 'assets/tools/shovel-concept-v1.png'))
$icon=Resize-Part $concept ([Drawing.Rectangle]::new(395,346,514,554)) 36 39;Clean-Pixels $icon
$full=Resize-Part $icon ([Drawing.Rectangle]::new(0,0,36,39)) 24 26
$blade=Resize-Part $concept ([Drawing.Rectangle]::new(548,350,360,370)) 20 20;Clean-Pixels $blade
$inventory=[Drawing.Bitmap]::new(64,64);$g=[Drawing.Graphics]::FromImage($inventory);$g.DrawImageUnscaled($icon,14,13);$g.Dispose()
$inventory.Save((Join-Path $root 'assets/tools/shovel-icon.png'),[Drawing.Imaging.ImageFormat]::Png);$inventory.Dispose()
foreach($action in @('Idle','Run','Interact')){
 $source=[Drawing.Bitmap]::new((Join-Path $root "assets/tiny-swords/Units/Blue Units/Pawn/Pawn_$action Hammer.png"))
 $frames=[int]($source.Width/192);$sheet=[Drawing.Bitmap]::new($source.Width,192)
 for($i=0;$i -lt $frames;$i++){
  $frame=$source.Clone([Drawing.Rectangle]::new($i*192,0,192,192),$source.PixelFormat)
  if($action -eq 'Interact'){
   $cut=@(@(115,74,35,26),@(124,110,40,32),@(123,87,39,44))[$i]
   $position=@(@(118,76),@(126,112),@(126,92))[$i]
   $tool=[Drawing.Bitmap]$blade.Clone();if($i -gt 0){$tool.RotateFlip([Drawing.RotateFlipType]::Rotate90FlipNone)}
  }else{
   $cut=@(115,85,40,49);$sum=0;$count=0
   for($y=85;$y -lt 130;$y++){for($x=120;$x -lt 150;$x++){$c=$frame.GetPixel($x,$y);if($c.A -gt 200 -and $c.R -gt 130 -and $c.G -gt 70 -and $c.G -lt 200 -and $c.B -lt 140){$sum+=$y;$count++}}}
   $center=if($count){[int][Math]::Round($sum/$count)}else{109}
   $position=@(114,($center-16));$tool=[Drawing.Bitmap]$full.Clone()
  }
  for($y=$cut[1];$y -lt $cut[1]+$cut[3];$y++){for($x=$cut[0];$x -lt $cut[0]+$cut[2];$x++){$frame.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0))}}
  if($action -eq 'Interact'){for($y=126;$y -lt 150;$y++){for($x=115;$x -lt 180;$x++){$c=$frame.GetPixel($x,$y);if($c.G -gt 210 -and $c.B -gt 180 -and $c.G -gt $c.R+10){$frame.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0))}}}}
  $g=[Drawing.Graphics]::FromImage($frame);$g.DrawImageUnscaled($tool,$position[0],$position[1]);$g.Dispose();$tool.Dispose()
  # Copy pixels exactly; retain face and hand highlights at the grip.
  for($y=0;$y -lt 192;$y++){for($x=0;$x -lt 192;$x++){
   $original=$source.GetPixel($i*192+$x,$y);$c=$frame.GetPixel($x,$y)
   if($x -lt 115 -or ($action -ne 'Interact' -and $original.R -gt 210 -and $original.G -gt 200 -and $original.B -gt 130)){$c=$original}
   if($c.A -eq 0){$c=[Drawing.Color]::FromArgb(0,0,0,0)}
   $sheet.SetPixel($i*192+$x,$y,$c)
  }}
  $frame.Dispose()
 }
 $sheet.Save((Join-Path $PSScriptRoot "Pawn_$action Shovel.png"),[Drawing.Imaging.ImageFormat]::Png)
 $sheet.Dispose();$source.Dispose()
}
$concept.Dispose();$icon.Dispose();$full.Dispose();$blade.Dispose()
