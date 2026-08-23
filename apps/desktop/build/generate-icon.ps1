$csharpCode = @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class IconGenerator
{
    public static GraphicsPath CreateRoundedPath(RectangleF rect, float radius)
    {
        GraphicsPath path = new GraphicsPath();
        float diameter = radius * 2f;
        path.AddArc(rect.X, rect.Y, diameter, diameter, 180f, 90f);
        path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270f, 90f);
        path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0f, 90f);
        path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90f, 90f);
        path.CloseFigure();
        return path;
    }

    public static void Generate(string logoPath, string outIcoPath, string outPngPath, string outPng512Path)
    {
        int masterSize = 512;
        using (Bitmap dolphinBmp = new Bitmap(logoPath))
        using (Bitmap master = new Bitmap(masterSize, masterSize, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(master))
            {
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.Clear(Color.Transparent);

                float padding = 16f;
                float radius = 90f;
                RectangleF badgeRect = new RectangleF(padding, padding, masterSize - padding * 2f, masterSize - padding * 2f);

                using (GraphicsPath badgePath = CreateRoundedPath(badgeRect, radius))
                {
                    // Dark navy gradient
                    Color c1 = Color.FromArgb(255, 14, 23, 42);   // #0e172a
                    Color c2 = Color.FromArgb(255, 23, 37, 84);   // #172554
                    using (LinearGradientBrush brush = new LinearGradientBrush(badgeRect, c1, c2, LinearGradientMode.ForwardDiagonal))
                    {
                        g.FillPath(brush, badgePath);
                    }

                    // Subtle border
                    using (Pen pen = new Pen(Color.FromArgb(75, 59, 130, 246), 4f))
                    {
                        g.DrawPath(pen, badgePath);
                    }
                }

                // Center dolphin logo
                float margin = 72f;
                RectangleF dolphinRect = new RectangleF(margin, margin, masterSize - margin * 2f, masterSize - margin * 2f);
                g.DrawImage(dolphinBmp, dolphinRect);
            }

            // Save master 512
            master.Save(outPng512Path, ImageFormat.Png);

            // Save 256 PNG
            using (Bitmap bmp256 = new Bitmap(256, 256, PixelFormat.Format32bppArgb))
            {
                using (Graphics g256 = Graphics.FromImage(bmp256))
                {
                    g256.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g256.SmoothingMode = SmoothingMode.AntiAlias;
                    g256.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g256.Clear(Color.Transparent);
                    g256.DrawImage(master, 0, 0, 256, 256);
                }
                bmp256.Save(outPngPath, ImageFormat.Png);
            }

            // Sizes for ICO
            int[] sizes = new int[] { 16, 24, 32, 48, 64, 128, 256 };
            List<byte[]> pngBytesList = new List<byte[]>();

            foreach (int sz in sizes)
            {
                using (Bitmap subBmp = new Bitmap(sz, sz, PixelFormat.Format32bppArgb))
                {
                    using (Graphics gSub = Graphics.FromImage(subBmp))
                    {
                        gSub.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        gSub.SmoothingMode = SmoothingMode.AntiAlias;
                        gSub.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        gSub.Clear(Color.Transparent);
                        gSub.DrawImage(master, 0, 0, sz, sz);
                    }

                    using (MemoryStream ms = new MemoryStream())
                    {
                        subBmp.Save(ms, ImageFormat.Png);
                        pngBytesList.Add(ms.ToArray());
                    }
                }
            }

            // Write ICO file with valid ICONDIR and ICONDIRENTRY
            int numImages = sizes.Length;
            int headerSize = 6 + numImages * 16;
            using (FileStream fs = new FileStream(outIcoPath, FileMode.Create, FileAccess.Write))
            using (BinaryWriter bw = new BinaryWriter(fs))
            {
                // ICONDIR
                bw.Write((ushort)0);
                bw.Write((ushort)1);
                bw.Write((ushort)numImages);

                int offset = headerSize;
                for (int i = 0; i < numImages; i++)
                {
                    int sz = sizes[i];
                    byte bSz = sz == 256 ? (byte)0 : (byte)sz;
                    int dataLen = pngBytesList[i].Length;

                    bw.Write(bSz);          // Width
                    bw.Write(bSz);          // Height
                    bw.Write((byte)0);      // Colors
                    bw.Write((byte)0);      // Reserved
                    bw.Write((ushort)1);    // Planes
                    bw.Write((ushort)32);   // BitCount
                    bw.Write((uint)dataLen);// BytesInRes
                    bw.Write((uint)offset); // ImageOffset
                    offset += dataLen;
                }

                // Write PNG images
                for (int i = 0; i < numImages; i++)
                {
                    bw.Write(pngBytesList[i]);
                }
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$logoPath = (Resolve-Path (Join-Path $PSScriptRoot "..\public\images\logo\logo_dolphin_light.png")).Path
$icoPath  = (Join-Path $PSScriptRoot "icon.ico")
$pngPath  = (Join-Path $PSScriptRoot "icon.png")
$png512Path = (Join-Path $PSScriptRoot "icon-512.png")

[IconGenerator]::Generate($logoPath, $icoPath, $pngPath, $png512Path)
Write-Host "Icono generado con esquinas 100% transparentes en: $icoPath"