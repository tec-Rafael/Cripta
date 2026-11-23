$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
# Copy source RGB unchanged. Only the exterior alpha mask is reconstructed.
$script:bgColors=[Collections.Generic.HashSet[int]]::new()
$sample=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot 'reference.gif'))
for($y=76;$y -lt 151;$y++){for($x=650;$x -lt 690;$x++){$c=$sample.GetPixel($x,$y);if($c.R -ge 120 -and $c.G -ge 105){[void]$script:bgColors.Add($c.ToArgb())}}}
for($y=138;$y -lt 149;$y++){for($x=545;$x -lt 590;$x++){$c=$sample.GetPixel($x,$y);if($c.R -ge 120 -and $c.G -ge 105){[void]$script:bgColors.Add($c.ToArgb())}}}
[void]$script:bgColors.Add($sample.GetPixel(0,0).ToArgb());$sample.Dispose()
function Cut-Outlined($source,$rect){
 $crop=$source.Clone($rect,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $w=$crop.Width;$h=$crop.Height
 for($y=0;$y -lt $h;$y++){for($x=0;$x -lt $w;$x++){
  if($script:bgColors.Contains($crop.GetPixel($x,$y).ToArgb())){$crop.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0))}
 }}
 # Remove the panel's horizontal outline only where it lies outside the fur.
 if($rect.Width -eq 140 -or $rect.Width -eq 210){
  $mask=$crop.Clone()
  for($y=(63-$rect.Y);$y -le (80-$rect.Y);$y++){for($x=0;$x -lt $w;$x++){
   $pixel=$mask.GetPixel($x,$y)
   if($pixel.A -eq 0 -or $pixel.R -gt 65){continue}
   $nearFur=$false
   for($dy=-2;$dy -le 2 -and -not $nearFur;$dy++){for($dx=-2;$dx -le 2;$dx++){
    $nx=$x+$dx;$ny=$y+$dy
    if($nx -lt 0 -or $nx -ge $w -or $ny -lt 0 -or $ny -ge $h){continue}
    $c=$mask.GetPixel($nx,$ny)
    if($c.A -gt 0 -and $c.R -gt 70 -and $c.R -gt $c.G -and $c.G -gt $c.B){$nearFur=$true;break}
   }}
   if(-not $nearFur){$crop.SetPixel($x,$y,[Drawing.Color]::Transparent)}
  }}
  $mask.Dispose()
 }
 # Retain only the main connected character/badge, discarding board-edge fragments.
 $seen=[bool[,]]::new($w,$h);$largest=@()
 for($sy=0;$sy -lt $h;$sy++){for($sx=0;$sx -lt $w;$sx++){
  if($seen[$sx,$sy] -or $crop.GetPixel($sx,$sy).A -eq 0){continue}
  $region=[Collections.Generic.List[object]]::new();$q=[Collections.Generic.Queue[object]]::new()
  $q.Enqueue(@($sx,$sy));$seen[$sx,$sy]=$true
  while($q.Count){
   $p=$q.Dequeue();$region.Add($p)
   foreach($d in @(@(-1,0),@(1,0),@(0,-1),@(0,1))){
    $x=$p[0]+$d[0];$y=$p[1]+$d[1]
    if($x -ge 0 -and $x -lt $w -and $y -ge 0 -and $y -lt $h -and -not $seen[$x,$y] -and $crop.GetPixel($x,$y).A -gt 0){$seen[$x,$y]=$true;$q.Enqueue(@($x,$y))}
   }
  }
  if($region.Count -gt $largest.Count){$largest=$region.ToArray()}
 }}
 $keep=[bool[,]]::new($w,$h)
 foreach($p in $largest){$keep[$p[0],$p[1]]=$true}
 for($y=0;$y -lt $h;$y++){for($x=0;$x -lt $w;$x++){if(-not $keep[$x,$y]){$crop.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0))}}}
 return $crop
}
$gif=[Drawing.Image]::FromFile((Join-Path $PSScriptRoot 'reference.gif'))
$count=$gif.GetFrameCount([Drawing.Imaging.FrameDimension]::Time)
$names=@('Idle','Run','Strike')
for($action=0;$action -lt 3;$action++){
 $frameSize=if($action -eq 2){256}else{192}
 $sheet=[Drawing.Bitmap]::new($frameSize*$count,$frameSize)
 $graphics=[Drawing.Graphics]::FromImage($sheet)
 for($i=0;$i -lt $count;$i++){
  [void]$gif.SelectActiveFrame([Drawing.Imaging.FrameDimension]::Time,$i)
  $full=[Drawing.Bitmap]::new($gif.Width,$gif.Height)
  $g=[Drawing.Graphics]::FromImage($full);$g.DrawImageUnscaled($gif,0,0);$g.Dispose()
  $x=510+200*$action
  if($action -eq 2){
   $cut=Cut-Outlined $full ([Drawing.Rectangle]::new(872,0,210,174))
   $graphics.DrawImageUnscaled($cut,$i*256+20,30)
  }else{
   $cut=Cut-Outlined $full ([Drawing.Rectangle]::new($x,40,140,132))
   $graphics.DrawImageUnscaled($cut,$i*192+26,38)
  }
  if($action -eq 0 -and $i -eq 0){
   $portrait=Cut-Outlined $full ([Drawing.Rectangle]::new(338,36,176,174))
      for($py=0;$py -lt $portrait.Height;$py++){for($px=0;$px -lt $portrait.Width;$px++){
    $color=$portrait.GetPixel($px,$py)
    if(($color.G -gt $color.R*1.45 -and $color.B -gt $color.R*1.45) -or ($px -gt 168 -and $py -gt 128)){
     $portrait.SetPixel($px,$py,[Drawing.Color]::Transparent)
    }
   }}
   $portrait.Save((Join-Path $PSScriptRoot 'Badge.png'));$portrait.Dispose()
   $banner=$full.Clone([Drawing.Rectangle]::new(338,20,785,216),$full.PixelFormat)
   $banner.Save((Join-Path $PSScriptRoot 'Banner-original.png'));$banner.Dispose()
  }
  $cut.Dispose();$full.Dispose()
 }
 $graphics.Dispose()
 $sheet.Save((Join-Path $PSScriptRoot ($names[$action]+'.png')))
 $sheet.Dispose()
 Write-Output $names[$action]
}
$gif.Dispose()
