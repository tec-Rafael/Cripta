$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$tool=[Drawing.Bitmap]::new(24,26)
$concept=[Drawing.Bitmap]::new((Join-Path $root 'assets/tools/shovel-concept-v1.png'))
$g=[Drawing.Graphics]::FromImage($tool)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($concept,[Drawing.Rectangle]::new(0,0,24,26),[Drawing.Rectangle]::new(395,346,514,554),[Drawing.GraphicsUnit]::Pixel)
$g.Dispose();$concept.Dispose()
$palette=@(@(22,28,46),@(105,119,127),@(160,179,182),@(218,243,238),@(111,77,61),@(166,117,77),@(211,165,103))
for($y=0;$y -lt 26;$y++){for($x=0;$x -lt 24;$x++){
 $c=$tool.GetPixel($x,$y)
 if($c.A -lt 160){$tool.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0));continue}
 $best=$palette[0];$distance=[double]::PositiveInfinity
 foreach($rgb in $palette){$d=[Math]::Pow($c.R-$rgb[0],2)+[Math]::Pow($c.G-$rgb[1],2)+[Math]::Pow($c.B-$rgb[2],2);if($d -lt $distance){$distance=$d;$best=$rgb}}
 $tool.SetPixel($x,$y,[Drawing.Color]::FromArgb(255,$best[0],$best[1],$best[2]))
}}
foreach($action in @('Run','Idle')){
 $source=[Drawing.Bitmap]::new((Join-Path $root "assets/tiny-swords/Units/Blue Units/Pawn/Pawn_$action Knife.png"))
 $base=[Drawing.Bitmap]::new((Join-Path $root "assets/tiny-swords/Units/Blue Units/Pawn/Pawn_$action.png"))
 $sheet=[Drawing.Bitmap]$source.Clone()
 $frames=[int]($source.Width/192)
 for($i=0;$i -lt $frames;$i++){
  if($action -eq 'Run'){
   $cut=@(@(117,99),@(122,94),@(118,99),@(112,98),@(107,87),@(109,96))[$i]
   $hand=@(@(125,116),@(130,111),@(126,116),@(120,115),@(117,106),@(119,116))[$i]
  }else{$cut=@(117,99);$hand=@(125,116)}
  # Remove the old knife, but retain the source actor everywhere else.
  for($y=$cut[1];$y -lt $cut[1]+28;$y++){for($x=$cut[0];$x -lt $cut[0]+25;$x++){
   $sheet.SetPixel($i*192+$x,$y,[Drawing.Color]::FromArgb(0,0,0,0))
  }}
  # Align the handle with the EXISTING grip, not with the blade position.
  $g=[Drawing.Graphics]::FromImage($sheet)
  $g.DrawImageUnscaled($tool,$i*192+$hand[0]-6,$hand[1]-21)
  $g.Dispose()
  # Restore only the original knife hand and wrist in front of the shaft.
  # No new fist, extra arm or unarmed hand is painted.
  for($y=$hand[1]-4;$y -le $hand[1]+4;$y++){for($x=$hand[0]-5;$x -le $hand[0]+4;$x++){
   $c=$source.GetPixel($i*192+$x,$y)
   $skin=$c.R -gt 170 -and $c.R -gt $c.G+5 -and $c.G -gt $c.B+20
   $sleeve=$c.B -gt $c.R+25 -and $c.G -lt 110
   if($c.A -gt 0 -and ($skin -or $sleeve)){$sheet.SetPixel($i*192+$x,$y,$c)}
  }}
  # Identify large connected hair/face regions; small skin regions are hands,
  # so they must never be copied from the unarmed animation into this pose.
  $seen=[bool[,]]::new(192,192)
  $headMask=[bool[,]]::new(192,192)
  for($sy=50;$sy -le 113;$sy++){for($sx=60;$sx -le 127;$sx++){
   if($seen[$sx,$sy]){continue}
   $queue=[Collections.Generic.Queue[object]]::new()
   $region=[Collections.Generic.List[object]]::new()
   $queue.Enqueue(@($sx,$sy));$seen[$sx,$sy]=$true
   while($queue.Count){
    $point=$queue.Dequeue();$x=$point[0];$y=$point[1]
    $c=$base.GetPixel($i*192+$x,$y)
    if($c.A -lt 200 -or $c.R -le $c.G+2 -or $c.G -lt $c.B){continue}
    $region.Add(@($x,$y))
    foreach($offset in @(@(-1,0),@(1,0),@(0,-1),@(0,1))){
     $nx=$x+$offset[0];$ny=$y+$offset[1]
     if($nx -ge 60 -and $nx -le 127 -and $ny -ge 50 -and $ny -le 113 -and -not $seen[$nx,$ny]){$seen[$nx,$ny]=$true;$queue.Enqueue(@($nx,$ny))}
    }
   }
      if($region.Count -gt 25){
    $sumX=0;$sumY=0
    foreach($point in $region){$sumX+=$point[0];$sumY+=$point[1]}
    # Separate forward hands can exceed 25 pixels; their center is outside
    # the head. Never use those components to reconstruct the face.
    if($sumX/$region.Count -lt 113 -and $sumY/$region.Count -lt 109){
     foreach($point in $region){$headMask[$point[0],$point[1]]=$true}
    }
   }
  }}
  $outlineMask=[bool[,]]::new(192,192)
  for($y=50;$y -le 113;$y++){for($x=60;$x -le 127;$x++){
   if(-not $headMask[$x,$y]){continue}
   $sheet.SetPixel($i*192+$x,$y,$base.GetPixel($i*192+$x,$y))
   for($dy=-2;$dy -le 2;$dy++){for($dx=-2;$dx -le 2;$dx++){
    $nx=$x+$dx;$ny=$y+$dy;$c=$base.GetPixel($i*192+$nx,$ny)
    if($c.A -gt 200 -and $c.R -lt 45 -and $c.G -lt 55 -and $c.B -lt 75){$outlineMask[$nx,$ny]=$true}
   }}
  }}
  for($y=48;$y -le 115;$y++){for($x=58;$x -le 129;$x++){
   if($outlineMask[$x,$y]){$sheet.SetPixel($i*192+$x,$y,$base.GetPixel($i*192+$x,$y))}
  }}
  # Retain the original dark contour around the same hand pixels, without
  # inventing another hand or bringing back the knife blade.
  for($y=$hand[1]-4;$y -le $hand[1]+4;$y++){for($x=$hand[0]-5;$x -le $hand[0]+4;$x++){
   $c=$source.GetPixel($i*192+$x,$y)
   if($c.A -eq 0 -or $c.R -le 170 -or $c.R -le $c.G+5 -or $c.G -le $c.B+20){continue}
   $sheet.SetPixel($i*192+$x,$y,$c)
   foreach($offset in @(@(-1,0),@(1,0),@(0,-1),@(0,1))){
    $nx=$x+$offset[0];$ny=$y+$offset[1];$edge=$source.GetPixel($i*192+$nx,$ny)
    if($edge.A -gt 200 -and $edge.R -lt 45 -and $edge.G -lt 55 -and $edge.B -lt 75 -and -not $headMask[$nx,$ny]){$sheet.SetPixel($i*192+$nx,$ny,$edge)}
   }
  }}
 }
 $sheet.Save((Join-Path $PSScriptRoot "Pawn_$action Shovel.png"),[Drawing.Imaging.ImageFormat]::Png)
 $sheet.Dispose();$source.Dispose();$base.Dispose()
}
$tool.Dispose()