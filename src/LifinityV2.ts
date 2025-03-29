import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from './init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');
const TOKEN_PROGRAM     = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SWAP_PROGRAM   = new PublicKey("2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MyInstruction {
    amountIn: number;
    minimumAmountOut: number;

    constructor(amountIn: number, minimumAmountOut: number) {
        this.amountIn = amountIn;
        this.minimumAmountOut = minimumAmountOut;
    }
}

class LifinityV2Swap {
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
            console.log('1');
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
        var Authority = "7GmDCbu7bYiWJvFaNUyPNiM8PjvvBcmyBcZY1qSsAGi2";
        var Amm = "DrRd8gYMJu9XGxLhwTCPdHNLXCKHsxJtMpbn62YqmwQe";
        var SwapSource = "EVGW4q1iFjDmtxtHr3NoPi5iVKAxwEjohsusMrinDxr6";
        var SwapDestination = "53EkU98Vbv2TQPwGG6t2asCynzFjCX5AnvaabbXafaed";
        var PoolMint = "FGYgFJSxZTGzaLwzUL9YZqK2yUZ8seofCwGq8BPEw4o8";
        var FeeAccount = "FwWV8a193zZsYxaRAbYkrM6tmrHMoVY1Xahh2PNFejvF";
        var OracleMainAccount = "8RVPH46opPd3qLy1n1djntzGMZxnqEzbYs9uoeixdnwk";
        var OracleSubAccount = "8RVPH46opPd3qLy1n1djntzGMZxnqEzbYs9uoeixdnwk";
        var OraclePcAccount = "7oo7u7iXrNCekxWWpfLYCbXyjrYLAco5FM9qSjQeNn7g";

        console.log(associatedAddressIn.toString(),associatedAddressOut.toString());
       
        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(Authority), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(Amm), isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: associatedAddressIn, isSigner: false, isWritable: true },
                { pubkey: associatedAddressOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(SwapSource), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(SwapDestination), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(PoolMint), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(FeeAccount), isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: new PublicKey(OracleMainAccount), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(OracleSubAccount), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(OraclePcAccount), isSigner: false, isWritable: false },
            ],
            programId: SWAP_PROGRAM,
            data: Buffer.concat([
                Buffer.from([248, 198, 158, 145, 225, 117, 135, 200]),
                this.bufferFromUInt64(amountIn.toString()),
                this.bufferFromUInt64(amountOut.toString())
            ])
        }));
        console.log(transaction.instructions[2].data);
        return this.client.sendRequest(transaction,payer,0,0);
    }
}

async function main(){
    const {error,hash,time} = await (new LifinityV2Swap()).swapBuy("So11111111111111111111111111111111111111112","EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",10000,0);
    console.log(hash,time)
    console.log(error)
}
main();