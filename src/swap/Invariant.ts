import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from './init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SWAP_PROGRAM = new PublicKey("HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MyInstruction {
    amountIn: number;
    minimumAmountOut: number;

    constructor(amountIn: number, minimumAmountOut: number) {
        this.amountIn = amountIn;
        this.minimumAmountOut = minimumAmountOut;
    }
}

class InvariantSwap {
    client: request;
    constructor() {
        this.client = new request();
    }
    
    /**
     * 将数字或字符串转换为64位无符号整数的Buffer
     * @param value 要转换的数字或字符串值
     * @returns 8字节的Buffer，包含小端序的64位无符号整数
     */
    bufferFromUInt64(value: number | string) 
    {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value));
        return buffer;
    }

    bufferFromUInt128(value: string) {
        // 创建一个16字节的缓冲区来存储u128
        const buffer = Buffer.alloc(16);
        // 将字符串转换为BigInt
        const bigIntValue = BigInt(value);
        // 写入低64位
        buffer.writeBigUInt64LE(bigIntValue & BigInt('0xFFFFFFFFFFFFFFFF'), 0);
        // 写入高64位
        buffer.writeBigUInt64LE(bigIntValue >> BigInt(64), 8);
        return buffer;
    }

    /**
     * 执行Invariant交换买入操作
     * @param inputMint 输入代币的铸币地址
     * @param ouputMint 输出代币的铸币地址
     * @param wsol 输入的WSOL数量
     * @param token 期望获得的代币数量
     * @returns 包含交易结果的对象
     */
    async swapBuy(
        inputMint:string, 
        ouputMint:string, 
        wsol:number, 
        token:number
    ):Promise<{error:string,hash?:string,time?:number}>{
        // 获取当前用户的公钥
        const owner = payer.publicKey;
        // 创建输入和输出代币的PublicKey对象
        const input = new PublicKey(inputMint);
        const output = new PublicKey(ouputMint);

        // 转换输入输出金额为bigint类型
        var amountIn:bigint = BigInt(wsol);
        var amountOut:bigint = BigInt(token);
         
        // 获取关联账户地址
        const associatedAddressIn = await getAssociatedTokenAddress(input, owner, false);
        const associatedAddressOut = await getAssociatedTokenAddress(output, owner, false);

        // 创建新的交易对象
        const transaction = new Transaction();
        // 设置计算单位价格
        var microLamports = new Decimal("0.0001").mul(10**10).div(5);
        // 添加计算预算指令
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        )
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        )

        // 检查输入代币账户是否存在，不存在则创建
        const InputAccountInfo = await this.client.getAccountInfo(associatedAddressIn);
        if(!InputAccountInfo){
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    associatedAddressIn,
                    owner,
                    input,
                )
            );
        }
        
        // 检查输出代币账户是否存在，不存在则创建
        const tokenAccountInfo = await this.client.getAccountInfo(associatedAddressOut);
        if(!tokenAccountInfo){
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    associatedAddressOut,
                    owner,
                    output,
                )
            );
        }
        //Invariant Swap: Swap

        //参考网址：Invariant Swap: Swap
        //（wsol换usdc）
        //https://solscan.io/tx/3NAdsp62YKRKmM7t9emdYo3zd378J1qTuuPH38azGPtcnn6DxHgkGYDvfCPPQfA4U5ZoQfLcq5MdwGMsc32D1TcJ
        //https://solscan.io/tx/25Yir8M9YhQVUCg7NPmbpzvcKhRqZ7qvPfFSSkhePex3EgGryZkYFaSrg33E7tdcZiX9q4jhSYFoNcN5jsbcUcuh
        // 根据分析的交易数据，设置固定的账户地址
        var state = "8NsPwRFYqob3FzYvHYTjFK6WVFJADFN8Hn7yNQKcVNW1";
        var pool = "6rvpVhL9fxm2WLMefNRaLwv6aNdivZadMi56teWfSkuU";
        var tickmap = "6te341EkeDvjs9xcPyZALYFKGLSBXD2Ski7SPTGcdvpv";
        var reserveX = "GK9QHeWnAmyZkAZnWbzbzp6kEHT5eJKgKPkn2JyvpVnF";
        var reserveY = "f6nwMTRpKTCVmRhGUbjfJPEBeXaaDUCvUUQh1941e4a";
        var programAuthority = "J4uBbeoWpZE8fH58PM1Fp9n9K6f1aThyeVCyRdJbaXqt";

        // 添加交易指令
        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(state), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(pool), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tickmap), isSigner: false, isWritable: true },
                { pubkey: associatedAddressIn, isSigner: false, isWritable: true },
                { pubkey: associatedAddressOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(reserveX), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(reserveY), isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: new PublicKey(programAuthority), isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
            ],
            programId: SWAP_PROGRAM,


           


            data: Buffer.concat([
                // SWAP_DISCRIMINATOR
                Buffer.from([248, 198, 158, 145, 225, 117, 135, 200]),
                // xToY (false = 0) - 从USDC到WSOL的交换
                Buffer.from([0]),
                // amount - 使用传入的参数
                this.bufferFromUInt64(amountIn.toString()),
                // byAmountIn (true = 1)
                Buffer.from([1]),
                // sqrtPriceLimit - 使用更合适的价格限制
                this.bufferFromUInt128("65535383934512647000000000000") // 更新后的价格限制
            ])
        }));

        // 发送交易并返回结果
        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main(){
    const {error, hash, time} = await (new InvariantSwap()).swapBuy(
        "So11111111111111111111111111111111111111112",  // SOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
   
        10000,
        0       // 最小输出金额
    );
    console.log(hash, time);
    console.log(error);
}

main();