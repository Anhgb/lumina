/**
 * watermarkHelper.js — Stamping watermark on 3D design snapshots.
 * Conforms to PRD Section 2.4 (Rule 4) & Section 5.7 (Rule 3):
 * "Tạo ảnh canvas.toDataURL('image/png'), vẽ watermark LUMINA EYEWEAR ở góc dưới bên phải bằng watermarkHelper.js, rồi nhận về Snapshot cuối cùng."
 */

/**
 * Draws the Lumina Eyewear watermark on a snapshot image data URL.
 * @param {string} sourceDataUrl - Base64 image data URL from Three.js canvas
 * @returns {Promise<string>} - Base64 PNG image with branded watermark
 */
export function addWatermarkToSnapshot(sourceDataUrl) {
  return new Promise((resolve) => {
    if (!sourceDataUrl || typeof sourceDataUrl !== 'string') {
      resolve(sourceDataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      // Draw original 3D render
      ctx.drawImage(img, 0, 0);

      // Watermark styling
      const padX = 24;
      const padY = 24;
      const x = canvas.width - padX;
      const y = canvas.height - padY;

      // Subtle dark vignette/scrim bar behind watermark for readability
      const boxWidth = 260;
      const boxHeight = 44;
      ctx.fillStyle = 'rgba(13, 13, 13, 0.75)';
      ctx.fillRect(x - boxWidth, y - boxHeight + 8, boxWidth, boxHeight);

      // Gold accent hairline
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - boxWidth, y - boxHeight + 8, boxWidth, boxHeight);

      // Brand text
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      // Star icon + LUMINA EYEWEAR
      ctx.font = '600 13px "Cinzel", "Times New Roman", serif';
      ctx.fillStyle = '#D4AF37';
      ctx.fillText('✦ LUMINA EYEWEAR', x - 12, y - 14);

      // Subtitle
      ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FAF8F5';
      ctx.fillText('BESPOKE 3D ATELIER • HANDCRAFTED', x - 12, y - 2);

      try {
        const watermarkedUrl = canvas.toDataURL('image/png', 0.92);
        resolve(watermarkedUrl);
      } catch (err) {
        console.warn('[watermarkHelper] Failed to export watermarked canvas, returning original:', err);
        resolve(sourceDataUrl);
      }
    };

    img.onerror = () => {
      resolve(sourceDataUrl);
    };

    img.src = sourceDataUrl;
  });
}
