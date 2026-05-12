import { InlineKeyboard } from "grammy";
import { getByCategory } from "../search/index.js";

export const WELCOME = [
  "👋 Вітаю! Я — FAQ-бот Системи дистанційного навчання ПНУ.",
  "",
  "Що я вмію:",
  "• Показати готові відповіді на найчастіші запитання студентів і викладачів.",
  "• Знайти потрібний розділ методичної інструкції (зі скріншотами).",
  "• Знайти відповідь у базі за вашим текстовим запитом.",
  "",
  "Скористайтеся меню нижче або просто напишіть своє запитання текстом.",
].join("\n");

export function mainMenuKeyboard(categories) {
  const kb = new InlineKeyboard();
  const entries = Object.entries(categories);
  for (let i = 0; i < entries.length; i += 1) {
    const [key, meta] = entries[i];
    kb.text(`${meta.emoji} ${meta.title}`, `cat:${key}`);
    if (i % 2 === 1) kb.row();
  }
  if (entries.length % 2 === 1) kb.row();
  kb.text("❓ Запитати своє", "ask").row();
  kb.text("ℹ️ Про бота", "about");
  return kb;
}

export function categoryKeyboard(categoryKey) {
  const items = getByCategory(categoryKey);
  const kb = new InlineKeyboard();
  for (const item of items) {
    kb.text(shortenForButton(item.question), `faq:${item.id}`).row();
  }
  kb.text("⬅️ Назад до меню", "menu");
  return kb;
}

export function faqItemKeyboard(item) {
  const kb = new InlineKeyboard();
  if (item.links && item.links.length > 0) {
    for (const link of item.links) {
      kb.url(`🔗 ${link.title}`, link.url).row();
    }
  }
  kb.text(`⬅️ До розділу ${categoryTitle(item.category)}`, `cat:${item.category}`).row();
  kb.text("🏠 Головне меню", "menu");
  return kb;
}

export function suggestionsKeyboard(suggestions) {
  const kb = new InlineKeyboard();
  for (const s of suggestions) {
    kb.text(`➡️ ${shortenForButton(s.question)}`, `faq:${s.id}`).row();
  }
  kb.text("🏠 Головне меню", "menu");
  return kb;
}

export function fallbackKeyboard() {
  return new InlineKeyboard()
    .url(
      "🔗 Офіційний FAQ",
      "https://ceeq.cnu.edu.ua/%d1%87%d0%b0%d1%81%d1%82%d1%96-%d0%bf%d0%b8%d1%82%d0%b0%d0%bd%d0%bd%d1%8f/vid-studentiv/",
    )
    .row()
    .url(
      "▶️ YouTube-плейлист",
      "https://www.youtube.com/watch?v=ZOv5trrRNkM&list=PLHlBibnKS2I4RJKSlTq-8f_iccWYXZHw0",
    )
    .row()
    .text("🏠 Головне меню", "menu");
}

function categoryTitle(key) {
  const map = {
    students: "Студентам",
    teachers: "Викладачам",
    manual: "Інструкції",
    links: "Посилання",
  };
  return map[key] || key;
}

function shortenForButton(text, max = 60) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
