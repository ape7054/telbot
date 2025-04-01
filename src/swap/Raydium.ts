import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from './init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58';
const Decimal = require('decimal.js');

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RAYDIUM_CLMM_PROGRAM = new PublicKey("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MyInstruction {
    amount: number;
    otherAmountThreshold: number;
    sqrtPriceLimitX64: bigint;
    isBaseInput: boolean;

    constructor(amount: number, otherAmountThreshold: number, sqrtPriceLimitX64: bigint, isBaseInput: boolean) {
        this.amount = amount;
        this.otherAmountThreshold = otherAmountThreshold;
        this.sqrtPriceLimitX64 = sqrtPriceLimitX64;
        this.isBaseInput = isBaseInput;
    }
}

class RaydiumSwap {
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
        console.log("输入SOL数量:", wsol / 1e9, "SOL");
        console.log("期望获得代币数量:", token);

        const owner = payer.publicKey;
        const input = new PublicKey(inputMint);
        const output = new PublicKey(outputMint);

        var amount: bigint = BigInt(wsol);
        var otherAmountThreshold: bigint = BigInt(token);
         
        // 获取用户的代币账户地址 - 这部分是动态生成的
        const inputTokenAccount = await getAssociatedTokenAddress(input, owner, false);
        const outputTokenAccount = await getAssociatedTokenAddress(output, owner, false);

        const transaction = new Transaction();
        var microLamports = new Decimal("0.0001").mul(10**10).div(5);
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        );
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        );

        // 检查并创建输入代币账户
        const inputAccountInfo = await this.client.getAccountInfo(inputTokenAccount);
        if(!inputAccountInfo) {
            console.log('创建输入代币账户');
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    inputTokenAccount,
                    owner,
                    input,
                )
            );
        }
        
        // 检查并创建输出代币账户
        const outputAccountInfo = await this.client.getAccountInfo(outputTokenAccount);
        if(!outputAccountInfo) {
            console.log('创建输出代币账户');
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    outputTokenAccount,
                    owner,
                    output,
                )
            );
        }
        //https://solscan.io/tx/5jkRZUNrZbSo4gZR4fXfmXwsaW4c3hAJVwHJ1ZjMDjw7EDp36AgdBLvuhNJ5mASZHdchJaKgbAwqhwo1pqSMhWiG
        // 使用硬编码的账户地址
        var ammConfig = "9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x";
        var poolState = "8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj";
        var inputVault = "6P4tvbzRY6Bh3MiWDHuLqyHywovsRwRpfskPvyeSoHsz";
        var outputVault = "6mK4Pxs6GhwnessH7CvPivqDYauiHZmAdbEFDpXFk9zt";
        var observationState = "3MsJXVvievxAbsMsaT6TS4i6oMitD9jazucuq3X234tC";
        var tickArray = "C4545REL4PnsXVRYEySDbCJ9uH8KGBChPeSU2AftCvrj";
        var account = "DoPuiZfJu7sypqwR4eiU7C5TMcmmiFoU4HaF5SoD8mRy";
        var accountTwo = "GB1aM8acFo76Ksn5qcZ6x9gQwUyVtgXCwoX9bMK2iDKJ";
        var accountThree = "EiqW6SnfrpZX42BwsWBhJMQuBwfm6wubY89Tk4s2Z3Ty";

        console.log("用户输入代币账户:", inputTokenAccount.toString());
        console.log("用户输出代币账户:", outputTokenAccount.toString());
       
        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: new PublicKey(ammConfig), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(poolState), isSigner: false, isWritable: true },
                { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
                { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(inputVault), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(outputVault), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(observationState), isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: new PublicKey(tickArray), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(account), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(accountTwo), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(accountThree), isSigner: false, isWritable: true }
            ],
            programId: RAYDIUM_CLMM_PROGRAM,
            data: Buffer.concat([
                // SWAP_V2_DISCRIMINATOR: [43, 4, 237, 11, 26, 201, 30, 98]
                Buffer.from([43, 4, 237, 11, 26, 201, 30, 98]),
                // amount (u64)
                this.bufferFromUInt64(amount.toString()),
                // otherAmountThreshold (u64) - 最小获得的代币数量
                this.bufferFromUInt64(otherAmountThreshold.toString()),
                // sqrtPriceLimitX64 (u128) - 价格限制，设为0表示不限制
                this.bufferFromUInt128("0"),
                // isBaseInput (bool) - 是否以基础代币作为输入
                this.bufferBoolean(true)
            ])
        }));

        console.log(transaction.instructions[2].data);
        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main() {
    // 将SOL数量转换为lamports (1 SOL = 10^9 lamports)
    const solAmount = 0.01 * 1e9; // 0.01 SOL
    
    const {error, hash, time} = await (new RaydiumSwap()).swapBuy(
        "So11111111111111111111111111111111111111112", // WSOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        solAmount, // 输入金额（lamports）
        0 // 最小输出金额（0表示接受任何数量）
    );
    
    console.log(hash, time);
    console.log(error);
}

main();