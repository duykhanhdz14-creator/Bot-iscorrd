cat > discord.js << 'EOF'
const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

console.log('🟢 Bot đang khởi động...');

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

// Load commands từ games.js
try {
    console.log('📂 Đang load games.js...');
    const gamesCommands = require('./games.js');
    console.log(`📋 games.js type: ${typeof gamesCommands}`);
    console.log(`📋 Is array: ${Array.isArray(gamesCommands)}`);
    
    if (Array.isArray(gamesCommands)) {
        for (const command of gamesCommands) {
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded: ${command.data.name}`);
            } else {
                console.log(`⚠️ Command thiếu data hoặc execute`);
            }
        }
    } else {
        console.log(`⚠️ games.js không export array, đang export: ${typeof gamesCommands}`);
    }
} catch (error) {
    console.error('❌ Lỗi load games.js:', error.message);
}

console.log(`📊 Total commands: ${client.commands.size}`);

// ===== BOT READY =====
client.once(Events.ClientReady, client => {
    console.log(`✅ Đăng nhập thành công: ${client.user.tag}`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log(`🎮 Commands: ${client.commands.size}`);
    console.log(`📋 Commands list: ${client.commands.map(c => '/' + c.data.name).join(', ')}`);
});

// ===== INTERACTIONS =====
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(`❌ Lỗi execute command:`, err);
        await interaction.reply({
            content: "❌ Có lỗi xảy ra.",
            ephemeral: true
        }).catch(() => {});
    }
});

// ===== LOGIN =====
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ Không tìm thấy DISCORD_TOKEN");
    process.exit(1);
}

console.log("✅ Token đã được đọc. Đang đăng nhập...");

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Lỗi login:', error.message);
    process.exit(1);
});
EOF
