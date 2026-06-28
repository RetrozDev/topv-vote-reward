const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { initLocale, locale } = require('@overextended/ox_lib/shared');

const config = JSON.parse(LoadResourceFile(GetCurrentResourceName(), 'config.json'));

function notify(player, key, type) {
    const args = [];
    for (let i = 3; i < arguments.length; i++) args.push(arguments[i]);
    emitNet('ox_lib:notify', player, { description: locale(key, ...args), type });
}

initLocale();

const connectedPlayers = new Map();

on('topv:playerConnected', (discordId, src) => {
    connectedPlayers.set(discordId, src);
});

on('topv:playerDropped', (src) => {
    for (const [discordId, s] of connectedPlayers) {
        if (s === src) { connectedPlayers.delete(discordId); break; }
    }
});

on('topv:claimReward', async (src, discordId) => {
    if (!discordId) {
        notify(src, 'no_discord', 'error');
        return;
    }
    try {
        const result = await global.exports.oxmysql.query_async(
            'SELECT votes FROM votes WHERE discord_id = ?', [discordId]
        );
        const votes = result[0]?.votes || 0;
        if (votes < config.votesPerReward) {
            notify(src, 'no_votes', 'error');
            return;
        }
        const claimCount = Math.floor(votes / config.votesPerReward);
        emit('topv:giveRewards', src, claimCount);
        await global.exports.oxmysql.query_async(
            'UPDATE votes SET votes = votes - ? WHERE discord_id = ?',
            [claimCount * config.votesPerReward, discordId]
        );
        notify(src, 'claimed', 'success', String(claimCount));
    } catch (err) {
        console.log('^1[topv-votes] DB Error: ' + err);
    }
});

on('topv:checkVotes', async (src, discordId) => {
    if (!discordId) {
        notify(src, 'no_discord', 'error');
        return;
    }
    try {
        const result = await global.exports.oxmysql.query_async(
            'SELECT votes FROM votes WHERE discord_id = ?', [discordId]
        );
        notify(src, 'votes_pending', 'inform', String(result[0]?.votes || 0));
    } catch (err) {
        console.log('^1[topv-votes] DB Error: ' + err);
    }
});

function discordWebhook(embed) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(embed);
        const url = new URL(config.discordWebhook);
        const req = https.request({
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        }, (res) => {
            let d = '';
            res.on('data', (c) => d += c);
            res.on('end', () => resolve(d));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

global.exports.oxmysql.query_async(
    'CREATE TABLE IF NOT EXISTS votes (discord_id VARCHAR(255) PRIMARY KEY, votes INT DEFAULT 0)'
).then(() => console.log('^2[topv-votes] Table votes prete'))
    .catch((err) => console.log('^1[topv-votes] DB init error: ' + err));

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => raw += chunk);
        req.on('end', () => resolve(raw));
        req.on('error', reject);
    });
}

function sendJson(res, code, data) {
    const body = JSON.stringify(data);
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.write(body);
    res.end();
}

const server = http.createServer(async (req, res) => {
    const method = req.method;
    const path = req.url.toLowerCase();

    if (method === 'GET' && path === '/api/health') {
        sendJson(res, 200, { status: 'ok', message: 'API FiveM running' });
        return;
    }

    if (method === 'POST' && path === '/api/topv-vote') {
        try {
            const rawBody = await parseBody(req);
            const signature = req.headers['x-topv-signature'];
            if (!signature) {
                sendJson(res, 401, { error: 'missing signature' });
                return;
            }

            const expected = 'sha256=' + crypto.createHmac('sha256', config.secret).update(rawBody).digest('hex');
            if (signature !== expected) {
                console.log('^3[topv-votes] Signature invalide');
                sendJson(res, 401, { error: 'invalid signature' });
                return;
            }

            const payload = JSON.parse(rawBody);
            if (!payload || payload.event !== 'vote.received') {
                sendJson(res, 400, { error: 'invalid event' });
                return;
            }
            if (!payload.voter.discordId) {
                sendJson(res, 400, { error: 'missing discordId' });
                return;
            }

            const discordId = payload.voter.discordId;
            console.log('^2[topv-votes] Vote recu de ' + payload.voter.displayName + ' (' + discordId + ')');

            if (config.discordWebhook) {
                discordWebhook({
                    username: config.discordBotName || 'TopV Votes',
                    avatar_url: config.discordBotAvatar || '',
                    embeds: [{
                        title: '🗳️ ' + locale('webhook_title'),
                        description: locale('webhook_desc', payload.voter.displayName, payload.profile.name),
                        color: 0x5865F2,
                        fields: [
                            { name: '👤 ' + locale('webhook_field_voter'), value: payload.voter.username,          inline: true },
                            { name: '🖥️ ' + locale('webhook_field_server'), value: payload.profile.name,            inline: true },
                            { name: '📊 ' + locale('webhook_field_total'), value: String(payload.vote.totalVotes), inline: true },
                        ],
                        footer: { text: 'TopV.gg' },
                        timestamp: new Date().toISOString(),
                    }],
                }).catch((err) => console.log('^1[topv-votes] Webhook error: ' + err));
            }

            await global.exports.oxmysql.query_async(
                'INSERT INTO votes (discord_id, votes) VALUES (?, 1) ON DUPLICATE KEY UPDATE votes = votes + 1',
                [discordId]
            );

            const player = connectedPlayers.get(discordId) ?? null;
            if (player) notify(player, 'vote_received', 'success');

            sendJson(res, 200, { status: 'ok' });
        } catch (err) {
            console.log('^1[topv-votes] Erreur: ' + err);
            sendJson(res, 500, { error: 'internal server error' });
        }
        return;
    }

    sendJson(res, 404, { error: 'not found' });
});

server.listen(config.port || 3001, () => {
    console.log('^2[topv-votes] API en ecoute sur le port ' + (config.port || 3001));
});
