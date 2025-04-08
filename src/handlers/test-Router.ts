import TelegramBot, { Message } from 'node-telegram-bot-api';

// 定义处理器类型
type StepHandler = (msg: TelegramBot.Message, session: any) => boolean | void;

// 定义路由处理器接口
interface RouteHandler {
    start: StepHandler;
    steps?: Record<string, StepHandler>;
}

// 定义路由接口
interface Route {
    command?: string;
    steps?: Record<string, StepHandler>;
    start?: StepHandler;
}

// 定义会话数据接口
interface SessionData {
    currentRoute: string;  // 改为 currentRoute 以保持一致
    state: string;
    data: Record<string, any>;
}

export default class Router {
    private routes: Map<string, RouteHandler>;
    private sessions: Map<number, SessionData>;

    constructor() {
        this.routes = new Map();
        this.sessions = new Map();
    }

    // 注册路由
    registerRoute(name: string, route: Route) {
        // 确保route包含必需的start方法
        if (!route.start) {
            throw new Error(`路由 "${name}" 缺少必需的start方法`);
        }
        this.routes.set(name, route as RouteHandler);
    }

    // 获取会话
    getSession(chatId: number): SessionData | undefined {
        return this.sessions.get(chatId);
    }

    // 创建会话
    // 修改 createSession 方法
    createSession(chatId: number, route: string) {
        this.sessions.set(chatId, {
            currentRoute: route,  // 改为 currentRoute
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
    public handleMessage(bot: TelegramBot, msg: Message) {
        if (!msg.text?.startsWith('/')) return false;

        const command = msg.text.substring(1).split(' ')[0];
        const route = this.routes.get(command);

        if (!route) return false;

        // 初始化会话数据
        this.sessions.set(msg.chat.id, {
            currentRoute: command,
            state: 'ASK_NAME',  // 初始状态
            data: {}
        });

        route.start(msg, {});
        return true;
    }

    // 添加处理会话步骤的方法
    public handleStep(bot: TelegramBot, msg: Message): boolean {
        const chatId = msg.chat.id;
        const session = this.sessions.get(chatId);

        if (!session || !session.currentRoute || !session.state) {
            return false;
        }

        const route = this.routes.get(session.currentRoute);
        if (!route || !route.steps || !route.steps[session.state]) {
            return false;
        }

        const stepHandler = route.steps[session.state];
        const result = stepHandler(msg, session.data);

        // 修改条件判断，增加对 undefined 的处理
        if (result === true) {
            this.sessions.delete(chatId);
        }

        return true;
    }
}