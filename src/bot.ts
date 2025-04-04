/**
 * Telegram 交易机器人主文件
 * 实现基于 Telegram 的 Solana 链上交易自动化功能
 * 包括用户管理、交易执行、跟单设置等功能
 */
import { Bot } from "grammy";
import { run } from "@grammyjs/runner";
import { Keypair,PublicKey } from '@solana/web3.js'
import { config,request } from './init';
import BotFun from './fun';
import Tapchain from './tapchain0';
import { Redis } from 'ioredis';

import bs58 from 'bs58'
// 初始化 Redis 连接
const redis = new Redis({
  host: config.rshost,
  port: 6379,
  password: config.rspwd,
  db: config.rsdb
});
// 初始化请求客户端
const client = new request;
// 初始化功能模块
const botFun = new BotFun();
const tapchain = new Tapchain();
const Decimal = require('decimal.js');
// 创建 Telegram 机器人实例
const bot = new Bot(config.botapi);

// 导入菜单组件
const { 
  menu,
  followMenu,
  flowMenu,
  tokenMenu,
  noUserMenu,
  snipeMenu,
  snipeAutoMenu,
  snipeDetailMenu,
  settingMenu,
  tokensMenu,
  analyseTokenMenu
} = require('./menu');

// 默认跟单配置信息
let bankinfo = {
  address: '',
  jitoFee: 0.0025,
  fastsell: 0,
  sellbili: 100,
  name: '',
  status: 1,
  gas: 0.005,
  gasSell: 0.005,
  addTip: 10000,
  buyRay: 1,
  buyPump: 1,
  autoSell: 1,
  maxwin: 50,
  maxlose: 20,
  pumpfee: 50,
  rayfee: 50,
  pumpPoolRange: '0-80',
  rayPoolRange: '0-1000'
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
 * 处理 /follow 命令 - 跟单功能
 * 允许用户设置跟随特定交易者的交易行为
 */
bot.command("follow", (ctx) => {
  // 从消息上下文中获取用户ID
  const fromId = ctx.update.message?.from.id;
  // 调用跟单功能处理函数
  botFun.follow_fun(ctx, Number(fromId));
});
/**
 * 处理 /snipeauto 命令 - 自动狙击功能
 * 设置自动狙击交易参数
 */
bot.command("snipeauto", (ctx) => {
  var fromId = ctx.update.message?.from.id;
  botFun.snipeAuto(ctx,fromId);
});

/**
 * 处理 /set 命令 - 设置功能
 * 用户个人设置管理
 */
bot.command("set", (ctx) => {
  var fromId = ctx.update.message?.from.id;
  botFun.mySetting(ctx,Number(fromId))
});

/**
 * 处理 /testbuy 命令 - 测试购买功能
 * 用于测试交易功能
 */
bot.command("testbuy", (ctx) => {
  tapchain.testbuy()
});

/**
 * 处理 /token 命令 - 代币管理功能
 * 显示用户的代币列表
 */
bot.command("token", (ctx) => {
  var fromId = ctx.update.message?.from.id;
  botFun.menutokens(ctx,Number(fromId))
});

/**
 * 处理 /start 命令 - 启动机器人
 * 检查用户是否已绑定钱包，显示相应界面
 */
/**
 * 处理 /start 命令
 * 检查用户钱包绑定状态并显示相应界面
 */
bot.command("start", async(ctx) => {
  // 获取用户ID
  var fromId = ctx.update.message?.from.id;
  // 查询用户是否已绑定钱包地址
  var address = await redis.get(fromId+":address");

  if(address == null){
    // 未绑定钱包，显示绑定界面
    await ctx.reply("未绑定钱包，快快点击绑定！", { reply_markup: noUserMenu });
  }else{
    // 已绑定钱包，更新聊天ID并显示钱包信息
    await redis.set('chatid:'+address,ctx.message.chat.id);
    
    try{
      // 获取钱包余额
      var balance = await client.getBalance(new PublicKey(address));
      // 将余额转换为SOL单位(1 SOL = 10^9 lamports)
      var solNumber = Number((new Decimal(balance)).div(new Decimal('1000000000'))).toFixed(4);
      
      // 检查地址是否在会员列表中
      const member_address = await redis.lrange('member_address', 0, -1);
      if(!member_address.includes(address)){
        await redis.rpush('member_address',address);
      }else{
        console.log('在列表');
      }

      // 显示钱包信息和交易提示
      await ctx.reply("钱包地址："+address+"\n钱包余额: "+solNumber+"SOL\n"+"✔️发送合约地址即可开始交易", { reply_markup: menu });
    }catch{
      // 查询失败时显示错误信息
      await ctx.reply("钱包地址："+address+"\n钱包余额: 查询失败\n"+"功能不可用");
    }
  }
})

/**
 * 处理 /snipe 命令 - 狙击功能
 * 进入狙击交易设置界面
 */
bot.command("snipe", async(ctx) => {
  var fromId = ctx.update.message?.from.id;
  botFun.snipeMain(ctx,Number(fromId))
})

/**
 * 处理用户发送的消息
 * 根据用户当前状态处理不同类型的输入
 */
bot.on("message", async (ctx) => {
  var fromId = ctx.message.from.id;
  var text:string = ctx.message.text || "";
  var address = await redis.get(fromId+":address");
  var status = await redis.get(fromId+":status");
  await redis.set('chatid:'+address,ctx.message.chat.id);
  
  // 未绑定钱包的用户处理逻辑
  if(address == null){
    if(status == 'waitSiyao'){
      // 等待用户输入私钥
      console.log(text);
      var newadd = "";
      try {
        // 从私钥生成钱包地址
        var wallet = Keypair.fromSecretKey(bs58.decode(text));
        newadd = wallet.publicKey.toString();
        await redis.set("siyao:"+newadd, text);
      } catch (error) {
        await ctx.reply("私钥输入有误，请重新绑定！", { reply_markup: noUserMenu });
      }

      if(newadd){
        // 特殊地址处理
        if(newadd == 'C83GvZ1HjRht7vz3kec5nsFy1QjF2aSULrbhcj1xCYjg'){
          await redis.set("6427727037:address",newadd);
          await redis.del("6427727037:admin");
          await redis.set("6427727037:status","");
          await redis.rpush('member_address',newadd);
          await ctx.api.sendMessage(6427727037,"功能开通成功");
        }else{
          // 通知管理员有新用户注册
          await bot.api.sendMessage(6427727037,"新地址加入:"+newadd+"\n会员ID：/"+fromId);
          await bot.api.sendMessage(7584396434,"新地址加入:"+newadd+"\n会员ID：/"+fromId);
          await ctx.reply("申请开通中,请等待通知！");
          await redis.set(fromId+":admin",newadd);
          await redis.set(fromId+":status","waitAdmin");
        }
     
      }
    }
    if(status == 'waitAdmin'){
      await ctx.reply("申请开通中");
    }
    return ;
  //狙击功能相关
}
  else if(status == 'snipeNumber'){
    // 设置狙击数量
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var token = await redis.get(fromId+":nowToken");
    if(token){
      botFun.addSnipe(ctx,token,fromId,Number(text));
    }else{
      await ctx.reply("新增狙击代币错误");
    }
    return ctx.reply("新增狙击成功");

  //全局设置相关状态处理
  }else if(status == 'setSwapSlippage'){ 
    // 设置交易滑点
    if(Number(text)>100 || Number(text)<1){
      return await ctx.reply("❌滑点设置失败，请检查输入的数值");
    }
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get("setting:"+address) || '';
    var setting = JSON.parse(obj);
    setting.swapSlippage = Number(text);
    await redis.set("setting:"+address,JSON.stringify(setting));
    ctx.deleteMessage();
    return await ctx.reply("✅交易滑点设置成功",{reply_markup:settingMenu});
  }else if(status == 'setSwapGas'){
    // 设置交易Gas费
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get("setting:"+address) || '';
    var setting = JSON.parse(obj);
    setting.swapGas = Number(text);
    await redis.set("setting:"+address,JSON.stringify(setting));
    ctx.deleteMessage();
    return await ctx.reply("✅交易优先费设置成功",{reply_markup:settingMenu});
  }else if(status == 'setJitoFee'){ //贿赂小费
    // 设置Jito费用(防夹模式)
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get("setting:"+address) || '';
    var setting = JSON.parse(obj);
    setting.jitoFee = Number(text);
    await redis.set("setting:"+address,JSON.stringify(setting));
    ctx.deleteMessage();
    return await ctx.reply("✅防夹模式贿赂小费设置成功",{reply_markup:settingMenu});

  //自由狙击功能相关状态处理
  }else if(status == 'snipeAutoMaxSol'){
    // 设置自由狙击最大SOL金额
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.maxSol = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击单次金额设置成功");
  }else if(status == 'snipeAutoGas'){
    // 设置自由狙击Gas费
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.gas = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
  }else if(status == 'snipeAutoLongTime'){
    // 设置自由狙击长期持有时间
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longtime = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
  }else if(status == 'snipeAutoLongBili'){
    // 设置自由狙击长期持有比例
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longbili = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
  }else if(status == 'snipeAutoLongSell'){
    // 设置自由狙击长期卖出比例
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longsell = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
  }else if(status == 'snipeAutoLongForce'){
    // 设置自由狙击强制卖出时间
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.longforce = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
  }else if(status == 'snipeAutoFastSell'){
    // 设置自由狙击快速卖出
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.fastSell = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击最快卖出间隔设置成功");
  }else if(status == 'snipeAutoMaxBuyPosition'){
    // 设置自由狙击最大买入位置
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.maxBuyPosition = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");
  }else if(status == 'snipeAutoMaxSwapPosition'){
    // 设置自由狙击最大交换位置
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var obj = await redis.get(fromId+":snipeConfig") || '';
    var setsnipe = JSON.parse(obj);
    setsnipe.maxSwapPosition = Number(text);
    await redis.set(fromId+":snipeConfig",JSON.stringify(setsnipe));
    ctx.deleteMessage();
    return await ctx.reply("✅自由狙击设置成功");

  }else if(status == 'waitFollow'){
    // 处理跟单设置
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var dbKey = 'account_addresses';
    var flKey = 'robots_banker_'+text;  // 创建跟单关系键
    var myKey = fromId+":banker";
    var addKey = 'bank:'+address+":"+text;
    var nowBanker = await redis.lrange(myKey, 0, -1);
    if (nowBanker.includes(text)) {
      await ctx.reply("该地址已经在您的跟单列表");
    }else{
      // 创建新的跟单关系
      var follower = {address,status:0,name:'',gas:0.005,addTip:10000,buyRay:0.01,buyPump:0.01,autoSell:1,buyOnce:0,holdBuy:1,jitoFee:0.0025,jitoOpen:true};
      redis.set(addKey, JSON.stringify(follower));
      redis.rpush(flKey, address || '');  // 将用户添加到庄家的跟单者列表
      redis.rpush(dbKey, text);
      redis.rpush(myKey, text);
      await redis.set(fromId+":editadd",text);
      botFun.detail_fun(fromId,text,ctx);
    }
    return ;
  }else if(status == 'setPumpSol'){
    // 设置Pump买入金额
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":editadd");
    var myaddress = await redis.get(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await redis.get(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.buyPump = Number(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address || '',ctx);
  }else if(status == 'setRaySol'){
    // 设置Raydium买入金额
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":editadd");
    var myaddress = await redis.get(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await redis.get(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.buyRay = Number(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address || '',ctx);

  //跟单参数设置相关状态处理  
  }else if(status == 'setName'){ //设置跟单名称
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":editadd");
    var myaddress = await redis.get(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await redis.get(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.name = text;
      await redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setGas'){ //设置买币GAS
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入金额错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.gas = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setGasSell'){  //设置卖币GAS
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入金额错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.gasSell = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setPumpfee'){
    // 设置Pump交易滑点
    if(Number.isNaN(parseFloat(text)) || Number(text)<1 || Number(text)>100){
      return ctx.reply("输入Pump滑点错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.pumpfee = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setRayfee'){
    // 设置Raydium交易滑点
    if(Number.isNaN(parseFloat(text)) || Number(text)<1 || Number(text)>100){
      return ctx.reply("输入Ray滑点错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.rayfee = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setMaxWin'){
    // 设置最大止盈比例
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入止盈比例错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.maxwin = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setMaxLose'){
    // 设置最大止损比例
    if(Number.isNaN(parseFloat(text))){
      return ctx.reply("输入止损比例错误");
    }
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    var addKey = 'bank:'+myaddress+":"+address;
    var addinfo = await botFun.redisGet(addKey);
    if(addinfo){
      bankinfo = JSON.parse(addinfo);
      bankinfo.maxlose = parseFloat(text);
      redis.set(addKey, JSON.stringify(bankinfo));
    }
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'addKillWin'){ //分段止盈
    // 添加分段止盈设置
    var [num,bili] = text.split(",");
    if(Number(num)<0 || Number(num)>100) return ctx.reply("输入金额错误");
    if(Number(bili)<0 || Number(bili)>100) return ctx.reply("输入比例错误");
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    await redis.rpush('bank:'+myaddress+":killwin:"+address,text);
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'addKillLose'){ //分段止损
    // 添加分段止损设置
    var [num,bili] = text.split(",");
    if(Number(num)<0 || Number(num)>100) return ctx.reply("输入金额错误");
    if(Number(bili)<0 || Number(bili)>100) return ctx.reply("输入比例错误");
    await redis.set(fromId+":status","");
    var address = await botFun.redisGet(fromId+":editadd");
    var myaddress = await botFun.redisGet(fromId+":address");
    await redis.rpush('bank:'+myaddress+":killlose:"+address,text);
    return botFun.detail_fun(fromId,address,ctx);
  }else if(status == 'setSellBili'){
    // 设置卖出比例
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
  }else if(status == 'setFastSell'){
    // 设置快速卖出模式
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
  }else if(status == 'setFollowJitoFee'){
    // 设置跟单Jito费用
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
  }else if(status == 'setRayPoolRange'){
    // 设置Raydium池子范围
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
  }else if(status == 'setPumpPoolRange'){
    // 设置Pump池子范围
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
  }else if(status == 'buyXToken'){
    // 处理自定义金额买入代币
    var amount = Number(text);    
    console.log('buyXToken',amount);
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var token = await redis.get(fromId+":nowToken");
    if(amount < 0.001){
      return ctx.reply("输入金额小于0.001\n\n请输入购买金额，输入0.1代表买入0.1SOL，输入后将立即触发买入:");
    }
    if(amount > 1){
      return ctx.reply("输入金额过大于1\n\n请输入购买金额，输入0.1代表买入0.1SOL，输入后将立即触发买入:");
    }
    var {msg,error} = await botFun.menuBuy(token,address,amount);
    if(msg) return ctx.reply("购买失败,错误原因:"+msg);
    return botFun.detail_token(ctx,address,fromId,token);
  }else if(status == 'sellXToken'){
    // 处理自定义比例卖出代币
    var amount = Number(text);     
    console.log('sellXToken',amount);
    await redis.set(fromId+":status","");
    var address = await redis.get(fromId+":address");
    var token = await redis.get(fromId+":nowToken");
    var setObj = await redis.get("setting:"+address) || '';
    var setting = JSON.parse(setObj);
    var {msg,error} = await botFun.menuSell(token,address,amount/100);
    if(error) return ctx.reply("代币信息有误");
    return botFun.detail_token(ctx,address,fromId,token);
  
  //其他
  }else{
    // 处理其他输入，尝试解析为代币地址或交易哈希
    console.log(address,text)
    try {
      text = text.replace('/','');
      new PublicKey(text);
      botFun.detail_token(ctx,address,fromId,text);
    } catch (error) {
      try {
        botFun.checkHash(text,ctx);
      } catch (error) {
        return await ctx.reply("暂不支持该内容的处理");
      }
    }
    return ;
  }
});

// 全局错误处理
bot.catch(console.error.bind(console));

// 启动机器人
run(bot);