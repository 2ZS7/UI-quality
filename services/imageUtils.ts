export interface DiffCalcResult {
  diffPercentage: number;
  diffImageData: ImageData;
}

export interface IgnoreRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ComparisonMethod = 'PIXEL' | 'STRICT' | 'LUMINANCE';

export const compareImages = (
  img1Data: ImageData,
  img2Data: ImageData,
  ignoreRegions: IgnoreRegion[] = [],
  method: ComparisonMethod = 'PIXEL'
): DiffCalcResult => {
  const width = img1Data.width;
  const height = img1Data.height;
  const length = width * height * 4;

  const diffData = new Uint8ClampedArray(length);
  let diffPixels = 0;

  for (let i = 0; i < length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    // Check if current pixel is inside any ignored region
    let isIgnored = false;
    for (const region of ignoreRegions) {
      if (
        x >= region.x &&
        x < region.x + region.width &&
        y >= region.y &&
        y < region.y + region.height
      ) {
        isIgnored = true;
        break;
      }
    }

    const r1 = img1Data.data[i];
    const g1 = img1Data.data[i + 1];
    const b1 = img1Data.data[i + 2];
    const a1 = img1Data.data[i + 3];

    if (isIgnored) {
      // Render ignored pixels in grayscale to visually indicate they were skipped
      const gray = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
      diffData[i] = gray;     // R
      diffData[i + 1] = gray; // G
      diffData[i + 2] = gray; // B
      diffData[i + 3] = 255;  // A (Fully opaque)
      continue; // Skip diff calculation
    }

    const r2 = img2Data.data[i];
    const g2 = img2Data.data[i + 1];
    const b2 = img2Data.data[i + 2];
    const a2 = img2Data.data[i + 3];

    let isDifferent = false;

    if (method === 'STRICT') {
      // Exact match required
      if (r1 !== r2 || g1 !== g2 || b1 !== b2 || a1 !== a2) {
        isDifferent = true;
      }
    } else if (method === 'LUMINANCE') {
      // Compare brightness/luminance only
      const lum1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
      const lum2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
      // Use a small tolerance for luminance to avoid noise
      if (Math.abs(lum1 - lum2) > 10) {
        isDifferent = true;
      }
    } else {
      // 'PIXEL' - Default Euclidean Distance
      const dist = Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2) +
        Math.pow(a1 - a2, 2)
      );
      
      // Threshold for difference
      if (dist > 10) { 
        isDifferent = true;
      }
    }

    if (isDifferent) { 
      // Mark as Red for difference
      diffData[i] = 255;     // R
      diffData[i + 1] = 0;   // G
      diffData[i + 2] = 0;   // B
      diffData[i + 3] = 255; // A
      diffPixels++;
    } else {
      // Fade out non-diff pixels for better visibility of changes
      const fade = 0.1;
      diffData[i] = r1 * fade + 255 * (1 - fade);
      diffData[i + 1] = g1 * fade + 255 * (1 - fade);
      diffData[i + 2] = b1 * fade + 255 * (1 - fade);
      diffData[i + 3] = 255;
    }
  }

  // Calculate total pixels
  const totalPixels = width * height;
  const diffPercentage = (diffPixels / totalPixels) * 100;

  return {
    diffPercentage,
    diffImageData: new ImageData(diffData, width, height)
  };
};

export const imageDataToDataUrl = (imageData: ImageData): string => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }
  return '';
};