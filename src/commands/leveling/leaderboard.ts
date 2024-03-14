import * as Discord from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import LevelManager from '../../LevelManager.js';

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Get the server leaderboard.')

export const global = false;
export async function execute(interaction: Discord.CommandInteraction, client: Discord.Client, ...args: any[]) {
    const leveling = args[0] as LevelManager;
    let leaderboard = Array.from(leveling.users.sort((a, b) => b.xp - a.xp)
        .filter(user => client.users.cache.has(user.user_id)).keys());
    if (leaderboard.length > 20) leaderboard = leaderboard.slice(0, 20);
    const embed = new Discord.MessageEmbed()
            .setColor('GREEN')
            .setTitle('**Server leaderboard**')
            .setThumbnail(interaction.guild?.iconURL() as string)
            .setDescription(`Here are the ranks for the server.\nYour current rank is **#${leveling.getRank(interaction.user.id).position}**\n`);        
    embed.addFields(
        {name: 'First Place :first_place:', value: `${client.users.cache.get(leaderboard[0])?.tag}\nLevel **${leveling.getRank(leaderboard[0]).lvl}**`, inline: true},
        {name: 'Second Place :second_place:', value: `${client.users.cache.get(leaderboard[1])?.tag}\nLevel **${leveling.getRank(leaderboard[1]).lvl}**`, inline: true},
        {name: 'Third Place :third_place:', value: `${client.users.cache.get(leaderboard[2])?.tag}\nLevel **${leveling.getRank(leaderboard[2]).lvl}**`, inline: true},
    );
    let ranks = '';
    if (leaderboard.length > 3) {
        leaderboard = leaderboard.slice(3);
        for (let uid of leaderboard) {
            let {lvl, xp, position} = leveling.getRank(uid);
            ranks += `**#${position}** - ${client.users.cache.get(uid)?.tag} - Level **${lvl}**\n`;
        }
        embed.addField('**The Rest:tm:**', ranks, false);
    }

    await interaction.reply({ embeds: [embed] });
}
