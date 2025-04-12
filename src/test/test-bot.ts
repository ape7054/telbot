import Router from '../handlers/test-Router';

require('dotenv').config();

// 导入Telegram机器人API和代理模块
// 在文件顶部的导入部分添加
// 修改导入语句，添加 CallbackQuery 类型
import TelegramBot, { Message, CallbackQuery } from 'node-telegram-bot-api';

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
        timeout: 30000,      // 请求超时时间
        url: 'https://api.telegram.org'  // 添加必需的 url 属性
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
bot.getMe().then((botInfo: TelegramBot.User) => {
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

// 创建路由实例
const router = new Router();

  // 只传入 bot 实例

router.registerRoute('info', {// 注册自定义路由
    start: (msg, data) => {
        const session = router.getSession(msg.chat.id);
        if (session) {
            session.state = 'ASK_NAME';  // 更新会话状态
        }
        bot.sendMessage(msg.chat.id, '你好！请告诉我你的名字？');
    },
    steps: {
        ASK_NAME: (msg, data) => {
            data.name = msg.text;
            const session = router.getSession(msg.chat.id);
            if (session) {
                session.state = 'ASK_AGE';  // 更新状态
            }
            bot.sendMessage(msg.chat.id, '好的，接下来请输入你的年龄：');
        },
        ASK_AGE: (msg, data) => {
            if (isNaN(Number(msg.text))) {
                bot.sendMessage(msg.chat.id, '请输入有效的年龄数字！');
                return;
            }
            data.age = msg.text;
            const session = router.getSession(msg.chat.id);
            if (session) {
                session.state = 'ASK_HOBBY';  // 更新状态
            }
            bot.sendMessage(msg.chat.id, '最后一个问题：你的爱好是什么？');
        },
        ASK_HOBBY: (msg, data) => {
            data.hobby = msg.text;
            bot.sendMessage(
                msg.chat.id,
                `✅ 信息收集完成：\n姓名：${data.name}\n年龄：${data.age}\n爱好：${data.hobby}`
            );
            return true; // 结束会话
        }
    }
});

// 注册基础命令路由
router.registerRoute('start', {
    start: (msg: { chat: { id: number }, from?: { first_name?: string } }) => {
        const firstName = msg.from?.first_name || '朋友';
        bot.sendMessage(
            msg.chat.id,
            `你好，${firstName}！欢迎使用本 Bot 😊\n你可以发送任意内容，我会回显你的消息。`
        );
    }
});
// 注册帮助命令路由，显示所有可用的命令列表
router.registerRoute('help', {
    start: (msg: Message) => {
        const helpText = `
                            可用命令:
                            /start - 启动机器人，发送欢迎消息
                            /help - 显示帮助信息
                            /menu - 显示操作菜单
                            /info - 开始收集用户信息

                            你还可以直接发送任意文字，我会回显给你 😄
                            `;
        bot.sendMessage(msg.chat.id, helpText);
    }
});

// 注册菜单命令路由，提供交互式按钮界面
router.registerRoute('menu', {
    start: (msg: Message) => {
        bot.sendMessage(msg.chat.id, '请选择一个操作：', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '获取时间', callback_data: 'GET_TIME' },
                        { text: '获取用户信息', callback_data: 'GET_USER' }
                    ]
                ]
            }
        });
    }
});

// 处理按钮点击事件
bot.on('callback_query', (query: CallbackQuery) => {
    const chatId = query.message?.chat.id;
    const data = query.data;
    if (!chatId) return;

    if (data === 'GET_TIME') {
        const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        bot.sendMessage(chatId, `当前时间是：${time}`);
    }

    if (data === 'GET_USER') {
        const user = query.from;
        bot.sendMessage(chatId, `你的用户名是 @${user.username || '未知'}，ChatID 是 ${user.id}`);
    }

    bot.answerCallbackQuery(query.id);
});

// 使用路由处理所有消息
// 修改消息处理逻辑，删除重复的消息处理器，只保留这一个
bot.on('message', (msg: Message) => {
    if (!msg.text) return;
    
    if (msg.text.startsWith('/')) { // 处理命令消息
       
        router.handleMessage(bot, {
            ...msg,
            message_id: 0,
            date: Math.floor(Date.now() / 1000),
            chat: {
                id: msg.chat.id,
                type: 'private',
                first_name: '',
                username: ''
            }
        });
    } else {
        // 处理非命令消息
        const handled = router.handleStep(bot, msg);
        if (!handled) {
            // 如果路由系统没有处理这条消息，则执行默认的回显
            bot.sendMessage(msg.chat.id, `你说了：${msg.text}`);
        }
    }
});
