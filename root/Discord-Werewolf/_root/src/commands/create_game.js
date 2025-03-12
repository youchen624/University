const { SlashCommandBuilder, ChannelType } = require("discord.js");

module.exports = {
    data: SlashCommandBuilder()
        .setName('create_game')
        .setDescription('創建遊戲房')
        .addChannelOption(option => option
            .setName('category')
            .setDescription('頻道分類')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        ),
    execute(interaction) {
        interaction.reply('test done');
    }
}