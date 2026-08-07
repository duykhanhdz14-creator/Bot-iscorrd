const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const fs = require('fs');
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

const commandFiles = fs
    .readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'discord.js' && file !== 'deploy-commands.js');

for (const file of commandFiles) {
    const command = require(`./${file}`);

    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ ${file} missing required properties`);
    }
}

// ===== BOT READY =====
client.once(Events.ClientReady, client => {
    console.log(`✅ Đăng nhập thành công: ${client.user.tag}`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log(`🎮 Commands: ${client.commands.size}`);
});

// ===== INTERACTION =====
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "❌ Có lỗi xảy ra.",
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: "❌ Có lỗi xảy ra.",
                ephemeral: true
            });
        }
    }
});

// ===== LOGIN =====
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ Không tìm thấy DISCORD_TOKEN.");
    process.exit(1);
}

console.log("✅ Token đã được đọc.");

client.login(process.env.DISCORD_TOKEN);
