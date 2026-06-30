const { Jimp } = require('jimp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets', 'images');
const MARK   = path.join(ASSETS, 'brand-mark.png');

async function make(outFile, bgHex, canvasW, canvasH, markRatio) {
  const bg   = new Jimp({ width: canvasW, height: canvasH, color: bgHex });
  const mark = await Jimp.read(MARK);
  const mSize = Math.round(Math.min(canvasW, canvasH) * markRatio);
  mark.resize({ w: mSize });
  const x = Math.round((canvasW - mark.width)  / 2);
  const y = Math.round((canvasH - mark.height) / 2);
  bg.composite(mark, x, y);
  await bg.write(outFile);
  console.log('wrote', outFile);
}

(async () => {
  // App icon: 1024x1024, primary green bg, mark at 65%
  await make(path.join(ASSETS, 'icon.png'),          0x2AB48Fff, 1024, 1024, 0.65);
  // Android adaptive icon foreground: transparent bg -> use white bg here
  await make(path.join(ASSETS, 'adaptive-icon.png'), 0x2AB48Fff, 1024, 1024, 0.65);
  // Splash: 1284x2778 (iPhone 14 Pro Max), dark bg, mark at 35%
  await make(path.join(ASSETS, 'splash.png'),        0x121212ff, 1284, 2778, 0.35);
})();
