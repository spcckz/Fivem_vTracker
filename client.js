// File: client.js

let startTimes = new Map();
let trackedVehicles = new Set();

// Helper function to get vehicle name
function getVehicleName(vehicle) {
    const model = GetEntityModel(vehicle);
    return GetDisplayNameFromVehicleModel(model).toLowerCase();
}

// Helper function to check if player is driver
function isDriver(vehicle) {
    const player = PlayerPedId();
    return GetPedInVehicleSeat(vehicle, -1) === player; // -1 is driver seat
}

// Helper function to start tracking
function startTracking(vehicle) {
    if (!isDriver(vehicle)) return;
    
    const vehicleName = getVehicleName(vehicle);
    emitNet('vehdatascience:validateVehicle', vehicleName, (isValid) => {
        if (isValid) {
            if (!trackedVehicles.has(vehicle)) {
                trackedVehicles.add(vehicle);
                emitNet('vehdatascience:vehicleSpawned', vehicleName);
            }
            emitNet('vehdatascience:startVehicleSession', vehicleName, NetworkGetNetworkIdFromEntity(vehicle));
            startTimes.set(vehicle, GetGameTimer());
            console.log(`Started/Resumed tracking ${vehicleName}`);
        }
    });
}

// Helper function to stop tracking and save time
function stopTracking(vehicle) {
    if (startTimes.has(vehicle) && isDriver(vehicle)) {
        emitNet('vehdatascience:endVehicleSession');
        startTimes.delete(vehicle);
    }
}

// Track when player enters vehicle
on('gameEventTriggered', (name, args) => {
    if (name === 'CEventNetworkPlayerEnteredVehicle') {
        const [playerId, vehicle] = args;
        startTracking(vehicle);
        const vehicleName = getVehicleName(vehicle);
        SendNuiMessage(JSON.stringify({
            type: 'updateSession',
            vehicleName: vehicleName
        }));
    }
});

// Track when player exits vehicle
on('gameEventTriggered', (name, args) => {
    if (name === 'CEventNetworkPlayerLeftVehicle') {
        const [playerId, vehicle] = args;
        stopTracking(vehicle);
    }
});

// Track when vehicle is deleted
on('entityRemoved', (entity) => {
    if (IsEntityAVehicle(entity)) {
        stopTracking(entity);
        trackedVehicles.delete(entity);
    }
});

// Add reset event handler
onNet('vehdatascience:resetStats', () => {
    startTimes.clear();
    trackedVehicles.clear();
    SendNuiMessage(JSON.stringify({
        type: 'resetSession'
    }));
});

// Periodic check to ensure tracking continues and catch any missed events
setInterval(() => {
    const player = PlayerPedId();
    if (IsPedInAnyVehicle(player, false)) {
        const vehicle = GetVehiclePedIsIn(player, false);
        if (!isDriver(vehicle)) return; // Only track if player is driver
        
        if (!startTimes.has(vehicle)) {
            startTracking(vehicle);
        } else {
            // Update usage time every minute to prevent loss of data
            const vehicleName = getVehicleName(vehicle);
            emitNet('vehdatascience:vehicleUsed', vehicleName, 60);
        }
    }
}, 60000); // Check every minute

// Additional check for active vehicles every second (for immediate feedback)
setInterval(() => {
    const player = PlayerPedId();
    if (IsPedInAnyVehicle(player, false)) {
        const vehicle = GetVehiclePedIsIn(player, false);
        if (!isDriver(vehicle)) return; // Only track if player is driver
        
        const vehicleName = getVehicleName(vehicle);
        emitNet('vehdatascience:vehicleUsed', vehicleName, 1);
    }
}, 1000);

// Add NUI callback
RegisterNuiCallback('closeStats', (data, cb) => {
    SetNuiFocus(false, false);
    cb({});
});

// Add command handler for stats GUI
RegisterCommand('vehiclestats', (source, args) => {
    emitNet('vehdatascience:requestStats');
}, false);

// Update the stats listener to handle new data structure
onNet('vehdatascience:receiveStats', (data) => {
    const player = PlayerPedId();
    if (IsPedInAnyVehicle(player, false)) {
        const vehicle = GetVehiclePedIsIn(player, false);
        const vehicleName = getVehicleName(vehicle);
        const startTime = startTimes.get(vehicle);
        const currentSession = startTime ? (GetGameTimer() - startTime) / 1000 : 0;
        
        // Add current session info to stats
        data.stats = data.stats.map(stat => ({
            ...stat,
            isActive: stat.vehicleName === vehicleName,
            currentSession
        }));
    }
    
    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
        type: 'showStats',
        stats: data.stats,
        allVehicles: data.allVehicles
    }));
});
