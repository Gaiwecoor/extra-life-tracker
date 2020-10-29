const Augur = require("augurbot"),
  Express = require("express"),
  bodyParser = require("body-parser");

const app = new Express();
var server;

const Module = new Augur.Module()
.setInit(() => {
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.locals.client = Module.client;
    next();
  });
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  app.all("/", (req, res) => {
    let {client} = res.locals;
    res.json({
      ready: client.readyAt,
      guilds: client.guilds.cache.size,
      shards: client.shard ? client.shard.count : 1
    });
  });

  // 404
  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      error: "Page Not Found."
    });
  });

  server = app.listen(Module.config.port, (err) => {
    if (err) console.error(err);
    else console.log("Listening on port", Module.config.port);
  });
})
.setUnload(() => {
  server.close();
});

module.exports = Module;
