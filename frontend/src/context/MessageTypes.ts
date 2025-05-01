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
    seat: string;
    expiresAt: number;
};

export type RecordMessage = {
    type: "start_record";
    play_time: number;
    send_time: number;
    duration: number;
    epsilon: number;
    beacon_id: string;
};

export type OffsetMessage = {
    type: "offset";
    offset: number;
    client_id: string;
    sample_offset: number;
};

export type ErrorMessage = {
    type: "error";
    message: string;
};

export type TimeSyncMessage = {
    type: "tq_result";
    client_time: number;
    server_time: number;
}

export type TimeRequestMessage = {
    type: "time_request";
    client_time: number;
}

export type ServerToClientMessage =
    | TimeSyncMessage
    | JoinedMessage
    | RecordMessage
    | ErrorMessage
    | PongMessage
    | OffsetMessage;

export type ClientToServerMessage =
    | TimeRequestMessage
    | JoinRequestMessage
    | RejoinRequestMessage
    | PingMessage;
