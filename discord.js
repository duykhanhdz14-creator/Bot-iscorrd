const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

// Tạo client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Event khi bot sẵn sàng
client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot ${c.user.tag} đã sẵn sàng!`);
    console.log(`📊 Đang hoạt động trong ${c.guilds.cache.size} server`);
});

// Xử lý lệnh slash
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Lệnh ping
    if (interaction.commandName === 'ping') {
        const sent = await interaction.reply({ content: '🏓 Đang ping...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong!\n- Độ trễ: ${latency}ms\n- API: ${Math.round(client.ws.ping)}ms`);
    }

    // Lệnh hello
    if (interaction.commandName === 'hello') {
        await interaction.reply(`👋 Xin chào ${interaction.user.username}!`);
    }
});

// Đăng nhập bot
client.login(process.env.DISCORD_TOKEN);
