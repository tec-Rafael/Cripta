$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
# Copy source RGB unchanged. Only the exterior alpha mask is reconstructed.
$script:bgColors=[Collections.Generic.HashSet[int]]::new()
$sample=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot 'reference.gif'))
for($y=76;$y -lt 151;$y++){for($x=620;$x -lt 650;$x++){$c=$sample.GetPixel($x,$y);if($c.R -ge 120 -and $c.G -ge 105){[void]$script:bgColors.Add($c.ToArgb())}}}
for($y=138;$y -lt 149;$y++){for($x=530;$x -lt 570;$x++){$c=$sample.GetPixel($x,$y);if($c.R -ge 120 -and $c.G -ge 105){[void]$script:bgColors.Add($c.ToArgb())}}}
[void]$script:bgColors.Add($sample.GetPixel(0,0).ToArgb());$sample.Dispose()
function Cut-Outlined($source,$rect){
 $crop=$source.Clone($rect,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $w=$crop.Width;$h=$crop.Height
 for($y=0;$y -lt $h;$y++){for($x=0;$x -lt $w;$x++){
  if($script:bgColors.Contains($crop.GetPixel($x,$y).ToArgb())){$crop.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0))}
 }}
  if($rect.Width -eq 192){
  # The actors start below the panel's top edge; discard its decorative corners.
  for($cy=0;$cy -lt 6;$cy++){for($cx=0;$cx -lt 192;$cx++){$crop.SetPixel($cx,$cy,[Drawing.Color]::Transparent)}}
  return $crop
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
 $sheet=[Drawing.Bitmap]::new(192*$count,192)
 $graphics=[Drawing.Graphics]::FromImage($sheet)
 for($i=0;$i -lt $count;$i++){
  [void]$gif.SelectActiveFrame([Drawing.Imaging.FrameDimension]::Time,$i)
  $full=[Drawing.Bitmap]::new($gif.Width,$gif.Height)
  $g=[Drawing.Graphics]::FromImage($full);$g.DrawImageUnscaled($gif,0,0);$g.Dispose()
  $x=480+180*$action
  $cut=Cut-Outlined $full ([Drawing.Rectangle]::new($x,72,192,100))
  $graphics.DrawImageUnscaled($cut,$i*192,52)
  if($action -eq 0 -and $i -eq 0){
   $portrait=Cut-Outlined $full ([Drawing.Rectangle]::new(330,40,154,166))
      for($py=0;$py -lt $portrait.Height;$py++){for($px=0;$px -lt $portrait.Width;$px++){
    $c=$portrait.GetPixel($px,$py)
    if($c.G -gt $c.R*1.45 -and $c.B -gt $c.R*1.45){$portrait.SetPixel($px,$py,[Drawing.Color]::Transparent)}
   }}
   for($py=0;$py -lt $portrait.Height;$py++){for($px=0;$px -lt $portrait.Width;$px++){
    if($py -gt 146 -or ($px -gt 130 -and $py -gt 110) -or ($px -gt 142 -and $py -lt 48)){$portrait.SetPixel($px,$py,[Drawing.Color]::Transparent)}
   }}
   $portrait.Save((Join-Path $PSScriptRoot 'Badge.png'));$portrait.Dispose()
   $banner=$full.Clone([Drawing.Rectangle]::new(330,20,825,216),$full.PixelFormat)
   $banner.Save((Join-Path $PSScriptRoot 'Banner-original.png'));$banner.Dispose()
  }
  $cut.Dispose();$full.Dispose()
 }
 $graphics.Dispose()
 $sheet.Save((Join-Path $PSScriptRoot ($names[$action]+'.png')))
 $sheet.Dispose()
 Write-Output ($names[$action]+' : '+$count+' quadros originais, 192x192')
}
$gif.Dispose()
