import { Message } from 'node-telegram-bot-api';
import { getSession, setSession, deleteSession, SessionData } from './test-session';

export default class Router {
  private routes: Record<string, Route> = {};

  // 添加会话管理方法
  getSession(chatId: number): SessionData | undefined {
    return getSession(chatId);
  }

  setSession(chatId: number, session: SessionData) {
    setSession(chatId, session);
  }

  deleteSession(chatId: number) {
    deleteSession(chatId);
  }

  // 处理会话步骤
  handleStep(bot: any, msg: Message): boolean {
    const chatId = msg.chat.id;
    const session = this.getSession(chatId);
    
    if (!session) return false;

    const route = this.routes[session.route];
    const handler = route.steps?.[session.state];
    
    if (!handler) return false;

    // 执行当前步骤
    const result = handler(msg, session.data);

    // 如果返回 true，结束会话
    if (result === true) {
      this.deleteSession(chatId);
      return true;
    }

    // 自动推进到下一步
    const steps = Object.keys(route.steps || {});
    const nextIndex = steps.indexOf(session.state) + 1;
    if (nextIndex < steps.length) {
      session.state = steps[nextIndex];
      this.setSession(chatId, session);
    }

    return true;
  }

  // 其他现有方法保持不变
  registerRoute(command: string, route: Route) {
    this.routes[command] = route;
  }

  handleMessage(bot: any, msg: Message) {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    if (text.startsWith('/')) {
      const command = text.slice(1).split(' ')[0];
      const route = this.routes[command];

      if (route) {
        this.setSession(chatId, {
          route: command,
          state: 'start',
          data: {}
        });
        return route.start?.(msg, this.getSession(chatId)?.data);
      }
    }
  }
}

interface Route {
  start?: (msg: Message, data: any) => void;
  steps?: Record<string, (msg: Message, data: any) => boolean | void>;
}