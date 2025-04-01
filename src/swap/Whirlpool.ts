
//Whirlpools Program: SwapV2

import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from './init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const WHIRLPOOLS_PROGRAM = new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

// 交易指令常量
const SWAP_DISCRIMINATOR = 14449647541112719096;
const SWAP_V2_DISCRIMINATOR = 7070309578724672555;

class WhirlpoolSwap {
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
        console.log("输入SOL数量:", wsol / 1e9);
        console.log("期望获得代币数量:", token / 1e9);

        const tokenAuthority = payer.publicKey;
        const tokenMintA = new PublicKey(inputMint);
        const tokenMintB = new PublicKey(outputMint);

        var amount: bigint = BigInt(wsol);
        var otherAmountThreshold: bigint = BigInt(token);
         
        // 获取用户的代币账户地址 - 这部分是动态生成的
        const tokenOwnerAccountA = await getAssociatedTokenAddress(tokenMintA, tokenAuthority, false);
        const tokenOwnerAccountB = await getAssociatedTokenAddress(tokenMintB, tokenAuthority, false);

        const transaction = new Transaction();
        var microLamports = new Decimal("0.0001").mul(10**10).div(5);
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        )
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        )

        // 检查并创建输入代币账户
        const inputAccountInfo = await this.client.getAccountInfo(tokenOwnerAccountA);
        if(!inputAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    tokenAuthority,
                    tokenOwnerAccountA,
                    tokenAuthority,
                    tokenMintA,
                )
            );
        }
        
        // 检查并创建输出代币账户
        const outputAccountInfo = await this.client.getAccountInfo(tokenOwnerAccountB);
        if(!outputAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    tokenAuthority,
                    tokenOwnerAccountB,
                    tokenAuthority,
                    tokenMintB,
                )
            );
        }
        
        // 使用硬编码的账户地址
        var whirlpool = "4acL7mD2J6GYJy2g3iVTvfpmHCQSZ1rb8DBuupjcVzHJ";
        var tokenVaultA = "9zF2ZWTjnk6UkyWRxNtqy9UHims9u7LSaHGyhA5PwDSx";
        var tokenVaultB = "9koKVomtdDBCGdCwwSqfNEbvejR6K1VekZ8XHmsBxoZi";
        var tickArray0 = "GNTTMwNSUHSXRWmFoVaXTUHDjjkb53QpYH31et2QsxbZ";
        var tickArray1 = "6BrCaeDWsUH37GuRgwxDbzzkbAyW4ei2PH1YSagbAvd5";
        var tickArray2 = "HwxUxMXwyexkyhDePYYaf3KL2xwcrRJ15zk2ffp3NNLE";
        var oracle = "BmqsjEQPjZBvba4ve6x49F7p1sRRcqwqEPbGf35bxEkj";

        console.log("用户代币账户A:", tokenOwnerAccountA.toString());
        console.log("用户代币账户B:", tokenOwnerAccountB.toString());
       
        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: MEMO_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: tokenAuthority, isSigner: true, isWritable: true },
                { pubkey: new PublicKey(whirlpool), isSigner: false, isWritable: true },
                { pubkey: tokenMintA, isSigner: false, isWritable: false },
                { pubkey: tokenMintB, isSigner: false, isWritable: false },
                { pubkey: tokenOwnerAccountA, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tokenVaultA), isSigner: false, isWritable: true },
                { pubkey: tokenOwnerAccountB, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tokenVaultB), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tickArray0), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tickArray1), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tickArray2), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(oracle), isSigner: false, isWritable: true },
            ],
            programId: WHIRLPOOLS_PROGRAM,
            data: Buffer.concat([
                this.bufferFromUInt64(SWAP_DISCRIMINATOR), // SWAP_DISCRIMINATOR
                this.bufferFromUInt64(amount.toString()), // amount
                this.bufferFromUInt64(otherAmountThreshold.toString()), // otherAmountThreshold
                this.bufferFromUInt128("4295048016"), // sqrtPriceLimit
                this.bufferBoolean(true), // amountSpecifiedIsInput
                this.bufferBoolean(true) // aToB
            ])
        }));

        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main() {
    const whirlpoolSwap = new WhirlpoolSwap();
    
    const balanceResponse = await whirlpoolSwap.client.fetch(
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
    
    const inputAmount = 0.1 * 1e9; // 0.1 SOL
    const outputAmount = 0; // 期望获得的最小代币数量，设为0表示接受任何数量
    
    if (balance < inputAmount) {
        console.log("钱包地址:", payer.publicKey.toString());
        console.log("余额不足，请确保钱包中有足够的SOL");
        return;
    }

    const {error, hash, time} = await whirlpoolSwap.swapBuy(
        "So11111111111111111111111111111111111111112", // WSOL
        "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump", // pwease
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