const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Import tất cả lệnh từ games.js
const commands = require('./games.js').map(cmd => cmd.data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Đang đăng ký lệnh...');
        
        // Xóa lệnh cũ
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: [] }
        );
        console.log('🗑️ Đã xóa lệnh cũ');

        // Đăng ký lệnh mới
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        
        console.log(`✅ Đã đăng ký ${commands.length} lệnh!`);
        commands.forEach(cmd => console.log(`   /${cmd.name}`));
    } catch (error) {
        console.error('❌ Lỗi:', error);
    }
})();
