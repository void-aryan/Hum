const a = require("axios");
const f = require("fs");
const p = require("path");

const u = "http://65.109.80.126:20409/aryan/colorize";

module.exports = {
  config: {
    name: "colorize",
    aliases: ["clz"],
    version: "1.1",
    role: 0,
    author: "Christus",
    countDown: 10,
    longDescription: "Colorize black and white images.",
    category: "image",
    guide: {
      en: "${pn} reply to a black and white image to colorize it."
    }
  },

  onStart: async function ({ message, event }) {
    if (
      !event.messageReply ||
      !event.messageReply.attachments ||
      !event.messageReply.attachments[0] ||
      event.messageReply.attachments[0].type !== "photo"
    ) {
      return message.reply("🎨 Please reply to a black and white image to colorize it.");
    }

    const i = event.messageReply.attachments[0].url;
    const t = p.join(__dirname, "cache", `colorized_${Date.now()}.jpg`);
    let m;

    try {
      const r = await message.reply("🔄 Colorizing your image, please wait...");
      m = r.messageID;

      const d = await a.get(`${u}?imageUrl=${encodeURIComponent(i)}`);
      
      const colorizedImageUrl = d.data.result;

      if (!colorizedImageUrl) {
          throw new Error(d.data.error || "Colorize API did not return an image URL.");
      }
      
      const x = await a.get(colorizedImageUrl, { responseType: "stream" });
      const w = f.createWriteStream(t);
      x.data.pipe(w);

      await new Promise((res, rej) => {
        w.on("finish", res);
        w.on("error", rej);
      });

      await message.reply({
        body: "✅ Your colorized image is ready!",
        attachment: f.createReadStream(t),
      });

    } catch (e) {
      console.error("Colorize Error:", e);
      let errorMessage = "❌ An error occurred while colorizing the image. Please try again later.";
      if (e.response && e.response.data && e.response.data.error) {
          errorMessage = `❌ Colorization API Error: ${e.response.data.error}`;
          if (e.response.data.details) {
               let details = e.response.data.details;
               if (typeof details === 'object' && details !== null) {
                   details = details.message || JSON.stringify(details);
               }
               errorMessage += `\nDetails: ${details}`;
          }
      } else if (e.message) {
          errorMessage = `❌ Processing Error: ${e.message}`;
      }
      
      message.reply(errorMessage);

    } finally {
      if (m) message.unsend(m);
      if (f.existsSync(t)) f.unlinkSync(t);
    }
  }
};
