const config = require("../config/config.json"),
  low = require("lowdb"),
  FileSync = require("lowdb/adapters/FileSync"),
  adapter = new FileSync(config.db.storage),
  db = low(adapter);

// Defaults
db.defaults({
  servers: [],
  users: []
}).write();

const users = {
  addUser: (user) => {
    if (user.id) user = user.id;
    let record = db.get("users").find({discordId: user});
    if (record.value()) {
      return record.value();
    } else {
      return db.get("users").push({
        discordId: user,
        channel: null,
        participant: null,
        team: null
      }).write();
    }
  },
  getUser: (user) => {
    if (user.id) user = user.id;
    return db.get("users").find({discordId: user}).value();
  },
  getChannel: (user) => users.getProperty(user, "channel"),
  getParticipant: (user) => users.getProperty(user, "participant"),
  getProperty: (user, property) => {
    if (user.id) user = user.id;
    return db.get("users").find({discordId: user}).get(property).value();
  },
  getTeam: (user) => users.getProperty(user, "team"),
  setChannel: (user, channel) => users.setProperty(user, "channel", channel),
  setParticipant: (user, id) => users.setProperty(user, "participant", id),
  setProperty: (user, property, value) => {
    if (user.id) user = user.id;
    if (!db.get("users").find({discordId: user}).value()) users.addUser(user);
    let props = {};
    props[property] = value;
    return db.get("users").find({discordId: user}).assign(props).write();
  },
  setTeam: (user, id) => users.setProperty(user, "team", id),
  updateUser: (user, data) => {
    if (user.id) user = user.id;
    if (!db.get("users").find({discordId: user}).value()) users.addUser(user);
    let update = {};
    for (let prop of ["channel", "participant", "team"])
      if (data[prop]) update[prop] = data[prop];
    return db.get("users").find({discordId: user}).assign(update).write();
  }
};

const servers = {
  addServer: (guild) => {
    if (guild.id) guild = guild.id;
    let server = db.get("servers").find({id: guild});
    if (server.value()) {
      return server.value();
    } else {
      return db.get("servers").push({
        id: guild,
        prefix: config.prefix,
        channel: null,
        notifications: null,
        participant: null,
        team: null
      }).write();
    }
  },
  getChannel: (guild) => servers.getProperty(guild, "channel"),
  getNotifications: (guild) => servers.getProperty(guild, "notifications"),
  getParticipant: (guild) => servers.getProperty(guild, "participant"),
  getProperty: (guild, property) => {
    if (guild.id) guild = guild.id;
    return db.get("servers").find({id: guild}).get(property).value();
  },
  getServer: (guild) => {
    if (guild.id) guild = guild.id;
    return db.get("servers").find({id: guild}).value();
  },
  getTeam: (guild) => servers.getProperty(guild, "team"),
  prefix: (guild) => servers.getProperty(guild, "prefix"),
  setProperty: (guild, property, value) => {
    if (guild.id) guild = guild.id;
    if (!db.get("servers").find({id: guild}).value()) servers.addServer(guild);
    let props = {};
    props[property] = value;
    return db.get("servers").find({id: guild}).assign(props).write();
  },
  setChannel: (guild, channel) => servers.setProperty(guild, "channel", channel),
  setNotifications: (guild, notifications) => servers.setProperty(guild, "notifications", notifications),
  setParticipant: (guild, participant) => servers.setProperty(guild, "participant", participant),
  setPrefix: (guild, prefix) => servers.setProperty(guild, "prefix", prefix),
  setTeam: (guild, team) => servers.setProperty(guild, "team", team),
  updateServer: (guild, data) => {
    if (guild.id) guild = guild.id;
    if (!db.get("servers").find({id: guild}).value()) servers.addServer(guild);
    let update = {};
    for (let prop of ["prefix", "channel", "notifications", "participant", "team"])
      if (data[prop]) update[prop] = data[prop];
    return db.get("servers").find({id: guild}).assign(update).write();
  }
};

module.exports = {
  servers,
  users
};
