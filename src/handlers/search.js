import { search } from "../search/index.js";
import { sendFaqItem } from "./faq.js";
import { fallbackKeyboard, suggestionsKeyboard } from "./menu.js";

export async function handleFreeTextQuery(ctx) {
  const query = ctx.message?.text?.trim();
  if (!query) return;

  await ctx.replyWithChatAction("typing");

  const { best, suggestions } = search(query);

  if (best) {
    await sendFaqItem(ctx, best);
    if (suggestions.length > 0) {
      await ctx.reply("Можливо, вам також знадобиться:", {
        reply_markup: suggestionsKeyboard(suggestions),
      });
    }
    return;
  }

  if (suggestions.length > 0) {
    await ctx.reply(
      [
        "🤔 Не знайшов точної відповіді у моїй базі.",
        "",
        "Можливо, вас цікавить щось із цього:",
      ].join("\n"),
      { reply_markup: suggestionsKeyboard(suggestions) },
    );
    return;
  }

  await ctx.reply(
    [
      "😕 На жаль, я не знайшов відповіді у моїй базі знань.",
      "",
      "Що можна зробити:",
      "• Перегляньте офіційний FAQ або YouTube-плейлист.",
      "• Напишіть на електронну адресу dist@pnu.edu.ua.",
      "  У листі вкажіть: ПІБ, підрозділ, форму навчання, шифр групи та суть питання.",
    ].join("\n"),
    { reply_markup: fallbackKeyboard() },
  );
}
