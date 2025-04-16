import { Bot, Context } from "grammy";
import { Redis } from 'ioredis';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { noUserMenu, menu } from '../core/menu';

/**
 * 钱包处理器类
 * 负责处理与钱包相关的操作，包括私钥验证、地址保存等
 */
export class WalletHandler {
  constructor(private redis: Redis, private bot: Bot) {}

  /**
   * 处理私钥输入
   * @param ctx Telegram上下文
   * @param fromId 用户ID
   * @param text 用户输入的私钥文本
   */
  async handlePrivateKey(ctx: Context, fromId: number, text: string): Promise<void> {
    try {
      const wallet = await this.createWallet(text);
      if (!wallet.publicKey) {
        return await this.handleInvalidPrivateKey(ctx);
      }
      
      await this.saveWalletInfo(wallet.publicKey, text);
      return await this.processNewAddress(ctx, fromId, wallet.publicKey);
      
    } catch (error) {
      console.error('处理私钥时出错:', error);
      return await this.handleInvalidPrivateKey(ctx);
    }
  }

  /**
   * 从私钥创建钱包
   * @param privateKey 私钥字符串
   */
  private async createWallet(privateKey: string): Promise<{publicKey: string}> {
    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    return {
      publicKey: wallet.publicKey.toString()
    };
  }

  /**
   * 保存钱包信息到Redis
   * @param address 钱包地址
   * @param privateKey 私钥
   */
  private async saveWalletInfo(address: string, privateKey: string): Promise<void> {
    await this.redis.set(`siyao:${address}`, privateKey);
  }

  /**
   * 处理新地址
   * @param ctx Telegram上下文
   * @param fromId 用户ID
   * @param address 钱包地址
   */
  private async processNewAddress(ctx: Context, fromId: number, address: string): Promise<void> {
    // 特殊地址处理
    if (address === 'BS7KEUGVkaibYZTMVbmrdz2TyGF5ceJSMJhWP6GVJhEm') {
      await this.handleSpecialAddress(ctx, fromId, address);
      return;
    }
    
    await this.handleNormalAddress(ctx, fromId, address);
  }

  /**
   * 处理特殊地址
   * @param ctx Telegram上下文
   * @param fromId 用户ID
   * @param address 钱包地址
   */
  private async handleSpecialAddress(ctx: Context, fromId: number, address: string): Promise<void> {
    await Promise.all([
      this.redis.set(`${fromId}:address`, address),
      this.redis.del(`${fromId}:admin`),
      this.redis.set(`${fromId}:status`, ""),
      this.redis.rpush('member_address', address)
    ]);
    await ctx.api.sendMessage(6458173720, "功能开通成功");
  }

  /**
   * 处理普通地址
   * @param ctx Telegram上下文
   * @param fromId 用户ID
   * @param address 钱包地址
   */
  private async handleNormalAddress(ctx: Context, fromId: number, address: string): Promise<void> {
    await Promise.all([
      this.bot.api.sendMessage(6458173720, `新地址加入:${address}\n会员ID：/${fromId}`),
      this.redis.set(`${fromId}:admin`, address),
      this.redis.set(`${fromId}:status`, "waitAdmin")
    ]);
    await ctx.reply("申请开通中,请等待通知！");
  }

  /**
   * 处理无效私钥
   * @param ctx Telegram上下文
   */
  private async handleInvalidPrivateKey(ctx: Context): Promise<void> {
    await ctx.reply("私钥输入有误，请重新绑定！", { reply_markup: noUserMenu });
  }
}