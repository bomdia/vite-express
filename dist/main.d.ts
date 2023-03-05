/// <reference types="node" />
/// <reference types="node" />
import core from "express-serve-static-core";
import http from "http";
import https from "https";
declare const Config: {
  mode: "production" | "development";
  vitePort: number;
};
declare function config(config: Partial<typeof Config>): void;
declare function listen(
  app: core.Express,
  port: number,
  host?: string,
  callback?: () => void
): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
declare function bind(
  app: core.Express,
  callback?: () => void,
  host?: string,
  httpPort?: number,
  httpServer?: http.Server,
  httpsPort?: number,
  httpsServer?: https.Server
): void;
declare function build(): Promise<void>;
declare const _default: {
  config: typeof config;
  listen: typeof listen;
  build: typeof build;
  bind: typeof bind;
};
export default _default;
