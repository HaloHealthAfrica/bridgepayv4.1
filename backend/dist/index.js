"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const socket_service_1 = require("./services/socket.service");
const port = Number(process.env.PORT || 3000);
const server = http_1.default.createServer(app_1.app);
(0, socket_service_1.initializeSocket)(server);
server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Bridge backend listening on :${port}`);
});
//# sourceMappingURL=index.js.map