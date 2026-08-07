const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot ${c.user.tag} đã sẵn sàng!`);
    console.log(`📊 Đang hoạt động trong ${c.guilds.cache.size} server`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        const sent = await interaction.reply({ content: '🏓 Đang ping...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong!\n- Độ trễ: ${latency}ms\n- API: ${Math.round(client.ws.ping)}ms`);
    }

    if (interaction.commandName === 'hello') {
        await interaction.reply(`👋 Xin chào ${interaction.user.username}!`);
    }
});

client.login(process.env.DISCORD_TOKEN);
