const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ===== LOAD COMMANDS =====
client.commands = new Collection();

const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'discord.js' && file !== 'deploy-commands.js');

for (const file of commandFiles) {
    const command = require(`./${file}`);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ ${file} missing required properties`);
    }
}

// Event khi bot sẵn sàng
client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot ${c.user.tag} đã sẵn sàng!`);
    console.log(`📊 Đang hoạt động trong ${c.guilds.cache.size} server`);
    console.log(`🎲 Đã load ${client.commands.size} lệnh`);
});

// Xử lý interaction
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`❌ Không tìm thấy lệnh ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Lỗi khi thực thi ${interaction.commandName}:`, error);
        await interaction.reply({
            content: '❌ Đã xảy ra lỗi khi thực thi lệnh!',
            ephemeral: true
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
