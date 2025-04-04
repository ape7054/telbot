export type Raydium = {
  version: '0.1.0';
  name: 'Raydium';
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
          name: 'amm';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'ammAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'ammOpenOrders';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'ammTargetOrders';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'poolCoinTokenAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'poolPcTokenAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'serumProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'serumMarket';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'serumBids';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'serumAsks';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'serumEventQueue';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'serumCoinVaultAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'serumPcVaultAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'serumVaultSigner';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'userSourceTokenAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'userDestinationTokenAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'userSourceOwner';
          isMut: true;
          isSigner: true;
        },
      ];
      args: [
        {
          name: 'discriminator';
          type: 'u8';
        },
        {
          name: 'amountIn';
          type: 'u64';
        },
        {
          name: 'minimumAmountOut';
          type: 'u64';
        },
      ];
    },
  ];
};

export const IDL: Raydium = {
  version: '0.1.0',
  name: 'Raydium',
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
          name: 'amm',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'ammAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'ammOpenOrders',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'ammTargetOrders',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'poolCoinTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'poolPcTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'serumProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'serumMarket',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'serumBids',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'serumAsks',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'serumEventQueue',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'serumCoinVaultAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'serumPcVaultAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'serumVaultSigner',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'userSourceTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'userDestinationTokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'userSourceOwner',
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'discriminator',
          type: 'u8',
        },
        {
          name: 'amountIn',
          type: 'u64',
        },
        {
          name: 'minimumAmountOut',
          type: 'u64',
        },
      ],
    },
  ],
};
