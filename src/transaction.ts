// 导入所需的依赖
import fs from 'fs';
import Decimal from 'decimal.js'
import { JupSwaps, RouterInfo, CONFIG, Programs, JupiterProgram, Token2022Program } from "./config";
import { transferInstructionData, transferCheckedInstructionData, TOKEN_PROGRAM_ID } from '@solana/spl-token'
// 添加 Redis 客户端依赖
import { createClient } from 'redis';

// Redis 客户端配置
const redisClient = createClient({
    url: 'redis://:tapai123456@localhost:7001'
});

// 连接 Redis
(async () => {
    redisClient.on('error', (err) => console.log('Redis 客户端错误', err));
    await redisClient.connect();
    console.log('Redis 客户端已连接');
})();

/**
 * SwapParser类 - 用于解析不同DEX平台的交易指令
 * 该类负责处理和分析各种DEX平台的交易数据，包括Jupiter、Raydium等
 */
export class SwapParser{
    private tokenProgramIndex = -1;        // Token程序索引
    private token2022ProgramIndex = -1;    // Token2022程序索引
    private signature = "";              // 交易签名
    private innerInstructions: any[] = []; // 内部指令数组
    private postTokenBalances: any[] = []; // 交易后的代币余额数组

    /**
     * 构造函数 - 初始化解析器所需的参数
     * @param signature 交易签名
     * @param innerInstructions 内部指令数组
     * @param postTokenBalances 交易后的代币余额数组
     * @param tokenProgramIndex Token程序索引
     * @param token2022ProgramIndex Token2022程序索引
     */
    constructor(signature:string,innerInstructions:any[],postTokenBalances:any[],tokenProgramIndex:number,token2022ProgramIndex:number) {
        this.tokenProgramIndex = tokenProgramIndex;
        this.innerInstructions = innerInstructions;
        this.postTokenBalances = postTokenBalances;
        this.token2022ProgramIndex = token2022ProgramIndex;
        this.signature = signature;
    }

    /**
     * 解析Jupiter交易指令
     * @param mainindex 主指令索引
     * @param accounts 账户列表
     * @returns 是否成功解析
     */
    jupiter(mainindex:number,accounts:string[]){
        var tokenProgramIndex = -1,jupiterProgramIndex=-1,token2022ProgramIndex=-1;
        // 查找相关程序的索引
        accounts.forEach((account,i) => {
            if(account == TOKEN_PROGRAM_ID.toString()){
                tokenProgramIndex = i;
            }
            if(account == Token2022Program){
                token2022ProgramIndex = i;
            }
            if(account == JupiterProgram){
                jupiterProgramIndex = i;
            }
        })
        // 获取内部指令
        var ins = this.innerInstructions.find((insx:any) => insx.index === mainindex)?.instructions || [];
        var amminfo:RouterInfo = emptyRouterInfo();
        var spltokens:any[] = [];
        var maininsitem:any = {};
        
        // 遍历处理每条内部指令
        ins.forEach((insitem:any) => {
            insitem.accounts = insitem.accounts.length>0 ? insitem.accounts.toJSON().data:[];
            var jupitertype = Programs.indexOf(accounts[insitem.programIdIndex])
            var isLogIns = 0;
            if(jupitertype==2 || jupitertype==9){
                if(insitem.accounts.length==1)  {
                    isLogIns = 1;
                }
            }
            // 处理Jupiter类型的指令
            if(jupitertype>0){
                if(isLogIns==0){
                    amminfo.id = jupitertype;
                    amminfo.amm = insitem.programId;
                    maininsitem = insitem;
                    spltokens = [];
                }
            }else{
                // 处理Token2022程序的指令
                if(amminfo.id>0 && insitem.programIdIndex == token2022ProgramIndex){
                    if(amminfo.id==11){
                        if(insitem.data.length==10){
                            spltokens.push(insitemFormat(insitem))
                        }
                    }
                }
                // 处理Token程序的指令
                if(amminfo.id>0 && insitem.programIdIndex == tokenProgramIndex){
                    insitem = insitemFormat(insitem);
                    if(amminfo.id==5){
                        if(insitem.destination != maininsitem.accounts[5]){
                            spltokens.push(insitem)
                        }
                    }else if(amminfo.id==7){
                        if(insitem !== undefined){
                            spltokens.push(insitem)
                        }
                    }else if(amminfo.id==6){
                        if( insitem.destination != maininsitem.accounts[8] &&
                            insitem.destination != maininsitem.accounts[9]
                        ){
                            spltokens.push(insitem)
                        }
                    }else if(amminfo.id==15){
                        if(insitem.destination != maininsitem.accounts[5]){
                            spltokens.push(insitem)
                        }
                    }else{
                        spltokens.push(insitem)
                    }
                }
                // 处理Jupiter程序的指令
                if(insitem.programIdIndex == jupiterProgramIndex){
                    if(amminfo.id>0 && spltokens.length>0){
                        if(amminfo.id==14 || amminfo.id==9){
                            this.getAmmData(amminfo,spltokens[0],spltokens[1]);
                        }else{
                            this.getAmmData(amminfo,spltokens[0],spltokens[1]);
                        }
                    }
                    amminfo = emptyRouterInfo();
                }
            }
        })
    }

    /**
     * 获取AMM交易数据
     * @param ammone AMM路由信息
     * @param open 输入代币信息
     * @param close 输出代币信息
     * @returns 是否成功获取数据
     */
    async getAmmData(ammone:RouterInfo,open:any,close:any): Promise<boolean> {
        if(open.destination == "" ||  close.source == "" || open.destination ==  close.source) return false;
        // 设置交易池和金额信息
        ammone.poola = open.destination;
        ammone.poolb = close.source;
        ammone.in = open.amount;
        ammone.out = close.amount;
        if(open.mint == undefined){
            ammone.input = open.mint;
            ammone.output = close.mint;
        }
        // 更新代币余额信息
        this.postTokenBalances.forEach((val:any)=>{
            if(val.accountIndex == ammone.poola){
                ammone.input = val.mint;
                ammone.inpool = val.uiTokenAmount.uiAmountString;
                ammone.in = new Decimal(ammone.in).div(10**val.uiTokenAmount.decimals).toString();
            }
            if(val.accountIndex == ammone.poolb){
                ammone.output = val.mint;
                ammone.outpool = val.uiTokenAmount.uiAmountString;
                ammone.out = new Decimal(ammone.out).div(10**val.uiTokenAmount.decimals).toString();
            }
        })
        if(ammone.input == "" || ammone.output == "" || ammone.input == ammone.output) return false;

        // 记录特定类型的交易日志
        if(ammone.id==2) {
            // 如果 amm 字段为空，设置为对应的程序ID或默认值
            if (!ammone.amm || ammone.amm === "") {
                // 根据 id 设置对应的 AMM 名称
                switch(ammone.id) {
                    case 2:
                        ammone.amm = "Jupiter";
                        ammone.name = "Jupiter Swap";
                        break;
                    // 可以添加其他类型的 AMM
                    default:
                        ammone.amm = "Unknown";
                        break;
                }
            }
            
            // 构建交易日志字符串
            var txLog = `JP: ${CONFIG.SOLSCAN_URL}${this.signature} at RouterType: ${ammone.id}\n`;
            // 添加代币交换信息
            txLog += ammone.input + " swap " + ammone.output + "\n";
            // 添加交换数量信息
            txLog += ammone.in + " swap " + ammone.out + "\n\n";
            // 将日志追加写入文件
            fs.appendFileSync('./txLog.log', txLog);
            
            // 将交易数据存入Redis
            try {
                // 使用交易签名作为键
                const key = `tx:${this.signature}`;
                // 将AMM数据转为JSON字符串存储
                await redisClient.set(key, JSON.stringify({
                    timestamp: Date.now(),
                    signature: this.signature,
                    ammData: ammone,
                    inputToken: ammone.input,
                    outputToken: ammone.output,
                    inputAmount: ammone.in,
                    outputAmount: ammone.out
                }));
                
                // 设置过期时间(可选，例如7天)
                await redisClient.expire(key, 60 * 60 * 24 * 7);
                
                // 添加到交易列表(用于快速查询)
                await redisClient.lPush('recent_transactions', key);
                await redisClient.lTrim('recent_transactions', 0, 999); // 只保留最近1000条
            } catch (error) {
                console.error('Redis存储错误:', error);
            }
        }
        return true;
    }

    /**
     * 获取SPL代币交易信息
     * @param mainindex 主指令索引
     * @returns SPL代币交易数组
     */
    /**
     * 获取SPL代币交易信息
     * @param mainindex - 主指令索引
     * @returns SPL代币交易数组
     * 
     * 该方法用于从内部指令中提取SPL代币的交易信息:
     * 1. 查找指定索引的内部指令
     * 2. 过滤出Token程序相关的指令
     * 3. 格式化并收集代币交易数据
     */
    getSpltokens(mainindex:number){
        var spltokens:any[] = [];
        var ins = this.innerInstructions.find((insx:any) => insx.index === mainindex)?.instructions || [];
        ins.forEach((insitem:any) => {
            insitem.accounts = insitem.accounts.length>0?insitem.accounts.toJSON().data:[];
            if(insitem.programIdIndex == this.tokenProgramIndex && insitem.stackHeight == 2){
                if(insitem.accounts.length>2){
                    insitem = insitemFormat(insitem);
                    spltokens.push(insitem)
                }
            }
        })
        return spltokens;
    }

    // 以下是各个DEX平台的交易解析方法
    // 每个方法都遵循类似的模式：
    // 1. 验证指令的有效性
    // 2. 获取SPL代币交易信息
    // 3. 解析AMM交易数据

    /**
     * SolFi交易解析方法
     * @param item - 交易指令项
     * @param mainindex - 主指令索引
     * @returns 解析是否成功
     * 
     * 该方法用于解析SolFi DEX的交易:
     * 1. 验证账户数据的有效性
     * 2. 获取SPL代币交易信息
     * 3. 解析并返回AMM交易数据
     */
    SolFi(item:any,mainindex:number){
        // 验证账户数据长度和程序索引
        if( item.accounts.toJSON().data.length < 17 ) {
            if(item.accounts.toJSON().data[1] != item.programIdIndex){
                return false;
            }
        }
    
        // 获取SPL代币交易信息
        var spltokens = this.getSpltokens(mainindex);
    
        // 验证代币交易数量
        if (spltokens.length !=2 ) {
            return false;
        }
    
        // 创建AMM路由信息并解析交易数据
        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }
    
    // Meteora DLMM交易解析
    MeteoraDLMM(item:any,mainindex:number){
        if( item.accounts.toJSON().data.length < 17 ) {
            if(item.accounts.toJSON().data[1] != item.programIdIndex){
                return false;
            }
        }
    
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
    
        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }
    
    // RaydiumCLMM交易解析
    RaydiumCLMM(item:any,mainindex:number){
        if( item.accounts.toJSON().data.length < 17 && item.accounts.toJSON().data[1] != item.programIdIndex){
            return false;
        }
    
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
    
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }
    
    // ZeroFi交易解析
    ZeroFi(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
    
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
    
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // StabbleWeightedSwap交易解析
    StabbleWeightedSwap(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // StabbleStableSwap交易解析
    StabbleStableSwap(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Swap1DEX交易解析
    Swap1DEX(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // LifinityV2交易解析
    LifinityV2(item:any,mainindex:number){
        let FeeAccount = item.accounts.toJSON().data[8];
        var spltokens = this.getSpltokens(mainindex);

        if (spltokens.length < 2 ) {
            return false;
        }

        spltokens = spltokens.filter((item:any) => item.destination != FeeAccount);
        var ammone = emptyRouterInfo(7);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // ObricV2交易解析
    ObricV2(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }
    
    // Phoenix交易解析
    Phoenix(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }

    // Whirlpool交易解析
    Whirlpool(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }

    // FluxBeam交易解析
    FluxBeam(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }

    // RaydiumCP交易解析
    RaydiumCP(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }

    AldrinV2(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }

        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }

        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }

    // Crema交易解析
    Crema(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        
        var ammone = emptyRouterInfo(2);
        const result = this.getAmmData(ammone,spltokens[0],spltokens[1]);
        return result;
    }

    // Saros交易解析
    Saros(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Cykura交易解析
    Cykura(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Step交易解析
    Step(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Saber交易解析
    Saber(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Serum交易解析
    Serum(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Cropper交易解析
    Cropper(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Marinade交易解析
    Marinade(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Mercurial交易解析
    Mercurial(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // GooseFX交易解析
    GooseFX(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Dradex交易解析
    Dradex(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }
    // Openbook交易解析
    Openbook(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Balansol交易解析
    Balansol(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Invariant交易解析
    Invariant(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Symmetry交易解析
    Symmetry(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Penguin交易解析
    Penguin(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Sencha交易解析
    Sencha(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // SaberHelix交易解析
    SaberHelix(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Stepn交易解析
    Stepn(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }

    // Raydium交易解析
    Raydium(item:any,mainindex:number){
        if(item.accounts.toJSON().data[0] != this.tokenProgramIndex){
            return false;
        }
        var spltokens = this.getSpltokens(mainindex);
        if (spltokens.length !=2 ) {
            return false;
        }
        var ammone = emptyRouterInfo(2);
        return this.getAmmData(ammone,spltokens[0],spltokens[1]);
    }
}
//初始化新交易对
function emptyRouterInfo(id?:number): RouterInfo {
    return {id:id?id:0,amm: "",name:"",input: "",output: "",poola: "",poolb: "",in: "",out: "",inpool:"",outpool:""}
}
//解析数字
function transferAmountData(data:any){
    if (data.length === 9) {
        return transferInstructionData.decode(data).amount
    } else if (data.length === 10) {
        return transferCheckedInstructionData.decode(data).amount
    } else {
        return 0;
    }
}
//解析Transfer地址和金额
function insitemFormat(insitem:any){
    if(insitem.accounts.length==4){
        return {
            source:insitem.accounts[0],
            mint:insitem.accounts[1],
            destination:insitem.accounts[2],
            authority:insitem.accounts[3],
            amount:transferAmountData(insitem.data),
            accounts:insitem.accounts
        }
    }
    return {
        source:insitem.accounts[0],
        destination:insitem.accounts[1],
        authority:insitem.accounts[2],
        amount:transferAmountData(insitem.data),
        accounts:insitem.accounts
    }
}