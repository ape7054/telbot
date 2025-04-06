import { Callback, Redis } from 'ioredis';
import { Bot } from 'grammy';
import PumpSwap from './pumpSwap';
import RaydiumSwap from './raydiumSwap';
import { config, request } from './init';
import { VersionedTransactionResponse } from '@solana/web3.js';
const Decimal = require('decimal.js');
const pump = new PumpSwap();
const raydium = new RaydiumSwap();
const redis = new Redis({
  host: process.env.REDIS_HOST || config.rshost,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || config.rspwd,
  db: config.rsdb,
});
const redis2 = new Redis({
  host: process.env.REDIS_HOST || config.rshost,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || config.rspwd,
  db: config.rsdb2,
});

/**
 * Tapchain类 - Solana链上交易和跟单系统的核心实现
 *
 * 主要功能:
 * 1. 交易跟单系统
 *    - 支持Raydium和Pump两个交易所的跟单操作
 *    - 自动跟随指定交易者的操作
 *    - 支持自定义跟单参数配置
 *
 * 2. 止盈止损管理
 *    - 支持设置多个止盈止损点位
 *    - 根据价格变化自动触发交易
 *    - 分别支持Raydium和Pump的止损操作
 *
 * 3. 交易池管理
 *    - 创建和维护交易池信息
 *    - 跟踪池子状态和历史数据
 *    - 管理流动性和价格数据
 *
 * 4. 数据分析和通知
 *    - 分析交易数据和用户行为
 *    - 统计交易历史和盈亏情况
 *    - 通过Telegram发送交易通知
 *    - 管理用户配置和权限
 */
export default class Tapchain {
  /**
   * 获取历史交易记录
   * 目前为测试方法,包含了pump和raydium的测试代码
   */
  async getHistoryTx() {
    // var address = '6XDN8cMVsibMRhkSVxKotUj8Jxn5sHVPhvnMiRNPcrQY';
    // new helius().getHistory(address);
    // this.sendPumpInfo({
    //     signer:'Ac99pq1fhrSBvhNFiizEuupuuso7bZbJWifDXF2kZyHm',
    //     token:'',
    //     signature:'',
    //     number:0,
    //     associated_bonding_curve:'',
    //     poolsize:10000,
    //     bonding_curve:'',
    //     token_reserves:0,
    //     sol_reserves:0,
    //     type:'sell'
    // })
    // this.sendRayInfo({
    //     signer:'Ac99pq1fhrSBvhNFiizEuupuuso7bZbJWifDXF2kZyHm',
    //     token:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    //     signature:'5E7sBtHPyDN3jPnAs7c6rhWEHKCunQxAGMGvATU3inqrTKzA1QNi4mxsMdU1ei4THSGGzhZDbf5BR2wchq4Ck6EM',
    //     number:0,
    //     ammid:'58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    //     poolsize:100,
    //     token_reserves:0,
    //     sol_reserves:0,
    //     type:'buy'
    // })
  }

  /**
   * 获取指定地址的代币列表
   * @param address 要查询的钱包地址
   */
  async getMytokens(address: any) {
    //new request().getTokenAccountsByOwner(address)
  }

  /**
   * 处理交易失败的情况并发送通知
   * @param hash 失败交易的哈希值
   */
  async getFalseHash(hash: string) {
    // 从Redis中获取与该交易哈希相关的通知信息
    var string = await redis.get('teleNotice:' + hash);
    // 将JSON字符串解析为对象
    var info = JSON.parse(string);
    // 构建失败通知消息，包含指向Solscan的链接
    var msg = "❌上链失败！<a href='https://solscan.io/tx/" + hash + "'>点击查看hash</a>";
    // 通过Telegram机器人发送失败通知给用户
    this.sendBotMsg(msg, info.chat_id);
  }

  /**
   * 发送交易成功通知
   * @param signature 交易签名
   * @param chat_id Telegram聊天ID
   */
  async noticeok(signature: string, chat_id: number) {
    var msg =
      "✅交易执行成功！<a href='https://solscan.io/tx/" + signature + "'>点击查看hash</a>\n\n";
    this.sendBotMsg(msg, chat_id);
  }

  /**
   * 发送自定义交易通知
   * @param msg 通知消息内容
   * @param signature 交易签名
   * @param chat_id Telegram聊天ID
   */
  async notice(msg = '交易提交成功', signature: string, chat_id: number) {
    var msg =
      '✅' + msg + "！<a href='https://solscan.io/tx/" + signature + "'>点击查看hash</a>\n\n";
    this.sendBotMsg(msg, chat_id);
  }

  /**
   * 分析交易响应,判断交易类型并进行相应处理
   * @param value 交易响应对象
   */
  async analyse(value: VersionedTransactionResponse) {
    var logs = value.meta.logMessages;
    if (logs.includes('Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 success')) {
      raydium.analyse(value);
    } else if (logs.includes('Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success')) {
      pump.analyse(value);
    }
  }

  /**
   * 获取代币的交易数据统计
   * @param token 代币地址
   * @param chat_id Telegram聊天ID
   * @returns 包含交易统计信息的对象
   */
  async getTokenData(token: string, chat_id: number) {
    var trades = await redis.lrange(chat_id + ':trade:' + token, 0, -1);
    if (trades.length == 0) return { msg: '' };
    var buyall = 0,
      sellall = 0,
      feeall = 0;
    trades.forEach(item => {
      var trade = JSON.parse(item);
      if (trade.type == 'buy') {
        buyall = Number(new Decimal(buyall).add(new Decimal(trade.amount || 0)));
      }
      if (trade.type == 'sell') {
        sellall = Number(new Decimal(sellall).add(new Decimal(trade.amount || 0)));
      }
      feeall = Number(new Decimal(feeall).add(new Decimal(trade.fee || 0)));
    });
    var yingli = new Decimal(sellall).sub(new Decimal(buyall)); //.sub(new Decimal(feeall));
    var bili = new Decimal(yingli * 100).div(buyall);
    var msg = '';
    msg +=
      '💳 总买入：' + buyall + ' SOL ($' + (Number(buyall) * config.solprice).toFixed(2) + ')\n';
    msg +=
      '💰 总卖出：' + sellall + ' SOL ($' + (Number(sellall) * config.solprice).toFixed(2) + ')\n';
    msg +=
      '🎯 手续费：' + feeall + ' SOL ($' + (Number(feeall) * config.solprice).toFixed(2) + ')\n';
    msg +=
      '📣 总盈亏3：' + yingli + ' SOL ($' + (Number(yingli) * config.solprice).toFixed(2) + ')\n';
    msg += '📈 收益率：' + bili.toFixed(6) + '%\n';
    return { msg };
  }

  /**
   * 测试购买功能
   * 用于测试Raydium交易功能
   */
  async testbuy() {
    var siyao =
      '4SYUaZvMwfesxUrFnTPPZGVA9eRqUsrZXw3aLceSGFaMxPNY1wjHHBM4FSPo51UDaqwnF5JTH7Ni9K5nTB4BqE6N';
    var siyao =
      '33AxfF9QEttQ5snwEzc4xKvj7N1NKYwidFnQU2NWP79WbkuERWaZTMBVAuDc5x1ZV7BvcBdDufHd7shamTWa76vf';
    var ammid = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';
    var price = 0.0001;
    var address = 'C83GvZ1HjRht7vz3kec5nsFy1QjF2aSULrbhcj1xCYjg';
    var result: any = await this.raydiumSwap(siyao, ammid, 'buy', price);
    //await raydiumSwap.swapRaydium(siyao,ammid,'sell',1,0);

    await redis.publish('hashcheck', result.hash);
    await redis.set(
      'teleNotice:' + result.hash,
      JSON.stringify({ chat_id: 6427727037, type: 'buy', address, time: 0 }),
      'EX',
      600
    );
  }

  /**
   * 执行Pump代币的卖出操作
   * @param userid 用户ID
   * @param mintStr 代币铸造地址
   * @param lv 卖出比例
   * @param hasToken 持有代币数量
   * @param myAccountAddress 用户账户地址
   * @param bonding_curve 绑定曲线地址
   * @param associated_bonding_curve 关联绑定曲线地址
   * @returns 交易结果
   */
  async pumpSwapSell(
    userid: string,
    mintStr: string,
    lv: number,
    hasToken: number,
    myAccountAddress: string,
    bonding_curve: string,
    associated_bonding_curve: string
  ) {
    var address = await redis.get(userid + ':address');
    var setObj = (await redis.get('setting:' + address)) || '';
    var setting = JSON.parse(setObj);
    var privatekey = await redis.get('siyao:' + address);
    return await pump.swapSell(
      privatekey,
      mintStr,
      lv,
      hasToken,
      myAccountAddress,
      bonding_curve,
      associated_bonding_curve,
      setting.gas,
      setting.jito,
      setting.jitoFee
    );
  }

  /**
   * 通过菜单执行Pump代币的购买操作
   * @param userid 用户ID
   * @param mintStr 代币铸造地址
   * @param solIn 投入的SOL数量
   * @param bonding_curve 绑定曲线地址
   * @param associated_bonding_curve 关联绑定曲线地址
   * @returns 交易结果
   */
  async pumpMenuBuy(
    userid: string,
    mintStr: string,
    solIn: number,
    bonding_curve: string,
    associated_bonding_curve: string
  ) {
    var result = await pump.getBondingCurve(bonding_curve);

    return this.pumpSwapBuy(
      userid,
      mintStr,
      solIn,
      1,
      bonding_curve,
      associated_bonding_curve,
      result.virtual_token_reserves,
      result.virtual_sol_reserves
    );
  }

  /**
   * 执行Pump代币的购买操作
   * @param userid 用户ID
   * @param mintStr 代币铸造地址
   * @param solIn 投入的SOL数量
   * @param pumpfee 交易费用
   * @param bonding_curve 绑定曲线地址
   * @param associated_bonding_curve 关联绑定曲线地址
   * @param token_reserves 代币储备量
   * @param sol_reserves SOL储备量
   * @returns 交易结果
   */
  async pumpSwapBuy(
    userid: string,
    mintStr: string | null,
    solIn: number,
    pumpfee: number,
    bonding_curve: string,
    associated_bonding_curve: string,
    token_reserves: bigint,
    sol_reserves: bigint
  ) {
    var address = await redis.get(userid + ':address');
    var setObj = (await redis.get('setting:' + address)) || '';
    var setting = JSON.parse(setObj);
    var privatekey = await redis.get('siyao:' + address);
    return await pump.swapBuy(
      privatekey,
      mintStr,
      solIn,
      pumpfee,
      bonding_curve,
      associated_bonding_curve,
      token_reserves,
      sol_reserves,
      setting.gas,
      setting.jito,
      setting.jitoFee
    );
  }

  /**
   * 执行Raydium交易
   * @param userid 用户ID
   * @param poolid 交易池ID
   * @param type 交易类型(buy/sell)
   * @param number 交易数量
   * @returns 交易结果对象
   */
  async raydiumSwap(userid: string, poolid: string, type: string, number: number): Promise<Object> {
    var address = await redis.get(userid + ':address');
    var setObj = (await redis.get('setting:' + address)) || '';
    if (!setObj) return { error: '未设置参数，去设置 /set' };
    var setting = JSON.parse(setObj);
    var siyao = await redis.get('siyao:' + address);
    var model = 0;
    if (setting.fetchOpen == true && setting.jitoOpen == false) model = 1;
    if (setting.fetchOpen == false && setting.jitoOpen == true) model = 2;
    return await raydium.swapRaydium(
      siyao,
      poolid,
      type,
      number,
      setting.swapGas,
      model,
      setting.jitoFee
    );
  }

  /**
   * 执行止盈止损操作
   * @param txType 交易类型信息
   * @param sellbili 卖出比例(百分比)
   * @param address 用户地址
   * @param key Redis键
   * @param type 操作类型(raywin/raylose/pumpwin/pumplose)
   */
  async runwinlose(txType: any, sellbili: number, address: string, key: string, type: string) {
    // 从Redis获取用户配置信息
    var json = (await redis.get(key)) || '';
    var error = '',
      hash = '',
      time = 0;

    if (json) {
      // 解析用户配置
      var info = JSON.parse(json);
      // 获取用户私钥
      var siyao = await redis.get('siyao:' + address);
      // 计算实际卖出数量(百分比转小数)
      var sellAmount = Number(sellbili) / 100 || 1;

      // Raydium交易所止盈止损
      if (type == 'raywin' || type == 'raylose') {
        // 执行Raydium卖出操作
        var { error, hash, time } = await raydium.swapRaydium(
          siyao, // 私钥
          txType.ammid, // 交易池ID
          'sell', // 操作类型:卖出
          sellAmount, // 卖出数量
          info.swapGas || 0, // Gas费用
          info.jitoOpen || true, // 是否启用Jito
          info.jitoFee || 0.00025 // Jito费用
        );
      }

      // Pump交易所止盈止损
      if (type == 'pumpwin' || type == 'pumplose') {
        // 执行Pump卖出操作
        var { error, hash, time } = await pump.swapSell(
          siyao, // 私钥
          txType.token, // 代币地址
          sellAmount, // 卖出比例
          0, // 持有数量(这里为0可能需要优化)
          '', // 账户地址(空值可能需要优化)
          txType.bonding_curve, // 绑定曲线地址
          txType.associated_bonding_curve, // 关联绑定曲线地址
          info.swapGas || 0, // Gas费用
          info.jitoOpen || true, // 是否启用Jito
          info.jitoFee || 0.00025 // Jito费用
        );
      }

      // 处理执行结果
      if (error) {
        // 交易失败,记录错误日志
        console.log('失败了RAY' + type, txType, sellbili, address, key, error);
      } else {
        // 交易成功,记录执行日志
        console.log('执行了RAY' + type, txType, sellbili, address, key, hash, time);
      }
    } else {
      // 未找到用户配置信息
      console.log('没有找到信息' + type, txType, sellbili, address, key);
    }
  }

  /**
   * 处理止盈止损逻辑
   * @param txType 交易信息
   * @param type 交易类型
   */
  async killwinlose(txType: any, type: string) {
    // 获取该代币的所有止盈止损设置
    var killwinloses = await redis.lrange('killwinlose_' + txType.token, 0, -1);

    // 如果有止盈止损设置
    if (killwinloses.length > 0) {
      // 遍历每个设置
      killwinloses.forEach(async killjson => {
        // 解析设置信息
        var kill = JSON.parse(killjson);

        // 计算价格变化百分比
        var pricebili = (((txType.price - kill.price) * 100) / kill.price).toFixed(2);
        console.log('价格变化百分比', pricebili);

        // 如果价格上涨
        if (Number(pricebili) > 0) {
          // 获取止盈设置
          var killwinKey = 'killwin:' + kill.address + ':' + kill.type + ':' + kill.key;
          var killwins = await redis.lrange(killwinKey, 0, -1);

          // 检查每个止盈点位
          killwins.forEach(win => {
            var [num, bili] = win.split(',');
            // 如果达到止盈点位
            if (Number(pricebili) > Number(num)) {
              console.log('触发止盈:价格上涨' + num + '%卖出' + bili + '%');
              // 执行止盈
              if (kill.type == 'bank') {
                this.runwinlose(
                  txType,
                  Number(bili),
                  kill.address,
                  'bank:' + kill.address + ':' + kill.key,
                  type + 'win'
                );
              } else {
                this.runwinlose(
                  txType,
                  Number(bili),
                  kill.address,
                  'setting:' + kill.address,
                  type + 'win'
                );
              }
            }
          });
        } else {
          // 获取止损设置
          var killloseKey = 'killlose:' + kill.address + ':' + kill.type + ':' + kill.key;
          var killloses = await redis.lrange(killloseKey, 0, -1);

          // 检查每个止损点位
          killloses.forEach(lose => {
            var [num, bili] = lose.split(',');
            // 如果达到止损点位
            if (0 >= Number(num) + Number(pricebili)) {
              console.log('触发止损:价格下跌' + num + '%卖出' + bili + '%');
              // 执行止损
              if (kill.type == 'bank') {
                this.runwinlose(
                  txType,
                  Number(bili),
                  kill.address,
                  'bank:' + kill.address + ':' + kill.key,
                  type + 'lose'
                );
              } else {
                this.runwinlose(
                  txType,
                  Number(bili),
                  kill.address,
                  'setting:' + kill.address,
                  type + 'lose'
                );
              }
            }
          });
        }
      });
    }
  }

  /**
   * 发送Raydium交易信息并执行跟单操作
   * @param txType 交易类型信息对象,包含交易相关的参数
   * @returns 如果没有跟单者返回空字符串
   */
  async sendRayInfo(txType: any) {
    // 获取该交易签名者的所有跟单者列表
    var signers = await redis.lrange('robots_banker_' + txType.signer, 0, -1);
    if (signers.length == 0) return '';
    // 调试输出跟单者列表
    // console.log('当前跟单者列表:', signers);
    // process.exit();
    // 遍历每个跟单者
    signers.forEach(async member => {
      // 检查跟单者的跟单设置和状态
      var signer = await this.checkFollow(txType, member, 'ray');
      console.log(member, txType);

      // 构建显示用的庄家名称
      var bankname = signer.name ? txType.signer + '[' + signer.name + ']' : txType.signer;
      var now = new Date();
      // 初始化交易结果对象
      var success = { hash: '', error, address: member, signer, time: now.getTime() };

      // 如果允许跟单
      if (signer.isFollow == 1) {
        // 计算交易数量:买入使用设定金额,卖出按比例
        var swapAmount = txType.type == 'buy' ? signer.buyPump : Number(signer.sellbili) / 100 || 1;

        // 执行Raydium交易
        var { error, hash, time } = await raydium.swapRaydium(
          signer.siyao, // 私钥
          txType.ammid, // 交易池ID
          txType.type, // 交易类型(buy/sell)
          swapAmount, // 交易数量
          signer.gas, // gas费用
          signer.model, // 交易模式
          signer.fee // 手续费
        );

        console.log(error, hash, time);

        // 如果设置了通知
        if (signer.chat_id) {
          if (error) {
            // 交易失败发送错误通知
            signer.error = error;
            this.sendBotMsg(
              'Raydium跟单' + error + '\n\n庄家:' + bankname + '\n\n',
              signer.chat_id
            );
          } else {
            // 交易成功发送成功通知
            success.hash = hash;
            this.followNotice(
              '✅RAYDIUM跟单提交成功!',
              time,
              txType,
              bankname,
              signer.gas,
              signer.model,
              hash,
              signer.chat_id
            );
          }
        }
      } else {
        // 如果不允许跟单但需要通知错误
        if (signer.error && signer.geterror == 1) {
          this.sendBotMsg(
            'Raydium跟单:' + signer.error + '\n\n庄家:' + bankname + '\n\n',
            signer.chat_id
          );
        }
      }

      // 记录跟单历史
      var month = Number(now.getMonth()) + 1;
      await redis.rpush(
        'follow:raydium:' + now.getFullYear() + month + now.getDate(),
        JSON.stringify(success)
      );
    });
  }

  /**
   * 检查用户的跟单设置和状态
   * @param txType 交易类型信息对象
   * @param member 用户成员ID
   * @param type 跟单类型(pump/ray)
   * @returns 跟单配置和状态信息
   */
  async checkFollow(txType: any, member: string, type: string) {
    // 初始化跟单者配置对象
    var signer = {
      isFollow: 0, // 是否允许跟单
      name: '', // 跟单者名称
      chat_id: 0, // Telegram聊天ID
      status: 0, // 跟单状态
      hash: '', // 交易哈希
      jitoFee: 0, // Jito费用
      siyao: '', // 私钥
      geterror: 0, // 是否获取错误
      error, // 错误信息
      sellbili: 100, // 卖出比例
      buyPump: 0, // Pump买入金额
      buyRay: 0, // Ray买入金额
      autoSell: 0, // 自动卖出
      pumpPoolRange: '', // Pump池子范围
      rayPoolRange: '', // Ray池子范围
      gasSell: 0, // 卖出gas费
      buyOnce: 1, // 是否只买一次
      model: 0, // 交易模式
      gas: 0, // gas费用
      fee: 0, // 手续费
      fetchOpen: true, // 是否开启fetch
      jitoOpen: true, // 是否开启jito
    };

    // 获取用户跟单配置信息
    var info = (await redis.get('bank:' + member + ':' + txType.signer)) || '';
    if (info) {
      var isFollow = 1;
      var error = '未跟单';
      signer = JSON.parse(info);

      // 获取用户私钥和聊天ID
      var siyao = (await redis.get('siyao:' + member)) || '';
      signer.chat_id = Number(await redis.get('member:' + member)) || 0;

      // 检查私钥是否存在
      if (siyao == '') {
        error += ',无私钥';
        isFollow = 0;
      }
      signer.siyao = siyao;

      // 检查跟单状态
      if (signer.status == 0) {
        error += ',状态未开启';
        isFollow = 0;
      }

      // 检查买入金额设置
      if (type == 'pump' && signer.buyPump == 0) {
        error += ',跟买金额为0';
        isFollow = 0;
      }
      if (type == 'ray' && signer.buyRay == 0) {
        error += ',跟买金额为0';
        isFollow = 0;
      }

      // 检查自动卖出设置
      if (txType.type == 'sell' && signer.autoSell == 0) {
        error += '只跟买单';
        isFollow = 0;
      }

      // 检查池子范围限制
      if (type == 'ray' && signer.rayPoolRange) {
        var [rayVmin, rayVmax] = signer.rayPoolRange.split('-');
        if (Number(rayVmax) < txType.poolsize) {
          error += '池子超过最大范围';
          isFollow = 0;
        }
        if (Number(rayVmin) > txType.poolsize) {
          error += '池子低于最小范围';
          isFollow = 0;
        }
      }
      if (type == 'pump' && signer.pumpPoolRange) {
        var [pumpVmin, pumpVmax] = signer.pumpPoolRange.split('-');
        if (Number(pumpVmax) < txType.poolsize) {
          error += '池子超过最大范围';
          isFollow = 0;
        }
        if (Number(pumpVmin) > txType.poolsize) {
          error += '池子低于最小范围';
          isFollow = 0;
        }
      }

      // 检查是否只买一次的限制
      if (signer.buyOnce == 1) {
        var trades = await redis.lrange(signer.chat_id + ':trade:' + txType.token, 0, -1);
        if (trades.length > 0) {
          var buyNum = 0;
          trades.forEach(item => {
            var trade = JSON.parse(item);
            if (trade.type == 'buy') buyNum++;
          });
          if (buyNum > 0) {
            error += '只买一次';
            isFollow = 0;
          }
        }
      }

      // 更新跟单状态和设置
      signer.isFollow = isFollow;
      if (txType.type == 'sell') {
        signer.gas = signer.gasSell;
      }
      if (signer.fetchOpen == true && signer.jitoOpen == false) signer.model = 1;
      if (signer.fetchOpen == false && signer.jitoOpen == true) signer.model = 2;
      signer.fee = signer.jitoFee;
      signer.error = error;
    }
    return signer;
  }

  /**
   * 创建新的Pump交易池
   * @param token 代币地址
   * @param signer 签名者地址
   * @param tx 交易信息
   */
  async newPumpPool(token: string, signer: string, tx: any) {
    var now = new Date();
    const poolJson = await redis.get('pump:' + token);
    if (!poolJson) {
      await redis.rpush('pumplist', token); //用于查询最新的Pump代币列表
      await redis.set(
        'pump:' + token,
        JSON.stringify({
          signer: signer,
          signature: tx.signature,
          bonding_curve: tx.bonding_curve,
          associated_bonding_curve: tx.associated_bonding_curve,
          time: Math.floor(new Date().getTime() / 1000),
          lastime: Math.floor(new Date().getTime() / 1000),
          outime: 0,
          isout: 0,
          buy: 0,
          sell: 0,
          count: 0,
          emptyer: [],
        })
      );
    }
    //保存发币者信息
    var ifcreater = await redis.get('pool:creater:' + signer);
    if (ifcreater) {
      var creater = JSON.parse(ifcreater);
      creater.pump = Number(creater.pump) + Number(1);
      creater.lastoken = token;
      (creater.updatime = now.getTime()),
        await redis.set('pool:creater:' + signer, JSON.stringify(creater));
    } else {
      await redis.set(
        'pool:creater:' + signer,
        JSON.stringify({
          firstime: now.getTime(),
          updatime: now.getTime(),
          lastoken: token,
          raydium: 0,
          pump: 1,
        })
      );
    }
  }

  /**
   * 分析交易数据
   * @param token 代币地址
   * @param pool 交易池信息
   * @param time 当前时间戳
   */
  async analyseTradesData(token: string, pool: any, time: number) {
    var minter = pool.signer;
    var trades = await redis.lrange('pool:trades:' + token, 0, -1);
    var emptyer = pool.emptyer || [];
    var buy: number = 0,
      sell: number = 0;
    trades.forEach(tradejson => {
      var trade = JSON.parse(tradejson);
      if (trade.holdnum < 1) {
        emptyer.push(trade.signer);
      }
      if (trade.type == 'buy') buy++;
      if (trade.type == 'sell') sell++;
    });
    pool.count = Number(pool.count) + Number(trades.length);
    pool.buy = Number(pool.buy) + Number(buy);
    pool.sell = Number(pool.sell) + Number(sell);
    emptyer = Array.from(new Set(emptyer));
    if (emptyer.length == 0) return false;
    let txsigner: {
      [idx: string]: {
        sol: number;
        hold: number;
        start: number;
        end: number;
        sort: number;
        buy: number;
        sell: number;
      };
    } = {};
    trades.forEach((tradejson, sort) => {
      var trade = JSON.parse(tradejson);
      if (txsigner[trade.signer] == undefined) {
        txsigner[trade.signer] = {
          hold: Number(trade.holdnum),
          sol: Number(trade.sol),
          start: trade.slot,
          end: 0,
          sort,
          buy: trade.type == 'buy' ? 1 : 0,
          sell: trade.type == 'sell' ? 1 : 0,
        };
      } else {
        var jisuan = Number(txsigner[trade.signer].sol) + Number(trade.sol);
        txsigner[trade.signer].hold = Number(trade.holdnum);
        txsigner[trade.signer].sol = Number(jisuan.toFixed(9));
        txsigner[trade.signer].end = trade.slot;
        if (trade.type == 'buy') {
          txsigner[trade.signer].buy = Number(txsigner[trade.signer].buy) + Number(1);
        }
        if (trade.type == 'sell') {
          txsigner[trade.signer].sell = Number(txsigner[trade.signer].sell) + Number(1);
        }
      }
      if (emptyer.includes(trade.signer)) {
        redis.lrem('pool:trades:' + token, 0, tradejson);
      }
    });
    emptyer.forEach(async (address: string) => {
      try {
        var outer = txsigner[address];
        var holdtime = outer.end - outer.start;
        var realsol = Math.floor(outer.sol * 1000000000);
        if (outer.buy > 0) {
          //保存每个地址每个币的盈亏数据
          redis2.zadd(
            'analyse:signer:' + address,
            realsol,
            JSON.stringify({
              token,
              holdtime,
              buy: outer.buy,
              sell: outer.sell,
            })
          );
          if (address == minter) {
            redis2.zadd('analyse:minter', realsol, address);
          } else {
            redis2.zadd('analyse:lists', realsol, address);
          }
        }
      } catch {
        console.log('不存在');
      }
    });
    pool.emptyer = emptyer;
    //更新池子信息
    pool.outime = time;
    pool.lastime = time;
    await redis.set('pump:' + token, JSON.stringify(pool));
  }
  /**
   * 分析签名者数据(版本2)
   * @param tx 交易信息
   */
  async analyseSignerData2(tx: any) {
    if (tx.holdnum > 0 && tx.type == 'buy') {
      //console.log('analyseSignerData2',tx);
    }
  }

  /**
   * 发送Pump交易信息并执行跟单
   * @param txType 交易类型信息
   */
  async sendPumpInfo(txType: any) {
    // 获取跟随该交易者的所有跟单者列表
    var signers = await redis.lrange('robots_banker_' + txType.signer, 0, -1);
    // 如果没有跟单者则直接返回
    if (signers.length == 0) return;

    // 遍历每个跟单者
    signers.forEach(async member => {
      // 检查跟单者的跟单设置和状态
      var signer = await this.checkFollow(txType, member, 'pump');
      // 构建显示用的庄家名称
      var bankname = signer.name ? txType.signer + '[' + signer.name + ']' : txType.signer;

      // 如果允许跟单
      if (signer.isFollow == 1) {
        // 计算交易数量:买入使用设定金额,卖出按比例
        var swapAmount = txType.type == 'buy' ? signer.buyPump : Number(signer.sellbili) / 100 || 1;

        // 根据交易类型执行相应的swap操作
        // 根据交易类型执行买入或卖出操作
        var { error, hash, time } =
          txType.type == 'buy'
            ? await pump.swapBuy(
                signer.siyao, // 私钥
                txType.token, // 代币地址
                swapAmount, // 交易数量
                50, // 滑点(50 = 0.5%)
                txType.bonding_curve, // 绑定曲线地址
                txType.associated_bonding_curve, // 关联绑定曲线地址
                txType.token_reserves, // 代币储备量
                txType.sol_reserves, // SOL储备量
                signer.gas, // gas费用
                signer.model, // 交易模式
                signer.fee // 手续费
              )
            : await pump.swapSell(
                signer.siyao, // 私钥
                txType.token, // 代币地址
                swapAmount, // 卖出比例
                0, // 持有数量(0表示全部卖出)
                '', // 账户地址(空表示使用默认)
                txType.bonding_curve, // 绑定曲线地址
                txType.associated_bonding_curve, // 关联绑定曲线地址
                signer.gas, // gas费用
                signer.model, // 交易模式
                signer.fee // 手续费
              );
        // 如果设置了通知
        if (signer.chat_id) {
          if (error) {
            // 交易失败发送错误通知
            signer.error = error;
            this.sendBotMsg('PUMP跟单失败:' + error + '\n\n庄家:' + bankname, signer.chat_id);
          } else {
            // 交易成功发送成功通知
            signer.hash = hash;
            this.followNotice(
              '✅PUMP跟单提交成功!',
              time,
              txType,
              bankname,
              signer.gas,
              signer.model,
              hash,
              signer.chat_id
            );
          }
        }
      } else {
        // 如果不允许跟单但需要通知错误
        if (signer.error && signer.geterror == 1) {
          this.sendBotMsg(
            'PUMP跟单失败:' + signer.error + '\n\n庄家:' + bankname + '\n\n',
            signer.chat_id
          );
        }
      }

      // 记录跟单历史
      var now = new Date();
      var month = Number(now.getMonth()) + 1;
      await redis.rpush(
        'follow:pump:' + now.getFullYear() + month + now.getDate(),
        JSON.stringify(signer)
      );
    });
  }

  /**
   * 创建新的Raydium交易池
   * @param value 交易值信息,包含代币余额等数据
   * @param txType 交易类型信息,包含交易相关参数
   * @param atoken 代币A地址(可能是SOL或其他代币)
   * @param btoken 代币B地址(可能是SOL或其他代币)
   * @param accounts 相关账户列表
   */
  async newRayPool(value: any, txType: any, atoken: string, btoken: string, accounts: string[]) {
    // 确定交易代币地址 - 如果其中一个是WSOL,则另一个为交易代币
    if (atoken == config.wsol) txType.token = btoken;
    if (btoken == config.wsol) txType.token = atoken;
    txType.type = 'create';

    // 遍历交易后的代币余额信息
    var postTokens = value.meta.postTokenBalances;
    postTokens.forEach((val: any) => {
      // 检查是否是Raydium权限账户
      if (val.owner == config.raydium_authority) {
        if (val.mint == txType.token) {
          // 设置代币储备量和精度
          txType.token_reserves = val.uiTokenAmount.amount;
          txType.decimals = val.uiTokenAmount.decimals;
          // 如果是pump签名者,记录代币池地址
          if (txType.signer == config.pump_signer) {
            txType.token_pool = accounts[val.accountIndex];
          }
        } else {
          // 如果是pump签名者,记录SOL池地址
          if (txType.signer == config.pump_signer) {
            txType.sol_pool = accounts[val.accountIndex];
          }
          // 设置池子大小和SOL储备量
          txType.poolsize = val.uiTokenAmount.uiAmount;
          txType.sol_reserves = val.uiTokenAmount.amount;
        }
      }
    });

    // 保存交易池信息到Redis
    await redis.set('ammidByToken:' + txType.token, txType.ammid);
    await redis.set('raydium:' + txType.token, JSON.stringify(txType));

    // 如果是pump签名者创建的池子
    if (txType.signer == config.pump_signer) {
      // 获取并删除pump池信息
      var pumpJson = await redis.get('pump:' + txType.token);
      var pump = JSON.parse(pumpJson);
      await redis.del('pump:' + txType.token);

      if (pump) {
        // 获取发币者地址
        var minter = pump.signer || pump.traderPublicKey;
        // 更新或创建发币者信息
        var ifcreater = await redis.get('pool:creater:' + minter);
        if (ifcreater) {
          var creater = JSON.parse(ifcreater);
          creater.token = Number(creater.token) + Number(1);
          await redis.set('pool:creater:' + minter, JSON.stringify(creater));
        } else {
          var now = new Date();
          await redis.set(
            'pool:creater:' + minter,
            JSON.stringify({
              regtime: now.getTime(),
              tokens: 1,
            })
          );
        }
        // 添加发币者到列表
        await redis.rpush('pool:minter', minter);
      }
      // 记录pump转raydium的池子信息
      await redis.rpush('pool:pump:raydium', JSON.stringify(txType));
      //console.log('pump转raydium',txType);
    } else {
      //console.log('raydium新池子',txType);
    }
  }

  async pumpSnipeBuy(userid: string | number, address: string, data: any, snipe: any) {
    var privatekey = await redis.get('siyao:' + address);
    console.log(address, '参与了狙击', userid);
    console.log(snipe, data);
    var result: any = await pump.swapBuy(
      privatekey,
      data.mint,
      snipe.maxSol,
      snipe.snipeSlippage,
      data.bondingCurveKey,
      data.associated_bonding_curve,
      data.token_reserves,
      data.sol_reserves,
      snipe.gas,
      2,
      0.0025
    );
    pump.telegramAuto(result.hash, 'buy', data.mint, address, snipe.gas);
  }

  async pumpSnipeSell(userid: string | number, address: string, data: any, snipe: any) {
    var privatekey = await redis.get('siyao:' + address);
    console.log(address, '结束了狙击', userid);
    console.log(snipe, data);
    var myAccountAddress = await redis.get('associated:' + data.mint + ':' + address);
    var result: any = await pump.swapSell(
      privatekey,
      data.mint,
      1,
      Number(data.hastoken),
      myAccountAddress,
      data.bonding_curve,
      data.associated_bonding_curve,
      snipe.gas,
      2,
      0.0025
    );
    pump.telegramAuto(result.hash, 'sell', data.mint, address, snipe.gas);
  }

  /**
   * 发送跟单通知消息
   * @param msg 基础消息内容
   * @param time 交易时间戳
   * @param txType 交易类型信息
   * @param bankname 庄家名称
   * @param gas gas费用
   * @param model 交易模式(1:普通 2:Jito)
   * @param hash 交易哈希
   * @param chat_id Telegram聊天ID
   */
  async followNotice(
    msg: string,
    time: number,
    txType: any,
    bankname: String,
    gas: number,
    model: number,
    hash: string,
    chat_id: number
  ) {
    // 生成随机延迟时间(500-1000ms)
    var chatime = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
    // 转换时间戳为日期对象
    let bdate = new Date(time * 1000);

    // 构建通知消息内容
    msg +=
      '\n' +
      '\n交易地址：' +
      txType.signature +
      '\n庄家地址:' +
      bankname +
      '\n代币地址：' +
      txType.token +
      '\n' +
      '\n反应时差：' +
      chatime +
      'ms' +
      '\nGas费：' +
      gas +
      'sol' +
      '\n提交时间：' +
      bdate.getHours() +
      ':' +
      bdate.getMinutes() +
      ':' +
      bdate.getSeconds();

    // 根据交易模式添加不同的哈希信息
    if (model == 2) {
      // Jito交易直接显示哈希
      msg += '\nJito交易：' + hash + '\n';
    } else {
      // 普通交易需要额外处理
      msg += '\n提交Hash：' + hash + '\n';
      // 发布哈希检查事件
      await redis.publish('hashcheck', hash);
      // 缓存交易通知信息(10分钟过期)
      await redis.set(
        'teleNotice:' + hash,
        JSON.stringify({
          chat_id,
          type: 'follow' + txType.type,
          bank: txType.signer,
          time,
        }),
        'EX',
        600
      );
    }
    // 发送通知消息
    this.sendBotMsg(msg, chat_id);
  }

  /**
   * 发送Telegram机器人消息
   * @param msg 消息内容
   * @param userid 用户ID
   */
  async sendBotMsg(msg: string, userid: number) {
    const bot = new Bot(config.botapi);
    try {
      // 发送HTML格式的消息
      await bot.api.sendMessage(userid, msg, { parse_mode: 'HTML' });
    } catch {
      console.log('发送Telegram消息失败');
    }
  }

  /**
   * 计算买入滑点
   * @param amount 基础数量
   * @param basisPoints 基点数(1bp=0.01%)
   * @returns 计算后的数量
   */
  calculateWithSlippageBuy = (amount: bigint, basisPoints: bigint) => {
    return amount + (amount * basisPoints) / 10000n;
  };
}
