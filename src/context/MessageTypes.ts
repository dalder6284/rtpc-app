// MessageTypes.ts

export type JoinRequestMessage = {
    type: "j";
    seat: number;
};

export type RejoinRequestMessage = {
    type: "rj";
    id: string;
};

export type PingMessage = {
    type: "ping";
};

export type PongMessage = {
    type: "pong";
};

export type JoinedMessage = {
    type: "joined";
    id: string;
    ttl: number;
    seat: string;
};

export type ErrorMessage = {
    type: "error";
    message: string;
};

export type ServerToClientMessage =
    | JoinedMessage
    | ErrorMessage
    | PongMessage;

export type ClientToServerMessage =
    | JoinRequestMessage
    | RejoinRequestMessage
    | PingMessage;
