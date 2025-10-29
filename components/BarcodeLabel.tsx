"use client";

import Barcode from "react-barcode";

type Props = {
  id: string;
  topLine?: string;
  bottomLine?: string;
  widthIn?: number; // label width in inches (default 2)
  heightIn?: number; // label height in inches (default 1)
};

export function BarcodeLabel({
  id,
  topLine,
  bottomLine,
  widthIn = 2,
  heightIn = 1,
}: Props) {
  const style: React.CSSProperties = {
    width: `${widthIn}in`,
    height: `${heightIn}in`,
    padding: "4px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  return (
    <div style={style}>
      <div
        style={{
          fontSize: 10,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {topLine}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Barcode
          value={id}
          format="CODE128"
          displayValue={false}
          width={1}
          height={Math.max(10, heightIn * 20)}
          margin={0}
        />
      </div>
      <div
        style={{
          fontSize: 9,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {bottomLine ?? id}
      </div>
    </div>
  );
}


