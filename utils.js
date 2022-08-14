import { hostConfig, iceServers } from "./config.local.js";
export { hostConfig };
export const rtcConfig = {
  iceServers,
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 1,
};

export function postJson(url, data) {
  // console.log(`POST ${url}`);
  return fetch(`${hostConfig.rest}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
}
