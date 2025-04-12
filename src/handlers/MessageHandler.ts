import { Context } from 'grammy';
import { Redis } from 'ioredis';
import { StateHandler } from './StateHandler';
import BotFun from '../fun';

export class MessageHandler {
 constructor(
    private stateHandler: StateHandler,
    private botFun: BotFun,
    private redis: Redis 
  ) {}

  async handleMessage(ctx: Context, fromId: number, text: string) {
    const status = await this.stateHandler.getState(fromId);
    const address = await this.redis.get(fromId+":address");

    // 未绑定钱包处理
    if(!address) {
      // 处理未绑定钱包的情况
      return ctx.reply('请先绑定钱包地址再继续操作。');
    }

    // 根据状态分发处理
    const handler = this.getStateHandler(status);
    if(handler) {
      return handler(ctx, fromId, text, address);
    }

    // 默认消息处理
    // 需要先在类中定义 handleDefaultMessage 方法
    return ctx.reply('收到消息');
  }

  private getStateHandler(status: string) {
    const handlers = {
      'snipeNumber': (ctx: Context, fromId: number, text: string, address: string) => this.botFun.addSnipe(ctx, text, fromId, Number(text)),
      'setSwapSlippage': (ctx: Context, fromId: number, text: string, address: string) => 
        this.stateHandler.handleSetting(ctx, fromId, address, 'swapSlippage', Number(text)),
      'setSwapGas': (ctx: Context, fromId: number, text: string, address: string) => 
        this.stateHandler.handleSetting(ctx, fromId, address, 'swapGas', Number(text)),
      // ... 其他状态处理器
    };
    return handlers[status as keyof typeof handlers];
  }

  // 各种具体的处理方法...
}