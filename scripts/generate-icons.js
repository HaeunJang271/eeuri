const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = path.join(__dirname, '../public/imgs/icon.png');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 PWA 아이콘 생성 중...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`✅ icon-${size}x${size}.png 생성 완료`);
  }
  
  console.log('\n🎉 모든 PWA 아이콘이 생성되었습니다!');
}

generateIcons().catch(err => {
  console.error('❌ 아이콘 생성 중 오류 발생:', err);
  process.exit(1);
});

