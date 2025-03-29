export type RaydiumCLMM = {
    "version": "0.1.0",
    "name": "Raydium+CLMM",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "payer",          // 手续费支付者（DnFbZy...wpxMJ）
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "ammConfig",      // AMM配置（EdPxg8...GCuzR）
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolState",      // 流动池状态（WSOL-USDC）
                    "isMut": true,            // 可写
                    "isSigner": false
                },
                {
                    "name": "inputTokenAccount",  // 输入代币账户（Af9yNF...1bcq）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "outputTokenAccount", // 输出代币账户（FzmWNh...5ZKn）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "inputVault",     // 输入池（Pool 1）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "outputVault",    // 输出池（Pool 2）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "observationState", // 观察状态（AA5RaV...JW4Mk）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",   // Token程序
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tickArray",          // 时钟
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "account", // DoPuiZfJu7sypqwR4eiU7C5TMcmmiFoU4HaF5SoD8mRy
                    "isMut": false,
                    "isSigner": false
                },
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "otherAmountThreshold",
                    "type": "u64"
                },
                {
                    "name": "sqrtPriceLimitX64",
                    "type": "u128"
                },
                {
                    "name": "isBaseInput",
                    "type": "bool"
                }
            ]
        }
    ],
}

export const IDL: RaydiumCLMM = {
    "version": "0.1.0",
    "name": "Raydium+CLMM",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "payer",          // 手续费支付者（DnFbZy...wpxMJ）
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "ammConfig",      // AMM配置（EdPxg8...GCuzR）
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolState",      // 流动池状态（WSOL-USDC）
                    "isMut": true,            // 可写
                    "isSigner": false
                },
                {
                    "name": "inputTokenAccount",  // 输入代币账户（Af9yNF...1bcq）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "outputTokenAccount", // 输出代币账户（FzmWNh...5ZKn）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "inputVault",     // 输入池（Pool 1）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "outputVault",    // 输出池（Pool 2）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "observationState", // 观察状态（AA5RaV...JW4Mk）
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",   // Token程序
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tickArray",          // 时钟
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "account", // DoPuiZfJu7sypqwR4eiU7C5TMcmmiFoU4HaF5SoD8mRy
                    "isMut": false,
                    "isSigner": false
                },
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "otherAmountThreshold",
                    "type": "u64"
                },
                {
                    "name": "sqrtPriceLimitX64",
                    "type": "u128"
                },
                {
                    "name": "isBaseInput",
                    "type": "bool"
                }
            ]
        }
    ],
}