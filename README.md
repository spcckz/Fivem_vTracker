# vTracker - FiveM Vehicle Analytics
A powerful FiveM vehicle analytics tool that tracks spawn frequency and usage time. Perfect for server optimization and data-driven vehicle management.

## Features
- Real-time vehicle usage tracking
- Interactive in-game UI (/vehiclestats)
- Automatic hourly reports
- Server-side data persistence
- Tracks:
  - Vehicle spawn frequency
  - Total drive time per vehicle
  - Active session timing

## Requirements
### Required
- FiveM Server

### Recommended
- vMenu (for automatic vehicle list configuration)
  - If vMenu is installed, vTracker will automatically use your addons.json vehicle list
  - Without vMenu, you'll need to create a custom config.json (see Configuration below)

## Installation
1. Drop the `vTracker` folder into your server's `resources` directory
2. Add `ensure vTracker` to your `server.cfg`
3. Add permission for reset command:
   ```cfg
   add_ace group.admin command.vehiclestatsreset allow
   ```
4. Restart your server

## Configuration
vTracker works in two modes:

### Mode 1: With vMenu (Recommended)
- No configuration needed
- Automatically uses vehicles from vMenu's addons.json
- Just install and start using

### Mode 2: Without vMenu
Create a `config.json` in the vTracker resource folder:
```json
{
    "vehicles": [
        "adder",
        "zentorno",
        // Add your vehicle spawn names here
    ]
}
```

## Commands
- `/vehiclestats` - Opens the statistics UI (all players)
- `/vehiclestatsreset` - Resets all statistics (admin only)

## Files Generated
- `vehicleData.json` - Statistics data
- `stats.html` - Human-readable report

## Why Use vTracker?
- Identify popular/unused vehicles
- Make informed decisions about server resources
- Optimize performance
- Track usage patterns

## Support
If you need help:
1. Check your vMenu installation (if using)
2. Verify config.json format (if not using vMenu)
3. Check server permissions
4. Review server console for errors

## Credits
Created by [SPCCKZ]

