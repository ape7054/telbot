export type Whirlpool = {
  version: '0.1.0';
  name: 'whirlpool';
  instructions: [
    {
      name: 'swap';
      accounts: [
        {
          name: 'tokenProgramA';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenProgramB';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'memoProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenAuthority';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'whirlpool';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tokenMintA';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenMintB';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenOwnerAccountA';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tokenVaultA';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tokenOwnerAccountB';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tokenVaultB';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tickArray0';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tickArray1';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tickArray2';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'oracle';
          isMut: true;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
        {
          name: 'otherAmountThreshold';
          type: 'u64';
        },
        {
          name: 'sqrtPriceLimit';
          type: 'u128';
        },
        {
          name: 'amountSpecifiedIsInput';
          type: 'bool';
        },
        {
          name: 'aToB';
          type: 'bool';
        },
        {
          name: 'remainingAccountsInfo';
          type: {
            option: {
              defined: 'RemainingAccountsInfo';
            };
          };
        },
      ];
    },
  ];
};

export const IDL: Whirlpool = {
  version: '0.1.0',
  name: 'whirlpool',
  instructions: [
    {
      name: 'swap',
      accounts: [
        {
          name: 'tokenProgramA',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgramB',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'memoProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenAuthority',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'whirlpool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenMintA',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenMintB',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenOwnerAccountA',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenVaultA',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenOwnerAccountB',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenVaultB',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tickArray0',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tickArray1',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tickArray2',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'oracle',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
        {
          name: 'otherAmountThreshold',
          type: 'u64',
        },
        {
          name: 'sqrtPriceLimit',
          type: 'u128',
        },
        {
          name: 'amountSpecifiedIsInput',
          type: 'bool',
        },
        {
          name: 'aToB',
          type: 'bool',
        },
        {
          name: 'remainingAccountsInfo',
          type: {
            option: {
              defined: 'RemainingAccountsInfo',
            },
          },
        },
      ],
    },
  ],
};
