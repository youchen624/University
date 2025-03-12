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
// const test = require('./src/game');
require('dotenv').config();
const CREATE_GAME_CD = 30;
let createGameLastCD = Math.floor(Date.now() / 1000);
// const { channel } = require('diagnostics_channel');
// const defaultConfigPath = './data/serverconfig/default.json';
/**
 * 取得完整路徑
 * @param {string} guildId 伺服器ID
 * @param {string} categoryId 分類ID
 * @returns {string} 完整路徑
 */
const getConfigPath = (guildId, categoryId) => `./data/config/${guildId}/${categoryId}.json`;
/**
 * 取得完整路徑
 * @param {string} guildId 伺服器ID
 * @param {string} categoryId 分類ID
 * @returns {string} 完整路徑
 */
const getPlayPath = (guildId, categoryId) => `./data/playing/${guildId}/${categoryId}.json`;

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
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
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

// 發送log
async function log(message) {
    try {
        const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
        if (logChannel) await logChannel.send(message);
    } catch (error) { console.error('❌無法發送日誌訊息: ', error); }
}
// is伺服器成員?
// async function isMember(userId) {
//     try {
//         await guild.members.fetch(userId);
//         return true;
//     } catch (error) {
//         console.log(`❌\`${userId}\` 不是伺服器成員(可能退出): ${error}`);
//         return false;
//     }
// }
async function isFileExists(filePath) {
    try {
        await fs.access(filePath);
        console.log('檔案存在');
        return true;
    } catch {
        console.log('檔案不存在');
        return false;
    }
}
/** 載入JSON檔案
 * @param {string} filePath 文件路徑
 * @returns {object} JSON object
 */
async function loadData(filePath) {
    try {
        //await fs.promises.access(filePath);
        const rawData = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.log(`🔴📁檔案 ${filePath} 不存在 ${error}`); return;
    }
}
// 儲存JSON (支援巢狀物件)
async function updateJsonField(filePath, fieldPath, newValue) {
    let data = await loadData(filePath);
    if (!data) {
        console.log(`🔴檔案 ${filePath} 不存在`);
        return;
    } else data = await JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

    // 透過 fieldPath 支援 "Timer.Day" 這類巢狀存取
    const keys = fieldPath.split('.'); // 支援 "Timer.Day" 這樣的巢狀路徑
    let current = data;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) { console.error(`🟠 找不到路徑中的 ${key}，建立中...`); }
        current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    if (!(lastKey in current)) { console.error(`🟠 找不到欄位 ${lastKey}，建立中...`); }
    current[lastKey] = newValue;
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 4));
    console.log(`📁 已更新 ${fieldPath} 為 ${newValue ?? 'null'}`);
    return await loadData(filePath);
}
// 隨機洗牌陣列
function randomShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

class Data { };

// 取得 config 資料
async function getConfig(configPath) {
    let data = await loadData(configPath);
    if (!data) {
        console.log('🔴遊戲設定檔不存在');
        return false;
    }
    return data;
}
// 取得 playing 資料
async function getPlay(playPath) {
    let data = await loadData(playPath);
    if (!data) {
        console.log('🔴遊戲資料檔不存在');
        // console.log('🟡檔案不存在，正在創建預設設定檔...');
    }
    return data;
}

async function getNow(callback, additionTime) {
    const time = Math.floor(Date.now() / 1000) + additionTime;
    return callback(time);
}

const Message = {
    async send(channelId, message) {
        try {
            const channel = await client.channels.fetch(channelId);
            return await channel.send(message);
        } catch (e) {
            console.error(`❌發送訊息時出現問題: ${e}`);
        }
    },
    async delete(channelId, messageId) {
        try {
            const channel = client.channels.cache.get(channelId);
            return await channel.messages.fetch(messageId)
                .then(msg => msg.delete());
        } catch (e) {
            console.error(`❌刪除訊息時出現問題: ${e}`);
        }
    },
    async edit(channelId, messageId, message) {
        try {
            const channel = await client.channels.fetch(channelId);
            const fetchedMessage = await channel.messages.fetch(messageId);
            return await fetchedMessage.edit(message);
        } catch (e) {
            console.error(`❌編輯訊息時出現問題: ${e}`);
        }
    },
}

const Game = {
    // 建立遊戲
    control: {
        async mute(members) {
            members = Array.isArray(members) ? members : [members];
            for (const member of members) {
                try {
                    await member.voice.setMute(true, '靜音');
                } catch (e) { console.error(e); }
            }
        },
        async unmute(members) {
            members = Array.isArray(members) ? members : [members];
            for (const member of members) {
                try {
                    await member.voice.setMute(false, '解除靜音');
                } catch (e) { console.error(e); }
            }
        },
    },
    async create(guild, categoryId) {
        /** 建立頻道
         * @param {string} channelName 頻道名稱
         * @param {string} channelTopic 頻道說明
         * @param {number} channelType 頻道類型 0文字 2語音
         * @param {string} channelCategoryId 頻道分類
         * @param {number} channelPos 頻道位置
         * @param {[string]} permissionAllows 權限(允許)
         * @param {[string]} permissionDenys 權限(禁止)
         * @returns {string} 頻道ID
         */
        async function createChannel(
            channelName = '-', channelTopic = null, channelType = 0,
            channelCategoryId = null, channelPos = null,
            permissionAllows = ['SendMessages'], permissionDenys = ['ViewChannel']
        ) {
            const channel = await guild.channels.create({
                name: channelName,
                type: channelType,            // 0 = 文字頻道, 2 = 語音頻道 (Voice)
                parent: channelCategoryId,
                topic: channelTopic,
                position: channelPos,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: permissionAllows,
                        deny: permissionDenys
                    }
                ]
            });
            console.log(`已建立頻道${channel.id}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return channel.id;
        }
        // const category = client.channels.cache.get(categoryId);
        const guildId = guild.id;
        const channelMain = await createChannel('公共頻道', '所有玩家都看的到', 0, categoryId);
        const channelWolf = await createChannel('狼人頻道', '只有狼人看的到', 0, categoryId);
        const channelVoice = await createChannel('語音頻道', null, 2, categoryId);
        const channelPlayers = [];
        // return; //#TODO TEMP setting
        for (let index = 1; index <= 15; index++) {// #TODO change here
            channelPlayers.push(await createChannel(`${index}號個人頻道`, '只有你看的到', 0, categoryId));
        }
        const playData = {
            "roles": {
                "witch": 0,
                "seer": 0,
                "hunter": 0,
                "guard": 0,
                "knight": 0,
                "sheriff": 0,
                "idiot": 0
            },
            "werewolfs": [],
            "seats": [
                null, null, null,
                null, null, null,
                null, null, null,
            ],
            "alive": [
                true, true, true,
                true, true, true,
                true, true, true
            ],
            "voted": [
                false, false, false,
                false, false, false,
                false, false, false
            ],
            "talking": "",
            "reverseTalking": false,
            "lastGuard": null,
            "isPlaying": false
        };
        const configData = {
            "ops": [],
            "channel": {
                "per": channelPlayers,
                "mains": {
                    "category": null,
                    "oldMessage": null
                },
                "vote": {
                    "category": null,
                    "oldMessage": null
                },
                "seats": {
                    "category": null,
                    "oldMessage": null
                },
                "voice": channelVoice,
                "main": channelMain,
                "werewolf": channelWolf
            },
            "Timer": {
                "Day": 60,
                "Night": 30,
                "LastWords": 60,
                "Vote": 15,
                "misc": 5
            },
            "Gods": {
                "witch": true,
                "seer": true,
                "hunter": true,
                "guard": false,
                "knight": false,
            },
            "playerCount": 9,
            "canWitchSaveSelf": true,
            "canWerewolfExplode": false,
            "sheriff": false,
            "idiot": false,
            "sheriffVoteValue": 1.5
        };
        await fs.promises.writeFile(getPlayPath(guildId, categoryId), JSON.stringify(playData, null, 4), 'utf-8');
        await fs.promises.writeFile(getConfigPath(guildId, categoryId), JSON.stringify(configData, null, 4), 'utf-8');
        return playData;
    },
    async fix(guild, categoryId) { },
    async start(guild, categoryId) {
        const configPath = getConfigPath(guild.id, categoryId);
        const playPath = getPlayPath(guild.id, categoryId);
        const configData = await getConfig(configPath);
        let playData = await getPlay(playPath);
        let numbersAr = [];
        // 隨機分配角色
        for (let i = 1; i <= configData.playerCount; i++) { numbersAr.push(i); }
        numbersAr = randomShuffle(numbersAr);
        let index = 0;
        Object.entries(configData.Gods).forEach(([key, value]) => {
            if (key in playData.roles) { // 神職 from config.Gods.<name>:
                if (value) {
                    playData.roles[key] = numbersAr[index];
                    index++;
                } else { playData.roles[key] = 0; }
            }
        });
        playData.werewolfs = []; // 狼人 to play.werewolfs[]
        for (let i = 1; i <= configData.playerCount / 3; i++) {
            playData.werewolfs.push(numbersAr[index++]);
        }
        // #TODO is idiot?
        console.log(playData.roles);
        console.log(playData.werewolfs);
        await updateJsonField(playPath, 'roles', playData.roles);
        await updateJsonField(playPath, 'werewolfs', playData.werewolfs);
        // 暱稱、權限設置
        for (let i = 0; i < configData.playerCount; i++) {
            console.log(playData.seats[i]);
            // const user = client.users.cache.get(playData.seats[i]);
            const member = guild.members.cache.get(playData.seats[i]);
            const channelId = configData.channel.per[i];
            const channel = channelId ? await client.channels.fetch(channelId).catch(() => null) : null;
            if (member) {
                member.setNickname(
                    `${"①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮"[i]}-${member.user.globalName ?? member.user.username}`
                )
                    .then(updated => console.log(`✅已將暱稱修改為：${updated.nickname}`))
                    .catch(console.error);
                console.log(`Name: \`${member?.user?.username}\`, ID: \`${member?.user?.id}\`.`)
            }
            if (channel && playData.seats[i]) { //權限
                await channel.permissionOverwrites.edit(playData.seats[i], {
                    ViewChannel: true,
                    SendMessages: true
                }).then(() => {
                    console.log('✅ 已允許該角色查看頻道');
                }).catch(console.error);
            }
        }
        /*
        Message.send(configData.channel.main, {
            embeds: [getEmbed.gameDescription(), getEmbed.gameTheOptions(configData)]
        });
        */
        Message.send(configData.channel.main, {
            content: "遊戲開始"
        });
        playData.isPlaying = true;
        await updateJsonField(playPath, 'isPlaying', true);
        setTimeout(() => this.night(configPath, playPath, 1), configData.Timer.misc * 1000);
    },
    async end(configPath, playPath, day) {
        const configData = await getConfig(configPath);
        let playData = await getPlay(playPath);
        for (const channelId of configData.channel?.per || []) {
            if (channelId) {
                const channel = await client.channels.fetch(channelId);
                if (!channel) return console.log('❌ 頻道未找到');
                for (const overwrite of channel.permissionOverwrites.cache.values()) {
                    if (overwrite.id !== channel.guild.roles.everyone.id) {
                        await channel.permissionOverwrites.delete(overwrite.id)
                            .then(() => console.log(`✅ 已移除 ${overwrite.id} 的權限`))
                            .catch(console.error);
                    }
                }
            }
        }
        if (configData.channel.werewolf) {
            const channel = await client.channels.fetch(configData.channel.werewolf);
            if (!channel) return console.log('❌ 頻道未找到');
            for (const overwrite of channel.permissionOverwrites.cache.values()) {
                if (overwrite.id !== channel.guild.roles.everyone.id) {
                    await channel.permissionOverwrites.delete(overwrite.id)
                        .then(() => console.log(`✅ 已移除 ${overwrite.id} 的權限`))
                        .catch(console.error);
                }
            }
        }
        console.log(`End The Game, Day: ${day}`);
        playData.isPlaying = false;
        await updateJsonField(playPath, 'isPlaying', playData.isPlaying);

        // call 結果 各角色 #TODO
        {
            if (
                configData.channel.mains.orgChannel
                &&
                configData.channel.mains.orgMessage
            ) {
                //如果有舊的 刪除舊的
                await Message.delete(
                    configData.channel.mains.orgChannel,
                    configData.channel.mains.orgMessage
                );
            }
            const message = await Message.send(configData.channel.mains.orgChannel, {
                content: '遊戲面板',
                components: await callPanel.main(false)
            });
            await updateJsonField(configPath, 'channel.mains.orgMessage', message.id);
        }
    },
    async day(configPath, playPath, day) {
        const configData = await getConfig(configPath);
        let playData = await getPlay(playPath);
        Message.send(configData.channel.main, "白天");
        console.log(`Day`);
        // 檢測人數 狼人是否獲勝
        setTimeout(() => this.end(configPath, playPath, day), configData.Timer.misc * 1000);
    },
    async night(configPath, playPath, day) {
        const configData = await getConfig(configPath);
        let playData = await getPlay(playPath);
        // 禁麥 #TODO
        // get voice members
        const voiceChannel = client.channels.fetch(configData.channel.voice).catch(() => null);
        if (!voiceChannel || !voiceChannel.isVoiceBased()) return;
        const members = voiceChannel.members;
        for (const member of members.values()) {
            this.control.mute(member);  // 禁音
        }
        if (configData.channel.werewolf) {
            // 狼頻道權限
            const channel = await client.channels.fetch(configData.channel.werewolf).catch(() => null);
            for (const werewolf of playData.werewolfs) {
                if (!channel) break;
                await channel.permissionOverwrites.edit(playData.seats[werewolf], {
                    ViewChannel: true,
                    SendMessages: true
                }).catch(console.error);
            }
        }
        Message.send(configData.channel.main, "晚上");
        console.log(`Night`);
        setTimeout(() => this.day(configPath, playPath, day + 1), configData.Timer.misc * 1000);
    },
};

const getEmbed = {
    gameDescription() {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('狼人殺')
            .setDescription('屠邊局')
            .setThumbnail(process.env.GAME_PNG_HTTP)
            .addFields(
                { name: '好人', value: '找出並淘汰所有狼人', inline: false },
                { name: '狼人', value: '隱藏身份，淘汰其他好人', inline: false }
            )
            .setFooter({ text: '狼人殺機器人', iconURL: process.env.GAME_PNG_HTTP })
            .setTimestamp();
        return embed;
    },
    gameTheOptions(configData) {
        const theRoles = ['平民'];
        if (configData.Gods.seer) theRoles.push('預言家');
        if (configData.Gods.witch) theRoles.push('女巫');
        if (configData.Gods.hunter) theRoles.push('獵人');
        if (configData.Gods.guard) theRoles.push('守衛');
        if (configData.Gods.knight) theRoles.push('騎士');
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            // .setTitle('狼人殺')
            // .setDescription('屠邊局')
            .addFields(
                { name: '人數', value: `${configData.playerCount}`, inline: true },
                { name: '角色', value: theRoles.join(' '), inline: true }
            )
            .setFooter({ text: '狼人殺機器人', iconURL: process.env.GAME_PNG_HTTP })
            .setTimestamp();
        return embed;
    },
    gameDay(day, isNight = false) {
        const embed = new EmbedBuilder()
            .setColor(isNight ? 0x414141 : 0xdedede)
            .setTitle(`第${day}天`)
            .setDescription(isNight ? '晚上' : '白天')
            .addFields(
                { name: '好人', value: '找出並淘汰所有狼人', inline: false },
                { name: '狼人', value: '隱藏身份，淘汰其他好人', inline: false }
            ) // #TODO
            .setFooter({ text: '狼人殺機器人', iconURL: process.env.GAME_PNG_HTTP })
            .setTimestamp();
        return embed;
    },
}

// 呼叫 Panel
const callPanel = {
    // 呼叫 遊戲panel
    async main(isStart) {
        const row = new ActionRowBuilder().addComponents(
            // #TODO
            new ButtonBuilder()
                .setCustomId('start_game')
                .setLabel(isStart ? '遊戲中' : '開始遊戲')
                .setDisabled(isStart)
                .setStyle(isStart ? ButtonStyle.Secondary : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('call.settingPanel')
                .setLabel('設定')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isStart),
            new ButtonBuilder()
                .setCustomId('call.seatPanel')
                .setLabel('座位')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isStart)
        );
        return [row];
    },
    /** 呼叫 多功能 panel
     * @param {number} rowCount 行數
     * @param {number: 1 ~ 5} rowButtonCount 每行按鈕數量
     * @param {string} optionId 按鈕ID Prefix
     * @param {number} firstId 第一個按鈕ID
     * @param {[boolean]} disableAr 禁用按鈕[]
     * @param {[ButtonStyle]} styleAr 按鈕樣式[]
     */
    async CustomButton(
        rowCount, rowButtonCount, optionId = "", firstId = 1, disableAr = [], styleAr = []
    ) {
        if (rowButtonCount > 5) { throw new Error('rowButtonCount only support 1~5'); }
        if (rowCount > 5) { throw new Error('rowCount only support 1~5'); }
        const rows = [];
        for (let iButton = firstId - 1, iRow = 0; iRow < rowCount; iRow++) {
            const row = new ActionRowBuilder();
            for (let ii = 0; ii < rowButtonCount; ii++, iButton++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${optionId}.${iButton + 1}`).setLabel(`${iButton + 1}`)
                        .setStyle(styleAr[iButton] ? styleAr[iButton] : ButtonStyle.Primary)
                        .setDisabled(disableAr[iButton] ?? false)
                );
            }
            rows.push(row);
        }
        return rows;
    },
    // 呼叫 設定panel
    async setting(configPath) {
        let configData = await getConfig(configPath);
        const row0 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call.mainPanel.bySettingPanel').setLabel('返回').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call.settingTimerPanel.bySettingPanel').setLabel('時間選項').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('call.settingRolePanel.bySettingPanel').setLabel('角色選項').setStyle(ButtonStyle.Primary)
        );
        const row1 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('config.set.playerCount')
                .setPlaceholder(`${configData.playerCount}人局`)
                .addOptions([
                    {
                        label: '3人局',
                        value: '3',
                    },
                    {
                        label: '6人局',
                        value: '6',
                    },
                    {
                        label: '9人局',
                        value: '9',
                    },
                    {
                        label: '12人局',
                        value: '12',
                    },
                    {
                        label: '15人局',
                        value: '15',
                    },
                    /*
                    * cause problem still unsolve
                    {
                        label: '18人局',
                        value: '18',
                    },
                    */
                ]),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config.toggle.canWitchSaveSelf').setLabel('女巫自救')
                .setStyle(configData.canWitchSaveSelf ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('config.toggle.canWerewolfExplode').setLabel('狼人自爆')
                .setStyle(configData.canWerewolfExplode ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('config.toggle.sheriff').setLabel('競選警長')
                .setStyle(configData.sheriff ? ButtonStyle.Success : ButtonStyle.Danger),
            // 白癡role
        );
        return [row0, row1, row2];
    },
    // 呼叫 座位panel
    async seat(buttonCount, optionId = "bypass.seat", disableAr = [], styleAr = []) {
        const rows = [];
        for (let i = 0; i < buttonCount;) {
            const row = new ActionRowBuilder();
            for (let ii = 0; ii < 3; ii++, i++) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${optionId}.${i + 1}`).setLabel(`${"①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮"[i]}`)
                        //"①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
                        .setStyle(styleAr[i] ? styleAr[i] : ButtonStyle.Primary)
                        .setDisabled(disableAr[i] ?? false)
                );
            }
            rows.push(row);
        }
        return rows;
    },
    // 呼叫 角色panel
    async roles(configPath) {
        let configData = await getConfig(configPath);
        const row0 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call.mainPanel.bySettingPanel').setLabel('返回').setStyle(ButtonStyle.Secondary)
        );
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config.toggle.Gods.witch').setLabel('女巫')
                .setStyle(configData.Gods.witch ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('config.toggle.Gods.seer').setLabel('預言家')
                .setStyle(configData.Gods.seer ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('config.toggle.Gods.hunter').setLabel('獵人')
                .setStyle(configData.Gods.hunter ? ButtonStyle.Success : ButtonStyle.Danger),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config.toggle.Gods.guard').setLabel('守衛')
                .setStyle(configData.Gods.guard ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('config.toggle.Gods.knight').setLabel('騎士')
                .setStyle(configData.Gods.knight ? ButtonStyle.Success : ButtonStyle.Danger),
        );
        return [row0, row1, row2];
    },
    // 呼叫 發言panel
    async talking() { },
    // 呼叫 投票panel
    async vote() { },
};

// 啟動執行項
client.once('ready', async () => {
    console.log(`🟢機器人已啟動，登入為 ${client.user.tag}`);
    log('🟢機器人已啟動');
});

// 訊息event
client.on('messageCreate', async (message) => {
    return;
    if (message.author.bot) return;
    // alpha版本僅限官方伺服器
    if (message.guild.id !== ALPHA) { return; }
    if (message.content === '!toggleButton') {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_button')
                    .setLabel('紅色')
                    .setStyle(ButtonStyle.Danger)
            );

        await message.reply({ content: '點擊按鈕來切換顏色：', components: [row] });
    }
    if (message.content === '!buttons') {
        // 創建 3x4 的按鈕矩陣
        const playerCountButton = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('playerCountSetting')
                .setPlaceholder('人數設定')
                .addOptions([
                    {
                        label: '3人',
                        value: '3',
                    },
                    {
                        label: '6人',
                        value: '6',
                    },
                    {
                        label: '9人',
                        value: '9',
                    },
                    {
                        label: '12人',
                        value: '12',
                    },
                    {
                        label: '15人',
                        value: '15',
                    },
                    {
                        label: '18人',
                        value: '18',
                    },
                ]),
        );
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buntton_player').setLabel('人數').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('button_2').setLabel('Button 2').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('button_3').setLabel('Button 3').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('button_4').setLabel('Button 4').setStyle(ButtonStyle.Primary)
        );

        // 發送按鈕訊息
        await message.reply({
            content: '請選擇一個按鈕：',
            components: [playerCountButton, row1]
        });
    }
});

// interaction 交互 event
client.on('interactionCreate', async (interaction) => {
    // alpha版本僅限官方伺服器
    if (interaction.guild.id !== ALPHA) {
        interaction.reply({
            content: '❌目前為Alpha版本 僅限官方伺服器使用',
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }
    const categoryId = interaction.channel.parentId;
    if (!categoryId) {
        await interaction.reply({
            content: `❌此頻道不在任何類別裡`,
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }

    // 前置指令 不含類別
    if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
        && interaction.isCommand()) {
        const { commandName } = interaction;
        if (commandName === 'create_game') {
            if (createGameLastCD < Math.floor(Date.now() / 1000)) {
                createGameLastCD = Math.floor(Date.now() / 1000) + CREATE_GAME_CD;
                const category = interaction.options.getChannel('category');
                const categoryId = category.id;
                console.log(categoryId);
                //檢查是否已經有遊戲
                if (await isFileExists(getConfigPath(interaction.guildId, categoryId))) {
                    await interaction.reply({
                        content: `❌已經有遊戲`,
                        flags: [MessageFlags.Ephemeral]
                    });
                    console.log('❌已經有遊戲');
                    return;
                } else {
                    await interaction.reply({
                        content: `⚙️建立遊戲房中，請耐心等候...`
                    });
                    console.log(`測試訊息，建立成功`); return; // #TODO TEST
                    await Game.create(interaction.guild, categoryId);
                    return;
                }
            } else {
                await interaction.reply({
                    content: `❌ 指令冷卻中，請稍後再試`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }
    }
    // data const 無法更新 may cause problem @here
    const configPath = getConfigPath(interaction.guild.id, categoryId);
    const playPath = getPlayPath(interaction.guild.id, categoryId);
    const configData = await getConfig(configPath);
    const playData = await getPlay(playPath);
    if (!configData || !playData) {
        await interaction.reply({
            content: `❌此類別沒有建立遊戲/發生錯誤`,
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }
    let keys = [];
    if (interaction.customId) keys = interaction.customId.split('.');
    // 權限檢查 限管理員 除了 bypass.
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !configData.ops.includes(interaction.member.id) && (keys[0] !== 'bypass')) {
        interaction.reply({
            content: '❌你沒有權限這麼做',
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }
    if (keys[0] === 'bypass') keys.shift();
    if (interaction.isCommand()) {
        // ❇️指令呼叫
        const { commandName } = interaction;
        switch (commandName) {
            case 'panel': {
                if (
                    configData.channel.mains.orgChannel
                    &&
                    configData.channel.mains.orgMessage
                ) {
                    //如果有舊的 刪除舊的
                    await Message.delete(
                        configData.channel.mains.orgChannel,
                        configData.channel.mains.orgMessage
                    );
                }
                await interaction.reply({
                    content: '遊戲面板',
                    components: await callPanel.main(false),
                    withResponse: true
                });
                const message = await interaction.fetchReply();
                configData.channel.mains = {
                    "orgChannel": message.channelId,
                    "orgMessage": message.id
                };
                await updateJsonField(configPath, 'channel.mains', configData.channel.mains);
            }
                break;
            case 'op': {
                const user = interaction.options.getUser('user');
                if (configData.ops.includes(user.id)) {
                    await interaction.reply({
                        content: `❌\`${user.tag}\` ID: \`${user.id}\` 已是管理員`,
                        flags: [MessageFlags.Ephemeral]
                    });
                } else {
                    configData.ops.push(user.id);
                    await updateJsonField(configPath, 'ops', configData.ops);
                    await interaction.reply({
                        content: `✅新增管理員 \`${user.tag}\` ID: \`${user.id}\``,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } break;
            case 'deop': {
                const user = interaction.options.getUser('user');
                if (configData.ops.includes(user.id)) {
                    configData.ops = configData.ops.filter(item => item !== user.id);
                    await updateJsonField(getConfigPath(
                        interaction.guild.id,
                        categoryId
                    ), 'ops', configData.ops);
                    await interaction.reply({
                        content: `✅移除管理員 \`${user.tag}\` ID: \`${user.id}\``,
                        flags: [MessageFlags.Ephemeral]
                    });
                } else {
                    await interaction.reply({
                        content: `❌\`${user.tag}\` ID: \`${user.id}\` 不是管理員`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } break;
            case 'kick': {
                const user = interaction.options.getUser('user');
                if (playData.seats.includes(user.id)) {
                    playData.seats.forEach((value, index) => {
                        if (value === user.id) playData.seats[index] = null;
                    });
                    await updateJsonField(playPath, 'seats', playData.seats);
                    if (configData.channel.seats.orgChannel && configData.channel.seats.orgMessage) {
                        const dis = playData.seats.map(v => v ? true : false);
                        await Message.edit( //更新座位區
                            configData.channel.seats.orgChannel,
                            configData.channel.seats.orgMessage,
                            {
                                content: `座位區`,
                                components: await callPanel.seat(
                                    configData.playerCount,
                                    "bypass.seat", dis
                                )
                            }
                        );
                    }
                    await interaction.reply({
                        content: `✅將\`${user.tag}\` ID: \`${user.id}\` 從座位上抱起`
                    });
                } else {
                    await interaction.reply({
                        content: `❌\`${user.tag}\` ID: \`${user.id}\` 不在座位上`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } break;
            default: break;
        }
    }
    // customId (others interactions)
    else if (interaction.customId) {
        switch (keys[0]) {
            // ❇️按鈕等呼叫
            case 'config':
                // config 設定
                if (!keys[1]) { console.log('❌keys[1] null'); break; }
                switch (keys[1]) {
                    case 'toggle':
                        // config.toggle.
                        if (!keys[2]) { console.log('❌keys[2] null'); break; }
                        switch (keys[2]) {
                            case 'Gods': {
                                if (!keys[3]) { console.log('❌keys[3] null'); break; }
                                await updateJsonField(getConfigPath(
                                    interaction.guild.id,
                                    categoryId
                                ), `Gods.${keys[3]}`, !configData.Gods[keys[3]]);
                                await interaction.update({
                                    content: '設定面板',
                                    components: await callPanel.roles(configPath)
                                });
                            } break;
                            default: {
                                await updateJsonField(getConfigPath(
                                    interaction.guild.id,
                                    categoryId
                                ), keys[2], !configData[keys[2]]);
                                await interaction.update({
                                    content: '設定面板',
                                    components: await callPanel.setting(configPath)
                                });
                            } break;
                        } break;
                    case 'set':
                        // config.set.
                        if (!keys[2]) { console.log('❌keys[2] null'); break; }
                        const selectedValue = interaction.values[0];
                        const numberValue = parseFloat(selectedValue);
                        await updateJsonField(getConfigPath(
                            interaction.guild.id,
                            categoryId
                        ), keys[2], numberValue);
                        await interaction.update({
                            content: '設定面板',
                            components: await callPanel.setting(configPath)
                        });
                        break;
                    default: break;
                }
                break;
            case 'call':
                // 呼叫 面板
                if (!keys[1]) { console.log('❌keys[1] null'); break; }
                switch (keys[1]) {
                    case 'mainPanel': {
                        await interaction.update({
                            content: '遊戲面板',
                            components: await callPanel.main(playData.isPlaying)
                        });
                    }
                        break;
                    case 'seatPanel': {
                        if (
                            configData.channel.seats.orgChannel
                            &&
                            configData.channel.seats.orgMessage
                        ) {
                            await Message.delete(
                                configData.channel.seats.orgChannel,
                                configData.channel.seats.orgMessage
                            );
                        }
                        const dis = playData.seats.map(v => v ? true : false);
                        await interaction.reply({
                            content: '座位區',
                            components: await callPanel.seat(configData.playerCount, "bypass.seat", dis),
                            withResponse: true
                        });
                        const message = await interaction.fetchReply();
                        configData.channel.seats = {
                            "orgChannel": message.channelId,
                            "orgMessage": message.id
                        };
                        await updateJsonField(configPath, 'channel.seats', configData.channel.seats);
                    } break;
                    case 'settingPanel': {
                        if (playData.isPlaying) {
                            await interaction.reply({
                                content: '❌遊戲中，無法進行設定',
                                flags: [MessageFlags.Ephemeral]
                            });
                        } else {
                            await interaction.update({
                                content: '設定面板',
                                components: await callPanel.setting(configPath)
                            });
                        }
                    } break;
                    case 'settingTimerPanel':
                        break;
                    case 'settingRolePanel':
                        await interaction.update({
                            content: '設定面板',
                            components: await callPanel.roles(configPath)
                        });
                        break;
                    default: break;
                }
                break;
            case 'seat': {
                if (!keys[1]) { console.log('❌keys[1] null'); break; }
                // seat 坐下
                //檢查椅子上是否有人 是否在語音頻道
                // #TODO 離座按鈕?
                if (interaction.member.voice.channel) {
                    if (interaction.member.voice.channel.id === configData.channel.voice) {
                        const seatId = parseInt(keys[1], 10);
                        if (!playData.seats[seatId - 1]) {
                            playData.seats.forEach((value, index) => {
                                // 抱離原本座位(如果有)
                                if (value === interaction.member.id) playData.seats[index] = null;
                            });
                            playData.seats[seatId - 1] = interaction.member.id;
                            const dis = playData.seats.map(v => v ? true : false);
                            await updateJsonField(playPath, 'seats', playData.seats);
                            await interaction.update({
                                content: `座位區`,
                                components: await callPanel.seat(configData.playerCount, "bypass.seat", dis)
                            });
                            await interaction.followUp({
                                content: `✅你成功坐到${keys[1]}號座位上`,
                                flags: [MessageFlags.Ephemeral]
                            });
                        } else {
                            await interaction.reply({
                                content: `❌ ${keys[1]}號座位已經有人`,
                                flags: [MessageFlags.Ephemeral]
                            });
                        }
                    } else {
                        await interaction.reply({
                            content: `❌你需要在指定語音的頻道`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } else {
                    await interaction.reply({
                        content: `❌你需要先加入語音頻道`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
                //更新playJSON
                if (!keys[1]) { console.log('❌keys[1] null'); break; }
            } break;
            case 'start_game':
                const seatPlayerCount = playData.seats.slice(0, configData.playerCount - 1).filter(item => item !== null).length;
                if (true || seatPlayerCount === configData.playerCount) { // TEST #TODO
                    //if (seatPlayerCount === configData.playerCount) {
                    const godsCount = Object.entries(configData.Gods).filter(
                        ([key, value]) => value === true
                    ).length;
                    if (true || godsCount == Math.floor(seatPlayerCount / 3)) { // TEST #TODO
                        console.log(`Start The Game`);
                        Game.start(interaction.guild, categoryId);
                        // 開始
                        // #TODO
                        await interaction.update({
                            content: '遊戲面板',
                            components: await callPanel.main(true)
                        });
                    } else {
                        await interaction.reply({
                            content: `❌神職數量不符，請重新配置神職數量`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } else {
                    await interaction.reply({
                        content: `❌人數不足`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
                // 檢測在座人數
                // 檢測角色數量 與人數配置
                break;
            default: break;
        }
    }
});

// 語音事件
client.on('voiceStateUpdate', async (oldState, newState) => {
    // alpha版本僅限官方伺服器
    // console.log(newState.channel.members);
    if (newState.guild.id !== ALPHA) { console.log('not Alpha'); return; }
    if (!oldState.channel && newState.channel) {
        // 加入
        const member = newState.member;
        const configPath = getConfigPath(newState.guild.id, newState.channel.parent?.id);
        const playPath = getPlayPath(newState.guild.id, newState.channel.parent?.id);
        const configData = await getConfig(configPath);
        let playData = await getPlay(playPath);
        if (!configData || !playData) { return; }
        if (member.nickname) { // 恢復暱稱
            if (!playData.seats.includes(member.id)) {
                member.setNickname(
                    `${member?.user.globalName ?? member?.user.username}`
                )
                    .then(updated => console.log(`✅已將暱稱修改為：${updated.nickname}`))
                    .catch(console.error);
                console.log(`Name: \`${member?.user.username}\`, ID: \`${member?.user.id}\`.`)
            }
        }
        if (playData.isPlaying) {
            //遊戲中
            if ((member.id !== playData.talking) && member.voice.mute) {
                Game.control.mute(member);
            }
        } else {
            //非遊戲中
        }
    } else if ((oldState.channel && !newState.channel) || (oldState.channel !== newState.channel)) {
        //退出或切換
        if (!oldState.channel.parent) { return; }
        const configPath = getConfigPath(oldState.guild.id, oldState.channel.parent?.id);
        const playPath = getPlayPath(oldState.guild.id, oldState.channel.parent?.id);
        const configData = await getConfig(configPath);
        let playData = await getPlay(playPath);
        if (!configData || !playData) { return; }
        const channel = client.channels.cache.get(configData.channel.voice);
        // 非遊戲中
        if (!playData.isPlaying) {
            // 抱離座位
            const memberIds = channel.members.map(member => member.id) || [];
            playData.seats.forEach((value, index) => {
                if (!memberIds.includes(value)) playData.seats[index] = null;
            });
            if (configData.channel.seats.orgChannel && configData.channel.seats.orgMessage) {
                const dis = playData.seats.map(v => v ? true : false);
                await Message.edit( //更新座位區
                    configData.channel.seats.orgChannel,
                    configData.channel.seats.orgMessage,
                    {
                        content: `座位區`,
                        components: await callPanel.seat(
                            configData.playerCount,
                            "bypass.seat", dis
                        )
                    }
                );
            }
            playData = await updateJsonField(playPath, 'seats', playData.seats);
        } else {
            //遊戲中
        }
    }
    // #TODO 遊戲中加入遊戲語音頻道將禁音 當遊戲結束狀態加入 則取消禁音
});


// 關閉執行項
process.on('SIGINT', async () => {
    console.log('🔴機器人關閉中...');
    // 確保機器人已登入
    if (!client || !client.isReady()) { process.exit(0); }
    log('🔴機器人關閉中...');
    setTimeout(() => process.exit(0), 1000);
});

// 機器人登入
client.login(process.env.TOKEN);