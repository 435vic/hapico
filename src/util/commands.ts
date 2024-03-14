import fs from 'fs';
import path from 'path';
import { Collection, Interaction, Client } from 'discord.js';
import { SlashCommandStringOption } from '@discordjs/builders';
import logger from './logger.js';

interface Command {
    /**
     * The SlashCommandBuilder data for this command.
     */
    readonly data: SlashCommandStringOption,
    /**
     * Whether this command is a global or guild command.
     */
    readonly global: boolean,
    /**
     * Handle the interaction (you know, do the command and stuff)
     * @param interaction The interaction object.
     */
    execute(interaction: Interaction, client: Client, ...args: any[]): void
}

logger.info(`importing commands`);

const dir = new URL('../', import.meta.url).pathname.slice(1);

const commands: Collection<string, Command> = new Collection();
const commandsPath = path.join(dir, 'commands');
const commandFolders = fs.readdirSync(commandsPath).filter(folder => {
    logger.debug(`found dir ${folder}`);
    return fs.lstatSync(path.join(commandsPath, folder)).isDirectory;
});
for (let folder of commandFolders) {
    const commandFiles = fs.readdirSync(path.join(commandsPath, folder)).filter(file => {
        logger.debug(`found file ${path.join(folder, file)}`);
        return file.endsWith('.ts');
    });
    for (let file of commandFiles) {
        logger.debug(`importing ${file}`);
        const filePath = 'file://' + path.join(commandsPath, folder, file);
        const command: Command = await import(filePath);
        commands.set(command.data.name, command);
    }
}

logger.info(`successfully imported ${commands.size} commands`);

export { commands as default, Command };