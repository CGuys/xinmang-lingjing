const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const services = [
  {
    name: '后端 API 服务 (server)',
    port: 3000,
    cwd: path.join(rootDir, 'server'),
    cmd: 'npm',
    args: ['run', 'dev'],
    logFile: path.join(logsDir, 'local-server.log')
  },
  {
    name: 'Web 运营管理后台 (admin)',
    port: 5173,
    cwd: path.join(rootDir, 'admin'),
    cmd: 'npm',
    args: ['run', 'dev'],
    logFile: path.join(logsDir, 'local-admin.log')
  },
  {
    name: '客户端 H5 预览 (miniprogram)',
    port: 5174,
    cwd: path.join(rootDir, 'miniprogram'),
    cmd: 'npm',
    args: ['run', 'dev:h5'],
    logFile: path.join(logsDir, 'local-mini.log')
  }
];

function getPidsByPort(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (!out) return [];
    return out.split('\n').map(p => p.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function stopServices() {
  console.log('[INFO] 正在安全停止本地服务端口 (3000 / 5173 / 5174)...');
  for (const svc of services) {
    const pids = getPidsByPort(svc.port);
    if (pids.length > 0) {
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGKILL');
          console.log(`[INFO] 已停止 ${svc.name} 端口 ${svc.port} (PID: ${pid})`);
        } catch {}
      }
    }
  }
  console.log('[SUCCESS] 本地服务端口已全部释放！');
}

function startServices() {
  console.log('[INFO] 正在启动本地三端后台服务...');
  for (const svc of services) {
    const existingPids = getPidsByPort(svc.port);
    if (existingPids.length > 0) {
      console.log(`[WARN] 端口 ${svc.port} 已被占用 (PID: ${existingPids.join(', ')} )，跳过重复启动`);
      continue;
    }

    const outFd = fs.openSync(svc.logFile, 'a');
    const child = spawn(svc.cmd, svc.args, {
      cwd: svc.cwd,
      detached: true,
      stdio: ['ignore', outFd, outFd]
    });
    child.unref();
    console.log(`[SUCCESS] ${svc.name} 已在后台启动 (PID: ${child.pid})，日志 -> logs/${path.basename(svc.logFile)}`);
  }
}

async function checkHealth(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode, data });
      });
    }).on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });
  });
}

async function showStatus() {
  console.log('\n================================================================');
  console.log('✨ 《心芒灵境》本地三端服务状态一览 ✨');
  console.log('================================================================');

  for (const svc of services) {
    const pids = getPidsByPort(svc.port);
    const isRunning = pids.length > 0;
    const statusText = isRunning ? `● 运行中 (PID: ${pids.join(', ')})` : '○ 未运行';
    console.log(`🔹 ${svc.name}：${statusText}`);
    if (svc.port === 3000) {
      console.log('   - 接口地址：http://localhost:3000');
      const health = await checkHealth('http://127.0.0.1:3000/health');
      if (health.ok) {
        console.log(`   - 健康探针：http://localhost:3000/health (探针正常)`);
      } else {
        console.log(`   - 健康探针：http://localhost:3000/health (探针未就绪)`);
      }
    } else if (svc.port === 5173) {
      console.log('   - 管理后台：http://localhost:5173/ (默认账号: admin / Admin@2026)');
    } else if (svc.port === 5174) {
      console.log('   - 客户端H5：http://localhost:5174/');
    }
  }

  console.log('\n📱 微信开发者工具导入目录：');
  console.log(`   ${path.join(rootDir, 'miniprogram/dist/build/mp-weixin')}`);
  console.log('   (已包含最新防回退、正念行动分工及错误引导机制)');
  console.log('================================================================\n');
}

const action = process.argv[2] || 'status';

(async () => {
  if (action === 'stop') {
    stopServices();
  } else if (action === 'start') {
    stopServices();
    startServices();
    await new Promise(r => setTimeout(r, 2500));
    await showStatus();
  } else if (action === 'restart') {
    stopServices();
    startServices();
    await new Promise(r => setTimeout(r, 2500));
    await showStatus();
  } else if (action === 'status') {
    await showStatus();
  } else {
    console.log(`未知指令: ${action}，可用指令: start | stop | restart | status`);
  }
})();
