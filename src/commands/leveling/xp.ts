import Embeds from '../../util/embeds.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import * as Discord from 'discord.js';
import logger from '../../util/logger.js';
import LevelManager from '../../LevelManager.js';
import config from '../../config/config.js';

export const global = false;
export async function execute(interaction: Discord.CommandInteraction, client: Discord.Client, ...args: any[]) {
    const leveling = args[0] as LevelManager;
    const command = interaction.options.getSubcommand(true);
    if (command == 'give') {
        const user = interaction.options.getUser('user', true);
        if (user.bot) {
            await interaction.reply({ embeds: [
                Embeds.dumbass(`Bots can't have experience, dummy :neutral_face:`)
            ]});
        } else {
            await leveling.addExperience(user.id, interaction.options.getInteger('amount', true));
            const { lvl, xp } = leveling.getRank(user.id);
            await interaction.reply({ embeds: [
                Embeds.success(`** ${user.tag}** is now level **${lvl}** with **${xp}** experience.`).setTitle('**Success!**')
            ]});
        }
    } else if (command == 'get') {
        const user = interaction.options.getUser('user', true);
        if (user.bot) {
            await interaction.reply({ embeds: [
                Embeds.dumbass(`Bots can't have experience, dummy :neutral_face:`)
            ]});
        } else {
            interaction.reply(`${user.tag}'s total XP is ${leveling.getExperience(user.id)}`);
        }
    } else if (command == 'rate') {
        if (interaction.options.get('rate', true)) {
            const rate = interaction.options.getInteger('rate', true);
            if (rate < 0 || rate > 100) {
                await interaction.reply({ embeds: [
                    Embeds.dumbass('XP rate cannot be smaller than 0 or greater than 100. Please give a value in the mentioned range.')
                ]});
            } else {
                await config.set('leveling.rate', rate);
                await interaction.reply({ embeds: [
                    Embeds.success(`Successfully changed the XP rate to **${rate} XP.**`)
                ]});
            }
        } else {
            const cooldown = (await config.get('leveling.cooldown')) ?? 60;
            const unit = (cooldown == 60) ? 'per minute'
                    : ('every ' + ((cooldown < 60) ? String(cooldown) + ((cooldown == 1) ? ' second' : ' seconds') // 'every x second(s)'
                    : ((Math.floor(cooldown/60) == 1) ? 'minute' : Math.floor(cooldown/60) + ' minutes') // 'every x minute(s)...
                    + ((cooldown%60 != 0) ? ' and ' + cooldown%60 + ((cooldown%60 == 1) ? ' second' : ' seconds'): ''))); // ...and x second(s)
            await interaction.reply({ embeds: [
                Embeds.info(`The current XP rate is **${(await config.get('leveling.rate') ?? 50)} experience ${unit}**`)
            ]});
        }
    } else {
        const subcommand = interaction.options.getSubcommandGroup(true);
        if (subcommand == 'blacklist') {
            if (command == 'list') {
                const channels = await config.get('leveling.blacklisted_channels') ?? [];
                if (channels.length == 0) {
                    await interaction.reply({ embeds: [
                        Embeds.dumbass('There are no blacklisted channels.')
                    ]});
                } else {
                    let list = '';
                    for (let c of channels) {
                        list += `\n<#${c}>`;
                    }
                    await interaction.reply({ embeds: [
                        Embeds.info(list).setTitle('Blacklisted Channels').setFooter('use /xp blacklist [add|remove] to edit this list')
                    ]});
                }
            } else if (command == 'add') {
                const channel = interaction.options.getChannel('channel', true);
                const blacklistedChannels = (await config.get('leveling.blacklisted_channels') as string[] | undefined) ?? [];
                if (blacklistedChannels.includes(channel.id)) {
                    await interaction.reply({ embeds: [
                        Embeds.dumbass(`${channel} is already on the blacklist!`)
                    ]});
                } else {
                    if (channel.type != "GUILD_TEXT") {
                        await interaction.reply({ embeds: [
                            Embeds.dumbass(`${channel} is not a text channel!`)
                        ]});
                    } else {
                        blacklistedChannels.push(channel.id);
                        await config.set('leveling.blacklisted_channels', blacklistedChannels);
                        await interaction.reply({ embeds: [
                            Embeds.success(`Successfully added ${channel} to the blacklist`)
                        ]});
                    }
                }
            } else if (command == 'remove') {
                const channel = interaction.options.getChannel('channel', true);
                const blacklistedChannels = (await config.get('leveling.blacklisted_channels') as string[] | undefined) ?? [];
                if (blacklistedChannels.includes(channel.id)) {
                    const index = blacklistedChannels.indexOf(channel.id) as number;
                    blacklistedChannels.splice(index, 1);
                    await config.set('leveling.blacklisted_channels', blacklistedChannels);
                    await interaction.reply({ embeds: [
                        Embeds.success(`Successfully removed <#${channel}> from the blacklist`)
                    ]});
                } else {
                    await interaction.reply({ embeds: [
                        Embeds.dumbass(`<#${channel}> is not on the blacklist!`)
                    ]});
                }
            }
        }
    }
}

export const data = new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Change XP preferences and values.')
    .setDefaultPermission(false)
    .addSubcommand(command => 
        command.setName('give')
        .setDescription('Give XP to a user')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('User to give XP to.')
            .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('Amount of XP to give.')
            .setRequired(true)))
    .addSubcommand(command =>
        command.setName('get')
        .setDescription('Gets the XP of a user.')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('The user\'s XP to get.')
            .setRequired(true)))
    .addSubcommand(command =>
        command.setName('rate')
        .setDescription('Get or set the rate at which users gain XP.')
        .addIntegerOption(option =>
            option.setName('rate')
            .setDescription('The new XP rate, a random value between 2/3 and 4/3 will be given.')))
    .addSubcommandGroup(group =>
        group.setName('blacklist')
        .setDescription('List or change channels that do not award XP.')
        .addSubcommand(command =>
            command.setName('add')
            .setDescription('Add a channel to the blacklist.')
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('The channel to add to the blacklist.')
                .setRequired(true)))
        .addSubcommand(command => 
            command.setName('remove')
            .setDescription('Remove a channel from the whitelist.')
            .addChannelOption(option =>
                option.setName('channel')
                .setDescription('The channel to remove from the blacklist.')
                .setRequired(true)))
        .addSubcommand(command =>
            command.setName('list')
            .setDescription('List all blacklisted channels.')))

// module.exports = {
//     name: 'xp',
//     async execute(interaction, client) {
//         const leveling = client.leveling;
//         const command = interaction.options.getSubcommandGroup(false) ?? interaction.options.getSubcommand(true);
//         // Just in case we need it
//         let user = interaction.options?.get('user')?.value;
//         if (command == 'give') {
//             user = client.users.cache.get(user);
//             if (user.bot) {
//                 await interaction.reply({ embeds: [
//                     Embeds.dumbass(`Bots can't have experience, dummy :neutral_face:`)
//                 ]});
//             } else {
//                 await leveling.addExperience(user.id, interaction.options.get('amount').value);
//                 let { lvl, xp } = leveling.getRank(user.id);
//                 await interaction.reply({ embeds: [
//                     Embeds.success(`** ${user.tag}** is now level **${lvl}** with **${xp}** experience.`).setTitle('**Success!**')
//                 ]});
//             }
//         } else if (command == 'get') {
//             user = client.users.cache.get(user);
//             await interaction.reply(`${user.tag}'s total XP is ${leveling.getExperience(user.id)}`); 
//         } else if (command == 'rate') {
//             if (interaction.options.get('rate')) {
//                 let rate = interaction.options.get('rate').value;
//                 if (rate < 0 || rate > 100) {
//                     await interaction.reply({ embeds: [
//                         Embeds.dumbass('XP rate cannot be smaller than 0 or greater than 100. Please give a value in the mentioned range.')
//                     ] });
//                 } else {
//                     config.leveling.rate.value = rate;
//                     // eslint-disable-next-line no-undef
//                     fs.writeFileSync(`${__dirname}/../../config/config.json`, JSON.stringify(config, null, 4));
//                     await interaction.reply({ embeds: [
//                         Embeds.success(`Successfully changed the XP rate to **${rate} XP.**`)
//                     ]});
//                 }
//             } else {
//                 let cooldown = config.leveling.cooldown.value;
//                 // I hate the english language
//                 let unit = (cooldown == 60) ? 'per minute'
//                     : ('every ' + ((cooldown < 60) ? String(cooldown) + ((cooldown == 1) ? ' second' : ' seconds') // 'every x second(s)'
//                     : ((Math.floor(cooldown/60) == 1) ? 'minute' : Math.floor(cooldown/60) + ' minutes') // 'every x minute(s)...
//                     + ((cooldown%60 != 0) ? ' and ' + cooldown%60 + ((cooldown%60 == 1) ? ' second' : ' seconds'): ''))); // ...and x second(s)
//                 await interaction.reply({ embeds: [
//                     Embeds.info(`The current XP rate is **${config.leveling.rate.value} experience ${unit}**`)
//                 ] });
//             }
//         } else {
//             const subcommand = interaction.options.getSubcommand(true);
//             if (command == 'blacklist') {
//                 if (subcommand == 'list') {
//                     if (!config.leveling.blacklistedChannels.value.length) {
//                         await interaction.reply({ embeds: [
//                             Embeds.dumbass('There are no blacklisted channels.')
//                         ]});
//                     } else {
//                         let list = '';
//                         for (let c of config.leveling.blacklistedChannels.value) {
//                             list += `\n<#${c}>`;
//                         }
//                         await interaction.reply({ embeds: [
//                             Embeds.info(list).setTitle('Blacklisted Channels').setFooter('use /xp blacklist [add|remove] to edit this list')
//                         ]});
//                     }
//                 } else if (subcommand == 'add') {
//                     let channel = interaction.options.get('channel').value;
//                     if (config.leveling.blacklistedChannels.value.includes(channel)) {
//                         await interaction.reply({ embeds: [
//                             Embeds.dumbass(`<#${channel}> is already on the blacklist!`)
//                         ]});
//                     } else {
//                         let chnnl = interaction.guild.channels.cache.get(channel);
//                         if (chnnl.type != "GUILD_TEXT") {
//                             await interaction.reply({ embeds: [
//                                 Embeds.dumbass(`<#${channel}> is not a text channel!`)
//                             ]});
//                         } else {
//                             config.leveling.blacklistedChannels.value.push(String(channel));
//                             // eslint-disable-next-line no-undef
//                             fs.writeFileSync(`${__dirname}/../../config/config.json`, JSON.stringify(config, null, 4));
//                             await interaction.reply({ embeds: [
//                                 Embeds.success(`Successfully added <#${channel}> to the blacklist`)
//                             ]});
//                         }
//                     }
//                 } else if (subcommand == 'remove') {
//                     let channel = interaction.options.get('channel').value;
//                     if (config.leveling.blacklistedChannels.value.includes(channel)) {
//                         let index = config.leveling.blacklistedChannels.value.indexOf(channel);
//                         config.leveling.blacklistedChannels.value.splice(index, 1);
//                         // eslint-disable-next-line no-undef
//                         fs.writeFileSync(`${__dirname}/../../config/config.json`, JSON.stringify(config, null, 4));
//                         await interaction.reply({ embeds: [
//                             Embeds.success(`Successfully removed <#${channel}> from the blacklist`)
//                         ]});
//                     } else {
//                         await interaction.reply({ embeds: [
//                             Embeds.dumbass(`<#${channel}> is not on the blacklist!`)
//                         ]});
//                     }
//                 }
//             }
//         }
//     }
// };