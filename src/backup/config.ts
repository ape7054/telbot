export const JupiterProgram = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
export const EventAuthority = 'D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf';
export const Token2022Program = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export const CONFIG = {
  SOLSCAN_URL: 'https://solscan.io/tx/',
  GRPC_URL: 'http://127.0.0.1:10001',
};

export const ProgramAuthority = [
  '6LXutJvKUw8Q5ue2gCgKHQdAN4suWW8awzFVC6XCguFx',
  '4xDsmeTWPNjgSVSS1VTfzFq3iHZhp77ffPkAmkZkdu71',
  'CapuXNQoDviLvU1PxFiizLgPNQCxrsag1uMeyk6zLVps',
  '6U91aKa8pmMxkJwBCfPTmUEfZi6dHe7DcFq2ALvB2tbB',
  'BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV',
  '2MFoS3MPtvyQ4Wh4M9pdfPjz6UhVoNbFbGJAskCPCj3h',
  '9nnLbotNTcUhvbrsA6Mdkx45Sm82G35zo28AqUvjExn8',
];

export const Programs = [
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  'SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe', //1
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', //2
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', //3 Raydium Concentrated Liquidity
  'ZERor4xhbUycZ6gb9ntrhqscUcZmAbQDjEAtCf4hbZY', //4
  'swapFpHZwjELNnjvThjajtiVmkz3yPQEHjLtka2fwHW', //5
  'DEXYosS6oEGvk8uCDayvwEZz4qEyDJRf9nFgYCaqPMTm', //6
  '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c', //7
  'obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y', //8
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY', //9
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', //10
  'FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X', //11Fluxbeam
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C', //12 Raydium CPMM
  'H8W3ctz92svYg6mkn1UtGfu2aQr2fnUFHM1RhScEtQDt', //13 Cropper Whirlpool
  'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt', //14 Invariant Swap
  'swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ', //15
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', //16 Raydium Swap
  '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h', //17
  'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb', //18
];

export const JupSwaps: { [key: string]: string } = {
  SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe: 'SolFi',
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: 'Meteora+DLMM',
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: 'Raydium+CLMM',
  ZERor4xhbUycZ6gb9ntrhqscUcZmAbQDjEAtCf4hbZY: 'ZeroFi', //没找到相关交易对
  swapFpHZwjELNnjvThjajtiVmkz3yPQEHjLtka2fwHW: 'Stabble+Weighted+Swap',

  DEXYosS6oEGvk8uCDayvwEZz4qEyDJRf9nFgYCaqPMTm: '1DEX',
  '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c': 'Lifinity+V2',
  obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y: 'Obric+V2',
  PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY: 'Phoenix',
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Whirlpool',

  FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X: 'FluxBeam',
  CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: 'Raydium+CP', //没找到相关交易对
  H8W3ctz92svYg6mkn1UtGfu2aQr2fnUFHM1RhScEtQDt: 'Cropper',
  HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt: 'Invariant',
  swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ: 'Stabble+Stable+Swap', //没找到相关交易对

  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium', //
  '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h': 'RaydiumliquiditypoolAMM', //没找到相关交易对
  opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb: 'OpenBook+V2', //
  treaf4wWBBty3fHdyBpo35Mz84M8k3heKXmjmi9vFt5: 'Helium+Network', //没有找到相关交易对
  stkitrT1Uoy18Dk1fTrgPw8W6MVzoCfYoAFT4MLsmhq: 'Sanctum', //没有找到相关交易对

  CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4: 'Aldrin+V2',
  SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8: 'Token+Swap',
  EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S: 'Lifinity+V1',
  PSwapMdSai8tjrEXcxFeQth87xC4rRsa4VA5mhGhXkP: 'Penguin',
  '5jnapfrAN47UYkLkEf7HnprPPBCQLvkYWGZDeKkaP5hv': 'Daos.fun',

  SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr: 'Saros',
  AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6: 'Aldrin',
  '9tKE7Mbmj4mxDjWatikzGAtkoWosiiZX9y6J4Hfm2R8H': 'Oasis',
  '5U3EU2ubXtK84QcRjWVmYt9RaDyA8gKxdUrPFXmZyaki': 'Virtuals',
  PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu: 'Perps',

  Gswppe6ERWKpUTXvRPfXdzHhiCyJvLadVvXGfdpBqcE1: 'Guacswap',
  JoeaRXgtME3jAoz5WuFXGEndfv4NPH9nBxsLq44hk9J: 'Token+Mill',
  DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1: 'Orca+V1',
  NUMERUNsFCP3kuNmWZuXtm1AaQCPj9uw6Guv2Ekoi5P: 'Perena',
  Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB: 'Meteora',

  MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky: 'Mercurial',
  BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p: 'Bonkswap',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca+V2',
  SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ: 'Saber',
  Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j: 'StepN',

  DecZY86MU5Gj7kppfUCEmd4LbXXuyZH1yHaP2NTqdiZB: 'Saber (Decimals)',
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: 'Openbook',
  endoLNCKTqDn8gSVnN2hDdpgACUPWHZTwoYnnMybpAT: 'Solayer',
  DSwpgjMvXhtGn6BsbqmacdBZyfLj6jSWf3HJpdJtmg6N: 'DexLab',
  '5ocnV1qiCgaQR8Jb8xWnVbApfaygJ8tNoZfgPwsgx9kx': 'Sanctum Infinity',

  CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR: 'Crema',
};

export interface RouterInfo {
  id: number; //Routertype
  signature: string;
  slot: number;
  type: string;
  signer: string;
  amm: string;
  name: string;
  input: string;
  output: string;
  inpool: string;
  outpool: string;
  poola: string;
  poolb: string;
  in: string;
  out: string;
}
