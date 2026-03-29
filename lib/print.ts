"use client";

import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from "pdf-lib";
import JsBarcode from "jsbarcode";

type ShoeLabel = {
  id: string; // barcode value
  name: string;
  sizes: string;
  price: string | number;
};
async function generateBarcodePNG(
  value: string,
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));

    JsBarcode(svg, value, {
      format: "CODE128", // ← changed from CODE128 to EAN13
      width: 1,
      height: height - 16, // leave room for the number below
      fontSize: 2,
      textMargin: 0.8,
      margin: 0,
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
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
      }
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = svgImageSrc;
  });
}

function formatSizes(sizes: string): string {
  const nums = sizes
    .replace(/,\s+/g, ",")
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

  if (nums.length === 0) return sizes;

  const ranges: string[] = [];
  let start = nums[0];
  let end = nums[0];

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = nums[i];
      end = nums[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join("/");
}

// Draw a dashed line manually (pdf-lib has no native dashed line)
function drawDashedLine(
  page: PDFPage,
  x1: number,
  y: number,
  x2: number,
  dashLen = 2,
  gapLen = 2,
  thickness = 0.4,
) {
  let x = x1;
  while (x < x2) {
    page.drawLine({
      start: { x, y },
      end: { x: Math.min(x + dashLen, x2), y },
      thickness,
      color: rgb(0, 0, 0),
    });
    x += dashLen + gapLen;
  }
}

const STORE_NAME = "Original Caba Sport"; // ← change to your store name

export default function printShoeLabels(items: ShoeLabel[]) {
  const handleGenerate = async () => {
    const labelWidth = 113; // ~40mm
    const labelHeight = 99; // ~35mm

    // ── Column layout ──────────────────────────────────────
    // | STORE NAME (header)          |           |
    // | - - - - - - - - - - - - - -  |  P        |
    // | Product name                 |  R        |
    // | Pointure: xx-xx              |  I        |
    // |                              |  C        |
    // | [======= BARCODE =======]    |  E        |
    // |      4 047343 079276         |           |
    // ───────────────────────────────────────────

    const margin = 4;
    const priceColWidth = 14;
    const contentWidth = labelWidth - priceColWidth;

    // Row heights
    const headerHeight = 14; // store name row
    const nameAreaHeight = 32; // product name + pointure
    const barcodeAreaHeight = labelHeight - headerHeight - nameAreaHeight; // ~47pt

    const barcodeWidth = contentWidth - margin;
    const barcodeHeight = barcodeAreaHeight - margin;

    const storeFontSize = 7;
    const nameFontSize = 9;
    const sizesFontSize = 8;
    const priceFontSize = 12;

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const item of items) {
      const page = pdfDoc.addPage([labelWidth, labelHeight]);

      // White background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: labelWidth,
        height: labelHeight,
        color: rgb(1, 1, 1),
      });

      // ── HEADER: Store name ─────────────────────────────
      const storeY = labelHeight - margin - storeFontSize;
      page.drawText(STORE_NAME, {
        x: margin,
        y: storeY,
        size: storeFontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Dashed separator line below header
      const dashY = labelHeight - headerHeight;
      drawDashedLine(page, margin, dashY, contentWidth - margin);

      // ── NAME AREA: Product name + Pointure ─────────────
      let textY = dashY - 3 - nameFontSize;

      // Truncate name to fit
      const maxTextWidth = contentWidth - margin * 2;
      let nameText = item.name;
      while (
        fontBold.widthOfTextAtSize(nameText, nameFontSize) > maxTextWidth &&
        nameText.length > 1
      ) {
        nameText = nameText.slice(0, -1);
      }
      if (nameText !== item.name) nameText += "…";

      // If name is long, split into two lines at a space
      const nameWords = item.name.split(" ");
      let nameLine1 = "";
      let nameLine2 = "";
      for (const word of nameWords) {
        const candidate = nameLine1 ? `${nameLine1} ${word}` : word;
        if (
          fontBold.widthOfTextAtSize(candidate, nameFontSize) <= maxTextWidth
        ) {
          nameLine1 = candidate;
        } else {
          nameLine2 = nameLine2 ? `${nameLine2} ${word}` : word;
        }
      }

      page.drawText(nameLine1, {
        x: margin,
        y: textY,
        size: nameFontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      if (nameLine2) {
        textY -= nameFontSize + 1;
        page.drawText(nameLine2, {
          x: margin,
          y: textY,
          size: nameFontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
      }

      // Pointure line
      textY -= nameFontSize + 2;
      const formattedSizes = formatSizes(item.sizes);
      const sizesLabel = `P: ${formattedSizes}`;
      page.drawText(sizesLabel, {
        x: margin,
        y: textY,
        size: sizesFontSize,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // ── BARCODE AREA: centered in bottom block ──────────
      const barcodePngUrl = await generateBarcodePNG(
        item.id,
        barcodeWidth,
        barcodeHeight,
      );
      const pngImage = await pdfDoc.embedPng(barcodePngUrl);

      // Center horizontally in content area, sit at bottom with margin
      const barcodeX = (contentWidth - barcodeWidth) / 2;
      const barcodeY = margin;

      page.drawImage(pngImage, {
        x: barcodeX,
        y: barcodeY,
        width: barcodeWidth,
        height: barcodeHeight,
      });

      // ── PRICE: rotated 90°, centered in right column ────
      const priceText = `${item.price} DA`;
      const priceTextWidth = fontBold.widthOfTextAtSize(
        priceText,
        priceFontSize,
      );
      const priceX = contentWidth + priceColWidth / 2 + priceFontSize / 2 - 1;
      const priceY = (labelHeight - priceTextWidth) / 2;

      page.drawText(priceText, {
        x: priceX,
        y: priceY,
        size: priceFontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
        rotate: degrees(90),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "shoe-labels.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (typeof window !== "undefined") {
    handleGenerate();
  }
}
