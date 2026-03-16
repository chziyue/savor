/**
 * Savor - TTL Map
 * 带自动过期时间的内存 Map
 */

interface TTLEntry<V> {
  value: V;
  expireAt: number;
}

export class TTLMap<K, V> {
  private map = new Map<K, TTLEntry<V>>();

  /**
   * 设置值，带过期时间
   */
  set(key: K, value: V, ttlMs: number): void {
    this.map.set(key, {
      value,
      expireAt: Date.now() + ttlMs
    });
  }

  /**
   * 获取值，自动清理过期项
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.map.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * 检查是否存在（未过期）
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除指定 key
   */
  delete(key: K): boolean {
    return this.map.delete(key);
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * 主动清理所有过期项
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.map) {
      if (now > entry.expireAt) {
        this.map.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * 获取当前大小（包含可能已过期的项）
   */
  get size(): number {
    return this.map.size;
  }
}
