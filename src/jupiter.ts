import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';

import { RouterInfo } from './config';
import { request } from './init';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';
import axios from 'axios';
import Decimal from 'decimal.js';
dotenv.config();
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));
const wsolstr = 'So11111111111111111111111111111111111111112';
const usdtstr = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const emptyRouterInfo = (name?: string): RouterInfo => ({
  id: 0,
  signature: '',  // 新增字段
  slot: 0,        // 新增字段
  type: '',       // 新增字段
  signer: '',     // 新增字段
  amm: '',
  name: name ? name : '',
  input: '',
  output: '',
  poola: '',
  poolb: '',
  in: '',
  inpool: '',
  outpool: '',
  out: '',
});

export class JupiterSwap {
  client: request;
  constructor() {
    this.client = new request();
  }

  async doubleswap(tx: string, amount: number, route: RouterInfo) {
    var routeinfo = route;
    //this.swapone(tx,wsolstr,amount,route,"SolFi","SolFi");
    route.input = routeinfo.output;
    route.output = routeinfo.input;
    this.swapone(tx, wsolstr, amount, route, 'SolFi', 'SolFi');
    this.swapone(tx, wsolstr, amount, route, 'Raydium', 'Raydium');
  }

  async swapone(
    tx: string,
    swaptoken: string,
    amount: number,
    route: RouterInfo,
    beforedex: string,
    afterdex: string
  ) {
    //console.log(swaptoken,route);
    var routes: RouterInfo[] = [];
    var startMint = route.input;
    var endMint = route.output;
    if (startMint != swaptoken) {
      var addroute: RouterInfo = emptyRouterInfo(beforedex);
      addroute.id = 33;
      addroute.input = swaptoken;
      addroute.output = startMint;
      routes.push(addroute);
    }
    routes.push(route);
    if (endMint != swaptoken) {
      var addroute: RouterInfo = emptyRouterInfo(afterdex);
      addroute.id = 66;
      addroute.input = endMint;
      addroute.output = swaptoken;
      routes.push(addroute);
    }
    // console.log("===========");
    //console.log(routes);
    await this.realswap(amount, routes);
  }

  async swap(tx: string, amount: number, routes: RouterInfo[]) {
    var oldroutes = routes;
    var startInputMint = routes[0].input;
    var changetype = 0;
    if (startInputMint != wsolstr && startInputMint != usdtstr) {
      if (routes.length == 1) {
        if (routes[0].output == wsolstr || routes[0].output == usdtstr) {
          //让output 和 input 对调
          routes[0].input = routes[0].output;
          routes[0].output = startInputMint;
          changetype = 1;
        } else {
          routes = [
            {
              name: 'Lifinity V2',
              amm: '',
              id: 0,
              signature: '',  // 新增字段
              slot: 0,        // 新增字段
              type: '',       // 新增字段
              signer: '',     // 新增字段
              poola: '',
              poolb: '',
              in: '',
              out: '',
              input: wsolstr,
              inpool: '',
              outpool: '',
              output: routes[0].output,
            },
            {
              name: 'Raydium',
              amm: '',
              id: 0,
              signature: '',  // 新增字段
              slot: 0,        // 新增字段
              type: '',       // 新增字段
              signer: '',     // 新增字段
              poola: '',
              poolb: '',
              in: '',
              out: '',
              input: routes[0].output,
              inpool: '',
              outpool: '',
              output: routes[0].input,
            },
            {
              name: 'SolFi',
              amm: '',
              id: 0,
              signature: '',  // 新增字段
              slot: 0,        // 新增字段
              type: '',       // 新增字段
              signer: '',     // 新增字段
              poola: '',
              poolb: '',
              in: '',
              out: '',
              input: routes[0].input,
              inpool: '',
              outpool: '',
              output: wsolstr,
            },
          ];
          changetype = 2;
        }
      } else {
        var realopen = false;
        var routesData = routes;
        var routesData2: RouterInfo[] = [];
        routesData.forEach((r: RouterInfo) => {
          if (r.input == wsolstr || r.input == usdtstr) {
            realopen = true;
          }
          if (realopen == true) {
            routesData2.push(r);
          }
        });
        routes = routesData2;
        if (routes.length == 0) {
          //console.log("不是WSOL 或 USDT开始","过滤后无法交易");
          return { error: '不是WSOL 或 USDT开始' };
        }
      }
    } else if (startInputMint == wsolstr || lastOutputMint == usdtstr) {
      if (routes.length == 1) {
        if (startInputMint == lastOutputMint) {
          return { error: '------' };
        } else {
          // console.log('swap',routes.length,tx)
          // console.log(oldroutes);
          // console.log(routes);
          changetype = 5;
        }
      } else {
      }
    }
    var startInputMint = routes[0].input;
    var lastOutputMint = routes[routes.length - 1].output;
    if (lastOutputMint != startInputMint) {
      routes.push({
        name: 'SolFi',
        amm: '',
        id: 0,
        signature: '',  // 新增签名字段
        slot: 0,        // 新增区块高度
        type: '',       // 新增交易类型
        signer: '',     // 新增签名者
        poola: '',
        poolb: '',
        in: '',
        out: '',
        input: lastOutputMint,
        output: startInputMint,
        inpool: '',
        outpool: '',
      });
    }
    var lastOutputMint = routes[routes.length - 1].output;
    if (changetype > 0) {
      //console.log(changetype,routes);
    }
    if (startInputMint != lastOutputMint) {
      console.log(routes);
      return { error: '不数闭环' };
    }
    if (changetype == 0 && routes.length > 2) {
      changetype = 4;
      routes = routes.slice(0, 2);
      routes[1].output = routes[0].input;
    }
    this.realswap(amount, routes);
  }

  async realswap(amount: number, routes: RouterInfo[]) {
    var routePlan: any[] = [];
    var otherAmountThreshold = 0;
    var quoteStart: any;
    var outAmount = 0;
    var errJupiter = 0;
    var outputMint = '';
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const requestUrl = `${process.env.JUPITER_API_URL}/quote?inputMint=${route.input}&outputMint=${route.output}&amount=${Math.floor(amount)}&onlyDirectRoutes=true&slippageBps=0&dexes=${route.name}`;
      const [response] = await Promise.all([
        axios
          .get(process.env.JUPITER_API_URL + '/quote', {
            params: {
              inputMint: route.input,
              outputMint: route.output,
              amount: Math.floor(i == 0 ? amount : outAmount), // 确保是整数
              onlyDirectRoutes: true,
              slippageBps: 0,
              dexes: route.name,
            },
          })
          .catch((error: any): { status: number; data: { error: string } } => {
            return {
              status: 500,
              data: {
                error: error.response.data.error,
              },
            };
          }),
      ]);
      if (response.status != 200) {
        errJupiter++;
        console.error(`请求错误: ${response.data.error || '未知错误'}`, requestUrl);
        return { error: `路由 ${route.name} 请求失败: ${response.data.error}` };
      }
      if (i == 0) quoteStart = response.data;
      outAmount = response.data.outAmount;
      outputMint = response.data.outputMint;
      otherAmountThreshold = response.data.otherAmountThreshold;
      routePlan = [...routePlan, ...response.data.routePlan];
    }
    if (routePlan.length == 0) {
      console.error('路由为空');
      console.error(routes);
      return { error: '路由为空' };
    }
    if (errJupiter > 0) {
      console.error('路由错误');
      return { error: '路由错误' + errJupiter };
    }
    var feeAmount = new Decimal(outAmount).sub(new Decimal(amount));
    if (feeAmount.gt(new Decimal(10000))) {
      console.log('路由数:' + routes.length, '可套利:' + new Decimal(feeAmount).div(10 ** 9));
      //console.log(routes)
      console.log(routePlan);
      console.log('\n');
      return { error: '' };
      const [swapInstructions] = await Promise.all([
        axios.post(process.env.JUPITER_API_URL + '/swap-instructions', {
          //请求合并后的swap指令
          userPublicKey: payer.publicKey.toBase58(), // 用户公钥
          dynamicSlippage: true, // 是否动态滑点
          wrapAndUnwrapSol: false, // 是否包装和解包装SOL
          useSharedAccounts: false, // 是否使用共享账户
          computeUnitPriceMicroLamports: 1, // 计算单元价格(微lamports)
          dynamicComputeUnitLimit: true, // 动态计算单元限制
          skipUserAccountsRpcCalls: true, // 跳过用户账户RPC调用
          quoteResponse: {
            // 合并报价
            ...quoteStart, // 合并报价数据
            outputMint: outputMint, // 输出Mint
            outAmount: String(outAmount), // 输出金额
            otherAmountThreshold: String(otherAmountThreshold), // 其他金额阈值
            priceImpactPct: '0', // 价格影响百分比
            routePlan: routePlan, // 合并路由计划
          },
        }),
      ]);

      var accounts = swapInstructions.data.swapInstruction.accounts;
      var data = swapInstructions.data.swapInstruction.data;
      const tx = new TransactionInstruction({
        keys: accounts.map(
          (account: { pubkey: string; isSigner: boolean; isWritable: boolean }) => ({
            pubkey: new PublicKey(account.pubkey),
            isSigner: account.isSigner,
            isWritable: account.isWritable,
          })
        ),
        programId: new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
        data: Buffer.from(data, 'base64'),
      });
      var res = await this.client.makeTransaction(tx, 0.000001, payer);
      console.log(res);
      return { error: '' };
    } else {
      console.log('路由数:' + routes.length, '利润太低', feeAmount);
      // console.log(routePlan)
      return { error: '利润太低' };
    }
  }
}

// async function main(){
//     var amount = 1000000;
//     var routes = [
//         {
//             id: 7,
//             amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
//             name: 'SolFi',
//             input: 'So11111111111111111111111111111111111111112',
//             output: usdtstr,
//             poola: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
//             poolb: 'BmKuiSYs91eP8cn8PTD2eue1vVmqfZq2ipg4WQknY23q',
//             in: '0.588123384',
//             out: '73.183585'
//         },
//         {
//             id: 7,
//             amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
//             name: 'Raydium',
//             input: 'So11111111111111111111111111111111111111112',
//             output: usdtstr,
//             poola: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
//             poolb: 'BmKuiSYs91eP8cn8PTD2eue1vVmqfZq2ipg4WQknY23q',
//             in: '0.588123384',
//             out: '73.183585'
//         }
//     ]
//     //await (new JupiterSwap()).swapone("",wsolstr,amount,routes[0],"Raydium","Lifinity V2");
//     //await (new JupiterSwap()).swapone("",wsolstr,amount,routes[0],"Raydium","Obric V2");
//     //await (new JupiterSwap()).swapone("",wsolstr,amount,routes[0],"Raydium","SolFi");
//     //await (new JupiterSwap()).swapone("",wsolstr,amount,routes[0],"Raydium","Raydium");
//     //await (new JupiterSwap()).swapone("",wsolstr,amount,routes[1],"SolFi","SolFi");
//     //await (new JupiterSwap()).swapone("",wsolstr,amount,routes[0],"Raydium","Phoenix");
// }
// main();
