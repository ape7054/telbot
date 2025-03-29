export type SolFi = {
    "version": "0.1.0",
    "name": "SolFi",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "pair",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolTokenAccountA",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolTokenAccountB",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountA",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountB",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "sysvarInstructions",
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
                }
            ]
        }
    ],
}

export const IDL: SolFi = {
    "version": "0.1.0",
    "name": "SolFi",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "pair",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolTokenAccountA",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolTokenAccountB",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountA",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountB",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "sysvarInstructions",
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
                }
            ]
        }
    ],
}