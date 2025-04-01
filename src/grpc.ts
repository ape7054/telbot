// 导入必要的库和模块
import Client from "@triton-one/yellowstone-grpc"; // 导入GRPC客户端，用于连接Solana区块链
import { SubscribeRequest } from "@triton-one/yellowstone-grpc"; // 导入订阅请求类型
import { config } from './init'; // 导入配置信息
import { PublicKey } from '@solana/web3.js'; // 导入Solana公钥类
import base58 from "bs58"; // 导入base58编码工具，用于处理Solana地址和签名
import Tapchain from './tapchain0'; // 导入自定义的Tapchain类，用于处理链上数据

const Decimal = require('decimal.js'); // 导入Decimal.js库，用于高精度数值计算
const tapchain = new Tapchain(); // 创建Tapchain实例

// 启动数据加载函数
loadData();

/**
 * 主函数：连接GRPC服务器并订阅交易数据
 */
async function loadData(){
    // 创建GRPC客户端连接
    const client = new Client(config.grpc_url,"",[]);
    // 订阅交易流
    const stream = await client.subscribe();
    // 创建程序公钥对象
    const PUMP_PROGRAM    = new PublicKey(config.pump_program); // Pump程序的公钥
    const RAYDIUM_PROGRAM = new PublicKey(config.raydium_program); // Raydium程序的公钥
    console.log("GRPC服务器URL:", config.grpc_url); // 打印GRPC服务器URL
    
    // 监听交易数据流
    stream.on("data", (data: { transaction: { transaction: any; slot: any; }; filters: string[]; }) => {
        // 处理Pump程序相关交易
        if(data?.transaction && data.filters[0] == 'pumpFun'){
            var value = data?.transaction.transaction; // 获取交易数据
            var slot = data?.transaction.slot; // 获取交易所在的区块槽位
          
            var signature = base58.encode(Buffer.from(value.signature,'base64')) // 将交易签名从base64转为base58格式
            
            // 创建交易信息对象，用于存储解析后的数据
            var hashInfo = {
                signer:'', // 交易签名者
                token:'', // 代币地址
                signature, // 交易签名
                slot:Number(slot), // 区块槽位
                bonding_curve:"", // 绑定曲线地址
                associated_bonding_curve:'', // 关联绑定曲线地址
                poolsize:0, // 池子大小(SOL)
                sol:0, // 交易SOL数量
                number:0, // 交易代币数量
                token_reserves:0, // 代币储备量
                sol_reserves:0, // SOL储备量
                type:'', // 交易类型(buy/sell/create)
                holdnum:0 // 持有数量
            };
            
            // 解析交易中的账户信息
            let accounts: string[] = [];
            var accountKeys = value.transaction.message.accountKeys; // 主要账户
            var loadedWritableAddresses = value.meta.loadedWritableAddresses; // 可写账户
            var loadedReadonlyAddresses = value.meta.loadedReadonlyAddresses; // 只读账户
            // 将所有账户地址转换为base58格式并添加到accounts数组
            let accountCount = 0; // 初始化账户计数器
            accountKeys.forEach((ele: string) => {
                const base58Address = base58.encode(Buffer.from(ele,'base64'));
                accounts.push(base58Address);
                accountCount++; // 增加计数
                console.log(`账户地址 ${accountCount}:`, base58Address); // 显示带编号的账户地址
            })
            
            loadedWritableAddresses.forEach((ele: string) => {
                const base58Address = base58.encode(Buffer.from(ele,'base64'));
                accounts.push(base58Address);
                console.log('可写账户地址:', base58Address); // 调试输出可写账户地址
            })
            
            loadedReadonlyAddresses.forEach((ele: string) => {
                const base58Address = base58.encode(Buffer.from(ele,'base64'));
                accounts.push(base58Address);
                console.log('只读账户地址:', base58Address); // 调试输出只读账户地址
                
            })
            
            console.log('所有账户地址列表:', accounts); // 调试输出完整的账户地址列表
            // 查找Pump程序在账户列表中的索引
            var pumpProgramIndex=-1;
        
            accounts.forEach((val,i) => {
                if(i == 0){
                    hashInfo.signer = val; // 第一个账户通常是交易签名者
                }
                if(val == PUMP_PROGRAM.toString()){
                    pumpProgramIndex = i; // 记录Pump程序的索引
                }
            });
            
            // 初始化变量
            var iscreate = 0; // 是否是创建池子的交易
            var bondingCurveIndex: any, associatedBondingCurveIndex: any, tokenIndex = 0;
            
            // 解析交易指令
            var instructions = value.transaction.message.instructions;
            instructions.forEach((element: { programIdIndex: number; accounts: { toJSON: () => { (): any; new(): any; data: any; }; }; }) => {
                // 查找Pump程序的指令
                
                if(element.programIdIndex == pumpProgramIndex){
                    // 从element.accounts中获取账户数据并转换为JSON格式
                    var accountsData = element.accounts.toJSON().data;
                    // 长度为12的指令通常是交易指令
                    if(accountsData.length==12){
                        accountsData.forEach((ele: number,i: number)=>{
                            if(i==2) {
                                hashInfo.token = accounts[ele]; // 代币地址
                                tokenIndex = ele;
                            }
                            if(i==3) {
                                bondingCurveIndex = ele; // 绑定曲线索引
                                hashInfo.bonding_curve = accounts[ele]; // 绑定曲线地址
                            }
                            if(i==4) {
                                associatedBondingCurveIndex = ele; // 关联绑定曲线索引
                                hashInfo.associated_bonding_curve = accounts[ele]; // 关联绑定曲线地址
                            }
                        })
                    }else if(accountsData.length==14){
                        // 长度为14的指令通常是创建池子的指令
                        iscreate++;
                    }
                }
            });
            
            // 解析内部指令
            var instructions = value.meta.innerInstructions;
            instructions.forEach((ele1: { instructions: any; }) => {
                var ins = ele1.instructions;
                ins.forEach((ele2: { programIdIndex: number; accounts: { toJSON: () => { (): any; new(): any; data: any; }; }; }) => {
                    // 查找Pump程序的内部指令
                    if(ele2.programIdIndex == pumpProgramIndex){
                        var accountsData = ele2.accounts.toJSON().data;
                        accountsData.forEach((ele: number,i: number)=>{
                            if(i==2) {
                                hashInfo.token = accounts[ele]; // 代币地址
                                tokenIndex = ele;
                            }
                            if(i==3) {
                                bondingCurveIndex = ele; // 绑定曲线索引
                                hashInfo.bonding_curve = accounts[ele]; // 绑定曲线地址
                            }
                            if(i==4) {
                                associatedBondingCurveIndex = ele; // 关联绑定曲线索引
                                hashInfo.associated_bonding_curve = accounts[ele]; // 关联绑定曲线地址
                            }
                        })
                    }
                });
            })
            
            // 初始化代币余额变量
            var pollSol=0, beforeSol=0, beforeToken=0, pollToken=0, decimals = 0;
            
            // 解析交易前代币余额
            if(value.meta.preTokenBalances.length==0){
                beforeToken = 0; // 如果没有交易前余额记录，设为0
            }else{
                value.meta.preTokenBalances.forEach((val: { accountIndex: any; uiTokenAmount: { amount: number; decimals: number; }; }) => {
                    if(val.accountIndex == associatedBondingCurveIndex){
                        beforeToken = val.uiTokenAmount.amount; // 交易前代币数量
                        decimals = val.uiTokenAmount.decimals; // 代币小数位数
                    }
                });
            }
            
            // 解析交易后代币余额
            if(value.meta.postTokenBalances.length==0){
                pollToken = 0; // 如果没有交易后余额记录，设为0
                console.log('postTokenBalances 0',hashInfo.signature);
            }else{
                value.meta.postTokenBalances.forEach((val: { accountIndex: number; owner: string; mint: string; uiTokenAmount: { amount: number, uiAmount:number; decimals: number; }; }) => {
                    if(val.accountIndex == associatedBondingCurveIndex){
                        pollToken = val.uiTokenAmount.amount; // 交易后代币数量
                        decimals = val.uiTokenAmount.decimals; // 代币小数位数
                    }
                    if(val.owner == hashInfo.signer && val.mint == hashInfo.token){
                        hashInfo.holdnum = val.uiTokenAmount.uiAmount; // 签名者持有的代币数量
                    }
                });
            }
            
            // 解析交易前SOL余额
            value.meta.preBalances.forEach((val: number,i: any) => {
                if(i==bondingCurveIndex){
                    beforeSol = val; // 交易前SOL数量
                }
            })
            
            // 解析交易后SOL余额
            value.meta.postBalances.forEach((val: number,i: any) => {
                if(i==bondingCurveIndex){
                    pollSol = val; // 交易后SOL数量
                }
            })
            
            // 如果代币有小数位数，计算交易相关数据
            if(decimals>0){
                // 计算SOL变化量(单位：SOL)
                hashInfo.sol = ((new Decimal(beforeSol)).sub(new Decimal(pollSol))).div(new Decimal(1000000000)).toFixed(9);
                // 计算代币储备量
                hashInfo.token_reserves = Math.floor(new Decimal(pollToken));
                // 计算SOL储备量
                hashInfo.sol_reserves = Number(pollSol);
                // 计算池子大小(单位：SOL)
                hashInfo.poolsize = new Decimal(pollSol).div(new Decimal(1000000000)).toFixed(9);
                
                if(iscreate==1){
                    // 如果是创建池子的交易
                    // 计算代币数量变化
                    hashInfo.number = ((new Decimal(pollToken)).sub(new Decimal(beforeToken)).div(10**decimals)).toFixed(decimals);
                    hashInfo.type = 'create'; // 设置交易类型为创建
                    // 调用创建新池子的方法
                    tapchain.newPumpPool(hashInfo.token,hashInfo.signer,hashInfo);
                }else{
                    // 如果是交易
                    // 计算代币数量变化
                    hashInfo.number = ((new Decimal(beforeToken)).sub(new Decimal(pollToken)).div(10**decimals)).toFixed(decimals);
                    // 根据代币数量变化判断交易类型(买入/卖出)
                    hashInfo.type = Number(beforeToken)>Number(pollToken)?'buy':'sell';
                    // 发送交易信息
// 输出交易链接到控制台
                    console.log(`交易链接：https://solscan.io/tx/${signature}`);

                    
                    console.log('Debug rayInfo:', JSON.stringify(hashInfo, null, 2));


                    tapchain.sendPumpInfo(hashInfo);


                    process.exit(0);

                    //tapchain.analyseSignerData(hashInfo);
                }
            }
        }
        

        
        // 处理Raydium程序相关交易
        if(data?.transaction && data.filters[0] == 'raydiumFun'){
            // 获取交易数据
            var value = data?.transaction.transaction;
            // 获取交易签名列表
            var signatures = value.transaction.signatures;
            // 获取交易所在的区块槽位
            var slot = data?.transaction.slot;
            // 将交易签名从base64转为base58格式
            var signature = base58.encode(Buffer.from(value.signature,'base64'));
            
            // 创建Raydium交易信息对象，用于存储交易相关数据
            var rayInfo = {
                signer:'',      // 交易签名者地址
                slot:Number(slot), // 交易所在区块槽位
                signature,      // 交易签名
                token:'',       // 代币地址
                ammid:"",       // 自动做市商ID
                type:'',        // 交易类型(buy/sell)
                poolsize:0,     // 流动性池大小
                sol:0,          // SOL数量
                price:'',       // 交易价格
                number:0,       // 交易代币数量
                token_reserves:0, // 代币储备量
                sol_reserves:0,   // SOL储备量
                holdnum:0       // 持有数量
            };
            
            // 解析交易中的账户信息
            let accounts: string[] = [];
            // 主要账户
            var accountKeys = value.transaction.message.accountKeys;
            // 可写账户
            var loadedWritableAddresses = value.meta.loadedWritableAddresses;
            // 只读账户
            var loadedReadonlyAddresses = value.meta.loadedReadonlyAddresses;
            
            // 将所有账户地址转换为base58格式并添加到accounts数组
            accountKeys.forEach((ele: string) => {
                accounts.push(base58.encode(Buffer.from(ele,'base64')));
            })
            loadedWritableAddresses.forEach((ele: string) => {
                accounts.push(base58.encode(Buffer.from(ele,'base64')));
            })
            loadedReadonlyAddresses.forEach((ele: string) => {
                accounts.push(base58.encode(Buffer.from(ele,'base64')));
            })
            
            // 遍历账户列表查找各种程序的索引位置
            var rayProgramIndex = -1, tokenProgramIndex=-1, lifinityProgramIndex=-1;
            accounts.forEach((val,i) => {
                // 第一个账户为交易签名者
                if(i == 0){
                    rayInfo.signer = val;
                }
                // 查找Raydium程序索引
                if(val == RAYDIUM_PROGRAM.toString()){
                    rayProgramIndex = i;
                }
                // 检查是否为Raydium权限账户
                if(val == config.raydium_authority){
                }
                // 查找Token程序索引
                if(val == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'){
                    tokenProgramIndex = i;
                }
                // 检查是否为Jupiter程序账户
                if(val == 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'){
                }
                // 查找Lifinity程序索引
                if(val == '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c'){
                    lifinityProgramIndex = i;
                }
                // 如果遇到特定账户则提前返回
                if(val == '5YET3YapxD6to6rqPqTWB3R9pSbURy6yduuUtoZkzoPX'){
                    return rayInfo;
                }
            });
            // 初始化变量
            var iscreate = 0, atoken = '', btoken='', hasRaydium=0;
            var ammids:string[] = [];
            
            // 解析交易指令
            var instructions = value.transaction.message.instructions;
            instructions.forEach((element: { programIdIndex: number; accounts: { toJSON: () => { (): any; new(): any; data: any; }; }; }) => {
                if(element.programIdIndex == rayProgramIndex){
                var accountsData = element.accounts.toJSON().data;
              
                    if(accountsData.length==21){
                        accountsData.forEach((ele: number,i: number)=>{
                            if(i==4) rayInfo.ammid = accounts[ele];
                            if(i==8) atoken = accounts[ele];
                            if(i==9) btoken = accounts[ele];
                        });
                        iscreate = 1;
                    }else{
                        hasRaydium++;
                        accountsData.forEach((ele: number,i: number)=>{
                            if(i==1)  {
                                ammids.push(accounts[ele]);
                            }
                        });
                    }
                }
            });
            
            // 如果没有找到Raydium指令，查找内部指令
            if(hasRaydium==0){
                var instructions = value.meta.innerInstructions;
                instructions.forEach((ele1: { instructions: any; }) => {
                    var ins = ele1.instructions;
                    ins.forEach((ele2: { programIdIndex: number; accounts: { toJSON: () => { (): any; new(): any; data: any; }; }; }) => {
                        if(ele2.programIdIndex == rayProgramIndex){
                            hasRaydium++;
                            var accountsData = ele2.accounts.toJSON().data;
                            accountsData.forEach((ele: number,i: number)=>{
                                if(i==1){
                                    ammids.push(accounts[ele]);
                                }
                            })
                        }
                    })
                })
            }
            
            // 如果是创建池子的交易,调用tapchain的newRayPool方法处理新池子创建
            if(iscreate==1){
                tapchain.newRayPool(value,rayInfo,atoken,btoken,accounts);
            }
            // 如果找到了一个AMM ID，处理交易
            if(ammids.length==1){
                if(ammids.length==1) rayInfo.ammid = ammids[0];
                
                // 初始化变量
                var decimals=0;
                var preTokens = value.meta.preTokenBalances;
                var postTokens = value.meta.postTokenBalances;
                var useMint = config.wsol;
                var useSOL = 0, useUSDT = 0;
                
                // 检查交易中使用的是SOL还是USDT
                preTokens.forEach((val:any) => {
                    if(val.owner == config.raydium_program){
                        if(val.mint == config.wsol){
                            useSOL++;
                        }
                        if(val.mint == config.usdt){
                            useUSDT++;
                        }
                    }
                })
                
                // 如果没有使用SOL但使用了USDT，则设置为USDT
                if(useSOL==0 && useUSDT>0){
                    useMint = config.usdt;
                }
                
                // 解析交易前代币余额
                preTokens.forEach((val:any) => {
                    if(val.owner == config.raydium_authority){
                        if(val.mint == useMint){
                        }else{
                            beforeToken = val.uiTokenAmount.amount;
                            decimals = val.uiTokenAmount.decimals;
                            rayInfo.token = val.mint;
                        }
                    }
                })
                
                // 解析交易后代币余额
                postTokens.forEach((val: { owner: any; mint: string; uiTokenAmount: { amount: number; uiAmount: any; decimals: number; }; }) => {
                    if(val.owner == config.raydium_authority){
                        if(val.mint == useMint){
                            rayInfo.sol_reserves = val.uiTokenAmount.amount;
                            rayInfo.poolsize = val.uiTokenAmount.uiAmount;
                        }else{
                            rayInfo.token_reserves = val.uiTokenAmount.amount;
                            pollToken = val.uiTokenAmount.amount;
                            decimals = val.uiTokenAmount.decimals;
                            rayInfo.token = val.mint;
                        }
                    }
                    if(val.owner == rayInfo.signer && val.mint == rayInfo.token){
                        rayInfo.holdnum = val.uiTokenAmount.uiAmount;
                    }
                })
                
                // 如果代币有小数位数，计算交易相关数据
                if(decimals>0){
                    rayInfo.number = ((new Decimal(beforeToken)).sub(new Decimal(pollToken)).div(10**decimals)).toFixed(decimals);
                    rayInfo.type = rayInfo.number<0 ? 'sell' : 'buy';
                    
                    if(rayInfo.token_reserves && rayInfo.sol_reserves){
                        rayInfo.price = (new Decimal(rayInfo.sol_reserves)).div(10**(9-decimals)).div(new Decimal(rayInfo.token_reserves)).toFixed(15);
                        // 输出交易链接到控制台
                        // console.log(`交易连接：https://solscan.io/tx/${signature}`)
                          
                        tapchain.sendRayInfo(rayInfo);

                        // process.exit(0);
                        
                    }
                    
                }
            }
        }
        
    });

    

    // 配置订阅请求
    const request:SubscribeRequest = {
        accounts: {}, // 不监听特定账户
        slots: {}, // 不监听特定槽位
        transactions: {
            // 监听Pump程序的交易
            pumpFun: {
                vote: false, // 不包括投票交易
                failed: false, // 不包括失败交易
                signature: undefined, // 不限制特定签名
                accountInclude: [PUMP_PROGRAM.toBase58()], // 包含Pump程序的交易
                accountExclude: [], // 不排除任何账户
                accountRequired: [], // 不要求特定账户
            },
            // 监听Raydium程序的交易
            raydiumFun: {
                vote: false, // 不包括投票交易
                failed: false, // 不包括失败交易
                signature: undefined, // 不限制特定签名
                accountInclude: [RAYDIUM_PROGRAM.toBase58()], // 包含Raydium程序的交易
                accountExclude: [], // 不排除任何账户
                accountRequired: [], // 不要求特定账户
            },
        },
        transactionsStatus: {}, // 不监听交易状态
        entry: {}, // 不监听入口点
        blocks: {}, // 不监听区块
        blocksMeta: {}, // 不监听区块元数据
        accountsDataSlice: [], // 不监听账户数据切片
        ping: undefined, // 不设置ping
        commitment: 0 // 使用默认确认级别
    };
  
    // 发送订阅请求
    await new Promise<void>((resolve, reject) => {
        stream.write(request, (err: null | undefined) => {
          if (err === null || err === undefined) {
              resolve(); // 请求成功
          } else {
              reject(err); // 请求失败
          }
        });
    }).catch((reason) => {
        console.error(reason); // 打印错误信息
        throw reason; // 抛出错误
    });
}