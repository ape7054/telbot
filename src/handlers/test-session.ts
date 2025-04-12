import fs from 'fs';
import path from 'path';

const SESSION_FILE = path.resolve(__dirname, '../../data/sessions.json');

export type SessionData = {
  route: string;
  state: string;
  data: any;
};

let sessions: Record<number, SessionData> = {};

// 确保数据目录存在
function ensureDataDir() {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadSessions() {
  ensureDataDir();
  try {
    if (fs.existsSync(SESSION_FILE)) {
      sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      console.log('✅ 会话数据加载完成');
    } else {
      sessions = {};
      saveSessions();
      console.log('✅ 创建新的会话存储文件');
    }
  } catch (error) {
    console.error('❌ 加载会话数据失败:', error);
    sessions = {};
  }
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ 保存会话数据失败:', error);
  }
}

export function getSession(chatId: number): SessionData | undefined {
  return sessions[chatId];
}

export function setSession(chatId: number, session: SessionData) {
  sessions[chatId] = session;
  saveSessions();
}

export function deleteSession(chatId: number) {
  delete sessions[chatId];
  saveSessions();
}