import { REST } from '@discordjs/rest';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Command } from './commands.js';
import { Routes } from 'discord-api-types/v9';
import logger from './logger.js';
import { Collection } from 'discord.js';

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN as string);

getCommands().then(([global, guild]) => {
    let localOnly = ['--local-only', '-l', '--local', '-local'].reduce((a, b) => process.argv.includes(b) || a, false)
    // console.log(JSON.stringify(global, undefined, 4));
    // console.log(JSON.stringify(guild, undefined, 4));
    rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID as string, process.env.GUILD as string), { body: guild })
            .then(() => logger.info(`Successfully registered ${guild.length} guild commands`))
            .catch(logger.error);
    if (!localOnly) {
        rest.put(Routes.applicationCommands(process.env.CLIENT_ID as string), { body: global })
            .then(() => logger.info(`Successfully registered ${global.length} global commands`))
            .catch(logger.error); 
    }
});

async function getCommands() {
    // const guildCommands = [];
    // const globalCommands = [];
    // for (const file of commandFiles) {
    //     const filePath = path.join(commandsPath, file);
    //     const command: Command = await import(filePath);
    //     if (command.global) globalCommands.push(command.data.toJSON());
    //     else guildCommands.push(command.data.toJSON());
    // }
    // return [globalCommands, guildCommands];
    const dir = new URL('../', import.meta.url).pathname.slice(1);
    const guildCommands = [];
    const globalCommands = [];
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
            if (command.global) globalCommands.push(command.data.toJSON());
            else guildCommands.push(command.data.toJSON());
        }
    }
    return [globalCommands, guildCommands];
}
