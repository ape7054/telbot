

export type Invariant = {
    "version": "0.1.0",
    "name": "invariant",
    "instructions": [
        {
            "name": "swap",
          
            "accounts": [
            // "accounts": 对应数据
            // Action: Swap 0.003178165 WSOL for 0.401035 USDC on Invariant Swap
            // Interact With: Invariant Swap - HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt
            // Input Accounts:
            // #1 - State: 8NsPwRFYqob3FzYvHYTjFK6WVFJADFN8Hn7yNQKcVNW1
            // #2 - Pool: Invariant (USDC-WSOL) Market
            // #3 - Tickmap: 6te341EkeDvjs9xcPyZALYFKGLSBXD2Ski7SPTGcdvpv
            // #4 - Account X: 8hhRkiRfhAqG4vx8UNSZd1JBvd1VqxHDb4HMYaYmvKxj
            // #5 - Account Y: D9XTzTHeFEBaZNWsa326uWoFNndmET1HSYMWkQMgT72p
            // #6 - Reserve X: Invariant (USDC-WSOL) Pool 1
            // #7 - Reserve Y: Invariant (USDC-WSOL) Pool 2
            // #8 - Owner: A1VcpCX9SkE2LZvjpRGufmVP8TNJoEusWT2Hq59GKidx
            // #9 - Program Authority: Invariant Vault Authority
            // #10 - Token Program: Token Program
                {
                    "name": "state",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "pool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tickmap",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "accountX",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "accountY",
                    "isMut": true,
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
                    "name": "owner",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "programAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                //args: 对应的数据
                //{
                //  "xToY": {
                //    "type": "bool",
                //    "data": false
                //  },
                //  "amount": {
                //    "type": "u64",
                //    "data": "3178165"
                //  },
                //  "byAmountIn": {
                //    "type": "bool",
                //    "data": true
                //  },
                //  "sqrtPriceLimit": {
                //    "type": "u128",
                //    "data": "65535383934512647000000000000"
                //  }
                //}
                {
                    "name": "xToY",
                    "type": "bool"
                },
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "byAmountIn",
                    "type": "bool"
                },
                {
                    "name": "sqrtPriceLimit",
                    "type": "u128"
                }
            ]
        },
    ]
}

export const IDL: Invariant = {
    "version": "0.1.0",
    "name": "invariant",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "state",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "pool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tickmap",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "accountX",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "accountY",
                    "isMut": true,
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
                    "name": "owner",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "programAuthority",
                    "isMut": false,
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
                    "name": "xToY",
                    "type": "bool"
                },
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "byAmountIn",
                    "type": "bool"
                },
                {
                    "name": "sqrtPriceLimit",
                    "type": "u128"
                }
            ]
        }
    ]
}