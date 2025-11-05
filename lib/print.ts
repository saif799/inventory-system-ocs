"use client";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JsBarcode from "jsbarcode";

function generateBarcodePNG(
  value: string,
  width = 240,
  height = 60
): Promise<string> {
  return new Promise((resolve, reject) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    JsBarcode(svg, value, {
      format: "CODE128",
      width: 2,
      height,
      displayValue: false,
    });

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
export default function PrintPdf(items: Array<{ id: string; name: string }>) {
  const handleGenerate = async () => {
    const labelWidth = 2 * 72; // 144pt
    const labelHeight = 3 * 72; // 216pt
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([labelWidth, labelHeight]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const barcodeWidth = 120;
    const barcodeHeight = 44;
    const textFontSize = 8;
    const gapBarcodeText = 5;

    let itemsPerPage = 0; // Counter for items on the current page

    for (const item of items) {
      // barcode image centered
      const barcodePngUrl = await generateBarcodePNG(
        item.id,
        barcodeWidth,
        barcodeHeight
      );
      const pngImage = await pdfDoc.embedPng(barcodePngUrl);

      // Check if we need to create a new page
      if (itemsPerPage === 2) {
        page = pdfDoc.addPage([labelWidth, labelHeight]);
        itemsPerPage = 0; // Reset item counter
      }

      // Position: first item in top half, second item in bottom half
      const y =
        itemsPerPage === 0
          ? labelHeight * 0.75 - barcodeHeight / 2 // Top half
          : labelHeight * 0.25 - barcodeHeight / 2; // Bottom half

      page.drawImage(pngImage, {
        x: (labelWidth - barcodeWidth) / 2,
        y: y,
        width: barcodeWidth,
        height: barcodeHeight,
      });

      // text under barcode in small font, centered
      const textWidth = font.widthOfTextAtSize(item.name, textFontSize);
      page.drawText(item.name, {
        x: (labelWidth - textWidth) / 2,
        y: y - gapBarcodeText - textFontSize,
        size: textFontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      itemsPerPage++; // Increment the item counter
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });
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
}
