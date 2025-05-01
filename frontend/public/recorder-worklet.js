// public/recorder-worklet.js

class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.recording = false;
      this.port.onmessage = (e) => {
        this.recording = e.data === 'start';
      };
    }
    process(inputs) {
      const inchan = inputs[0]?.[0];
      if (this.recording && inchan) {
        this.port.postMessage(inchan);
      }
      return true;
    }
  }
  
  registerProcessor('recorder-processor', RecorderProcessor);
  