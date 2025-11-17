const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const COPILOT_API = "https://api.nekolabs.web.id/ai/copilot";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// ♻️ Réinitialiser conversation
const resetConversation = async (api, event, message) => {
  api.setMessageReaction("♻️", event.messageID, () => {}, true);
  try {
    await axios.delete(`${CLEAR_ENDPOINT}/${event.senderID}`);
    return message.reply(`✅ Conversation reset for UID: ${event.senderID}`);
  } catch (err) {
    console.error('❌ Reset Error:', err.message);
    return message.reply("❌ Reset failed. Try again.");
  }
};

// 🧠 Chat Copilot avec reconnaissance de l'auteur
const handleCopilotChat = async (api, event, message, userInput) => {
  if (!userInput) return message.reply("❗ Please provide a message.");
  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  // 🎯 Reconnaissance de l'auteur
  const normalized = userInput.toLowerCase();
  if (/(qui t'a créé|qui est ton auteur|qui t’a créé)/i.test(normalized)) {
    api.setMessageReaction("✅", event.messageID, () => {}, true);
    return message.reply("Je suis un bot créé par Christus ✅");
  }

  try {
    const url = `${COPILOT_API}?text=${encodeURIComponent(userInput)}`;
    const res = await axios.get(url);

    if (!res.data?.success) throw new Error("API failed");

    const replyText = res.data.result?.text || "No response.";

    const sent = await message.reply({ body: replyText });

    global.GoatBot.onReply.set(sent.messageID, {
      commandName: "copilot",
      author: event.senderID
    });

    api.setMessageReaction("✅", event.messageID, () => {}, true);
  } catch (err) {
    console.error("❌ Copilot API Error:", err.message);
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    message.reply("⚠️ Copilot Error:\n" + err.message);
  }
};

// ---------------- Module Export ----------------
module.exports = {
  config: {
    name: 'copilot',
    version: '1.0.1',
    author: 'Christus',
    role: 0,
    category: 'ai',
    longDescription: { en: 'Copilot AI chat: interactive text responses' },
    guide: { en: '.copilot [message] → Chat with Copilot AI' }
  },

  onStart: async ({ api, event, args, message }) => {
    const userInput = args.join(" ").trim();
    if (!userInput) return message.reply("❗ Please enter a message.");
    if (['clear', 'reset'].includes(userInput.toLowerCase())) {
      return await resetConversation(api, event, message);
    }
    return await handleCopilotChat(api, event, message, userInput);
  },

  onReply: async ({ api, event, Reply, message }) => {
    if (event.senderID !== Reply.author) return;
    const userInput = event.body?.trim();
    if (!userInput) return;
    if (['clear', 'reset'].includes(userInput.toLowerCase())) {
      return await resetConversation(api, event, message);
    }
    return await handleCopilotChat(api, event, message, userInput);
  },

  onChat: async ({ api, event, message }) => {
    const body = event.body?.trim();
    if (!body?.toLowerCase().startsWith("copilot ")) return;
    const userInput = body.slice(8).trim();
    if (!userInput) return;
    return await handleCopilotChat(api, event, message, userInput);
  }
};
