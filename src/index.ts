import { Client, Intents, MessageComponent, MessageComponentInteraction } from 'discord.js';
import 'dotenv/config';
import cluster from 'cluster';
import logger from './util/logger.js';
import commands from './util/commands.js';
import config from './config/config.js';
import LevelManager from './LevelManager.js';
import MDIBridge from './mdi/mdi.js';

if (cluster.isPrimary) {
    let fork = cluster.fork();
    logger.info(`Successfully started worker ${fork.id}`);

    cluster.on('exit', (worker, code, signal) => {
        logger.error(`Worker ${worker.id} closed`);
        logger.info(`Starting worker...`)
        let wrk = cluster.fork();
        logger.info(`Successfully started worker ${wrk.id}`);
    });
}

if (cluster.isWorker) {
    main();
}

function main() {
    const intents = new Intents();
    intents.add(
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_INVITES
    );

    const client = new Client({intents});
    let leveling: LevelManager | undefined;
    let server: MDIBridge;

    client.once('ready', async () => {
        logger.info('logged in to discord');
        client.user?.setActivity('/rank');
        leveling = new LevelManager(client);
        server = new MDIBridge(parseInt(process.env.SOCKET_PORT as string), process.env.HOSTNAME as string, client);

        client.on('messageCreate', async message => {
            if (message.webhookId == null && message.channel.id == await config.get('mdi.chat_channel')) {
                // send to minecraft
                server.sendChat(message);
            }
            leveling?.processMessage(message);
        });
    });

    client.on('interactionCreate', async interaction => {
        // all non-command interactions still have a global name, so get that
        // let identifier = interaction.isCommand() ? interaction.commandName : interaction.id.split('_')[0]
        let identifier = interaction.id;
        if (interaction.isCommand()) {
            identifier = interaction.commandName;
        } else if (interaction.isMessageComponent()) {
            identifier = interaction.customId.split('_')[0];
        }

        try {
            logger.debug(`command ${identifier} executed`);
            await commands.get(identifier)?.execute(interaction, client, leveling);
        } catch (error) {
            logger.error(`Error while executing interaction ${identifier}`);
            logger.error(error);
        }
    });

    process.on('uncaughtException', (error) => {
        logger.fatal(`Ran into FATAL exception ${error.name}`);
        logger.error(error);
        
        if (server) {
            server.updateStatusChannels();
            server.socket.disconnect();
        }
        process.exit(1);
    });

    client.login(process.env.BOT_TOKEN);
}