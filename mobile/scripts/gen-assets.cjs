const { Jimp } = require('jimp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets', 'images');
const MARK   = path.join(ASSETS, 'brand-mark.png');

async function make(outFile, bgHex, canvasW, canvasH, markRatio, transparentBg = false) {
  let bg;
  if (transparentBg) {
    bg = new Jimp({ width: canvasW, height: canvasH, color: 0x00000000 });
  } else {
    bg = new Jimp({ width: canvasW, height: canvasH, color: bgHex });
  }
  const mark = await Jimp.read(MARK);

  // If brand-mark.png has no alpha (solid white or colored background):
  // make white/near-white pixels transparent
  if (!mark.hasAlpha()) {
    mark.scan(0, 0, mark.width, mark.height, function (x, y, idx) {
      const r = this.bitmap.data[idx];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      // treat near-white (>240 on all channels) as transparent
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 3] = 0;
      }
    });
  }

  const mSize = Math.round(Math.min(canvasW, canvasH) * markRatio);
  mark.resize({ w: mSize });
  const x = Math.round((canvasW - mark.width)  / 2);
  const y = Math.round((canvasH - mark.height) / 2);
  bg.composite(mark, x, y);
  await bg.write(outFile);
  console.log('wrote', outFile);
}

(async () => {
  // icon.png: green background, mark at 60% (slightly smaller for breathing room)
  await make(path.join(ASSETS, 'icon.png'), 0x2AB48Fff, 1024, 1024, 0.60);

  // adaptive-icon.png: TRANSPARENT background (app.json adaptiveIcon.backgroundColor
  // provides the green — green-on-green would hide the mark entirely)
  await make(path.join(ASSETS, 'adaptive-icon.png'), 0x00000000, 1024, 1024, 0.70, true);

  // splash.png: dark bg, mark smaller for elegance
  await make(path.join(ASSETS, 'splash.png'), 0x121212ff, 1284, 2778, 0.28);
})();
