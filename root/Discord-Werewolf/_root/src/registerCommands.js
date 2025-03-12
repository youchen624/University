const { Collection } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { execute } = require("./commands/create_game");

const getCommands = (client) => {
    client.commands = new Collection();
    const commands = [];
    const commandsPath = path.join(_dirname, "./src/commands");
    const commandFiles = fs.readFileSync(commandsPath).filter((file) => file.endswith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`🟠檔案 ${filePath} 缺少 data 或 execute`);
        }
        commands.push(command.data.toJSON());
    }
    return commands;
}

const registerCommands = async (client) => {
    const commands = getCommands(client);
    try {
        if (client.application) {
            console.log(`ℹ️註冊 ${commands.length} 個指令中...`);
            const data = await client.application.commands.set(commands);
            console.log(`✅指令註冊成功 ${data.size} 個`);
        }
    } catch (e) { console.error(e); }
}
module.exports = registerCommands