// File: dataSciencePlugin.js

const fs = require('fs');
const path = require('path');

// Get the resource path using GetCurrentResourceName()
const resourceName = GetCurrentResourceName();
const resourcePath = GetResourcePath(resourceName);

// Function to find vMenu config file
function findVMenuConfig() {
    const baseResourcePath = path.join(resourcePath, '../..');
    const vmenuPath = path.join(baseResourcePath, 'vMenu/config/addons.json');

    if (fs.existsSync(vmenuPath)) {
        console.log(`Found vMenu config at: ${vmenuPath}`);
        return vmenuPath;
    }
    
    console.error('Error: vMenu config not found at: ' + vmenuPath);
    console.error('Please ensure vMenu is installed and has a valid addons.json file.');
    throw new Error('Required vMenu config not found');
}

// Add function to clean JSON data
function cleanJsonData(data) {
    // Remove comments (lines starting with ##)
    const cleanData = data.split('\n')
        .filter(line => !line.trim().startsWith('##'))
        .join('\n');
    
    // Remove trailing commas and clean up JSON
    return cleanData.replace(/,(\s*[}\]])/g, '$1');
}

// Update the vMenu vehicles loading function
function loadVMenuVehicles() {
    try {
        const configPath = findVMenuConfig();
        const rawData = fs.readFileSync(configPath, 'utf8');
        const cleanedData = cleanJsonData(rawData);
        const vmenuData = JSON.parse(cleanedData);
        
        if (vmenuData && vmenuData.vehicles) {
            // Filter out any empty strings or comment markers
            const validVehicles = vmenuData.vehicles.filter(v => 
                typeof v === 'string' && 
                v.trim() !== '' && 
                !v.startsWith('##')
            );
            console.log(`Loaded ${validVehicles.length} vehicles from vMenu config`);
            return validVehicles;
        }
        throw new Error('No vehicles found in vMenu config');
    } catch (error) {
        console.error('Failed to load vMenu vehicles:', error);
        throw error;
    }
}

// Remove getDefaultVehicleList function as it's no longer needed

let vehicleData = {};

// Add throttle for saves
let lastSave = 0;
const SAVE_THROTTLE = 5000; // Only save every 5 seconds

// Function to log vehicle spawn
function logVehicleSpawn(vehicleName) {
    if (!vehicleData[vehicleName]) {
        vehicleData[vehicleName] = { spawns: 0, usageTime: 0 };
    }
    vehicleData[vehicleName].spawns += 1;
    saveVehicleData();
}

// Update log vehicle usage to batch updates
let pendingUpdates = {};
let updateTimeout = null;
const UPDATE_DELAY = 5000; // Process updates every 5 seconds

function logVehicleUsage(vehicleName, usageTime) {
    if (!vehicleData[vehicleName]) {
        vehicleData[vehicleName] = { spawns: 0, usageTime: 0 };
    }
    
    // Accumulate time instead of saving immediately
    if (!pendingUpdates[vehicleName]) {
        pendingUpdates[vehicleName] = 0;
    }
    pendingUpdates[vehicleName] += usageTime;

    // Set timeout to process updates if not already set
    if (!updateTimeout) {
        updateTimeout = setTimeout(() => {
            processPendingUpdates();
        }, UPDATE_DELAY);
    }
}

function processPendingUpdates() {
    for (const [vehicleName, time] of Object.entries(pendingUpdates)) {
        vehicleData[vehicleName].usageTime += time;
    }
    
    pendingUpdates = {};
    updateTimeout = null;
    saveVehicleData();
}

// Function to get sorted vehicle data
function getSortedVehicleData() {
    return Object.entries(vehicleData)
        .sort((a, b) => {
            // First sort by number of spawns
            const spawnDiff = b[1].spawns - a[1].spawns;
            if (spawnDiff !== 0) return spawnDiff;
            // If spawns are equal, sort by usage time
            return b[1].usageTime - a[1].usageTime;
        })
        .map(([vehicleName, data]) => ({ vehicleName, ...data }));
}

// Function to save vehicle data to a file - update with throttling
function saveVehicleData() {
    try {
        const now = Date.now();
        if (now - lastSave < SAVE_THROTTLE) return; // Skip if too soon
        
        if (!resourcePath) {
            throw new Error('Resource path not available');
        }
        
        lastSave = now;
        const dataPath = path.join(resourcePath, 'vehicleData.json');
        fs.writeFileSync(dataPath, JSON.stringify(vehicleData, null, 2));
        
        // Only generate HTML report when explicitly requested or during hourly updates
        // Remove automatic HTML generation here
    } catch (error) {
        console.error('Failed to save vehicle data:', error);
    }
}

// Function to load vehicle data from a file - update with error handling
function loadVehicleData() {
    try {
        if (!resourcePath) {
            throw new Error('Resource path not available');
        }
        const dataPath = path.join(resourcePath, 'vehicleData.json');
        if (fs.existsSync(dataPath)) {
            vehicleData = JSON.parse(fs.readFileSync(dataPath));
            console.log('Vehicle data loaded successfully');
        }
    } catch (error) {
        console.error('Failed to load vehicle data:', error);
    }
}

// Function to format time
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
}

// Function to generate HTML report
function generateHTMLReport() {
    try {
        const sortedData = getSortedVehicleData();
        
        let content = 'Vehicle Usage Statistics\n\n';
        content += 'Vehicle Name | Times Spawned | Total Drive Time\n';
        content += '------------|---------------|----------------\n';
        
        if (sortedData.length > 0) {
            sortedData.forEach(v => {
                const formattedTime = formatTime(v.usageTime || 0);
                content += `${v.vehicleName} | ${v.spawns || 0} | ${formattedTime}\n`;
            });
        } else {
            content += 'No vehicle data recorded yet\n';
        }

        const htmlPath = path.join(resourcePath, 'stats.html');
        fs.writeFileSync(htmlPath, content);
        console.log(`Simple stats report generated at: ${htmlPath}`);
    } catch (error) {
        console.error('Failed to generate stats report:', error);
    }
}

// Register network event handlers
onNet('vehdatascience:vehicleSpawned', (vehicleName) => {
    logVehicleSpawn(vehicleName);
});

onNet('vehdatascience:vehicleUsed', (vehicleName, usageTime) => {
    logVehicleUsage(vehicleName, usageTime);
});

// Update the command handler to use NUI
onNet('vehdatascience:requestStats', () => {
    const source = global.source;
    try {
        const sortedData = getSortedVehicleData();
        const statsForNui = sortedData.map(v => ({
            vehicleName: v.vehicleName,
            spawns: v.spawns || 0,
            formattedTime: formatTime(v.usageTime || 0)
        }));
        
        emitNet('vehdatascience:receiveStats', source, statsForNui);
        console.log('Vehicle stats sent to client');
    } catch (error) {
        console.error('Error preparing stats for NUI:', error);
    }
});

// Register command to show stats in chat
RegisterCommand('vehiclestats', (source, args) => {
    try {
        const sortedData = getSortedVehicleData();
        const top10 = sortedData.slice(0, 10);
        
        emitNet('chat:addMessage', source, {
            args: ['Vehicle Statistics - Top 10']
        });

        if (top10.length === 0) {
            emitNet('chat:addMessage', source, {
                args: ['No vehicle data recorded yet']
            });
            return;
        }

        top10.forEach(vehicle => {
            const spawns = vehicle.spawns || 0;
            const usageTime = vehicle.usageTime || 0;
            
            emitNet('chat:addMessage', source, {
                args: [`${vehicle.vehicleName}: Spawns: ${spawns}, Usage: ${usageTime.toFixed(2)}s`]
            });
        });

        generateHTMLReport();
        console.log('Vehicle stats command executed successfully');
    } catch (error) {
        console.error('Error in vehiclestats command:', error);
        emitNet('chat:addMessage', source, {
            args: ['Error retrieving vehicle statistics']
        });
    }
}, false);

// Add reset function
// Update reset function to notify clients
function resetVehicleData() {
    vehicleData = {};
    saveVehicleData();
    emitNet('vehdatascience:resetStats', -1); // -1 sends to all clients
    console.log('Vehicle statistics have been reset');
}

// Add reset command
RegisterCommand('vehiclestatsreset', (source, args) => {
    try {
        // Only allow server console and admins to reset stats
        if (source === 0) { // Console
            resetVehicleData();
            console.log('Vehicle statistics reset by console');
        } else {
            // Check if player is admin (you may want to modify this based on your permission system)
            if (IsPlayerAceAllowed(source.toString(), 'command.vehiclestatsreset')) {
                resetVehicleData();
                emitNet('chat:addMessage', source, {
                    args: ['Vehicle statistics have been reset']
                });
                console.log(`Vehicle statistics reset by player ID: ${source}`);
            } else {
                emitNet('chat:addMessage', source, {
                    args: ['You do not have permission to reset vehicle statistics']
                });
            }
        }
    } catch (error) {
        console.error('Error in vehiclestatsreset command:', error);
        if (source !== 0) {
            emitNet('chat:addMessage', source, {
                args: ['Error resetting vehicle statistics']
            });
        }
    }
}, true); // restricted - only available to players with proper permissions

// Load vehicle data on startup
loadVehicleData();
generateHTMLReport(); // Generate HTML on startup

// Create stats.html if it doesn't exist
if (!fs.existsSync(path.join(resourcePath, 'stats.html'))) {
    generateHTMLReport();
}

// Add console confirmation
console.log('Vehicle Data Science Plugin loaded. Stats available at stats.html');

// Add hourly stats generation
const HOUR_IN_MS = 60 * 60 * 1000;

function generateHourlyStats() {
    try {
        const sortedData = getSortedVehicleData();
        generateHTMLReport();
        console.log('Hourly vehicle stats generated automatically');
        
        // Schedule next update in 1 hour
        setTimeout(generateHourlyStats, HOUR_IN_MS);
    } catch (error) {
        console.error('Error in hourly stats generation:', error);
        // If there's an error, try again in 1 hour
        setTimeout(generateHourlyStats, HOUR_IN_MS);
    }
}

// Start the hourly updates
setTimeout(generateHourlyStats, HOUR_IN_MS);
console.log('Automatic hourly stats generation enabled');

// Replace config.json loading with vMenu config
const vehicles = loadVMenuVehicles();
console.log(`Loaded ${vehicles.length} vehicles ${vehicles.length > 0 ? 'from config' : 'using defaults'}`);

// Export functions for use in other scripts
module.exports = {
    logVehicleSpawn,
    logVehicleUsage,
    getSortedVehicleData,
    saveVehicleData
};
