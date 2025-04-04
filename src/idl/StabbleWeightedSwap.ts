export type StabbleWeightedSwap = {
  version: '0.1.0';
  name: 'Stabble+Weighted+Swap';
  instructions: [
    {
      name: 'swap';
      accounts: [
        {
          name: 'user'; // 5EXXobLd... (费用支付者)
          isMut: true;
          isSigner: true;
        },
        {
          name: 'mintIn'; // WSOL Mint
          isMut: false;
          isSigner: false;
        },
        {
          name: 'mintOut'; // USDC Mint
          isMut: false;
          isSigner: false;
        },
        {
          name: 'userTokenIn'; // 2wSZcceP... (用户输入代币账户)
          isMut: true;
          isSigner: true;
        },
        {
          name: 'userTokenOut'; // 2P4pEt8a... (用户输出代币账户)
          isMut: true;
          isSigner: true;
        },
        {
          name: 'vaultTokenIn'; // WSOL 金库
          isMut: true;
          isSigner: false;
        },
        {
          name: 'vaultTokenOut'; // USDC 金库
          isMut: true;
          isSigner: false;
        },
        {
          name: 'beneficiaryTokenOut'; // USDC 手续费账户
          isMut: true;
          isSigner: false;
        },
        {
          name: 'pool'; // WSOL-USDC 市场
          isMut: true;
          isSigner: false;
        },
        {
          name: 'withdrawAuthority'; // 金库提取权限
          isMut: false;
          isSigner: false;
        },
        {
          name: 'vault'; // 金库状态账户
          isMut: false;
          isSigner: false;
        },
        {
          name: 'vaultAuthority'; // 金库权限账户
          isMut: false;
          isSigner: false;
        },
        {
          name: 'vaultProgram'; // Stabble 金库程序
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenProgram'; // Token 程序
          isMut: false;
          isSigner: false;
        },
        {
          name: 'token2022Program'; // Token2022 程序
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
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

export const IDL: StabbleWeightedSwap = {
  version: '0.1.0',
  name: 'Stabble+Weighted+Swap',
  instructions: [
    {
      name: 'swap',
      accounts: [
        {
          name: 'user', // 5EXXobLd... (费用支付者)
          isMut: true,
          isSigner: true,
        },
        {
          name: 'mintIn', // WSOL Mint
          isMut: false,
          isSigner: false,
        },
        {
          name: 'mintOut', // USDC Mint
          isMut: false,
          isSigner: false,
        },
        {
          name: 'userTokenIn', // 2wSZcceP... (用户输入代币账户)
          isMut: true,
          isSigner: true,
        },
        {
          name: 'userTokenOut', // 2P4pEt8a... (用户输出代币账户)
          isMut: true,
          isSigner: true,
        },
        {
          name: 'vaultTokenIn', // WSOL 金库
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vaultTokenOut', // USDC 金库
          isMut: true,
          isSigner: false,
        },
        {
          name: 'beneficiaryTokenOut', // USDC 手续费账户
          isMut: true,
          isSigner: false,
        },
        {
          name: 'pool', // WSOL-USDC 市场
          isMut: true,
          isSigner: false,
        },
        {
          name: 'withdrawAuthority', // 金库提取权限
          isMut: false,
          isSigner: false,
        },
        {
          name: 'vault', // 金库状态账户
          isMut: false,
          isSigner: false,
        },
        {
          name: 'vaultAuthority', // 金库权限账户
          isMut: false,
          isSigner: false,
        },
        {
          name: 'vaultProgram', // Stabble 金库程序
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram', // Token 程序
          isMut: false,
          isSigner: false,
        },
        {
          name: 'token2022Program', // Token2022 程序
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
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
