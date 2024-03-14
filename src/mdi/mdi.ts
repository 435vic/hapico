import * as Discord from 'discord.js';
import config from '../config/config.js';
import rest from './api.js';
import { io, Socket } from 'socket.io-client';
import { readFileSync } from 'fs';
import logger from '../util/logger.js';

const USER_MENTION = /@([^@]*#\d{4})/;
const DISCORD_MENTION = /<@\S(\d+)>/;

const hook = new Discord.WebhookClient({ id: process.env.WEBHOOK_ID as string, token: process.env.WEBHOOK_TOKEN as string });
const HEADS_URL = 'https://www.mc-heads.net/head/@/500.png';
const dm_embed = {
    color: 0xFFA600,
    description: '[message]',
    author : {
        name: '[player]',
        icon_url: ''
    }
};

export default class MDIBridge {
    client: Discord.Client;
    socket: Socket;
    online_message: Discord.Message | undefined;
    playerListTask: NodeJS.Timer | undefined;

    constructor(port: number, ip: string, client: Discord.Client) {
        this.client = client;
        config.get('mdi.players_online_message').then(async (msg: Discord.Message) => {
            if (msg) {
                const channel = await client.channels.cache.get(msg.channelId) as Discord.TextBasedChannel;
                msg = await channel?.messages.fetch(msg.id);
                this.online_message = msg;
                this.registerEvents();
            }
        });
        this.socket = io(`wss://${ip}:${port}`, { 
            ca: readFileSync(process.env.SSL_CA_CERT as string).toString(),
        });
        this.socket.on('connect', () => {
            logger.info(`successfully connected to ${ip}:${port} (id: ${this.socket.id})`);
            this.updateStatusChannels();
        });
        this.socket.on('connect_error', (error) => {
            logger.error(`there was an error while connecting to ${ip}:${port} (${error})`);
        });
        this.socket.on('disconnect', (reason) => {
            logger.warn(`socket disconnected (${reason})`);
            if (reason == 'io server disconnect') {
                setTimeout(() => { 
                    logger.warn('kicked from server, attempting to reconnect...');
                    this.socket.connect();
                }, 5000)
            }
            this.updateStatusChannels();
        });
        

        this.playerListTask = setInterval(async () => {
            try {
                let res = await rest.api.players.get() as Response;
                let message = '';
                const players = (res.status == 200) ? await res.json() : [];
                if (!res.ok) return;
                if (res.status == 204) {
                    message = 'There is no one online!';
                } else if (res.status == 200) {
                    message = (players.length == 1) ? 'There is 1 player online.' : `There are ${players.length} players online.`
                    for (let p of players) {
                        message += '\n🟢 ' + p;
                    }
                }
                const playerCountChannelId = (await config.get('mdi.player_channel'));
                if (playerCountChannelId) {
                    const channel = await this.online_message?.guild?.channels.fetch(playerCountChannelId);
                    const title = `Players: ${players.length}`;
                    if (channel && channel?.name != title) {
                        channel.setName(title);
                    }
                }
                if (this.online_message) {
                    if (this.online_message.content != message) {
                        this.online_message.edit(message);
                    }
                }
                this.updateStatusChannels();
            } catch (error) {
                logger.error(`error fetching player list: ${(error as Error).name}`);
                logger.debug(error);
                return;
            }
        }, 7000);
    }

    sendChat(message: Discord.Message) {
        const out = message.content.replace(DISCORD_MENTION, (_match, id) => {
            let member = this.client.users.cache.get(id);
            return '@' + member?.tag ?? '<unknown>';
        });

        rest.api.chat.post({ author: message.author.username, content: out });
    }

    async updateStatusChannels() {
        const serverStatusChannelId = (await config.get('mdi.status_channel'));
        if (serverStatusChannelId) {
            const channel = await this.online_message?.guild?.channels.fetch(serverStatusChannelId);
            const title = (this.socket.disconnected) ? '🔴 Server Offline' : '🟢 Server Online';
            if (channel && channel?.name != title) {
                channel.setName(title);
            }
        }
    }

    registerEvents() {
        this.socket.on('chat', (player, message) => {
            // discord chat
            // tried to replace it with escaped at, but for some reason it still mentions even though the text isn't blue
            message = message.replace('@everyone', '[at]everyone');
            message = message.replace('@here', '[at]here');
            let pfp = this.getPfp(player);

            let mention = message.match(USER_MENTION);
            if (mention != null) {
                mention = mention[1];
                const user = this.client.users.cache.find(u => u.tag === mention);
                if (user) {
                    message = message.replace(USER_MENTION, user.toString());
                    hook.send({
                        content: message,
                        username: player,
                        avatarURL: pfp
                    });
                }
            } else {
                hook.send({
                    content: message,
                    username: player,
                    avatarURL: pfp,
                });
            }
        });
        this.socket.on('player join', player => {
            hook.send({
                content: `**${player} joined the game**`,
                username: 'Server',
                avatarURL: this.getPfp('Server')
            });
        });
        this.socket.on('player quit', player => {
            hook.send({
                content: `**${player} left the game**`,
                username: 'Server',
                avatarURL: this.getPfp('Server')
            });
        });
        this.socket.on('player death', (player, message) => {
            hook.send({
                content: `**${message}**`,
                username: 'Server',
                avatarURL: this.getPfp('Server')
            });
        });
        // let callback = (...ignored) => {};
        this.socket.on('whisper', async (author, user, message, callback) => {
            const useTag = user.split(' ')[0] == 'tag';
            user = user.split(' ')[1];
            user = this.client.users.cache.find((useTag) ? m => m.tag === user : m => m.id === user);
            const member = await this.online_message?.guild?.members.fetch(user) as Discord.GuildMember;
            if (!user) callback({ status: 'user not found' });
            else if (!member.roles.cache.has(await config.get('mdi.chat_role'))) callback({ status: 'user not available' });
            else {
                const embed = dm_embed;
                embed.description = message;
                embed.author.name = author;
                embed.author.icon_url = this.getPfp(author);
                member.send({ embeds: [embed] });
                callback({
                    status: 'ok',
                    user: {
                        tag: user.tag,
                        id: user.id                    
                    }
                });
            }
        });
        // user list request
        this.socket.on('user list plz', async (callback) => {
            const chat_role = await config.get('mdi.chat_role')
            const guild = this.online_message?.guild;
            guild?.members.fetch().then(members => {
                let res = {
                    status: 'ok',
                    users: members.filter(m => m.roles.cache.has(chat_role))
                        .map(member => {
                            return {
                                tag: member.user.tag,
                                id: member.user.id
                            }
                        })
                }
                callback(res);
            }).catch(console.error);
        });

        this.socket.on('achievement', (player, achievement, description, type) => {
            logger.info(`${player}, ${achievement}, ${description}, ${type}`);
        });
    }

    getPfp(uname: string) {
        return (uname == 'Server') ? 'https://gamepedia.cursecdn.com/minecraft_gamepedia/7/76/Impulse_Command_Block.gif' : HEADS_URL.replace('@', uname);
    }
}
