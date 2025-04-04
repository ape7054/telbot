import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from '../init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SWAP_PROGRAM = new PublicKey("H8W3ctz92svYg6mkn1UtGfu2aQr2fnUFHM1RhScEtQDt");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MyInstruction {
    amountIn: number;
    minimumAmountOut: number;

    constructor(amountIn: number, minimumAmountOut: number) {
        this.amountIn = amountIn;
        this.minimumAmountOut = minimumAmountOut;
    }
}

class CropperSwap {
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
        buffer.writeBigUInt64LE(BigInt(value));
        return buffer;
    }

    async swapBuy(
        inputMint: string,
        outputMint: string,
        wsol: number,
        token: number
    ): Promise<{error: string, hash?: string, time?: number}> {
        const owner = payer.publicKey;
        const input = new PublicKey(inputMint);
        const output = new PublicKey(outputMint);

        var amountIn: bigint = BigInt(wsol);
        var amountOut: bigint = BigInt(token);

        // 获取输入代币的关联账户地址
        const associatedAddressIn = await getAssociatedTokenAddress(input, owner, false);
        console.log("输入代币关联账户地址:", associatedAddressIn.toBase58());

        // 获取输出代币的关联账户地址
        const associatedAddressOut = await getAssociatedTokenAddress(output, owner, false);
        console.log("输出代币关联账户地址:", associatedAddressOut.toBase58());
        const transaction = new Transaction();
        var microLamports = new Decimal("0.0001").mul(10**10).div(5);
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 })
        );
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
        );

        const InputAccountInfo = await this.client.getAccountInfo(associatedAddressIn);
        if(!InputAccountInfo) {
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
        if(!tokenAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    owner,
                    associatedAddressOut,
                    owner,
                    output,
                )
            );
        }
        // Cropper Whirlpool
        // WSOL -> USDC 交易对
        // 交易对地址: 55TucCMtiDs2k4bXcNssMRNCX7LxYPb42cauJAhpXdoQ
        // 代币A仓库: Cux1Jc8HzNYJKos71qRUsEKtBT5HDFTK7mgSM8ybyfAW
        // 代币B仓库: GQc9WHpd9sSa4WuwrKnixD8DvYBuER3cZRPjMR77SpYM
        // 价格区间数组0: EMAUKmaKGNzS8R6XX126gunXFXNZMpBHzdf91NpCLgp9
        // 价格区间数组1: YzanZTYF2VqhpurmgFWkzippjhT8LLUAFcXTKBeP5Au 
        // 价格区间数组2: 49udb4GM9HDWSLfeejFSPmBKTFkWyaKRHTviNiH1nKcK
        // 预言机: BLGsJzPU8UngoHz481jbFeC7jBNHhYCH2YF6L2nXoZHs

        var whirlpool = "55TucCMtiDs2k4bXcNssMRNCX7LxYPb42cauJAhpXdoQ";
        var tokenVaultA = "Cux1Jc8HzNYJKos71qRUsEKtBT5HDFTK7mgSM8ybyfAW";
        var tokenVaultB = "GQc9WHpd9sSa4WuwrKnixD8DvYBuER3cZRPjMR77SpYM";
        var tickArray0 = "YzanZTYF2VqhpurmgFWkzippjhT8LLUAFcXTKBeP5Au";
        var tickArray1 = "49udb4GM9HDWSLfeejFSPmBKTFkWyaKRHTviNiH1nKcK";
        var tickArray2 = "J1pkijn97BrmSD7xY6Nhij6bDeQuaJ2bvpAKMki3nVFG";
        var oracle = "BLGsJzPU8UngoHz481jbFeC7jBNHhYCH2YF6L2nXoZHs";

        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: new PublicKey(whirlpool), isSigner: false, isWritable: true },
                { pubkey: associatedAddressIn, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tokenVaultA), isSigner: false, isWritable: true },
                { pubkey: associatedAddressOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tokenVaultB), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tickArray0), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tickArray1), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(tickArray2), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(oracle), isSigner: false, isWritable: false },
            ],

            // Cropper Whirlpool
            // wsol换usdc交易指令
            // 参考交易:
            // https://solscan.io/tx/X7nbnachWftkhADBPfpUGXuAJJWfcEqFbVHRLtRcA3Hje4HLYQCiuCGpCVbbgaF231hgrbxHnLnuu1A5SehHvAn
            // https://solscan.io/tx/sCowijdDvGgVuCM3uod3HnhfhCiegwn7Uy7jtxTAiskybvvJAqzbXbkGLCiZGMVTGxvaybWuvVTgMa1ohxgXvzc
            programId: SWAP_PROGRAM,
            data: Buffer.concat([
                // 这是一个指令标识符，用于标识Cropper Whirlpool的swap操作
                Buffer.from([248, 198, 158, 145, 225, 117, 135, 200]),
                this.bufferFromUInt64(amountIn.toString()),
                this.bufferFromUInt64("0"),
                this.bufferFromUInt128("65535383934512647000000000000"),
                Buffer.from([1]),
                Buffer.from([1])
            ])
        }));

        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main() {
    const {error, hash, time} = await (new CropperSwap()).swapBuy(
        "So11111111111111111111111111111111111111112",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        10000,
        0
    );
    console.log(hash, time);
    console.log(error);
}

main();