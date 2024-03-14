import * as Discord from 'discord.js';
import { dbUsers } from './database/objects.js';
import { LeveledUser } from './database/models/users.js'
import config from './config/config.js';
import logger from './util/logger.js';
import { UniqueConstraintError } from 'sequelize';

export const XP_FUNC = (lvl: number) => 5 * (lvl**2) + (50 * lvl) + 100;
export const getTotalLevelXP: any = (lvl: number) => {
    return lvl==0 ? 0 : XP_FUNC(lvl-1) + getTotalLevelXP(lvl-1)
};

class LevelManager {
    users: Discord.Collection<string, LeveledUser>;
    client: Discord.Client;

    constructor(client: Discord.Client) {
        this.client = client;
        this.users = new Discord.Collection();
        // sync local cache with database
        dbUsers.findAll().then(users => {
            users.forEach(u => this.users.set(u.user_id, u));
        });
    }

    async addExperience(id: string, amount: number) {
        amount = Math.round(amount);
        const user = this.users.get(id);
        if (user) {
            user.xp += Number(amount);
            if (user.xp < 0) user.xp = 0;
            const newLvl = this.getLevelAtXP(user.xp);
            const guild = this.client.guilds.cache.get(process.env.GUILD as string) as Discord.Guild;
            if (user.lvl != newLvl) {
                const levelingRoles: { lvl: number, role: string }[] = (await config.get('leveling.roles')) ?? [];
                const roles = new Discord.Collection<number, string>();
                for (const role of levelingRoles) {
                    roles.set(role.lvl, role.role);
                }
                let msg = '';
                const locationID = await config.get('leveling.location');
                const location = guild.channels.cache.get(locationID) as Discord.TextChannel;
                if (location && user.lvl < newLvl) {
                    // let location = guild.channels.cache.get(config.leveling.location.value);
                    // if (location) location.send(`<@${id}> leveled up to level ${newLvl}!`);
                    const levelingMessage = await config.get('leveling.message') ?? '${user} leveled up!';
                    msg += levelingMessage.replaceAll(/\${user}/g, `<@${id}>`).replaceAll(/\${level}/g, newLvl);
                }
                // if (roles.findKey((role, lvl) => lvl == newLvl)) {
                if (roles.get(newLvl)) {
                    // let location = guild.channels.cache.get(config.leveling.location.value);
                    // if (location) location.send(`New role: **${guild.roles.cache.get(roles.get(newLvl)).name}**`);
                    const newRole = guild.roles.cache.get(roles.get(newLvl) as string);
                    msg += `\nNew role: **@${newRole?.name}**`;
                }
                if (location && msg) location.send(msg);
                user.lvl = newLvl;
                if (!roles.size) return;
                // If roles stack apply all roles up to the level
                const member = guild.members.cache.get(id) as Discord.GuildMember;
                if (await config.get('leveling.stack_roles')) {
                    const [lower, higher] = roles.partition((role, lvl) => lvl <= newLvl);
                    if (lower.size) {
                        for (const role of lower.values()) {
                            member.roles.add(role);
                        }
                    }
                    if (higher.size) {
                        for (const role of higher.values()) {
                            member.roles.remove(role);
                        }
                    }
                } else {
                    const lower = roles.filter((role, lvl) => lvl < newLvl);
                    if (lower.size) {
                        for (const role of lower.values()) {
                            member.roles.remove(role);
                        }
                    }
                    member.roles.add(
                        roles.get(roles.reduce((acc, role, lvl) => {
                            acc = (lvl > acc && lvl <= newLvl) ? lvl : acc;
                            return acc;
                        }, 0)) as string
                    );
                }
            }
            const out = await user.save();
            return out;
        }
        if (amount < 0) amount = 0;
        let newUser = null;
        try {
            newUser = await dbUsers.create({ user_id: id, xp: amount, lvl: this.getLevelAtXP(amount) });
            this.users.set(id, newUser);
        } catch (err) {
            logger.error('There was an error creating a new user');
            logger.debug(err);
            logger.debug(user);
        }
        return newUser;
    }

    getExperience(id: string) {
        const user = this.users.get(id);
        return user ? user.xp : 0;
    }

    async setTimestamp(id: string, timestamp: number) {
        const user = this.users.get(id);
        if (user) {
            user.lastMessageTimestamp = timestamp;
            return user.save();
        }
        return await dbUsers.create({ user_id: id, xp: 0, lvl: 0, lastMessageTimestamp: timestamp });
    }

    getTimestamp(id: string) {
        const user = this.users.get(id);
        return user ? user.lastMessageTimestamp ?? 0 : null;
    }

    async addLevel(id: string, levels: number) {
        const currentLevel = this.getLevel(id);
        let sum = 0;
        for (let i = currentLevel; i < currentLevel+levels; i++) {
            sum += XP_FUNC(i);
        }
        const result = await this.addExperience(id, sum);
        return result;
    }

    getLevel(id: string) {
        const user = this.users.get(id);
        return user ? user.lvl : 0;
    }

    getLevelAtXP(xp: number) {
        let i = 0;
        for (; getTotalLevelXP(i) <= xp; i++);
        return i-1;
    }

    getRank(id: string) {
        const level = this.getLevel(id);
        const xp = this.getExperience(id);
        const remainder = xp - getTotalLevelXP(level);
        const rank = Array.from(this.users.sort((a, b) => b.xp - a.xp)
            .filter(user => this.client.users.cache.has(user.user_id)).keys()
            ).indexOf(id)+1;
        return { lvl: level, xp: remainder, position: rank };
    }

    async resetAll() {
        this.users = new Discord.Collection();
        const total = await dbUsers.destroy({ where: {}, force: true });
        return total;
    }

    async resetUser(id: string) {
        const user = this.users.get(id);
        if (user) {
            user.xp = 0;
            user.lvl = this.getLevelAtXP(user.xp);
            return user.save();
        }
        return;
    }

    async processMessage(msg: Discord.Message) {
        if (msg.type != 'DEFAULT') return;
        if (msg.author.bot) return;
        if (msg.channel.type != 'GUILD_TEXT') return;
        if (this.getTimestamp(msg.author.id) != null) {
            const lastMessage = this.getTimestamp(msg.author.id) as number;
            const rate = (await config.get('leveling.rate')) ?? 50;
            const cooldown = ((await config.get('leveling.cooldown')) ?? 60)*1000;
            const blacklistedChannels = (await config.get('leveling.blacklisted_channels')) ?? [];
            if ((Math.floor(msg.createdTimestamp / cooldown) > Math.floor(lastMessage / cooldown) || cooldown == 0) && !blacklistedChannels.includes(msg.channel.id)) {
                await this.addExperience(msg.author.id, Math.random() * rate*2/3 + rate*2/3);
            }
        }
        await this.setTimestamp(msg.author.id, msg.createdTimestamp);
    }
}

export default LevelManager;