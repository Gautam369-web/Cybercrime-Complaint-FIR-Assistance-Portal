# Red display border

A small local Windows overlay that draws a red outline inset from every connected display edge. The transparent overlay stays above regular windows, does not take focus, and passes mouse clicks through to the app underneath.

## Run

Double-click `Start-RedBorder.vbs`. A tray icon appears in the notification area.

- Right-click the tray icon and choose **Hide red border** or **Show red border** to toggle it.
- Choose **Exit red border** to remove it completely.
- The overlay does not start with Windows and does not capture, record, or transmit screen contents.

This is a decorative overlay controlled from its tray menu. Windows does not provide a reliable public signal for another app to detect the start or end of arbitrary screen capture sessions, so this overlay does not follow the system's yellow capture indicator. Its color, thickness, and inset are set in `RedBorder.ps1`.
