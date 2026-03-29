"use client";

import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import JsBarcode from "jsbarcode";

type ShoeLabel = {
  id: string; // barcode value
  name: string;
  sizes: string;
  price: string | number;
};

async function generateBarcodePNG(
  value: string,
  width = 240,
  height = 60,
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

// Collapses sequential numbers into ranges e.g. [40,41,42,44] → "40-42,44"
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

export default function printShoeLabels(items: ShoeLabel[]) {
  const handleGenerate = async () => {
    const labelWidth = 113;  // ~40mm
    const labelHeight = 99;  // ~35mm

    const margin = 4;
    const priceColWidth = 16;
    const contentWidth = labelWidth - priceColWidth;
    const topBlockHeight = 38;
    const bottomBlockHeight = labelHeight - topBlockHeight;

    const barcodeWidth = contentWidth - margin * 2;
    const barcodeHeight = bottomBlockHeight - margin * 2;

    const headerFontSize = 7;
    const nameFontSize = 7;
    const sizesFontSize = 7;
    const priceFontSize = 12;

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const item of items) {
      const page = pdfDoc.addPage([labelWidth, labelHeight]);

      // ── TOP-LEFT BLOCK: Header + Name + Pointure ──────────
      let textY = labelHeight - margin - headerFontSize;

      // Store/header line (mimic picture)
      const headerText = "Original Caba Sport";
      page.drawText(headerText, {
        x: margin,
        y: textY,
        size: headerFontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Simple dashed separator under header
      textY -= headerFontSize + 1;
      page.drawText("--------------------", {
        x: margin,
        y: textY,
        size: 5,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Move down for name
      textY -= nameFontSize + 2;

      // Truncate name if too wide
      const maxNameWidth = contentWidth - margin * 2;
      let nameText = item.name;
      while (
        fontBold.widthOfTextAtSize(nameText, nameFontSize) > maxNameWidth &&
        nameText.length > 1
      ) {
        nameText = nameText.slice(0, -1);
      }
      if (nameText !== item.name) nameText += "…";

      page.drawText(nameText, {
        x: margin,
        y: textY,
        size: nameFontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      textY -= nameFontSize + 2;

      // Format sizes — collapse sequential runs into ranges
      const formattedSizes = formatSizes(item.sizes);
      const sizesLabel = `Pointure: ${formattedSizes}`;

      // Split into two lines only if still too wide after formatting
      const maxSizesWidth = contentWidth - margin * 2;
      if (fontBold.widthOfTextAtSize(sizesLabel, sizesFontSize) <= maxSizesWidth) {
        // Fits in one line
        page.drawText(sizesLabel, {
          x: margin,
          y: textY,
          size: sizesFontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
      } else {
        // Split at comma nearest to the middle
        const parts = formattedSizes.split(", ");
        const mid = Math.ceil(parts.length / 2);
        const line1 = `Pointure: ${parts.slice(0, mid).join(", ")}`;
        const line2 = parts.slice(mid).join(", ");

        page.drawText(line1, {
          x: margin,
          y: textY,
          size: sizesFontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        if (line2) {
          textY -= sizesFontSize + 2;
          page.drawText(line2, {
            x: margin + 8,
            y: textY,
            size: sizesFontSize,
            font: fontBold,
            color: rgb(0, 0, 0),
          });
        }
      }

      // ── BOTTOM-LEFT BLOCK: Barcode centered ───────────────
      const barcodePngUrl = await generateBarcodePNG(
        item.id,
        barcodeWidth,
        barcodeHeight,
      );
      const pngImage = await pdfDoc.embedPng(barcodePngUrl);

      // Center barcode within the bottom block
      const barcodeX = (contentWidth - barcodeWidth) / 2;
      const barcodeY = (bottomBlockHeight - barcodeHeight) / 2;

      page.drawImage(pngImage, {
        x: barcodeX,
        y: barcodeY,
        width: barcodeWidth,
        height: barcodeHeight,
      });

      // ── RIGHT BLOCK: Price rotated 90° ────────────────────
      const priceText = `${item.price} DA`;
      const priceTextWidth = fontBold.widthOfTextAtSize(priceText, priceFontSize);

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

