fx_version 'cerulean'
game 'gta5'

name 'TopV Votes Reward'
description 'TopV votes reward system'
author 'Retroz'
version '1.0.0'

shared_scripts {
    '@ox_lib/init.lua',
}

server_scripts {
    'server/citizen.js',
    'server/main.js',
}

client_scripts {
    'client/client.js',
}

files {
    'config.json',
    'locales/*.json',
}

dependencies {
    'oxmysql',
    'ox_lib',
}
