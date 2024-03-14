import * as Discord from 'discord.js';

const Embeds = {
    success(text: string) {
        return new Discord.MessageEmbed()
            .setDescription(text)
            .setColor('GREEN');
    },
    critical(text: string) {
        return new Discord.MessageEmbed()
            .setDescription(text)
            .setColor('RED');
    },
    neutral(text: string) {
        return new Discord.MessageEmbed()
            .setDescription(text)
            .setColor('GREYPLE');
    },
    dumbass(text: string) {
        return new Discord.MessageEmbed()
            .setDescription(text)
            .setColor('FUCHSIA');
    },
    info(text: string) {
        return new Discord.MessageEmbed()
            .setDescription(text)
            .setColor('GOLD');
    }
}


export default Embeds;
