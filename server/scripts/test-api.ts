import axios from 'axios';
import { app } from '../src/app';
import { Server } from 'http';

const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server: Server;

async function runTests() {
  console.log('🚀 启动测试服务器并执行 API 全流程集成测试...\n');

  // 1. 启动 HTTP 实例
  await new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`[PASS] 测试服务端就绪: ${BASE_URL}`);
      resolve();
    });
  });

  try {
    // 2. 健康检查
    const healthRes = await axios.get(`${BASE_URL}/health`);
    assert(healthRes.data.status === 'ok', '健康检查返回 ok');
    console.log('✅ [1/15] 健康检查接口 (/health) 测试通过');

    // 3. 静态图片资源加载测试
    const imgRes = await axios.get(`${BASE_URL}/assets/tarot/cards/00.jpg`, { responseType: 'arraybuffer' });
    assert(imgRes.status === 200 && imgRes.data.length > 0, '卡牌 00.jpg 插画可读取');
    console.log('✅ [2/15] 静态卡牌资源托管 (/assets/tarot/cards/00.jpg) 测试通过');

    const runId = Date.now();
    // 4. 用户 Alice 微信静默登录
    const aliceLogin = await axios.post(`${BASE_URL}/api/v1/auth/wx-login`, {
      code: `mock_code_alice_${runId}`
    });
    assert(aliceLogin.data.code === 'SUCCESS', 'Alice 登录成功');
    const aliceToken = aliceLogin.data.data.token;
    const aliceId = aliceLogin.data.data.user.id;
    const aliceAuthHeader = { Authorization: `Bearer ${aliceToken}` };
    console.log(`✅ [3/15] 微信静默登录换取 Token 测试通过 (Alice ID: ${aliceId})`);

    // 5. 查询 Alice 个人资产 (初始应有 1 免费点，0 奖励点)
    const aliceProfile = await axios.get(`${BASE_URL}/api/v1/user/profile`, { headers: aliceAuthHeader });
    assert(aliceProfile.data.data.hasFreeToday === true, '初始应有每日免费点');
    assert(aliceProfile.data.data.bonusEnergy === 0, '初始奖励点为 0');
    console.log('✅ [4/15] 用户资产档案查询 (/api/v1/user/profile) 测试通过');

    // 6. Alice 发起第一次抽牌（应消耗今日免费点）
    const drawRes1 = await axios.post(
      `${BASE_URL}/api/v1/tarot/draw`,
      { question: '面对新挑战，我应当如何调整心理状态？' },
      { headers: aliceAuthHeader }
    );
    assert(drawRes1.data.code === 'SUCCESS', '抽牌成功');
    assert(drawRes1.data.data.energyConsumed === 'free', '首次抽牌消耗 free 能量');
    const readingId = drawRes1.data.data.readingId;
    console.log(`✅ [5/15] 首次抽牌扣除免费能量 (/api/v1/tarot/draw) 测试通过 (抽得: ${drawRes1.data.data.card.nameCn})`);

    // 7. Alice 立即发起第二次抽牌（无奖励点，应被拦截并返回 403 ENERGY_EXHAUSTED）
    try {
      await axios.post(
        `${BASE_URL}/api/v1/tarot/draw`,
        { question: '再抽一次' },
        { headers: aliceAuthHeader }
      );
      assert(false, '第二次抽牌未拦截，异常！');
    } catch (err: any) {
      assert(err.response && err.response.status === 403, '返回 403');
      assert(err.response.data.code === 'ENERGY_EXHAUSTED', '错误码为 ENERGY_EXHAUSTED');
      console.log('✅ [6/15] 免费点耗尽拦截与 403 防刷保护测试通过');
    }

    // 8. 用户 Bob 微信静默登录并测试裂变防刷
    const bobLogin = await axios.post(`${BASE_URL}/api/v1/auth/wx-login`, {
      code: `mock_code_bob_${runId}`
    });
    const bobToken = bobLogin.data.data.token;
    const bobId = bobLogin.data.data.user.id;
    const bobAuthHeader = { Authorization: `Bearer ${bobToken}` };

    // 8.1 Bob 试图通过自己的邀请码为自己加点 (自邀拦截)
    try {
      await axios.post(
        `${BASE_URL}/api/v1/share/accept`,
        { inviter_id: bobId },
        { headers: bobAuthHeader }
      );
      assert(false, '自邀未被拦截');
    } catch (err: any) {
      assert(err.response.status === 400 && err.response.data.code === 'CANNOT_INVITE_SELF', '自邀正确拦截');
      console.log('✅ [7/15] 裂变自邀防作弊校验 (CANNOT_INVITE_SELF) 测试通过');
    }

    // 8.2 Bob 接受 Alice 的分享邀请 (Alice 应获得 +1 bonus 能量)
    const shareAcceptRes = await axios.post(
      `${BASE_URL}/api/v1/share/accept`,
      { inviter_id: aliceId },
      { headers: bobAuthHeader }
    );
    assert(shareAcceptRes.data.data.rewarded === true, '裂变互惠成功');
    assert(shareAcceptRes.data.data.inviterBonusEnergy === 1, 'Alice 奖励点增至 1');
    console.log('✅ [8/15] 好友裂变接受与补能 (/api/v1/share/accept) 测试通过');

    // 8.3 Bob 尝试同一天再次接受 Alice 的邀请 (重复加点拦截)
    const repeatAcceptRes = await axios.post(
      `${BASE_URL}/api/v1/share/accept`,
      { inviter_id: aliceId },
      { headers: bobAuthHeader }
    );
    assert(repeatAcceptRes.data.data.rewarded === false, '同日重复加点被安全拦截');
    console.log('✅ [9/15] 好友同日重复互助防刷校验测试通过');

    // 9. Alice 现在有 1 点 bonus 能量，发起抽牌（应成功扣除 bonus 能量）
    const drawRes2 = await axios.post(
      `${BASE_URL}/api/v1/tarot/draw`,
      { question: '感谢朋友赋能，求问今日灵感' },
      { headers: aliceAuthHeader }
    );
    assert(drawRes2.data.code === 'SUCCESS', '抽牌成功');
    assert(drawRes2.data.data.energyConsumed === 'bonus', '扣除了 bonus 能量');
    console.log('✅ [10/15] 裂变奖励能量核销与抽牌测试通过');

    // 10. 验证敏感词拦截 (例如：违禁词“改运”)
    // 为 Alice 先补 1 点能量以便测试敏感词
    await axios.post(`${BASE_URL}/api/v1/ad/reward-callback`, {
      trans_id: `trans_mock_test_sens_${runId}`,
      user_id: aliceId
    });
    try {
      await axios.post(
        `${BASE_URL}/api/v1/tarot/draw`,
        { question: '我想找大师帮我改运看相' },
        { headers: aliceAuthHeader }
      );
      assert(false, '敏感词未拦截');
    } catch (err: any) {
      assert(err.response.status === 400 && err.response.data.code === 'SENSITIVE_WORD_DETECTED', '敏感词拦截');
      console.log('✅ [11/15] 反迷信敏感词过滤审查机制 (SENSITIVE_WORD_DETECTED) 测试通过');
    }

    // 11. 验证 SSE 流式解读推流 (/api/v1/tarot/stream/:reading_id)
    const streamRes = await axios.get(`${BASE_URL}/api/v1/tarot/stream/${readingId}`, {
      headers: {
        ...aliceAuthHeader,
        Accept: 'text/event-stream'
      },
      responseType: 'stream'
    });

    assert(String(streamRes.headers['content-type']).includes('text/event-stream'), 'Content-Type 为 text/event-stream');

    let streamBuffer = '';
    await new Promise<void>((resolve, reject) => {
      streamRes.data.on('data', (chunk: Buffer) => {
        streamBuffer += chunk.toString();
      });
      streamRes.data.on('end', resolve);
      streamRes.data.on('error', reject);
    });

    assert(streamBuffer.includes('"type":"start"'), '包含 start 事件');
    assert(streamBuffer.includes('"type":"chunk"'), '包含 chunk 流式打字机事件');
    assert(streamBuffer.includes('"type":"done"'), '包含 done 完成事件');
    console.log('✅ [12/15] SSE 大模型流式输出与打字机网关测试通过 (接收字节: ' + streamBuffer.length + ')');

    // 12. 验证用户历史记录
    const historyRes = await axios.get(`${BASE_URL}/api/v1/tarot/history`, { headers: aliceAuthHeader });
    assert(historyRes.data.data.items.length >= 2, '存在至少 2 条历史翻牌');
    const streamedItem = historyRes.data.data.items.find((it: any) => it.id === readingId);
    assert(streamedItem && streamedItem.status === 'completed', '已流式解读记录状态为 completed');
    console.log('✅ [13/15] 用户历史解牌记录分页查询 (/api/v1/tarot/history) 测试通过');

    // 13. 管理员登录
    const adminLoginRes = await axios.post(`${BASE_URL}/api/v1/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });
    assert(adminLoginRes.data.code === 'SUCCESS', '管理员登录成功');
    const adminToken = adminLoginRes.data.data.token;
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };
    console.log('✅ [14/15] 运营后台管理员鉴权登录 (/api/v1/admin/login) 测试通过');

    // 14. 管理后台功能全套测试 (Dashboard, 策略修改, AI编排, 卡牌库, 用户列表)
    const dashRes = await axios.get(`${BASE_URL}/api/v1/admin/dashboard`, { headers: adminAuthHeader });
    assert(dashRes.data.data.totalUsers >= 2, '统计用户总数准确');
    assert(dashRes.data.data.todayDrawCount >= 2, '统计今日抽牌次数准确');

    // 动态策略配置更新与热生效测试
    await axios.put(
      `${BASE_URL}/api/v1/admin/strategy`,
      { is_in_review: true, share_reward_limit: 5 },
      { headers: adminAuthHeader }
    );
    const updatedStrategy = await axios.get(`${BASE_URL}/api/v1/admin/strategy`, { headers: adminAuthHeader });
    assert(updatedStrategy.data.data.is_in_review === true, '审核模式更新成功');
    assert(Number(updatedStrategy.data.data.share_reward_limit) === 5, '分享上限更新成功');

    // 卡牌库查询测试
    const cardsRes = await axios.get(`${BASE_URL}/api/v1/admin/cards?category=major`, { headers: adminAuthHeader });
    assert(cardsRes.data.data.cards.length === 22, '大阿卡纳卡牌数为 22 张');

    // 用户管理列表与人工能量调整测试
    const usersRes = await axios.get(`${BASE_URL}/api/v1/admin/users`, { headers: adminAuthHeader });
    assert(usersRes.data.data.items.length >= 2, '用户管理查询正常');

    await axios.post(`${BASE_URL}/api/v1/admin/users/${aliceId}/energy`, { amount: 10 }, { headers: adminAuthHeader });
    const checkAlice = await axios.get(`${BASE_URL}/api/v1/user/profile`, { headers: aliceAuthHeader });
    assert(checkAlice.data.data.bonusEnergy >= 10, '人工为用户补充 10 点能量生效');

    console.log('✅ [15/15] 管理后台仪表盘统计、策略热更新、卡牌档案、用户管理接口测试全部通过!');

    console.log('\n🎉🎉🎉 全部 15 项核心业务与防刷逻辑接口测试 100% 通过！服务端运行完全正常！\n');
  } catch (err: any) {
    console.error('❌ 测试失败:', err.message, err.response?.data || '');
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

runTests();
