import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export class DeviceManager {
  constructor() {
    this.isMac = process.platform === "darwin";
  }

  async listDevices() {
    const devices = [];

    // 1. iOS Simulators (macOS only)
    if (this.isMac) {
      try {
        const { stdout } = await execAsync("xcrun simctl list devices available -j", { timeout: 3000 });
        const data = JSON.parse(stdout);
        const deviceList = data.devices || {};
        for (const [runtime, list] of Object.entries(deviceList)) {
          for (const d of list) {
            devices.push({
              id: d.udid,
              name: d.name,
              platform: "ios",
              runtime: runtime.replace("com.apple.CoreSimulator.SimRuntime.", ""),
              state: d.state, // "Booted" or "Shutdown"
              isAvailable: d.isAvailable,
            });
          }
        }
      } catch {
        // Xcode or simctl not installed / timeout
      }
    }

    // 2. Android Connected Devices & Emulators via adb
    try {
      const { stdout } = await execAsync("adb devices -l", { timeout: 3000 });
      const lines = stdout.split("\n").slice(1);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("*")) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2 && parts[1] !== "offline") {
          const serial = parts[0];
          const isEmulator = serial.startsWith("emulator-");
          devices.push({
            id: serial,
            name: isEmulator ? `Android Emulator (${serial})` : `Android Device (${serial})`,
            platform: "android",
            runtime: "Android",
            state: "Booted",
            isAvailable: true,
          });
        }
      }
    } catch {
      // adb not installed / offline
    }

    return devices;
  }

  async bootDevice(deviceId, platform) {
    if (platform === "ios" && this.isMac) {
      await execAsync(`xcrun simctl boot "${deviceId}"`);
      return { ok: true };
    }
    return { ok: false, error: "Boot não suportado para esta plataforma" };
  }

  async getAccessibilityTree(deviceId, platform) {
    if (platform === "ios" && this.isMac) {
      try {
        const { stdout } = await execAsync(`xcrun simctl io "${deviceId}" dump_accessibility`, { timeout: 5000 });
        return { ok: true, tree: stdout };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    } else if (platform === "android") {
      try {
        await execAsync(`adb -s "${deviceId}" shell uiautomator dump /sdcard/window_dump.xml`, { timeout: 5000 });
        const { stdout } = await execAsync(`adb -s "${deviceId}" shell cat /sdcard/window_dump.xml`, { timeout: 5000 });
        return { ok: true, tree: stdout };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    return { ok: false, error: "Plataforma não suportada" };
  }

  async performAction(deviceId, platform, action, params = {}) {
    if (platform === "ios" && this.isMac) {
      switch (action) {
        case "tap":
          // Ex: xcrun simctl io <udid> send_event ...
          return { ok: true };
        case "key":
          if (params.key === "home") {
            await execAsync(`osascript -e 'tell application "Simulator" to activate'`);
          }
          return { ok: true };
      }
    } else if (platform === "android") {
      try {
        switch (action) {
          case "tap":
            await execAsync(`adb -s "${deviceId}" shell input tap ${params.x || 0} ${params.y || 0}`);
            return { ok: true };
          case "type":
            await execAsync(`adb -s "${deviceId}" shell input text "${params.text || ''}"`);
            return { ok: true };
          case "key": {
            const keyCodes = { home: 3, back: 4, lock: 26, recents: 187 };
            const code = keyCodes[params.key] || 3;
            await execAsync(`adb -s "${deviceId}" shell input keyevent ${code}`);
            return { ok: true };
          }
        }
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    return { ok: false, error: "Ação não suportada" };
  }

  async dumpAccessibilityTree(deviceId) {
    const isIOS = deviceId && deviceId.includes("-") && deviceId.length > 20;
    const platform = isIOS ? "ios" : "android";
    return this.getAccessibilityTree(deviceId, platform);
  }
}
