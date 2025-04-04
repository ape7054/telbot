import WebSocket from 'ws';
import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import bs58 from 'bs58';
import { JupSwaps, Programs, JupiterProgram, RouterInfo } from './config';
const ws: WebSocket = new WebSocket(
  'https://mainnet.helius-rpc.com/?api-key=d2b9c2e8-adca-4fa5-a152-bd3962cad5a8'
);
const solscan = 'https://solscan.io/tx/';
import { struct } from '@solana/buffer-layout';
import { publicKey, u64 } from '@solana/buffer-layout-utils';
const emptyRouterInfo = (): RouterInfo => ({
  id: 0,
  signature: '', // 添加缺失的属性
  slot: 0, // 添加缺失的属性
  type: '', // 添加缺失的属性
  signer: '', // 添加缺失的属性
  amm: '',
  name: '',
  input: '',
  output: '',
  inpool: '',
  outpool: '',
  poola: '',
  poolb: '',
  in: '',
  out: '',
});

export interface EventsData {
  amm: PublicKey;
  inputMint: PublicKey;
  inputAmount: BigInt;
  outputMint: PublicKey;
  outputAmount: BigInt;
}

export const SwapEventData = struct<EventsData>([
  publicKey('amm'),
  publicKey('inputMint'),
  u64('inputAmount'),
  publicKey('outputMint'),
  u64('outputAmount'),
]);

// Function to send a request to the WebSocket server
function sendRequest(ws: WebSocket) {
  const request = {
    jsonrpc: '2.0',
    id: 420,
    method: 'transactionSubscribe',
    params: [
      {
        failed: false,
        accountInclude: [
          'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
          '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
          'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        ],
      },
      {
        commitment: 'processed',
        encoding: 'jsonParsed',
        transactionDetails: 'full',
        showRewards: true,
        maxSupportedTransactionVersion: 0,
      },
    ],
  };
  ws.send(JSON.stringify(request));
}

// Function to send a ping to the WebSocket server
function startPing(ws: WebSocket) {
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
      console.log('Ping sent');
    }
  }, 30000); // Ping every 30 seconds
}

// Define WebSocket event handlers
ws.on('open', function open() {
  console.log('WebSocket is open');
  sendRequest(ws); // Send a request once the WebSocket is open
  startPing(ws); // Start sending pings
});

function eventdecode(str: string) {
  //const decodedBytes = Buffer.from(bs58.decode(str));

  var decodedBytes = bs58.encode(Buffer.from(str, 'base64'));
  console.log(decodedBytes);
  // 构建结果 JSON
  return {};
}

ws.on('message', function incoming(data: WebSocket.Data) {
  const messageStr = data.toString('utf8');
  const messageObj = JSON.parse(messageStr);
  try {
    //var logs = messageObj.params?.result.transaction.meta.logMessages;
    var signatures = messageObj.params?.result.transaction?.transaction.signatures;
    var instructions = messageObj.params?.result.transaction?.transaction.message.instructions;
    if (instructions == undefined) instructions = [];
    var innerInstructions = messageObj.params?.result.transaction?.meta.innerInstructions || [];
    var accountKeys = messageObj.params?.result.transaction?.transaction.message.accountKeys || [];
    var postTokenBalances = messageObj.params?.result.transaction?.meta.postTokenBalances;

    if (instructions.length > 0) {
      instructions.forEach((item: any, mainindex: number) => {
        var routertype = Programs.indexOf(item.programId);
        var spltokens: any[] = [];
        if (routertype == 2) {
          if (item.accounts.length == 16) {
            routertype = 0;
          }
        }
        // if (routertype==9 && item.accounts.length!=8) {
        //     routertype = 0;
        // }
        // if (routertype==18) {
        //     innerInstructions.forEach((ins:any) => {
        //         if(ins.index == mainindex){
        //             if(ins.instructions.length<2){
        //                 console.log("不是 swap");
        //                 routertype = 0;
        //             }
        //         }
        //     })
        // }
        var ins =
          innerInstructions.find((insx: any) => insx.index === mainindex)?.instructions || [];
        if (routertype > 0 && ins.length > 0) {
          var amminfo = emptyRouterInfo();
          amminfo.id = routertype;
          ins.forEach((insitem: any) => {
            if (amminfo.id > 0 && insitem.program == 'spl-token') {
              if (amminfo.id == 5) {
                //过滤手续费地址
                if (insitem.parsed.info.destination != maininsitem.accounts[5]) {
                  spltokens.push(insitem.parsed.info);
                }
              } else if (amminfo.id == 7) {
                if (insitem.parsed.info.mintAuthority == undefined) {
                  spltokens.push(insitem.parsed.info);
                }
              } else if (amminfo.id == 6) {
                if (
                  insitem.parsed.info.destination != maininsitem.accounts[8] &&
                  insitem.parsed.info.destination != maininsitem.accounts[9]
                ) {
                  spltokens.push(insitem.parsed.info);
                }
              } else if (amminfo.id == 11) {
                if (insitem.parsed.info.mintAuthority == undefined) {
                  spltokens.push(insitem.parsed.info);
                }
              } else if (amminfo.id == 15) {
                //3Dgv4oLq24KAu5WVej4ixt69NCVC2HKci1uYeQkjhQEzs3kokGxFJSyRRUY2JeyE5kopUAiV1vnxQni3CCrVHdkM
                if (insitem.parsed.info.destination != maininsitem.accounts[5]) {
                  spltokens.push(insitem.parsed.info);
                }
              } else {
                spltokens.push(insitem.parsed.info);
              }
            }
          });
          if (spltokens.length == 2) {
            var open = spltokens[0];
            var close = spltokens[1];
            if (amminfo.id == 14) {
              open = spltokens[1];
              close = spltokens[0];
            }
            amminfo.poola = open.destination;
            amminfo.poolb = close.source;
            if (amminfo.id == 3) {
              if (item.accounts[0] != accountKeys[0].pubkey) {
                console.log('非swap', solscan + signatures[0]);
                amminfo.id = 0;
              }
            }
            if (amminfo.id == 2) {
            }
            if (open.mint == undefined) {
              amminfo.in = open.amount;
              amminfo.out = close.amount;
            } else {
              amminfo.in = open.tokenAmount.amount;
              amminfo.out = spltokens[1].tokenAmount.amount;
              // amminfo.input = open.mint;
              // amminfo.output = close.mint;
            }
          } else {
            if (spltokens.length > 2) {
              // console.log(routertype,solscan+signatures[0]);
              // console.log(amminfo);
              // console.log(spltokens);
              // process.exit()
              amminfo.id = 0;
            } else {
              amminfo.id = 0;
            }
          }
          if (amminfo.id > 0) {
            postTokenBalances.forEach((val: any) => {
              if (accountKeys[val.accountIndex].pubkey == amminfo.poola) {
                amminfo.input = val.mint;
              }
              if (accountKeys[val.accountIndex].pubkey == amminfo.poolb) {
                amminfo.output = val.mint;
              }
            });
            if (amminfo.input == '' || amminfo.output == '') {
              // console.log(solscan+signatures[0],routertype);
              // amminfo.name = JupSwaps[item.programId];
              // console.log(amminfo);
              // console.log(ins);
              // console.log(spltokens);
              // process.exit()
            } else if (amminfo.input == amminfo.output) {
              console.log(solscan + signatures[0], routertype, '=7=');
              amminfo.name = JupSwaps[item.programId];
              console.log(amminfo);
              console.log(ins);
              console.log(spltokens);
              process.exit();
            } else {
              // var txLog = `TX: ${solscan}${signatures[0]}, RouterType: ${routertype}\n`;
              // txLog += JSON.stringify(amminfo) + "\n\n";
              // fs.appendFileSync('/Users/apple/Desktop/2025/typescript/telbot/txLog.log', txLog);
            }
            (async () => {
              try {
                amminfo.amm = item.programId;
                amminfo.name = JupSwaps[item.programId];
                //await jupiterSwap.doubleswap(signatures[0],1000000, amminfo);
              } catch (error) {
                console.error('Swap error:', error);
              }
            })();
          }
        }
        if (
          item.programId == JupiterProgram &&
          item.data &&
          item.accounts[0] == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' &&
          !item.accounts.includes('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
        ) {
          var route_num = 0;
          //console.log(solscan+signatures[0]);
          var routes: RouterInfo[] = [];
          var amminfo: RouterInfo = emptyRouterInfo();
          var routertype = 0;
          var spltokens: any[] = [];
          var maininsitem: any = {};
          ins.forEach((insitem: any) => {
            routertype = Programs.indexOf(insitem.programId);
            var isLogIns = 0;
            //交易所2 和 交易所9 存在日志 并先与 jupiter 日志打印
            if (routertype == 2 || routertype == 9) {
              if (insitem.accounts.length == 1) {
                isLogIns = 1;
              }
            }
            if (routertype == 5) {
              //stabble Vault Program: withdraw
              let rizhi = 0;
              if (insitem.accounts[0] == 'BXj5a4J5YDByKzd3Y7NU59QDrjy1KcH1dCbftsxJGmna') rizhi = 1;
            }
            if (routertype > 0) {
              //确保不是日志记录，才新建交易信息
              if (isLogIns == 0) {
                route_num++;
                amminfo.id = routertype;
                amminfo.amm = insitem.programId;
                maininsitem = insitem;
                spltokens = [];
              }
            } else {
              if (amminfo.id > 0 && insitem.program == 'spl-token') {
                if (amminfo.id == 5) {
                  //过滤手续费地址
                  if (insitem.parsed.info.destination != maininsitem.accounts[5]) {
                    spltokens.push(insitem.parsed.info);
                  }
                } else if (amminfo.id == 7) {
                  if (insitem.parsed.info.mintAuthority == undefined) {
                    spltokens.push(insitem.parsed.info);
                  }
                } else if (amminfo.id == 6) {
                  if (
                    insitem.parsed.info.destination != maininsitem.accounts[8] &&
                    insitem.parsed.info.destination != maininsitem.accounts[9]
                  ) {
                    spltokens.push(insitem.parsed.info);
                  }
                } else if (amminfo.id == 11) {
                  if (insitem.parsed.info.mintAuthority == undefined) {
                    spltokens.push(insitem.parsed.info);
                  }
                } else if (amminfo.id == 15) {
                  //3Dgv4oLq24KAu5WVej4ixt69NCVC2HKci1uYeQkjhQEzs3kokGxFJSyRRUY2JeyE5kopUAiV1vnxQni3CCrVHdkM
                  if (insitem.parsed.info.destination != maininsitem.accounts[5]) {
                    spltokens.push(insitem.parsed.info);
                  }
                } else {
                  spltokens.push(insitem.parsed.info);
                }
              }
              //每个jupiter交易都以event log结束,这里重置变量，开启下一个交易所的抓起
              if (insitem.programId == 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') {
                if (amminfo.id > 0) {
                  if (spltokens.length == 2) {
                    var open = spltokens[0];
                    var close = spltokens[1];
                    if (amminfo.id == 14) {
                      open = spltokens[1];
                      close = spltokens[0];
                    }
                    if (amminfo.id == 9) {
                      open = spltokens[1];
                      close = spltokens[0];
                    }
                    amminfo.poola = open.destination;
                    amminfo.poolb = close.source;
                    if (open.mint == undefined) {
                      amminfo.in = open.amount;
                      amminfo.out = close.amount;
                    } else {
                      amminfo.in = open.tokenAmount.amount;
                      amminfo.out = spltokens[1].tokenAmount.amount;
                      amminfo.input = open.mint;
                      amminfo.output = close.mint;
                    }
                    if (amminfo.poola == amminfo.poolb) {
                      console.log(solscan + signatures[0], '1');
                      console.log(amminfo);
                      console.log(spltokens);
                      process.exit();
                    }
                    routes.push(amminfo);
                  } else {
                    if (spltokens.length > 0) {
                      //7 47RQE1ts4AA6iRVVHASHFR854MhLzNtEtDqkZMJ2sXzzxUFarJH8rDNe4o6U8FgyVo5n7m9CFKDdrufvs8q2EQTD
                      console.log(solscan + signatures[0]);
                      console.log(spltokens);
                      console.log(maininsitem);
                      console.log(amminfo);
                      process.exit();
                    } else {
                      console.log(solscan + signatures[0]);
                      console.log('出现空交易', amminfo.id, amminfo.amm);
                    }
                  }
                }
                amminfo = emptyRouterInfo();
              }
            }
          });
          var routesData: RouterInfo[] = routes.map(item => {
            if (item.poola == '' || item.poolb == '' || item.poola == item.poolb) {
              console.log(solscan + signatures[0], '=5=');
              console.log(item);
              process.exit();
            }
            if (item.input == '' || item.output == '') {
              postTokenBalances.forEach((ptb: any) => {
                const accountKey = accountKeys[ptb.accountIndex].pubkey;
                if (accountKey === item.poola) {
                  item.input = ptb.mint;
                  item.in = new Decimal(item.in).div(10 ** ptb.uiTokenAmount.decimals) + '';
                }
                if (accountKey === item.poolb) {
                  item.output = ptb.mint;
                  item.out = new Decimal(item.out).div(10 ** ptb.uiTokenAmount.decimals) + '';
                }
              });
            }
            if (item.input == '' || item.output == '' || item.input == item.output) {
              console.log(solscan + signatures[0], '=1=');
              console.log(item);
              console.log(postTokenBalances);
              process.exit();
            }
            item.name = JupSwaps[item.amm];
            return item;
          });
          //计算首尾不相连的情况，存在漏掉交易的情况
          var status = isCircular(routesData);
          if (status == true) {
            (async () => {
              try {
                //await jupiterSwap.swap(signatures[0],1000000, routesData);
              } catch (error) {
                console.error('Swap error:', error);
              }
            })();
          } else {
            if (routesData.length > 0) {
              routesData.forEach((item: RouterInfo) => {
                // (async () => {
                //     try {
                //         await jupiterSwap.doubleswap(signatures[0],1000000, item);
                //     } catch (error) {
                //         console.error('Swap error:', error);
                //     }
                // })();
              });
            }
            if (routesData.length != route_num) {
              console.log(solscan + signatures[0], 'route_num: ' + route_num);
              console.log(routes);
              process.exit();
            }
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to parse JSON:', e);
  }
});

function isCircular(data: RouterInfo[]): boolean {
  if (data.length <= 1) return false;
  // 检查每一对相邻对象的 output 和 input 是否相等
  for (let i = 0; i < data.length - 1; i++) {
    const currentOutput = data[i].output;
    const nextInput = data[i + 1].input;
    if (currentOutput !== nextInput) return false;
  }
  return true;
}

ws.on('error', function error(err: Error) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('WebSocket is closed');
});
