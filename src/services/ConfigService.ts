import { Redis } from 'ioredis'

export class ConfigService {
  private static readonly KEYS = {
    USER_STATUS: (userId: number) => `${userId}:status`,
    USER_ADDRESS: (userId: number) => `${userId}:address`,
    USER_ADMIN: (userId: number) => `${userId}:admin`,
    USER_SETTINGS: (address: string) => `setting:${address}`,
    CHAT_ID: (address: string) => `chatid:${address}`,
  };

  constructor(private redis: Redis) {}

  async getUserStatus(userId: number): Promise<string | null> {
    return await this.redis.get(ConfigService.KEYS.USER_STATUS(userId));
  }

  async setUserStatus(userId: number, status: string): Promise<void> {
    await this.redis.set(ConfigService.KEYS.USER_STATUS(userId), status);
  }

  // ... 其他配置方法
}