/**
 * Telegram机器人主文件 (重构版)
 * 用于处理Telegram机器人的初始化、命令注册和消息处理
 */

// 导入必要的库和模块
import { Bot } from "grammy";
import { run } from "@grammyjs/runner";
import { Keypair, PublicKey } from '@solana/web3.js'
import { config, request } from './init';
import BotFun from './fun';
import Tapchain from '../services/tapchain/tapchain0';
import { Redis } from 'ioredis';
import bs58 from 'bs58';

// 初始化服务和工具 (与bot.ts相同)
// 初始化Redis连接
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'tapai123456',
  db: config.rsdb,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis连接重试(${times})，延迟${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  lazyConnect: false,
  connectTimeout: 10000,
  showFriendlyErrorStack: true
});

// 添加Redis事件监听
redis.on('connect', () => console.log('Redis 正在连接...'));
redis.on('ready', () => console.log('✅ Redis连接成功，已就绪'));
redis.on('error', (err) => console.error('❌ Redis连接错误：', err));
redis.on('close', () => console.warn('⚠️ Redis连接已关闭'));

const client = new request();
const botFun = new BotFun();
const tapchain = new Tapchain();

// 状态处理器类 - 将if-else逻辑重构为类方法
class StateHandler {
  private redis: Redis;
  private botFun: BotFun;
  
  constructor(redis: Redis, botFun: BotFun) {
    this.redis = redis;
    this.botFun = botFun;
  }

  /**
   * 处理未绑定钱包状态
   */
  async handleUnboundWallet(ctx: any, fromId: number, text: string, status: string | null) {
    if (status === 'waitSiyao') {
      await this.handlePrivateKeyInput(ctx, fromId, text);
    } else if (status === 'waitAdmin') {
      await ctx.reply("申请开通中");
    }
  }

  /**
   * 处理私钥输入
   */
  private async handlePrivateKeyInput(ctx: any, fromId: number, text: string) {
    // ... 将原有私钥处理逻辑移动到这里
  }

  /**
   * 处理狙击相关状态
   */
  async handleSnipeStates(ctx: any, fromId: number, text: string, status: string, address: string) {
    const snipeHandlers = {
      'snipeNumber': this.handleSnipeNumber,
      'snipeAutoMaxSol': this.handleSnipeAutoMaxSol,
      // ... 添加其他狙击相关状态
    };

    if (snipeHandlers[status as keyof typeof snipeHandlers]) {
      await snipeHandlers[status as keyof typeof snipeHandlers].call(this, ctx, fromId, text, address);
      return true;
    }
    return false;
  }

  private async handleSnipeNumber(ctx: any, fromId: number, text: string, address: string) {
    // ... snipeNumber 处理逻辑
  }

  private async handleSnipeAutoMaxSol(ctx: any, fromId: number, text: string, address: string) {
    // ... snipeAutoMaxSol 处理逻辑
  }

  // ... 添加其他状态处理方法
}

// 创建机器人实例 (与bot.ts相同)
// 添加代理配置
import { HttpsProxyAgent } from 'https-proxy-agent';
const proxyUrl = 'http://127.0.0.1:7890';
const agent = new HttpsProxyAgent(proxyUrl);

// 在创建bot实例前添加token检查
const token = process.env.TELEGRAM_BOT_TOKEN || config.botapi;
if (!token) {
  console.error('❌ Bot Token未配置!');
  process.exit(1);
}

// 创建带代理的bot实例
const bot = new Bot(token, {
  client: {
    baseFetchConfig: {
      agent: agent,
      signal: AbortSignal.timeout(30000)
    }
  }
});

// 初始化状态处理器
const stateHandler = new StateHandler(redis, botFun);

// 消息处理重构为使用状态处理器
bot.on("message", async (ctx) => {
  const fromId = ctx.message.from.id;
  const text: string = ctx.message.text || "";
  const address = await redis.get(`${fromId}:address`);
  const status = await redis.get(`${fromId}:status`);

  // 未绑定钱包处理
  if (!address) {
    await stateHandler.handleUnboundWallet(ctx, fromId, text, status);
    return;
  }

  // 狙击状态处理
  const isSnipeHandled = await stateHandler.handleSnipeStates(ctx, fromId, text, status || '', address);
  if (isSnipeHandled) return;

  // ... 其他状态处理
});

// 其他命令和启动逻辑保持不变