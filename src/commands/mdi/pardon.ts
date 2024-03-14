import * as Discord from 'discord.js';
import rest from '../../mdi/api.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import embeds from '../../util/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('pardon')
    .setDescription('Unban a player from the server.')
    .setDefaultPermission(false)
    .addStringOption(option => 
        option.setName('player')
        .setDescription('The username of the player to pardon.')
        .setRequired(true));

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

    try {
        const response = await rest.api.players.bans(user).delete();
        let embed;
        switch (response.status) {
            case 404:
                embed = embeds.dumbass(`Player **${user}** does not exist.`);
                break;
            case 204:
                embed = embeds.dumbass(`Player is not banned!`);
                break;
            case 200:
                embed = embeds.success(`Player **${await response.text()}** has been successfully pardoned.`);
                break;
            default:
                embed = embeds.critical('There was an unkown error sending the command :sob:')
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
}