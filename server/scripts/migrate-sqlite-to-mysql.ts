/// <reference types="node" />
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { prisma } from '../src/models/prisma';

function querySqlite(dbPath: string, sql: string): any[] {
  try {
    const raw = execSync(`sqlite3 "${dbPath}" ".mode json" "${sql}"`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8'
    }).trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err: any) {
    console.error(`Error querying SQLite for SQL: ${sql}`, err.message);
    return [];
  }
}

function parseDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val === 'number') return new Date(val);
  const num = Number(val);
  if (!isNaN(num) && num > 1000000000) return new Date(num);
  return new Date(val);
}

async function runMigration() {
  const sqliteDbPath = path.resolve(__dirname, '../prisma/dev.db');
  if (!fs.existsSync(sqliteDbPath)) {
    console.log(`[迁移] SQLite 数据库不存在: ${sqliteDbPath}，跳过数据迁移。`);
    return;
  }

  console.log(`====================================================`);
  console.log(`🚀 开始从 SQLite (${sqliteDbPath}) 迁移数据至 MySQL...`);
  console.log(`====================================================`);

  // 1. AdminUser
  const adminRows = querySqlite(sqliteDbPath, 'SELECT * FROM AdminUser;');
  console.log(`[迁移] 发现 AdminUser 记录: ${adminRows.length} 条`);
  for (const row of adminRows) {
    await prisma.adminUser.upsert({
      where: { username: row.username },
      update: {
        password: row.password,
        role: row.role || 'admin',
        created_at: parseDate(row.created_at)
      },
      create: {
        id: row.id,
        username: row.username,
        password: row.password,
        role: row.role || 'admin',
        created_at: parseDate(row.created_at)
      }
    });
  }

  // 2. SystemSetting
  const settingRows = querySqlite(sqliteDbPath, 'SELECT * FROM SystemSetting;');
  console.log(`[迁移] 发现 SystemSetting 记录: ${settingRows.length} 条`);
  for (const row of settingRows) {
    await prisma.systemSetting.upsert({
      where: { key: row.key },
      update: {
        value: row.value,
        description: row.description,
        updated_at: parseDate(row.updated_at)
      },
      create: {
        key: row.key,
        value: row.value,
        description: row.description,
        updated_at: parseDate(row.updated_at)
      }
    });
  }

  // 3. SensitiveWord
  const sensitiveRows = querySqlite(sqliteDbPath, 'SELECT * FROM SensitiveWord;');
  console.log(`[迁移] 发现 SensitiveWord 记录: ${sensitiveRows.length} 条`);
  for (const row of sensitiveRows) {
    await prisma.sensitiveWord.upsert({
      where: { word: row.word },
      update: {
        category: row.category,
        created_at: parseDate(row.created_at)
      },
      create: {
        word: row.word,
        category: row.category,
        created_at: parseDate(row.created_at)
      }
    });
  }

  // 4. User
  const userRows = querySqlite(sqliteDbPath, 'SELECT * FROM User;');
  console.log(`[迁移] 发现 User 记录: ${userRows.length} 条`);
  for (const row of userRows) {
    await prisma.user.upsert({
      where: { openid: row.openid },
      update: {
        bonus_energy: row.bonus_energy || 0,
        last_free_date: row.last_free_date || null,
        free_used_today: row.free_used_today || 0,
        is_blacklisted: Boolean(row.is_blacklisted),
        updated_at: parseDate(row.updated_at)
      },
      create: {
        id: row.id,
        openid: row.openid,
        bonus_energy: row.bonus_energy || 0,
        last_free_date: row.last_free_date || null,
        free_used_today: row.free_used_today || 0,
        is_blacklisted: Boolean(row.is_blacklisted),
        created_at: parseDate(row.created_at),
        updated_at: parseDate(row.updated_at)
      }
    });
  }

  // 5. TarotCard
  const cardRows = querySqlite(sqliteDbPath, 'SELECT * FROM TarotCard;');
  console.log(`[迁移] 发现 TarotCard 记录: ${cardRows.length} 条`);
  for (const row of cardRows) {
    await prisma.tarotCard.upsert({
      where: { id: row.id },
      update: {
        name_cn: row.name_cn,
        name_en: row.name_en,
        slug: row.slug,
        category: row.category,
        category_name: row.category_name,
        roman: row.roman || null,
        element: row.element || null,
        tags: row.tags || '[]',
        quote: row.quote || null,
        insight: row.insight || null,
        challenge: row.challenge || null,
        guidance: row.guidance || null,
        affirmation: row.affirmation || null,
        home_image_key: row.home_image_key || null,
        home_image_url: row.home_image_url || null,
        reading_image_key: row.reading_image_key || null,
        reading_image_url: row.reading_image_url || null,
        back_image_key: row.back_image_key || null,
        back_image_url: row.back_image_url || null,
        updated_at: parseDate(row.updated_at)
      },
      create: {
        id: row.id,
        name_cn: row.name_cn,
        name_en: row.name_en,
        slug: row.slug,
        category: row.category,
        category_name: row.category_name,
        roman: row.roman || null,
        element: row.element || null,
        tags: row.tags || '[]',
        quote: row.quote || null,
        insight: row.insight || null,
        challenge: row.challenge || null,
        guidance: row.guidance || null,
        affirmation: row.affirmation || null,
        home_image_key: row.home_image_key || null,
        home_image_url: row.home_image_url || null,
        reading_image_key: row.reading_image_key || null,
        reading_image_url: row.reading_image_url || null,
        back_image_key: row.back_image_key || null,
        back_image_url: row.back_image_url || null,
        created_at: parseDate(row.created_at),
        updated_at: parseDate(row.updated_at)
      }
    });
  }

  // 6. PageAsset
  const assetRows = querySqlite(sqliteDbPath, 'SELECT * FROM PageAsset;');
  console.log(`[迁移] 发现 PageAsset 记录: ${assetRows.length} 条`);
  for (const row of assetRows) {
    await prisma.pageAsset.upsert({
      where: { oss_key: row.oss_key },
      update: {
        page: row.page,
        page_name: row.page_name,
        asset_name: row.asset_name,
        asset_type: row.asset_type,
        local_path: row.local_path,
        oss_url: row.oss_url,
        file_size: row.file_size || null,
        mime_type: row.mime_type || null,
        description: row.description || null,
        updated_at: parseDate(row.updated_at)
      },
      create: {
        id: row.id,
        page: row.page,
        page_name: row.page_name,
        asset_name: row.asset_name,
        asset_type: row.asset_type,
        local_path: row.local_path,
        oss_key: row.oss_key,
        oss_url: row.oss_url,
        file_size: row.file_size || null,
        mime_type: row.mime_type || null,
        description: row.description || null,
        created_at: parseDate(row.created_at),
        updated_at: parseDate(row.updated_at)
      }
    });
  }

  // 7. TarotReading
  const readingRows = querySqlite(sqliteDbPath, 'SELECT * FROM TarotReading;');
  console.log(`[迁移] 发现 TarotReading 记录: ${readingRows.length} 条`);
  for (const row of readingRows) {
    const existing = await prisma.tarotReading.findUnique({ where: { id: row.id } });
    if (!existing) {
      await prisma.tarotReading.create({
        data: {
          id: row.id,
          user_id: row.user_id,
          card_id: row.card_id,
          card_name: row.card_name,
          orientation: row.orientation || 'upright',
          user_question: row.user_question || null,
          reading_result: row.reading_result || null,
          status: row.status || 'completed',
          created_at: parseDate(row.created_at)
        }
      });
    }
  }

  // 8. Invitation
  const inviteRows = querySqlite(sqliteDbPath, 'SELECT * FROM Invitation;');
  console.log(`[迁移] 发现 Invitation 记录: ${inviteRows.length} 条`);
  for (const row of inviteRows) {
    const existing = await prisma.invitation.findUnique({ where: { id: row.id } });
    if (!existing) {
      await prisma.invitation.create({
        data: {
          id: row.id,
          inviter_id: row.inviter_id,
          invitee_id: row.invitee_id,
          date_str: row.date_str,
          created_at: parseDate(row.created_at)
        }
      });
    }
  }

  console.log('✨ SQLite 数据已全部平滑迁移至 MySQL 数据库！');
}

runMigration()
  .catch((err) => {
    console.error('❌ 数据迁移异常:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
