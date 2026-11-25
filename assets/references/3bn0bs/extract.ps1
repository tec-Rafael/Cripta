$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=$PSScriptRoot
$gif=[Drawing.Image]::FromFile((Join-Path $root 'reference.gif'))
$count=$gif.GetFrameCount([Drawing.Imaging.FrameDimension]::Time)
$delays=$gif.GetPropertyItem(0x5100).Value
$regions=@(
 @{name='boat-empty';x=296;y=30;width=170;height=140},
 @{name='boat-rowing';x=470;y=30;width=175;height=140},
 @{name='swimming-group';x=310;y=185;width=340;height=180}
)
New-Item -ItemType Directory -Force (Join-Path $root 'frames') | Out-Null
$atlas=[Drawing.Bitmap]::new($gif.Width*6,$gif.Height*4)
$ag=[Drawing.Graphics]::FromImage($atlas)
$timing=@()
$sheets=@{}
foreach($region in $regions){$sheets[$region.name]=[Drawing.Bitmap]::new($region.width*$count,$region.height)}
for($i=0;$i -lt $count;$i++){
 [void]$gif.SelectActiveFrame([Drawing.Imaging.FrameDimension]::Time,$i)
 $frame=[Drawing.Bitmap]::new($gif.Width,$gif.Height)
 $g=[Drawing.Graphics]::FromImage($frame);$g.DrawImageUnscaled($gif,0,0);$g.Dispose()
 $frame.Save((Join-Path $root ('frames/{0:D2}.png' -f $i)),[Drawing.Imaging.ImageFormat]::Png)
 $ag.DrawImageUnscaled($frame,($i%6)*$gif.Width,[math]::Floor($i/6)*$gif.Height)
 foreach($region in $regions){
  $cut=$frame.Clone([Drawing.Rectangle]::new($region.x,$region.y,$region.width,$region.height),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $sg=[Drawing.Graphics]::FromImage($sheets[$region.name]);$sg.DrawImageUnscaled($cut,$i*$region.width,0);$sg.Dispose();$cut.Dispose()
 }
 $timing+=([BitConverter]::ToInt32($delays,$i*4)*10)
 $frame.Dispose()
}
$ag.Dispose();$atlas.Save((Join-Path $root 'atlas.png'),[Drawing.Imaging.ImageFormat]::Png);$atlas.Dispose()
foreach($region in $regions){$sheets[$region.name].Save((Join-Path $root ($region.name+'.png')),[Drawing.Imaging.ImageFormat]::Png);$sheets[$region.name].Dispose()}
@{source='https://img.itch.zone/aW1nLzI2NTY0MTIxLmdpZg==/original/3Bn0Bs.gif';frameCount=$count;frameWidth=$gif.Width;frameHeight=$gif.Height;durationMs=$timing;atlasColumns=6;regions=$regions;transparent=$false;note='Original promotional background retained. Swimming subjects overlap; preserved as a group. No game mechanics changed.'} | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 (Join-Path $root 'manifest.json')
$gif.Dispose()
Write-Output "Extracted $count original frames, 3 region sheets and atlas."
