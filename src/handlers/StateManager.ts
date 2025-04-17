import { Context, Bot } from 'grammy';
import { Redis } from 'ioredis';
import BotFun from '../core/botFunctions'; // 假设路径
import { BaseStateHandler } from './BaseStateHandler';
import { WalletHandler } from './WalletHandler';
import { SwapSlippageHandler } from './SwapSlippageHandler'; // 示例
import { SwapGasHandler } from './SwapGasHandler'; // 示例
import { ConfigService } from '../services/ConfigService';
import { BotStates } from '../constants/BotStates';
import { noUserMenu } from '../core/menu';
export class StateManager {
  private handlers: Map<string, BaseStateHandler>;
  private configService: ConfigService;

  constructor(
    private redis: Redis,
    private bot: Bot,
    private botFun: BotFun
  ) {
    this.handlers = new Map();
    this.configService = new ConfigService(redis);
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // 使用常量而不是字符串
    this.handlers.set(BotStates.WAIT_PRIVATE_KEY, 
      new WalletHandler(this.redis, this.bot));
      
    this.handlers.set(BotStates.SET_SWAP_SLIPPAGE, 
      new SwapSlippageHandler(this.redis));
      
    this.handlers.set(BotStates.SET_SWAP_GAS, 
      new SwapGasHandler(this.redis));
    
    // ... 其他处理器注册
  }

  async handleMessage(ctx: Context, fromId: number, status: string, text: string, address: string | null): Promise<void> {
    try {
      // 处理未绑定钱包的情况
      if (!address) {
        return await this.handleNoWalletState(ctx, fromId, status, text);
      }

      // 处理已绑定钱包的状态
      return await this.handleWalletState(ctx, fromId, status, text);
    } catch (error) {
      console.error('消息处理错误:', error);
      await ctx.reply("处理消息时发生错误，请稍后重试");
    }
  }

  private async handleNoWalletState(ctx: Context, fromId: number, status: string, text: string): Promise<void> {
    const handler = this.handlers.get(status);
    
    if (status === BotStates.WAIT_PRIVATE_KEY && handler) {
      await handler.handle(ctx, fromId, text);
    } else if (status === BotStates.WAIT_ADMIN_APPROVAL) {
      await ctx.reply("申请开通中");
    } else {
      await ctx.reply("请先绑定钱包", { reply_markup: noUserMenu });
    }
  }

  private async handleWalletState(ctx: Context, fromId: number, status: string, text: string): Promise<void> {
    const handler = this.handlers.get(status);
    
    if (handler) {
      await handler.handle(ctx, fromId, text);
    } else {
      await this.handleDefaultMessage(ctx, text);
    }
  }

  private async handleDefaultMessage(ctx: Context, text: string): Promise<void> {
    // 处理默认消息，例如检查是否是合约地址或哈希
    if (text.startsWith('0x') || text.length === 64) {
      await this.botFun.checkHash(text, ctx);
    } else {
      await ctx.reply("无法处理该消息");
    }
  }
}