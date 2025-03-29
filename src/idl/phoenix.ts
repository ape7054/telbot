export type Phoenix = {
    "version": "0.1.0",
    "name": "phoenix",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "phoenixProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "logAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "market",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "trader",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "baseAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "quoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "baseVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "quoteVault",
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
                    "name": "discriminator",
                    "type": "u8"
                },
                {
                    "name": "orderPacket",
                    "type": {
                        "defined": "OrderPacket"
                    }
                }
            ]
        }
    ],
    "types": [
        {
            "name": "OrderPacket",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "side",
                        "type": {
                            "defined": "Side"
                        }
                    },
                    {
                        "name": "priceInTicks",
                        "type": "u64"
                    },
                    {
                        "name": "numBaseLots",
                        "type": "u64"
                    },
                    {
                        "name": "numQuoteLots",
                        "type": "u64"
                    },
                    {
                        "name": "minBaseLotsToFill",
                        "type": "u64"
                    },
                    {
                        "name": "minQuoteLotsToFill",
                        "type": "u64"
                    },
                    {
                        "name": "selfTradeBehavior",
                        "type": {
                            "defined": "SelfTradeBehavior"
                        }
                    },
                    {
                        "name": "matchLimit",
                        "type": "u64"
                    },
                    {
                        "name": "clientOrderId",
                        "type": "u64"
                    },
                    {
                        "name": "useOnlyDepositedFunds",
                        "type": "bool"
                    },
                    {
                        "name": "lastValidSlot",
                        "type": "u64"
                    },
                    {
                        "name": "lastValidUnixTimestampInSeconds",
                        "type": "u64"
                    },
                    {
                        "name": "orderType",
                        "type": {
                            "defined": "OrderType"
                        }
                    }
                ]
            }
        },
        {
            "name": "Side",
            "type": {
                "kind": "enum",
                "variants": [
                    "bid",
                    "ask"
                ]
            }
        },
        {
            "name": "SelfTradeBehavior",
            "type": {
                "kind": "enum",
                "variants": [
                    "cancelProvide",
                    "cancelTake",
                    "decrement"
                ]
            }
        },
        {
            "name": "OrderType",
            "type": {
                "kind": "enum",
                "variants": [
                    "limit",
                    "immediateOrCancel",
                    "postOnly",
                    "fillOrKill"
                ]
            }
        }
    ]
}

export const IDL: Phoenix = {
    "version": "0.1.0",
    "name": "phoenix",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "phoenixProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "logAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "market",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "trader",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "baseAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "quoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "baseVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "quoteVault",
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
                    "name": "discriminator",
                    "type": "u8"
                },
                {
                    "name": "orderPacket",
                    "type": {
                        "defined": "OrderPacket"
                    }
                }
            ]
        }
    ],
    "types": [
        {
            "name": "OrderPacket",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "side",
                        "type": {
                            "defined": "Side"
                        }
                    },
                    {
                        "name": "priceInTicks",
                        "type": "u64"
                    },
                    {
                        "name": "numBaseLots",
                        "type": "u64"
                    },
                    {
                        "name": "numQuoteLots",
                        "type": "u64"
                    },
                    {
                        "name": "minBaseLotsToFill",
                        "type": "u64"
                    },
                    {
                        "name": "minQuoteLotsToFill",
                        "type": "u64"
                    },
                    {
                        "name": "selfTradeBehavior",
                        "type": {
                            "defined": "SelfTradeBehavior"
                        }
                    },
                    {
                        "name": "matchLimit",
                        "type": "u64"
                    },
                    {
                        "name": "clientOrderId",
                        "type": "u64"
                    },
                    {
                        "name": "useOnlyDepositedFunds",
                        "type": "bool"
                    },
                    {
                        "name": "lastValidSlot",
                        "type": "u64"
                    },
                    {
                        "name": "lastValidUnixTimestampInSeconds",
                        "type": "u64"
                    },
                    {
                        "name": "orderType",
                        "type": {
                            "defined": "OrderType"
                        }
                    }
                ]
            }
        },
        {
            "name": "Side",
            "type": {
                "kind": "enum",
                "variants": [
                    "bid",
                    "ask"
                ]
            }
        },
        {
            "name": "SelfTradeBehavior",
            "type": {
                "kind": "enum",
                "variants": [
                    "cancelProvide",
                    "cancelTake",
                    "decrement"
                ]
            }
        },
        {
            "name": "OrderType",
            "type": {
                "kind": "enum",
                "variants": [
                    "limit",
                    "immediateOrCancel",
                    "postOnly",
                    "fillOrKill"
                ]
            }
        }
    ]
}