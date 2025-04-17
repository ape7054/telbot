export const BotStates = {
  // 钱包相关状态
  WAIT_PRIVATE_KEY: 'waitSiyao',
  WAIT_ADMIN_APPROVAL: 'waitAdmin',
  
  // 设置相关状态
  SET_SWAP_SLIPPAGE: 'setSwapSlippage',
  SET_SWAP_GAS: 'setSwapGas',
  SET_JITO_FEE: 'setJitoFee',
  
  // 狙击相关状态
  SNIPE_NUMBER: 'snipeNumber',
  SNIPE_AUTO_MAX_SOL: 'snipeAutoMaxSol',
  SNIPE_AUTO_GAS: 'snipeAutoGas',
  SNIPE_AUTO_LONG_TIME: 'snipeAutoLongTime',
  SNIPE_AUTO_LONG_BILL: 'snipeAutoLongBili',
  SNIPE_AUTO_LONG_SELL: 'snipeAutoLongSell',
  SNIPE_AUTO_LONG_FORCE: 'snipeAutoLongForce',
  SNIPE_AUTO_FAST_SELL: 'snipeAutoFastSell',
  SNIPE_AUTO_MAX_BUY_POSITION: 'snipeAutoMaxBuyPosition',
  SNIPE_AUTO_MAX_SWAP_POSITION: 'snipeAutoMaxSwapPosition',
  
  // 跟单相关状态
  WAIT_FOLLOW: 'waitFollow',
  SET_PUMP_SOL: 'setPumpSol',
  SET_RAY_SOL: 'setRaySol',
  SET_NAME: 'setName',
  SET_GAS: 'setGas',
  SET_GAS_SELL: 'setGasSell',
  SET_PUMP_FEE: 'setPumpfee',
  SET_RAY_FEE: 'setRayfee',
  SET_MAX_WIN: 'setMaxWin',
  SET_MAX_LOSE: 'setMaxLose',
  ADD_KILL_WIN: 'addKillWin',
  ADD_KILL_LOSE: 'addKillLose',
  SET_SELL_BILL: 'setSellBili',
  SET_FAST_SELL: 'setFastSell',
  SET_FOLLOW_JITO_FEE: 'setFollowJitoFee',
  SET_RAY_POOL_RANGE: 'setRayPoolRange',
  SET_PUMP_POOL_RANGE: 'setPumpPoolRange',
  
  // 代币交易相关状态
  BUY_X_TOKEN: 'buyXToken',
  SELL_X_TOKEN: 'sellXToken'
} as const;

export type BotStateType = keyof typeof BotStates;