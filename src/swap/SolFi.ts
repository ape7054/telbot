import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from './init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SOLFI_PROGRAM = new PublicKey("SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class SolFiSwap {
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

        const input = new PublicKey(inputMint);
        const output = new PublicKey(outputMint);
        
        // 获取用户的代币账户地址
        const userTokenAccountA = await getAssociatedTokenAddress(input, owner, false);
        const userTokenAccountB = await getAssociatedTokenAddress(output, owner, false);

        // SolFi特定的账户地址
        const user = owner;  // 使用当前用户的公钥
        var pair = "SolFi (SOL-USDC) Market";  // 修改为实际的市场地址
  
        var poolTokenAccountA = "BuAehYMuKCGrdRKQbXutUAtqzdDBKpbvvWwUKrhJPk1H";  // 修改为实际的池地址1
        var poolTokenAccountB = "48KLHQiGNAUjvsbEk8hFQomg2C7ZZfx69y7LUYGYbBnp";  // 修改为实际的池地址2
        var sysvarInstructions = "Sysvar1nstructions1111111111111111111111111";

        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: user, isSigner: true, isWritable: true },  // 使用当前用户的公钥
                { pubkey: new PublicKey(pair), isSigner: false, isWritable: true },  // 交易对账户
                { pubkey: new PublicKey(poolTokenAccountA), isSigner: false, isWritable: true },  // 池账户A
                { pubkey: new PublicKey(poolTokenAccountB), isSigner: false, isWritable: true },  // 池账户B
                { pubkey: new PublicKey(userTokenAccountA), isSigner: false, isWritable: true },  // 使用动态生成的账户地址
                { pubkey: new PublicKey(userTokenAccountB), isSigner: false, isWritable: true },  // 使用动态生成的账户地址
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },  // 代币程序
                { pubkey: new PublicKey(sysvarInstructions), isSigner: false, isWritable: false },  // 系统指令账户
            ],
            programId: SOLFI_PROGRAM,
            data: Buffer.concat([
                this.bufferFromUInt64(tokenIn.toString()),
                this.bufferFromUInt64(tokenOut.toString()),
                this.bufferFromUInt128("79226673515401279992447579055"),
                this.bufferBoolean(false),
                this.bufferBoolean(false)
            ])
        }));

        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main() {
    const solfiSwap = new SolFiSwap();
    
    const balanceResponse = await solfiSwap.client.fetch(
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

    const {error, hash, time} = await solfiSwap.swapBuy(
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