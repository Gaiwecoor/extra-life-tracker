const Augur = require("augurbot"),
  request = require("request-promise-native"),
  TwitchClient = require("twitch").ApiClient,
  twitchConfig = require("../config/twitch.json"),
  twitch = TwitchClient.withClientCredentials(twitchConfig.clientId, twitchConfig.clientSecret).helix,
  u = require("../utils/utils");

const twitchGames = new Map();

async function extraLifeLive(teamId) {
  if (!teamId) return undefined;
  try {
    let team = await fetchExtraLifeTeam(teamId);
    if (!team) return undefined;

    let streams = await fetchExtraLifeStreams(team);

    if (streams && streams.data && streams.data.length > 0) {
      let embed = u.embed()
      .setTitle(`Live from the ${team.name} ${team.eventName} Team!`)
      .setThumbnail(team.avatarImageURL ? `https:${team.avatarImageURL}` : "https://assets.donordrive.com/extralife/images/fbLogo.jpg?v=202009241356")
      .setURL(team.links.page);

      let channels = [];
      for (const stream of streams.data) {
        if (!twitchGames.has(stream.gameId)) {
          let game = await twitch.games.getGameById(stream.gameId).catch(u.noop);
          if (game) twitchGames.set(game.id, game);
        }
        channels.push({
          name: stream.userDisplayName,
          game: twitchGames.has(stream.gameId) ? twitchGames.get(stream.gameId).name : "Something?",
          service: "Twitch",
          title: stream.title,
          url: `https://www.twitch.tv/${stream.userDisplayName}`
        });
      }

      channels.sort((a, b) => a.name.localeCompare(b.name));

      for (let i = 0; i < Math.min(channels.length, 25); i++) {
        let channel = channels[i];
        embed.addField(`${channel.name} playing ${channel.game}`, `[${channel.title}](${channel.url})`);
      }

      return embed;
    }
  } catch(error) { u.errorHandler(error, "Extra Life Stream Fetch"); }
}

async function fetchExtraLifeStreams(team) {
  if (!(team && team.participants)) return;
  try {
    let userName = team.participants.filter(m => m.links.stream).map(member => member.links.stream.replace("https://player.twitch.tv/?channel=", ""));
    let streams = await twitch.streams.getStreams({userName}).catch(u.noop);
    return streams;
  } catch(error) { u.errorHandler(error, "Fetch Extra Life Streams"); }
}

async function fetchExtraLifeTeam(teamId) {
  try {
    let team = await request(`https://extralife.donordrive.com/api/teams/${encodeURIComponent(teamId)}`).catch(u.noop);
    if (team) {
      team = JSON.parse(team);
      let participants = await request(`https://extralife.donordrive.com/api/teams/${encodeURIComponent(teamId)}/participants`).catch(u.noop);
      if (participants) team.participants = JSON.parse(participants);
      return team;
    }
  } catch(error) { u.errorHandler(error, "Fetch Extra Life Team"); }
}

const Module = new Augur.Module()
.addCommand({name: "live",
  description: "See who is live on the Extra Life Team",
  permissions: (msg) => Module.db.users.getUser(msg.author).team || (msg.guild && Module.db.servers.getTeam(msg.guild)),
  process: async (msg, suffix) => {
    try {
      let teamId = suffix;

      if (u.userMentions(msg).size > 0) {
        let target = u.userMentions(msg).first();
        teamId = Module.db.users.getUser(target).team;
      } else if (!teamId) {
        teamId = Module.db.servers.getTeam(msg.guild);
        if (!teamId) teamId = Module.db.users.getUser(msg.author).team;
      }

      if (!teamId) return msg.reply(`you need to tell me a Team ID, save a personal Team with \`${u.prefix(msg)}iam yourParticipantId\`, or save a server Team with \`${u.prefix(msg)}setTeam teamId\`.`).then(u.clean);

      let embed = await extraLifeLive(teamId);
      if (embed) msg.channel.send({embed});
      else msg.reply("I couldn't find any live Extra Life Team streams!").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "goal",
  description: "Check your personal Extra Life Goal",
  process: async msg => {
    try {
      let target = u.userMentions(msg).first() || msg.author;
      let participantId = Module.db.users.getUser(target).participant;
      if (!participantId) return msg.reply(`you need to save your participant ID with \`${u.prefix(msg)}iam yourId\` or @mention someone with a saved participant ID!`).then(u.clean);

      let participant = await request(`https://extralife.donordrive.com/api/participants/${participantId}`).catch(u.noop);
      if (participant) {
        participant = JSON.parse(participant);
        let embed = u.embed()
        .setThumbnail(participant.avatarImageURL ? `https:${participant.avatarImageURL}` : "https://assets.donordrive.com/extralife/images/fbLogo.jpg?v=202009241356")
        .setTitle(`${participant.displayName} for ${participant.eventName}`)
        .setURL(participant.links.page)
        .setDescription(`${participant.displayName} is raising money for ${participant.eventName}! They are currently at $${participant.sumDonations} of the $${participant.fundraisingGoal} goal. That's ${Math.round(100 * participant.sumDonations / participant.fundraisingGoal)}% there!\n\nYou can help by donating [[here]](${participant.links.donate}).`);
        msg.channel.send({embed});
      } else msg.channel.reply(`sorry, I couldn't find participant info for participant ID \`${participantId}\`.`).then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "team",
  description: "Check the Team's Extra Life Goal",
  syntax: "teamID or @user (each optional)",
  process: async (msg, suffix) => {
    try {
      let teamId = suffix;

      if (u.userMentions(msg).size > 0) {
        let target = u.userMentions(msg).first();
        teamId = Module.db.users.getUser(target).team;
      } else if (!teamId) {
        teamId = Module.db.servers.getTeam(msg.guild);
        if (!teamId) teamId = Module.db.users.getUser(msg.author).team;
      }

      if (!teamId) return msg.reply(`you need to tell me a Team ID, save a personal Team with \`${u.prefix(msg)}iam yourParticipantId\`, or save a server Team with \`${u.prefix(msg)}setTeam teamId\`.`).then(u.clean);

      let team = await fetchExtraLifeTeam(teamId);
      if (!team) return msg.reply(`I couldn't find a team with ID \`${teamId}\`.`).then(u.clean);

      for (let member of team.participants) {
        if (member.links.stream) member.twitch = member.links.stream.replace("https://player.twitch.tv/?channel=", "");
        member.streamIsLive = false;
      }
      let streams = await fetchExtraLifeStreams(team).catch(u.noop);
      if (streams) {
        for (const stream of streams.data) {
          let member = team.participants.find(m => m.twitch && m.twitch.toLowerCase() == stream.userDisplayName.toLowerCase())
          member.streamIsLive = true;
          member.stream = stream;
        }
      }
      team.participants.sort((a, b) => {
        if (a.streamIsLive != b.streamIsLive) return (b.streamIsLive - a.streamIsLive);
        else if (a.sumDonations != b.sumDonations) return (b.sumDonations - a.sumDonations);
        else return a.displayName.localeCompare(b.displayName)
      });

      let embed = u.embed()
      .setTitle(`${team.name} ${team.eventName}`)
      .setThumbnail(team.avatarImageURL ? `https:${team.avatarImageURL}` : "https://assets.donordrive.com/extralife/images/fbLogo.jpg?v=202009241356")
      .setURL(team.links.page)
      .setDescription(`${team.name} is raising money for ${team.eventName}! We are currently at $${team.sumDonations} of our team's $${team.fundraisingGoal} goal. That's ${Math.round(100 * team.sumDonations / team.fundraisingGoal)}% there!\n\nYou can help by donating to one of the Extra Life Team below.`);
      for (let i = 0; i < Math.min(team.participants.length, 25); i++) {
        let member = team.participants[i];
        embed.addField(member.displayName, `$${member.sumDonations} / $${member.fundraisingGoal} (${Math.round(100 * member.sumDonations / member.fundraisingGoal)}%)\n[[Donate]](${member.links.donate})${(member.streamIsLive ? `\n**STREAM NOW LIVE**\n[${member.stream.title}](https://www.twitch.tv/${member.twitch})` : "")}`, true);
      }
      msg.channel.send({embed});
    } catch(error) { u.errorHandler(error, msg); }
  }
});

module.exports = Module;
