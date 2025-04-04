import bs58 from 'bs58';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();
// // 假设你的私钥是 Base58 格式
const privateKeyBase58 = process.env.SIYAO; // 替换为你的私钥

// 将 Base58 私钥解码为 Uint8Array
const privateKeyArray = bs58.decode(privateKeyBase58);

// 将 Uint8Array 转换为数组
const privateKeyJson = Array.from(privateKeyArray);
console.log(privateKeyJson);
// 保存为 JSON 文件
const walletPath = 'wallet.json'; // 保存路径
fs.writeFileSync(walletPath, JSON.stringify(privateKeyJson));

console.log('Wallet JSON saved to:', walletPath);
