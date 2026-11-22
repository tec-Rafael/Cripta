$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
# Copy source RGB unchanged. Only the exterior alpha mask is reconstructed.
$script:bgColors=[Collections.Generic.HashSet[int]]::new()
$sample=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot 'reference.gif'))
for($y=76;$y -lt 151;$y++){for($x=700;$x -lt 735;$x++){$c=$sample.GetPixel($x,$y);if($c.R -ge 120 -and $c.G -ge 105){[void]$script:bgColors.Add($c.ToArgb())}}}
for($y=138;$y -lt 149;$y++){for($x=620;$x -lt 668;$x++){$c=$sample.GetPixel($x,$y);if($c.R -ge 120 -and $c.G -ge 105){[void]$script:bgColors.Add($c.ToArgb())}}}
[void]$script:bgColors.Add($sample.GetPixel(0,0).ToArgb());$sample.Dispose()
function Cut-Outlined($source,$rect){
 $crop=$source.Clone($rect,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $w=$crop.Width;$h=$crop.Height
 for($y=0;$y -lt $h;$y++){for($x=0;$x -lt $w;$x++){
  if($script:bgColors.Contains($crop.GetPixel($x,$y).ToArgb())){$crop.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,0,0,0))}
 }}
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
  $x=590+155*$action
  $cut=Cut-Outlined $full ([Drawing.Rectangle]::new($x,42,118,136))
  $graphics.DrawImageUnscaled($cut,$i*192+42,36)
  if($action -eq 0 -and $i -eq 0){
   $portrait=Cut-Outlined $full ([Drawing.Rectangle]::new(408,22,184,194))
   $portrait.Save((Join-Path $PSScriptRoot 'Portrait.png'));$portrait.Dispose()
   $banner=$full.Clone([Drawing.Rectangle]::new(408,20,640,216),$full.PixelFormat)
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