export type OpenBook = {
    "version": "0.1.0",
    "name": "openbook",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "penaltyPayer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "openOrdersAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "market",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "marketAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "marketBaseVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "marketQuoteVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userBaseAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userQuoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "referrerAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        }
    ]
}

export const IDL: OpenBook = {
    "version": "0.1.0",
    "name": "openbook",
    "instructions": [
        {
            "name": "swap",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "penaltyPayer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "openOrdersAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "market",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "marketAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "marketBaseVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "marketQuoteVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userBaseAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userQuoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "referrerAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        }
    ]
}