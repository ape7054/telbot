import {
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Redis } from 'ioredis';
import bs58 from 'bs58';
const jitpTipAccounts = [
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
];
const axios = require('axios');
const Decimal = require('decimal.js');

export class request {
  async getAccountInfo(address: PublicKey) {
    const data = await this.fetch('getAccountInfo', [address, { encoding: 'base64' }], 'Blockhash');
    var value = data.result.value;
    if (value == null) return value;
    var buffer = Buffer.from(value.data[0], 'base64');
    value.data = buffer;
    value.owner = new PublicKey(value.owner);
    return value;
  }

  // async getTokenAccountsByOwner(address:PublicKey){
  //   const data = await this.fetch('getTokenAccountsByOwner',[address,{
  //     programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  //   },{"encoding": "base64"}],'Blockhash');
  //   var walletTokenAccount = data.result.value;
  //   if(walletTokenAccount==null) return value;

  //   var value = walletTokenAccount.map((i:any) => ({
  //     pubkey: i.pubkey,
  //     programId: i.account.owner,
  //     accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  //   }))
  //   // var buffer = Buffer.from(value.data[0], 'base64');
  //   // value.data = buffer;
  //   // value.owner = new PublicKey(value.owner);
  //   return value;
  // }

  async getBalance(address: PublicKey) {
    const data = await this.fetch(
      'getBalance',
      [address, { commitment: 'processed' }],
      'Blockhash'
    );
    return data?.result?.value || 0;
  }

  async makeTransaction(
    tx: any,
    gas: number,
    payer: Keypair
  ): Promise<{ error: string; hash?: string; time?: number }> {
    const transaction = new Transaction();
    if (gas > 0) {
      var microLamports = new Decimal(gas).mul(10 ** 10).div(5);
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }));
      transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
    }
    transaction.add(tx);
    return this.sendRequest(transaction, payer, 1, 0);
  }

  /**
   * @param model 并发 0 和 防夹 2 ，高速 1
   * @param fee
   * @returns error
   * @returns msg
   * @returns hash
   */
  async sendRequest(
    transaction: Transaction,
    payer: Keypair,
    model: number,
    fee: number
  ): Promise<{ error: string; hash?: string; time?: number }> {
    var time = new Date();
    const Blockhash = await this.fetch('getLatestBlockhash', [], 'Blockhash');
    console.log('Blockhash', Blockhash.result.value.blockhash);
    console.log(
      '发起时间',
      time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds(),
      payer.publicKey.toString(),
      model,
      fee,
      fee * 10 ** 8
    );
    transaction.recentBlockhash = Blockhash.result.value.blockhash;
    transaction.feePayer = payer.publicKey;
    transaction.sign(payer);
    const serializedTransaction = transaction.serialize(); // 序列化交易
    const tx = bs58.encode(serializedTransaction);
    if (model == 0 || model == 2) {
      const transactionJito = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: new PublicKey(
            jitpTipAccounts[Math.floor(Math.random() * jitpTipAccounts.length)]
          ),
          lamports: BigInt(fee * 10 ** 8) || BigInt(2500000),
        })
      );
      transactionJito.recentBlockhash = Blockhash.result.value.blockhash;
      transactionJito.feePayer = payer.publicKey;
      transactionJito.sign(payer);
      var tx2 = bs58.encode(transactionJito.serialize());
      // this.fetch('sendBundle',[[tx,tx2]],'jito4');
      // this.fetch('sendBundle',[[tx,tx2]],'jito1');
      // this.fetch('sendBundle',[[tx,tx2]],'jito2');
      // this.fetch('sendBundle',[[tx,tx2]],'jito3');
      if (model == 2) {
        return await this.fetch('sendBundle', [[tx, tx2]], 'jito');
      }
    }
    return await this.fetch('sendTransaction', [tx], '');
    // 可追加参数{skipPreflight: true,maxRetries: 10,}，有屏蔽报错的效果
  }

  /**
   * 发送网络请求的方法
   * @param method 请求方法名
   * @param params 请求参数
   * @param type 节点类型
   * @returns 请求结果
   */
  async fetch(method: string, params: any, type: string) {
    // 获取当前时间戳
    const time = Math.floor(new Date().getTime() / 1000);
    let url = config.RPC_URL;

    switch (type) {
    
      case 'frankfurt':
        url = 'https://solana-yellowstone-grpc.publicnode.com:443';  // 修改为 https
        break;
      case 'amsterdam':
        url = 'https://solana-yellowstone-grpc.publicnode.com:443';  // 修改为 https
        break;
      case 'Blockhash':
        url = config.RPC_URL;
        break;
      case 'jito':
        url = 'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles';
        break;
      case 'jitomain':
        url = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';
        break;
      case 'jito1':
        url = 'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles';
        break;
      case 'jito2':
        url = 'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles';
        break;
      case 'jito3':
        url = 'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles';
        break;
      case 'jito4':
        url = 'https://slc.mainnet.block-engine.jito.wtf/api/v1/bundles';
        break;
    }

    // 创建axios实例并设置请求头为JSON格式
    const client = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',  // 添加 User-Agent
      },
      timeout: 30000,  // 添加超时设置
    });

    try {
      // 发送POST请求
      const response = await client.post(url, {
        id: 1,
        jsonrpc: '2.0',
        method,
        params: params || [],
      });

      // 处理响应结果
      if (response.status === 200) {
        if (type === 'Blockhash') {
          return response.data;
        } else {
          if (response.data.result !== undefined) {
            return {
              error: '',
              hash: response.data.result,
              time,
            };
          } else {
            console.log(response.data.error.data.err);
            console.log(response.data.error);
            return {
              error: response.data.error.message,
            };
          }
        }
      } else {
        console.log(url, `Response status: ${response.status}`);
        return {
          error: 'Response status' + response.status,
        };
      }
    } catch (error) {
      console.error(url, 'HTTP error');
      return {
        error: 'HTTP error',
      };
    }
  }
}

export class helius {
  async getHistory(address: string) {
    var time1 = new Date().getTime();
    var url =
      'https://api.helius.xyz/v0/addresses/' +
      address +
      '/transactions?api-key=58cb60c2-fcc6-4c96-9910-7123cf351f7a';
    const response = await fetch(url, { method: 'GET', headers: {} });
    const data = await response.json();
    if (data === undefined) {
      console.log('查询失败');
    }
    var raydiumProgram: any[] = [],
      pumpProgram: any[] = [];
    data.forEach((tx: any, i: number) => {
      if (tx.feePayer == address) {
        tx.instructions.forEach((ins: any) => {
          if (ins.programId == config.pump_program) {
            pumpProgram.push(ins);
          } else if (ins.programId == config.raydium_program) {
            raydiumProgram.push(ins);
          } else {
            const filteredInstructions = ins.innerInstructions.filter(
              (instruction: any) =>
                instruction.programId === config.pump_program ||
                instruction.programId === config.raydium_program
            );
            if (filteredInstructions.length > 0) {
              filteredInstructions.forEach((inner: any) => {
                if (inner.programId == config.pump_program) {
                  pumpProgram.push(inner);
                } else if (inner.programId == config.raydium_program) {
                  raydiumProgram.push(inner);
                }
              });
            }
          }
        });
      }
    });

    if (pumpProgram.length > 0) {
      //console.log('pumpProgram',pumpProgram);
      pumpProgram.forEach((ins: any) => {
        var associated_user = ins.accounts[5];
        var token = ins.accounts[2];
        // console.log('associated_user',associated_user);
        // console.log('token',token);
        //ins.innerInstructions.forEach((inner:any)=>{

        //})
      });
      // console.log(tx.signature);
      // process.exit();
    } else if (raydiumProgram.length > 0) {
      raydiumProgram.forEach((ins: any) => {
        //console.log(ins);
        //ins.innerInstructions.forEach((inner:any)=>{
        // if(inner.account[2] == address){
        // }
        // if(inner.account[2] == config.raydium_authority){
        //   //Buffer.
        // }
        //console.log(inner.account[2]);
        //})
      });
    }
    console.log(
      (new Date().getTime() - time1) / 1000,
      data.length,
      raydiumProgram.length,
      pumpProgram.length
    );
  }
}

export class utils {
  async getTokenData(token: string, chat_id: number) {
    const redis = new Redis({
      host: config.rshost,
      port: parseInt(process.env.REDIS_PORT || '7001'),  // 使用环境变量或默认7001端口
      password: config.rspwd,
      db: config.rsdb,
    });
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
    var bili = buyall > 0 ? new Decimal(yingli * 100).div(buyall) : 0;
    var msg =
      '' +
      '💳 总买入：' +
      buyall +
      ' SOL ($' +
      (Number(buyall) * config.solprice).toFixed(2) +
      ')\n' +
      '💰 总卖出：' +
      sellall +
      ' SOL ($' +
      (Number(sellall) * config.solprice).toFixed(2) +
      ')\n' +
      '🎯 手续费：' +
      feeall +
      ' SOL ($' +
      (Number(feeall) * config.solprice).toFixed(2) +
      ')\n' +
      '📣 总盈亏：' +
      yingli +
      ' SOL ($' +
      (Number(yingli) * config.solprice).toFixed(2) +
      ')\n';
    +'📈 收益率：' + bili.toFixed(6) + '%\n';
    msg += '/' + token + '';
    return { msg };
  }
}

export const config = {
  executeSwap: true, // Send tx when true, simulate tx when false
  useVersionedTransaction: true,
  tokenAAmount: 0.01, // Swap 0.01 SOL for USDT in this example
  tokenAAddress: 'So11111111111111111111111111111111111111112', // Token to swap for the other, SOL in this case
  tokenBAddress: '3ag1Mj9AKz9FAkCQ6gAEhpLSX8B2pUbPdkb9iBsDLZNB', // USDC address
  wsol: 'So11111111111111111111111111111111111111112', // Token to swap for the other, SOL in this case
  maxLamports: 1000000, // Max lamports allowed for fees
  direction: 'in' as 'in' | 'out', // Swap direction: 'in' or 'out'
  maxRetries: 10,
  
  RPC_URL: 'https://rpc.helius.xyz/?api-key=58cb60c2-fcc6-4c96-9910-7123cf351f7a',  // 使用 Helius API key
  
  WSS_URL: 'wss://mainnet.helius-rpc.com/?api-key=58cb60c2-fcc6-4c96-9910-7123cf351f7a',  // 使用相同的 API key
  BIG_URL: 'http://solana-yellowstone-grpc.publicnode.com:443',
  grpc_url: 'https://solana-yellowstone-grpc.publicnode.com:443',
  atlas_wss: 'wss://solana-yellowstone-grpc.publicnode.com:443',
  solprice: 251,
  // 更新Redis配置以匹配docker-compose.yml
  host: 'localhost',
  rshost: process.env.REDIS_HOST || 'localhost',
  rsport: parseInt(process.env.REDIS_PORT || '7001'),  // 添加端口配置
  rspwd: process.env.REDIS_PASSWORD || 'tapai123456',
  rsdb: 0,
  rsdb2: 1,
  // 更新Telegram Bot配置
  botapi: process.env.TELEGRAM_BOT_TOKEN || '8195327696:AAEnqADO_ViwCHpx-cL518aJ9kYA4gswhc8',
  pump_program: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  raydium_program: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  usdt: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  raydium_authority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  pump_signer: '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
};
