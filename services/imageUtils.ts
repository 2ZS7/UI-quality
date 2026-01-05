export interface DiffCalcResult {
  diffPercentage: number;
  diffImageData: ImageData;
}

export const compareImages = (
  img1Data: ImageData,
  img2Data: ImageData
): DiffCalcResult => {
  const width = img1Data.width;
  const height = img1Data.height;
  const length = width * height * 4;

  const diffData = new Uint8ClampedArray(length);
  let diffPixels = 0;

  for (let i = 0; i < length; i += 4) {
    const r1 = img1Data.data[i];
    const g1 = img1Data.data[i + 1];
    const b1 = img1Data.data[i + 2];
    const a1 = img1Data.data[i + 3];

    const r2 = img2Data.data[i];
    const g2 = img2Data.data[i + 1];
    const b2 = img2Data.data[i + 2];
    const a2 = img2Data.data[i + 3];

    // Simple Euclidean distance for color difference
    // We ignore alpha for simple visual diffing if fully transparent
    const dist = Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2) +
      Math.pow(a1 - a2, 2)
    );

    // Threshold for difference
    if (dist > 10) { 
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
