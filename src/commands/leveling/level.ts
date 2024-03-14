import * as Discord from 'discord.js';
import Embeds from '../../util/embeds.js';
import config from '../../config/config.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import LevelManager from '../../LevelManager.js';
import { EventEmitter } from 'node:events';
import logger from '../../util/logger.js';

const buttom_confirm_all = new Discord.MessageButton()
    .setCustomId('level_all_confirm')
    .setLabel("Yes, I'm sure")
    .setStyle('DANGER');

const buttom_confirm_user = new Discord.MessageButton()
    .setCustomId('level_user_confirm')
    .setLabel("Yes, I'm sure")
    .setStyle('DANGER');

const button_cancel_all = new Discord.MessageButton()
    .setCustomId('level_all_cancel')
    .setLabel('Cancel')
    .setStyle('SECONDARY');

const button_cancel_user = new Discord.MessageButton()
    .setCustomId('level_user_cancel')
    .setLabel('Cancel')
    .setStyle('SECONDARY');

const tag_user = /\${user}/g;
const tag_level = /\${level}/g;

const events = new EventEmitter();

export async function execute(interaction: Discord.Interaction, client: Discord.Client, ...args: any[]) {
    if (!interaction.isCommand()) {
        component(interaction as Discord.MessageComponentInteraction, client);
        return;
    }
    const leveling = args[0] as LevelManager;
    const command = interaction.options.getSubcommandGroup(false) ?? interaction.options.getSubcommand(true);
    if (command == 'give') {
        const user = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('levels', true);
        if (amount > 100) {
            await interaction.reply(`Cannot give more than **100** levels at a time. Try a smaller amount.`);
            return;
        }
        await leveling.addLevel(user.id, amount);
        const { lvl, xp } = leveling.getRank(user.id);
        await interaction.reply(`${user.username} is now level ${lvl} with ${xp} XP.`);
    } else if (command == 'style') {
        const stackRoles = interaction.options.getString('style') == 'stack';
        await config.set('leveling.stack_roles', stackRoles);
        let msg = stackRoles ? 'level roles will **stack** on top of each other.'
                : 'only the **highest** level role will be displayed.';
        await interaction.reply({ embeds:[
            Embeds.success(`Now ${msg}`).setTitle('Success!')
        ]});
    } else if (command == 'location') {
        const channel = interaction.options.getChannel('channel', true);
        if (channel.type != 'GUILD_TEXT') {
            await interaction.reply({ embeds:[
                Embeds.dumbass(`<#${channel.id}> is not a text channel :neutral_face:\nI **obviously** cannot send text in this channel.`).setTitle('Bruh.')
            ]});
        } else {
            await config.set('leveling.location', channel.id);
            await interaction.reply({ embeds:[
                Embeds.success(`Successfully set <#${channel.id}> as the leveling location.`)
            ]});
        }
    } else if (command == 'clear') {
        const subcommand = interaction.options.getSubcommand(true);
        if (subcommand == 'all') {
            const size = leveling.users.size;
            if (size) {
                const warning = Embeds.critical(`Are you sure you want to permanently delete **everyone's** level data? This action is irreversible.`)
                .setFooter(`Warning: this will affect ${size} user${size > 1 ? 's' : ''}`);
                        
                await interaction.reply({
                    embeds: [warning],
                    components: [new Discord.MessageActionRow().addComponents(
                        [buttom_confirm_all.setDisabled(false), button_cancel_all.setDisabled(false)]
                    )]
                });
                setTimeout(() => {
                    interaction.editReply({
                        components: [new Discord.MessageActionRow().addComponents([
                            buttom_confirm_all.setDisabled(true),
                            button_cancel_all.setDisabled(true)
                        ])]
                    })
                }, 60*1000);
                events.on('level_all', async (id: string, interaction: Discord.MessageComponentInteraction) => {
                    if (id == 'level_all_confirm') {
                        let total = await leveling.resetAll();
                        await interaction.update({
                            embeds: [Embeds.success(`Deleted ${total} user ${total > 1 ? 'entries' : 'entry'}.`)],
                            components: []
                        });
                    } else if (id == 'level_all_cancel') {
                        await interaction.update({
                            embeds: [Embeds.neutral('Operation cancelled.')],
                            components: []
                        });
                    }
                });
            } else {
                await interaction.reply({
                    embeds: [Embeds.dumbass('There are no user records to delete :neutral_face:')]
                });
            }
        } else if (subcommand == 'user') {
            const user = interaction.options.getUser('user', true);
            if (user.bot) {
                await interaction.reply({
                    embeds: [Embeds.dumbass(`Bots can't have experience, dummy :neutral_face:`)],
                });
            } else {
                await interaction.reply({
                    embeds: [
                        Embeds.critical(`Are you sure you want to permanently delete **${user}'s** level data? This action is irreversible.`)
                    ],
                    components: [new Discord.MessageActionRow().addComponents(
                        [buttom_confirm_user.setDisabled(false), button_cancel_user.setDisabled(false)]
                    )]
                });
                setTimeout(() => {
                    interaction.editReply({
                        components: [new Discord.MessageActionRow().addComponents([
                            buttom_confirm_user.setDisabled(true),
                            button_cancel_user.setDisabled(true)
                        ])]
                    })
                }, 60*1000);
                events.on('level_user', async (id: string, interaction: Discord.MessageComponentInteraction) => {
                    if (id == 'level_user_confirm') {
                        await leveling.resetUser(user.id);
                        await interaction.update({
                            embeds: [Embeds.success(`Successfully cleared ${user}'s experience.`)],
                            components: []
                        });
                    } else if (id == 'level_user_cancel') {
                        await interaction.update({
                            embeds: [Embeds.neutral('Operation cancelled.')],
                            components: []
                        });
                    }
                });
            }
        } 
    } else if (command == 'role') {
        let rolesArr = await config.get('leveling.roles') ?? [];
        const roles = new Discord.Collection<number, string>();
        for (let role of rolesArr) {
            roles.set(role.lvl, role.role);
        }
        const subcommand = interaction.options.getSubcommand(true);
        if (subcommand == 'list') {
            if (roles.size) {
                let list = '';
                for (let role of rolesArr) {
                    list += `**Level ${role.lvl}**: <@&${role.role}>\n`;
                }
                await interaction.reply({ embeds: [
                    Embeds.info(list)
                ]});
            } else {
                await interaction.reply({ embeds: [
                    Embeds.dumbass('There are no level roles configured yet!').setFooter('use /level role add to add level roles.')
                ]});
            }
        } else if (subcommand == 'set') {
            const lvl = interaction.options.getInteger('level', true);
            const role = interaction.options.getRole('role', true).id;
            if (roles.find((r,) => r == role)) {
                await interaction.reply({ embeds: [
                    Embeds.dumbass(`Role <@&${role}> is already configured!`)
                ]});
            } else {
                const arr: { lvl: number, role: string }[] = [];
                roles.set(lvl, role);
                roles.forEach((role, lvl) => arr.push({ lvl, role }));
                await config.set('leveling.roles', arr);
                await interaction.reply({ embeds: [
                    Embeds.success(`Success! <@&${role}> will be awarded at **level ${lvl}**`)
                ]});
            }
        } else if (subcommand == 'remove') {
            const lvl = interaction.options.getInteger('level', true);
            const role = roles.get(lvl);
            if (roles.delete(lvl)) {
                const arr: { lvl: number, role: string }[] = [];
                roles.forEach((role, lvl) => arr.push({ lvl, role }));
                await config.set('leveling.roles', arr);
                await interaction.reply({ embeds: [
                    Embeds.success(`Successfully removed role <@&${role}> for level ${lvl}`)
                ]});
            } else {
                await interaction.reply({ embeds: [
                    Embeds.dumbass(`Level ${lvl} has no role!`)
                ]});
            }
        }
    } else if (command == 'message') {
        const subcommand = interaction.options.getSubcommand(true);
        if (subcommand == 'edit') {
            await interaction.reply({ embeds: [
                Embeds.info(`Please send the message you want to use for leveling up.\n\`\${user}\` = user who leveled up\n\`\${level}\` = level the user leveled up to`)
            ]});
            const filter = (msg: Discord.Message) => msg.author == interaction.user;
            const channel = interaction.channel as Discord.TextBasedChannel;
            try {
                const collected = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }) as Discord.Collection<string, Discord.Message<boolean>>;
                const first = collected.first() as Discord.Message<boolean>;
                const msg = first.content as string;
                const preview = msg.replaceAll(tag_user, `<@${interaction.user.id}>`).replaceAll(tag_level, '69');
                await config.set('leveling.message', msg);
                interaction.followUp({ embeds:[
                    Embeds.success(preview).setTitle('Succesfully changed message! Level up preview:')
                ]});
            } catch (error) {
                await interaction.editReply({ embeds: [
                    Embeds.dumbass(`Interaction expired.`)
                ]});
            }
        } else if (subcommand == 'preview') {
            const preview = ((await config.get('leveling.message') as string) ?? '${user} leveled up!')
                .replaceAll(tag_user, `<@${interaction.user.id}>`).replaceAll(tag_level, '69');
            if (preview) {
                interaction.reply({ embeds:[
                    Embeds.success(preview).setTitle('Level up preview (fake values)')
                ]});
            } else {
                await interaction.reply({ embeds: [
                    Embeds.dumbass(`There isn't currently a level up message. Configure one with \`/level message edit\` :person_facepalming:`)
                ]});
            }
        }
    }
}

function component(component: Discord.MessageComponentInteraction, client: Discord.Client) {
    const eventId = component.customId.split('_').slice(0, 2).join('_');
    if (events.listeners(eventId).length) {
        logger.debug(`component event ${eventId}`);
        events.emit(eventId, component.customId, component);
    } else {
        logger.debug(`component event ${eventId} not found`);
        const comps = component.message.components ?? [];
        const components: Discord.MessageActionRow[] = [];
        for (let actionRow of comps) {
            const row = new Discord.MessageActionRow();
            for (let component of actionRow.components) {
                if (component.type == 'BUTTON') {
                    component.setDisabled(true);
                } else if (component.type == 'SELECT_MENU') {
                    component.setDisabled(true);
                }
                row.addComponents(component);
            }
            components.push(row);
        }
        component.update({
            components
        });
    }
}

export const global = false;
export const data = new SlashCommandBuilder()
    .setName('level')
    .setDescription('Edit preferences and values for leveling')
    .setDefaultPermission(false)
    .addSubcommand(command =>
        command.setName('give')
        .setDescription('Give a user an amount of levels.')
        .addUserOption(option =>
            option.setName('user')
            .setDescription('The user to give levels to.')
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName('levels')
            .setDescription('The amount of levels to add.')
            .setRequired(true)))
    .addSubcommand(command =>
        command.setName('style')
        .setDescription('Whether to stack level roles or only keep the highest.')
        .addStringOption(option =>
            option.setName('style')
            .setDescription('The behavior that level roles have.')
            .setRequired(true)
            .addChoices(
                {
                    name: 'Stack level roles',
                    value: 'stack'
                },
                {
                    name: "Keep highest role only",
                    value: 'highest'
                }
            )))
    .addSubcommandGroup(group =>
        group.setName('clear')
        .setDescription('Clear a user/server\'s total level and experience.')
        .addSubcommand(command =>
            command.setName('all')
            .setDescription('Clear ALL users\' levels and xp. This action is irreversible and only executable by the server owner.'))
        .addSubcommand(command =>
            command.setName('user')
            .setDescription('Clear a user\'s levels and xp.')
            .addUserOption(option =>
                option.setName('user')
                .setDescription('Target user for clearing xp.')
                .setRequired(true))))
    .addSubcommand(command =>
        command.setName('location')
        .setDescription('Set channel to post leveling notifications to.')
        .addChannelOption(option =>
            option.setName('channel')
            .setDescription('The channel (duh)')
            .setRequired(true)))
    .addSubcommandGroup(group =>
        group.setName('role')
        .setDescription('Add, remove or edit level roles.')
        .addSubcommand(command =>
            command.setName('set')
            .setDescription('Add or change a level role.')
            .addIntegerOption(option =>
                option.setName('level')
                .setDescription('The level to give this role at.')
                .setRequired(true))
            .addRoleOption(option =>
                option.setName('role')
                .setDescription('The role to associate with this level.')
                .setRequired(true)))
            .addSubcommand(command =>
                command.setName('remove')
                .setDescription('Remove a level role.')
                .addIntegerOption(option =>
                    option.setName('level')
                    .setDescription('The level you want to remove its role from.')
                    .setRequired(true)))
            .addSubcommand(command =>
                command.setName('list')
                .setDescription('List all level roles.')))
    .addSubcommandGroup(group =>
        group.setName('message')
        .setDescription('Edit or see the level up message.')
        .addSubcommand(command =>
            command.setName('edit')
            .setDescription('Edit or see the level up message.'))
        .addSubcommand(command =>
            command.setName('preview')
            .setDescription('Preview the level up message with fake info.')))
