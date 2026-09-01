# Quickstart: Notifications & Terminal Connections

## Testing Notifications
1. Start the app: `npm start`.
2. Open a terminal and run a command like `sleep 3 && echo Done`.
3. Minimize the app or switch windows to background.
4. When the command completes (or terminal outputs `Done` / exits), a native Windows/macOS notification banner will appear.
5. Click on the notification banner: the app window will gain focus, and the canvas will center and focus on the corresponding terminal.

## Testing Spatial Connections
1. Create two terminals on the canvas.
2. Drag from the connection handle (connector port dot on the terminal border) of Terminal A to Terminal B.
3. Observe the smooth Bézier connection curve drawn between the two terminals.
4. Move Terminal A or Terminal B around the canvas, or zoom in/out: the line remains anchored in real time.
5. When output is exchanged or a signal is sent between the terminals, observe the animated pulse along the line.
