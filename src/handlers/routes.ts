import TelegramBot from 'node-telegram-bot-api';
import Router from './test-Router';

// 设置路由处理函数
// @param bot - Telegram机器人实例
// @param router - 路由实例
export function setupRoutes(bot: TelegramBot, router: Router) {
    // 注册信息收集路由
    router.registerRoute('info', {
        start: (msg, data) => {
            bot.sendMessage(msg.chat.id, '请输入你的名字：');
        },
        steps: {
            start: (msg, data) => {
                data.name = msg.text;
                bot.sendMessage(msg.chat.id, '请输入你的年龄：');
            },
            ASK_AGE: (msg, data) => {
                if (isNaN(Number(msg.text))) {
                    bot.sendMessage(msg.chat.id, '请输入有效的年龄数字！');
                    return;
                }
                data.age = msg.text;
                bot.sendMessage(msg.chat.id, '你的爱好是？');
            },
            ASK_HOBBY: (msg, data) => {
                data.hobby = msg.text;
                bot.sendMessage(
                    msg.chat.id,
                    `✅ 信息收集完成！\n姓名：${data.name}\n年龄：${data.age}\n爱好：${data.hobby}`
                );
            }
        }
    });

    // 可以注册更多路由...
}