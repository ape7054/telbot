// 定义会话状态类型
type SessionState = 'IDLE' | 'WAITING_INPUT' | 'IN_DIALOG';

// 定义会话数据接口
interface SessionData {
  state: SessionState;
  currentHandler: string;
  data: Record<string, any>;
}

// 定义处理器接口
interface Handler {
  name: string;
  execute: (msg: any, sessionData?: SessionData) => Promise<void>;
}

class SessionManager {
  private sessions = new Map<number, SessionData>();
  private commandHandlers = new Map<string, Handler>();
  private stateHandlers = new Map<string, Handler>();

  // 注册命令处理器
  registerCommand(command: string, handler: Handler) {
    this.commandHandlers.set(command, handler);
  }

  // 注册状态处理器
  registerStateHandler(state: string, handler: Handler) {
    this.stateHandlers.set(state, handler);
  }

  // 创建新会话
  createSession(chatId: number, initialState: SessionState = 'IDLE') {
    this.sessions.set(chatId, {
      state: initialState,
      currentHandler: '',
      data: {}
    });
  }

  // 结束会话
  endSession(chatId: number) {
    this.sessions.delete(chatId);
  }

  // 更新会话状态
  updateSession(chatId: number, updates: Partial<SessionData>) {
    const session = this.sessions.get(chatId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  // 消息处理主函数
  async handleMessage(msg: any) {
    const chatId = msg.chat.id;
    const text = msg.text;

    // 1. 检查是否是命令
    if (text?.startsWith('/')) {
      const command = text.split(' ')[0];
      const handler = this.commandHandlers.get(command);
      
      if (handler) {
        await handler.execute(msg);
        return;
      }
    }

    // 2. 检查是否在会话中
    const session = this.sessions.get(chatId);
    if (session) {
      const handler = this.stateHandlers.get(session.currentHandler);
      if (handler) {
        await handler.execute(msg, session);
        return;
      }
    }

    // 3. 默认处理
    console.log(`未处理的消息: ${text} (来自: ${chatId})`);
  }
}

export default SessionManager;