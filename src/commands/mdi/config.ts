import * as Discord from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import config from '../../config/config.js';
import Embeds from '../../util/embeds.js';

// const baseStatsChannel = 

export const data = new SlashCommandBuilder()
    .setName('mdi')
    .setDescription('Manage Minecraft-Discord integration features.')
    .setDefaultPermission(false)
    .addSubcommand(command =>
        command.setName('channel')
        .setDescription('Set the channel to use for Minecraft server chat.')
        .addChannelOption(option =>
            option.setName('channel')
            .setDescription('The channel (must be a text channel)')
            .setRequired(true)))
    .addSubcommand(command =>
        command.setName('role')
        .setDescription('Set role required for chatting and messaging users.')
        .addRoleOption(option =>
            option.setName('role')
            .setDescription('The role. Without it, users will not be able to chat with Minecraft players and viceversa.')
            .setRequired(true)))
    .addSubcommand(command =>
        command.setName('info')
        .setDescription('Get configured values for Minecraft-Discord integration.'))
    .addSubcommand(command =>
        command.setName('playerlist')
        .setDescription('Set the channel to display online Minecraft players.')
        .addChannelOption(option =>
            option.setName('channel')
            .setDescription('First bot-sent pinned message will be used to display the stats, or a new message if none exist.')
            .setRequired(true)))
    .addSubcommand(command =>
        command.setName('statslocation')
        .setDescription(`The channel category in which to display Minecraft server status and player count.`)
        .addChannelOption(option =>
            option.setName('category')
            .setDescription('The channel category to display the stats.')
            .setRequired(true)))


export const global = false;
export async function execute(interaction: Discord.CommandInteraction, client: Discord.Client, ...args: any[]) {
    const command = interaction.options.getSubcommand(true);
    if (command == 'info') {
        let msg = '';
        const channel = await config.get('mdi.chat_channel');
        const role = await config.get('mdi.chat_role');
        msg += ((channel) ? `Chat channel: <#${channel.id}>` : `No chat channel configured`) + '\n';
        msg += (role ? `Chat role <@&${role}>` : `No chat role configured`) + '\n';
        interaction.reply({ embeds: [Embeds.info(msg)] });
    } else if (command == 'channel') {
        const channel = interaction.options.getChannel('channel', true);
        if (channel.type != 'GUILD_TEXT') {
            await interaction.reply({ embeds:[
                Embeds.dumbass(`<#${channel.id}> is not a text channel :neutral_face:`).setTitle('Bruh.')
            ]});
        } else {
            await config.set('mdi.chat_channel', channel.id);
            await interaction.reply({ embeds:[
                Embeds.success(`MDI chat channel is now <#${channel.id}>`)
            ]});
        }
    } else if (command == 'role') {
        const role = interaction.options.getRole('role', true);
        await config.set('mdi.chat_role', role.id);
        await interaction.reply({ embeds:[
            Embeds.success(`MDI chat role is now <@&${role.id}>`)
        ]});
    } else if (command == 'playerlist') {
        let channel = interaction.options.getChannel('channel', true);
        if (channel.type != 'GUILD_TEXT') {
            await interaction.reply({ embeds:[
                Embeds.dumbass(`<#${channel.id}> is not a text channel :neutral_face:`).setTitle('Bruh.')
            ]});
            return;
        }
        channel = channel as Discord.TextChannel;
        const pinnedMessages = await channel.messages.fetchPinned();
        let message = pinnedMessages.find((msg, id) => msg.author == client.user);
        if (message) {
            await config.set('mdi.players_online_message', message);
        } else {
            message = await channel.send('There are no players online.');
            await config.set('mdi.players_online_message', message);
        }
        await interaction.reply({embeds:[
            Embeds.success(`Successfully set the players online channel to <#${channel}>`)
        ]});
    } else if (command == 'statslocation') {
        let category = interaction.options.getChannel('category', true);
        if (category.type != 'GUILD_CATEGORY') {
            await interaction.reply({ embeds:[
                Embeds.dumbass(`<#${category.id}> must be a category!`)
            ]});
            return;
        }
        category = category as Discord.CategoryChannel;
        const statusChannel = await category.createChannel('🔴 Server Offline', {
            type: 'GUILD_VOICE',
            permissionOverwrites: [
                {
                    id: category.guild.id,
                    allow: ['VIEW_CHANNEL'],
                    deny: ['CONNECT']
                }
            ]
        });
        const playerChannel = await category.createChannel('Players: 0', {
            type: 'GUILD_VOICE',
            permissionOverwrites: [
                {
                    id: category.guild.id,
                    allow: ['VIEW_CHANNEL'],
                    deny: ['CONNECT']
                }
            ]
        });
        await config.set('mdi.status_channel', statusChannel.id);
        await config.set('mdi.player_channel', playerChannel.id);
        await interaction.reply({embeds: [
            Embeds.success(`Configured server stats in <#${category.id}>`)
        ]});
    }
}
