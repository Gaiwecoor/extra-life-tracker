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
  setChannel: (user, channel) => {
    if (user.id) user = user.id;
    if (!db.get("users").find({discordId: user}).value()) users.addUser(user);
    return db.get("users").find({discordId: user}).assign({channel}).write();
  },
  setParticipant: (user, id) => {
    if (user.id) user = user.id;
    if (!db.get("users").find({discordId: user}).value()) users.addUser(user);
    return db.get("users").find({discordId: user}).assign({participant: id}).write();
  },
  setTeam: (user, id) => {
    if (user.id) user = user.id;
    if (!db.get("users").find({discordId: user}).value()) users.addUser(user);
    return db.get("users").find({discordId: user}).assign({team: id}).write();
  },
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
  prefix: (guild) => {
    if (guild.id) guild = guild.id;
    return db.get("servers").find({id: guild}).get("prefix").value();
  },
  getServer: (guild) => {
    if (guild.id) guild = guild.id;
    return db.get("servers").find({id: guild}).value();
  },
  getTeam: (guild) => {
    if (guild.id) guild = guild.id;
    return db.get("servers").find({id: guild}).get("team").value();
  },
  setChannel: (guild, channel) => {
    if (guild.id) guild = guild.id;
    if (!db.get("servers").find({id: guild}).value()) servers.addServer(guild);
    return db.get("servers").find({id: guild}).assign({channel}).write();
  },
  setNotifications: (guild, notifications) => {
    if (guild.id) guild = guild.id;
    if (!db.get("servers").find({id: guild}).value()) servers.addServer(guild);
    return db.get("servers").find({id: guild}).assign({notifications}).write();
  },
  setParticipant: (guild, participant) => {
    if (guild.id) guild = guild.id;
    if (!db.get("servers").find({id: guild}).value()) servers.addServer(guild);
    return db.get("servers").find({id: guild}).assign({participant}).write();
  },
  setPrefix: (guild, prefix) => {
    if (guild.id) guild = guild.id;
    if (!db.get("servers").find({id: guild}).value()) servers.addServer(guild);
    return db.get("servers").find({id: guild}).assign({prefix}).write();
  },
  setTeam: (guild, team) => {
    if (guild.id) guild = guild.id;
    if (!db.get("servers").find({id: guild}).value()) servers.addServer(guild);
    return db.get("servers").find({id: guild}).assign({team}).write();
  },
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
