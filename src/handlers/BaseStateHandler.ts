import { Context } from "grammy";
import { Redis } from 'ioredis';

export abstract class BaseStateHandler {
  constructor(protected redis: Redis) {}

/**
 * 处理用户消息的抽象方法
 * @param ctx - Telegram上下文对象
 * @param fromId - 用户ID
 * @param text - 用户发送的消息文本
 * @returns Promise<void>
 */
abstract handle(ctx: Context, fromId: number, text: string): Promise<void>;
  
  protected async clearUserStatus(fromId: number): Promise<void> {
    await this.redis.set(`${fromId}:status`, "");
  }

  protected async getUserAddress(fromId: number): Promise<string | null> {
    return await this.redis.get(`${fromId}:address`);
  }
}