import {
  followMenu,
  flowMenu,
  tokenMenu,
  snipeDetailMenu,
  settingMenu,
  snipeMenu,
  snipeAutoMenu,
  noUserMenu,
  tokensMenu,
  analyseTokenMenu,
} from './menu';
import { PublicKey, Connection, VersionedTransactionResponse } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk';
import { Redis } from 'ioredis';
import { config, request } from './init';
import Tapchain from '../services/tapchain/tapchain0';

// 初始化 Solana 连接
const solana = new Connection(config.RPC_URL, {
  wsEndpoint: config.WSS_URL,
  commitment: 'confirmed',
  disableRetryOnRateLimit: true,
});

// 导入第三方依赖
const axios = require('axios');
const Decimal = require('decimal.js');

// 初始化 Tapchain 实例
const tapchain = new Tapchain();

// 初始化 Redis 连接
const redis = new Redis({
  host: process.env.REDIS_HOST || config.rshost,
  port: parseInt('6379'),
  password: process.env.REDIS_PASSWORD || config.rspwd,
  db: config.rsdb,
});
export default class BotFun {
  async checkHash(hash: string, ctx: any) {
    var value: VersionedTransactionResponse;
    try {
      value = await solana.getTransaction(hash, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });
    } catch {
      hash = hash.replace('/', '');
      var newuser = await redis.get(hash + ':admin');
      if (newuser) {
        await redis.set(hash + ':address', newuser);
        await redis.del(hash + ':admin');
        await redis.set(hash + ':status', '');
        await redis.rpush('member_address', newuser);
        await ctx.api.sendMessage(hash, '功能开通成功' + newuser);
        return await ctx.reply('开通成功');
      } else {
        return await ctx.reply('暂不支持该内容的处理');
      }
    }
    tapchain.analyse(value);
  }

  /*
   * 处理交易
   */
  async menuSell(token: string, userid: string, amount: number) {
    var ammid = (await redis.get('ammidByToken:' + token)) || '';
    var address = await redis.get(userid + ':address');
    var hash = '',
      msg = '',
      time = 0,
      bundle = '';
    if (ammid) {
      const result: any = await tapchain.raydiumSwap(userid, ammid, 'sell', amount);
      if (result.error) return { msg, error: '卖失败:' + result.error };
      bundle = result.bundle;
      hash = result.hash;
      time = result.time;
    } else {
      var redisInfo = (await redis.get('pump:' + token)) || '';
      if (redisInfo) {
        var pump = JSON.parse(redisInfo);
        var bonding_curve = pump.bondingCurveKey || pump.bonding_curve;
        var associated_bonding_curve = pump.associated_bonding_curve;
        var result: any = await tapchain.pumpSwapSell(
          userid,
          token,
          amount,
          0,
          '',
          bonding_curve,
          associated_bonding_curve
        );
        if (result.error) return { msg, error: '卖失败:' + result.error };
        hash = result.hash;
        msg = result.error;
        time = result.time;
      } else {
        return { msg, error: '代币交易参数缺失' };
      }
    }
    await redis.rpush(
      'botbuysell',
      JSON.stringify({ address, time, bundle, hash, type: 'sell', amount })
    );
    if (hash) {
      msg = "✅卖出请求发送成功！<a href='https://solscan.io/tx/" + hash + "'>点击查看Hash</a>\n\n";
      await redis.publish('hashcheck', hash);
      await redis.set(
        'teleNotice:' + hash,
        JSON.stringify({ chat_id: userid, type: 'buy', address, time }),
        'EX',
        600
      );
    }
    if (bundle)
      msg =
        "✅卖出请求发送成功！<a href='https://explorer.jito.wtf/bundle/" +
        bundle +
        "'>点击查看Jito</a>\n\n";
    return { msg, error: '' };
  }

  async menuBuy(token: string, userid: string, amount: number) {
    console.log('menuBuy', token, userid, amount);
    var ammid = await redis.get('ammidByToken:' + token);
    var address = await redis.get(userid + ':address');
    var msg = '',
      hash = '',
      time = 0,
      bundle = '';
    if (ammid) {
      const swapRaydium: any = await tapchain.raydiumSwap(userid, ammid, 'buy', amount);
      if (swapRaydium.error) {
        return { hash: '', msg: '' + swapRaydium.error };
      } else {
        hash = swapRaydium.hash;
        time = swapRaydium.time;
        bundle = swapRaydium.bundle;
      }
    } else {
      if (amount == 0) return { msg, error: '金额错误' };
      var pumpRes = await redis.get('pump:' + token);
      if (pumpRes) {
        var pumpJson = JSON.parse(pumpRes);
        console.log('pumpJson', pumpJson);
        var bonding_curve = pumpJson.bonding_curve || pumpJson.bondingCurveKey || '';
        var associated_bonding_curve = pumpJson.associated_bonding_curve;
        if (bonding_curve == '') return { msg, error: '代币池子参数缺失' };
        var result: any = await tapchain.pumpMenuBuy(
          userid,
          token,
          amount,
          bonding_curve,
          associated_bonding_curve
        );
        console.log(result);
        if (result.error) {
          return { msg, error: '' + result.error };
        } else {
          hash = result.hash;
          time = result.time;
          bundle = result.bundle;
        }
      } else {
        return { msg, error: '代币交易参数缺失' };
      }
    }
    await redis.rpush(
      'botbuysell',
      JSON.stringify({ address, time, bundle, hash, type: 'buy', amount })
    );
    if (hash) {
      msg = "✅购买请求发送成功！<a href='https://solscan.io/tx/" + hash + "'>点击查看Hash</a>\n\n";
      await redis.publish('hashcheck', hash);
      await redis.set(
        'teleNotice:' + hash,
        JSON.stringify({ chat_id: userid, type: 'buy', address, time }),
        'EX',
        600
      );
    }
    if (bundle)
      msg =
        "✅购买请求发送成功！<a href='https://explorer.jito.wtf/bundle/" +
        bundle +
        "'>点击查看Jito</a>\n\n";
    return { msg, error: '' };
  }

  async mySetting(ctx: any, fromId: number) {
    var address = (await redis.get(fromId + ':address')) || '';
    if (address == '') return ctx.reply('未绑定钱包，快快点击绑定！', { reply_markup: noUserMenu });
    var obj = (await redis.get('setting:' + address)) || '';
    var setting = {
      fetchOpen: true,
      jitoOpen: false,
      swapGas: 0.001,
      swapSlippage: 100,
      holdBuy: 1,
      jitoFee: 0.0025,
    };
    if (obj) {
      setting = JSON.parse(obj);
    } else {
      await redis.set('setting:' + address, JSON.stringify(setting));
    }
    try {
      var balance = await solana.getBalance(new PublicKey(address));
      balance = new Decimal(balance).div(new Decimal(10 ** 9), 6);
      var msg =
        '钱包：' +
        address +
        '\n\n' +
        '钱包余额：' +
        balance.toFixed(4) +
        'SOL\n\n' +
        '🟢交易优先费：' +
        setting.swapGas +
        'SOL\n' +
        '🟢交易滑点：' +
        setting.swapSlippage +
        '%\n' +
        '🟢贿赂消费：' +
        setting.jitoFee +
        '%\n';
      ctx.reply(msg, { reply_markup: settingMenu });
    } catch (error) {
      console.log(setting);
      return ctx.reply('钱包异常');
    }
  }

  async snipeAuto(ctx: any, fromId: number) {
    var address = (await redis.get(fromId + ':address')) || '';
    if (address == '') return ctx.reply('未绑定钱包，快快点击绑定！', { reply_markup: noUserMenu });
    var balance = await solana.getBalance(new PublicKey(address));
    balance = new Decimal(balance).div(new Decimal(10 ** 9), 6);
    var msg = '钱包：' + address + '\n\n钱包余额：' + balance.toFixed(4) + 'SOL\n\n';
    try {
      var obj = (await redis.get(fromId + ':snipeConfig')) || '';
      console.log(obj);
      var setting = JSON.parse(obj);
      msg =
        msg +
        '🟢Gas费' +
        setting.gas +
        'SOL\n' +
        '🟢单次狙击金额：' +
        setting.maxSol +
        'SOL\n' +
        '位置模式\n' +
        '🔫最高买入位置：' +
        setting.maxBuyPosition +
        '位\n' +
        '🔫交易笔数最大值：' +
        setting.maxSwapPosition +
        '笔\n' +
        '🔫最少夹几笔买单：' +
        setting.fastSell +
        '笔\n' +
        '时间模式\n' +
        '🔫买入后' +
        setting.longtime +
        '秒涨幅目标' +
        setting.longbili +
        '%\n' +
        '🔫达成目标后卖出' +
        setting.longsell +
        '%\n' +
        '🔫买入后持续' +
        setting.longforce +
        '秒强制清仓';
    } catch (error) {
      var saveSet = {
        longtime: 5,
        longbili: 100,
        longsell: 100,
        longforce: 10,
        maxSol: 0.1,
        fastSell: 0,
        maxBuyPosition: 2,
        maxSwapPosition: 8,
        status: 0,
        gas: 0.001,
      };
      await redis.set(fromId + ':snipeConfig', JSON.stringify(saveSet));
      msg =
        msg +
        '🟢Gas费' +
        saveSet.gas +
        'SOL\n' +
        '🟢单次狙击金额：' +
        saveSet.maxSol +
        'SOL\n' +
        '位置模式\n' +
        '🔫最高买入位置：' +
        saveSet.maxBuyPosition +
        '位\n' +
        '🔫交易笔数最大值：' +
        saveSet.maxSwapPosition +
        '笔\n' +
        '🔫最少夹几笔买单：' +
        saveSet.fastSell +
        '笔\n' +
        '时间模式\n' +
        '🔫买入后' +
        saveSet.longtime +
        '秒涨幅目标' +
        saveSet.longbili +
        '%\n' +
        '🔫达成目标后卖出' +
        saveSet.longsell +
        '%\n' +
        '🔫买入后持续' +
        saveSet.longforce +
        '秒强制清仓';
    }
    ctx.reply(msg, { reply_markup: snipeAutoMenu });
  }

  async snipeMain(ctx: any, fromId: number) {
    var address = await redis.get(fromId + ':address');
    var snipeKey = fromId + ':snipe';
    var snipes = await redis.lrange(snipeKey, 0, -1);
    if (snipes.length == 0) return await ctx.reply('暂无狙击任务');
    var msg = '进行中的狙击任务：' + snipes.length + '\n';
    msg = msg + '项目名称  狙击金额   距开盘时间\n';
    for (let i = 1; i < snipes.length + 1; i++) {
      const token = snipes[i - 1];
      var obj = await redis.get('snipe:' + address + ':' + token);
      if (obj) {
        try {
          var info = JSON.parse(obj);
          msg =
            msg + i + '. ' + token.slice(0, 5) + '         ' + info.amount + 'SOL            --\n';
        } catch (error) {}
      }
    }
    await ctx.reply(msg, { reply_markup: snipeMenu });
  }

  async getMytokens(address: string) {
    var tokens: { mint: string; amount: string }[] = [];
    var result = await solana.getTokenAccountsByOwner(new PublicKey(address), {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    result.value.forEach((item: any) => {
      var accountInfo = SPL_ACCOUNT_LAYOUT.decode(item.account.data);

      tokens.push({
        mint: accountInfo?.mint.toString(),
        amount: new Decimal(accountInfo.amount.toString()),
      });
    });
    return tokens;
  }

  async menutokens(ctx: any, fromId: number) {
    var address = (await redis.get(fromId + ':address')) || '';
    if (address == '') return ctx.reply('未绑定钱包，快快点击绑定！', { reply_markup: noUserMenu });
    await ctx.api.sendMessage(fromId, '⏱️ 持仓列表获取中..');
    return ctx.reply('代币列表', { reply_markup: tokensMenu });
  }

  /**
   * 获取跟单钱包列表及状态
   * @param ctx - Telegram上下文
   * @param fromId - 用户ID
   */
  async follow_fun(ctx: any, fromId: number) {
    // 获取用户钱包地址
    const address = (await redis.get(fromId + ':address')) || '';
    // 输出用户钱包地址
    if (address === '') {
      return ctx.reply('未绑定钱包，快快点击绑定！', { reply_markup: noUserMenu });
    }
    // 获取跟单钱包列表
    const myKey = fromId + ':banker';
    const followNum = await redis.llen(myKey);
    let msg = `钱包：${address}\n\n跟单钱包数：${followNum}\n\n`;

    // 遍历获取所有跟单钱包信息
    const nowBanker = await redis.lrange(myKey, 0, -1);
    for (let i = 0; i < nowBanker.length; i++) {
      // 获取当前跟单钱包地址
      const bankerAddress = nowBanker[i];
      // 获取跟单钱包配置信息
      const addinfo = await redis.get(`bank:${address}:${bankerAddress}`);
      
      if (addinfo) {
        // 解析钱包配置
        const info = JSON.parse(addinfo);
        // 获取钱包地址前5位作为简称
        const shortAddress = bankerAddress.slice(0, 5);
        
        // 根据状态生成对应emoji
        const statusEmoji = info.status == 1 ? ' 🟢已开启' : ' 🔴已暂停';
        const autoSellEmoji = info.autoSell == 1 ? '✅' : '❌';
        
        // 拼接钱包信息到消息
        msg += `#${i + 1}\n钱包名称: ${shortAddress}`;
        msg += `${statusEmoji} （买✅ 卖${autoSellEmoji}）\n`; 
        msg += `${bankerAddress}\n`;
      }
    }

    ctx.reply(msg, { reply_markup: followMenu });
  }

  async redisGet(key: any): Promise<string> {
    return (await redis.get(key)) || '';
  }

/**
 * 获取跟单钱包详情
 * @param fromId - 用户ID
 * @param text - 钱包地址
 * @param ctx - Telegram上下文
 */
async detail_fun(fromId: number, text: string, ctx: any) {
    // 构建基础消息
    var msg = '钱包地址：\n' + text + '\n\n';

    // 获取用户钱包地址
    var myaddress = await redis.get(fromId + ':address');
    
    // 构建Redis键值
    var addKey = 'bank:' + myaddress + ':' + text;
    
    // 保存当前菜单银行信息
    await redis.set(fromId + ':menuBank', text);

    // 获取钱包配置信息
    var addinfo = await redis.get(addKey);
    if (addinfo) {
      var info = JSON.parse(addinfo);
      if (info) {
        // 添加钱包基本信息
        msg += '钱包名称：' + info.name + '\n';
        msg += 'Raydium跟单金额：' + info.buyRay + ' sol\n';
        msg += 'Pump跟单金额：' + info.buyPump + ' sol\n';

        // 添加Raydium池子范围信息
        if (info.rayPoolRange) {
          var [rayVmin, rayVmax] = info.rayPoolRange.split('-');
          msg += 'Raydium跟单池子范围：' + rayVmin + ' - ' + rayVmax + ' sol\n';
        }

        // 添加Pump池子范围信息
        if (info.pumpPoolRange) {
          var [pumpVmin, pumpVmax] = info.pumpPoolRange.split('-');
          msg += 'Pump跟单池子范围：' + pumpVmin + ' - ' + pumpVmax + ' sol\n';
        }
      }
    }

    // 添加说明信息
    msg += '\n说明：\n- 发送 /follow 即可管理跟单钱包，新增功能止盈止损的分段设置功能、池子区间范围功能\n';
    
    // 发送消息
    await ctx.reply(msg, { reply_markup: flowMenu });
}
  
  /**
   * 通过Moralis API获取代币信息
   * @param token - 代币地址
   * @returns 代币基本信息,包含名称、精度、符号、更新权限地址
   */
  async tokeninfoByMoralis(token: string) {
    const client = axios.create({
      headers: {
        accept: 'application/json',
        'X-API-Key':
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjNmZWY5ZTVhLTY1OWYtNDJiMy1iYjZmLTNkNmZhNTg2NmEwYiIsIm9yZ0lkIjoiNDA3Mzc1IiwidXNlcklkIjoiNDE4NjAzIiwidHlwZUlkIjoiYjU4OTUzZDQtNjYyMC00YjNlLTg2MDAtOTQ4MjJhYjZjNjA3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MjU2MzYyMTcsImV4cCI6NDg4MTM5NjIxN30.WfZunxl2PYN4oLB8GYQEpbcIKc_hXHegHnEt1AAmxDM',
      },
    });
    try {
      const respssonse = await client.get(
        'https://solana-gateway.moralis.io/token/mainnet/' + token + '/metadata'
      );
      if (respssonse.status == 200) {
        const metadata = respssonse.data;
        metadata.updateAuthority = metadata.metaplex.updateAuthority;
        await redis.set('moralis:' + token, JSON.stringify(metadata));
        var decimals = Number(metadata.decimals);
        return {
          name: metadata.name,
          decimals,
          symbol: metadata.symbol,
          updateAuthority: metadata.updateAuthority,
        };
      }
    } catch {
      return { name: '', decimals: 0, symbol: '', updateAuthority: '' };
    }
  }
  async detail_token(ctx: any, address: string | null, fromId: number, token: string | null) {
    console.log('token', token);
    if (address == null || token == null || token == '' || token == 'snipe') return '';
    var ispump = 0;
    var poolSol = 0;
    var openRay = 0; //是否已经有了RAY池子
    var replyMsg = '';
    var symbol = '';
    var decimals = 6;
    var pump = (await redis.get('pump:' + token)) || '';
    var raydium = (await redis.get('raydium:' + token)) || '';
    var moralis = (await redis.get('moralis:' + token)) || '';
    var moralisData: any;
    if (!moralis) {
      moralisData = await this.tokeninfoByMoralis(token);
    } else {
      moralisData = JSON.parse(moralis);
    }
    //console.log(moralisData,pump,raydium);
    if (moralisData.symbol) {
      symbol = moralisData.symbol;
      decimals = Number(moralisData.decimals);
      replyMsg = '📌' + moralisData.symbol + '\n\n';
      if (moralisData.updateAuthority == 'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM') {
        replyMsg = '📌' + moralisData.symbol + '(Pump)\n\n';
        ispump = 1;
      }
      await redis.set(fromId + ':nowTokenSymbol', moralisData.symbol);
    } else {
      if (!pump && !raydium) {
        var hassol = await solana.getBalance(new PublicKey(token));
        if (hassol > 0) {
          return await ctx.reply('钱包地址：' + token, { reply_markup: analyseTokenMenu });
        } else {
          return await ctx.reply('代币信息错误');
        }
      } else {
        replyMsg = '📌Token(Pump)\n\n';
        if (ispump == 0) ispump = 1;
        await redis.set(fromId + ':nowTokenSymbol', 'Token');
      }
    }
    replyMsg += '⚡️代币地址：\n' + token + '\n\n';

    var bonding_curve = '';
    var associated_bonding_curve = '';
    var poolsize = 0;
    if (pump) {
      var pumpJson = JSON.parse(pump);
      if (pumpJson) {
        if (ispump == 0) ispump = 1;
        console.log('存在API的redis 缓存', pumpJson);
        bonding_curve = pumpJson.bonding_curve || '';
        associated_bonding_curve = pumpJson.associated_bonding_curve;
        if (bonding_curve) {
          var poolsize = await solana.getBalance(new PublicKey(bonding_curve));
          poolsize = new Decimal(poolsize).div(10 ** 9).toFixed(4);
          replyMsg += '🏧Pump池子大小:' + poolsize + ' SOL\n\n';
        }
      }
    }
    const mint = new PublicKey(token);
    var MyTokenAddress = getAssociatedTokenAddressSync(mint, new PublicKey(address));
    var tokenBalance = 0;
    if (MyTokenAddress) {
      var account = await solana.getAccountInfo(MyTokenAddress);
      if (account) {
        var accountInfo = SPL_ACCOUNT_LAYOUT.decode(account.data);
        tokenBalance = new Decimal(accountInfo.amount.toString())
          .div(10 ** decimals)
          .toFixed(decimals);
        replyMsg += '💳持币数量:' + tokenBalance + ' ' + symbol + '\n\n';
        if (associated_bonding_curve) {
          var accountTotal = await solana.getAccountInfo(new PublicKey(associated_bonding_curve));
          if (accountTotal) {
            var accountInfo2 = SPL_ACCOUNT_LAYOUT.decode(accountTotal.data);
            var totalToken = new Decimal(accountInfo2.amount.toString())
              .div(10 ** decimals)
              .toFixed(decimals);
            var jiazhi = ((poolsize * tokenBalance * 100) / totalToken).toFixed(9);
            replyMsg += '💰持仓价值:' + jiazhi + ' SOL\n\n';
          }
        }
      }
    }
    if (raydium) {
      openRay = 1;
      var rayinfo = JSON.parse(raydium);
      console.log(rayinfo);
      if (rayinfo.sol_pool) {
        var sol_reserves = await solana.getBalance(new PublicKey(rayinfo.sol_pool));
        if (sol_reserves > 0) {
          replyMsg += '🏧 Raydium池子大小: ' + (sol_reserves / 1000000000).toFixed(9) + ' SOL\n';
        }
      }
      if (rayinfo.sol_pool && rayinfo.token_pool) {
        var accountTokenpool = await solana.getAccountInfo(new PublicKey(rayinfo.token_pool));
        if (accountTokenpool) {
          var accountInfo = SPL_ACCOUNT_LAYOUT.decode(accountTokenpool.data);
          var token_reserves = new Decimal(accountInfo.amount.toString());
          decimals = rayinfo.decimals || 6;
          //replyMsg += "📟 Raydium池子代币: "+(token_reserves/10**decimals).toFixed(decimals)+" TOKEN\n";
          var price = new Decimal(sol_reserves).div(10 ** (9 - decimals)).div(token_reserves);
          replyMsg += '🔔 币价: ' + price.toFixed(15) + ' SOL\n';
          replyMsg += '🔔 币价: $' + (price * config.solprice).toFixed(15) + '\n\n';
        }
      } else {
        replyMsg += '\n无币价参数';
      }
    } else {
      const response = await axios.get(
        'https://api-v3.raydium.io/pools/info/mint?mint2=So11111111111111111111111111111111111111112&poolType=standard&poolSortField=liquidity&sortType=desc&pageSize=1&page=1&mint1=' +
          token
      );
      if (response.data.data.count == 1) {
        var poolToken = 0;
        var msg = response.data.data.data[0];
        await redis.set('ammidByToken:' + token, msg.id);
        if (msg.mintA.address == token) {
          poolSol = msg.mintAmountB;
          poolToken = msg.mintAmountA;
        } else {
          poolSol = msg.mintAmountA;
          poolToken = msg.mintAmountB;
        }
        if (msg.lpMint.symbol) {
          replyMsg += '📝 池子名称: ' + msg.lpMint.symbol + '\n';
        }
        if (poolSol > 0) {
          replyMsg += '🏧 Raydium池子大小: ' + poolSol + ' SOL\n';
        }
        if (poolToken > 0) {
          var jiazhi = ((poolSol * tokenBalance) / poolToken).toFixed(6);
          replyMsg += '💰 持仓价值: ' + jiazhi + ' SOL\n\n';
        }
      }
    }
    var analyse = await this.getTokenAnalyse(token);
    if (analyse.length > 0) {
      replyMsg += '分析数据\n';
      analyse.forEach((item: any) => {
        replyMsg += item.member + ' 盈利：' + item.score.toFixed(4) + ' SOL\n';
      });
    }
    var tokenData = await this.getTokenData(token, fromId);
    if (tokenData.msg !== '') {
      replyMsg = replyMsg + tokenData.msg;
    }
    await redis.set(fromId + ':nowToken', token);
    await redis.set(fromId + ':nowTokenType', openRay);
    await ctx.reply(replyMsg, { reply_markup: tokenMenu });
  }

  async getTokenAnalyse(token: string): Promise<object[]> {
    const members = await redis.zrevrange('token:analyse:' + token, 0, -1, 'WITHSCORES'); // 0 表示开始索引，-1 表示结束索引，即获取所有成员
    const formattedMembers = members.reduce(
      (acc, curr, index, arr) => {
        if (index % 2 === 0) {
          // 偶数索引是成员
          acc.push({ member: curr, score: new Decimal(arr[index + 1]).div(10 ** 9) });
        }
        return acc;
      },
      [] as { member: string; score: number }[]
    );
    return formattedMembers;
  }

  async getTokenData(token: string, chat_id: number) {
    var trades = await redis.lrange(chat_id + ':trade:' + token, 0, -1);
    if (trades.length == 0) return { msg: '' };
    var buyall = 0,
      sellall = 0,
      feeall = 0;
    trades.forEach(item => {
      var trade = JSON.parse(item);
      if (trade.type == 'buy') {
        buyall = new Decimal(buyall).add(new Decimal(trade.amount || 0));
      }
      if (trade.type == 'sell') {
        sellall = new Decimal(sellall).add(new Decimal(trade.amount || 0));
      }
      feeall = new Decimal(feeall).add(new Decimal(trade.fee || 0));
    });
    var yingli = Number(new Decimal(sellall).sub(new Decimal(buyall))); //.sub(new Decimal(feeall));
    var bili = new Decimal(yingli * 100).div(buyall);
    var msg = '';
    msg +=
      '💳 总买入：' + buyall + ' SOL ($' + (Number(buyall) * config.solprice).toFixed(2) + ')\n';
    msg +=
      '💰 总卖出：' + sellall + ' SOL ($' + (Number(sellall) * config.solprice).toFixed(2) + ')\n';
    msg +=
      '🎯 手续费：' + feeall + ' SOL ($' + (Number(feeall) * config.solprice).toFixed(2) + ')\n';
    msg +=
      '📣 总盈1亏：' +
      yingli.toFixed(9) +
      ' SOL ($' +
      (Number(yingli) * config.solprice).toFixed(2) +
      ')\n';
    msg += '📈 收益率：' + bili.toFixed(6) + '%\n';
    return { msg };
  }

  getAddressFromMsg(ctx: any, index: number) {
    if (index == -1) console.log(ctx);
    var token = '';
    var inputString = ctx.update.callback_query?.message?.text;
    var fromId = ctx.update.callback_query?.from.id || ctx.update.message?.from.id;
    if (inputString != undefined) {
      const lines = inputString.split('\n');
      if (lines.length == 0) {
        console.log(inputString);
      } else {
        try {
          token = lines[index].trim();
        } catch (error) {
          //console.log(lines,index);
        }
      }
    }
    if (token == '') token = ctx.update.message?.text;
    return { fromId, token };
  }
  //删除跟单
  async delBank(
    fromId: number | undefined,
    editadd: string,
    ctx: { reply: (arg0: string) => void }
  ) {
    var address = (await redis.get(fromId + ':address')) || '';
    console.log(fromId, address, editadd);
    if (address && editadd) {
      await redis.del(fromId + ':editadd');
      redis.lrem('robots_banker_' + editadd, 0, address);
      redis.lrem(fromId + ':banker', 0, editadd);
      redis.del('bank:' + address + ':' + editadd);
      ctx.reply('成功删除' + editadd);
    }
  }

  //增加狙击
  async addSnipe(ctx: any, token: string, fromId: number, amount: number) {
    var snipeKey = fromId + ':snipe';
    var address = await redis.get(fromId + ':address');
    if (address == null || token == '') return '';
    var snipes = await redis.lrange(snipeKey, 0, -1);
    var save = { amount, status: 0, gas: 0.0001 };
    if (snipes.includes(token)) {
      var obj = await redis.get('snipe:' + address + ':' + token);
      if (obj) {
        save = JSON.parse(obj);
        save.amount = amount;
      }
    } else {
      redis.rpush(snipeKey, token);
    }
    redis.set('snipe:' + address + ':' + token, JSON.stringify(save));
    this.snipeDetail(ctx, token, fromId, address);
  }
  //狙击详情
  async snipeDetail(ctx: any, token: string, fromId: number, address: string) {
    var obj = await redis.get('snipe:' + address + ':' + token);
    if (obj == null) return '';
    var balance = await solana.getBalance(new PublicKey(address));
    balance = new Decimal(balance).div(new Decimal(10 ** 9), 6);
    var info = JSON.parse(obj);
    var add = balance < 0.15 ? ' （⚠️余额较低，建议不低于0.15 SOL，否则可能狙击失败）' : '';
    var status = info.status == 1 ? '🟢未开始交易🟢' : '🔴未开始交易🔴';
    var msg =
      '📌' +
      token.slice(0, 5) +
      '狙击设置成功\n' +
      '' +
      token +
      '\n' +
      '💡 状态：' +
      status +
      '\n' +
      '🔫 狙击金额：' +
      info.amount +
      ' SOL\n' +
      '💵 狙击优先费：' +
      info.snipeGas +
      ' SOL\n' +
      '💰 钱包余额：' +
      balance +
      ' SOL' +
      add +
      '\n' +
      '当监测到代币添加raydium LP，会自动发起狙击买入\n' +
      '你可以在设置中调整狙击优先费，从而提高速度与成功率';
    await ctx.reply(msg, { reply_markup: snipeDetailMenu });
  }
}
