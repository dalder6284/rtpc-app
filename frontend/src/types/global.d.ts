// Extend the Window interface to include vendor-prefixed AudioContext
interface Window {
    webkitAudioContext?: typeof AudioContext;
    // Add other prefixed APIs here if needed, e.g.:
    // webkitIndexedDB?: IDBFactory;
    // mozIndexedDB?: IDBFactory;
    // msIndexedDB?: IDBFactory;
}