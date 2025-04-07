// 导入环境变量配置
require('dotenv').config();

// 导入Telegram机器人API和代理模块
const TelegramBot = require('node-telegram-bot-api');
const { HttpsProxyAgent } = require('https-proxy-agent');  // 修改导入方式

// 从环境变量获取Telegram机器人Token
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN 未在 .env 中配置');
}

// 输出初始化信息
console.log('正在初始化机器人...');
console.log('检查 Token:', token ? '已配置' : '未配置');

// 配置代理
const proxyUrl = 'http://127.0.0.1:7890';
console.log('正在配置代理:', proxyUrl);

// 创建代理实例
const agent = new HttpsProxyAgent(proxyUrl);

// 创建Telegram机器人实例，配置轮询和请求参数
console.log('正在创建机器人实例...');
const bot = new TelegramBot(token, {
    polling: {
        interval: 300,        // 轮询间隔时间（毫秒）
        autoStart: true,      // 自动开始轮询
        params: {
            timeout: 10       // 轮询超时时间
        }
    },
    request: {
        agent: agent,         // 使用配置的代理
        timeout: 30000       // 请求超时时间
    }
});

console.log('正在注册事件处理器...');

// 定义 botInfo 的接口
interface BotInfo {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
}

// 添加启动确认，验证机器人连接状态
bot.getMe().then((botInfo: BotInfo) => {
    console.log('✅ 机器人连接成功！');
    console.log('机器人信息:', botInfo);
}).catch((error: Error) => {
    console.error('❌ 机器人连接失败:', error.message);
});

// 添加轮询错误处理，提供详细的错误信息和解决建议
bot.on('polling_error', (error: Error) => {
    console.error('轮询错误:', error.message);
    if (error.message.includes('ETIMEDOUT')) {
        console.error('连接超时，请检查代理设置是否正确');
        console.error('建议：');
        console.error('1. 确认代理软件(如Clash)是否正在运行');
        console.error('2. 验证代理端口是否正确');
        console.error('3. 尝试在浏览器访问 https://api.telegram.org 测试代理');
    }
});

// 处理一般性错误
bot.on('error', (error: Error) => {
    console.error('Bot错误:', error);
});

// 处理 /start 命令
bot.onText(/\/start/, (msg: { chat: { id: number }, from?: { first_name?: string } }) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || '朋友';

    bot.sendMessage(chatId, `你好，${firstName}！欢迎使用本 Bot 😊\n你可以发送任意内容，我会回显你的消息。`);
});

// 定义用户状态和会话数据接口
type UserState = 'ASK_NAME' | 'ASK_AGE' | 'ASK_HOBBY' | 'DONE';

interface ConversationData {
    state: UserState;
    data: {
        name?: string;
        age?: string;
        hobby?: string;
    };
}

// 用户会话管理
//// 存储新的会话数据
// userSessions.set(123456, {
//     state: 'ASK_NAME',
//     data: {
//         name: '张三',
//         age: '25'
//     }
// });


// 处理 /help 命令
bot.onText(/\/help/, (msg: { chat: { id: number } }) => {
    const chatId = msg.chat.id;
    const helpText = `
可用命令:
/start - 启动机器人，发送欢迎消息
/help - 显示帮助信息
/menu - 显示操作菜单
/info - 开始收集用户信息

你还可以直接发送任意文字，我会回显给你 😄
`;
    bot.sendMessage(chatId, helpText);
});


const userSessions = new Map<number, ConversationData>();
// 处理 /info 命令
bot.onText(/\/info/, (msg: { chat: { id: number } }) => {
    const chatId = msg.chat.id;

    // 初始化用户会话状态，设置初始状态为询问名字
    userSessions.set(chatId, {
        state: 'ASK_NAME',
        data: {}
    });

    bot.sendMessage(chatId, '你好！请告诉我你的名字？');
});

// 处理消息
bot.on('message', (msg: { chat: { id: number }, text?: string }) => {
    // 获取聊天ID
    const chatId = msg.chat.id;
    // 获取消息文本内容
    const text = msg.text;

    // 忽略命令和空消息
    if (!text || text.startsWith('/')) return;

    const session = userSessions.get(chatId);
    if (!session) {
        // 如果不在会话中，执行默认的回显功能
        bot.sendMessage(chatId, `你说了：${text}`);
        return;
    }

    // 从会话中解构状态和数据
    const { state, data } = session;

    // 根据当前状态处理用户输入
    switch (state) {
        // 处理用户名输入阶段
        case 'ASK_NAME':
            data.name = text;
            session.state = 'ASK_AGE';
            bot.sendMessage(chatId, '好的，接下来请输入你的年龄：');
            break;

        // 处理年龄输入阶段
        case 'ASK_AGE':
            // 验证年龄输入是否为有效数字
            if (isNaN(Number(text))) {
                bot.sendMessage(chatId, '请输入有效的年龄数字！');
                return;
            }
            data.age = text;
            session.state = 'ASK_HOBBY';
            bot.sendMessage(chatId, '最后一个问题：你的爱好是什么？');
            break;

        // 处理爱好输入阶段
        case 'ASK_HOBBY':
            data.hobby = text;
            session.state = 'DONE';
            // 展示收集到的所有信息
            bot.sendMessage(chatId, `✅ 信息收集完成：\n姓名：${data.name}\n年龄：${data.age}\n爱好：${data.hobby}`);
            userSessions.delete(chatId); // 清除会话数据
            break;
    }
});

// 处理 /menu 命令
// 处理 /menu 命令，显示操作菜单
bot.onText(/\/menu/, (msg: { chat: { id: number } }) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, '请选择一个操作：', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '获取时间', callback_data: 'GET_TIME' },
                    { text: '获取用户信息', callback_data: 'GET_USER' }
                ]
            ]
        }
    });
});

// 处理按钮点击事件
bot.on('callback_query', (query: any) => {

    const chatId = query.message?.chat.id;
    const data = query.data;
    // 输出回调查询的详细信息
    console.log('收到回调查询:', query);
    if (!chatId) return;

    if (data === 'GET_TIME') {
        const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        bot.sendMessage(chatId, `当前时间是：${time}`);
    }

    if (data === 'GET_USER') {
        const user = query.from;
        bot.sendMessage(chatId, `你的用户名是 @${user.username || '未知'}，ChatID 是 ${user.id}`);
    }

    // 通知 Telegram 按钮已被点击
    bot.answerCallbackQuery(query.id);
});

// 处理接收到的消息，实现简单的消息回显功能
bot.on('message', (msg: { chat: { id: number }, text: string }) => {
    bot.sendMessage(msg.chat.id, `你说了：${msg.text}`);
});


import Router from '../handlers/Router';
import { setupRoutes } from '../handlers/routes';

// 创建路由实例
const router = new Router();

// 设置路由
setupRoutes(bot, router);

// 注册消息处理器
// 在文件顶部添加类型导入
import { Message } from 'node-telegram-bot-api';

// 修改消息处理器的类型
bot.on('message', (msg: Message) => router.handleMessage(bot, msg));
