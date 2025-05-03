// MessageTypes.ts

// Joining
export type JoinRequestMessage = {
    type: "j";
    seat: number;
};

export type RejoinRequestMessage = {
    type: "rj";
    id: string;
};

export type JoinedMessage = {
    type: "joined";
    id: string;
    seat: string;
    expiresAt: number;
};


// Acoustic Beacon - Not in use
export type RecordMessage = {
    type: "start_record";
    play_time: number;
    send_time: number;
    duration: number;
    epsilon: number;
    beacon_id: string;
};

// export type OffsetMessage = {
//     type: "offset";
//     offset: number;
//     client_id: string;
//     sample_offset: number;
// };

// Time Sync
export type TimeSyncMessage = {
    type: "tq_result";
    client_time: number;
    server_time: number;
}

export type TimeRequestMessage = {
    type: "time_request";
    client_time: number;
}

// Performance
export type ReadyMessage = {
    type: "ready";
    id: string;
};

export type FileManifestMessage = {
    type: "file_manifest";
    seat: string;
    patch_files: { name: string; size: number; hash: string }[];
    sheet_files: { name: string; size: number; hash: string }[];
};

export type FileRequestMessage = {
    type: "file_request";
    name: string;
    fileType: "patch" | "sheet";
};

export type PhaseStartMessage = {
    type: "phase_start";
    bpm: number;
    count_in: number;
    start_time: number; // UNIX ms timestamp
    assignments: Record<string, {
        rnbo_id: string;
        sheet_id: string;
    }>;
};

export type PhaseStopMessage = {
    type: "phase_stop";
}

// Error and misc.
export type ErrorMessage = {
    type: "error";
    message: string;
};

export type PingMessage = {
    type: "ping";
};

export type PongMessage = {
    type: "pong";
};


// Message types for the server to client and client to server messages
export type ServerToClientMessage =
    | TimeSyncMessage
    | JoinedMessage
    | RecordMessage
    | ErrorMessage
    | PongMessage
    | FileManifestMessage
    | PhaseStartMessage
    | PhaseStopMessage;

export type ClientToServerMessage =
    | TimeRequestMessage
    | JoinRequestMessage
    | RejoinRequestMessage
    | PingMessage
    | ReadyMessage;
