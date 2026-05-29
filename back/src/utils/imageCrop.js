import sharp from 'sharp';

/**
 * @param {Buffer} inputBuffer
 * @param {{ x: number, y: number, width: number, height: number }} cropRegion 0~1 정규화
 */
export async function cropImageBuffer(inputBuffer, cropRegion) {
  if (!cropRegion || cropRegion.width == null) {
    return inputBuffer;
  }

  const meta = await sharp(inputBuffer).metadata();
  const imgW = meta.width || 0;
  const imgH = meta.height || 0;
  if (!imgW || !imgH) return inputBuffer;

  const left = Math.max(0, Math.min(imgW - 1, Math.round(cropRegion.x * imgW)));
  const top = Math.max(0, Math.min(imgH - 1, Math.round(cropRegion.y * imgH)));
  const width = Math.max(
    1,
    Math.min(imgW - left, Math.round(cropRegion.width * imgW)),
  );
  const height = Math.max(
    1,
    Math.min(imgH - top, Math.round(cropRegion.height * imgH)),
  );

  return sharp(inputBuffer)
    .extract({ left, top, width, height })
    .jpeg({ quality: 88 })
    .toBuffer();
}

export async function cropBase64Image(imageBase64, cropRegion) {
  const raw = String(imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
  if (!raw) return Buffer.from([]);

  const input = Buffer.from(raw, 'base64');
  if (!cropRegion) return input;
  return cropImageBuffer(input, cropRegion);
}
