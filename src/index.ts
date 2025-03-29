import { PublicKey,Connection } from '@solana/web3.js';
import { Redis } from 'ioredis';
import { config } from './init';
import Tapchain from './tapchain0';
const tapchain = new Tapchain();

/**
 * 当前文件主要功能是交易后消息提醒功能
 */
let existingTxs: Set<string> = new Set<string>();
let signatures: Set<string> = new Set<string>();
let nowParsedTxs: Set<string> = new Set<string>();
let falseParsedTxs: Set<string> = new Set<string>();
let parsedTxs: Set<string> = new Set<string>();
interface obj{[idx:string]:any}
let hashNull:obj = {};
// 创建 Solana 日志监听器
const listeners:number[] = [];
const redis = new Redis({host: config.rshost, port:6379, password:config.rspwd, db: config.rsdb});
const redis2 = new Redis({host: config.rshost, port:6379, password:config.rspwd, db: config.rsdb});
const solana = new Connection(config.RPC_URL, {wsEndpoint: config.WSS_URL,commitment:'processed',disableRetryOnRateLimit:true});
const solanabig = new Connection(config.RPC_URL, {commitment:'processed',disableRetryOnRateLimit:true});
updateListenersFromRedis();
function createLogListener(accountAddress:string) {
    console.log('Creating log listener for account:', accountAddress);
    // 创建监听器
    const subscriptionId = solana.onLogs(new PublicKey(accountAddress), async(log:any) => {
        // 在这里执行你想要的操作，例如处理日志信息
        if(log.err==null){
            let existTx = existingTxs.has(log.signature);
            if(!existTx){
                existingTxs.add(log.signature);
                var swaptype = 0;
                var logs = log.logs;
                if (logs.includes("Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 success")) {
                    swaptype = 1;
                }else if (logs.includes("Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success")) {
                    swaptype = 2;
                }else if (logs.includes("Program  success")) {
                    swaptype = 2;
                }
                else if (logs.includes("Program  success")) {
                    swaptype = 2;
                }
                if(swaptype==1 || swaptype==2){
                    var value = await solana.getTransaction(
                        log.signature,
                        { maxSupportedTransactionVersion: 0,commitment: "confirmed" }
                    );
                    if(value==null){
                        signatures.add(log.signature);
                    }else{
                        parsedTxs.add(log.signature);
                        tapchain.analyse(value);
                    }
                }
            }
        }
    },"processed"); 
    return subscriptionId;
}

// 从 Redis 获取账户地址并更新监听器
async function updateListenersFromRedis() {
    try {
        // 从 Redis 中获取账户地址
        const member_address = await redis2.lrange('member_address', 0, -1);
        // 停止之前的监听器
        stopListeners();
        // 创建新的监听器
        member_address.forEach((address: string) => {
            const subscriptionId = createLogListener(address);
            listeners.push(subscriptionId);
        });
    } catch (error) {
        console.error('Error updating listeners from Redis:', error);
    }

    setInterval(async() => {
        if(signatures.size>0) {
            var nowParse = nowParsedTxs;
            checkTransaction(nowParse)
        };
    }, 50);

    //把失败的重新添加到正在查询队列中
    setInterval(async() => {
        if(falseParsedTxs.size>0) {
            var txs = Array.from(falseParsedTxs);
            falseParsedTxs.clear();
            txs.forEach(tx=>{
                nowParsedTxs.delete(tx)
            })
        };
    }, 200);
}

redis.subscribe('account_addresses_update','hashcheck', res => {
    console.log(res);
});

// 监听 Redis 键空间通知
redis.on('message', async(channel:string,msg:any) => {
    if (channel === 'account_addresses_update') {
        console.log('Account addresses changed, updating listeners...');
        updateListenersFromRedis();
    }
    if (channel === 'hashcheck') {
        signatures.add(msg);
    }
});

async function checkTransaction(nowParsed: Set<string>){
    var time = new Date().getTime();
    var arrayNo = Array.from(signatures);//待查询列表
    var noParseds:string[] = [];
    var msg = time+'  应该查询:'+signatures.size+' 原有查询:'+nowParsed.size;
    arrayNo.forEach(tx=>{
        if(parsedTxs.has(tx)){
            //已经查询完毕了
        }else{
            if(nowParsed.has(tx)){
                //正在查询中
            }else{
                //console.log('添加查询'+tx);
                nowParsedTxs.add(tx); 
                noParseds.push(tx);
            }
        }
    })
    if(noParseds.length==0) return '';
    msg = msg+' 现在查询:'+nowParsedTxs.size+' 本次查询:'+noParseds.length,'\n';

    if(noParseds.length==1){
        var one = noParseds[0];
        solana.getTransaction(one,{maxSupportedTransactionVersion: 0,commitment: "confirmed" }).then(async value=>{
            if(value==null){
                console.log('查询失败',one,hashNull[one]);
                if(Number.isNaN(hashNull[one])){
                    hashNull[one] = 1;
                }else{
                    hashNull[one] = Number(hashNull[one]) + 1;
                }
                if(hashNull[one]>=300){
                    tapchain.getFalseHash(one);//console.log('通知抓起失败');
                }else{
                    falseParsedTxs.add(one);
                }
            }else{
                parsedTxs.add(one);
                signatures.delete(one);
                nowParsedTxs.delete(one);
                tapchain.analyse(value);
            }
        }).catch(err=>{
            console.log('getTransaction',err);
        })
        return '';
    }
    solanabig.getTransactions(
        noParseds,{ maxSupportedTransactionVersion: 0,commitment: "confirmed" }
    ).then(async values=>{
        try {
            for (let index = 0; index < values.length; index++) {
                const value = values[index];
                if(value==null){
                    nowParsedTxs.delete(noParseds[index]);
                }else{
                    var signature = value.transaction.signatures[0];
                    signatures.delete(signature);
                    nowParsedTxs.delete(signature);
                    parsedTxs.add(signature);
                    tapchain.analyse(value);
                }
            }
        } catch (error) {
            noParseds.forEach(tx=>{
                nowParsedTxs.delete(tx);
            })
            console.log(error);
        }
    }).catch(err=>{
        console.log(err);
    })
}

// 停止监听器
function stopListeners() {
    listeners.forEach(subscriptionId => {
        solana.removeOnLogsListener(subscriptionId);
    });
}