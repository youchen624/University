const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    MessageFlags,
    ChannelType,
    ButtonStyle,
    ActionRowBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    EmbedBuilder,
    REST,
    Routes
} = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});
const fs = require('fs');
require('dotenv').config();
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
// α-Version
const ALPHA = "1337073719058894900";
// 註冊指令
const commands = [
    // { name: 'config', description: '遊戲設定' },
    { name: 'panel', description: '遊戲面板' },
    new SlashCommandBuilder().setName('op').setDescription('新增遊戲管理員')
        .addUserOption(option => option
            .setName('user')
            .setDescription('使用者')
            .setRequired(true)
        ),
    new SlashCommandBuilder().setName('deop').setDescription('移除遊戲管理員')
        .addUserOption(option => option
            .setName('user')
            .setDescription('使用者')
            .setRequired(true)
        ),
    new SlashCommandBuilder().setName('create_game').setDescription('創建遊戲房')
        .addChannelOption(option => option
            .setName('category')
            .setDescription('頻道分類')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        ),
    new SlashCommandBuilder().setName('kick').setDescription('從座位上抱起')
        .addUserOption(option => option
            .setName('user')
            .setDescription('使用者')
            .setRequired(true)
        ),
];
(async () => {
    try {
        console.log('正在註冊指令...');
        //applicationGuildCommands  applicationCommands
        await rest.put(Routes.applicationGuildCommands(process.env.APP_CLIENT_ID, '1337073719058894900'), { body: commands });
        console.log('✅指令註冊成功！');
    } catch (error) {
        console.error('❌註冊指令失敗: ', error);
    }
})();
/*
commands
create game
catetorgy
*/

function ms(n) { return n * 1000; }

class Message {
    static async send(channelId, message) {
        try {
            const channel = await client.channels.fetch(channelId);
            return await channel.send(message);
        } catch (e) {
            console.error(`❌發送訊息時出現問題: ${e}`);
        }
    }
    static async delete(channelId, messageId) {
        try {
            const channel = await client.channels.fetch(channelId);
            return await channel.messages.fetch(messageId)
                .then(msg => msg.delete());
        } catch (e) {
            console.error(`❌刪除訊息時出現問題: ${e}`);
        }
    }
    static async edit(channelId, messageId, message) {
        try {
            const channel = await client.channels.fetch(channelId);
            const fetchedMessage = await channel.messages.fetch(messageId);
            return await fetchedMessage.edit(message);
        } catch (e) {
            console.error(`❌編輯訊息時出現問題: ${e}`);
        }
    }
}

const GameConfigRefPath = './data/config/';
// Game Class
class Game {
    static Config = class {
        Time = {
            "Day": 60,
            "Night": 30,
            "LastWords": 60,
            "Vote": 20,
            "misc": 5
        }
        GodRoles = {
            "witch": true,
            "prophet": true,
            "hunter": true,
            "idiot": false
        }
        playerCount = 9
        canWitchSaveSelf = true
        canWolfExplode = false
        sheriff = false
        sheriffVoteValue = 1.5
    };
    static Player = class {
        member;
        id;
        alive = true;
        async mute() { }
        async whenDeath() {}
    };
    static ID_N = 0;
    static games = [];
    players = [];
    configRef;
    config;
    categoryId;
    // data;
    name; id;
    isPlaying = false;

    constructor(name, configRef = 'default') {
        this.id = Game.ID_N++;
        this.name = name;
        this.configRef = configRef;
        // config =
        Game.games.push(this);
        // game channel setup
        return this;
    }
    static preset() { }
    save() { }   //save game 存至./data/games/ <name>.json 開機時預設遊戲
    static create(name) {
        return new Game(name);
    }
    static delete(categoryId) {
        Game.games = Game.games.filter(g => g.categoryId !== categoryId);
    }
    static game(categoryId) {
        return Game.games.find(g => g.categoryId === categoryId);
    }
    start() { }
    day() { }
};

const clientHandler = {
    async messageCreate(message) { },
    async interactionCreate(interaction) {
        // alpha版本僅限官方伺服器
        if (interaction.guild.id !== ALPHA) {
            interaction.reply({
                content: '❌目前為Alpha版本 僅限官方伺服器使用',
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }
        let keys = [];
        if (interaction.customId) keys = interaction.customId.split(/[-.]/);
        if(interaction.isCommand()) keys = interaction.commandName.split(/[-.]/);
        // black list
        if(keys[0] === 'admin') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                interaction.reply({
                    content: '❌你沒有權限這麼做',
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }
            keys.shift();
        }
        // admin
    },
    async voiceStateUpdate(oldState, newState) { },
};
for (const [event, handler] of Object.entries(clientHandler)) {
    client.on(event, handler);
}
// 啟動執行項
client.once('ready', async () => {
    console.log(`🟢機器人已啟動，登入為 ${client.user.tag}`);
});

