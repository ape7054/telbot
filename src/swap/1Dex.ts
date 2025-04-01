import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from './init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SWAP_PROGRAM = new PublicKey("DEXYosS6oEGvk8uCDayvwEZz4qEyDJRf9nFgYCaqPMTm");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MyInstruction {
    amountIn: number;
    minimumAmountOut: number;

    constructor(amountIn: number, minimumAmountOut: number) {
        this.amountIn = amountIn;
        this.minimumAmountOut = minimumAmountOut;
    }
}

class OneDexSwap {
    client: request;
    constructor() {
        this.client = new request();
    }
    
    bufferFromUInt64(value: number | string) 
    {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value));
        return buffer;
    }

    async swapBuy(
        inputMint:string, 
        ouputMint:string, 
        wsol:number, 
        token:number
    ):Promise<{error:string,hash?:string,time?:number}>{
        const owner = payer.publicKey;
        const input = new PublicKey(inputMint);
        const output = new PublicKey(ouputMint);

        var amountIn:bigint = BigInt(wsol);
        var amountOut:bigint = BigInt(token);
         
        const associatedAddressIn = await getAssociatedTokenAddress(input, owner, false);
        const associatedAddressOut = await getAssociatedTokenAddress(output, owner, false);

        const transaction = new Transaction();
        var microLamports =  new Decimal("0.0001").mul(10**10).div(5);
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        )
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        )

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

        // 固定的账户地址
        var metadataState = "5nmAbnjJfW1skrPvYjLTBNdhoKzJfznnbvDcM8G2U7Ki";
        var poolState = "DbuvwPuLvH8uy2B1sKuu18aCd2QpCvfZdfDtdRZztBd2";
        var poolAuthPda = "Enc6rB84ZwGxZU8aqAF41dRJxg3yesiJgD7uJFVhMraM";
        var poolTokenInAccount = "HZ5JFB1ZoZs6NQLr7bb4MMEXDgty4Vs1ZghoyX35mNnV";
        var poolTokenOutAccount = "AHFAv95Z67xnPYuHTf5a9uMEHdXFvbQvwc4EazY3tpt7";
        var metadataSwapFeeAccount = "GswwnegnBMWEuEsptDCBDmRB9YtG5zjetTSw7RunUQMY";
        var referrerTokenAccount = "DuFXxPxAyJhHj4gMpE8As1Ta4nSSVXv8xfEDRrWQmJ9G";

        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(metadataState), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(poolState), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolAuthPda), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(poolTokenInAccount), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolTokenOutAccount), isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: associatedAddressIn, isSigner: false, isWritable: true },
                { pubkey: associatedAddressOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(metadataSwapFeeAccount), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(referrerTokenAccount), isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
            ],
            programId: SWAP_PROGRAM,
            data: Buffer.concat([
                Buffer.from([8, 151, 245, 76, 172, 203, 144, 39]), // SWAP_EXACT_AMOUNT_IN_DISCRIMINATOR
                this.bufferFromUInt64(amountIn.toString()),
                this.bufferFromUInt64(amountOut.toString())
            ])
        }));
        return this.client.sendRequest(transaction,payer,0,0);
    }
}

async function main(){
    const {error,hash,time} = await (new OneDexSwap()).swapBuy(
        "So11111111111111111111111111111111111111112",  // SOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        1_000,  // 1 SOL
        0        // 最小获得 0 USDC
    );
    console.log(hash,time)
    console.log(error)
}
main();