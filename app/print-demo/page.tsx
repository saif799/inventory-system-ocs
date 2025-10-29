"use client";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JsBarcode from "jsbarcode";

function generateBarcodePNG(value: string, width = 240, height = 60): Promise<string> {
  return new Promise((resolve, reject) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    JsBarcode(svg, value, { format: "CODE128", width: 2, height, displayValue: false });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(svgString)));
    const svgImageSrc = "data:image/svg+xml;base64," + svg64;

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = svgImageSrc;
  });
}

export default function PrintDemoPage() {
  // Only 2 barcodes now
  const items = [
    { id: "immortality 3 black 47.5" },
    { id: "immortality 3 white 47.5" }
  ];

  // 2x3 inches per PDF page = 144 x 216 points
  // We'll put 2 barcodes, vertically stacked with their text underneath in small font
  const handleGenerate = async () => {
    const labelWidth = 2 * 72;   // 144pt
    const labelHeight = 3 * 72;  // 216pt

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([labelWidth, labelHeight]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const barcodeWidth = 120;
    const barcodeHeight = 44;
    const textFontSize = 8;
    const gapBarcodeText = 5;
    const gap = 28; // vertical gap between barcode blocks

    // Calculate total content height and vert center
    const blockHeight = barcodeHeight + gapBarcodeText + textFontSize + 2;
    const totalBlocksHeight = items.length * blockHeight + (items.length - 1) * gap;
    let y = (labelHeight - totalBlocksHeight) / 2;

    for (const item of items) {
      // barcode image centered
      const barcodePngUrl = await generateBarcodePNG(item.id, barcodeWidth, barcodeHeight);
      const pngImage = await pdfDoc.embedPng(barcodePngUrl);

      page.drawImage(pngImage, {
        x: (labelWidth - barcodeWidth) / 2,
        y: y + textFontSize + gapBarcodeText, // y from bottom
        width: barcodeWidth,
        height: barcodeHeight,
      });

      // text under barcode in small font, centered using font.widthOfTextAtSize()
      const textWidth = font.widthOfTextAtSize(item.id, textFontSize);
      page.drawText(item.id, {
        x: (labelWidth - textWidth) / 2,
        y: y,
        size: textFontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      y += blockHeight + gap;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "barcodes.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Immediately create PDF upon load (headless page)
  if (typeof window !== "undefined") {
    handleGenerate();
  }

  return null;
}
