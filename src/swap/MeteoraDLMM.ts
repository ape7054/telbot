import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from './init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58';
const Decimal = require('decimal.js');

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const METEORA_DLMM_PROGRAM = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MeteoraDLMMSwap {
    client: request;
    constructor() {
        this.client = new request();
    }
    
    bufferFromUInt64(value: number | string) {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value));
        return buffer;
    }

    async swapBuy(
        inputMint: string,
        outputMint: string,
        wsol: number,
        token: number
    ): Promise<{error: string, hash?: string, time?: number}> {
        console.log("输入代币:", inputMint);
        console.log("输出代币:", outputMint);
        console.log("输入SOL数量:", wsol);
        console.log("期望获得代币数量:", token);

        const owner = payer.publicKey;
        const input = new PublicKey(inputMint);
        const output = new PublicKey(outputMint);

        var amountIn = BigInt(wsol);
        var minAmountOut = BigInt(token);
           
        const transaction = new Transaction();
        
        var microLamports = new Decimal("0.0001").mul(10**10).div(5);
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        );
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        );
        
        // 获取用户的代币账户地址 - 这部分是动态生成的
        const userTokenIn = await getAssociatedTokenAddress(input, owner, false);
        const userTokenOut = await getAssociatedTokenAddress(output, owner, false);
        
        // 检查并创建代币账户
        const inputAccountInfo = await this.client.getAccountInfo(userTokenIn);
        if(!inputAccountInfo) {
            console.log('创建输入代币账户');
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    userTokenIn,
                    owner,
                    input,
                )
            );
        }
        
        const outputAccountInfo = await this.client.getAccountInfo(userTokenOut);
        if(!outputAccountInfo) {
            console.log('创建输出代币账户');
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    userTokenOut,
                    owner,
                    output,
                )
            );
        } 
        
        
        
        
        //参考交易地址
        //https://solscan.io/tx/4FwCSv2V6tSbWiMfxScrduWPYNAXeQZbLfCEdpRm5FnDyB2avFR9nK4oAbYhysfroSXrdWt6Ffp4nLYLPfaJLVue
        //https://solscan.io/tx/3XnXu3RmCJ7J77DMZyojuK43qeZnioD6KUZVKyje7mafoTVTWj12UwjB6odd7BZ2mZBpYfGLNW2mLDZ3Tg2gq8HP


        // 使用硬编码的账户地址
       
        var lbPair = "627kqiAtYNE4FFKtUcnR9nmDqqCZnQue2ALYRQtnziLR";
        var reserveX = "GptzjzMFdtKZBXQSsM4cfxDHzdyZYvKo4A9unjNZS7e2";
        var reserveY = "71Hjqj7G11361GquQ4oqwnpuUeQzDynzo3gRC86WAa5w";
        var tokenXMint = "So11111111111111111111111111111111111111112";  // WSOL
        var tokenYMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";  // USDC
        var oracleAddress = "GssVtZaQeaf217uu65keBYEmiZQwwsGfTmhw9ih7apQ5";
        var eventAuthority = "D1ZN9Wj1fRSUQfCjhvnu1hqDMT7hzjzBBpi12nVniYD6";
        var accountOne = "CJDHw3xjAbn4TUdK9LUYaWMXK47f27SeSnkWs3o9YtfE";
        var accountTwo = "G7jHwPiw5SS51jBdSdznrxReVRbCxaTHFqqcHgeDxGwf";

        console.log("用户输入代币账户:", userTokenIn.toString());
        console.log("用户输出代币账户:", userTokenOut.toString());
       
        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(lbPair), isSigner: false, isWritable: true },
                { pubkey: METEORA_DLMM_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: new PublicKey(reserveX), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(reserveY), isSigner: false, isWritable: true },
                { pubkey: userTokenIn, isSigner: false, isWritable: true },
                { pubkey: userTokenOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tokenXMint), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(tokenYMint), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(oracleAddress), isSigner: false, isWritable: true },
                { pubkey: METEORA_DLMM_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: new PublicKey(eventAuthority), isSigner: false, isWritable: false },
                { pubkey: METEORA_DLMM_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: new PublicKey(accountOne), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(accountTwo), isSigner: false, isWritable: true }
            ],
            programId: METEORA_DLMM_PROGRAM,
            data: Buffer.concat([
                Buffer.from([248, 198, 158, 145, 225, 117, 135, 200]), // SWAP_DISCRIMINATOR
                this.bufferFromUInt64(amountIn.toString()), // amountIn
                this.bufferFromUInt64(minAmountOut.toString()) // minAmountOut
            ])
        }));

        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main(){
    // 将SOL数量转换为lamports (1 SOL = 10^9 lamports)
    const solAmount = 0.01; // 0.01 SOL
    const lamports = solAmount * 1e9; // 转换为lamports
    
    const {error, hash, time} = await (new MeteoraDLMMSwap()).swapBuy(
        "So11111111111111111111111111111111111111112", // WSOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        lamports, // 输入金额（lamports）
        0 // 最小输出金额（0表示接受任何数量）
    );
    
    if (error) {
        console.log("交易错误:", error);
    } else {
        console.log("交易哈希:", hash);
        console.log("交易时间:", time ? new Date(time * 1000).toLocaleString() : "未知");
        console.log("Solana浏览器链接: https://solscan.io/tx/" + hash);
    }
}

main();