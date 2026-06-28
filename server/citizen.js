on('playerConnecting', () => {
    const src = source;
    const fullId = GetPlayerIdentifierByType(String(src), 'discord');
    if (fullId) {
        emit('topv:playerConnected', fullId.slice(8), src);
    }
});

on('playerDropped', () => {
    emit('topv:playerDropped', source);
});

RegisterCommand('vote-claim', (src) => {
    if (src === 0) return;
    const fullId = GetPlayerIdentifierByType(String(src), 'discord');
    const discordId = fullId ? fullId.slice(8) : null;
    emit('topv:claimReward', src, discordId);
}, false);

RegisterCommand('vote-count', (src) => {
    if (src === 0) return;
    const fullId = GetPlayerIdentifierByType(String(src), 'discord');
    const discordId = fullId ? fullId.slice(8) : null;
    emit('topv:checkVotes', src, discordId);
}, false);

function getPlayer(src) {
    const esx = exports['es_extended'];
    if (esx && esx.getSharedObject) {
        const player = esx.getSharedObject().GetPlayerFromId(src);
        if (player) return { type: 'esx', source: src, player };
    }
    const qb = exports['qb-core'];
    if (qb && qb.GetCoreObject) {
        const player = qb.GetCoreObject().GetPlayer(src);
        if (player) return { type: 'qbcore', source: src, player };
    }
    const vrp = exports['vRP'];
    if (vrp && vrp.getUserId) {
        return { type: 'vrp', source: src, player: vrp };
    }
    return { type: 'standalone', source: src, player: null };
}

function addMoney(ctx, amount) {
    switch (ctx.type) {
        case 'esx': ctx.player.addMoney(amount); break;
        case 'qbcore': ctx.player.Functions.AddMoney('cash', amount, 'topv-reward'); break;
        case 'vrp': ctx.player.giveMoney({ src: ctx.source }, amount); break;
    }
}

function addBank(ctx, amount) {
    switch (ctx.type) {
        case 'esx':
            if (ctx.player.addBank) ctx.player.addBank(amount);
            else ctx.player.addAccountMoney('bank', amount);
            break;
        case 'qbcore': ctx.player.Functions.AddMoney('bank', amount, 'topv-reward'); break;
    }
}

function addBlackMoney(ctx, amount) {
    switch (ctx.type) {
        case 'esx': ctx.player.addAccountMoney('black_money', amount); break;
        case 'qbcore': ctx.player.Functions.AddMoney('black_money', amount, 'topv-reward'); break;
    }
}

function addItem(ctx, name, amount) {
    switch (ctx.type) {
        case 'esx': ctx.player.addInventoryItem(name, amount); break;
        case 'qbcore': ctx.player.Functions.AddItem(name, amount); break;
        case 'vrp': ctx.player.giveInventoryItem({ src: ctx.source }, name, amount); break;
    }
}

on('topv:giveRewards', (src, count = 1) => {
    const ctx = getPlayer(src);
    if (!ctx.player) {
        console.log('^1[topv-votes] Framework non supporte ou joueur introuvable (src: ' + src + ')');
        return;
    }
    const config = JSON.parse(LoadResourceFile(GetCurrentResourceName(), 'config.json'));
    for (const reward of config.rewards) {
        const amount = reward.amount * count;
        switch (reward.type) {
            case 'money': addMoney(ctx, amount); break;
            case 'bank': addBank(ctx, amount); break;
            case 'black_money': addBlackMoney(ctx, amount); break;
            case 'item': addItem(ctx, reward.name, amount); break;
        }
    }
});
