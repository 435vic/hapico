import { SlashCommandBuilder } from '@discordjs/builders';
import * as Discord from 'discord.js';
import config from '../../config/config.js';
import rest from '../../mdi/api.js';

const EMBED_ICON = 'https://www.mc-heads.net/head/@/500.png';

export const data = new SlashCommandBuilder()
    .setName('msg')
    .setDescription('Send a private message to a player on the minecraft server.')
    .setDefaultPermission(false)
    .addStringOption(option =>
        option.setName('user')
            .setDescription('Minecraft username. Player must be online to message.')
            .setRequired(true))
    .addStringOption(option => 
        option.setName('message')
        .setDescription('The message to send')
        .setRequired(true));

export const global = true;
export async function execute(interaction: Discord.CommandInteraction, client: Discord.Client, ...args: any[]) {
    // client.server.privateMessage(interaction);
    const source = interaction.user.tag;
    const user = interaction.options.getString('user') as string;
    const msg = interaction.options.getString('message') as string;

    // If the command is activated on the server, we need to make it ephemeral
    // so only the user can see it, for privacy reasons. If not we let it stay
    // so it can leave a message history on DMs.
    let ephemeral = interaction.channel != null;
    if (interaction.channel != null) {
        if (interaction.channel.type == 'DM') {
            ephemeral = false;
        }
    }

    
    let guild = interaction.guild;
    let gmember = guild?.members.cache.get(interaction.user.id);
    if (gmember != undefined) {
        const roleId = await config.get('mdi.chat_role');
        if (roleId) {
            if (!gmember.roles.cache.has(roleId)) {
                const embed = new Discord.MessageEmbed()
                    .setTitle('Error sending command')
                    .setDescription("You don't have sufficient permissions to use this command.")
                    .setColor(0xFF0000);
                interaction.reply({ embeds: [embed], ephemeral:true });
                return;
            }
        }
    }

    // We need to check if the username is valid first
    await interaction.deferReply({ ephemeral: ephemeral });

    // no socket writes. no unicode or byte bullshit. no IDs or tokens. no events
    // just a simple web request. i love it
    let response;
    try {
        response = await rest.api.players.uname(user).message.post({author: source, content: msg});
    } catch (e) {
        console.log(e);
        let embed = new Discord.MessageEmbed()
            .setTitle('Error sending message')
            .setDescription("The Minecraft server is currently offline or unavailable. Please try again later.")
            .setColor(0xFF0000);
        interaction.editReply({ embeds: [embed] });
        return;
    }
    if (response.ok) {
        let embed = new Discord.MessageEmbed()
            .setAuthor(
                {
                    name: interaction.user.username, 
                    iconURL: interaction.user.avatarURL() as string
                }
            )
            .setDescription(msg)
            .setFooter({text: 'Sent to ' + user, iconURL: EMBED_ICON.replace('@', user)});
        interaction.editReply({ embeds: [embed] });
    } else {
        let embed = new Discord.MessageEmbed()
            .setTitle('Error sending message')
            .setDescription('The player you tried to message is not online or the username is invalid.')
            .setColor(0xFF0000);
        interaction.editReply({ embeds: [embed] });
    }
}
