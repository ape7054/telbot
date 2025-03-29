export type MeteoraDLMM = {
    "version": "0.1.0",
    "name": "Meteora+DLMM",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "lbPair",  // Lb Pair市场账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "binArrayBitmapExtension",  // Bin数组位图扩展
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "reserveX",  // 对应Reserve X
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveY",  // 对应Reserve Y
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenIn",  // 用户输入代币账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenOut",  // 用户输出代币账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenXMint",  // X代币mint
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenYMint",  // Y代币mint
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oracle",  // 预言机账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "hostFeeIn",  // 新增手续费账户
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "user",  // 用户账户（签名者）
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenXProgram",  // X代币程序
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenYProgram",  // Y代币程序
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "eventAuthority",  // 新增事件授权账户
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "program",    // 新增程序账户
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "account",  // 新增账户 9M6AwxBYKr5vuETfz3Rxdy7o3gYpoT1D5XSUnTMg8rB
                    "isMut": true,       // 根据账户信息设为可写
                    "isSigner": false
                },
            ],
            "args": [
                {
                    "name": "amountIn",
                    "type": "u64"
                },
                {
                    "name": "minAmountOut",
                    "type": "u64"
                }
            ]
        }
    ],
}

export const IDL: MeteoraDLMM = {
    "version": "0.1.0",
    "name": "Meteora+DLMM",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "lbPair",  // Lb Pair市场账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "binArrayBitmapExtension",  // Bin数组位图扩展
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "reserveX",  // 对应Reserve X
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveY",  // 对应Reserve Y
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenIn",  // 用户输入代币账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenOut",  // 用户输出代币账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenXMint",  // X代币mint
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenYMint",  // Y代币mint
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oracle",  // 预言机账户
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "hostFeeIn",  // 新增手续费账户
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "user",  // 用户账户（签名者）
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenXProgram",  // X代币程序
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenYProgram",  // Y代币程序
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "eventAuthority",  // 新增事件授权账户
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "program",    // 新增程序账户
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "account",  // 新增账户 9M6AwxBYKr5vuETfz3Rxdy7o3gYpoT1D5XSUnTMg8rB
                    "isMut": true,       // 根据账户信息设为可写
                    "isSigner": false
                },
            ],
            "args": [
                {
                    "name": "amountIn",
                    "type": "u64"
                },
                {
                    "name": "minAmountOut",
                    "type": "u64"
                }
            ]
        }
    ],
}