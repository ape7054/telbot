import Tapchain from '../tapchain';
import TelegramBot from 'node-telegram-bot-api';

// 模拟 TelegramBot
jest.mock('node-telegram-bot-api');

describe('Tapchain', () => {
    let tapchain: Tapchain;
    
    beforeEach(() => {
        // 确保每个测试前环境变量存在
        process.env.TELEGRAM_BOT_TOKEN = 'test-token';
        tapchain = new Tapchain();
    });

    describe('sendBotMsg', () => {
        it('应该成功发送消息', async () => {
            const message = '测试消息';
            const chatId = '123456';

            // 模拟 bot.sendMessage 方法
            const mockSendMessage = jest.fn().mockResolvedValue({});
            (TelegramBot as jest.Mock).mockImplementation(() => ({
                sendMessage: mockSendMessage
            }));

            // 执行测试
            await tapchain.sendBotMsg(message, chatId);

            // 验证是否正确调用了 sendMessage
            expect(mockSendMessage).toHaveBeenCalledWith(
                chatId,
                message,
                { parse_mode: 'HTML' }
            );
        });

        it('应该处理发送消息失败的情况', async () => {
            const message = '测试消息';
            const chatId = '123456';
            const error = new Error('发送失败');

            // 模拟 bot.sendMessage 方法抛出错误
            const mockSendMessage = jest.fn().mockRejectedValue(error);
            (TelegramBot as jest.Mock).mockImplementation(() => ({
                sendMessage: mockSendMessage
            }));

            // 监控 console.error
            const consoleSpy = jest.spyOn(console, 'error');

            // 执行测试
            await tapchain.sendBotMsg(message, chatId);

            // 验证错误处理
            expect(consoleSpy).toHaveBeenCalledWith('发送Telegram消息失败:', error);
        });
    });
});