export type LifinitySwap = {
    "version": "0.1.0",
    "name": "lifinityswap",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
   
                {
                    "name": "authority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "amm",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTransferAuthority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "sourceInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "destinationInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "swapSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "swapDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "feeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oracleMainAccount",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oracleSubAccount",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oraclePcAccount",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
         
                {
                    "name": "amountIn",
                    "type": "u64"
                },
                {
                    "name": "minimumAmountOut",
                    "type": "u64"
                }
            ]
        }
    ]
}

export const IDL: LifinitySwap = {
    "version": "0.1.0",
    "name": "lifinityswap",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "amm",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTransferAuthority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "sourceInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "destinationInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "swapSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "swapDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "feeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oracleMainAccount",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oracleSubAccount",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "oraclePcAccount",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amountIn",
                    "type": "u64"
                },
                {
                    "name": "minimumAmountOut",
                    "type": "u64"
                }
            ]
        }
    ]
}