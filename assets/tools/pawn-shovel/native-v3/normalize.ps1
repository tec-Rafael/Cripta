$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$ref=[Drawing.Bitmap]::new((Join-Path $root 'assets/tiny-swords/Units/Blue Units/Pawn/Pawn_Interact Pickaxe.png'))
$palette=@{};for($y=0;$y -lt $ref.Height;$y++){for($x=0;$x -lt $ref.Width;$x++){$c=$ref.GetPixel($x,$y);if($c.A -gt 200){$palette[$c.ToArgb()]=$c}}};$ref.Dispose()
$jobs=@(@('Idle','idle-run-source.png',4,2,0,@(0,0,1,1,2,2,3,3)),@('Run','idle-run-source.png',4,2,1,@(0,0,1,1,2,2,3,3)),@('Interact','source.png',3,2,-1,@(0,1,2,3,4,5)))
foreach($job in $jobs){
 $src=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot $job[1]));$cw=[int]($src.Width/$job[2]);$ch=[int]($src.Height/$job[3]);$order=$job[5]
 $dst=[Drawing.Bitmap]::new(192*$order.Length,192);$g=[Drawing.Graphics]::FromImage($dst);$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
 for($i=0;$i -lt $order.Length;$i++){
  $col=if($job[4] -lt 0){$order[$i]%3}else{$order[$i]};$row=if($job[4] -lt 0){[int][Math]::Floor($order[$i]/3)}else{$job[4]}
  $foot=0;$head=$ch
  for($y=[int]($ch*.1);$y -lt [int]($ch*.9);$y++){for($x=[int]($cw*.2);$x -lt [int]($cw*.62);$x++){if($src.GetPixel($col*$cw+$x,$row*$ch+$y).A -gt 200){$foot=[Math]::Max($foot,$y);$head=[Math]::Min($head,$y)}}}
  $scale=70/($foot-$head+1);$size=[int][Math]::Round($cw*$scale);$top=134-[int][Math]::Round($foot*$scale);$left=96-[int][Math]::Round($cw*.45*$scale)
  $g.DrawImage($src,[Drawing.Rectangle]::new($i*192+$left,$top,$size,$size),[Drawing.Rectangle]::new($col*$cw,$row*$ch,$cw,$ch),[Drawing.GraphicsUnit]::Pixel)
 };$g.Dispose();$cache=@{}
 for($y=0;$y -lt 192;$y++){for($x=0;$x -lt $dst.Width;$x++){
  $c=$dst.GetPixel($x,$y);if($c.A -lt 180){$dst.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0));continue}
  $key=$c.ToArgb();if(!$cache.ContainsKey($key)){$best=$null;$score=[double]::PositiveInfinity;foreach($p in $palette.Values){$d=[Math]::Pow($c.R-$p.R,2)+[Math]::Pow($c.G-$p.G,2)+[Math]::Pow($c.B-$p.B,2);if($d -lt $score){$score=$d;$best=$p}};$cache[$key]=[Drawing.Color]::FromArgb(255,$best.R,$best.G,$best.B)}
  $dst.SetPixel($x,$y,$cache[$key])
 }}
 $dst.Save((Join-Path $PSScriptRoot "Pawn_$($job[0]) Shovel.png"),[Drawing.Imaging.ImageFormat]::Png);$dst.Dispose();$src.Dispose()
}
