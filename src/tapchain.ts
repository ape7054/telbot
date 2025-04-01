import { Callback, Redis } from 'ioredis';
import { Bot } from "grammy";
import PumpSwap from './pumpSwap';
import RaydiumSwap from './raydiumSwap';
import { config,request } from './init';
import { VersionedTransactionResponse } from '@solana/web3.js'
const Decimal = require('decimal.js');
const pump = new PumpSwap();
const raydium = new RaydiumSwap();

const redis2 = new Redis({host:config.rshost,port:6379,password:config.rspwd,db: config.rsdb2});
import { createClient } from 'redis';
// 需要先安装依赖: npm install node-telegram-bot-api @types/node-telegram-bot-api
// 需要先安装依赖: npm install node-telegram-bot-api
import TelegramBot from 'node-telegram-bot-api';
// 添加代理代理依赖
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as dotenv from 'dotenv';
dotenv.config();

// 创建Redis客户端
const redis = createClient({
    url: 'redis://:tapai123456@localhost:7001',
    socket: {
        connectTimeout: 20000,    // 连接超时时间
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.log('Redis重试次数过多，放弃连接');
                return new Error('Redis重试次数过多');
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

// Redis连接错误处理
redis.on('error', err => console.log('Redis Client Error', err));
// 确保Redis连接
(async () => {
    if (!redis.isOpen) {
        await redis.connect();
        console.log('Redis连接成功');
    }
})();


export default class Tapchain {
    private bot: TelegramBot;

    constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN || '';
        if (!token) {
            console.error('TELEGRAM_BOT_TOKEN 未设置');
        }
        
        // 添加代理配置
        const proxyUrl = 'http://127.0.0.1:7890';
        const agent = new HttpsProxyAgent(proxyUrl);
        
        // 使用代理创建 TelegramBot 实例
        this.bot = new TelegramBot(token, { 
            polling: false,
            request: {
                url: 'https://api.telegram.org',  // 添加 Telegram API 的基础 URL
                agent: agent
            }
        });
        
        console.log('TapChain模块已初始化（使用代理）');
    }
    
    /**
     * 发送Telegram机器人消息
     * @param message 要发送的消息内容
     * @param chatId 接收消息的聊天ID
     * @param maxAttempts 最大重试次数
     * @param timeoutMs 超时时间(毫秒)
     */
    async sendBotMsg(message: string, chatId: number | string, maxAttempts: number = 3, timeoutMs: number = 30000) {
        // 使用 Promise 包装发送消息，设置超时
        const sendWithTimeout = async () => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('发送消息超时'));
                }, timeoutMs);
                
                this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
                    .then(result => {
                        clearTimeout(timeout);
                        resolve(result);
                    })
                    .catch(error => {
                        clearTimeout(timeout);
                        console.error('API 错误详情:', error);
                        reject(error);
                    });
            });
        };
        
        // 尝试发送消息，最多重试指定次数
        let attempt = 1;
        
        while (attempt <= maxAttempts) {
            try {
                console.log(`尝试发送消息 (${attempt}/${maxAttempts})...`);
                await sendWithTimeout();
                console.log(`消息已发送到聊天ID: ${chatId}`);
                return true;
            } catch (error) {
                console.error(`尝试 ${attempt} 失败:`, error);
                
                if (attempt === maxAttempts) {
                    console.error('发送Telegram消息失败:', error);
                    return false;
                }
                
                // 等待时间递增
                const waitTime = attempt * 2000;
                console.log(`等待 ${waitTime}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
            }
        }
        
        return false;
    }

    /**
     * 处理交易失败的情况并发送通知
     * @param hash 失败交易的哈希值
     */
    async getFalseHash(hash: string) {
        try {
            // 从Redis中获取与该交易哈希相关的通知信息
            const string = await redis.get("teleNotice:" + hash);
            
            if (!string) {
                console.log(`未找到交易哈希 ${hash} 的通知信息`);
                return;
            }
            
            // 将JSON字符串解析为对象
            const info = JSON.parse(string);
            
            // 构建失败通知消息，包含指向Solscan的链接
            const msg = "❌上链失败！<a href='https://solscan.io/tx/" + hash + "'>点击查看hash</a>";
            
            // 通过Telegram机器人发送失败通知给用户
            await this.sendBotMsg(msg, info.chat_id);
            
            // 删除Redis中的通知信息，避免重复通知
            await redis.del("teleNotice:" + hash);
            
            console.log(`已发送交易失败通知: ${hash}`);
        } catch (error) {
            console.error(`处理交易失败通知时出错 (${hash}):`, error);
        }
    }
    
    /**
     * 处理交易成功的情况并发送通知
     * @param hash 成功交易的哈希值
     */
    async getSuccessHash(hash: string) {
        try {
            // 从Redis中获取与该交易哈希相关的通知信息
            const string = await redis.get("teleNotice:" + hash);
            
            if (!string) {
                console.log(`未找到交易哈希 ${hash} 的通知信息`);
                return;
            }
            
            // 将JSON字符串解析为对象
            const info = JSON.parse(string);
            
            // 构建成功通知消息，包含指向Solscan的链接
            const msg = "✅上链成功！<a href='https://solscan.io/tx/" + hash + "'>点击查看hash</a>";
            
            // 通过Telegram机器人发送成功通知给用户
            await this.sendBotMsg(msg, info.chat_id);
            
            // 删除Redis中的通知信息，避免重复通知
            await redis.del("teleNotice:" + hash);
            
            console.log(`已发送交易成功通知: ${hash}`);
        } catch (error) {
            console.error(`处理交易成功通知时出错 (${hash}):`, error);
        }
    }

    /**
     * 保存交易通知信息到Redis
     * @param hash 交易哈希
     * @param chatId 聊天ID
     * @param additionalInfo 额外信息
     */
    async saveTransactionNotice(hash: string, chatId: number | string, additionalInfo: any = {}) {
        try {
            const noticeInfo = {
                chat_id: chatId,
                timestamp: Date.now(),
                ...additionalInfo
            };
            
            // 将通知信息保存到Redis
            await redis.set("teleNotice:" + hash, JSON.stringify(noticeInfo));
            
            // 设置过期时间（24小时）
            await redis.expire("teleNotice:" + hash, 60 * 60 * 24);
            
            console.log(`交易通知信息已保存: ${hash}`);
        } catch (error) {
            console.error(`保存交易通知信息时出错 (${hash}):`, error);
        }
    }

    /**
     * 检查用户的跟单设置和状态
     * @param txType 交易类型信息对象
     * @param member 用户成员ID
     * @param type 跟单类型(pump/ray/jupiter/phoenix/meteora.....)
     * @returns 跟单配置和状态信息
     */
    async checkFollow(txType: any, member: string, type: string) {
        // 初始化跟单者配置对象
        var signer = {
            isFollow: 0,                  
            name: '',                     
            chatId: 0,                    
            status: 0,                    
            hash: '',                     
            privateKey: '',               
            getError: 0,                  
            errorMsg: 'Not Following',    
            
            // 交易参数
            sellRatio: 100,              
            buyAmount: {                  
                jupiter: 0,               // Jupiter
                solFi: 0,                // SolFi
                meteoraDLMM: 0,          // Meteora DLMM
                raydiumCLMM: 0,          // Raydium CLMM
                zeroFi: 0,               // ZeroFi
                stableWeightedSwap: 0,   // Stable Weighted Swap
                swap1DEX: 0,             // Swap1 DEX
                lifinityV2: 0,           // Lifinity V2
                obricV2: 0,              // Obic V2
                phoenix: 0,              // Phoenix
                whirlpool: 0,            // Whirlpool
                fluxBeam: 0,             // FluxBeam
                raydiumCP: 0,            // Raydium CP
                cropper: 0,              // Cropper
                invariant: 0,            // Invariant
                raydium: 0               // Raydium
            },
            autoSell: 0,                  
            buyOnce: 1,                   
            
            // 池子范围限制
            poolRange: {
                jupiter: '',              
                solFi: '',               
                meteoraDLMM: '',         
                raydiumCLMM: '',         
                zeroFi: '',              
                stableWeightedSwap: '',  
                swap1DEX: '',            
                lifinityV2: '',          
                obricV2: '',             
                phoenix: '',             
                whirlpool: '',           
                fluxBeam: '',            
                raydiumCP: '',           
                cropper: '',             
                invariant: '',           
                raydium: ''              
            },

            // Gas和手续费设置
            gasConfig: {
                sell: 0,                  
                normal: 0                 
            },
            
            // MEV配置
            mevConfig: {
                model: 0,                 
                fee: 0,                   
                fetchEnabled: true,       
                jitoEnabled: true         
            }
        };

        // 获取用户的跟单设置
        const followInfo = await redis.get('bank:' + member + ":" + txType.signer) || '';
        if (followInfo) {
            let canFollow = 1;
            let errorMessage = 'Not Following';
            signer = JSON.parse(followInfo);
            
            // 获取用户的私钥和聊天ID
            const privateKey = await redis.get('siyao:' + member) || '';
            signer.chatId = Number(await redis.get("member:" + member)) || 0;

            // 检查私钥
            if (privateKey === '') {
                errorMessage += ', No Private Key';
                canFollow = 0;
            }
            signer.privateKey = privateKey;

            // 检查跟单状态
            if (signer.status === 0) {
                errorMessage += ', Status Not Enabled';
                canFollow = 0;
            }

            // 检查每个DEX的买入金额设置
            if (signer.buyAmount[type as keyof typeof signer.buyAmount] === 0) {
                errorMessage += ', Buy Amount Is Zero';
                canFollow = 0;
            }

            // 检查自动卖出设置
            if (txType.type === 'sell' && signer.autoSell === 0) {
                errorMessage += ', Buy Only';
                canFollow = 0;
            }

            // 检查池子范围限制
            if (signer.poolRange[type as keyof typeof signer.poolRange]) {
                const [minPool, maxPool] = signer.poolRange[type as keyof typeof signer.poolRange].split('-');
                if (Number(maxPool) < txType.poolsize) {
                    errorMessage += ', Pool Exceeds Maximum Range';
                    canFollow = 0;
                }
                if (Number(minPool) > txType.poolsize) {
                    errorMessage += ', Pool Below Minimum Range';
                    canFollow = 0;
                }
            }

            // 检查买入一次限制
            if (signer.buyOnce === 1) {
                const trades = await redis.lRange(`${signer.chatId}:trade:${txType.token}`, 0, -1);
                if (trades.length > 0) {
                    let buyCount = 0;
                    trades.forEach((item: string) => {
                        const trade: { type: string } = JSON.parse(item);
                        if (trade.type === 'buy') buyCount++;
                    });
                    if (buyCount > 0) {
                        errorMessage += ', Buy Once Only';
                        canFollow = 0;
                    }
                }
            }

            // 更新跟单状态和设置
            signer.isFollow = canFollow;
            if (txType.type === 'sell') {
                signer.gasConfig.normal = signer.gasConfig.sell;
            }
            
            // 更新MEV设置
            if (signer.mevConfig.fetchEnabled && !signer.mevConfig.jitoEnabled) {
                signer.mevConfig.model = 1;
            }
            if (!signer.mevConfig.fetchEnabled && signer.mevConfig.jitoEnabled) {
                signer.mevConfig.model = 2;
            }
            
            signer.errorMsg = errorMessage;
        }
        
        return signer;
    }


    
    /**
     * 处理程序退出
     */
    async cleanup() {
        if (redis.isOpen) {
            await redis.quit();
            console.log('Redis连接已关闭');
        }
    }
}

// 处理程序退出
process.on('SIGINT', async () => {
    if (redis.isOpen) {
        await redis.quit();
    }
    process.exit();
});