/**
 * API 频率控制
 *
 * 功能：基于令牌桶算法，限制各类 API 的调用频率
 * 目的：避免超过飞书 Open API 的频率限制导致请求被拒绝
 *
 * 限制参考：
 * - 知识库节点创建：100 次/分钟
 * - 文档块写入：100 次/分钟
 * - 媒体上传：5 次/秒
 */

export type RateLimitCategory = "wiki" | "doc" | "media";

interface RateLimitConfig {
  /** 两次调用之间的最小间隔（毫秒），留 10% buffer */
  minIntervalMs: number;
}

const RATE_CONFIGS: Record<RateLimitCategory, RateLimitConfig> = {
  wiki:  { minIntervalMs: 700  }, // 100/min → ~600ms，留 buffer 到 700ms
  doc:   { minIntervalMs: 700  }, // 同上
  media: { minIntervalMs: 250  }, // 5/s → 200ms，留 buffer 到 250ms
};

export class RateLimiter {
  /** 记录每个类别上次调用的时间戳 */
  private lastCallTime: Record<RateLimitCategory, number> = {
    wiki: 0,
    doc: 0,
    media: 0,
  };

  /**
   * 在发起 API 调用前调用此方法
   *
   * 如果距上次同类调用间隔不足，会等待到满足最小间隔
   *
   * 输入参数：
   * - category: API 类别
   */
  async acquire(category: RateLimitCategory): Promise<void> {
    const config = RATE_CONFIGS[category];
    const now = Date.now();
    const elapsed = now - this.lastCallTime[category];

    if (elapsed < config.minIntervalMs) {
      const waitMs = config.minIntervalMs - elapsed;
      await sleep(waitMs);
    }

    this.lastCallTime[category] = Date.now();
  }
}

/** 延时工具函数 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
