const Augur = require("augurbot"),
  u = require("../utils/utils"),
  request = require("request-promise-native");

const Module = new Augur.Module()
.addCommand({name: "iam",
  description: "Sets your participant id and team id.",
  syntax: "yourId",
  category: "User",
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
      } else msg.reply("you need to give me a participant ID!").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "mychannel",
  description: "Sets your personal Twitch channel.",
  syntax: "twitchChannel",
  category: "User",
  process: async (msg, suffix) => {
    try {
      Module.db.users.setChannel(msg.author, suffix || null);
      msg.react("👌").then(u.noop);
    } catch(error) { u.errorHandler(error, msg); }
  }
});

module.exports = Module;
