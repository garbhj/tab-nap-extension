export async function generateSleepingFavicon(pageUrl) {
  // Using Chrome's internial favicon API
  const favUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;
  const response = await fetch(favUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  // Default appearance: grey dot, shrunk faded logo
  ctx.filter = "saturate(0.3)";
  ctx.globalAlpha = 0.5;
  ctx.drawImage(bitmap, 0, 0, 32, 32);  // or 4, 4, 24, 24
  
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.fillStyle="rgb(170, 170, 170)";
  ctx.arc(28, 28, 5, 0, 2*Math.PI);
  ctx.fill();
  
  // canvas -> blob -> base64 data URL
  const outBlob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(outBlob);
  });
}
