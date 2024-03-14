import * as Discord from 'discord.js';
import rest from '../../mdi/api.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import embeds from '../../util/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage the Minecraft server whitelist.')
    .setDefaultPermission(false)
    .addSubcommand(subcommand => 
        subcommand.setName('add')
        .setDescription('Add a player to the whitelist.')
        .addStringOption(option => 
            option.setName('player')
            .setDescription('The username of the player to whitelist.')
            .setRequired(true)))
    .addSubcommand(subcommand => 
        subcommand.setName('remove')
        .setDescription('Remove a player from the whitelist.')
        .addStringOption(option =>
            option.setName('player')
            .setDescription('The username of the player to remove from the whitelist.')
            .setRequired(true)));
   
export const global = false;
export async function execute(interaction: Discord.CommandInteraction, client: Discord.Client, ...args: any[]) {
    if (!interaction.memberPermissions?.has("ADMINISTRATOR")) {
        const embed = new Discord.MessageEmbed()
                    .setTitle('Error sending command')
                    .setDescription("You don't have sufficient permissions to use this command.")
                    .setColor(0xFF0000);
        interaction.reply({ embeds: [embed], ephemeral:true });
        return;
    }
    const user = interaction.options.getString('player');

    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    if (subcommand == 'add') {
        try {
            const response = await rest.api.players.whitelist(user).put();
            let embed;
            switch (response.status) {
                case 405:
                    embed = embeds.dumbass('Cannot add player to whitelist as whitelist is not enabled!');
                    break;
                case 404:
                    embed = embeds.dumbass(`Player **${user}** does not exist!`);
                    break;
                case 204:
                    embed = embeds.dumbass('Player is already whitelisted!');
                    break;
                case 200:
                    embed = embeds.success(`Player **${await response.text()}** has been successfully whitelisted.`)
                    break;
                default:
                    embed = embeds.critical('There was an unknown error sending the command :\'(')
                    break;
            }
            interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.log(error);
            let embed = new Discord.MessageEmbed()
                .setTitle('Error sending command')
                .setDescription('There was an error sending the command. The Minecraft server might not be online or experienced an exception.')
                .setColor(0xFF0000);
            interaction.editReply({ embeds: [embed] });
            return;
        }
        
    } else if (subcommand == 'remove') {
        try {
            const response = await rest.api.players.whitelist(user).delete();
            let embed;
            switch (response.status) {
                case 405:
                    embed = embeds.dumbass('Cannot remove player from whitelist as whitelist is not enabled!');
                    break;
                case 404:
                    embed = embeds.dumbass(`Player **${user}** does not exist!`);
                    break;
                case 204:
                    embed = embeds.dumbass('Player is not whitelisted!');
                    break;
                case 200:
                    embed = embeds.success(`Player **${await response.text()}** has been successfully removed from the whitelist.`)
                    break;
                default:
                    embed = embeds.critical('There was an unknown error sending the command :\'(')
                    break;
            }
            interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.log(error);
            let embed = new Discord.MessageEmbed()
                .setTitle('Error sending command')
                .setDescription('There was an error sending the command. The Minecraft server might not be online or there was an error.')
                .setColor(0xFF0000);
            interaction.editReply({ embeds: [embed] });
            return;
        }
    } else if (subcommand == 'list') {
        interaction.editReply('Error: not implemented :p')
    }
}
