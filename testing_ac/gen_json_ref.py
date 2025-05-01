import scipy.io.wavfile as wav
import numpy as np
import json

# === Config ===
input_wav = "reference_15khz.wav"
output_json = "reference_mls.json"

# === Step 1: Load .wav file ===
sample_rate, data = wav.read(input_wav)

# If stereo, use only one channel
if data.ndim > 1:
    data = data[:, 0]

# Convert to float32 if not already
data = data.astype(np.float32)

# Normalize to [-1, 1] range
max_val = np.max(np.abs(data))
if max_val > 0:
    data = data / max_val

# === Step 2: Convert to dict { "0": val0, "1": val1, ... } ===
ref_dict = {str(i): float(v) for i, v in enumerate(data)}

# === Step 3: Save to JSON ===
with open(output_json, "w") as f:
    json.dump(ref_dict, f, indent=2)

print(f"✅ Saved reference signal to {output_json}")
