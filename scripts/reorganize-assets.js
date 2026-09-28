const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.resolve(rootDir, 'assets');
const tarotDir = path.resolve(assetsDir, 'tarot');
const cardsJsonPath = path.resolve(rootDir, 'server/src/data/cards.json');

if (!fs.existsSync(cardsJsonPath)) {
  console.error('cards.json not found at:', cardsJsonPath);
  process.exit(1);
}

const cardsData = JSON.parse(fs.readFileSync(cardsJsonPath, 'utf8'));
const cards = cardsData.cards;

console.log(`Loaded ${cards.length} cards from server/src/data/cards.json`);

// 目标目录结构定义:
// assets/pages/
//   home/ (首页灵境主台 3D 抽牌与动效用缩略图)
//     card_back.jpg
//     cards/
//       card_00_the_fool.jpg
//       ...
//   reading/ (能量解析页与海报预览页高清大图)
//     card_back.jpg
//     cards/
//       card_00_the_fool.jpg
//       ...

const pagesDir = path.resolve(assetsDir, 'pages');
const homeDir = path.resolve(pagesDir, 'home');
const homeCardsDir = path.resolve(homeDir, 'cards');
const readingDir = path.resolve(pagesDir, 'reading');
const readingCardsDir = path.resolve(readingDir, 'cards');

[pagesDir, homeDir, homeCardsDir, readingDir, readingCardsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. 复制并重命名卡背
const srcBack = path.resolve(tarotDir, 'back.jpg');
const srcBackLarge = path.resolve(tarotDir, 'large/back.jpg');

const dstHomeBack = path.resolve(homeDir, 'card_back.jpg');
const dstReadingBack = path.resolve(readingDir, 'card_back.jpg');

if (fs.existsSync(srcBack)) {
  fs.copyFileSync(srcBack, dstHomeBack);
  console.log('Copied home card_back.jpg');
}
if (fs.existsSync(srcBackLarge)) {
  fs.copyFileSync(srcBackLarge, dstReadingBack);
  console.log('Copied reading card_back.jpg');
} else if (fs.existsSync(srcBack)) {
  fs.copyFileSync(srcBack, dstReadingBack);
}

// 2. 复制并重命名卡牌
const manifest = {
  version: '2.0.0',
  description: '心芒灵境卡牌多页面 OSS 资源目录清单与映射规范',
  pages: {
    home: {
      pageRoute: '/pages/index/index',
      pageName: '灵境主台 (首页 3D 抽牌动效)',
      assetDir: 'pages/home',
      backImage: 'pages/home/card_back.jpg',
      cardsDir: 'pages/home/cards'
    },
    reading: {
      pageRoute: '/pages/reading/result',
      pageName: '能量解析与朋友圈海报页 (高清原画大图)',
      assetDir: 'pages/reading',
      backImage: 'pages/reading/card_back.jpg',
      cardsDir: 'pages/reading/cards'
    }
  },
  items: []
};

for (const card of cards) {
  const padIndex = String(card.index).padStart(2, '0');
  const safeSlug = card.slug.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const filename = `card_${padIndex}_${safeSlug}.jpg`;

  // 首页用缩略图
  const srcHomeCard = path.resolve(tarotDir, 'cards', `${padIndex}.jpg`);
  const dstHomeCard = path.resolve(homeCardsDir, filename);

  // 解析与海报页用大图
  const srcReadingCard = path.resolve(tarotDir, 'large', `${padIndex}.jpg`);
  const dstReadingCard = path.resolve(readingCardsDir, filename);

  if (fs.existsSync(srcHomeCard)) {
    fs.copyFileSync(srcHomeCard, dstHomeCard);
  } else {
    console.warn(`Missing source home card: ${srcHomeCard}`);
  }

  if (fs.existsSync(srcReadingCard)) {
    fs.copyFileSync(srcReadingCard, dstReadingCard);
  } else {
    console.warn(`Missing source reading card: ${srcReadingCard}`);
  }

  manifest.items.push({
    index: card.index,
    nameCn: card.nameCn,
    nameEn: card.nameEn,
    slug: card.slug,
    category: card.category,
    filename,
    pages: {
      home: {
        page: 'home',
        relPath: `pages/home/cards/${filename}`,
        description: '首页 3D 洗牌/翻牌动效卡面'
      },
      reading: {
        page: 'reading',
        relPath: `pages/reading/cards/${filename}`,
        description: '解析页与海报页高保真插画'
      }
    }
  });
}

const manifestPath = path.resolve(pagesDir, 'assets-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Assets reorganization completed successfully!`);
console.log(`Manifest saved to ${manifestPath}`);
console.log(`Total card items processed: ${manifest.items.length}`);
