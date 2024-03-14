# Hapico

Hapico is a Discord bot written in Typescript that connects a Minecraft server with a
minecraft server. It includes a leveling system, replacing bots like MEE6, administration commands,
Minecraft-Discord cross chat, and a constantly updating player list.

## Dependencies
Hapico requires extra packages to render images with canvas. More information can be found in the
[NPM entry](https://www.npmjs.com/package/canvas) for the package.

## Configuration
Hapico uses several API tokens, credentials, and an SSL certificate. An example environment setup
is defined in the `.env.example` file. The Minecraft integration also needs a custom Spigot plugin,
and a self signed certificate. The certificate authority used for the certificate should be specified
in the `.env` file.

