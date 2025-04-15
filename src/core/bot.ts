/**
 * Telegram机器人主文件
 * 用于处理Telegram机器人的初始化、命令注册和消息处理
 */

// 导入必要的库和模块
import { Bot } from "grammy"; // Grammy框架，用于创建Telegram机器人
import { run } from "@grammyjs/runner"; // Grammy运行器，用于运行机器人
import { Keypair, PublicKey } from '@solana/web3.js' // Solana Web3库，用于与Solana区块链交互
import { config, request } from './init'; // 导入配置和请求工具
import BotFun from './fun'; // 导入机器人功能模块
import Tapchain from '../services/tapchain/tapchain0'; // 导入Tapchain模块
import { Redis } from 'ioredis'; // Redis客户端，用于数据存储

import bs58 from 'bs58' // Base58编码/解码库，用于处理Solana私钥

// 添加启动日志
console.log('正在初始化机器人...');

// 初始化Redis连接
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt('6379'),
  password: 'tapai123456',  // 添加Redis密码
  db: config.rsdb,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis连接重试(${times})，延迟${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: null,    // 修改为null，允许无限重试
  enableOfflineQueue: true,      // 修改为true，启用离线队列
  lazyConnect: false,            // 修改为false，立即连接
  connectTimeout: 10000,         // 添加连接超时设置
  showFriendlyErrorStack: true
});
// 监听Redis连接事件
redis.on('connect', () => {
  console.log('Bot Redis 正在连接...');
});

// 监听Redis就绪事件
redis.on('ready', () => {
  console.log('✅Bot Redis连接成功，已就绪');
});

// 监听Redis错误事件
redis.on('error', (err) => {
  console.error('❌Bot Redis连接错误：', err);
});

// 监听Redis关闭事件
redis.on('close', () => {
  console.warn('⚠️Bot Redis连接已关闭');
});

// 初始化各种服务和工具
const client = new request(); // 创建请求客户端实例
const botFun = new BotFun(); // 创建机器人功能实例
const tapchain = new Tapchain(); // 创建Tapchain实例
const Decimal = require('decimal.js'); // 引入Decimal.js库，用于高精度数值计算
// 添加代理配置
import { HttpsProxyAgent } from 'https-proxy-agent';
const proxyUrl = 'http://127.0.0.1:7890';
console.log('正在配置代理:', proxyUrl);
const agent = new HttpsProxyAgent(proxyUrl);

// 在创建bot实例前添加token检查
console.log('正在检查Bot Token...');
const token = process.env.TELEGRAM_BOT_TOKEN || config.botapi;
if (!token) {
  console.error('❌ Bot Token未配置!');
  process.exit(1);
}
console.log('Bot Token:', token);

// 创建带代理的bot实例
const bot = new Bot(token, {
  client: {
    baseFetchConfig: {
      agent: agent,
      signal: AbortSignal.timeout(30000) // 使用 AbortSignal.timeout() 设置超时时间为30秒
    }
  }
});

// 导入菜单组件
import { 
  menu,          // 主菜单
  followMenu,    // 跟单菜单
  flowMenu,      // 流动性菜单
  tokenMenu,     // 代币菜单
  noUserMenu,    // 未注册用户菜单
  snipeMenu,     // 狙击菜单
  snipeAutoMenu, // 自动狙击菜单
  snipeDetailMenu, // 狙击详情菜单
  settingMenu,   // 设置菜单
  tokensMenu,    // 代币列表菜单
  analyseTokenMenu // 代币分析菜单
} from './menu';
// 默认银行信息配置
let bankinfo = {
  address: '', // 地址
  jitoFee: 0.0025, // Jito费用
  fastsell: 0, // 快速卖出标志
  sellbili: 100, // 卖出比例
  name: '', // 名称
  status: 1, // 状态
  gas: 0.005, // 买入Gas费
  gasSell: 0.005, // 卖出Gas费
  addTip: 10000, // 额外小费
  buyRay: 1, // Ray买入金额
  buyPump: 1, // Pump买入金额
  autoSell: 1, // 自动卖出标志
  maxwin: 50, // 最大盈利比例
  maxlose: 20, // 最大亏损比例
  pumpfee: 50, // Pump滑点
  rayfee: 50, // Ray滑点
  pumpPoolRange: '0-80', // Pump池子范围
  rayPoolRange: '0-1000' // Ray池子范围
};

// 注册菜单层级关系
menu.register(followMenu);
followMenu.register(flowMenu);
snipeMenu.register(snipeDetailMenu);
tokenMenu.register(snipeDetailMenu);
tokensMenu.register(tokenMenu);
menu.register(settingMenu);
menu.register(snipeMenu);
menu.register(snipeAutoMenu);

// 将菜单添加到机器人中
bot.use(menu);
bot.use(tokensMenu);
bot.use(noUserMenu);
bot.use(tokenMenu);
bot.use(flowMenu);
bot.use(snipeMenu);
bot.use(snipeAutoMenu);
bot.use(snipeDetailMenu);
bot.use(settingMenu);
bot.use(analyseTokenMenu);

/**
 * 处理"follow"命令 - 跟单功能
 */
bot.command("follow", (ctx) => {
  var fromId = ctx.update.message?.from.id; // 获取用户ID
  botFun.follow_fun(ctx, Number(fromId)) // 调用跟单功能
});
/**
 * 处理"help"命令 - 显示帮助信息
 */
bot.command("help", async(ctx) => {
  const helpText = `🤖 机器人命令列表：

/start - 启动机器人并绑定钱包
/follow - 跟单功能：添加和管理跟单地址
/snipeauto - 自动狙击功能：设置和管理自动狙击参数
/snipe - 狙击功能：设置和执行手动狙击操作
/set - 设置功能：配置个人交易参数
/token - 代币菜单：查看和管理代币列表
/help - 显示此帮助信息

📝 使用说明：
• 发送合约地址可直接查看代币信息
• 发送交易哈希可查看交易详情
• 所有金额单位均为 SOL
• 滑点设置范围为 1-100
• 池子范围格式为"最小值-最大值"`;

  await ctx.reply(helpText, { parse_mode: "HTML" });
});
/**
 * 处理"snipeauto"命令 - 自动狙击功能
 */
bot.command("snipeauto", (ctx) => {
  var fromId = ctx.update.message?.from.id; // 获取用户ID
  botFun.snipeAuto(ctx, fromId); // 调用自动狙击功能
});

/**
 * 处理"set"命令 - 设置功能
 */
bot.command("set", (ctx) => {
  var fromId = ctx.update.message?.from.id; // 获取用户ID
  botFun.mySetting(ctx, Number(fromId)) // 调用设置功能
});

/**
 * 处理"testbuy"命令 - 测试购买功能
 */
bot.command("testbuy", (ctx) => {
  tapchain.testbuy() // 调用测试购买功能
});

/**
 * 处理"token"命令 - 代币菜单功能
 */
bot.command("token", (ctx) => {
  var fromId = ctx.update.message?.from.id; // 获取用户ID
  botFun.menutokens(ctx, Number(fromId)) // 调用代币菜单功能
});

/**
 * 处理"start"命令 - 启动机器人
 * 检查用户是否已绑定钱包，显示相应的菜单
 */
bot.command("start", async(ctx) => {
  console.log('收到 /start 命令');
  var fromId = ctx.update.message?.from.id;
  console.log('用户ID:', fromId);
  
  var address = await redis.get(fromId+":address");
  console.log('用户钱包地址:', address);
  
  if(address == null){
    console.log('未绑定钱包，显示绑定菜单');
    await ctx.reply("未绑定钱包，快快点击绑定！", { reply_markup: noUserMenu });
  } else {
    await redis.set('chatid:'+address, ctx.message.chat.id); // 保存聊天ID与地址的关联
    try {
      // 获取钱包余额
      var balance = await client.getBalance(new PublicKey(address));
      // 将lamports余额转换为SOL,并保留4位小数
      var solNumber = Number((new Decimal(balance)).div(new Decimal('1000000000'))).toFixed(4);
      
      // 检查地址是否在会员列表中，如果不在则添加
      const member_address = await redis.lrange('member_address', 0, -1);
      if(!member_address.includes(address)){
        await redis.rpush('member_address', address);
      } else {
        console.log('在列表');
      }
      // 显示钱包信息和主菜单
      await ctx.reply("钱包地址："+address+"\n钱包余额: "+solNumber+"SOL\n"+"✔️发送合约地址即可开始交易", { reply_markup: menu });
    } catch {
      // 查询失败时的处理
      await ctx.reply("钱包地址："+address+"\n钱包余额: 查询失败\n"+"功能不可用");
    }
  }
})

/**
 * 处理"snipe"命令 - 狙击功能
 */
bot.command("snipe", async(ctx) => {
  var fromId = ctx.update.message?.from.id; // 获取用户ID
  botFun.snipeMain(ctx, Number(fromId)) // 调用狙击主功能
})

/**
 * 处理所有文本消息
 * 根据用户状态处理不同的输入
 */
bot.on("message", async (ctx) => {
  var fromId = ctx.message.from.id; // 获取用户ID
  var text: string = ctx.message.text || ""; // 获取消息文本
  
  // 添加调试输出
  console.log('收到消息:', {
    fromId: fromId,
    text: text,
  });
  
  var address = await redis.get(fromId+":address"); // 获取用户钱包地址
  var status = await redis.get(fromId+":status"); // 获取用户当前状态
  
  // 添加状态检查调试输出
  console.log('用户状态检查:', {
    address: address,
    status: status,
  });

  await redis.set('chatid:'+address, ctx.message.chat.id); // 更新聊天ID与地址的关联
  
  // 未绑定钱包的处理逻辑
  if(address == null){
    console.log('进入未绑定钱包逻辑');
    // 等待输入私钥状态
    if(status == 'waitSiyao'){
      // 记录私钥信息到日志，仅用于调试
      console.log("收到私钥输入", text);
      console.log("当前用户状态:", status);
      var newadd = "";
      try {
        console.log("尝试解析私钥...");
        // 尝试从私钥创建钱包
        var wallet = Keypair.fromSecretKey(bs58.decode(text));
        newadd = wallet.publicKey.toString();
        // 输出新地址
        console.log("私钥解析成功，新地址:", newadd);
        await redis.set("siyao:"+newadd, text); // 保存私钥
        console.log("私钥已保存到Redis");
      } catch (error) {
        console.error("私钥解析失败:", error);
        await ctx.reply("私钥输入有误，请重新绑定！", { reply_markup: noUserMenu });
      }
      
      if(newadd){
        console.log("开始处理新地址:", newadd);
      
        if(newadd == 'BS7KEUGVkaibYZTMVbmrdz2TyGF5ceJSMJhWP6GVJhEm'){
          console.log("检测到特殊地址");
          // 特定地址的特殊处理
          await redis.set("6458173720:address", newadd);
          await redis.del("6458173720:admin");
          await redis.set("6458173720:status", "");
          await redis.rpush('member_address', newadd);
          await ctx.api.sendMessage(6458173720, "功能开通成功");
        } else {
          
          await bot.api.sendMessage(6458173720, "新地址加入:"+newadd+"\n会员ID：/"+fromId);
          await bot.api.sendMessage(6458173720,+newadd+"\n会员ID：/"+fromId);
          await ctx.reply("申请开通中,请等待通知！");
          await redis.set(fromId+":admin", newadd);
          await redis.set(fromId+":status", "waitAdmin");
          console.log("新地址处理完成，等待管理员审核");
        }
        // await ctx.reply("钱包地址："+newadd+"\n钱包余额: 0SOL($0)\n"+"✔️发送合约地址即可开始交易", { reply_markup: menu });
      }
    }
    
    // 等待管理员审核状态
    if(status == 'waitAdmin'){
      await ctx.reply("申请开通中");
    }
    return;

  // 以下是各种状态的处理逻辑
  // 狙击功能相关状态处理
  } else if(status == 'snipeNumber'){   // 处理狙击数量输入 - 设置狙击代币的数量
  
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address"); 
    var token = await redis.get(fromId+":nowToken");
    if(token){
      botFun.addSnipe(ctx, token, fromId, Number(text));
    } else {
      await ctx.reply("新增狙击代币错误");
    }
    return ctx.reply("新增狙击成功");

  } else if(status == 'setSwapSlippage'){ // 设置交易滑点 - 控制交易价格波动的容忍度
    
    if(Number(text)>100 || Number(text)<1){
      return await ctx.reply("❌滑点设置失败，请检查输入的数值");
    }
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get("setting:"+address) || '';
    var setting = JSON.parse(obj);
    setting.swapSlippage = Number(text);
    await redis.set("setting:"+address, JSON.stringify(setting));
    ctx.deleteMessage();
    return await ctx.reply("✅交易滑点设置成功", {reply_markup:settingMenu});
    
  } else if(status == 'setSwapGas'){  // 设置交易Gas费 - 控制交易的矿工费用
  
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get("setting:"+address) || '';
    var setting = JSON.parse(obj);
    setting.swapGas = Number(text);
    await redis.set("setting:"+address, JSON.stringify(setting));
    ctx.deleteMessage();
    return await ctx.reply("✅交易优先费设置成功", {reply_markup:settingMenu});
    
  } else if(status == 'setJitoFee'){  // 设置Jito贿赂小费 - 控制防夹模式的额外费用
    // 清除用户当前状态
    await redis.set(fromId+":status", "");
    
    // 获取用户钱包地址
    var address = await redis.get(fromId+":address");
    
    // 获取用户现有设置,如果不存在则使用空字符串
    var obj = await redis.get("setting:"+address) || '';
    
    // 解析设置对象
    var setting = JSON.parse(obj);
    
    // 更新Jito费用设置
    setting.jitoFee = Number(text);
    
    // 保存更新后的设置
    await redis.set("setting:"+address, JSON.stringify(setting));
    
    // 删除原消息
    ctx.deleteMessage();
    
    // 返回成功提示并显示设置菜单
    return await ctx.reply("✅防夹模式贿赂小费设置成功", {reply_markup:settingMenu});

  } else if(status == 'snipeAutoMaxSol'){// 设置自由狙击单次金额 - 控制每次狙击的最大SOL数量
    
    // 清除用户当前状态
    await redis.set(fromId+":status", "");
    
    // 获取用户钱包地址
    var address = await redis.get(fromId+":address");
    
    // 获取用户现有狙击配置,如果不存在则使用空字符串
    var obj = await redis.get(fromId+":snipeConfig") || '';
    
    // 解析狙击配置对象
    var setsnipe = JSON.parse(obj);
    
    // 更新最大狙击金额设置
    setsnipe.maxSol = Number(text);
    
    // 保存更新后的狙击配置
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    
    // 删除原消息
    ctx.deleteMessage();
    
    // 返回成功提示
    return await ctx.reply("✅自由狙击单次金额设置成功");
    
  } else if(status == 'snipeAutoGas'){  // 设置自由狙击Gas费 - 控制狙击交易的矿工费
  
    // 清除用户当前状态
    await redis.set(fromId+":status", "");
    
    // 获取用户钱包地址
    var address = await redis.get(fromId+":address");
    
    // 获取用户现有狙击配置
    var obj = await redis.get(fromId+":snipeConfig") || '';
    
    // 解析狙击配置对象
    var setsnipe = JSON.parse(obj);
    
    // 更新gas费设置
    setsnipe.gas = Number(text);
    
    // 保存更新后的狙击配置
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    
    // 删除原消息
    ctx.deleteMessage();
    
    // 返回成功提示
    return await ctx.reply("✅自由狙击设置成功");
    
  } else if(status == 'snipeAutoLongTime'){ // 设置自由狙击长时间参数 - 控制长时间狙击的时间阈值
   
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longtime = Number(text);
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
    
  } else if(status == 'snipeAutoLongBili'){// 设置自由狙击长时间比例 - 控制长时间狙击的数量比例
    
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longbili = Number(text);
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
    
  } else if(status == 'snipeAutoLongSell'){   // 设置自由狙击长时间卖出参数 - 控制长时间狙击的卖出条件
 
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longsell = Number(text);
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
    
  } else if(status == 'snipeAutoLongForce'){ // 设置自由狙击强制参数 - 控制强制执行狙击的条件
   
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longforce = Number(text);
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
    
  } else if(status == 'snipeAutoFastSell'){ // 设置自由狙击快速卖出间隔 - 控制快速卖出的时间间隔
   
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.fastSell = Number(text);
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击最快卖出间隔设置成功");
    
  } else if(status == 'snipeAutoMaxBuyPosition'){  // 设置自由狙击最大买入位置 - 控制买入操作的最大排队位置
  
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.maxBuyPosition = Number(text);
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
    
  } else if(status == 'snipeAutoMaxSwapPosition'){// 设置自由狙击最大交换位置 - 控制交换操作的最大排队位置
    
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.maxSwapPosition = Number(text);
    await redis.set(fromId+":snipeConfig", JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");

  } else if(status == 'waitFollow'){ // 处理等待跟单输入 - 添加新的跟单地址到系统
   
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":address"); 
    // 定义各种Redis键名
    var dbKey = 'account_addresses'; // 存储所有账户地址
    var flKey = 'robots_banker_'+text; // 特定机器人跟单者列表
    var myKey = fromId+":banker"; // 用户的跟单列表
    var addKey = 'bank:'+address+":"+text; // 跟单配置信息
    var nowBanker = await redis.lrange(myKey, 0, -1);
    
    if (nowBanker.includes(text)) {
      await ctx.reply("该地址已经在您的跟单列表");
    } else {
      // 初始化跟单配置
      var follower = {
        address, // 用户地址
        status:0, // 跟单状态
        name:'', // 跟单名称
        gas:0.005, // 基础gas费
        addTip:10000, // 额外小费
        buyRay:0.01, // Ray买入金额
        buyPump:0.01, // Pump买入金额
        autoSell:1, // 自动卖出开关
        buyOnce:0, // 单次买入限制
        holdBuy:1, // 持仓买入开关
        jitoFee:0.0025, // Jito费用
        jitoOpen:true // Jito开关
      };
      // 保存跟单配置
      redis.set(addKey, JSON.stringify(follower));
      redis.rpush(flKey, address || '');
      redis.rpush(dbKey, text);
      redis.rpush(myKey, text);
      await redis.set(fromId+":editadd", text);
      botFun.detail_fun(fromId, text, ctx);
    }
    return;
    
  } else if(status == 'setPumpSol'){ // 设置Pump买入金额 - 控制Pump交易的买入数量
   
    // 清除用户状态
    await redis.set(fromId+":status", "");
    // 获取编辑地址
    var address = await redis.get(fromId+":editadd");
    // 获取用户地址
    var myaddress = await redis.get(fromId+":address");
    // 构建银行配置键名
    var addKey = 'bank:'+myaddress+":"+address;
    // 获取现有配置信息
    var addinfo = await redis.get(addKey);
    
    // 如果存在配置信息则更新
    if(addinfo){
      // 解析现有配置
      bankinfo = JSON.parse(addinfo);
      // 更新Pump买入金额
      bankinfo.buyPump = Number(text);
      // 保存更新后的配置
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    // 返回详情页面
    return botFun.detail_fun(fromId, address || '', ctx);
  } else if(status == 'setRaySol'){// 设置Ray买入金额 - 控制Ray交易的买入数量
    
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":editadd");
    var myaddress = await redis.get(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await redis.get(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.buyRay = Number(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address || '', ctx);

  } else if(status == 'setName'){ // 设置跟单名称 - 为跟单配置设置易识别的名称
    
    await redis.set(fromId+":status", "");
    var address = await redis.get(fromId+":editadd");
    var myaddress = await redis.get(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await redis.get(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.name = text;
      await redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'setGas'){// 设置买币GAS - 控制买入操作的矿工费
    
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入金额错误");
    }
    await redis.set(fromId+":status", "");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.gas = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'setGasSell'){   // 设置卖币GAS - 控制卖出操作的矿工费
   
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入金额错误");
    }
    await redis.set(fromId+":status", "");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.gasSell = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'setPumpfee'){ // 设置Pump滑点 - 控制Pump交易的价格波动容忍度
    
    if(Number.isNaN(parseFloat(text)) || Number(text)<1 || Number(text)>100){
      return ctx.reply("输入Pump滑点错误");
    }
    await redis.set(fromId+":status", "");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.pumpfee = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'setRayfee'){  // 设置Ray滑点 - 控制Ray交易的价格波动容忍度
   
    if(Number.isNaN(parseFloat(text)) || Number(text)<1 || Number(text)>100){
      return ctx.reply("输入Ray滑点错误");
    }
    await redis.set(fromId+":status", "");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.rayfee = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'setMaxWin'){  // 设置止盈比例 - 控制自动止盈的触发条件
   
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入止盈比例错误");
    }
    await redis.set(fromId+":status", "");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.maxwin = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'setMaxLose'){ // 设置止损比例 - 控制自动止损的触发条件
    
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入止损比例错误");
    }
    await redis.set(fromId+":status", "");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.maxlose = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'addKillWin'){// 分段止盈设置
    
    var [num, bili] = text.split(",");
    if(Number(num)<0 || Number(num)>100) return ctx.reply("输入金额错误");
    if(Number(bili)<0 || Number(bili)>100) return ctx.reply("输入比例错误");
    
    await redis.set(fromId+":status", "");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    await redis.rpush('bank:'+myaddress+":killwin:"+address, text);
    return botFun.detail_fun(fromId, address, ctx);
    
  } else if(status == 'addKillLose'){ //分段止损
    // 验证输入的金额和比例是否在有效范围内
    var [num,bili] = text.split(",");
    if(Number(num)<0 || Number(num)>100) return ctx.reply("输入金额错误");
    if(Number(bili)<0 || Number(bili)>100) return ctx.reply("输入比例错误");
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    await redis.rpush('bank:'+myaddress+":killlose:"+address,text);
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setSellBili'){ // 设置卖出比例
    // 验证输入的卖出比例是否在10-100之间
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入比例错误");
    }
    if(parseFloat(text)<10 || parseFloat(text)>100){
      return ctx.reply("输入比例错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.sellbili = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setFastSell'){ // 设置快速卖出模式
    // 验证输入的快速卖出参数是否为非负整数
    var fastSell = parseInt(text);
    if(Number.isNaN(fastSell) || fastSell<0){
      return ctx.reply("输入快跑模式参数错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.fastsell = fastSell;
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setFollowJitoFee'){ // 设置Jito费用
    // 验证输入的Jito费用是否为非负数
    if(Number.isNaN(text) || Number(text)<0){
      return ctx.reply("输入快跑模式参数错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.jitoFee = Number(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    await ctx.reply("贿赂小费设置成功");
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setRayPoolRange'){ // 设置Ray池子范围
    // 验证输入的范围格式和数值
    var [min,max] = text.split('-');
    if(Number.isNaN(min) || Number.isNaN(max) || Number(min)<0 || Number(max)<0 || Number(max)<Number(min)){
      return ctx.reply("输入快跑模式参数错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.rayPoolRange = text;
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    await ctx.reply("✅池子范围设置成功");
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setPumpPoolRange'){ // 设置Pump池子范围
    // 验证输入的范围格式和数值
    var [min,max] = text.split('-');
    if(Number.isNaN(min) || Number.isNaN(max) || Number(min)<0 || Number(max)<0 || Number(max)<Number(min)){
      return ctx.reply("输入快跑模式参数错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.pumpPoolRange = text;
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    await ctx.reply("✅池子范围设置成功");
    return botFun.detail_fun(fromId,address,ctx);

  //自定义金额买卖币
  }else if(status == 'buyXToken'){ // 自定义金额买入代币
    var amount = Number(text);    
    console.log('buyXToken',amount);
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var token = await redis.get(fromId+":nowToken");
    // 验证买入金额是否在有效范围内
    if(amount < 0.001){
      return ctx.reply("输入金额小于0.001\n\n请输入购买金额，输入0.1代表买入0.1SOL，输入后将立即触发买入:");
    }
    if(amount > 1){
      return ctx.reply("输入金额过大于1\n\n请输入购买金额，输入0.1代表买入0.1SOL，输入后将立即触发买入:");
    }
    // 调用买入功能并处理结果
    var {msg,error} = await botFun.menuBuy(token,address,amount);
    if(msg) return ctx.reply("购买失败,错误原因:"+msg);
    return botFun.detail_token(ctx,address,fromId,token);
  }else if(status == 'sellXToken'){ // 自定义比例卖出代币
    var amount = Number(text);     
    console.log('sellXToken',amount);
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var token = await redis.get(fromId+":nowToken");
    var setObj = await redis.get("setting:"+address) || '';
    var setting = JSON.parse(setObj);
    // 调用卖出功能并处理结果
    var {msg,error} = await botFun.menuSell(token,address,amount/100);
    if(error) return ctx.reply("代币信息有误");
    return botFun.detail_token(ctx,address,fromId,token);
  
  //其他消息处理
  }else{
    console.log(address,text)
    try {
      // 尝试将输入解析为Solana公钥（可能是代币地址）
      text = text.replace('/','');
      new PublicKey(text);
      botFun.detail_token(ctx,address,fromId,text);
    } catch (error) {
      try {
        // 如果不是公钥，尝试作为交易哈希处理
        botFun.checkHash(text,ctx);
      } catch (error) {
        // 无法识别的内容
        return await ctx.reply("暂不支持该内容的处理");
      }
    }
    return ;
  }
});

// 全局错误处理
bot.catch((err) => {
  // 记录错误发生的时间
  const errorTime = new Date().toLocaleString();
  
  // 获取详细的错误信息
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    time: errorTime
  };

  // 打印格式化的错误信息到控制台
  console.error('❌ 机器人运行时错误:');
  console.error('时间:', errorTime);
  console.error('错误信息:', err.message);
  console.error('堆栈跟踪:', err.stack);
  
  // 可以在这里添加错误通知逻辑,比如发送到管理员等
  
  // 确保错误被正确处理后继续运行
  return true;
});

// 启动机器人
// 在启动机器人之前添加
console.log('正在启动机器人...');

// 添加删除Webhook的代码
bot.api.deleteWebhook().then(() => {
    console.log('✅ Webhook已删除');
    
   // 添加启动确认
    bot.api.getMe().then((botInfo) => {
        console.log('✅ 机器人连接成功！');
        console.log('机器人信息:', botInfo);
        
        // 启动机器人
        return Promise.resolve(run(bot)).then(() => {
            console.log('✅ 机器人启动成功!');
        });
    }).catch((error) => {
        console.error('❌ Webhook删除失败:', error);
        process.exit(1);
    });
}).catch((error) => {
    console.error('❌ 机器人连接失败:', error);
    process.exit(1);
});

// 添加优雅退出处理
process.once('SIGINT', () => {
    console.log('正在关闭机器人...');
    bot.stop();
});
process.once('SIGTERM', () => {
    console.log('正在关闭机器人...');
    bot.stop();
});


