const Augur = require("augurbot"),
  request = require("request-promise-native"),
  TwitchClient = require("twitch").ApiClient,
  twitchConfig = require("../config/twitch.json"),
  twitch = TwitchClient.withClientCredentials(twitchConfig.clientId, twitchConfig.clientSecret).helix,
  u = require("../utils/utils");

const twitchGames = new Map(),
  twitchStatus = new Map();

function notificationEmbed(stream) {
  let embed = u.embed()
  .setTimestamp()
  .setColor('#6441A4')
  .setThumbnail(stream.thumbnailUrl.replace("{width}", "480").replace("{height}", "270") + "?t=" + Date.now())
  .setAuthor(stream.userDisplayName + (twitchGames.has(stream.gameId) ? ` playing ${twitchGames.get(stream.gameId).name}` : ""))
  .setTitle(stream.title)
  .setURL(stream.streamUrl);
  return embed;
};

function twitchEmbed(stream, online = true) {
  const name = stream.displayName || stream.userDisplayName;
  const embed = u.embed()
    .setURL(stream.streamUrl)
    .setAuthor(name)
    .setTitle("Twitch Stream: " + name)
    .setColor('#6441A4');

  if (online) {
    embed.setDescription(stream.title)
    .setTitle(stream.userDisplayName)
    .setThumbnail(stream.thumbnailUrl.replace("{width}", "480").replace("{height}", "270") + "?t=" + Date.now())
    .addField("Playing", (stream.gameId && twitchGames.has(stream.gameId) ? twitchGames.get(stream.gameId).name : "Something"), true)
    .addField("Current Viewers", stream.viewers, true)
    .setTimestamp(stream.startDate);
  } else {
    embed.setDescription("**Currently Offline**\n" + stream.description)
    .setTitle(stream.displayName)
    .setThumbnail(stream.profilePictureUrl)
    .setTimestamp();
  }

  return embed;
};

const Module = new Augur.Module()
.addCommand({name: "twitch",
  description: "Links to a Twitch stream",
  syntax: "<streamer_name> | <@user>",
  info: "Displays stream status and stream info.",
  category: "Streaming",
  process: async function(msg, suffix) {
    try {
      let channel = suffix;

      if (u.userMentions(msg).size > 0) {
        let target = u.userMentions(msg).first();
        channel = Module.db.users.getUser(target).channel;
      } else if (!channel) {
        if (msg.guild) channel = Module.db.servers.getServer(msg.guild).channel;
        if (!channel) channel = Module.db.users.getUser(msg.author).channel;
      }
      
      if (!channel) return msg.reply(`you need to tell me a Twitch channel, save a personal channel with \`${u.prefix(msg)}mychannel twitchChannel\`, or save a server Twitch channel with \`${u.prefix(msg)}serverTwitch twitchChannel\`.`).then(u.clean);

      const stream = await twitch.streams.getStreamByUserName(channel).catch(u.noop);
      if (stream) {
        if (!twitchGames.has(stream.gameId)) {
          let game = (await twitch.games.getGameById(stream.gameId));
          if (game) twitchGames.set(game.id, game);
        }
        stream.streamUrl = "https://www.twitch.tv/" + encodeURIComponent(channel).toLowerCase();
        msg.channel.send(twitchEmbed(stream));
      } else { // Offline
        const streamer = await twitch.users.getUserByName(channel).catch(u.noop);
        if (streamer) {
          streamer.streamUrl = "https://www.twitch.tv/" + encodeURIComponent(channel).toLowerCase();
          msg.channel.send(twitchEmbed(streamer, false));
        } else msg.reply(`I couldn't find Twitch channel \`${channel}\`.`).then(u.clean);
      }
    } catch(e) { u.errorHandler(e, msg); }
  }
});

module.exports = Module;
