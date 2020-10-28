const Augur = require("augurbot"),
  request = require("request-promise-native"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "prefix",
  description: "Set the bot's prefix for the current server.",
  syntax: "yourPrefix (e.g. `!`)",
  category: "Admin",
  permissions: (msg) => msg.guild && msg.member.hasPermission("MANAGE_GUILD"),
  process: (msg, suffix) => {
    try {
      if (!suffix) suffix = Module.config.prefix;
      Module.db.servers.setPrefix(msg.guild.id, suffix);
      msg.react("👌").then(u.noop);
      msg.reply(`Bot prefix has been set to: \`${suffix}\``).then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "setteam",
  description: "Set the default team id for the current server.",
  syntax: "teamId",
  category: "Admin",
  permissions: (msg) => msg.guild && msg.member.hasPermission("MANAGE_GUILD"),
  process: async (msg, suffix) => {
    try {
      if (suffix) {
        let response = await request(`https://extralife.donordrive.com/api/teams/${encodeURIComponent(suffix)}`).catch(u.noop);
          if (response) {
            let team = JSON.parse(response);
            if (team.teamID) {
              Module.db.servers.setTeam(msg.guild.id, parseInt(team.teamID, 10));
              msg.react("👌").then(u.noop);
              msg.reply(`Server Team has been set to: \`${parseInt(team.teamID, 10)}\``).then(u.clean);
            } else msg.reply("I couldn't fetch that team ID. Please check to ensure you have the right one!").then(u.clean);
          } else msg.reply("I couldn't fetch that team ID. Please check to ensure you have the right one!").then(u.clean);
      } else {
        Module.db.servers.setTeam(msg.guild.id, null);
        msg.react("👌").then(u.noop);
        msg.reply("Server Team has been removed.").then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addEvent("guildCreate", (guild) => {
  Module.db.servers.addServer(guild.id);
});

module.exports = Module;
