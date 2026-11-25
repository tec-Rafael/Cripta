$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
public static class SpriteExtract {
 public static HashSet<int> Background(Bitmap b){
  var colors=new HashSet<int>();
  foreach(var r in new[]{new Rectangle(289,36,13,120),new Rectangle(409,227,24,140),new Rectangle(300,183,190,30),new Rectangle(298,349,135,15)})
   for(int y=r.Top;y<r.Bottom;y++)for(int x=r.Left;x<r.Right;x++)colors.Add(b.GetPixel(x,y).ToArgb());
  return colors;
 }
 public static Bitmap Cut(Bitmap source,Rectangle rect,HashSet<int> bg,string name){
  var output=new Bitmap(rect.Width,rect.Height,PixelFormat.Format32bppArgb);
  for(int y=0;y<rect.Height;y++)for(int x=0;x<rect.Width;x++){
   int sx=x+rect.X,sy=y+rect.Y;var c=source.GetPixel(sx,sy);
   if(bg.Contains(c.ToArgb()))continue;
   if(name=="seahorse-shark-rider" && sy<278 && sx>=540)continue;
   if(name=="seahorse-shark-rider" && sy<260 && sx>=531)continue;
   if(name=="seahorse-teal-rider" && sy>=242 && sx<535)continue;
   if(name=="seahorse-teal-rider" && sy>=272)continue;
   if(name=="seahorse-yellow-rider" && sy<276 && sx<590)continue;
   if(name=="seahorse-yellow-rider" && sy<286 && sx<576)continue;
   if(name=="seahorse-teal-rider" && sy>=266 && sx>=590)continue;
   output.SetPixel(x,y,c);
  }
  return output;
 }
}
"@
$root=$PSScriptRoot
$definitions=@(
 @{name='boat-empty';x=303;y=37;width=158;height=128},
 @{name='boat-shark-rowing';x=470;y=32;width=170;height=140},
 @{name='seahorse-empty';x=315;y=239;width=94;height=102},
 @{name='seahorse-shark-rider';x=440;y=244;width=108;height=116},
 @{name='seahorse-teal-rider';x=506;y=182;width=119;height=94},
 @{name='seahorse-yellow-rider';x=550;y=266;width=99;height=108}
)
$sample=[Drawing.Bitmap]::new((Join-Path $root 'frames/00.png'))
$bg=[SpriteExtract]::Background($sample);$sample.Dispose()
$manifest=@{source='https://img.itch.zone/aW1nLzI2NTY0MTIxLmdpZg==/original/3Bn0Bs.gif';frameCount=24;frameDurationMs=100;transparent=$true;sprites=$definitions}
foreach($def in $definitions){
 $folder=Join-Path $root ('separated/'+$def.name)
 New-Item -ItemType Directory -Force $folder | Out-Null
 $sheet=[Drawing.Bitmap]::new($def.width*24,$def.height)
 $g=[Drawing.Graphics]::FromImage($sheet)
 for($i=0;$i -lt 24;$i++){
  $source=[Drawing.Bitmap]::new((Join-Path $root ('frames/{0:D2}.png' -f $i)))
  $cut=[SpriteExtract]::Cut($source,[Drawing.Rectangle]::new($def.x,$def.y,$def.width,$def.height),$bg,$def.name)
  $cut.Save((Join-Path $folder ('{0:D2}.png' -f $i)),[Drawing.Imaging.ImageFormat]::Png)
  $g.DrawImageUnscaled($cut,$i*$def.width,0)
  $cut.Dispose();$source.Dispose()
 }
 $g.Dispose();$sheet.Save((Join-Path $root ('separated/'+$def.name+'.png')),[Drawing.Imaging.ImageFormat]::Png);$sheet.Dispose()
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 (Join-Path $root 'separated/manifest.json')
