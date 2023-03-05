import { execSync } from "child_process";

import { run } from "./runner";
import { isLocalBuild } from "./utils";

if (isLocalBuild()) {
  execSync("rm -f vite-express-*.tgz && yarn build && yarn pack", {
    stdio: "inherit",
  });
}

require("./server.test");
require("./templates.test");
require("./cli.test");

run();