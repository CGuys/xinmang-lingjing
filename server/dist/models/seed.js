"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const constants_1 = require("../config/constants");
async function main() {
    console.log('🌱 Starting database seeding...');
    // 1. 初始化管理员账号
    const existingAdmin = await prisma_1.prisma.adminUser.findUnique({
        where: { username: 'admin' }
    });
    if (!existingAdmin) {
        const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
        await prisma_1.prisma.adminUser.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                role: 'superadmin'
            }
        });
        console.log('✅ Admin user created: admin / admin123');
    }
    // 2. 初始化策略中控参数
    for (const [key, val] of Object.entries(constants_1.DEFAULT_STRATEGY_CONFIG)) {
        await prisma_1.prisma.systemSetting.upsert({
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
    await prisma_1.prisma.systemSetting.upsert({
        where: { key: 'ai_config' },
        update: {},
        create: {
            key: 'ai_config',
            value: JSON.stringify(constants_1.DEFAULT_AI_CONFIG),
            description: '大模型网关参数与 System Prompt 编排配置'
        }
    });
    // 4. 初始化敏感词字典
    for (const word of constants_1.DEFAULT_SENSITIVE_WORDS) {
        await prisma_1.prisma.sensitiveWord.upsert({
            where: { word },
            update: {},
            create: {
                word,
                category: 'superstition'
            }
        });
    }
    console.log(`✅ Default sensitive words seeded (${constants_1.DEFAULT_SENSITIVE_WORDS.length} words).`);
    console.log('🎉 Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
