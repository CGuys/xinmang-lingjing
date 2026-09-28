import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { OssService } from '../src/services/oss.service';
import { ENV } from '../src/config/constants';

const prisma = new PrismaClient();

const rootDir = path.resolve(__dirname, '../..');
const assetsPagesDir = path.resolve(rootDir, 'assets/pages');
const cardsJsonPath = path.resolve(__dirname, '../src/data/cards.json');

async function main() {
  console.log('========================================================');
  console.log('   心芒灵境 · 页面资源规范重命名与阿里云 OSS 上传入库脚本   ');
  console.log('========================================================');
  console.log(`[配置] OSS 目标 Bucket: ${ENV.OSS_BUCKET}`);
  console.log(`[配置] OSS 区域: ${ENV.OSS_REGION}`);
  console.log(`[配置] 本地资源目录: ${assetsPagesDir}`);

  if (!fs.existsSync(assetsPagesDir)) {
    throw new Error(`本地资源目录不存在: ${assetsPagesDir}，请先执行 npm run reorganize-assets`);
  }

  // 1. 初始化 OSS Client
  const ossClient = OssService.getClient();

  // 检查/创建 Bucket
  try {
    await ossClient.getBucketInfo(ENV.OSS_BUCKET);
    console.log(`[OSS] 存储桶 ${ENV.OSS_BUCKET} 状态正常`);
  } catch (err: any) {
    console.log(`[OSS] 存储桶状态检查: ${err.message}，尝试创建...`);
    try {
      await ossClient.putBucket(ENV.OSS_BUCKET);
      console.log(`[OSS] 存储桶 ${ENV.OSS_BUCKET} 创建成功`);
    } catch (createErr: any) {
      console.warn(`[OSS] 创建存储桶提示: ${createErr.message}`);
    }
  }

  // 2. 收集所有待上传文件
  function scanFiles(dir: string, baseDir: string): { localPath: string; relKey: string; size: number }[] {
    let results: { localPath: string; relKey: string; size: number }[] = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item.startsWith('.')) continue;
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(scanFiles(fullPath, baseDir));
      } else {
        const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        results.push({
          localPath: fullPath,
          relKey: `pages/${rel}`,
          size: stat.size
        });
      }
    }
    return results;
  }

  const allFiles = scanFiles(assetsPagesDir, assetsPagesDir);
  console.log(`[扫描] 共发现 ${allFiles.length} 个待托管页面资源文件`);

  // 3. 批量并发上传到 OSS
  console.log('\n[上传] 开始并发推送资源到阿里云 OSS...');
  const uploadMap = new Map<string, { ossKey: string; baseUrl: string; signedUrl: string }>();
  let successCount = 0;
  let failCount = 0;

  const concurrency = 6;
  for (let i = 0; i < allFiles.length; i += concurrency) {
    const chunk = allFiles.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (file) => {
        try {
          const mimeType = file.relKey.endsWith('.json') ? 'application/json' : 'image/jpeg';
          const uploadRes = await OssService.uploadFile(file.localPath, file.relKey, { mime: mimeType });
          uploadMap.set(file.relKey, {
            ossKey: file.relKey,
            baseUrl: uploadRes.baseUrl,
            signedUrl: uploadRes.signedUrl
          });
          successCount++;
          const progress = Math.round((successCount / allFiles.length) * 100);
          process.stdout.write(`\r[进度] 上传中 (${successCount}/${allFiles.length}) [${progress}%] 当前: ${file.relKey}`);
        } catch (err: any) {
          failCount++;
          console.error(`\n[失败] 上传失败 ${file.relKey}:`, err.message);
        }
      })
    );
  }
  console.log(`\n[上传完成] 成功: ${successCount}, 失败: ${failCount}`);

  // 4. 将 PageAsset 存入数据库
  console.log('\n[数据库] 开始同步 PageAsset 资源明细记录...');
  let assetDbCount = 0;
  for (const file of allFiles) {
    const info = uploadMap.get(file.relKey);
    if (!info) continue;

    let page = 'common';
    let assetType = 'other';
    let assetName = path.basename(file.relKey);

    if (file.relKey.includes('pages/home/')) {
      page = 'home';
      assetType = file.relKey.includes('card_back') ? 'card_back' : 'card_front';
    } else if (file.relKey.includes('pages/reading/')) {
      page = 'reading';
      assetType = file.relKey.includes('card_back') ? 'card_back' : 'card_large';
    }

    await prisma.pageAsset.upsert({
      where: { oss_key: info.ossKey },
      create: {
        page,
        page_name: page === 'home' ? '灵境主台首页 (3D 抽牌)' : '能量解析与海报页',
        asset_name: assetName,
        asset_type: assetType,
        local_path: path.relative(rootDir, file.localPath),
        oss_key: info.ossKey,
        oss_url: info.baseUrl,
        file_size: file.size,
        mime_type: file.relKey.endsWith('.json') ? 'application/json' : 'image/jpeg',
        description: `规范化页面资源：${file.relKey}`
      },
      update: {
        oss_url: info.baseUrl,
        file_size: file.size,
        updated_at: new Date()
      }
    });
    assetDbCount++;
  }
  console.log(`[数据库] PageAsset 资源入库完成: ${assetDbCount} 条记录`);

  // 5. 载入 78 张卡牌数据并写入数据库 TarotCard 表
  console.log('\n[数据库] 开始同步 78 张权威卡牌资产至 TarotCard 表...');
  const cardsRaw = fs.readFileSync(cardsJsonPath, 'utf8');
  const cards = JSON.parse(cardsRaw).cards;

  let cardDbCount = 0;
  for (const card of cards) {
    const padIndex = String(card.index).padStart(2, '0');
    const safeSlug = card.slug.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const filename = `card_${padIndex}_${safeSlug}.jpg`;

    const homeKey = `pages/home/cards/${filename}`;
    const readingKey = `pages/reading/cards/${filename}`;
    const backKey = `pages/home/card_back.jpg`;

    const homeUrl = OssService.getBaseUrl(homeKey);
    const readingUrl = OssService.getBaseUrl(readingKey);
    const backUrl = OssService.getBaseUrl(backKey);

    await prisma.tarotCard.upsert({
      where: { id: card.index },
      create: {
        id: card.index,
        name_cn: card.nameCn,
        name_en: card.nameEn,
        slug: card.slug,
        category: card.category,
        category_name: card.categoryName,
        roman: card.roman || null,
        element: card.element || null,
        tags: JSON.stringify(card.tags || []),
        quote: card.quote || null,
        insight: card.insight || null,
        challenge: card.challenge || null,
        guidance: card.guidance || null,
        affirmation: card.affirmation || null,
        home_image_key: homeKey,
        home_image_url: homeUrl,
        reading_image_key: readingKey,
        reading_image_url: readingUrl,
        back_image_key: backKey,
        back_image_url: backUrl
      },
      update: {
        name_cn: card.nameCn,
        name_en: card.nameEn,
        slug: card.slug,
        category: card.category,
        category_name: card.categoryName,
        roman: card.roman || null,
        element: card.element || null,
        tags: JSON.stringify(card.tags || []),
        quote: card.quote || null,
        insight: card.insight || null,
        challenge: card.challenge || null,
        guidance: card.guidance || null,
        affirmation: card.affirmation || null,
        home_image_key: homeKey,
        home_image_url: homeUrl,
        reading_image_key: readingKey,
        reading_image_url: readingUrl,
        back_image_key: backKey,
        back_image_url: backUrl,
        updated_at: new Date()
      }
    });
    cardDbCount++;
  }
  console.log(`[数据库] TarotCard 78 张卡牌全量数据入库完成: ${cardDbCount} 条记录`);

  // 6. 验证展示前 3 张卡牌信息与带签名 URL
  console.log('\n[验证] 抽样检验卡牌在 OSS 上的可访问签名链接:');
  const sampleCards = await prisma.tarotCard.findMany({ take: 3, orderBy: { id: 'asc' } });
  for (const c of sampleCards) {
    const signedHome = OssService.getSignatureUrl(c.home_image_key || '');
    const signedReading = OssService.getSignatureUrl(c.reading_image_key || '');
    console.log(`--------------------------------------------------------`);
    console.log(`卡牌 #${c.id} 【${c.name_cn}】 (${c.name_en})`);
    console.log(`- 首页 3D 抽牌 OSS 路径: ${c.home_image_key}`);
    console.log(`- 首页 3D 抽牌 访问直链: ${signedHome}`);
    console.log(`- 结果页高清图 OSS 路径: ${c.reading_image_key}`);
    console.log(`- 结果页高清图 访问直链: ${signedReading}`);
  }
  console.log(`--------------------------------------------------------`);
  console.log('✅ 全量资源重命名、OSS 上传与数据库持久化全部顺利完成！\n');
}

main()
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
