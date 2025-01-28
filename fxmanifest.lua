-- File: fxmanifest.lua

fx_version 'cerulean'
game 'gta5'

author 'https://github.com/spcckz'
description 'Data Science Plugin for FiveM to log and analyze vehicle spawn and usage data'
version '1.0.0'

server_script 'dataSciencePlugin.js'
client_script 'client.js'

ui_page 'html/index.html'

files {
    'html/index.html',
    'vehicleData.json',
    'stats.html'
}
