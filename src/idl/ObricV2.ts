export type ObricV2 = {
    "version": "0.1.0",
    "name": "obric_v2",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "tradingPair",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "mintX",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "mintY",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "reserveX",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveY",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountX",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountY",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "protocolFee",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "xPriceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "yPriceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "isXToY",
                    "type": "bool"
                },
                {
                    "name": "inputAmt",
                    "type": "u64"
                },
                {
                    "name": "minOutputAmt",
                    "type": "u64"
                }
            ]
        }
    ]
}

export const IDL: ObricV2 = {
    "version": "0.1.0",
    "name": "obric_v2",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "tradingPair",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "mintX",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "mintY",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "reserveX",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveY",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountX",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccountY",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "protocolFee",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "xPriceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "yPriceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "isXToY",
                    "type": "bool"
                },
                {
                    "name": "inputAmt",
                    "type": "u64"
                },
                {
                    "name": "minOutputAmt",
                    "type": "u64"
                }
            ]
        }
    ]
}