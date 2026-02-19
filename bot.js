const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.BOT_TOKEN;

const scriptURL = 'https://script.google.com/macros/s/AKfycbzG7MQ7tHxOZ6RtOk-ziKcE9oXZfu61Noyiotu9IqnBzuWn-rAP-XPXyH0yxJEVWiFG1g/exec';

const bot = new TelegramBot(token, { polling: true });
const userState = {};

const messages = {
  en: {
    menu: "Main Menu:\n1 - Submit Complaint\n2 - Request Feature\n\nType /cancel to reset anytime.",
    complaintMenu: "Choose:\n1 - Broken TV Channel\n2 - Problem in Films/TV Shows\n3 - Other",
    askChannel: "Enter channel name:",
    askDescription: "Describe the problem:",
    success: (id) => `Submitted successfully.\nTicket ID: ${id}`
  },
  ar: {
    menu: "القائمة الرئيسية:\n1 - تقديم شكوى\n2 - طلب ميزة\n\nاكتب /cancel للعودة.",
    complaintMenu: "اختر:\n1 - قناة متوقفة\n2 - مشكلة في الأفلام أو المسلسلات\n3 - أخرى",
    askChannel: "أدخل اسم القناة:",
    askDescription: "اشرح المشكلة:",
    success: (id) => `تم الإرسال بنجاح.\nرقم التذكرة: ${id}`
  },
  fr: {
    menu: "Menu Principal:\n1 - Soumettre une plainte\n2 - Demander une fonctionnalité\n\nTapez /cancel pour revenir.",
    complaintMenu: "Choisissez:\n1 - Chaîne TV en panne\n2 - Problème films/séries\n3 - Autre",
    askChannel: "Entrez le nom:",
    askDescription: "Décrivez le problème:",
    success: (id) => `Envoyé avec succès.\nTicket ID: ${id}`
  }
};

function showMenu(chatId) {
  const lang = userState[chatId]?.language || "en";
  userState[chatId] = { language: lang, step: "menu" };
  bot.sendMessage(chatId, messages[lang].menu);
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "Choose Language:\n/en\n/ar\n/fr");
});

bot.onText(/\/(en|ar|fr)/, (msg, match) => {
  const lang = match[1];
  userState[msg.chat.id] = { language: lang, step: "menu" };
  bot.sendMessage(msg.chat.id, messages[lang].menu);
});

// MENU COMMANDS
bot.onText(/\/menu/, (msg) => showMenu(msg.chat.id));
bot.onText(/^\/$/, (msg) => showMenu(msg.chat.id));
bot.onText(/\/cancel/, (msg) => showMenu(msg.chat.id));

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const state = userState[chatId];
  if (!state) return;

  const lang = state.language;

  if (state.step === "menu") {
    if (msg.text === "1") {
      state.type = "Complaint";
      state.step = "complaintMenu";
      bot.sendMessage(chatId, messages[lang].complaintMenu);
      return;
    }
    if (msg.text === "2") {
      state.type = "Feature Request";
      state.category = "Feature Request";
      state.step = "description";
      bot.sendMessage(chatId, messages[lang].askDescription);
      return;
    }
  }

  if (state.step === "complaintMenu") {
    if (msg.text === "1") {
      state.category = "Broken TV Channel";
      state.step = "channel";
      bot.sendMessage(chatId, messages[lang].askChannel);
      return;
    }
    if (msg.text === "2") {
      state.category = "Problem in Films/TV Shows";
      state.step = "channel";
      bot.sendMessage(chatId, messages[lang].askChannel);
      return;
    }
    if (msg.text === "3") {
      state.category = "Other";
      state.step = "description";
      bot.sendMessage(chatId, messages[lang].askDescription);
      return;
    }
  }

  if (state.step === "channel") {
    state.channel_name = msg.text;
    state.step = "description";
    bot.sendMessage(chatId, messages[lang].askDescription);
    return;
  }

  if (state.step === "description") {
    const response = await axios.post(scriptURL, {
      type: state.type,
      category: state.category,
      channel_name: state.channel_name || "",
      description: msg.text,
      telegram_id: msg.from.id,
      username: msg.from.username || "NoUsername",
      language: lang
    });

    bot.sendMessage(chatId, messages[lang].success(response.data.ticket_id));
    showMenu(chatId); // automatically return to menu
  }
});
