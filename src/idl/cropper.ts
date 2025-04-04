export type Cropper = {
  version: '0.1.0';
  name: 'cropper';
  instructions: [
    {
      name: 'swap';
      accounts: [
        {
          name: 'tokenProgram';
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
          isMut: false;
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
      ];
    },
  ];
};

export const IDL: Cropper = {
  version: '0.1.0',
  name: 'cropper',
  instructions: [
    {
      name: 'swap',
      accounts: [
        {
          name: 'tokenProgram',
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
          isMut: false,
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
      ],
    },
  ],
};
