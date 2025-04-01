import dotenv from 'dotenv';
import Tapchain from '../tapchain';
dotenv.config();

async function testSend() {
    try {
        // 使用 Tapchain 类而不是直接使用 TelegramBot
        console.log('正在初始化 Tapchain...');
        const tapchain = new Tapchain();
        
        const message = '手动测试消息 ' + new Date().toLocaleString();
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!chatId) {
            throw new Error('TELEGRAM_CHAT_ID 未设置');
        }
        
        console.log(`正在发送消息到聊天ID: ${chatId}...`);
        
        // 使用 Promise 包装发送消息，设置超时
        const sendWithTimeout = async () => {
            return new Promise((resolve, reject) => {
                // 增加超时时间到 30 秒
                const timeout = setTimeout(() => {
                    reject(new Error('发送消息超时'));
                }, 30000);
                
                tapchain.sendBotMsg(message, chatId)
                    .then(result => {
                        clearTimeout(timeout);
                        resolve(result);
                    })
                    .catch(error => {
                        clearTimeout(timeout);
                        console.error('API 错误详情:', error);  // 添加详细错误日志
                        reject(error);
                    });
            });
        };
        
        // 尝试发送消息，最多重试 3 次
        let attempt = 1;
        const maxAttempts = 3;
        
        while (attempt <= maxAttempts) {
            try {
                console.log(`尝试发送消息 (${attempt}/${maxAttempts})...`);
                await sendWithTimeout();
                console.log('消息发送成功！');
                break;
            } catch (error) {
                console.error(`尝试 ${attempt} 失败:`, error);
                
                if (attempt === maxAttempts) {
                    throw new Error(`发送消息失败，已尝试 ${maxAttempts} 次`);
                }
                
                // 等待时间递增
                const waitTime = attempt * 2000;
                console.log(`等待 ${waitTime}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
            }
        }
        
        console.log('测试完成');
    } catch (error) {
        console.error('发送消息时出错:', error);
    } finally {
        // 确保程序退出
        setTimeout(() => process.exit(), 1000);
    }
}

testSend().catch(error => {
    console.error('程序执行出错:', error);
    process.exit(1);
});