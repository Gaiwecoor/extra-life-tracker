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
        participant: null,
        team: null
      }).write();
    }
  },
  getUser: (user) => {
    if (user.id) user = user.id;
    return db.get("users").find({discordId: user}).value();
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
        team: null
      }).write();
    }
  },
  prefix: (guild) => {
    if (guild.id) guild = guild.id;
    return db.get("servers").find({id: guild}).get("prefix").value();
  },
  getTeam: (guild) => {
    if (guild.id) guild = guild.id;
    return db.get("servers").find({id: guild}).get("team").value();
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
  }
};

module.exports = {
  servers,
  users
};
