const Discord = require("discord.js"),
  config = require("../config/config.json"),
  fs = require("fs"),
  path = require("path"),
  db = require(path.resolve(process.cwd(), config.db.model));

const errorLog = new Discord.WebhookClient(config.error.id, config.error.token),
  serverSettings = new Map();

const Utils = {
  Collection: Discord.Collection,
  clean: function(msg, t = 20000) {
    setTimeout((m) => {
      if (m.deletable && !m.deleted) m.delete().catch(Utils.noop);
    }, t, msg);
    return Promise.resolve(msg);
  },
  confirm: async function(msg, prompt = "Are you sure?", timeout = 15) {
    try {
      let buttons = ["✅", "⛔"];
      let embed = Utils.embed().setColor(0xff0000)
        .setTitle(`Confirmation Required - Confirm in ${timeout}s`)
        .setAuthor(msg.member ? msg.member.displayName : msg.author.username, msg.author.displayAvatarURL())
        .setDescription(prompt)
        .setFooter(`${buttons[0]} to Confirm, ${buttons[1]} to Deny`);
      let dialog = await msg.channel.send({embed});
      for (let button of buttons) await dialog.react(button);

      let react = await dialog.awaitReactions((reaction, user) => buttons.includes(reaction.emoji.name) && msg.author.id == user.id, {max: 1, time: timeout * 1000});
      dialog.delete();
      if (react.size == 1 && react.first().emoji.name == buttons[0]) {
        return true;
      } else {
        return false;
      }
    } catch(error) { Utils.errorHandler(error, "Confirmation Prompt"); }
  },
  embed: (data) => new Discord.MessageEmbed(data).setColor(config.color).setTimestamp(),
  errorHandler: function(error, msg = null) {
    if (!error) return;

    console.error(Date());

    let embed = Utils.embed().setTitle(error.name);

    if (msg instanceof Discord.Message) {
      console.error(`${msg.author.username} in ${(msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "DM")}: ${msg.cleanContent}`);
      const client = msg.client;
      msg.channel.send("I've run into an error. I've let my devs know.")
        .then(Utils.clean);
      embed.addField("User", msg.author.username, true)
        .addField("Location", (msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "DM"), true)
        .addField("Command", msg.cleanContent || "`undefined`", true);
    } else if (typeof msg === "string") {
      console.error(msg);
      embed.addField("Message", msg);
    }

    console.trace(error);

    let stack = (error.stack ? error.stack : error.toString());
    if (stack.length > 1024) stack = stack.slice(0, 1000);

    embed.addField("Error", stack);
    errorLog.send(embed);
  },
  errorLog,
  escape: (text, options = {}) => Discord.escapeMarkdown(text, options),
  getMention: async function(msg, getMember = true) {
    try {
      let {suffix} = Utils.parse(msg);
      if (msg.guild) {
        let memberMentions = msg.mentions.members;
        memberMentions.delete(msg.client.user.id);
        if (memberMentions.size > 0) {
          return (getMember ? memberMentions.first() : memberMentions.first().user);
        } else if (suffix) {
          let member = (await msg.guild.members.fetch({query: suffix})).first();
          if (member) return (getMember ? member : member.user);
          else return undefined;
        } else return (getMember ? msg.member : msg.author);
      } else {
        let userMentions = msg.mentions.users;
        userMentions.delete(msg.client.user.id);
        return userMentions.first() || msg.author;
      }
    } catch(error) {
      u.errorHandler(error, msg);
      return null;
    }
  },
  noop: () => {},
  paginator: async function(msg, pager, elements, page = 0, perPage = 1) {
    try {
      let totalPages = Math.ceil(elements.length / perPage);
      if (totalPages > 1) {
        let embed = pager(elements, page, msg)
        .setFooter(`Page ${page + 1} / ${totalPages}. React with ⏪ and ⏩ to navigate.`);
        let m = await msg.channel.send({embed});
        await m.react("⏪");
        await m.react("⏩");
        let reactions;

        do {
          reactions = await m.awaitReactions(
            (reaction, user) => (user.id == msg.author.id) && ["⏪", "⏩"].includes(reaction.emoji.name),
            { time: 300000, max: 1 }
          );
          if (reactions.size > 0) {
            let react = reactions.first().emoji.name;
            if (react == "⏪") page--;
            else if (react == "⏩") page++;
            if (page < 0 || page >= totalPages) page = (page + totalPages) % totalPages;

            reactions.first().remove(msg.author.id);

            embed = pager(elements, page, msg)
            .setFooter(`Page ${page + 1} / ${totalPages}. React with ⏪ and ⏩ to navigate.`);
            m = await m.edit({embed});
          }
        } while (reactions.size > 0);

        embed.setFooter(`Page ${page + 1} / ${totalPages}`);
        m.edit({embed});
        for (const [rid, r] of m.reactions.cache) {
          if (!r.me) continue;
          else r.remove();
        }
      } else await msg.channel.send({embed: pager(elements, page, msg)});
    } catch(e) { Utils.alertError(e, msg); }
  },
  parse: (msg, clean = false) => {
    for (let prefix of [Utils.prefix(msg), `<@${msg.client.user.id}>`, `<@!${msg.client.user.id}>`]) {
      let content = clean ? msg.cleanContent : msg.content;
      if (!content.startsWith(prefix)) continue;
      let parts = content.split(" ");
      let command, suffix;
      if (parts[0] == prefix) {
        parts.shift();
        command = parts.shift();
      } else {
        command = parts.shift().substr(prefix.length);
      }
      if (command) {
        return {
          command: command.toLowerCase(),
          suffix: parts.join(" ")
        };
      }
    }
  },
  path: (...segments) => {
    const path = require("path");
    return path.resolve(path.dirname(require.main.filename), ...segments);
  },
  prefix: (msg) => msg.guild ? db.servers.prefix(msg.guild.id) : config.prefix,
  properCase: (txt) => txt.split(" ").map(word => (word[0].toUpperCase() + word.substr(1).toLowerCase())).join(" "),
  rand: (array) => array[Math.floor(Math.random() * array.length)],
  userMentions: (msg, member = false) => {
    // Useful to ensure the bot isn't included in the mention list,
    // such as when the bot mention is the command prefix
    let userMentions = (member ? msg.mentions.members : msg.mentions.users);
    if (userMentions.has(msg.client.user.id)) userMentions.delete(msg.client.user.id);
    return userMentions;
  }
};

module.exports = Utils;
