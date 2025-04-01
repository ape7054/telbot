import Client from "@triton-one/yellowstone-grpc";
import { SubscribeRequest } from "@triton-one/yellowstone-grpc";
import base58 from "bs58";
import { Programs, JupiterProgram, Token2022Program } from "./config";
import { SwapParser } from "./transaction"
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import * as dotenv from 'dotenv';
import Tapchain from './tapchain';
// 创建 Tapchain 实例
const tapchain = new Tapchain();

dotenv.config();

console.log('程序启动，环境变量加载完成');
console.log(`GRPC_URL: ${process.env.GRPC_URL}`);
console.log(`监控DEX数量: ${Programs.length}`);

// 启动数据加载流程
// 该函数负责初始化GRPC客户端并开始监听交易数据
loadData();

/**
 * 初始化并启动GRPC客户端，处理交易数据流
 * @description 该函数负责建立GRPC连接，订阅交易数据，并处理接收到的交易信息
 */
async function loadData(){
    // 初始化GRPC客户端
    console.log('开始初始化 GRPC 客户端...');
    const client = new Client(process.env.GRPC_URL || "","",[]);
    console.log('GRPC 客户端创建成功，正在建立连接...');
    
    try {
        // 建立数据流订阅
        const stream = await client.subscribe();
        console.log('GRPC 流订阅成功');
        
        // 添加错误和结束处理
        stream.on('error', (error) => {
            console.error('GRPC 流发生错误:', error);
        });

        stream.on('end', () => {
            console.log('GRPC 流已结束');
        });
        
        // 交易计数器和启动时间记录
        let transactionCount = 0;
        const startTime = Date.now();
        
        // 添加心跳日志
        setInterval(() => {
            const runningTime = Math.floor((Date.now() - startTime) / 1000);
            console.log(`运行状态: ${runningTime}秒, 处理交易数: ${transactionCount}`);
        }, 30000);
        

        // 处理数据流
        stream.on("data", (data: { transaction: { transaction: any; slot: any; }; filters: string[]; }) => {
            try {
                transactionCount++;
                console.log('\n###########################################\n');
                console.log(`接收到新交易数据 #${transactionCount}`);
                
                // 验证数据有效性并处理helius交易
                if(data?.transaction && data.filters[0] == 'helius'){
                    const value = data?.transaction.transaction;
                    const signature = base58.encode(Buffer.from(value.signature,'base64'))
                    
                    console.log(`\n处理新交易: https://solscan.io/tx/${signature}`);
                    
                    // 解析账户信息
                    const accounts = parseAccounts(value);
                    console.log(`解析到 ${accounts.length} 个账户`);
                    
                    // 查找特殊程序索引
                    const { tokenProgramIndex, jupiterProgramIndex, token2022ProgramIndex } = findProgramIndices(accounts);
                    console.log('程序索引:', {
                        tokenProgram: tokenProgramIndex,
                        jupiter: jupiterProgramIndex,
                        token2022: token2022ProgramIndex
                    });
                    
                    // 提取交易指令信息
                    const instructions = value.transaction.message.instructions;
                    console.log(`交易包含 ${instructions.length} 条指令`);
                    
                    const innerInstructions = value.meta.innerInstructions;
                    console.log(`交易包含 ${innerInstructions?.length || 0} 条内部指令`);
                    
                    const postTokenBalances = value.meta.postTokenBalances;
                    console.log(`交易包含 ${postTokenBalances?.length || 0} 条代币余额记录`);
                    
                    // 初始化交易解析器
                    const parser = new SwapParser(signature, innerInstructions, postTokenBalances, tokenProgramIndex, token2022ProgramIndex);
                    
                    // 处理交易指令
                    processInstructions(instructions, accounts, parser, signature);

                
                } else {
                    console.log('跳过非 helius 过滤器的交易');
                }
            } catch (error) {
                console.error(`处理数据时出错:`, error);
            }
        });
    
  
        // 创建GRPC订阅请求配置
        const request:SubscribeRequest = {
            // 账户订阅配置
            accounts: {},
            // 时隙订阅配置
            slots: {},
            // 交易订阅配置
            transactions: {
                // Helius特定配置
                helius: {
                    // 不包含投票交易
                    vote: false,
                    // 不包含失败交易
                    failed: false,
                    // 签名未定义
                    signature: undefined,
                    // 需要包含的账户列表
                    accountInclude: Programs,
                    // 需要排除的账户列表
                    accountExclude: [],
                    // 必需的账户列表
                    accountRequired: [],
                }
            },
            // 交易状态订阅配置
            transactionsStatus: {},
            // 入口配置
            entry: {},
            // 区块订阅配置
            blocks: {},
            // 区块元数据配置
            blocksMeta: {},
            // 账户数据切片配置
            accountsDataSlice: [],
            // 心跳配置
            ping: undefined,
            // 提交级别
            commitment: 0
        };  
        console.log('准备发送订阅请求...');
        console.log(`监控程序列表: ${Programs.length} 个`);    
        // 发送订阅请求并等待响应
        await new Promise<void>((resolve, reject) => {
            stream.write(request, (err: null | undefined) => {
              if (err === null || err === undefined) {
                  console.log('订阅请求发送成功');
                  resolve();
              } else {
                  console.error('订阅请求发送失败:', err);
                  reject(err);
              }
            });
        }).catch((reason) => {
            console.error('订阅请求处理异常:', reason);
            throw reason;
        });  
        console.log('订阅请求处理完成，开始监听交易...');
    } catch (error) {
        console.error('GRPC 连接或订阅失败:', error);
        throw error;
    }
}
/**
 * 解析交易中的账户信息
 * @param value 交易数据
 * @returns 解析后的账户地址数组
 */
function parseAccounts(value: any): string[] {
    console.log('开始解析账户信息...');
    const accounts: string[] = [];
    
    // 解析账户密钥
    // 从交易消息中获取账户密钥列表，如果不存在则使用空数组
    const accountKeys = value.transaction.message.accountKeys || [];
    const loadedWritableAddresses = value.meta.loadedWritableAddresses || [];
    const loadedReadonlyAddresses = value.meta.loadedReadonlyAddresses || [];
    
    console.log(`账户密钥数量: ${accountKeys.length}`);
    console.log(`可写地址数量: ${loadedWritableAddresses.length}`);
    console.log(`只读地址数量: ${loadedReadonlyAddresses.length}`); 
    
    // 将所有账户添加到数组中
    [
        ...accountKeys,
        ...loadedWritableAddresses,
        ...loadedReadonlyAddresses
    ].forEach(ele => {
        accounts.push(base58.encode(Buffer.from(ele, 'base64')));
    });

    return accounts;
}

/**
 * 查找特殊程序在账户列表中的索引位置
 * @param accounts - 账户地址数组
 * @returns 包含各程序索引的对象
 * @description 遍历账户列表，查找TOKEN_PROGRAM_ID、Token2022Program和JupiterProgram的索引位置
 */
function findProgramIndices(accounts: string[]): { tokenProgramIndex: number, jupiterProgramIndex: number, token2022ProgramIndex: number } {
    console.log('开始查找特殊程序索引...');
    console.log(`TOKEN_PROGRAM_ID: ${TOKEN_PROGRAM_ID.toString()}`);
    console.log(`Token2022Program: ${Token2022Program}`);
    console.log(`JupiterProgram: ${JupiterProgram}`);
    
    let tokenProgramIndex = -1, jupiterProgramIndex = -1, token2022ProgramIndex = -1;
    
    accounts.forEach((account, i) => {
        if(account == TOKEN_PROGRAM_ID.toString()){
            tokenProgramIndex = i;
            console.log(`找到 TOKEN_PROGRAM_ID 在索引 ${i}`);
        }
        if(account == Token2022Program){
            token2022ProgramIndex = i;
            console.log(`找到 Token2022Program 在索引 ${i}`);
        }
        if(account == JupiterProgram){
            jupiterProgramIndex = i;
            console.log(`找到 JupiterProgram 在索引 ${i}`);
        }
    });
    
    console.log('特殊程序索引查找完成');
    return { tokenProgramIndex, jupiterProgramIndex, token2022ProgramIndex };
}

/**
 * 处理交易指令
 * @param instructions 指令数组
 * @param accounts 账户地址数组
 * @param parser 交易解析器实例
 * @param signature 交易签名
 * @description 根据不同的DEX程序类型解析和处理交易指令
 */
function processInstructions(instructions: any[], accounts: string[], parser: SwapParser, signature: string): void {
    console.log(`开始处理 ${instructions.length} 条指令...`);
    
    // 创建路由类型到解析方法的映射对象
    // 每个路由类型对应一个特定的解析器函数
    // key为路由类型索引，value为对应的处理函数
    const routerHandlers: {[key: number]: (item: any, index: number) => any} = {
        // Jupiter DEX解析器
        0: (index) => {
            console.log(`调用 jupiter 解析器，索引: ${index}`);
            return Promise.resolve(parser.jupiter(index, accounts));
        },
        // SolFi DEX解析器
        1: (item, index) => {
            console.log(`调用 SolFi 解析器，索引: ${index}`);
            return Promise.resolve(parser.SolFi(item, index));
        },
        // MeteoraDLMM DEX解析器
        2: (item, index) => {
            console.log(`调用 MeteoraDLMM 解析器，索引: ${index}`);
            return Promise.resolve(parser.MeteoraDLMM(item, index));
        },
        // RaydiumCLMM DEX解析器
        3: (item, index) => {
            console.log(`调用 RaydiumCLMM 解析器，索引: ${index}`);
            return Promise.resolve(parser.RaydiumCLMM(item, index));
        },
        // ZeroFi DEX解析器
        4: (item, index) => {
            console.log(`调用 ZeroFi 解析器，索引: ${index}`);
            return Promise.resolve(parser.ZeroFi(item, index));
        },
        // StabbleWeightedSwap DEX解析器
        5: (item, index) => {
            console.log(`调用 StabbleWeightedSwap 解析器，索引: ${index}`);
            return Promise.resolve(parser.StabbleWeightedSwap(item, index));
        },
        // Swap1DEX解析器
        6: (item, index) => {
            console.log(`调用 Swap1DEX 解析器，索引: ${index}`);
            return Promise.resolve(parser.Swap1DEX(item, index));
        },
        // LifinityV2 DEX解析器
        7: (item, index) => {
            console.log(`调用 LifinityV2 解析器，索引: ${index}`);
            return Promise.resolve(parser.LifinityV2(item, index));
        },
        // ObricV2 DEX解析器
        8: (item, index) => {
            console.log(`调用 ObricV2 解析器，索引: ${index}`);
            return Promise.resolve(parser.ObricV2(item, index));
        },
        // Phoenix DEX解析器
        9: (item, index) => {
            console.log(`调用 Phoenix 解析器，索引: ${index}`);
            return Promise.resolve(parser.Phoenix(item, index));
        },
        // Whirlpool DEX解析器
        10: (item, index) => {
            console.log(`调用 Whirlpool 解析器，索引: ${index}`);
            return Promise.resolve(parser.Whirlpool(item, index));
        },
        // FluxBeam DEX解析器
        11: (item, index) => {
            console.log(`调用 FluxBeam 解析器，索引: ${index}`);
            return Promise.resolve(parser.FluxBeam(item, index));
        },
        // RaydiumCP DEX解析器
        12: (item, index) => {
            console.log(`调用 RaydiumCP 解析器，索引: ${index}`);
            return Promise.resolve(parser.RaydiumCP(item, index));
        },
        // Cropper DEX解析器
        13: (item, index) => {
            console.log(`调用 Cropper 解析器，索引: ${index}`);
            return Promise.resolve(parser.Cropper(item, index));
        },
        // Invariant DEX解析器
        14: (item, index) => {
            console.log(`调用 Invariant 解析器，索引: ${index}`);
            return Promise.resolve(parser.Invariant(item, index));
        },
        // StabbleStableSwap DEX解析器
        15: (item, index) => {
            console.log(`调用 StabbleStableSwap 解析器，索引: ${index}`);
            return Promise.resolve(parser.StabbleStableSwap(item, index));
        },
        // Raydium DEX解析器
        16: (item, index) => {
            console.log(`调用 Raydium 解析器，索引: ${index}`);
            return Promise.resolve(parser.Raydium(item, index));
        }
    };
    
    // 并行处理所有指令
    Promise.all(instructions.map(async (item: any, mainindex: number) => {
        // 将所有日志先收集到一个数组中
        const logs: string[] = [];
        const programAddress = accounts[item.programIdIndex];
        const routertype = Programs.indexOf(programAddress);
        
        logs.push(`\n处理指令 ${mainindex}:`);
        logs.push(`- 程序地址: ${programAddress}`);
        logs.push(`- 程序索引: ${item.programIdIndex}`);
        logs.push(`- 路由类型: ${routertype}`);
        
        if (routertype >= 0) {
            logs.push(`- 对应程序: ${Programs[routertype]}`);
        } else {
            logs.push(`- 未知程序类型`);
        }
        
        const handler = routerHandlers[routertype];
        
        try {
            // 如果找到对应的处理方法，则调用它
            if (handler) {
                logs.push(`- 开始处理 ${Programs[routertype]} 类型指令`);
                
                //instructions--instruction
                const result = await handler(item, mainindex);
                if (result) {
                    logs.push(`- 指令 ${mainindex} 处理成功: ${JSON.stringify(result)}`);
                } else {
                    logs.push(`- 指令 ${mainindex} 无处理结果`);
                }
                // 一次性输出该指令的所有日志
                console.log(logs.join('\n'));
                return result;
            }
            
            logs.push(`- 跳过不支持的指令类型: ${routertype}`);
            console.log(logs.join('\n'));
            return Promise.resolve();
            
        } catch (error) {
            logs.push(`- 处理指令 ${mainindex} 时出错: ${error}`);
            console.log(logs.join('\n'));
            return Promise.resolve();
        }
    })).then(results => {
        const validResults = results.filter(r => r);
        const summary = [
            `\n交易处理完成:`,
            `- 总指令数: ${instructions.length}`,
            `- 有效结果数: ${validResults.length}`
        ];
        if (validResults.length > 0) {
            summary.push('- 有效结果详情:' + JSON.stringify(validResults, null, 2));
            // 调试输出，如果有有效结果，暂停程序执行
            console.log('检测到有效结果，程序暂停执行');
            process.exit(0);
        }
        console.log(summary.join('\n'));
    }).catch(error => {
        console.error(`处理交易 ${signature} 时出错:`, error);
    });
}
