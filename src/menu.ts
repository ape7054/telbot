/**
 * Telegram 交易机器人菜单系统
 * 实现各种交易功能的菜单界面和交互逻辑
 */
import { Menu, MenuRange } from '@grammyjs/menu';
import { Redis } from 'ioredis';
import BotFun from './fun';
import Decimal from 'decimal.js';
import { config } from './init';

// 初始化 Redis 连接
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

// 添加Redis连接事件监听
redis.on('connect', () => {
  console.log('Menu Redis 正在连接...');
});

redis.on('ready', () => {
  console.log('✅ Menu Redis连接成功，已就绪');
});

redis.on('error', (err) => {
  console.error('❌ Menu Redis连接错误：', err);
});

redis.on('close', () => {
  console.warn('⚠️ Menu Redis连接已关闭');
});
/**
 * 资产菜单 - 显示用户持有的代币列表
 * 支持查看代币详情和快速清仓操作
 */
const tokensMenu = new Menu('tokens-menu').dynamic(async (ctx: any) => {
  const botFun = new BotFun();
  var res = botFun.getAddressFromMsg(ctx, 1);
  var address = (await redis.get(res.fromId + ':address')) || '';
  // 获取用户持有的代币列表
  var tokens = await botFun.getMytokens(address);
  if (tokens.length == 0) {
    return ctx.api.sendMessage(res.fromId, '没有代币');
  }
  const range = new MenuRange();
  for (let i = 0; i < tokens.length; i++) {
    const ele = tokens[i];
    if (Number(ele.amount) > 0) {
      // 尝试从不同来源获取代币信息
      var pump = (await redis.get('pump:' + ele.mint)) || '';
      var raydium = (await redis.get('raydium:' + ele.mint)) || '';
      var moralis = (await redis.get('moralis:' + ele.mint)) || '';
      var decimals = 9;
      var name = ele.mint;
      // 如果本地没有代币信息，则从Moralis获取
      if (raydium == '' && pump == '' && moralis == '') {
        var result = await botFun.tokeninfoByMoralis(ele.mint);
        decimals = result.decimals;
        name = result.name + '';
      } else if (moralis) {
        decimals = JSON.parse(moralis).decimals;
        name = JSON.parse(moralis).name;
      }
      if (decimals > 0) {
        // 为每个代币创建菜单项：名称、余额和清仓按钮
        range
          .text(name ? name : ele.mint.slice(-10), async ctx => {
            botFun.detail_token(ctx, address, res.fromId, ele.mint);
          })
          .text('' + new Decimal(ele.amount).div(10 ** decimals), async ctx => {
            botFun.detail_token(ctx, address, res.fromId, ele.mint);
          })
          .text('清仓', async ctx => {
            var { msg, error } = await botFun.menuSell(ele.mint, res.fromId, 1);
            if (error) return ctx.reply('卖币错误：' + error);
            return ctx.reply(msg, { parse_mode: 'HTML' });
          })
          .row();
      }
    }
  }
  return range;
});

/**
 * 狙击详情菜单 - 显示和管理特定代币的狙击设置
 * 支持刷新、修改金额和取消狙击
 */
const snipeDetailMenu = new Menu('snipe-detail-menu')
  .text('刷新')
  .text('修改金额', async ctx => {
    var { fromId, token } = new BotFun().getAddressFromMsg(ctx, 1);
    await redis.set(fromId + ':nowToken', token);
    await redis.set(fromId + ':status', 'snipeNumber');
    var msg = '请输入狙击金额，输入0.1代表狙击0.1SOL：';
    ctx.reply(msg);
  })
  .row()
  .text('❌取消狙击', async ctx => {
    const botFun = new BotFun();
    var res = botFun.getAddressFromMsg(ctx, 1);
    var address = (await redis.get(res.fromId + ':address')) || '';
    var myKey = res.fromId + ':snipe';
    // 从用户的狙击列表中移除该代币
    await redis.lrem(myKey, 0, res.token);
    await redis.del('snipe:' + address + ':' + res.token);
    ctx.deleteMessage();
    ctx.reply('删除成功');
  });

/**
 * 狙击菜单 - 显示用户所有的狙击任务
 * 动态生成狙击代币列表，点击可查看详情
 */
const snipeMenu = new Menu('snipe-menu').dynamic(async (ctx: any) => {
  const botFun = new BotFun();
  // 获取用户ID和消息内容
  var res = botFun.getAddressFromMsg(ctx, 1);
  // 构建用户专属的狙击任务Redis键
  var myKey = res.fromId + ':snipe';
  // 从Redis获取该用户的所有狙击任务列表
  var snipes = await redis.lrange(myKey, 0, -1);
  // 获取用户绑定的钱包地址
  var address = (await redis.get(res.fromId + ':address')) || '';

  const range = new MenuRange();
  // 遍历所有狙击任务，生成菜单项
  for (let i = 0; i < snipes.length; i++) {
    const ele = snipes[i];
    // 为每个狙击任务创建按钮(显示代币前5位+x)
    range
      .text(ele.slice(0, 5) + 'x', async ctx => {
        // 点击后跳转到该代币的狙击详情页面
        botFun.snipeDetail(ctx, ele, res.fromId, address);
      })
      .row(); // 每项后添加行分隔
  }
  return range;
});

/**
 * 跟单详情菜单 - 管理特定跟单目标的详细设置
 * 包括状态控制、交易模式、金额设置、止盈止损等
 */
const flowMenu = new Menu('flow-menu')
  .dynamic(async ctx => {
    const botFun = new BotFun();
    // 获取用户ID和消息内容
    var res = botFun.getAddressFromMsg(ctx, 1);
    // 获取当前操作的跟单目标地址
    var address = (await redis.get(res.fromId + ':menuBank')) || '';

    // 默认跟单配置(包含所有可设置参数及其默认值)
    var info = {
      sellbili: 1, // 默认卖出比例(100%)
      status: 0, // 跟单状态(0:关闭 1:开启)
      fastsell: 0, // 快跑模式毫秒数(0:关闭)
      autoSell: 0, // 自动跟卖(0:关闭 1:开启)
      gas: 0.005, // 跟买Gas费(0.005 SOL)
      gasSell: 0.005, // 跟卖Gas费(0.005 SOL)
      maxwin: 10, // 止盈比例(10%)
      maxlose: 10, // 止损比例(10%)
      buyRay: 0, // Raydium跟单金额(0:关闭)
      buyPump: 0, // Pump跟单金额(0:关闭)
      rayVmax: 1000, // Raydium最大池子(1000 SOL)
      rayVmin: 0, // Raydium最小池子(0 SOL)
      pumpVmax: 80, // Pump最大池子(80 SOL)
      pumpVmin: 0, // Pump最小池子(0 SOL)
      buyOnce: 0, // 跟买次数限制(0:多次 1:一次)
      holdBuy: 1, // 已持有代币处理(1:继续买入 0:不买入)
      jitoFee: 0.0025, // 防夹模式贿赂小费(0.0025 SOL)
      fetchOpen: true, // 高速模式开关
      jitoOpen: true, // 防夹模式开关
      pumpfee: 50, // Pump滑点(50%)
      rayfee: 50, // Raydium滑点(50%)
      winlosetype: 1, // 止盈止损模式(1:单次 2:分段)
      geterror: 0, // 异常通知(0:关闭 1:开启)
    };

    const range = new MenuRange();
    // 校验地址有效性
    if (address == '') {
      console.log('地址信息错误');
      return range;
    }

    // 获取用户钱包地址
    var myaddress = await redis.get(res.fromId + ':address');
    // 构建跟单配置的Redis键
    var addKey = 'bank:' + myaddress + ':' + address;
    // 从Redis获取该跟单的详细配置
    var addinfo = (await redis.get(addKey)) || '';
    console.log(address, addinfo);

    // 如果Redis中没有配置，则使用默认配置
    if (addinfo == '') {
      console.log('地址信息错误');
      return range;
    }
    var jsoninfo = JSON.parse(addinfo);
    if (jsoninfo) info = jsoninfo;

    // 钱包名称设置
    range
      .text('钱包名称', async ctx => {
        var res = botFun.getAddressFromMsg(ctx, 1);
        await redis.set(res.fromId + ':status', 'setName');
        ctx.reply('请输入钱包名称，10个以内的字符，支持汉字，字母，数字组合');
      })
      .row()
      // 跟单状态开关
      .text(
        () => (info.status == 1 ? '🟢已开启' : '🔴已暂停'),
        async ctx => {
          info.status = info.status == 1 ? 0 : 1;
          await redis.set(addKey, JSON.stringify(info));
          ctx.menu.update();
        }
      )
      // 异常通知开关
      .text(
        () => (info.geterror == 1 ? '🟢异常通知:开启' : '🔴异常通知:关闭'),
        async ctx => {
          info.geterror = info.geterror == 1 ? 0 : 1;
          await redis.set(addKey, JSON.stringify(info));
          ctx.menu.update();
        }
      )
      .row();
    // 交易模式选择：高速模式、防夹模式或两者并发
    range
      .text(
        () => (info.fetchOpen == true && info.jitoOpen == false ? '🟢仅高速模式' : '❌仅高速模式'),
        async ctx => {
          info.fetchOpen = true;
          info.jitoOpen = false;
          await redis.set(addKey, JSON.stringify(info));
          ctx.menu.update();
        }
      )
      .text(
        () => (info.fetchOpen == false && info.jitoOpen == true ? '🟢仅防夹模式' : '❌仅防夹模式'),
        async ctx => {
          info.fetchOpen = false;
          info.jitoOpen = true;
          await redis.set(addKey, JSON.stringify(info));
          ctx.menu.update();
        }
      )
      .text(
        () => (info.fetchOpen == true && info.jitoOpen == true ? '🟢两者并发' : '❌两者并发'),
        async ctx => {
          info.fetchOpen = true;
          info.jitoOpen = true;
          await redis.set(addKey, JSON.stringify(info));
          ctx.menu.update();
        }
      )
      .row()
      .row();
    // 防夹模式贿赂小费设置 - 仅在防夹模式开启时显示
    if (info.jitoOpen == true) {
      range
        .text(
          () => '贿赂小费:' + info.jitoFee,
          async ctx => {
            ctx.deleteMessage(); // 删除当前消息
            var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户ID和地址
            await redis.set(res.fromId + ':status', 'setFollowJitoFee'); // 设置状态为修改贿赂小费
            await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
            ctx.reply('请输入贿赂小费,例如输入0.0025'); // 提示用户输入
          }
        )
        .row(); // 添加行分隔
    }

    // 跟单买卖模式设置 - 控制是否自动跟卖
    range
      .text(
        () => (info.autoSell == 1 ? '✅跟单买卖' : '❌只单买单'),
        async ctx => {
          // autoSell==1代表买卖都跟,是自动卖币模式,无需手动操作
          info.autoSell = info.autoSell == 1 ? 0 : 1; // 切换模式
          await redis.set(addKey, JSON.stringify(info)); // 保存设置
          ctx.menu.update(); // 更新菜单显示
        }
      )
      // 跟买次数设置 - 控制是否多次跟买同一代币
      .text(
        () => (info.buyOnce == 1 ? '🟢跟买一次(相同代币)' : '🔴跟买多次(相同代币)'),
        async ctx => {
          info.buyOnce = info.buyOnce == 1 ? 0 : 1; // 切换模式
          await redis.set(addKey, JSON.stringify(info)); // 保存设置
          ctx.menu.update(); // 更新菜单显示
        }
      )
      .row()
      // Raydium和Pump跟单金额设置
      .text(
        () => (info.buyRay > 0 ? '✅Raydium跟单金额' : '❌Raydium跟单金额'),
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setRaySol'); // 设置状态为修改Raydium跟单金额
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply(
            '请输入固定跟单买入金额，关闭跟单请输入0，如 0.1，每次目标地址买入后，不论金额大小，都跟单买入0.1 SOL'
          );
        }
      )
      .text(
        () => (info.buyPump > 0 ? '✅pump跟单金额' : '❌pump跟单金额'),
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setPumpSol'); // 设置状态为修改Pump跟单金额
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply(
            '请输入固定跟单买入金额，关闭跟单请输入0，如 0.1，每次目标地址买入后，不论金额大小，都跟单买入0.1 SOL'
          );
        }
      )
      .row()
      // 池子范围设置 - 限制跟单的池子大小范围
      .text(
        () => 'Raydium池子范围',
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setRayPoolRange'); // 设置状态为修改Raydium池子范围
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply('请输入Raydium池子范围,例如输入0-80,则池子大小0至80SOL的代币才会跟单');
        }
      )
      .text(
        () => 'pump池子范围',
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setPumpPoolRange'); // 设置状态为修改Pump池子范围
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply('请输入Pump最大池子,例如输入0-80,则池子大小0至80SOL的代币才会跟单');
        }
      )
      .row()
      // Gas费设置 - 跟买和跟卖的交易优先费
      .text(
        () => '跟买gas' + info.gas + 'SOL',
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setGas'); // 设置状态为修改跟买gas
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply(
            '请输入跟单gas，如0.01，代表跟买交易的gas优先费为0.01 SOL，设置过低可能导致跟买失败'
          );
        }
      )
      .text(
        () => '跟卖gas' + info.gasSell + 'SOL',
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setGasSell'); // 设置状态为修改跟卖gas
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply(
            '请输入跟单gas，如0.01，代表跟卖交易的gas优先费为0.01 SOL，设置过低可能导致跟卖失败'
          );
        }
      )
      .row()
      // 滑点设置 - Raydium和Pump交易的滑点百分比
      .text(
        () => 'Raydium滑点' + info.rayfee + '%',
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setRayfee'); // 设置状态为修改Raydium滑点
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply('请输入Raydium滑点（范围1-100），正常是1%，输入100代币允许以2倍金额购买');
        }
      )
      .text(
        () => 'Pump滑点' + info.pumpfee + '%',
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setPumpfee'); // 设置状态为修改Pump滑点
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply('请输入Pump滑点（范围1-100），正常是1%，输入100代币允许以2倍金额购买');
        }
      )
      .row()
      // 快跑模式和跟卖比例设置
      .text(
        () => (info.fastsell == 0 ? '未开启快跑' : '买入后' + info.fastsell + '毫秒快跑'),
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setFastSell'); // 设置状态为修改快跑模式
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply('请输入卖出最快间隔 如1000，代表跟买后1秒后强制卖出，0代笔不开启快跑模式');
        }
      )
      .text(
        () => '跟卖比例' + info.sellbili + '%',
        async ctx => {
          var res = botFun.getAddressFromMsg(ctx, 1); // 获取用户信息
          await redis.set(res.fromId + ':status', 'setSellBili'); // 设置状态为修改跟卖比例
          await redis.set(res.fromId + ':editadd', address); // 保存当前编辑的地址
          ctx.reply('请输入跟卖比例; 如100，代表跟卖时全部卖出所持仓');
        }
      )
      .row()
      // 止盈止损模式切换
      .text(
        () => (info.winlosetype == 1 ? '止盈止损模式:✅单次❌分段' : '止盈止损模式:❌单次✅分段'),
        async ctx => {
          info.winlosetype = info.winlosetype == 1 ? 2 : 1;
          await redis.set(addKey, JSON.stringify(info));
          ctx.menu.update();
        }
      )
      .row();
    // 单次止盈止损设置
    if (info.winlosetype == 1) {
      range
        .text(
          () => '止盈' + info.maxwin + '%',
          async ctx => {
            var res = botFun.getAddressFromMsg(ctx, 1);
            await redis.set(res.fromId + ':status', 'setMaxWin');
            await redis.set(res.fromId + ':editadd', address);
            ctx.reply('请输入止盈比例; 如10，代表如果跟单盈利达到10%就立刻抛出全部代币');
          }
        )
        .text(
          () => '止损' + info.maxlose + '%',
          async ctx => {
            var res = botFun.getAddressFromMsg(ctx, 1);
            await redis.set(res.fromId + ':status', 'setMaxLose');
            await redis.set(res.fromId + ':editadd', address);
            ctx.reply('请输入止损比例; 如10，代表如果跟单亏损达到10%就立刻抛出全部代币');
          }
        )
        .row();
    } else {
      // 分段止盈止损设置
      range
        .text(() => '止盈快速卖出')
        .text(
          () => '新增',
          async ctx => {
            var res = botFun.getAddressFromMsg(ctx, 1);
            await redis.set(res.fromId + ':status', 'addKillWin');
            await redis.set(res.fromId + ':editadd', address);
            ctx.reply(
              '请输入上涨比例和卖出比例，可输入数字或百分比，以逗号隔开，例如：100,50或者100%,50%，都表示上涨100%时卖出50%'
            );
          }
        )
        .row();
      // 显示已设置的分段止盈规则
      var killwinKey = 'bank:' + myaddress + ':killwin:' + address;
      var killwins = await redis.lrange(killwinKey, 0, -1);
      killwins.forEach(win => {
        var [num, bili] = win.split(',');
        range
          .text(() => '价格上涨' + num + '%卖出' + bili + '%')
          .text(
            () => '删除',
            async ctx => {
              await redis.lrem(killwinKey, 0, win);
              ctx.menu.update();
            }
          )
          .row();
      });

      // 分段止损设置
      range
        .text(() => '止损快速卖出')
        .text(
          () => '新增',
          async ctx => {
            var res = botFun.getAddressFromMsg(ctx, 1);
            await redis.set(res.fromId + ':status', 'addKillLose');
            await redis.set(res.fromId + ':editadd', address);
            ctx.reply(
              '请输入下跌比例和卖出比例，可输入数字或百分比，以逗号隔开，例如：50,30或者50%,30%，都表示下跌50%时卖出30%'
            );
          }
        )
        .row();
      // 显示已设置的分段止损规则
      var killloseKey = 'bank:' + myaddress + ':killlose:' + address;
      var killloses = await redis.lrange(killloseKey, 0, -1);
      killloses.forEach(lose => {
        var [num, bili] = lose.split(',');
        range
          .text(() => '价格下跌' + num + '%卖出' + bili + '%')
          .text(
            () => '删除',
            async ctx => {
              console.log(lose);
              await redis.lrem(killloseKey, 0, lose);
              ctx.menu.update();
            }
          )
          .row();
      });
    }
    return range;
  })
  // 删除跟单和返回按钮
  .back('删除跟单', async ctx => {
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 1);
    botFun.delBank(fromId, token, ctx);
  })
  .text('返回', async ctx => {
    var fromId = ctx.update.callback_query.from.id;
    ctx.deleteMessage();
    const botFun = new BotFun();
    botFun.follow_fun(ctx, Number(fromId));
  });

/**
 * 未绑定用户菜单 - 提供钱包绑定功能
 */
const noUserMenu = new Menu('no-user-menu').text('绑定钱包', async ctx => {
  var fromId = ctx.update.callback_query.from.id;
  
  try {
    await redis.del(fromId + ':address');
    await redis.set(fromId + ':status', 'waitSiyao');
    ctx.reply('请输入你的钱包私钥:\n ⚠️ 请勿对外泄露私钥');
  } catch (error) {
    console.error('Redis操作失败:', error);
    console.error('错误详情:', (error as Error).stack);
  }
});
 
/**
 * 主菜单 - 机器人的主界面，提供各功能入口
 */
const menu = new Menu('main-menu')
  .text('🚈买卖', ctx => {
    ctx.reply('✔️发送合约地址即可开始交易');
  })
  .text('🎠跟单', async ctx => {
    const botFun = new BotFun();
    var fromId = ctx.update.callback_query.from.id;
    botFun.follow_fun(ctx, fromId);
  })
  .row()
  .text('🔫指定狙击', async ctx => {
    const botFun = new BotFun();
    var fromId = ctx.update.callback_query.from.id;
    botFun.snipeMain(ctx, fromId);
  })
  .text('🎯自由狙击', async ctx => {
    const botFun = new BotFun();
    var fromId = ctx.update.callback_query.from.id;
    botFun.snipeAuto(ctx, fromId);
  })
  .row()
  .text('💲资产', async ctx => {
    const botFun = new BotFun();
    var fromId = ctx.update.callback_query.from.id;
    botFun.menutokens(ctx, Number(fromId));
  })
  .text('⚙️设置', ctx => {
    const botFun = new BotFun();
    var fromId = ctx.update.callback_query.from.id;
    botFun.mySetting(ctx, Number(fromId));
  })
  .row()
  .url('solscan', async ctx => {
    var fromId = ctx.update.message?.from.id;
    var address = await redis.get(fromId + ':address');
    return 'https://solscan.io/account/' + address;
  })
  .row()
  .url('数据分析', async ctx => {
    var fromId = ctx.update.message?.from.id;
    var address = await redis.get(fromId + ':address');
    return 'https://gmgn.ai/sol/address/' + address;
  })
  .row()
  .text('重新绑定', async ctx => {
    var fromId = ctx.update.callback_query.from.id;
    await redis.del(fromId + ':address');
    await redis.set(fromId + ':status', 'waitSiyao');
    ctx.reply('请输入你的钱包私钥:\n ⚠️ 请勿对外泄露私钥');
  });

/**
 * 代币操作菜单 - 提供特定代币的买卖操作
 */
const tokenMenu = new Menu('token-menu')
  .dynamic(async ctx => {
    const range = new MenuRange();
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 3);
    if (token == '') return range;
    var tokenSymbol = (await redis.get(fromId + ':nowTokenSymbol')) || '';
    range
      .text('刷新 ' + tokenSymbol, async ctx => {
        const botFun = new BotFun();
        var address = await redis.get(fromId + ':address');
        botFun.detail_token(ctx, address, fromId, token);
        ctx.deleteMessage();
      })
      .row();
    return range;
  })
  // 不同金额的买入选项
  .text('买0.001SOL', async ctx => {
    const botFun = new BotFun();
    var { token, fromId } = botFun.getAddressFromMsg(ctx, 3);
    var { msg, error } = await botFun.menuBuy(token, fromId, 0.001);
    if (error) return ctx.reply('买币错误：' + error);
    return ctx.reply(msg, { parse_mode: 'HTML' });
  })
  .text('买0.005SOL', async ctx => {
    const botFun = new BotFun();
    var { token, fromId } = botFun.getAddressFromMsg(ctx, 3);
    var { msg, error } = await botFun.menuBuy(token, fromId, 0.005);
    if (error) return ctx.reply('买币错误：' + error);
    return ctx.reply(msg, { parse_mode: 'HTML' });
  })
  .text('买0.01SOL', async ctx => {
    const botFun = new BotFun();
    var { token, fromId } = botFun.getAddressFromMsg(ctx, 3);
    var { msg, error } = await botFun.menuBuy(token, fromId, 0.01);
    if (error) return ctx.reply('买币错误：' + error);
    return ctx.reply(msg, { parse_mode: 'HTML' });
  })
  .row()
  .text('买0.03SOL', async ctx => {
    const botFun = new BotFun();
    var { token, fromId } = botFun.getAddressFromMsg(ctx, 3);
    var { msg, error } = await botFun.menuBuy(token, fromId, 0.03);
    if (error) return ctx.reply('买币错误：' + error);
    return ctx.reply(msg, { parse_mode: 'HTML' });
  })
  .text('买0.05SOL', async ctx => {
    const botFun = new BotFun();
    var { token, fromId } = botFun.getAddressFromMsg(ctx, 3);
    var { msg, error } = await botFun.menuBuy(token, fromId, 0.05);
    if (error) return ctx.reply('买币错误：' + error);
    return ctx.reply(msg, { parse_mode: 'HTML' });
  })
  // 自定义金额买入
  .text('买xSOL', async ctx => {
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 3);
    await redis.set(fromId + ':nowToken', token);
    await redis.set(fromId + ':status', 'buyXToken');
    ctx.reply('请输入购买金额，输入0.1代表买入0.1SOL，输入后将立即触发买入');
  })
  .row()
  .text('卖')
  .row()
  // 不同比例的卖出选项
  .text('卖50%', async ctx => {
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 3);
    var { msg, error } = await botFun.menuSell(token, fromId, 0.5);
    if (error) return ctx.reply('卖币错误：' + error);
    return ctx.reply(msg, { parse_mode: 'HTML' });
  })
  .text('卖100%', async ctx => {
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 3);
    var { msg, error } = await botFun.menuSell(token, fromId, 1);
    if (error) return ctx.reply('卖币错误：' + error);
    return ctx.reply(msg, { parse_mode: 'HTML' });
  })
  // 自定义比例卖出
  .text('卖x%', async ctx => {
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 3);
    await redis.set(fromId + ':nowToken', token);
    await redis.set(fromId + ':status', 'sellXToken');
    ctx.reply('请输入购买金额，输入0.1代表买入0.1SOL，输入后将立即触发卖出');
  })
  .row()
  .text('清空交易', async ctx => {
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 3);
    var address = await redis.get(fromId + ':address');
    await redis.del(fromId + ':trade:' + token);
    botFun.detail_token(ctx, address, fromId, token);
    ctx.deleteMessage();
  })
  .row()
  // 动态显示狙击选项
  .dynamic(async ctx => {
    const range = new MenuRange();
    const botFun = new BotFun();
    var { fromId, token } = botFun.getAddressFromMsg(ctx, 3);
    // 检查是否有狙击选项
    if (token == '') return range;
    var nowTokenType = (await redis.get(fromId + ':nowTokenType')) || 0;
    if (nowTokenType == 0) {
      // 添加狙击功能按钮
      range
        .text('🔫狙击', async ctx => {
          var msg =
            '🎯狙击功能：\n' +
            '添加狙击任务后，将在 对应代币-sol 的raydium池子创建时触发狙击交易\n' +
            '📌狙击滑点由系统默认设置，暂不支持修改\n' +
            '📌狙击优先费可以在 /set 面板修改，优先费越高，狙击成功率越高';
          ctx.reply(msg);
        })
        .row()
        // 不同金额的狙击选项
        .text('狙0.01SOL', async ctx => {
          new BotFun().addSnipe(ctx, token, Number(fromId), 0.01);
        })
        .text('狙0.05SOL', async ctx => {
          new BotFun().addSnipe(ctx, token, Number(fromId), 0.05);
        })
        .text('狙 x SOL', async ctx => {
          await redis.set(fromId + ':nowToken', token);
          await redis.set(fromId + ':status', 'snipeNumber');
          var msg = '请输入狙击金额，输入0.1代表狙击0.1SOL：';
          ctx.reply(msg);
        });
    }
    return range;
  });

/**
 * 设置菜单 - 用户全局交易设置
 * 包括交易滑点、优先费、交易模式等
 */
const settingMenu = new Menu('setting-menu')
  .dynamic(async ctx => {
    const range = new MenuRange();
    var fromId = ctx.update.callback_query?.from.id || ctx.update.message?.from.id;
    var address = (await redis.get(fromId + ':address')) || '';
    var obj = (await redis.get('setting:' + address)) || '';
    var setting = JSON.parse(obj);

    // 交易滑点和优先费设置
    range
      .text(
        () => '交易滑点:' + setting.swapSlippage,
        async ctx => {
          ctx.deleteMessage();
          var fromId = ctx.update.callback_query.from.id;
          await redis.set(fromId + ':status', 'setSwapSlippage');
          ctx.reply(
            '请输入交易滑点📌滑点范围支持1~100，实时交易热门代币时，可以设置较高滑点提高交易成功率'
          );
        }
      )
      .text(
        () => '交易优先费:' + setting.swapGas,
        async ctx => {
          ctx.deleteMessage();
          var fromId = ctx.update.callback_query.from.id;
          await redis.set(fromId + ':status', 'setSwapGas');
          ctx.reply(
            '请输入交易优先费（决定交易速度），范围0-1SOL\n📌当前优先费' + setting.swapGas + 'SOL'
          );
        }
      )
      .row();

    // 已持有代币是否继续买入设置
    range
      .text(
        () => (setting.holdBuy == 1 ? '🟢已持有代币:继续买入' : '❌已持有代币:不买入'),
        async ctx => {
          setting.holdBuy = setting.holdBuy == 1 ? 0 : 1;
          await redis.set('setting:' + address, JSON.stringify(setting));
          ctx.menu.update();
        }
      )
      .row();

    // 交易模式选择：高速模式、防夹模式或两者并发
    range
      .text(
        () =>
          setting.fetchOpen == true && setting.jitoOpen == false ? '🟢仅高速模式' : '❌仅高速模式',
        async ctx => {
          setting.fetchOpen = true;
          setting.jitoOpen = false;
          await redis.set('setting:' + address, JSON.stringify(setting));
          ctx.menu.update();
        }
      )
      .text(
        () =>
          setting.fetchOpen == false && setting.jitoOpen == true ? '🟢仅防夹模式' : '❌仅防夹模式',
        async ctx => {
          setting.fetchOpen = false;
          setting.jitoOpen = true;
          await redis.set('setting:' + address, JSON.stringify(setting));
          ctx.menu.update();
        }
      )
      .text(
        () => (setting.fetchOpen == true && setting.jitoOpen == true ? '🟢两者并发' : '❌两者并发'),
        async ctx => {
          setting.fetchOpen = true;
          setting.jitoOpen = true;
          await redis.set('setting:' + address, JSON.stringify(setting));
          ctx.menu.update();
        }
      )
      .row();

    // 防夹模式贿赂小费设置
    if (setting.jitoOpen == true) {
      range.text(
        () => '贿赂小费:' + setting.jitoFee,
        async ctx => {
          ctx.deleteMessage();
          var fromId = ctx.update.callback_query.from.id;
          await redis.set(fromId + ':status', 'setJitoFee');
          ctx.reply('请输入贿赂小费,例如输入0.0025');
        }
      );
    }
    return range;
  })
  .row();

/**
 * 自由狙击菜单 - 设置自动狙击参数
 * 支持位置模式和时间模式两种狙击策略
 */
const snipeAutoMenu = new Menu('snipe-auto-menu').dynamic(async ctx => {
  const botFun = new BotFun();
  var fromId = ctx.update.message?.from.id || ctx.update.callback_query?.from.id;
  var address = await redis.get(fromId + ':address');
  var obj = (await redis.get(fromId + ':snipeConfig')) || '';
  var setting = JSON.parse(obj);

  // 获取用户当前狙击模式状态
  var addressGroup = await redis.lrange('autopump:address', 0, -1);
  var timeGroup = await redis.lrange('autopump:time', 0, -1);
  var openway = 0,
    opentime = 0;
  if (addressGroup.includes(address)) openway = 1;
  if (timeGroup.includes(address)) opentime = 1;

  const range = new MenuRange();
  // 刷新按钮
  range
    .text('刷新', async ctx => {
      ctx.deleteMessage();
      botFun.snipeAuto(ctx, fromId);
    })
    .row();

  // Gas费和单次狙击金额设置
  range.text(
    () => 'Gas:' + setting.gas + 'SOl',
    async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoGas');
      ctx.reply('请输入自由狙击Gas费📌范围支持0.001~0.1');
    }
  );
  range
    .text('单次狙击金额', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoMaxSol');
      ctx.reply('请输入单次狙击金额📌范围支持0.001~10');
    })
    .row()

    // 位置模式开关和设置
    .text(
      () =>
        openway == 1
          ? '🟢位置模式:等待就绪'
          : setting.status == 1
            ? '🔫位置模式:正在狙击中'
            : '🔴位置模式:暂未开启',
      async ctx => {
        if (openway == 1) {
          await redis.lrem('autopump:address', 0, address);
        } else {
          if (opentime == 1) {
            return ctx.reply('不能同时开启2个模式');
          } else {
            await redis.rpush('autopump:address', address);
          }
        }
        ctx.deleteMessage();
        botFun.snipeAuto(ctx, fromId);
      }
    )
    .row()
    .text('最高买入位置', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoMaxBuyPosition');
      ctx.reply('请输入最高买入位置，如果实际买入的位置高于等于最高位则立刻卖出');
    })
    .text('交易笔数最大值', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoMaxSwapPosition');
      ctx.reply('请输入交易笔数最大值，如果交易笔数达到最大值则立刻卖出');
    })
    .row()
    .text('最少夹几笔买单', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoFastSell');
      ctx.reply('请输入狙击后最快卖出间隔，例如0代表下单后立刻卖出，1代表间隔1笔买入交易才卖出');
    })
    .text('-')
    .row()

    // 时间模式开关和设置
    .text(
      () =>
        opentime == 1
          ? '🟢时间模式:等待就绪'
          : setting.status == 1
            ? '🔫时间模式:正在狙击中'
            : '🔴时间模式:暂未开启',
      async ctx => {
        if (opentime == 1) {
          await redis.lrem('autopump:time', 0, address);
        } else {
          if (openway == 1) {
            return ctx.reply('不能同时开启2个模式');
          } else {
            await redis.rpush('autopump:time', address);
          }
        }
        ctx.deleteMessage();
        botFun.snipeAuto(ctx, fromId);
      }
    )
    .row()
    .text('涨幅判断时间', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoLongTime');
      ctx.reply('请输入涨幅目前达成时间');
    })
    .text('涨幅比例目标', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoLongBili');
      ctx.reply('请输入目标时间内涨幅比例');
    })
    .row()
    .text('达成目标卖出比例', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoLongSell');
      ctx.reply('请输入达成目标后卖出的比例');
    })
    .text('强制清仓时间', async ctx => {
      var fromId = ctx.update.callback_query.from.id;
      await redis.set(fromId + ':status', 'snipeAutoLongForce');
      ctx.reply('请输入买入后持续多长时间就强制清仓');
    });
  return range;
});

/**
 * 跟单菜单 - 管理用户的跟单列表
 * 支持添加、编辑和删除跟单目标
 */
const followMenu = new Menu('follow-menu')
  .text('添加跟单', async ctx => {
    var fromId = ctx.update.callback_query.from.id;
    await redis.set(fromId + ':status', 'waitFollow');
    ctx.reply('✔️请输入您要跟单的地址');
  })
  .row()
  .dynamic(async ctx => {
    const botFun = new BotFun();
    var fromId = ctx.update.message?.from.id || ctx.update.callback_query?.from.id;
    var myaddress = await redis.get(fromId + ':address');
    var myKey = fromId + ':banker';
    // 获取用户的所有跟单目标
    var nowBanker = await redis.lrange(myKey, 0, -1);
    const range = new MenuRange();
    var allstatus: number = 0;

    // 为每个跟单目标创建菜单项
    for (let index = 0; index < nowBanker.length; index++) {
      const b = nowBanker[index];
      var short = b.slice(0, 5);
      var addinfo = await redis.get('bank:' + myaddress + ':' + b);
      var bank = JSON.parse(addinfo);

      if (bank.status == 1 && allstatus == 0) {
        allstatus = 1;
      }
      range
        .text(bank.name || short, ctx => {
          botFun.detail_fun(fromId, b, ctx);
        })
        .text('编辑', ctx => {
          botFun.detail_fun(fromId, b, ctx);
        })
        .text('删除', async ctx => {
          botFun.delBank(fromId, b, ctx);
        })
        .row();
    }

    // 一键开启/关闭所有跟单
    range
      .text(
        () => (allstatus == 0 ? '🟢一键开启' : '🔴一键关闭'),
        async ctx => {
          if (allstatus == 0) {
            nowBanker.forEach(async (b: string, i: Number) => {
              var addinfo = await redis.get('bank:' + myaddress + ':' + b);
              var bank = JSON.parse(addinfo);
              bank.status = 1;
              await redis.set('bank:' + myaddress + ':' + b, JSON.stringify(bank));
            });
          } else {
            nowBanker.forEach(async (b: string, i: Number) => {
              var addinfo = await redis.get('bank:' + myaddress + ':' + b);
              var bank = JSON.parse(addinfo);
              bank.status = 0;
              await redis.set('bank:' + myaddress + ':' + b, JSON.stringify(bank));
            });
          }
          ctx.deleteMessage();
          botFun.follow_fun(ctx, Number(fromId));
        }
      )
      .row();
    return range;
  });

/**
 * 代币分析菜单 - 显示特定代币的持有者分析
 * 按持有量排序展示
 */
const analyseTokenMenu = new Menu('analyse-token-menu').dynamic(async ctx => {
  var address = ctx.update.message?.text;
  const range = new MenuRange();
  // 获取代币持有者排名
  const members = await redis.zrevrange('address:analyse:' + address, 0, -1, 'WITHSCORES'); // 0 表示开始索引，-1 表示结束索引，即获取所有成员
  const formattedMembers = members.reduce(
    (acc, curr, index, arr) => {
      if (index % 2 === 0) {
        // 偶数索引是成员
        acc.push({ member: curr, score: new Decimal(arr[index + 1]).div(10 ** 9).toFixed(4) });
      }
      return acc;
    },
    [] as { member: string; score: any }[]
  );

  // 为每个持有者创建菜单项
  formattedMembers.forEach((item: any, index) => {
    range
      .text(item.member, async ctx => {
        // 点击持有者地址的操作
      })
      .text(item.score + '')
      .row();
  });
  return range;
});

/**
 * 导出所有菜单组件
 */
export {
  snipeMenu,
  menu,
  followMenu,
  flowMenu,
  tokenMenu,
  noUserMenu,
  snipeDetailMenu,
  tokensMenu,
  settingMenu,
  snipeAutoMenu,
  analyseTokenMenu,
};
