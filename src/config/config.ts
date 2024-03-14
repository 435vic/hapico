import Keyv from 'keyv';

const config = new Keyv('sqlite://database/config.sqlite');

export default config;
