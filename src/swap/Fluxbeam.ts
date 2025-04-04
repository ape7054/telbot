import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from '../init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_PROGRAM_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const SWAP_PROGRAM = new PublicKey("FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MyInstruction {
    amountIn: number;
    minimumAmountOut: number;

    constructor(amountIn: number, minimumAmountOut: number) {
        this.amountIn = amountIn;
        this.minimumAmountOut = minimumAmountOut;
    }
}

class FluxbeamSwap {
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

    /**
     * 执行Fluxbeam交换买入操作
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

        // 根据分析的交易数据，设置固定的账户地址
        var tokenSwap = "CZEZDGDkzsn4zTfdw6XRm4U1o6GatotMhhRmVEzdwGS3";
        var authority = "Fv9Yjbk4BXV4nwdP3xKaRT3xiSUKTojsKgqSgwvjujLK";
        var poolSource = "6Mstdw2bFRpsu8QtwZb7u1waHmSbWMnT2SDhs4kaMG32";
        var poolDestination = "3bXv4ztf78aCpsqcL9ncNvrkWr1XcF1vvYzG1SKVrDW1";
        var poolMint = "GDX61hU9HdW45LgQ36tzXYDQVMLyRjWX1tpAKyvSgxgR";
        var feeAccount = "AfC9vs3F2g2uUfAoAeU74rt8No5Ytm8aQdAbrgUgHvr9";

        // 添加交易指令
        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(tokenSwap), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(authority), isSigner: false, isWritable: false },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: associatedAddressIn, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolSource), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolDestination), isSigner: false, isWritable: true },
                { pubkey: associatedAddressOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(poolMint), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(feeAccount), isSigner: false, isWritable: true },
                { pubkey: input, isSigner: false, isWritable: false },
                { pubkey: output, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_2022, isSigner: false, isWritable: false },
            ],
            programId: SWAP_PROGRAM,
            data: Buffer.concat([
                // discriminator - u8 值为1
                Buffer.from([1]),
                // amountIn - u64
                this.bufferFromUInt64(amountIn.toString()),
                // minimumAmountOut - u64
                this.bufferFromUInt64(amountOut.toString())
            ])
        }));

        // 发送交易并返回结果
        return this.client.sendRequest(transaction, payer, 0, 0);
    }
}

async function main(){
    const {error, hash, time} = await (new FluxbeamSwap()).swapBuy(
        "So11111111111111111111111111111111111111112",  // SOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        10000,
        0       // 最小输出金额
    );
    console.log(hash, time);
    console.log(error);
}

main();