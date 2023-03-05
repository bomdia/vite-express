import express from "express";
import core from "express-serve-static-core";
import fs from "fs";
import http from "http";
import https from "https";
import fetch from "node-fetch";
import path from "path";
import pc from "picocolors";
import Vite from "vite";

const { NODE_ENV } = process.env;

const Config = {
  mode: (NODE_ENV === "production" ? "production" : "development") as
    | "production"
    | "development",
  vitePort: 5173,
};

function getViteHost(host: string) {
  return `http://${host}:${Config.vitePort}`;
}

function info(msg: string) {
  const timestamp = new Date().toLocaleString("en-US").split(",")[1].trim();
  console.log(
    `${pc.dim(timestamp)} ${pc.bold(pc.cyan("[vite-express]"))} ${pc.green(
      msg
    )}`
  );
}

function isStaticFilePath(path: string) {
  return path.match(/\.\w+$/);
}

async function serveStatic(app: core.Express, host: string) {
  info(`Running in ${pc.yellow(Config.mode)} mode`);
  if (Config.mode === "production") {
    const config = await Vite.resolveConfig({}, "build");
    const distPath = path.resolve(config.root, config.build.outDir);
    app.use(express.static(distPath));

    if (!fs.existsSync(distPath)) {
      info(`${pc.yellow(`Static files at ${pc.gray(distPath)} not found!`)}`);
      await build();
    }
  } else {
    app.use((req, res, next) => {
      if (isStaticFilePath(req.path)) {
        fetch(`${getViteHost(host)}${req.path}`).then((response) => {
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
}

async function startDevServer(host: string) {
  const server = await Vite.createServer({
    clearScreen: false,
    server: { port: Config.vitePort, host },
  }).then((server) => server.listen());

  info(`Vite is listening ${pc.gray(getViteHost(host))}`);

  return server;
}

async function serveHTML(app: core.Express, host: string) {
  if (Config.mode === "production") {
    const config = await Vite.resolveConfig({}, "build");
    const distPath = path.resolve(config.root, config.build.outDir);

    app.use("*", (_, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    app.get("/*", async (req, res, next) => {
      if (isStaticFilePath(req.path)) return next();

      fetch(getViteHost(host))
        .then((res) => res.text())
        .then((content) =>
          content.replace(
            /(\/@react-refresh|\/@vite\/client)/g,
            `${getViteHost(host)}$1`
          )
        )
        .then((content) =>
          res.header("Content-Type", "text/html").send(content)
        );
    });
  }
}

function config(config: Partial<typeof Config>) {
  if (config.mode) Config.mode = config.mode;
  if (config.vitePort) Config.vitePort = config.vitePort;
}

function listen(
  app: core.Express,
  port: number,
  host?: string,
  callback?: () => void
) {
  let devServer: Vite.ViteDevServer | undefined;
  const realHost = host || "0.0.0.0";
  const server = app.listen(port, async () => {
    if (Config.mode === "development")
      devServer = await startDevServer(realHost);
    await serveStatic(app, realHost);
    await serveHTML(app, realHost);
    callback?.();
  });

  server.on("close", () => devServer?.close());

  return server;
}

function bind(
  app: core.Express,
  callback?: () => void,
  host?: string,
  httpPort?: number,
  httpServer?: http.Server,
  httpsPort?: number,
  httpsServer?: https.Server
) {
  const haveServers = httpServer || httpsServer;
  const realHttpPort = httpPort || 8080;
  const realHttpsPort = httpsPort || 8443;
  const realHost = host || "0.0.0.0";
  let devServer: Vite.ViteDevServer | undefined;
  const listener = async () => {
    if (Config.mode === "development" && !devServer)
      devServer = await startDevServer(realHost);
    await serveStatic(app, realHost);
    await serveHTML(app, realHost);
    callback?.();
  };
  const closer = () => devServer?.close();

  if (haveServers) {
    if (httpServer)
      httpServer.listen(realHttpPort, realHost, listener).on("close", closer);
    if (httpsServer)
      httpsServer.listen(realHttpsPort, realHost, listener).on("close", closer);
  } else {
    app.listen(realHttpPort, realHost, listener).on("close", closer);
  }
}

async function build() {
  info("Build starting...");
  await Vite.build();
  info("Build completed!");
}

export default { config, listen, build, bind };
