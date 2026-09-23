import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { DEFAULT_STRATEGY_CONFIG, DEFAULT_AI_CONFIG, DEFAULT_SENSITIVE_WORDS } from '../config/constants';

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. 初始化管理员账号
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { username: 'admin' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'superadmin'
      }
    });
    console.log('✅ Admin user created: admin / admin123');
  }

  // 2. 初始化策略中控参数
  for (const [key, val] of Object.entries(DEFAULT_STRATEGY_CONFIG)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: typeof val === 'object' ? JSON.stringify(val) : String(val),
        description: `默认业务策略: ${key}`
      }
    });
  }

  // 3. 初始化 AI 配置
  await prisma.systemSetting.upsert({
    where: { key: 'ai_config' },
    update: {},
    create: {
      key: 'ai_config',
      value: JSON.stringify(DEFAULT_AI_CONFIG),
      description: '大模型网关参数与 System Prompt 编排配置'
    }
  });

  // 4. 初始化敏感词字典
  for (const word of DEFAULT_SENSITIVE_WORDS) {
    await prisma.sensitiveWord.upsert({
      where: { word },
      update: {},
      create: {
        word,
        category: 'superstition'
      }
    });
  }

  console.log(`✅ Default sensitive words seeded (${DEFAULT_SENSITIVE_WORDS.length} words).`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
