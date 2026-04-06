import serverConfig from "../config/server.json";
import projectsConfig from "../config/projects.json";

export const config = {
  port: Number(process.env.MC_PORT) || serverConfig.port,
  socketPath: process.env.MC_SOCKET || serverConfig.socketPath,
  watchDirs: projectsConfig.watchDirs as string[],
};
