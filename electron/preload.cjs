const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appBridge", {
  send: (msg) => ipcRenderer.send("msg", JSON.stringify(msg)),
  onMessage: (cb) => {
    ipcRenderer.on("msg", (_event, payload) => cb(JSON.parse(payload)));
  },
  platform: process.platform,
});
