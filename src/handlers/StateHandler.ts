import { Context } from 'grammy';
import { Redis } from 'ioredis';

export class StateHandler {
  constructor(private redis: Redis) {}

  // 基础状态操作
  async clearState(fromId: number) {
    await this.redis.set(fromId+":status", "");
  }

  async getState(fromId: number) {
    return await this.redis.get(fromId+":status");
  }

  // 统一的设置处理
  async handleSetting(ctx: Context, fromId: number, address: string, settingKey: string, value: any) {
    await this.clearState(fromId);
    const obj = await this.redis.get("setting:"+address) || '{}';
    const setting = JSON.parse(obj);
    setting[settingKey] = value;
    await this.redis.set("setting:"+address, JSON.stringify(setting));
    return setting;
  }

  // 统一的狙击配置处理
  async handleSnipeConfig(ctx: Context, fromId: number, configKey: string, value: any) {
    await this.clearState(fromId);
    const obj = await this.redis.get(fromId+":snipeConfig") || '{}';
    const config = JSON.parse(obj);
    config[configKey] = value;
    await this.redis.set(fromId+":snipeConfig", JSON.stringify(config));
    return config;
  }

  // 统一的跟单配置处理
  async handleFollowConfig(ctx: Context, fromId: number, address: string, configKey: string, value: any) {
    await this.clearState(fromId);
    const addKey = 'bank:'+address+":"+await this.redis.get(fromId+":editadd");
    const config = JSON.parse(await this.redis.get(addKey) || '{}');
    config[configKey] = value;
    await this.redis.set(addKey, JSON.stringify(config));
    return config;
  }
}