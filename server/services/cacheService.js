/**
 * In-Memory Cache Service — Redis'siz ishlaydi, Redis qo'shilsa oson migrate qilish mumkin.
 *
 * Nima uchun kerak:
 * - /api/results: har so'rovda DB — 100 o'qituvchi = 100 query
 * - Cache bilan: 30 soniyada 1 ta query
 *
 * Senior pattern: TTL-based eviction + tag-based invalidation
 */

class CacheEntry {
  constructor(value, ttlMs) {
    this.value = value;
    this.expiresAt = Date.now() + ttlMs;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

class CacheService {
  constructor() {
    this._store = new Map();
    this._tagMap = new Map(); // tag -> Set<keys>

    // Har 5 daqiqada eskirgan yozuvlarni tozalash
    setInterval(() => this._evict(), 5 * 60 * 1000);
  }

  /**
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds - Qancha vaqt cache'da qoladi (default: 60 soniya)
   * @param {string[]} tags - Invalidatsiya teglari
   */
  set(key, value, ttlSeconds = 60, tags = []) {
    this._store.set(key, new CacheEntry(value, ttlSeconds * 1000));

    // Teglarni ro'yxatga qo'shish
    for (const tag of tags) {
      if (!this._tagMap.has(tag)) this._tagMap.set(tag, new Set());
      this._tagMap.get(tag).add(key);
    }
  }

  /**
   * @param {string} key
   * @returns {any | null}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (entry.isExpired()) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Aniq kalit bo'yicha o'chirish
   */
  delete(key) {
    this._store.delete(key);
  }

  /**
   * Teg bo'yicha barcha bog'liq kalitlarni o'chirish
   * Masalan: invalidateByTag('teacher:abc123') → o'sha o'qituvchiga tegishli
   * barcha cache yozuvlarini tozalaydi
   */
  invalidateByTag(tag) {
    const keys = this._tagMap.get(tag);
    if (!keys) return;
    for (const key of keys) {
      this._store.delete(key);
    }
    this._tagMap.delete(tag);
  }

  /**
   * Barcha cache ni tozalash
   */
  clear() {
    this._store.clear();
    this._tagMap.clear();
  }

  /**
   * Eskirgan yozuvlarni tozalash
   */
  _evict() {
    let evicted = 0;
    for (const [key, entry] of this._store) {
      if (entry.isExpired()) {
        this._store.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      console.log(`[Cache] ${evicted} ta eskirgan yozuv tozalandi. Qolgan: ${this._store.size}`);
    }
  }

  /**
   * Cache statistikasi — monitoring uchun
   */
  stats() {
    return {
      size: this._store.size,
      tags: this._tagMap.size,
    };
  }
}

// Singleton — butun server bo'yicha bitta cache
export const cache = new CacheService();
