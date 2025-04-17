import { Context } from "grammy";
import { BaseStateHandler } from './BaseStateHandler';
import { settingMenu } from '../core/menu';

export class SwapGasHandler extends BaseStateHandler {
  async handle(ctx: Context, fromId: number, text: string): Promise<void> {
    // 验证 Gas 值
    const gas = Number(text);
    if (isNaN(gas)) {
      await ctx.reply("❌Gas设置失败，请输入有效数值");
      return;
    }

    await this.clearUserStatus(fromId);
    const address = await this.getUserAddress(fromId);
    if (!address) return;

    // 获取并更新设置
    const settingStr = await this.redis.get(`setting:${address}`) || '{}';
    const setting = JSON.parse(settingStr);
    setting.swapGas = gas;
    
    // 保存设置
    await this.redis.set(`setting:${address}`, JSON.stringify(setting));
    
    // 删除原消息并发送成功提示
    await ctx.deleteMessage();
    await ctx.reply("✅交易优先费设置成功", { reply_markup: settingMenu });
  }
}