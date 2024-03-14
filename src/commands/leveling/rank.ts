import { drawRankCard } from '../../util/canvas_renderer.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import * as Discord from 'discord.js';
import Embeds from '../../util/embeds.js';
import LevelManager from '../../LevelManager.js';


export const data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Get your rank, or another user\'s.')
    .addUserOption(option =>
        option.setName('user')
        .setDescription('The user whose rank you want to see.'))

export const global = false;
export async function execute (interaction: Discord.CommandInteraction, client: Discord.Client, ...args: any[]) {
    const leveling = args[0] as LevelManager;
    let option_user = interaction.options.get('user');
    const user = client.users.cache.get(option_user?.value as string) ?? interaction.user;
    const member = interaction.guild?.members.cache.get(user.id) as Discord.GuildMember;
    const { lvl, xp, position } = leveling.getRank(user.id);
    if (user.bot) {
        await interaction.reply({ embeds: [
            Embeds.dumbass(`Bots can't have experience, dummy :neutral_face:`)
        ]});
    } else if (position > 0) {
        const canvas = await drawRankCard(member, xp, lvl, position);

        let attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'card.png');
        await interaction.reply({ files: [attachment] });
        // await interaction.reply(`${user.username} is in rank ${position}, level ${lvl} with ${xp} XP.`);
    } else {
        await interaction.reply({ embeds:[
            Embeds.dumbass("You haven't sent any messages yet. To get on the leaderboard, you need to receive XP by messaging.")
        ]});
    }
}
