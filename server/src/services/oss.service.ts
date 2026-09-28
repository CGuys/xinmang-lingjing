import fs from 'fs';
import path from 'path';
import OSS from 'ali-oss';
import { ENV } from '../config/constants';

let ossClientInstance: OSS | null = null;

export class OssService {
  /**
   * 检查是否已经配置阿里云 OSS 凭证
   */
  static isConfigured(): boolean {
    return Boolean(
      ENV.OSS_ACCESS_KEY_ID &&
      ENV.OSS_ACCESS_KEY_SECRET &&
      ENV.OSS_BUCKET
    );
  }

  /**
   * 获取 OSS Client 单例
   */
  static getClient(): OSS {
    if (ossClientInstance) return ossClientInstance;

    if (!this.isConfigured()) {
      throw new Error('阿里云 OSS 未配置，请在 .env 中设置 OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET');
    }

    ossClientInstance = new OSS({
      accessKeyId: ENV.OSS_ACCESS_KEY_ID,
      accessKeySecret: ENV.OSS_ACCESS_KEY_SECRET,
      bucket: ENV.OSS_BUCKET,
      region: ENV.OSS_REGION,
      endpoint: ENV.OSS_ENDPOINT,
      secure: true // 强制走 HTTPS
    });

    return ossClientInstance;
  }

  /**
   * 获取文件标准基础公开地址 (不带鉴权 query)
   */
  static getBaseUrl(ossKey: string): string {
    const cleanKey = ossKey.replace(/^\/+/, '');
    return `https://${ENV.OSS_BUCKET}.${ENV.OSS_ENDPOINT}/${cleanKey}`;
  }

  /**
   * 生成带防盗链/私有桶鉴权签名的只读访问链接
   * @param ossKey 对象存储路径，例如 "pages/home/cards/card_00_the_fool.jpg"
   * @param expires 有效秒数，默认 7 天 (604800 秒)
   */
  static getSignatureUrl(ossKey: string, expires: number = 604800): string {
    if (!this.isConfigured()) {
      // 降级使用本地静态服务路径
      return `/assets/${ossKey.replace(/^pages\//, 'pages/')}`;
    }

    try {
      const client = this.getClient();
      const cleanKey = ossKey.replace(/^\/+/, '');
      // 生成 HTTPS 签名直链
      const signed = client.signatureUrl(cleanKey, {
        expires,
        method: 'GET'
      });
      return signed;
    } catch (err: any) {
      console.warn(`[OssService] Failed to sign url for ${ossKey}:`, err.message);
      return this.getBaseUrl(ossKey);
    }
  }

  /**
   * 上传单个文件到 OSS
   */
  static async uploadFile(localFilePath: string, ossKey: string, options?: { mime?: string }) {
    const client = this.getClient();
    const cleanKey = ossKey.replace(/^\/+/, '');

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`本地文件不存在: ${localFilePath}`);
    }

    const headers: Record<string, string> = {
      'Cache-Control': 'max-age=2592000' // 缓存 30 天
    };

    if (options?.mime) {
      headers['Content-Type'] = options.mime;
    }

    const result = await client.put(cleanKey, localFilePath, { headers });
    return {
      name: result.name,
      url: result.url,
      baseUrl: this.getBaseUrl(cleanKey),
      signedUrl: this.getSignatureUrl(cleanKey)
    };
  }

  /**
   * 列出指定前缀的存储桶对象
   */
  static async listObjects(prefix = '', maxKeys = 200) {
    const client = this.getClient();
    const result = await client.list({
      prefix,
      'max-keys': maxKeys
    }, {});
    return result.objects || [];
  }
}
