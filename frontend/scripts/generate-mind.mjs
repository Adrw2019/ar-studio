import fs from 'fs';
import path from 'path';
import { encode } from '@msgpack/msgpack';

// Estructura de Target para MindAR v2
function createMockTarget(width = 400, height = 500) {
  // Puntos de tracking característicos
  const points = [];
  for (let y = 50; y < height - 50; y += 40) {
    for (let x = 50; x < width - 50; x += 40) {
      points.push({ x, y });
    }
  }

  // Feature points con descriptores de 8 enteros
  const featurePoints = [];
  for (let i = 0; i < 30; i++) {
    featurePoints.push({
      maxima: i % 2 === 0,
      x: 60 + (i * 25) % (width - 120),
      y: 60 + (i * 35) % (height - 120),
      scale: 1,
      angle: 0,
      descriptors: [12345678, 23456789, 34567890, 45678901, 56789012, 67890123, 78901234, 89012345]
    });
  }

  const matchingData = [
    {
      maximaPoints: featurePoints.filter(p => p.maxima),
      minimaPoints: featurePoints.filter(p => !p.maxima),
      maximaPointsCluster: {
        rootNode: {
          leaf: true,
          pointIndexes: [0, 1, 2, 3, 4, 5, 6, 7]
        }
      },
      minimaPointsCluster: {
        rootNode: {
          leaf: true,
          pointIndexes: [0, 1, 2, 3, 4, 5, 6, 7]
        }
      },
      width,
      height,
      scale: 1
    }
  ];

  const trackingData = [
    {
      data: new Uint8Array(width * height),
      width,
      height,
      scale: 1,
      points
    },
    {
      data: new Uint8Array(Math.floor(width / 2) * Math.floor(height / 2)),
      width: Math.floor(width / 2),
      height: Math.floor(height / 2),
      scale: 0.5,
      points
    },
    {
      data: new Uint8Array(Math.floor(width / 4) * Math.floor(height / 4)),
      width: Math.floor(width / 4),
      height: Math.floor(height / 4),
      scale: 0.25,
      points
    }
  ];

  return {
    targetImage: { width, height },
    matchingData,
    trackingData
  };
}

const target0 = createMockTarget(400, 500); // Motor
const target1 = createMockTarget(400, 500); // Energía

const mindData = {
  v: 2,
  dataList: [target0, target1]
};

const encoded = encode(mindData);
const targetPath = path.resolve('public/markers/targets.mind');

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, Buffer.from(encoded));
console.log(`✅ targets.mind generado exitosamente en ${targetPath} (${encoded.length} bytes)`);
