import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp().listen(env.port);

console.log(`SafeMind backend running at ${app.server?.hostname}:${app.server?.port}`);
