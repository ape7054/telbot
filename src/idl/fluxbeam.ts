export type Fluxbeam = {
    "version": "0.1.0",
    "name": "fluxbeam",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "tokenSwap",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "authority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "userTransferAuthority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userDestination",
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
                    "name": "sourceMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "destinationMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "sourceTokenProgramId",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "destinationTokenProgramId",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolTokenProgramId",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "discriminator",
                    "type": "u8"
                },
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

export const IDL: Fluxbeam = {
    "version": "0.1.0",
    "name": "fluxbeam",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "tokenSwap",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "authority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "userTransferAuthority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userDestination",
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
                    "name": "sourceMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "destinationMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "sourceTokenProgramId",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "destinationTokenProgramId",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "poolTokenProgramId",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "discriminator",
                    "type": "u8"
                },
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