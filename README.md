# 🕒 Floating Clock

A premium, always-on-top desktop overlay utility featuring customizable glassmorphic widgets (Clock, Countdown Timer, and Stopwatch) designed with Electron, HTML5, CSS3, and JavaScript.

This app features fluid, real-time settings synchronization, dynamic SVG wave animations, and advanced window layering optimized specifically for modern Linux desktop environments.

---

## ✨ Features

- **Always-On-Top Overlay**: Configured to float above all standard applications, games, and text editors.
- **Glassmorphic Aesthetic**: Sleek design featuring `backdrop-filter: blur(16px)`, customizable translucent backdrops, and glowing borders.
- **Interactive SVG Water Waves**: Fluid wave animations that respond dynamically:
  - In the **Countdown Timer**, the water level drains proportionally to the remaining time and flashes red on completion.
  - In the **Stopwatch**, the wave speeds up when active.
- **Multi-Workspace Persistence**: Windows follow you across virtual desktops (workspaces) on Linux.
- **Real-Time Settings Sync**: Instant updates to active widgets when changing accent colors (Blue, Green, Red, Orange, Pink, Purple), clock fonts (Orbitron, Inter, Share Tech Mono), opacity levels, or seconds display.
- **Drag Lock / Click-Through**: Lock widget positions using a padlock button to make them click-through and prevent accidental dragging.

---

## 🛠️ Linux & Window Manager Optimizations

This application includes advanced technical solutions to handle standard Linux/X11/Wayland window manager constraints:
1. **Wayland Bypass**: Standard Wayland blocks programmatic always-on-top window layering. The app is pre-configured to run under XWayland/X11 compatibility (`--ozone-platform=x11`), enabling reliable transparency, always-on-top behavior, and positioning.
2. **OS-Level Hover Tracking**: Resolves the classic Electron bug where Chromium loses hover state over `-webkit-app-region: drag` zones on Linux. The main process polls the OS cursor position 20 times a second and updates the window's hover state over IPC, ensuring options and window buttons remain 100% visible and interactive.
3. **Workspace Propagation**: Floating widgets are declared as `'utility'` types and utilize `.setVisibleOnAllWorkspaces(true)` to follow the user across multiple virtual desktops.

---

## 📂 File Structure

```text
floating clock/
├── main.js                 # Electron main controller & OS hover tracking
├── preload.js              # Secure IPC bridge (contextBridge)
├── package.json            # Run scripts & configurations
├── assets/
│   └── icon.png            # Application branding icon
└── renderer/
    ├── dashboard.html      # Central settings panel layout
    ├── dashboard.css       # Premium settings panel styling
    ├── dashboard.js        # Event listeners & settings persistence
    ├── floating.html       # Floating widgets template
    ├── floating.css        # Glassmorphism & wave styling
    └── floating.js         # Clock, timer, and stopwatch engine
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- npm (Node Package Manager)

### Installation

1. Clone or download the repository into your workspace directory.
2. Navigate to the project root and install the dependencies:
   ```bash
   npm install
   ```

### Running the App

To launch the dashboard and the overlay system:
```bash
npm start
```

---

## 📖 Usage Guide

1. **Dashboard Controls**:
   - Toggle **Simple Clock**, **Countdown Timer**, or **Stopwatch** widgets to spawn or close them.
   - Pulsing green indicators show which widgets are currently active.
   - Click the gear icon to customize theme accents, fonts, opacity, and wave toggle.

2. **Floating Widgets**:
   - **Hover**: Move the mouse inside any widget. The action bar will slide down from the top, exposing the window title, drag handle, lock button, and close button.
   - **Drag**: Click and hold the grab icon (six dots) or any portion of the title bar to move the widget.
   - **Lock Position**: Click the padlock button in the action bar. The widget locks in place, turning off dragging so you don't accidentally move it.
   - **Stopwatch Laps**: Recording a lap dynamically expands the widget height to display the lap log. Pressing reset automatically shrinks the widget back to its compact size.
