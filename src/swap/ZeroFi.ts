import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from '../init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SYSVAR_INSTRUCTIONS = new PublicKey("Sysvar1nstructions1111111111111111111111111");
const ZEROFI_PROGRAM = new PublicKey("ZERor4xhbUycZ6gb9ntrhqscUcZmAbQDjEAtCf4hbZY");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class ZeroFiSwap {
    client: request;
    constructor() {
        this.client = new request();
    }
    
    bufferFromUInt64(value: number | string) {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value));
        return buffer;
    }

    bufferFromUInt128(value: number | string) {
        let buffer = Buffer.alloc(16);
        const bigIntValue = BigInt(value);
        buffer.writeBigUInt64LE(bigIntValue & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
        buffer.writeBigUInt64LE(bigIntValue >> BigInt(64), 8);
        return buffer;
    }

    bufferBoolean(value: boolean) {
        let buffer = Buffer.alloc(1);
        buffer.writeUInt8(value ? 1 : 0, 0);
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
        const mint = new PublicKey(outputMint);

        var tokenIn = BigInt(wsol);
        var tokenOut = BigInt(token);
           
        const tokenAccountAddress = await getAssociatedTokenAddress(mint, owner, false);
        const transaction = new Transaction();
        
        var microLamports = new Decimal("0.0001").mul(10**10).div(5);
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        );
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        );
        
        const tokenAccountInfo = await this.client.getAccountInfo(tokenAccountAddress);
        if(!tokenAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    tokenAccountAddress,
                    owner,
                    mint,
                )
            );
        }

        // ZeroFi特定的账户地址
        var poolAccount = "BuMSijp24Vg28YVi3Y8WRjpRuBdMUTYuYn1BxgoRe3yR";
        var poolTokenAccountA = "A3YPzNhc4aSaVgSQ7M72dy47aiekaPWEqzAUNyPm1mmE";
        var poolTokenAccountB = "3vmfn3EHsmAaEXpuN6NxfitMnJFCsrUD3NBvXwKjZzjw";
        var poolAuthority = "3YTcuZp6cuT9VvdeTJ8wK5apjZX1Mz8FZAZbhX28uj4L";
        var feeAccount = "8cjeuVV3KQ9k8RqW1JUyCfey2TDAhuo7f4hPDMeGfxv";
        var protocolFeeAccount = "2HhfN42KXifjVeM6x8iP9tiMCrm1AdhyTbxhkn9GrEPh";
        var userTokenAccountA = "AmbF6fPLJMm33FHzxvtekqc36TcEDnoiKJXssL5Zxh2R";
        var userAccount = "6v3nv8BUJKpXvnBnD4ZvpDiG3u847ALLYyo1NACn2zmV";
        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(poolAccount), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolTokenAccountA), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolTokenAccountB), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolAuthority), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(feeAccount), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(protocolFeeAccount), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(userTokenAccountA), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(userAccount), isSigner: true, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: SYSVAR_INSTRUCTIONS, isSigner: false, isWritable: false }
            ],
            programId: ZEROFI_PROGRAM,
            data: Buffer.from("4Qk5u7L5i9mekma8u2x44oZ", "base64")
        }));

        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main() {
    const zeroFiSwap = new ZeroFiSwap();
    
    const balanceResponse = await zeroFiSwap.client.fetch(
        'getBalance',
        [payer.publicKey.toString()],
        'devnet'
    );
    
    if (balanceResponse.error) {
        console.log("获取余额失败");
        return;
    }
    
    const balance = balanceResponse.result?.value || 0;
    console.log("当前钱包余额:", balance / 1e9, "SOL");
    
    const inputAmount = 0.1;
    const outputAmount = 0.1;  
    if (balance < inputAmount * 1e9) {
        console.log("钱包地址:", payer.publicKey.toString());
        console.log("余额不足，请确保钱包中有足够的SOL");
        return;
    }

    const {error, hash, time} = await zeroFiSwap.swapBuy(
        "So11111111111111111111111111111111111111112",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        inputAmount,
        outputAmount
    );
    
    if (error) {   
        console.log("交易错误:", error);
        console.log("钱包地址:", payer.publicKey.toString());
        console.log("Solana浏览器链接: https://solscan.io/tx/" + hash);
        return;
    }
    
    if (hash) {
        console.log("交易签名:", hash);
        console.log("交易时间:", new Date(time).toLocaleString());
        console.log("Solana浏览器链接: https://solscan.io/tx/" + hash);
    }
}

main();