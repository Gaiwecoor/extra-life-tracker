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
.addCommand({name: "serverparticipant",
  description: "Set the default participant id for the current server.",
  syntax: "participantId",
  category: "Admin",
  aliases: ["setparticipant"],
  permissions: (msg) => msg.guild && msg.member.hasPermission("MANAGE_GUILD"),
  process: async (msg, suffix) => {
    try {
      if (suffix) {
        let response = await request(`https://extralife.donordrive.com/api/participants/${encodeURIComponent(suffix)}`).catch(u.noop);
          if (response) {
            let participant = JSON.parse(response);
            if (participant.participantID) {
              Module.db.users.setParticipant(msg.author.id, parseInt(participant.participantID, 10));
              if (participant.teamID) Module.db.users.setTeam(msg.author.id, parseInt(participant.teamID, 10));
              if (participant.links.stream) Module.db.users.setChannel(msg.author.id, participant.links.stream.replace("https://player.twitch.tv/?channel=", ""));
              msg.react("👌").then(u.noop);
            } else msg.reply("I couldn't fetch that participant ID. Please check to ensure you have the right one!").then(u.clean);
          } else msg.reply("I couldn't fetch that participant ID. Please check to ensure you have the right one!").then(u.clean);
      } else {
        Module.db.servers.updateServer(msg.guild.id, {channel: null, participant: null, team: null});
        msg.react("👌").then(u.noop);
        msg.reply("Server participant has been removed.").then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "serverteam",
  description: "Set the default team id for the current server.",
  syntax: "teamId",
  category: "Admin",
  aliases: ["setteam"],
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
.addCommand({name: "servertwitch",
  description: "Set the default Twitch channel for the current server.",
  syntax: "twitchChannel",
  category: "Admin",
  aliases: ["settwitch", "setchannel"],
  permissions: (msg) => msg.guild && msg.member.hasPermission("MANAGE_GUILD"),
  process: async (msg, suffix) => {
    try {
      if (suffix) {
        Module.db.servers.setChannel(msg.guild, suffix);
        msg.react("👌").then(u.noop);
      } else {
        Module.db.servers.setChannel(msg.guild, null);
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
