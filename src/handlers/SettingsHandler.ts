import { Context } from "grammy";
import { BaseStateHandler } from './BaseStateHandler';
import { settingMenu } from '../core/menu';

export class SettingsHandler extends BaseStateHandler {
  async handle(ctx: Context, fromId: number, text: string): Promise<void> {
    const address = await this.getUserAddress(fromId);
    if (!address) return;

    const setting = await this.getSettings(address);
    await this.updateSetting(setting, text);
    await this.saveSettings(address, setting);
    
    await ctx.deleteMessage();
    await ctx.reply("✅ 设置更新成功", { reply_markup: settingMenu });
  }

  private async getSettings(address: string): Promise<any> {
    const settingStr = await this.redis.get(`setting:${address}`) || '{}';
    return JSON.parse(settingStr);
  }

  private async saveSettings(address: string, setting: any): Promise<void> {
    await this.redis.set(`setting:${address}`, JSON.stringify(setting));
  }

  protected async updateSetting(setting: any, value: string): Promise<void> {
    // 子类实现具体的设置更新逻辑
  }
}