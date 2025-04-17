export const BotStates = {
  // 钱包相关状态
  WAIT_PRIVATE_KEY: 'waitSiyao',
  WAIT_ADMIN_APPROVAL: 'waitAdmin',
  
  // 设置相关状态
  SET_SWAP_SLIPPAGE: 'setSwapSlippage',
  SET_SWAP_GAS: 'setSwapGas',
  SET_JITO_FEE: 'setJitoFee',
  
  // 狙击相关状态
  SNIPE_AUTO_MAX_SOL: 'snipeAutoMaxSol',
  SNIPE_NUMBER: 'snipeNumber',
  
  // 跟单相关状态
  WAIT_FOLLOW: 'waitFollow'
} as const;