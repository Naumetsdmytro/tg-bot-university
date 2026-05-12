import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildIndex, getById } from "./search/index.js";
import { sendFaqItem } from "./handlers/faq.js";
import { handleFreeTextQuery } from "./handlers/search.js";
import {
  WELCOME,
  categoryKeyboard,
  fallbackKeyboard,
  mainMenuKeyboard,
} from "./handlers/menu.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadFaq() {
  const raw = await fs.readFile(path.join(projectRoot, "data/faq.json"), "utf8");
  return JSON.parse(raw);
}

async function main() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error(
      [
        "❌ BOT_TOKEN не знайдено.",
        "",
        "1) Створіть бота у @BotFather у Telegram (/newbot) і скопіюйте токен.",
        "2) Скопіюйте .env.example у .env та вставте токен у поле BOT_TOKEN.",
        "3) Запустіть знову: npm start",
      ].join("\n"),
    );
    process.exit(1);
  }

  const faq = await loadFaq();
  buildIndex(faq.items);
  console.log(`Loaded ${faq.items.length} FAQ items across ${Object.keys(faq.categories).length} categories.`);

  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME, {
      reply_markup: mainMenuKeyboard(faq.categories),
    });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "ℹ️ Як користуватися:",
        "",
        "• /start — головне меню.",
        "• Виберіть розділ або просто напишіть запитання текстом — я спробую знайти відповідь.",
        "• Якщо відповіді у базі немає, я надішлю посилання на офіційний FAQ та YouTube.",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard(faq.categories) },
    );
  });

  bot.command("menu", async (ctx) => {
    await ctx.reply("🏠 Головне меню:", {
      reply_markup: mainMenuKeyboard(faq.categories),
    });
  });

  bot.callbackQuery("menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("🏠 Головне меню:", {
      reply_markup: mainMenuKeyboard(faq.categories),
    });
  });

  bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
    const key = ctx.match[1];
    const cat = faq.categories[key];
    await ctx.answerCallbackQuery();
    if (!cat) {
      await ctx.reply("Розділ не знайдено.", {
        reply_markup: mainMenuKeyboard(faq.categories),
      });
      return;
    }
    await ctx.reply(`${cat.emoji} *${escape(cat.title)}*\n\nОберіть запитання:`, {
      parse_mode: "MarkdownV2",
      reply_markup: categoryKeyboard(key),
    });
  });

  bot.callbackQuery(/^faq:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    await ctx.answerCallbackQuery();
    const item = getById(id);
    if (!item) {
      await ctx.reply("Це запитання вже не існує у базі.", {
        reply_markup: mainMenuKeyboard(faq.categories),
      });
      return;
    }
    await sendFaqItem(ctx, item);
  });

  bot.callbackQuery("ask", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      [
        "✍️ Напишіть своє запитання у наступному повідомленні.",
        "",
        "Я спробую знайти найближчу відповідь у базі знань.",
      ].join("\n"),
    );
  });

  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      [
        "ℹ️ Про бота",
        "",
        "Я — навчальний проєкт. База відповідей побудована на:",
        "• Офіційному FAQ Центру дистанційного навчання.",
        "• Методичних вказівках викладачам (PDF).",
        "• YouTube-плейлисті з інструкціями.",
        "",
        "Просто напишіть запитання текстом — і я підкажу.",
      ].join("\n"),
      { reply_markup: fallbackKeyboard() },
    );
  });

  bot.on("message:text", handleFreeTextQuery);

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Telegram API error:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Network error:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  console.log("🤖 Bot is running. Press Ctrl+C to stop.");
  await bot.start({ drop_pending_updates: true });
}

function escape(text) {
  return String(text).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (m) => `\\${m}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
