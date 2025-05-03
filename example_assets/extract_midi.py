import mido
import json
import argparse

def extract_all_tracks_from_midi(file_path):
    mid = mido.MidiFile(file_path)
    ticks_per_beat = mid.ticks_per_beat

    track_json_list = []

    for i, track in enumerate(mid.tracks):
        time = 0
        note_events = {}
        notes = []

        for msg in track:
            time += msg.time
            if msg.type == 'note_on' and msg.velocity > 0:
                note_events[msg.note] = (time, msg.velocity)
            elif msg.type in ('note_off', 'note_on') and msg.note in note_events:
                start_time, velocity = note_events.pop(msg.note)
                duration = time - start_time
                notes.append({
                    "pitch": msg.note,
                    "velocity": velocity,
                    "start_ticks": start_time,
                    "duration_ticks": duration
                })

        if notes:
            sheet_notes = []
            for note in notes:
                start = round(note["start_ticks"] / ticks_per_beat, 4)
                duration = round(note["duration_ticks"] / ticks_per_beat, 4)
                sheet_notes.append({
                    "pitch": note["pitch"],
                    "velocity": note["velocity"],
                    "start": start,
                    "duration": f"{duration}"
                })

            track_json_list.append({
                "instrument": f"track_{i}",
                "channel": 0,
                "notes": sheet_notes
            })

    # Calculate end_beat
    all_notes = [n for t in track_json_list for n in t["notes"]]
    end_beat = round(max(n["start"] + float(n["duration"]) for n in all_notes), 2) if all_notes else 0

    sheet_json = {
        "bpm": 120,
        "end_beat": end_beat,
        "tracks": track_json_list
    }

    return sheet_json

# -------- MAIN USAGE --------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract all tracks from MIDI file and convert to JSON.")
    parser.add_argument("input_file", help="Path to the input MIDI file (.mid)")
    parser.add_argument("-o", "--output", help="Path to the output JSON file", default="all_tracks.json")
    args = parser.parse_args()

    sheet = extract_all_tracks_from_midi(args.input_file)

    with open(args.output, "w") as f:
        json.dump(sheet, f, indent=2)

    print(f"All tracks extracted from {args.input_file} to {args.output}")

