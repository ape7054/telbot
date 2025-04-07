import {
  Keypair,
  SystemProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  VersionedTransactionResponse,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { Redis } from 'ioredis';
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk';
import { config, request, utils } from './init'; // Import the configuration
import { Bot } from 'grammy';
import { u64 } from '@solana/buffer-layout-utils';
import { struct } from '@solana/buffer-layout';
import bs58 from 'bs58';
const Decimal = require('decimal.js');
const GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
const FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOC_TOKEN_ACC_PROG = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const RENT = new PublicKey('SysvarRent111111111111111111111111111111111');
const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const PUMP_FUN_ACCOUNT = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
const SYSTEM_PROGRAM_ID = SystemProgram.programId;
export interface PumpDataStruct {
  discriminator: bigint;
  virtual_token_reserves: bigint;
  virtual_sol_reserves: bigint;
  real_token_reserves: bigint;
  real_sol_reserves: bigint;
  token_total_supply: bigint;
}
const redis = new Redis({
  host: process.env.REDIS_HOST || config.rshost,
  port: parseInt(process.env.REDIS_PORT || '7001'),
  password: process.env.REDIS_PASSWORD || config.rspwd,
  db: config.rsdb,
});

/**
 * Pump 交易
 * bufferFromUInt64 交易参数转格式
 * getBondingCurve 解析交易池数据
 * getCanBuyToken 计算能买到的代币数量
 * swapBuy 买币
 * swapSell 卖币
 * analyse 交易详情分析
 * telegramNotice 交易成功消息通知
 * telegramAuto 自由狙击消息通知
 */
class PumpSwap {
  client: request;
  constructor() {
    this.client = new request();
  }

  bufferFromUInt64(value: number | string) {
    let buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
  }
  /**
   * 解析交易池数据
   * @param bonding_curve
   * @returns
   */
  async getBondingCurve(bonding_curve: string) {
    var value = await this.client.getAccountInfo(new PublicKey(bonding_curve));
    const AccountLayout = struct<PumpDataStruct>([
      u64('discriminator'),
      u64('virtual_token_reserves'),
      u64('virtual_sol_reserves'),
      u64('real_token_reserves'),
      u64('real_sol_reserves'),
      u64('token_total_supply'),
    ]);
    return AccountLayout.decode(value.data);
  }

  /**
   * 计算能买到的代币数量
   * @param virtualSolReserves
   * @param virtualTokenReserves
   * @param amount
   * @returns 数量
   */
  getCanBuyToken(virtualSolReserves: bigint, virtualTokenReserves: bigint, amount: bigint): bigint {
    if (amount <= 0n) {
      return 0n;
    }
    // Calculate the product of virtual reserves
    let n = virtualSolReserves * virtualTokenReserves;
    // Calculate the new virtual sol reserves after the purchase
    let i = virtualSolReserves + amount;
    // Calculate the new virtual token reserves after the purchase
    let r = n / i + 1n;
    // Calculate the amount of tokens to be purchased
    return virtualTokenReserves - r;
  }

  /**
   * Pump 购买功能
   * @param privatekey
   * @param mintStr
   * @param intosol
   * @param pumpfee
   * @param bonding_curve
   * @param associated_bonding_curve
   * @param token_reserves
   * @param sol_reserves
   * @param gas
   * @param model
   * @param fee
   * @returns msg,hash,time
   */
  async swapBuy(
    privatekey: string | null,
    mintStr: string | null,
    intosol: number,
    pumpfee: number,
    bonding_curve: string,
    associated_bonding_curve: string,
    token_reserves: bigint,
    sol_reserves: bigint,
    gas: number,
    model: number,
    fee: number
  ): Promise<{ error: string; hash?: string; time?: number }> {
    if (
      privatekey == null ||
      mintStr == null ||
      intosol <= 0 ||
      solIn == undefined ||
      sol_reserves == undefined ||
      token_reserves == 0n ||
      token_reserves == undefined
    )
      return { error: '参数错误' };
    var payer = Keypair.fromSecretKey(bs58.decode(privatekey));
    const owner = payer.publicKey;
    const mint = new PublicKey(mintStr);
    var solIn = BigInt(intosol * 10 ** 9);
    console.log(solIn, token_reserves, sol_reserves);
    var tokenOut = this.getCanBuyToken(sol_reserves, token_reserves, solIn);
    if (tokenOut == 0n) return { error: '代币价格异常' };
    var basisPoints: bigint = BigInt(pumpfee * 100);
    const maxSolCost = solIn + (solIn * basisPoints) / 10000n;
    console.log(mintStr, 'buy: ' + tokenOut, 'used: ' + maxSolCost);
    const tokenAccountAddress = await getAssociatedTokenAddress(mint, owner, false);
    const transaction = new Transaction();
    if (gas > 0 && gas <= 0.1) {
      var microLamports = new Decimal(gas).mul(10 ** 10).div(5);
      console.log('增加GAS费', microLamports);
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }));
      transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
    }
    const tokenAccountInfo = await this.client.getAccountInfo(tokenAccountAddress);
    if (!tokenAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(owner, tokenAccountAddress, owner, mint)
      );
      await redis.set(
        'associated:' + mintStr + ':' + owner.toString(),
        tokenAccountAddress.toString()
      );
    }
    transaction.add(
      new TransactionInstruction({
        keys: [
          { pubkey: GLOBAL, isSigner: false, isWritable: false },
          { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: new PublicKey(bonding_curve), isSigner: false, isWritable: true },
          { pubkey: new PublicKey(associated_bonding_curve), isSigner: false, isWritable: true },
          { pubkey: tokenAccountAddress, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: false, isWritable: true },
          { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: RENT, isSigner: false, isWritable: false },
          { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
          { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
        ],
        programId: PUMP_FUN_PROGRAM,
        data: Buffer.concat([
          this.bufferFromUInt64('16927863322537952870'),
          this.bufferFromUInt64(tokenOut.toString()),
          this.bufferFromUInt64(maxSolCost.toString()),
        ]),
      })
    );
    return this.client.sendRequest(transaction, payer, model, fee);
  }

  /**
   * 卖币
   * @param privatekey
   * @param mintStr
   * @param lv
   * @param hasToken
   * @param myAccountAddress
   * @param bonding_curve
   * @param associated_bonding_curve
   * @param gas
   * @param model
   * @param fee
   * @returns msg,hash,time
   */
  async swapSell(
    privatekey: string,
    mintStr: string,
    lv: number,
    hasToken: number,
    myAccountAddress: string,
    bonding_curve: string,
    associated_bonding_curve: string,
    gas: number,
    model: number,
    fee: number
  ): Promise<{ error: string; hash?: string; time?: number }> {
    const payer = Keypair.fromSecretKey(bs58.decode(privatekey));
    const owner = payer.publicKey;
    const mint = new PublicKey(mintStr);
    var tokenAccountAddress: PublicKey;
    if (myAccountAddress) {
      tokenAccountAddress = new PublicKey(myAccountAddress);
    } else {
      tokenAccountAddress = await getAssociatedTokenAddress(mint, owner, false);
    }
    var sellAmount = Math.floor(hasToken * lv);
    console.log('pump_sell', sellAmount, mintStr);
    if (hasToken == 0) {
      var account = await this.client.getAccountInfo(tokenAccountAddress);
      if (account == null) return { error: '交易账号为空' };
      var accountInfo = SPL_ACCOUNT_LAYOUT.decode(account.data);
      var tokenBalance = new Decimal(accountInfo.amount.toString());
      console.log('tokenBalance', tokenBalance, lv);
      var sellAmount = Math.floor(tokenBalance! * lv);
      console.log('sellAmount', sellAmount);
    }
    if (sellAmount == 0) return { error: '卖出数量异常', hash: '', time: 0 };
    const minSolOutput = 0;
    const keys = [
      { pubkey: GLOBAL, isSigner: false, isWritable: false },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(bonding_curve), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(associated_bonding_curve), isSigner: false, isWritable: true },
      { pubkey: tokenAccountAddress, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOC_TOKEN_ACC_PROG, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
    ];
    console.log('tokenBalance: ' + sellAmount, 'minSolOutput: ' + minSolOutput);

    const transaction = new Transaction();
    if (gas > 0 && gas <= 0.1) {
      var microLamports = new Decimal(gas).mul(10 ** 10).div(5);
      console.log(microLamports);
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }));
      transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
    }
    transaction.add(
      new TransactionInstruction({
        keys: keys,
        programId: PUMP_FUN_PROGRAM,
        data: Buffer.concat([
          this.bufferFromUInt64('12502976635542562355'),
          this.bufferFromUInt64(sellAmount),
          this.bufferFromUInt64(minSolOutput),
        ]),
      })
    );
    return this.client.sendRequest(transaction, payer, model, fee);
  }

  /**
   * 交易详情分析
   * @param value
   */
  async analyse(value: VersionedTransactionResponse) {
    const txType = {
      time: 0,
      token: '',
      signer: '',
      signature,
      bonding_curve: '',
      associated_bonding_curve: '',
      type: 'error',
      fee: 0,
      sol: 0,
      number: 0,
      token_reserves: 0,
      sol_reserves: 0,
    };
    var signature = value.transaction.signatures[0];
    txType.fee = value.meta.fee;
    txType.signature = signature;
    var accounts = value.transaction.message.staticAccountKeys;
    if (value.meta.loadedAddresses) {
      value.meta.loadedAddresses.writable.forEach(writable => {
        accounts.push(writable);
      });
      value.meta.loadedAddresses.readonly.forEach(readonly => {
        accounts.push(readonly);
      });
    }
    var pumpProgramIndex = -1,
      pumpRentIndex = -1,
      tokenProgramIndex = -1;
    accounts.forEach((ele, i) => {
      if (i == 0) {
        txType.signer = ele.toString();
      }
      if (ele.toString() == PUMP_FUN_PROGRAM.toString()) {
        pumpProgramIndex = i;
      }
      if (ele.toString() == RENT.toString()) {
        pumpRentIndex = i;
      }
      if (ele.toString() == TOKEN_PROGRAM_ID.toString()) {
        tokenProgramIndex = i;
      }
    });
    if (pumpProgramIndex < 0) {
      console.log(txType);
      return txType;
    }
    if (value.meta.err == null) {
      txType.time = value.blockTime;
    } else {
      return txType;
    }
    var bondingCurveIndex = 0,
      associatedBondingCurveIndex = 0;
    var compiledInstructions = value.transaction.message.compiledInstructions;
    compiledInstructions.forEach((ele, i) => {
      if (ele.programIdIndex == pumpProgramIndex) {
        var accountKeys = ele.accountKeyIndexes;
        if (accountKeys.length >= 12) {
          accountKeys.forEach((val, ii) => {
            if (ii == 2) {
              txType.token = accounts[val].toString();
            }
            if (ii == 3) {
              txType.bonding_curve = accounts[val].toString();
              bondingCurveIndex = val;
            }
            if (ii == 4) {
              txType.associated_bonding_curve = accounts[val].toString();
              associatedBondingCurveIndex = val;
            }
            if (ii == 9) {
              if (val == pumpRentIndex) {
                txType.type = 'buy';
              }
              if (val == tokenProgramIndex) {
                txType.type = 'sell';
              }
            }
          });
        }
        if (accountKeys.length == 14) {
          accountKeys.forEach((val, ii) => {
            if (ii == 0 && val == 1) {
              txType.type = 'create';
            }
          });
        }
      }
    });
    if (
      bondingCurveIndex == 0 ||
      associatedBondingCurveIndex == 0 ||
      bondingCurveIndex == undefined ||
      associatedBondingCurveIndex == undefined
    ) {
      value.meta.innerInstructions.forEach(val => {
        val.instructions.forEach(ins => {
          if (ins.programIdIndex == pumpProgramIndex) {
            if (ins.accounts.length >= 12) {
              ins.accounts.forEach((insAccount, insi) => {
                if (insi == 2) {
                  txType.token = accounts[insAccount].toString();
                }
                if (insi == 3) {
                  txType.bonding_curve = accounts[insAccount].toString();
                  bondingCurveIndex = insAccount;
                }
                if (insi == 4) {
                  txType.associated_bonding_curve = accounts[insAccount].toString();
                  associatedBondingCurveIndex = insAccount;
                }
                if (insi == 9) {
                  if (insAccount == pumpRentIndex) {
                    txType.type = 'buy';
                  }
                  if (insAccount == tokenProgramIndex) {
                    txType.type = 'sell';
                  }
                }
              });
            }
          }
        });
      });
    }
    var pollSol,
      beforeSol,
      beforeToken,
      pollToken,
      decimals = 0;
    value.meta.preTokenBalances.forEach(val => {
      if (val.accountIndex == associatedBondingCurveIndex) {
        beforeToken = val.uiTokenAmount.amount;
        decimals = val.uiTokenAmount.decimals;
      }
    });
    value.meta.postTokenBalances.forEach(val => {
      if (val.accountIndex == associatedBondingCurveIndex) {
        pollToken = val.uiTokenAmount.amount;
      }
    });
    value.meta.preBalances.forEach((val, i) => {
      if (i == bondingCurveIndex) {
        beforeSol = val;
      }
    });
    value.meta.postBalances.forEach((val, i) => {
      if (i == bondingCurveIndex) {
        pollSol = val;
      }
    });
    if (value.meta.preTokenBalances.length == 0) {
      beforeToken = 0;
    }
    txType.token_reserves = Math.floor(new Decimal(pollToken));
    txType.sol_reserves = pollSol;
    if (txType.type == 'buy') {
      txType.sol = new Decimal(pollSol)
        .sub(new Decimal(beforeSol))
        .div(new Decimal(1000000000))
        .toFixed(9);
      txType.number = new Decimal(beforeToken)
        .sub(new Decimal(pollToken))
        .div(10 ** decimals)
        .toFixed(decimals);
      redis.set('pump:' + txType.token, JSON.stringify(txType));
    }
    if (txType.type == 'sell') {
      txType.sol = new Decimal(beforeSol)
        .sub(new Decimal(pollSol))
        .div(new Decimal(1000000000))
        .toFixed(9);
      txType.number = new Decimal(pollToken)
        .sub(new Decimal(beforeToken))
        .div(10 ** decimals)
        .toFixed(decimals);
    }
    var noticeredis = await redis.get('teleNotice:' + signature);
    if (noticeredis) {
      var notice = JSON.parse(noticeredis);
      this.telegramNotice(signature, txType, Number(notice.chat_id), true);
    } else {
      var chatid = (await redis.get('chatid:' + txType.signer)) || '';
      if (chatid) {
        this.telegramNotice(signature, txType, Number(notice.chat_id), false);
      }
    }
  }

  /**
   * 交易成功消息通知
   * @param signature
   * @param txinfo
   * @param chat_id
   */
  async telegramNotice(signature: string, txinfo: any, chat_id: number, ifsave: boolean) {
    const bot = new Bot(config.botapi);
    var msg =
      "✅交易执行成功！<a href='https://solscan.io/tx/" + signature + "'>点击查看hash</a>\n\n";
    var balance = await this.client.getBalance(new PublicKey(txinfo.signer));
    var solNumber = Number(new Decimal(balance).div(new Decimal('1000000000'))).toFixed(4);
    var poolsize = await this.client.getBalance(new PublicKey(txinfo.bonding_curve));
    var sol = Number(new Decimal(poolsize).div(new Decimal('500000000'))).toFixed(4);
    var fee = Number(new Decimal(txinfo.fee).div(new Decimal('1000000000'))).toFixed(6);
    var price = '';
    var number = txinfo.number;
    var amount = txinfo.sol;
    if (number != 0) {
      price = Number(Number(amount) / Number(number)).toFixed(12);
    }
    var buyValue = Number(amount) * config.solprice;
    var myValue = Number(solNumber) * config.solprice;
    msg += '💳 SOL：' + amount + ' SOL ($' + buyValue.toFixed(2) + ')\n';
    msg += '🪙 代币：' + Number(number).toFixed(6) + ' \n';
    if (price) {
      msg +=
        '🎯 价格：' + price + ' SOL ($' + (Number(price) * config.solprice).toFixed(12) + ')\n';
    }
    msg += '📈 市值：' + sol + ' SOL ($' + (Number(sol) * config.solprice).toFixed(2) + ')\n';
    msg += '💰 钱包余额：' + solNumber + ' SOL ($' + myValue.toFixed(2) + ')\n\n';
    var type = txinfo.type;
    if (ifsave) {
      await redis.rpush(
        chat_id + ':trade:' + txinfo.token,
        JSON.stringify({ amount, price, signature, type, number, fee })
      );
      var tokenData = await new utils().getTokenData(txinfo.token, chat_id);
      msg = msg + tokenData.msg;
    }
    await bot.api.sendMessage(chat_id, msg, { parse_mode: 'HTML' });
  }

  /**
   * 自由狙击消息通知
   * @param signature
   * @param type
   * @param token
   * @param myaddress
   * @param gas
   */
  async telegramAuto(
    signature: string,
    type: string,
    token: string,
    myaddress: string,
    gas: number
  ) {
    var now = new Date();
    var msg = '✅';
    if (type == 'buy') {
      msg = msg + 'PUMP自由狙击买入成功!\n';
    } else if (type == 'sell') {
      msg = msg + 'PUMP自由狙击卖出成功!\n';
    }
    msg =
      msg +
      '\n交易地址：' +
      signature +
      '\n' +
      '代币地址：' +
      token +
      '\n' +
      'Gas费：' +
      gas +
      'sol\n' +
      '上链时间：' +
      now.getHours() +
      ':' +
      now.getMinutes() +
      ':' +
      now.getSeconds();
    const bot = new Bot(config.botapi);
    var chat_id = (await redis.get('member:' + myaddress)) || 0;
    try {
      console.log('chat_id', myaddress, chat_id);
      if (Number(chat_id) > 0) {
        await bot.api.sendMessage(Number(chat_id), msg, { parse_mode: 'HTML' });
      }
    } catch {
      console.log('模拟跟单失败');
    }
  }
}
export default PumpSwap;
