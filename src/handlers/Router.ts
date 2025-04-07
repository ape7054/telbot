import TelegramBot, { Message } from 'node-telegram-bot-api';

// 定义处理器类型
type StepHandler = (msg: TelegramBot.Message, session: any) => void;

// 定义路由接口
interface Route {
    command?: string;
    steps?: Record<string, StepHandler>;
    start?: StepHandler;
}

// 定义会话数据接口
interface SessionData {
    route: string;
    state: string;
    data: Record<string, any>;
}

class Router {
    private routes: Record<string, Route> = {};
    private sessions = new Map<number, SessionData>();

    // 注册路由
    registerRoute(name: string, route: Route) {
        this.routes[name] = route;
    }

    // 获取会话
    getSession(chatId: number): SessionData | undefined {
        return this.sessions.get(chatId);
    }

    // 创建会话
    createSession(chatId: number, route: string) {
        this.sessions.set(chatId, {
            route,
            state: 'start',
            data: {}
        });
    }

    // 更新会话状态
    updateSessionState(chatId: number, newState: string) {
        const session = this.sessions.get(chatId);
        if (session) {
            session.state = newState;
        }
    }

    // 结束会话
    endSession(chatId: number) {
        this.sessions.delete(chatId);
    }

    // 处理消息
    // 修改 handleMessage 方法的类型
    async handleMessage(bot: TelegramBot, msg: Message) {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text) return;

        // 处理命令
        if (text.startsWith('/')) {
            const command = text.slice(1).split(' ')[0];
            const route = this.routes[command];

            if (route) {
                this.createSession(chatId, command);
                route.start?.(msg, this.getSession(chatId)?.data);
            }
            return;
        }

        // 处理会话状态
        const session = this.getSession(chatId);
        if (!session) return;

        const route = this.routes[session.route];
        const handler = route.steps?.[session.state];
        if (!handler) return;

        // 执行当前步骤处理器
        await handler(msg, session.data);

        // 自动进入下一步
        const steps = Object.keys(route.steps || {});
        const currentIndex = steps.indexOf(session.state);
        const nextIndex = currentIndex + 1;

        if (nextIndex < steps.length) {
            this.updateSessionState(chatId, steps[nextIndex]);
        } else {
            this.endSession(chatId);
        }
    }
}

export default Router;