import { pino } from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL,
    transport: {
        targets: [
            {
                level: process.env.LOG_LEVEL as string,
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    ignore: 'pid,hostname',
                    translateTime: 'yyyy-mm-dd HH:MM:ss'
                }
            },
            {
                level: process.env.LOG_LEVEL as string,
                target: 'pino-pretty',
                options: {
                    colorize: false,
                    ignore: 'pid,hostname',
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    destination: 'latest.log'
                }
            },
            {
                level: 'error',
                target: 'pino-pretty',
                options: {
                    colorize: false,
                    ignore: 'pid,hostname',
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    destination: 'error.log'
                }
            }
        ]
    }
});

export { logger as default };