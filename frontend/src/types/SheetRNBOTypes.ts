export interface SheetNote {
    pitch: number;
    velocity: number;
    start: number;
    duration: string; // e.g. "4n", "8t", etc.
}

export interface SheetTrack {
    instrument: string;
    channel: number;
    notes: SheetNote[];
}

export interface SheetFile {
    bpm: number;
    end_beat: number;
    tracks: SheetTrack[];
}