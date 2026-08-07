const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'ping',
        description: 'Kiểm tra độ trễ bot'
    },
    {
        name: 'hello',
        description: 'Bot chào bạn'
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Đang đăng ký commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Đăng ký thành công!');
    } catch (error) {
        console.error('❌ Lỗi:', error);
    }
})();
