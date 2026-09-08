const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const connectionsJs = fs.readFileSync(
    path.join(__dirname, "../public/js/connections.js"),
    "utf-8"
  );

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          .widget.drag-over, .spatial-node.drag-over { border-color: cyan; }
        </style>
      </head>
      <body>
        <div id="world">
          <svg id="connections-layer"></svg>
          <div id="t1" class="widget" style="position:absolute;left:50px;top:50px;width:200px;height:100px;"></div>
          <div id="t2" class="spatial-node" style="position:absolute;left:400px;top:200px;width:200px;height:100px;"></div>
        </div>
        <script>
          ${connectionsJs}
        </script>
      </body>
    </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  const results = await win.webContents.executeJavaScript(`
    (function() {
      const logs = [];
      const assert = (cond, msg) => {
        if (!cond) throw new Error("Assertion failed: " + msg);
        logs.push("PASS: " + msg);
      };

      const t1El = document.getElementById("t1");
      const t2El = document.getElementById("t2");

      const nodeMap = new Map([
        ["t1", {
          id: "t1",
          el: t1El,
          worldPos: { x: 50, y: 50 },
          worldSize: { w: 200, h: 100 },
        }],
        ["t2", {
          id: "t2",
          el: t2El,
          worldPos: { x: 400, y: 200 },
          worldSize: { w: 200, h: 100 },
        }],
      ]);

      let createdConn = null;
      const mockApp = {
        canvas: {
          zoom: 1,
          tx: 0,
          ty: 0,
          screenToWorld: (sx, sy) => ({ x: sx, y: sy }),
          worldToScreen: (wx, wy) => ({ x: wx, y: wy }),
        },
        getNode: (id) => nodeMap.get(id),
        getAllNodes: () => [...nodeMap.values()],
        sendCreateConnection: (data) => { createdConn = data; },
        sendRemoveConnection: () => {},
      };

      const mgr = new ConnectionsManager(mockApp);
      assert(mgr.defaultStyle === "rope", "ConnectionsManager initialized with defaultStyle = rope");
      assert(mgr.svg !== null, "Layer SVG found");

      // 1. Test geometric calculation
      const ropePath = mgr._calculatePath({ x: 0, y: 0 }, { x: 100, y: 100 }, { style: "rope" });
      assert(ropePath.startsWith("M 0 0 C"), "Rope path calculated as cubic bezier");

      const bezierPath = mgr._calculateBezier({ x: 0, y: 0 }, { x: 100, y: 100 });
      assert(bezierPath === ropePath, "_calculateBezier correctly delegates to _calculatePath");

      const circuitPath = mgr._calculatePath({ x: 0, y: 0 }, { x: 100, y: 100 }, { style: "circuit" });
      assert(circuitPath.includes("Q") || circuitPath.includes("L"), "Circuit path calculated");

      // 2. Test drag start
      mgr.startDrag("t1", 250, 100);
      assert(mgr.activeDrag !== null, "activeDrag exists after startDrag");
      assert(mgr.activeDrag.fromId === "t1", "activeDrag.fromId is t1");
      assert(mgr.previewPath !== null, "previewPath created in DOM");
      assert(mgr.previewPath.getAttribute("d").length > 0, "previewPath 'd' initialized");

      // 3. Test pointermove with adaptive anchor & drag-over detection
      // Mock getBoundingClientRect for t2
      t2El.getBoundingClientRect = () => ({
        left: 400,
        right: 600,
        top: 200,
        bottom: 300,
        width: 200,
        height: 100,
      });

      // Move hovering outside t2
      mgr._onPointerMove({ clientX: 300, clientY: 150 });
      assert(!t2El.classList.contains("drag-over"), "t2 has no drag-over outside boundaries");

      // Move hovering inside t2
      mgr._onPointerMove({ clientX: 450, clientY: 250 });
      assert(t2El.classList.contains("drag-over"), "t2 has drag-over class when cursor is over it");

      // 4. Test Escape key cancellation
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      assert(mgr.activeDrag === null, "activeDrag cancelled on Escape");
      assert(mgr.previewPath === null, "previewPath removed on Escape");
      assert(!t2El.classList.contains("drag-over"), "drag-over cleared on Escape");

      // 5. Test completing a connection (pointerup over t2)
      mgr.startDrag("t1", 250, 100);
      mgr._onPointerMove({ clientX: 450, clientY: 250 });
      mgr._onPointerUp({ clientX: 450, clientY: 250 });

      assert(createdConn !== null, "sendCreateConnection dispatched");
      assert(createdConn.from === "t1" && createdConn.to === "t2", "connection endpoints match t1 -> t2");
      assert(mgr.activeDrag === null, "activeDrag cleared after pointerup");
      assert(!t2El.classList.contains("drag-over"), "drag-over cleared after pointerup");

      // 6. Test establishing connection and triggerPulse
      mgr.add({ id: "conn_test", from: "t1", to: "t2", style: "rope" }, true);
      assert(mgr.connections.has("conn_test"), "conn_test stored in manager");
      const groupEl = mgr.svg.querySelector('.connection-group[data-id="conn_test"]');
      assert(groupEl !== null, "Connection group SVG rendered in DOM");

      // Pulse by conn id
      mgr.triggerPulse("conn_test");
      const pathEl = groupEl.querySelector(".connection-path");
      assert(pathEl.classList.contains("conn-pulse"), "conn-pulse class added on pulse");

      // Pulse by node ids
      mgr.triggerPulse("t1", "t2");
      assert(pathEl.classList.contains("conn-pulse"), "conn-pulse active via node ids");

      return { success: true, logs };
    })();
  `);

  console.log("TEST RESULTS:", JSON.stringify(results, null, 2));
  app.exit(results.success ? 0 : 1);
}).catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
