import type { TarotCard } from '../types';

export interface PosterOptions {
  card: TarotCard;
  dateStr?: string;
  tag?: string;
  quote?: string;
  qrcodeUrl?: string;
}

/**
 * 远程图片下载至本地临时路径（保障微信小程序 Canvas 2D 跨域与离线渲染稳定性）
 */
export function downloadRemoteFile(url: string): Promise<string> {
  if (!url) return Promise.resolve('');
  // #ifdef MP-WEIXIN
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return new Promise((resolve) => {
      uni.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            resolve(res.tempFilePath);
          } else {
            resolve(url);
          }
        },
        fail: () => resolve(url)
      });
    });
  }
  // #endif
  return Promise.resolve(url);
}

/**
 * 在 Canvas 上绘制微信朋友圈 750 × 1334 高保真能量海报
 */
export async function renderTarotPoster(
  canvas: any,
  options: PosterOptions
): Promise<string> {
  const width = 750;
  const height = 1334;

  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;

  const { card, dateStr, tag, quote } = options;
  const dStr = dateStr || formatDate(new Date());
  const displayTag = tag || (card.tags && card.tags[0] ? `【${card.tags[0]} · ${card.element || '觉察'}】` : '【内心觉察】');
  const displayQuote = quote || card.quote || '微风不燥，万物有序，在每一个微小的行动中找回安宁。';

  // 1. 背景神秘深邃星空渐变
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#181438');
  bgGrad.addColorStop(0.4, '#0f0d22');
  bgGrad.addColorStop(0.8, '#080712');
  bgGrad.addColorStop(1, '#030206');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. 绘制星芒微粒
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  const starCoords = [
    [60, 120], [200, 80], [680, 150], [120, 400], [650, 480],
    [90, 800], [660, 920], [140, 1150], [620, 1200], [375, 70]
  ];
  for (const [x, y] of starCoords) {
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. 古典神圣金色边框
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // 内层细框
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, width - 92, height - 92);

  // 四角菱形装饰
  const corners = [
    [36, 36], [width - 36, 36], [36, height - 36], [width - 36, height - 36]
  ];
  ctx.fillStyle = '#d4af37';
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();
  }

  // 4. 顶栏文字与日期
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'left';
  ctx.fillText('INNER GLOW · 心芒灵境', 64, 90);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
  ctx.font = '20px sans-serif';
  ctx.fillText(dStr, width - 64, 90);

  // 分割线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(64, 112);
  ctx.lineTo(width - 64, 112);
  ctx.stroke();

  // 5. 卡牌名称与罗马序号
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 24px serif';
  ctx.fillText(card.roman || `#${card.index}`, width / 2, 170);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px serif';
  ctx.fillText(card.nameCn, width / 2, 224);

  const orientationText = card.orientationName || (card.orientation === 'reversed' ? '逆位' : '正位');
  ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
  ctx.font = '22px serif';
  ctx.fillText(`${card.nameEn} · ${orientationText}`, width / 2, 260);

  // 6. 绘制卡牌高保真大图 (380 × 570)
  const cardW = 380;
  const cardH = 570;
  const cardX = (width - cardW) / 2;
  const cardY = 290;

  // 尝试加载远程或本地图片
  const rawImgUrl = card.imageLarge || card.image || card.backImage || '';
  try {
    const localImgUrl = await downloadRemoteFile(rawImgUrl);
    const cardImg = await loadImage(canvas, localImgUrl);
    ctx.save();
    // 圆角裁剪
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.clip();
    ctx.drawImage(cardImg, cardX, cardY, cardW, cardH);
    ctx.restore();

    // 卡牌金色描边
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
    ctx.lineWidth = 3;
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();
  } catch (e) {
    console.warn('[Poster] 图片载入失败，使用艺术备用占位', e);
    ctx.fillStyle = '#1e1b4b';
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.font = '24px serif';
    ctx.fillText('✦ ISHTAR TAROT ✦', width / 2, cardY + cardH / 2);
  }

  // 7. 4字能量标签徽章
  const tagY = cardY + cardH + 50;
  ctx.font = 'bold 24px serif';
  const tagMetrics = ctx.measureText(displayTag);
  const tagBoxW = tagMetrics.width + 48;
  const tagBoxH = 44;
  const tagBoxX = (width - tagBoxW) / 2;

  ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
  drawRoundRect(ctx, tagBoxX, tagY - 30, tagBoxW, tagBoxH, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, tagBoxX, tagY - 30, tagBoxW, tagBoxH, 22);
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.fillText(displayTag, width / 2, tagY);

  // 8. 正念金句
  ctx.font = 'italic 24px serif';
  ctx.fillStyle = '#e2e8f0';
  wrapText(ctx, `“${displayQuote}”`, width / 2, tagY + 54, width - 180, 36);

  // 9. 底部太阳菊花码/二维码与引流文案
  const footerY = height - 120;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(64, footerY - 35);
  ctx.lineTo(width - 64, footerY - 35);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.fillText('微信长按识别小程序码', 74, footerY);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 22px serif';
  ctx.fillText('抽取你的今日潜意识灵感', 74, footerY + 30);

  // 绘制右下角真实小程序码（尺寸 104x104，带白色底板和金边）
  const qrSize = 104;
  const qrX = width - 64 - qrSize;
  const qrY = footerY - 28;

  ctx.fillStyle = '#ffffff';
  drawRoundRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 12);
  ctx.fill();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 12);
  ctx.stroke();

  // 加载并绘制小程序码
  try {
    const rawQr = options.qrcodeUrl || '/static/mp_qrcode.png';
    const localQr = await downloadRemoteFile(rawQr);
    const qrImg = await loadImage(canvas, localQr);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch (qrErr) {
    console.warn('[Poster] 小程序码图片加载异常，绘制优雅菊花标识', qrErr);
    ctx.beginPath();
    ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, qrSize / 2 - 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('心芒灵境', qrX + qrSize / 2, qrY + qrSize / 2 + 5);
  }

  // 导出图片 TempFilePath
  return new Promise((resolve, reject) => {
    // 微信小程序标准 API wx.canvasToTempFilePath
    // @ts-ignore
    if (typeof wx !== 'undefined' && wx.canvasToTempFilePath) {
      // @ts-ignore
      wx.canvasToTempFilePath({
        canvas,
        width,
        height,
        destWidth: width * 2,
        destHeight: height * 2,
        fileType: 'png',
        quality: 1,
        success: (res: any) => resolve(res.tempFilePath),
        fail: (err: any) => {
          if (canvas.toTempFilePath) {
            canvas.toTempFilePath({
              destWidth: width * 2,
              destHeight: height * 2,
              fileType: 'png',
              quality: 1,
              success: (r: any) => resolve(r.tempFilePath),
              fail: reject
            });
          } else if (canvas.toDataURL) {
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(err);
          }
        }
      });
    } else if (canvas.toTempFilePath) {
      canvas.toTempFilePath({
        x: 0,
        y: 0,
        width,
        height,
        destWidth: width * 2,
        destHeight: height * 2,
        fileType: 'png',
        quality: 1,
        success: (res: any) => resolve(res.tempFilePath),
        fail: reject
      });
    } else if (canvas.toDataURL) {
      resolve(canvas.toDataURL('image/png'));
    } else {
      reject(new Error('Canvas 导出方法不可用'));
    }
  });
}


function loadImage(canvas: any, src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // 微信小程序 Canvas 2D 镜像 Image 实例
    let img: any;
    if (canvas && typeof canvas.createImage === 'function') {
      img = canvas.createImage();
    } else {
      img = new Image();
    }
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e: any) => reject(e);
    img.src = src;
  });
}

function drawRoundRect(
  ctx: any,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  let line = '';
  let curY = y;
  for (let n = 0; n < text.length; n++) {
    const testLine = line + text[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = text[n];
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}
