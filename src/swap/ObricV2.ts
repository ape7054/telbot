import { Keypair, PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

import { request } from '../init';
import * as dotenv from 'dotenv';
dotenv.config();
import bs58 from 'bs58'
const Decimal = require('decimal.js');
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SWAP_PROGRAM = new PublicKey("obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y");
const payer = Keypair.fromSecretKey(bs58.decode(process.env.SIYAO));

class MyInstruction {
    amountIn: number;
    minimumAmountOut: number;

    constructor(amountIn: number, minimumAmountOut: number) {
        this.amountIn = amountIn;
        this.minimumAmountOut = minimumAmountOut;
    }
}

class ObricV2Swap {
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

    /**
     * 执行代币交换买入操作
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
        // 调试输出用户公钥
        console.log("当前用户公钥:", owner.toBase58());


        
        // 创建输入和输出代币的PublicKey对象
        const input = new PublicKey(inputMint);
        const output = new PublicKey(ouputMint);

        // 转换输入输出金额为bigint类型
        var amountIn:bigint = BigInt(wsol);
        var amountOut:bigint = BigInt(token);

        // 调试信息集中输出
        console.log("交易参数信息：");
        console.log("输入代币地址:", input.toBase58());
        console.log("输出代币地址:", output.toBase58());
        console.log("输入金额(bigint):", amountIn.toString());
        console.log("输出金额(bigint):", amountOut.toString());
         
        // 获取关联账户地址
        const associatedAddressIn = await getAssociatedTokenAddress(input, owner, false);
        console.log("输入代币关联账户地址:", associatedAddressIn.toBase58());
        
        const associatedAddressOut = await getAssociatedTokenAddress(output, owner, false);
        console.log("输出代币关联账户地址:", associatedAddressOut.toBase58());
        // 创建新的交易对象
        const transaction = new Transaction();
        // 设置计算单位价格
        var microLamports =  new Decimal("0.0001").mul(10**10).div(5);
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
        // 参考交易:
        // https://solscan.io/tx/48LRX1Snm8BBSQdH4GEh58Y8mQD6s8F9bGZH2ZkhcLXXrNdmPgtf4cg3FdD7qPnMqVirgu38gq3rnqwe72HsFr7q
        // https://solscan.io/tx/2p9tzNKttvNEjK2x9iy7bvX6qrqnW1jHpRyWv6Ehdv7nfLHgyvEz3kCpwekc4p6n9nZjC7vq2nauWTd79k7ca91C
        // 修改交易所需的账户地址  
        // 从交易数据中获取的账户地址
        var tradingPair = "Fn68NZzCCgZKtYmnAYbkL6w5NNx3TgjW91dGkLA3hsDK";
        var mintX = "GZsNmWKbqhMYtdSkkvMdEyQF9k5mLmP7tTKYWZjcHVPE";
        var mintY = "6YawcNeZ74tRyCv4UfGydYMr7eho7vbUR6ScVffxKAb3";
        var reserveX = "86KSdCfcqnJo9TCLFi3zxsJAJzvx9QU7oEPd6Fn5ZPom";
        var reserveY = "8ofECjHnVGLU4ywyPdK6mFddEqAuXsnrrov8m2zeFhvj";
        var protocolFee = "FpCMFDFGYotvufJ7HrFHsWEiiQCGbkLCtwHiDnh7o28Q";
        var xPriceFeed = "J4HJYz4p7TRP96WVFky3vh7XryxoFehHjoRySUTeSeXw";
        var yPriceFeed = "Sysvar1nstructions1111111111111111111111111";
    
        // 注意：这些地址与交易数据中的accounts数组匹配

        // 添加交易指令

        transaction.add(new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(tradingPair), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(mintX), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(mintY), isSigner: false, isWritable: false },
                { pubkey: new PublicKey(reserveX), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(reserveY), isSigner: false, isWritable: true },
                { pubkey: associatedAddressIn, isSigner: false, isWritable: true },
                { pubkey: associatedAddressOut, isSigner: false, isWritable: true },
                { pubkey: new PublicKey(protocolFee), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(xPriceFeed), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(yPriceFeed), isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
            ],
            programId: SWAP_PROGRAM,
            data: Buffer.concat([
                Buffer.from([248, 198, 158, 145, 225, 117, 135, 200]), // SWAP_DISCRIMINATOR
                Buffer.from([1]),  // isXToY: false (从SOL到USDC)
                this.bufferFromUInt64(amountIn.toString()),  // 输入金额
                this.bufferFromUInt64(amountOut.toString())  // 最小输出金额
            ])
        }));
        // 发送交易并返回结果
        return this.client.sendRequest(transaction,payer,0,0);
    }
}

// 修改主函数中的交易参数
async function main(){
    const {error,hash,time} = await (new ObricV2Swap()).swapBuy(
        "So11111111111111111111111111111111111111112",  // SOL
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        10000,  // 0.00009908 SOL
        0    // 最小获得 0.012693 USDC
    );
    console.log(hash,time)
    console.log(error)
}
main();