import { Context } from "grammy";
import { BaseStateHandler } from './BaseStateHandler';
import { settingMenu } from '../core/menu';

export class SwapSlippageHandler extends BaseStateHandler {
  async handle(ctx: Context, fromId: number, text: string): Promise<void> {
    // 验证滑点值
    const slippage = Number(text);
    if (slippage > 100 || slippage < 1) {
      await ctx.reply("❌滑点设置失败，请检查输入的数值");
      return;
    }

    await this.clearUserStatus(fromId);
    const address = await this.getUserAddress(fromId);
    if (!address) return;

    // 获取并更新设置
    const settingStr = await this.redis.get(`setting:${address}`) || '{}';
    const setting = JSON.parse(settingStr);
    setting.swapSlippage = slippage;
    
    // 保存设置
    await this.redis.set(`setting:${address}`, JSON.stringify(setting));
    
    // 删除原消息并发送成功提示
    await ctx.deleteMessage();
    await ctx.reply("✅交易滑点设置成功", { reply_markup: settingMenu });
  }
}