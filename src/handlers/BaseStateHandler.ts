import { Context } from "grammy";
import { Redis } from 'ioredis';

export abstract class BaseStateHandler {
  constructor(protected redis: Redis) {}

  abstract handle(ctx: Context, fromId: number, text: string): Promise<void>;
  
  protected async clearUserStatus(fromId: number): Promise<void> {
    await this.redis.set(`${fromId}:status`, "");
  }

  protected async getUserAddress(fromId: number): Promise<string | null> {
    return await this.redis.get(`${fromId}:address`);
  }
}