import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrMatrixProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrMatrix: React.FC<QrMatrixProps> = ({
  value,
  size = 240,
  className = '',
}) => {
  const modules = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const data = qr.modules.data;
    const cells: { x: number; y: number }[] = [];

    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        if (data[y * count + x]) {
          cells.push({ x, y });
        }
      }
    }

    return { count, cells };
  }, [value]);

  const quietZone = 2;
  const viewBoxSize = modules.count + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Dynamic attendance QR token ${value}`}
      className={`block bg-white ${className}`}
    >
      <rect x={0} y={0} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      <g fill="#0f172a">
        {modules.cells.map((cell) => (
          <rect
            key={`${cell.x}-${cell.y}`}
            x={cell.x + quietZone}
            y={cell.y + quietZone}
            width={1}
            height={1}
          />
        ))}
      </g>
    </svg>
  );
};
