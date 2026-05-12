import { InputFile } from "grammy";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { faqItemKeyboard } from "./menu.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TELEGRAM_CAPTION_LIMIT = 1024;
const TELEGRAM_MESSAGE_LIMIT = 4000;

export async function sendFaqItem(ctx, item) {
  const header = `*${escapeMd(item.question)}*`;
  const body = item.answer ? escapeMd(item.answer) : "";
  const text = body ? `${header}\n\n${body}` : header;

  const photos = (item.images || [])
    .map((rel) => path.join(projectRoot, rel))
    .filter((p) => existsSync(p));

  try {
    if (photos.length === 0) {
      await ctx.reply(text, {
        parse_mode: "MarkdownV2",
        reply_markup: faqItemKeyboard(item),
        link_preview_options: { is_disabled: true },
      });
      return;
    }

    if (photos.length === 1) {
      const caption = text.length <= TELEGRAM_CAPTION_LIMIT ? text : null;
      await ctx.replyWithPhoto(new InputFile(photos[0]), {
        caption,
        parse_mode: caption ? "MarkdownV2" : undefined,
      });
      if (caption === null) {
        await sendTextChunks(ctx, text);
      }
      await ctx.reply("⬇️ Дії:", {
        reply_markup: faqItemKeyboard(item),
      });
      return;
    }

    const media = photos.slice(0, 10).map((p, idx) => {
      const m = { type: "photo", media: new InputFile(p) };
      if (idx === 0 && text.length <= TELEGRAM_CAPTION_LIMIT) {
        m.caption = text;
        m.parse_mode = "MarkdownV2";
      }
      return m;
    });

    await ctx.replyWithMediaGroup(media);
    if (text.length > TELEGRAM_CAPTION_LIMIT) {
      await sendTextChunks(ctx, text);
    }
    await ctx.reply("⬇️ Дії:", { reply_markup: faqItemKeyboard(item) });
  } catch (err) {
    console.error("Failed to send FAQ item:", err);
    await ctx.reply("Сталася помилка при відправці відповіді. Спробуйте ще раз.", {
      reply_markup: faqItemKeyboard(item),
    });
  }
}

async function sendTextChunks(ctx, text) {
  for (let i = 0; i < text.length; i += TELEGRAM_MESSAGE_LIMIT) {
    const chunk = text.slice(i, i + TELEGRAM_MESSAGE_LIMIT);
    await ctx.reply(chunk, {
      parse_mode: "MarkdownV2",
      link_preview_options: { is_disabled: true },
    });
  }
}

// MarkdownV2 reserved chars must be escaped.
export function escapeMd(text) {
  return String(text).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (m) => `\\${m}`);
}
