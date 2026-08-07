
const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Import lệnh từ file games.js
const txCommand = require('./games.js');

const commands = [
    txCommand.data.toJSON(),
    // Thêm các lệnh khác nếu có
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Đang xóa tất cả lệnh cũ và đăng ký lệnh mới...');
        
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
        console.log('📋 Danh sách lệnh:');
        commands.forEach(cmd => {
            console.log(`   /${cmd.name} - ${cmd.description}`);
        });
    } catch (error) {
        console.error('❌ Lỗi:', error);
    }
})();
