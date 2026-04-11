/**
 * 飞书认证管理
 *
 * 功能：
 * - 获取 tenant_access_token
 * - 自动检测过期并刷新（剩余 5 分钟时提前刷新）
 * - 连接测试（验证 App ID/Secret 是否有效）
 *
 * 选用 tenant_access_token 的原因：
 * - 不需要浏览器 OAuth 流程，配置更简单
 * - 不依赖第三方 OAuth 中继服务
 * - 知识库写入权限通过应用权限 scope 控制即可
 */

import { requestUrl } from "obsidian";
import { TenantAccessTokenResponse } from "./types";

const API_BASE = "https://open.feishu.cn/open-apis";
/** 提前 5 分钟刷新 token */
const REFRESH_BUFFER_SECONDS = 5 * 60;

export class FeishuAuth {
  private appId: string;
  private appSecret: string;
  private cachedToken: string;
  private tokenExpireAt: number;

  /** 用于保存 token 到设置的回调 */
  private onTokenRefreshed: (token: string, expireAt: number) => Promise<void>;

  constructor(
    appId: string,
    appSecret: string,
    cachedToken: string,
    tokenExpireAt: number,
    onTokenRefreshed: (token: string, expireAt: number) => Promise<void>
  ) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.cachedToken = cachedToken;
    this.tokenExpireAt = tokenExpireAt;
    this.onTokenRefreshed = onTokenRefreshed;
  }

  /**
   * 获取有效的 tenant_access_token
   *
   * 返回值：有效 token 字符串
   * 异常：认证失败时抛出 Error
   */
  async getToken(): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    // 如果 token 仍然有效（剩余超过 5 分钟），直接返回缓存
    if (this.cachedToken && this.tokenExpireAt - nowSeconds > REFRESH_BUFFER_SECONDS) {
      return this.cachedToken;
    }
    // 否则重新获取
    return this.refreshToken();
  }

  /**
   * 向飞书 API 请求新的 tenant_access_token
   */
  async refreshToken(): Promise<string> {
    if (!this.appId || !this.appSecret) {
      throw new Error("未配置 App ID 或 App Secret，请在插件设置中填写");
    }

    const resp = await requestUrl({
      url: `${API_BASE}/auth/v3/tenant_access_token/internal`,
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
      throw: false,
    });

    const data: TenantAccessTokenResponse = resp.json;

    if (data.code !== 0) {
      throw new Error(`飞书认证失败 (code ${data.code}): ${data.msg}`);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    this.cachedToken = data.tenant_access_token;
    // 过期时间 = 当前时间 + expire 秒（飞书返回的 expire 通常是 7200）
    this.tokenExpireAt = nowSeconds + data.expire;

    // 异步保存到设置，不阻塞调用方
    this.onTokenRefreshed(this.cachedToken, this.tokenExpireAt).catch(console.error);

    return this.cachedToken;
  }

  /**
   * 连接测试：验证凭据是否有效
   *
   * 返回值：成功则返回 null，失败则返回错误信息字符串
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.refreshToken();
      return { success: true, message: "连接成功" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }

  /**
   * 更新凭据（用户在设置中修改后调用）
   */
  updateCredentials(appId: string, appSecret: string): void {
    this.appId = appId;
    this.appSecret = appSecret;
    // 凭据变更后清除缓存 token，强制下次重新获取
    this.cachedToken = "";
    this.tokenExpireAt = 0;
  }
}
