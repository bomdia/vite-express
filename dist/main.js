"use strict";

var express = require("express");
var fs = require("fs");
var fetch = require("node-fetch");
var path = require("path");
var pc = require("picocolors");
var Vite = require("vite");

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P
      ? value
      : new P(function (resolve) {
          resolve(value);
        });
  }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done
        ? resolve(result.value)
        : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

const { NODE_ENV } = process.env;
const Config = {
  mode: NODE_ENV === "production" ? "production" : "development",
  vitePort: 5173,
};
function getViteHost() {
  return `http://localhost:${Config.vitePort}`;
}
function info(msg) {
  const timestamp = new Date().toLocaleString("en-US").split(",")[1].trim();
  console.log(
    `${pc.dim(timestamp)} ${pc.bold(pc.cyan("[vite-express]"))} ${pc.green(
      msg
    )}`
  );
}
function isStaticFilePath(path) {
  return path.match(/\.\w+$/);
}
function serveStatic(app) {
  return __awaiter(this, void 0, void 0, function* () {
    info(`Running in ${pc.yellow(Config.mode)} mode`);
    if (Config.mode === "production") {
      const config = yield Vite.resolveConfig({}, "build");
      const distPath = path.resolve(config.root, config.build.outDir);
      app.use(express.static(distPath));
      if (!fs.existsSync(distPath)) {
        info(`${pc.yellow(`Static files at ${pc.gray(distPath)} not found!`)}`);
        yield build();
      }
    } else {
      app.use((req, res, next) => {
        if (isStaticFilePath(req.path)) {
          fetch(`${getViteHost()}${req.path}`).then((response) => {
            if (!response.ok) return next();
            res.redirect(response.url);
          });
        } else next();
      });
    }
    const layer = app._router.stack.pop();
    app._router.stack = [
      ...app._router.stack.slice(0, 2),
      layer,
      ...app._router.stack.slice(2),
    ];
  });
}
function startDevServer() {
  return __awaiter(this, void 0, void 0, function* () {
    const server = yield Vite.createServer({
      clearScreen: false,
      server: { port: Config.vitePort },
    }).then((server) => server.listen());
    info(`Vite is listening ${pc.gray(getViteHost())}`);
    return server;
  });
}
function serveHTML(app) {
  return __awaiter(this, void 0, void 0, function* () {
    if (Config.mode === "production") {
      const config = yield Vite.resolveConfig({}, "build");
      const distPath = path.resolve(config.root, config.build.outDir);
      app.use("*", (_, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    } else {
      app.get("/*", (req, res, next) =>
        __awaiter(this, void 0, void 0, function* () {
          if (isStaticFilePath(req.path)) return next();
          fetch(getViteHost())
            .then((res) => res.text())
            .then((content) =>
              content.replace(
                /(\/@react-refresh|\/@vite\/client)/g,
                `${getViteHost()}$1`
              )
            )
            .then((content) =>
              res.header("Content-Type", "text/html").send(content)
            );
        })
      );
    }
  });
}
function config(config) {
  if (config.mode) Config.mode = config.mode;
  if (config.vitePort) Config.vitePort = config.vitePort;
}
function listen(app, port, callback) {
  let devServer;
  const server = app.listen(port, () =>
    __awaiter(this, void 0, void 0, function* () {
      if (Config.mode === "development") devServer = yield startDevServer();
      yield serveStatic(app);
      yield serveHTML(app);
      callback === null || callback === void 0 ? void 0 : callback();
    })
  );
  server.on("close", () =>
    devServer === null || devServer === void 0 ? void 0 : devServer.close()
  );
  return server;
}
function bind(
  app,
  callback,
  host,
  httpPort,
  httpServer,
  httpsPort,
  httpsServer
) {
  const haveServers = httpServer || httpsServer;
  const realHttpPort = httpPort || 8080;
  const realHttpsPort = httpsPort || 8443;
  const realHost = host || "0.0.0.0";
  let devServer;
  const listener = () =>
    __awaiter(this, void 0, void 0, function* () {
      if (Config.mode === "development" && !devServer)
        devServer = yield startDevServer();
      yield serveStatic(app);
      yield serveHTML(app);
      callback === null || callback === void 0 ? void 0 : callback();
    });
  const closer = () =>
    devServer === null || devServer === void 0 ? void 0 : devServer.close();
  if (haveServers) {
    if (httpServer)
      httpServer.listen(realHttpPort, realHost, listener).on("close", closer);
    if (httpsServer)
      httpsServer.listen(realHttpsPort, realHost, listener).on("close", closer);
  } else {
    app.listen(realHttpPort, realHost, listener).on("close", closer);
  }
}
function build() {
  return __awaiter(this, void 0, void 0, function* () {
    info("Build starting...");
    yield Vite.build();
    info("Build completed!");
  });
}
var main = { config, listen, build, bind };

module.exports = main;
