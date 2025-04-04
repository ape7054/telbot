import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from '../init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58';
const Decimal = require('decimal.js');
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SWAP_PROGRAM = new PublicKey("swapFpHZwjELNnjvThjajtiVmkz3yPQEHjLtka2fwHW");
const VAULT_PROGRAM = new PublicKey("vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class StabbleWeightedSwap {
    client: request;
    constructor() {
        this.client = new request();
    }
    
    bufferFromUInt64(value: number | string) {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value));
        return buffer;
    }
    
    bufferFromOptionUInt64(value: number | string | null) {
        if (value === null) {
            return Buffer.from([0]); // None
        } else {
            return Buffer.concat([
                Buffer.from([1]), // Some
                this.bufferFromUInt64(value)
            ]);
        }
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

        const owner = payer.publicKey;
        const input = new PublicKey(inputMint);
        const output = new PublicKey(outputMint);

        var amountIn: bigint = BigInt(wsol);
        var minimumAmountOut: bigint = BigInt(token);
         
        // 获取用户的代币账户地址 - 这部分是动态生成的
        const userTokenIn = await getAssociatedTokenAddress(input, owner, false);
        const userTokenOut = await getAssociatedTokenAddress(output, owner, false);

        const transaction = new Transaction();
        var microLamports = new Decimal("0.0001").mul(10**10).div(5);
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        );
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        );

        // 检查并创建输入代币账户
        const inputAccountInfo = await this.client.getAccountInfo(userTokenIn);
        if(!inputAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    userTokenIn,
                    owner,
                    input,
                )
            );
        }
        
        // 检查并创建输出代币账户
        const outputAccountInfo = await this.client.getAccountInfo(userTokenOut);
        if(!outputAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    userTokenOut,
                    owner,
                    output,
                )
            );
        }

        // 使用硬编码的账户地址
        var vaultTokenIn = "HoAHDQss5qzYkoKPXtRJRHCQrUWxcHvs4vmZ8QsN4nSq";
        var vaultTokenOut = "2PkFYJpyum86qkAM46hZ7bNvUGq157RoaPKFrgTAWLub";
        var beneficiaryTokenOut = "ArLSJrSstZ3kjeZDyMAgjfjad1qdRZHHYaCQTQeAcTpa";
        var pool = "BQR6JJFyMWxnUERqbCRCCy1ietW2yq8RTKDx9odzruha";
        var withdrawAuthority = "BXj5a4J5YDByKzd3Y7NU59QDrjy1KcH1dCbftsxJGmna";
        var vault = "w8edo9a9TDw52c1rBmVbP6dNakaAuFiPjDd52ZJwwVi";
        var vaultAuthority = "7HkzG4LYyCJSrD3gopPQv3VVzQQKbHBZcm9fbjj5fuaH";

        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: userTokenIn, isSigner: false, isWritable: true },
                { pubkey: userTokenOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(vaultTokenIn), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(vaultTokenOut), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(beneficiaryTokenOut), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(pool), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(withdrawAuthority), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(vault), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(vaultAuthority), isSigner: false, isWritable: false },
                { pubkey: VAULT_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
            ],
            programId: SWAP_PROGRAM,
            data: Buffer.concat([
                // SWAP_V2_DISCRIMINATOR: [43, 4, 237, 11, 26, 201, 30, 98]
                Buffer.from([43, 4, 237, 11, 26, 201, 30, 98]),
                // amount_in (option<u64>)
                this.bufferFromOptionUInt64(amountIn.toString()),
                // minimum_amount_out (u64)
                this.bufferFromUInt64(minimumAmountOut.toString())
            ])
        }));

        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main() {
    const stabbleWeightedSwap = new StabbleWeightedSwap();
    
    const balanceResponse = await stabbleWeightedSwap.client.fetch(
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
    const outputAmount = 0.1 * 1e9; // 期望获得的代币数量
    
    if (balance < inputAmount) {
        console.log("钱包地址:", payer.publicKey.toString());
        console.log("余额不足，请确保钱包中有足够的SOL");
        return;
    }

    const {error, hash, time} = await stabbleWeightedSwap.swapBuy(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        "So11111111111111111111111111111111111111112", // WSOL
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