// message sent from host to client

export interface HCPingMessage {
  type: "ping";
  ping: number;
}

export type HostClientMessage = HCPingMessage;
