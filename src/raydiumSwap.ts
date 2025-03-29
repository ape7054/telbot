import { PublicKey, Keypair, Transaction,
    VersionedTransactionResponse,
    TokenBalance,
    ComputeBudgetProgram,
    SystemProgram,
  } from '@solana/web3.js'
  import { Bot } from "grammy";
  import {
    Liquidity,
    LiquidityPoolKeys,
    jsonInfo2PoolKeys,
    Token,
    TokenAmount,
    TOKEN_PROGRAM_ID,
    SPL_ACCOUNT_LAYOUT,
    ApiPoolInfoV4,
    LIQUIDITY_STATE_LAYOUT_V4,
    MARKET_STATE_LAYOUT_V3,
    Market,
    SPL_MINT_LAYOUT
  } from '@raydium-io/raydium-sdk'
  import {
    createCloseAccountInstruction,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountIdempotentInstruction,
    createInitializeAccountInstruction
  } from '@solana/spl-token';
  import 'dotenv/config';  
  import bs58 from 'bs58'
  import { Redis } from 'ioredis';
  import { config,request,utils } from './init'; // Import the configuration
  const Decimal = require('decimal.js');
  const redis = new Redis({host:config.rshost,port:6379,password:config.rspwd,db: config.rsdb});
  
  class RaydiumSwap {
    client: request
    constructor() {
      this.client = new request();
    }
  
    /**
     * 解析交易详情
     * @param value
     * @returns 
     */
    async analyse(value:VersionedTransactionResponse){
      const signature = value.transaction.signatures[0];
      const txType = {token:'',ammid:'',signer:'',signature,ammAuthority:'',amount:0,number:0,fee:0,pooladd:'',type:'error'};
      const compiledInstructions = value.transaction.message.compiledInstructions;
      txType.fee = value.meta.fee;
      if(compiledInstructions.length<2) return txType;
      const staticAccountKeys = value.transaction.message.staticAccountKeys;
      if(value.meta.loadedAddresses){
        value.meta.loadedAddresses.writable.forEach(writable => {
          staticAccountKeys.push(writable);
        })
        value.meta.loadedAddresses.readonly.forEach(readonly => {
          staticAccountKeys.push(readonly);
        })
      }
      txType.signer = staticAccountKeys[0].toString();
      let program1=-1,poolWsolIndex=-1,ammAuthorityIndex=-1,ammIdIndex = -1;
      staticAccountKeys.forEach((element,i) => {
        if(config.raydium_program == element.toString()){
          program1 = i;
        }
      });
      value.meta.innerInstructions.forEach(inner => {
        inner.instructions.forEach(instruction => {
          if(instruction.programIdIndex == program1){
            ammIdIndex = instruction.accounts[1];
            ammAuthorityIndex = instruction.accounts[2];
            poolWsolIndex = instruction.accounts[5];
          }
        })
      })
      compiledInstructions.forEach((element,i) => {
        if(element.programIdIndex == program1){
          ammIdIndex = element.accountKeyIndexes[1];
          ammAuthorityIndex = element.accountKeyIndexes[2];
          poolWsolIndex = element.accountKeyIndexes[5];
        }
      });
      console.log('raydium '+program1+" ammIdIndex"+ammIdIndex);
      staticAccountKeys.forEach((element,i) => {
        if(i == ammIdIndex){
          txType.ammid = element.toString();
        }
        if(i == poolWsolIndex){
          txType.pooladd = element.toString();
        }
        if(i == ammAuthorityIndex){
          txType.ammAuthority = element.toString();
        }
      });
      if(txType.ammid == '' && txType.token == ''){
        console.log('ammid kong',txType)
        return txType;
      }
      if(txType.ammid == txType.signer){
        txType.ammid = '';
        console.log('ammid error',txType)
        return txType;
      }
      var beforeWsol = 0,afterWsol =0;
      var beforeToken = 0,afterToken =0;
      var preTokens = value.meta.preTokenBalances;
      var postTokens = value.meta.postTokenBalances;
      var preToken:TokenBalance,postToken:TokenBalance,preSol:TokenBalance,postSol:TokenBalance;
      for (let i = 0; i < preTokens.length; i++) {  
        if(preTokens[i].owner==txType.ammAuthority){
          if(preTokens[i].mint == config.wsol){
              preSol = preTokens[i];
          }else{
              preToken = preTokens[i];
              beforeToken = Number(preToken.uiTokenAmount.uiAmount);
          }
        }
      }
      for (let i = 0; i < postTokens.length; i++) {  
        if(postTokens[i].owner==txType.ammAuthority){
          if(postTokens[i].mint == config.wsol){
              postSol = postTokens[i];
          }else{
              postToken = postTokens[i];
              afterToken = Number(postToken.uiTokenAmount.uiAmount);
          }
        }
      }
      if(preToken == null && postToken == null){
        txType.ammid = '';
        txType.type = 'null';
      }else if(preToken == null){
        txType.type = 'buy';
        txType.token = postToken.mint;
      }else if(postToken == null){
        txType.type = 'sell';
        txType.token = preToken.mint;
      }else if(preSol == null || postSol == null){
        console.log(preSol);
        console.log(postSol);
        console.log(preToken);
        console.log(postToken);
      }else{
        const beforeSol = new Decimal(preSol.uiTokenAmount.uiAmountString);
        const afterSol = new Decimal(postSol.uiTokenAmount.uiAmountString);
        if(Number(afterSol) > Number(beforeSol)){
          txType.type = 'buy';
          txType.token = postToken.mint;
          txType.amount = Number(afterSol.minus(beforeSol));
        }else{
          txType.type = 'sell';
          txType.token = postToken.mint;
          txType.amount = Number(beforeSol.minus(afterSol));
        }
      }
      console.log(value.blockTime)
      txType.number = beforeToken - afterToken;
      //交易成功后通知客户
      var noticeredis = await redis.get("teleNotice:"+txType.signature);
      if(noticeredis) {
        var notice = JSON.parse(noticeredis);
        this.telegramNotice(signature,txType,Number(notice.chat_id),Number(notice.time),value.blockTime,true);
      }else{
        var chatid = await redis.get("chatid:"+txType.signer) || '';
        if(chatid){
          this.telegramNotice(signature,txType,Number(chatid),Number(notice.time),value.blockTime,false);
        }
      }
      console.log('RayType',txType,noticeredis);
    }
  
    /**
     * 交易成功消息通知
     * @param signature 
     * @param txinfo 
     * @param chat_id 
     */
    async telegramNotice(signature:string,txinfo:any,chat_id:number,time:number,blockTime:number,ifsave:boolean){
      const bot = new Bot(config.botapi);
      var msg = "✅交易执行成功！<a href='https://solscan.io/tx/"+signature+"'>点击查看hash</a>\n\n";
      var balance = await this.client.getBalance(new PublicKey(txinfo.signer));
      var solNumber = Number((new Decimal(balance)).div(new Decimal('1000000000'))).toFixed(4); 
  
      var poolsize = await this.client.getBalance(new PublicKey(txinfo.pooladd));
      var sol = Number((new Decimal(poolsize)).div(new Decimal('500000000'))).toFixed(4); 
      var fee = Number((new Decimal(txinfo.fee)).div(new Decimal('1000000000'))).toFixed(6); 
      var price = '';
      var number = txinfo.number;
      if(number>0) price = Number(Number(txinfo.amount)/Number(number)).toFixed(6);
      var buyValue = Number(txinfo.amount)*config.solprice;
      var myValue = Number(solNumber)*config.solprice;
      var solValue = Number(sol)*config.solprice;
      let bdate = new Date(time*1000);
      msg = msg + '发起时间：'+bdate.getHours()+':'+bdate.getMinutes()+':'+bdate.getSeconds()+' \n';
      let now = new Date(blockTime*1000);
      msg = msg + '上链时间：'+now.getHours()+':'+now.getMinutes()+':'+now.getSeconds()+' \n';
      msg = msg + '💳 SOL：'+txinfo.amount+' SOL ($'+buyValue.toFixed(2)+')\n';
      msg = msg + '🪙 代币：'+number.toFixed(6)+' \n';
      if(price){
        var priceValue = Number(price)*config.solprice;
        msg = msg + '🎯 价格：'+price+' SOL ($'+priceValue.toFixed(9)+')\n';
      }
      msg = msg + '📈 市值：'+sol+' SOL ($'+solValue.toFixed(2)+')\n';
      msg = msg + '💰 钱包余额：'+chat_id+' '+solNumber+' SOL ($'+myValue.toFixed(2)+')\n\n';
      if(ifsave){
        await redis.rpush(chat_id+":trade:"+txinfo.token,JSON.stringify({amount:txinfo.amount,price,signature,type:txinfo.type,number,fee}));
        var tokenData = await (new utils()).getTokenData(txinfo.token,chat_id);
        msg = msg + tokenData.msg;
      }
      await bot.api.sendMessage( chat_id, msg, { parse_mode: "HTML" } );
    }
  
    randomString(length:number) {
      let result = '';
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const charactersLength = characters.length;
     
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
     
      return result;
    }
    /**
     * 买币和卖币
     * @param privatekey 
     * @param poolid 
     * @param type 
     * @param number 
     * @param gas 
     * @param model 
     * @param fee 
     * @returns 
     */
    async swapRaydium(
      privatekey:string, 
      poolid:string, 
      type:string, 
      number:number, 
      gas:number, 
      model:number, 
      fee:number
    ) : Promise<{error:string,hash?:string,time?:number}> { 
      var payer = Keypair.fromSecretKey(bs58.decode(privatekey));
      console.log(poolid,type,number,gas);
      const owner = payer.publicKey;
      var poolKeys = await this.checkPoolRedis(poolid, 0);
      var amount = number || 0;
      if(amount===undefined || amount ==0){
        return {error:'金额'+amount+'错误'};
      }
      let decimal = 9;
      let associatedAddressOut:PublicKey;
      let associatedAddressIn:PublicKey;
  
      // GAS费
      const transaction = new Transaction();
      if(gas>0 && gas<=0.1){
        var microLamports =  new Decimal(gas).mul(10**10).div(5);
        console.log(microLamports);
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }),
        )
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        )
      }
  
      // 生成WSOL账号
      const GREETING_SEED = this.randomString(32);
      var programId = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      let associatedWSol:PublicKey = await PublicKey.createWithSeed(
        payer.publicKey,
        GREETING_SEED,
        programId,
      );
      var SeedAmount = 0.00203928;
      if(type == 'buy') SeedAmount = Number(amount)+SeedAmount;
      const quoteAmountSeed = new TokenAmount(new Token(TOKEN_PROGRAM_ID,new PublicKey(config.wsol),decimal), SeedAmount, false);
      transaction.add(
        SystemProgram.createAccountWithSeed({
          fromPubkey: owner,
          newAccountPubkey: associatedWSol,
          basePubkey: owner,
          seed: GREETING_SEED,
          lamports: quoteAmountSeed.raw,
          space: 165,
          programId,
        })
      )
      transaction.add(
        createInitializeAccountInstruction(
          associatedWSol,
          new PublicKey(config.wsol),
          owner
        )
      )
      console.log(associatedWSol.toString())
      let toToken = '';
      let fromToken = '';
      if(type == 'buy'){
        fromToken = config.tokenAAddress;
        associatedAddressIn = associatedWSol;
        toToken = poolKeys!.baseMint.toString() == config.tokenAAddress ?
                  poolKeys!.quoteMint.toString():
                  poolKeys!.baseMint.toString();
        associatedAddressOut = getAssociatedTokenAddressSync(new PublicKey(toToken), owner);
        transaction.add(
          createAssociatedTokenAccountIdempotentInstruction(
            owner,
            associatedAddressOut,
            owner,
            new PublicKey(toToken),
          )
        );
      }else{
        if(poolKeys!.baseMint.toString() == config.wsol){
          toToken = poolKeys!.baseMint.toString();
          fromToken = poolKeys!.quoteMint.toString();
          decimal = poolKeys!.quoteDecimals;
        }else{
          toToken = poolKeys!.quoteMint.toString();
          fromToken = poolKeys!.baseMint.toString();
          decimal = poolKeys!.baseDecimals;
        }
        console.log(associatedWSol.toString())
        associatedAddressOut = associatedWSol;
        associatedAddressIn = getAssociatedTokenAddressSync(new PublicKey(fromToken), owner);
        var bili = amount;
        var account = await this.client.getAccountInfo(associatedAddressIn);
        if(!account) return {error:'associatedAddressIn错误'};
        var accountInfo = SPL_ACCOUNT_LAYOUT.decode(account.data);
        var tokenBalance = new Decimal(accountInfo.amount.toString());
        amount = tokenBalance.div(new Decimal(10**decimal)) * bili;
        console.log(tokenBalance,bili,amount);
      }
      const quoteAmount = new TokenAmount(new Token(TOKEN_PROGRAM_ID,new PublicKey(fromToken),decimal), amount, false);
      console.log(fromToken,decimal,amount,associatedAddressIn.toString(),associatedAddressOut.toString());
      const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
        {
          poolKeys: poolKeys!,
          userKeys: {
            tokenAccountIn: associatedAddressIn,
            tokenAccountOut: associatedAddressOut,
            owner: owner,
          },
          amountIn: quoteAmount.raw,
          minAmountOut: 0,
        },
        poolKeys!.version,
      );
      transaction.add(...innerTransaction.instructions);
      // 关闭账号
      transaction.add(
        createCloseAccountInstruction(
          associatedWSol, 
          owner,
          owner
        )
      )
      var client = new request();
      return client.sendRequest(transaction,payer,model,fee);
    }
  
    async formatAmmKeysById(id: string): Promise<ApiPoolInfoV4 | null> {
      const account = await this.client.getAccountInfo(new PublicKey(id))
      if (account === null) {
        console.log('get id info error: '+id);
        return null;
      }
      const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)
    
      const marketId = info.marketId
      const marketAccount = await this.client.getAccountInfo(marketId)
      if (marketAccount === null) {
        console.log('get market info error: '+id);
        return null;
      }
      const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)
    
      const lpMint = info.lpMint
      const lpMintAccount = await this.client.getAccountInfo(lpMint)
      if (lpMintAccount === null) {
        console.log('get lp mint info error: '+id);
        return null;
      }
      const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)
    
      return {
        id,
        baseMint: info.baseMint.toString(),
        quoteMint: info.quoteMint.toString(),
        lpMint: info.lpMint.toString(),
        baseDecimals: info.baseDecimal.toNumber(),
        quoteDecimals: info.quoteDecimal.toNumber(),
        lpDecimals: lpMintInfo.decimals,
        version: 4,
        programId: account.owner.toString(),
        authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
        openOrders: info.openOrders.toString(),
        targetOrders: info.targetOrders.toString(),
        baseVault: info.baseVault.toString(),
        quoteVault: info.quoteVault.toString(),
        withdrawQueue: info.withdrawQueue.toString(),
        lpVault: info.lpVault.toString(),
        marketVersion: 3,
        marketProgramId: info.marketProgramId.toString(),
        marketId: info.marketId.toString(),
        marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
        marketBaseVault: marketInfo.baseVault.toString(),
        marketQuoteVault: marketInfo.quoteVault.toString(),
        marketBids: marketInfo.bids.toString(),
        marketAsks: marketInfo.asks.toString(),
        marketEventQueue: marketInfo.eventQueue.toString(),
        lookupTableAccount: PublicKey.default.toString()
      }
    }
    
    async checkPoolRedis(poolid: string, ext: number,): Promise<LiquidityPoolKeys | null> {
      var  poolInfo = await this.formatAmmKeysById(poolid);
      return jsonInfo2PoolKeys(poolInfo) as LiquidityPoolKeys;
    }
  
    async hashDetail(value: VersionedTransactionResponse,signer: string,token: string,solprice: number){
      var beforeWsol = 0,afterWsol =0;
      var beforeToken = 0,afterToken =0;
      var preTokenBalances = value.meta.preTokenBalances;
      preTokenBalances.forEach(item=>{
        if(item.owner == signer && item.mint == config.wsol){
          beforeWsol = Number(item.uiTokenAmount.uiAmount);
        }
        if(item.owner == signer && item.mint == token){
          beforeToken = Number(item.uiTokenAmount.uiAmount);
        }
      })
      var postTokenBalances = value.meta.postTokenBalances;
      postTokenBalances.forEach(item=>{
        if(item.owner == signer && item.mint == config.wsol){
          afterWsol = Number(item.uiTokenAmount.uiAmount);
        }
        if(item.owner == signer && item.mint == token){
          afterToken = Number(item.uiTokenAmount.uiAmount);
        }
      })
      var sol = Number(beforeWsol - afterWsol).toFixed(6);
      var number = Number(afterToken - beforeToken).toFixed(6);
      var price = Number(Number(sol)*solprice/Number(number)).toFixed(6);
      // console.log(beforeWsol,afterWsol)
      // console.log(beforeToken,afterToken)
      return {sol,number,price}
    }
  
    //增强Grpc的参数解析
    async analyseatlas(value: { transaction: { message: { accountKeys: any; instructions: any; }; signatures: string[]; }; meta: { err: null; loadedAddresses: { writable: any[]; readonly: any[]; }; innerInstructions: any[]; preTokenBalances: any; postTokenBalances: any; }; })
    {
      var accounts = value.transaction.message.accountKeys;
      const txType = {slot:0,time:0,usdt:0,token:'',ammid:'',signer:'',signature:'',type:'error',ammAuthority:'',number:0,sol:0,decimals:0,model:'Raydium',token_reserves:0,sol_reserves:0,usdt_reserves:0};
      if(value.meta.err == null){
          txType.signer = accounts[0].pubkey;
          txType.signature = value.transaction.signatures[0];
      }else{
          return {type:'error'};
      }
      if(value.meta.loadedAddresses){
          console.log(value.meta.loadedAddresses);
          value.meta.loadedAddresses.writable.forEach(writable => {
              accounts.push(writable);
          })
          value.meta.loadedAddresses.readonly.forEach(readonly => {
              accounts.push(readonly);
          })
      }
      var hidden = 0;
      accounts.forEach((element:any) => {
          if('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' == element.pubkey){
              hidden++;
          }
          if('2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c' == element.pubkey){
              hidden++;
          }
          if('AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6' == element.pubkey){
              hidden++;
          }
          if('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo' == element.pubkey){
              hidden++;
          }
      });
      if(hidden>0){
          return txType;
      }
      var swapNum = 0;
      var compiledInstructions = value.transaction.message.instructions;
      compiledInstructions.forEach((element: { programId: string; accounts: string | any[]; },i: any) => {
          if(element.programId == '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'){
              if(element.accounts.length==21){
                  txType.ammid = element.accounts[4];
                  txType.ammAuthority = element.accounts[5];
                  if(txType.signer == '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg'){
                      txType.type = 'pumptoRay';
                      console.log('pumptoRay',txType);
                      return txType;
                  }
                  txType.type = 'addpool';
              }else{
                  swapNum++;
                  txType.ammid = element.accounts[1];
                  txType.ammAuthority = element.accounts[2];
              }
          }
      });
      if(txType.ammid==''){
          value.meta.innerInstructions.forEach(inner => {
              inner.instructions.forEach((instruction:any) => {
                  if(instruction.programId == '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'){
                      swapNum++;
                      txType.ammid = instruction.accounts[1];
                      txType.ammAuthority = instruction.accounts[2];
                      //const raydiumValue = RAYDIUM_LAYOUT.decode(new Buffer(instruction.data),RAYDIUM_LAYOUT.span);
                      //console.log(raydiumValue);
                  }
              })
          })
          if(txType.ammid==''){
              console.log('no ammId:'+txType.signature);
          }
      }
      if(swapNum>5) return txType;
      var beforeToken,pollToken,pollWsol,beforeWsol,beforeUsdt,pollUsdt,decimals=0;
      var preTokens = value.meta.preTokenBalances;
      var postTokens = value.meta.postTokenBalances;
  
      var useMint = config.wsol;
      var useSOL = 0, useUSDT = 0;
      preTokens.forEach((val:any) => {
        if(val.owner == txType.ammAuthority){
          if(val.mint == config.wsol){
            useSOL++;
          }
          if(val.mint == 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'){
            useUSDT++;
          }
        }
      })
      if(useSOL==0 && useUSDT>0){
          useMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      }
      preTokens.forEach((val:any) => {
          if(val.owner == txType.ammAuthority){
              if(val.mint == useMint){
                  if(useMint==config.wsol){
                      beforeWsol = val.uiTokenAmount.amount;
                  }else{
                      beforeUsdt = val.uiTokenAmount.amount;
                  }
              }else{
                  beforeToken = val.uiTokenAmount.amount;
                  decimals = val.uiTokenAmount.decimals;
                  txType.token = val.mint;
              }
          }
      })
      
      postTokens.forEach((val: { owner: string; mint: string; uiTokenAmount: { amount: any; decimals: number; }; }) => {
          if(val.owner == txType.ammAuthority){
              if(val.mint == useMint){
                  if(useMint==config.wsol){
                      pollWsol = val.uiTokenAmount.amount;
                  }else{
                      pollUsdt = val.uiTokenAmount.amount;
                  }
              }else{
                  pollToken = val.uiTokenAmount.amount;
                  decimals = val.uiTokenAmount.decimals;
                  txType.token = val.mint;
              }
          }
      })
      // console.log(beforeWsol,pollWsol,beforeUsdt,pollUsdt);
      // console.log(beforeToken,pollToken);
      if(txType.type == 'addpool'){
          txType.token_reserves = pollToken;
          txType.sol_reserves = pollWsol;
          txType.decimals = decimals;
          //console.log(txType.signature);
          var poolsize = Math.floor(new Decimal(pollWsol).div(new Decimal(1000000000)).toFixed(9));
          if(beforeWsol == undefined || beforeToken == undefined){
              txType.type = 'newpool';
              //if(poolsize>10){
                  //await this.sniperInfo(accounts, decimals);
              //}
          }
          console.log(txType,poolsize);
          return txType;
      }
      try {
          if(beforeWsol != undefined && pollWsol != undefined){
              txType.sol = ((new Decimal(beforeWsol)).sub(new Decimal(pollWsol))).div(new Decimal(1000000000)).toFixed(9);
              txType.sol_reserves = pollWsol;
          }
          if(beforeUsdt != undefined && pollUsdt != undefined){
              txType.usdt = ((new Decimal(beforeUsdt)).sub(new Decimal(pollUsdt))).div(new Decimal(1000000)).toFixed(6);
              txType.usdt_reserves = pollUsdt;
          }
          txType.number = ((new Decimal(beforeToken)).sub(new Decimal(pollToken)).div(10**decimals)).toFixed(decimals);
          txType.type = txType.number<0 ? 'sell' : 'buy';
          txType.decimals = decimals;
          txType.token_reserves = Math.floor(new Decimal(pollToken));
      } catch (error) {
          console.log('raydiumerror', txType.signature);
      }
      return txType;
    }
  }
    
  export default RaydiumSwap