export type OneDex = {
    "version": "0.1.0",
    "name": "onedex",
    "instructions": [
        {
            "name": "swapExactAmountIn",
            "accounts": [
                {
                    "name": "metadataState",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolAuthPda",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolTokenInAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolTokenOutAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userTokenInAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenOutAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "metadataSwapFeeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "referrerTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "params",
                    "type": {
                        "defined": "SwapExactAmountInParams"
                    }
                }
            ]
        }
    ],
    "types": [
        {
            "name": "SwapExactAmountInParams",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "tokenInAmount",
                        "type": "u64"
                    },
                    {
                        "name": "minTokenOutAmount",
                        "type": "u64"
                    }
                ]
            }
        }
    ]
}

export const IDL: OneDex = {
    "version": "0.1.0",
    "name": "onedex",
    "instructions": [
        {
            "name": "swapExactAmountIn",
            "accounts": [
                {
                    "name": "metadataState",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolAuthPda",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolTokenInAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolTokenOutAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userTokenInAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenOutAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "metadataSwapFeeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "referrerTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "params",
                    "type": {
                        "defined": "SwapExactAmountInParams"
                    }
                }
            ]
        }
    ],
    "types": [
        {
            "name": "SwapExactAmountInParams",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "tokenInAmount",
                        "type": "u64"
                    },
                    {
                        "name": "minTokenOutAmount",
                        "type": "u64"
                    }
                ]
            }
        }
    ]
}