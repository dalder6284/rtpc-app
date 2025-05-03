import numpy as np
import json
import scipy.io.wavfile as wav
from scipy.signal import correlate
import matplotlib.pyplot as plt

# Load browser buffer (JSON)
with open("buffer.json", "r") as f:
    browser_data_dict = json.load(f)

# Convert dict to sorted NumPy array
browser_signal = np.array([browser_data_dict[str(i)] for i in sorted(map(int, browser_data_dict.keys()))])

# Normalize if needed
if browser_signal.max() > 1.0:
    browser_signal = browser_signal / np.abs(browser_signal).max()

# Load reference 15kHz .wav file
reference_sample_rate, reference_signal = wav.read("reference_15kHz.wav")

# Convert to mono if stereo
if reference_signal.ndim > 1:
    reference_signal = reference_signal[:, 0]

# Normalize to [-1, 1]
reference_signal = reference_signal.astype(np.float32)
reference_signal /= np.abs(reference_signal).max()


# Cross-correlation 
correlation = correlate(browser_signal, reference_signal, mode='full')
lags = np.arange(-len(reference_signal) + 1, len(browser_signal))
max_corr_index = np.argmax(correlation)
sample_offset = lags[max_corr_index]

# Estimate delay
time_offset = sample_offset / reference_sample_rate
print(f"Max correlation at sample offset: {sample_offset}")
print(f"Estimated time delay: {time_offset:.6f} seconds")

# Plot
plt.figure(figsize=(10, 4))
plt.plot(lags, correlation)
plt.title("Cross-correlation with 15kHz Reference")
plt.xlabel("Lag (samples)")
plt.ylabel("Correlation")
plt.grid(True)
plt.tight_layout()
plt.show()
