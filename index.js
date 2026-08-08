const { Client, GatewayIntentBits, Events, Collection, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
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

// ===== DATA =====
const userBalances = {};
const COOLDOWN = new Set();
const DAILY_REWARDS = {};

// ===== HELPERS =====
function ensureUser(userId) {
    if (!userBalances[userId]) {
        userBalances[userId] = { balance: 1000, totalWins: 0, totalLosses: 0, totalBets: 0 };
    }
    return userBalances[userId];
}

function ensureDaily(userId) {
    if (!DAILY_REWARDS[userId]) {
        DAILY_REWARDS[userId] = { lastClaim: null, streak: 0 };
    }
    return DAILY_REWARDS[userId];
}

function rollDice() {
    const result = Math.random() < 0.5 ? 'tài' : 'xỉu';
    const number = Math.floor(Math.random() * 6) + 1;
    return { result, number };
}

function isDailyAvailable(lastClaim) {
    if (!lastClaim) return true;
    const now = new Date();
    const last = new Date(lastClaim);
    return (now - last) / (1000 * 60 * 60) >= 24;
}

function getDailyReward() {
    return Math.floor(Math.random() * 90000 + 10000);
}

// ===== LOAD COMMANDS =====
client.commands = new Collection();

// ===== COMMAND: /ping =====
client.commands.set('ping', {
    data: new SlashCommandBuilder().setName('ping').setDescription('🏓 Kiểm tra bot'),
    async execute(interaction) {
        await interaction.reply('Pong! 🏓');
    }
});

// ===== COMMAND: /huongdan =====
client.commands.set('huongdan', {
    data: new SlashCommandBuilder().setName('huongdan').setDescription('📖 Hướng dẫn sử dụng bot'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('📖 HƯỚNG DẪN SỬ DỤNG BOT')
            .setDescription('Dưới đây là tất cả lệnh và cách sử dụng:')
            .addFields(
                { name: '🎁 /free', value: 'Nhận thưởng hàng ngày (10,000 - 100,000 VND)', inline: false },
                { name: '💳 /tk', value: 'Kiểm tra số dư tài khoản', inline: false },
                { name: '🎲 /tx tài <số_tiền>', value: 'Đặt cược TÀI', inline: false },
                { name: '🎲 /tx xỉu <số_tiền>', value: 'Đặt cược XỈU', inline: false },
                { name: '💰 /chuyentien @user <số_tiền>', value: 'Chuyển tiền cho người khác', inline: false },
                { name: '🏆 /top', value: 'Bảng xếp hạng người giàu nhất', inline: false },
                { name: '📖 /huongdan', value: 'Xem hướng dẫn này', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}` });
        await interaction.reply({ embeds: [embed] });
    }
});

// ===== COMMAND: /free =====
client.commands.set('free', {
    data: new SlashCommandBuilder().setName('free').setDescription('🎁 Nhận thưởng hàng ngày'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const userData = ensureUser(userId);
        const dailyData = ensureDaily(userId);

        if (!isDailyAvailable(dailyData.lastClaim)) {
            return await interaction.reply({ content: '⏳ Bạn đã nhận thưởng hôm nay rồi! Quay lại ngày mai.', ephemeral: true });
        }

        const reward = getDailyReward();
        userData.balance += reward;
        dailyData.lastClaim = new Date();
        dailyData.streak += 1;

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🎁 NHẬN THƯỞNG THÀNH CÔNG!')
            .addFields(
                { name: '💰 Nhận được', value: `+${reward.toLocaleString()} VND`, inline: true },
                { name: '🔥 Streak', value: `${dailyData.streak} ngày`, inline: true },
                { name: '💳 Số dư mới', value: `${userData.balance.toLocaleString()} VND`, inline: false }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
});

// ===== COMMAND: /tk =====
client.commands.set('tk', {
    data: new SlashCommandBuilder()
        .setName('tk')
        .setDescription('💳 Kiểm tra số dư')
        .addUserOption(opt => opt.setName('user').setDescription('Người cần xem').setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const data = ensureUser(target.id);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`💳 Số dư của ${target.username}`)
            .addFields(
                { name: '💰 Số dư', value: `${data.balance.toLocaleString()} VND`, inline: true },
                { name: '🏆 Thắng', value: `${data.totalWins} lần`, inline: true },
                { name: '💔 Thua', value: `${data.totalLosses} lần`, inline: true }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
});

// ===== COMMAND: /tx =====
client.commands.set('tx', {
    data: new SlashCommandBuilder()
        .setName('tx')
        .setDescription('🎲 Chơi tài xỉu')
        .addSubcommand(sub => sub.setName('tài').setDescription('Đặt TÀI').addIntegerOption(opt => opt.setName('số_tiền').setDescription('Số tiền cược').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('xỉu').setDescription('Đặt XỈU').addIntegerOption(opt => opt.setName('số_tiền').setDescription('Số tiền cược').setRequired(true).setMinValue(1))),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const userData = ensureUser(userId);
        const betAmount = interaction.options.getInteger('số_tiền');

        if (COOLDOWN.has(userId)) {
            return await interaction.reply({ content: '⏳ Đợi 3 giây!', ephemeral: true });
        }

        if (betAmount > userData.balance) {
            return await interaction.reply({ content: `❌ Không đủ tiền! Bạn có ${userData.balance.toLocaleString()} VND`, ephemeral: true });
        }

        const result = rollDice();
        const isWin = sub === result.result;
        const winAmount = isWin ? betAmount : -betAmount;
        userData.balance += winAmount;
        if (isWin) userData.totalWins++;
        else userData.totalLosses++;
        userData.totalBets++;

        COOLDOWN.add(userId);
        setTimeout(() => COOLDOWN.delete(userId), 3000);

        const embed = new EmbedBuilder()
            .setColor(isWin ? 0x00FF00 : 0xFF0000)
            .setTitle(isWin ? '🎉 BẠN THẮNG!' : '😔 BẠN THUA!')
            .addFields(
                { name: '🎲 Kết quả', value: `${result.number} (${result.result.toUpperCase()})`, inline: true },
                { name: '💰 Kết quả', value: isWin ? `+${betAmount.toLocaleString()} VND` : `-${betAmount.toLocaleString()} VND`, inline: true },
                { name: '💳 Số dư mới', value: `${userData.balance.toLocaleString()} VND`, inline: false }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
});

// ===== COMMAND: /chuyentien =====
client.commands.set('chuyentien', {
    data: new SlashCommandBuilder()
        .setName('chuyentien')
        .setDescription('💰 Chuyển tiền cho người khác')
        .addUserOption(opt => opt.setName('nguoi_nhan').setDescription('Người nhận').setRequired(true))
        .addIntegerOption(opt => opt.setName('số_tiền').setDescription('Số tiền').setRequired(true).setMinValue(1)),
    async execute(interaction) {
        const senderId = interaction.user.id;
        const receiver = interaction.options.getUser('nguoi_nhan');
        const amount = interaction.options.getInteger('số_tiền');

        if (senderId === receiver.id) {
            return await interaction.reply({ content: '❌ Không thể chuyển cho chính mình!', ephemeral: true });
        }

        if (receiver.bot) {
            return await interaction.reply({ content: '❌ Không thể chuyển cho bot!', ephemeral: true });
        }

        const sender = ensureUser(senderId);
        const receiverData = ensureUser(receiver.id);

        const fee = Math.round(amount * 0.05);
        const total = amount + fee;

        if (total > sender.balance) {
            return await interaction.reply({ content: `❌ Không đủ tiền! Cần ${total.toLocaleString()} VND (gồm phí 5%)`, ephemeral: true });
        }

        sender.balance -= total;
        receiverData.balance += amount;

        const embed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('💰 CHUYỂN TIỀN THÀNH CÔNG!')
            .addFields(
                { name: '👤 Người nhận', value: receiver.username, inline: true },
                { name: '💵 Số tiền', value: `${amount.toLocaleString()} VND`, inline: true },
                { name: '💸 Phí (5%)', value: `${fee.toLocaleString()} VND`, inline: true },
                { name: '💳 Số dư của bạn', value: `${sender.balance.toLocaleString()} VND`, inline: false }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
});

// ===== COMMAND: /top =====
client.commands.set('top', {
    data: new SlashCommandBuilder().setName('top').setDescription('🏆 Bảng xếp hạng người giàu nhất'),
    async execute(interaction) {
        const sorted = Object.entries(userBalances)
            .sort((a, b) => b[1].balance - a[1].balance)
            .slice(0, 10);

        if (sorted.length === 0) {
            return await interaction.reply('📊 Chưa có dữ liệu!');
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🏆 BẢNG XẾP HẠNG NGƯỜI GIÀU NHẤT');

        let rank = 1;
        for (const [userId, data] of sorted) {
            try {
                const member = await interaction.guild.members.fetch(userId);
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                embed.addFields({
                    name: `${medal} ${member.user.username}`,
                    value: `💰 ${data.balance.toLocaleString()} VND | 🏆 ${data.totalWins} thắng | 📊 ${data.totalBets > 0 ? ((data.totalWins/data.totalBets)*100).toFixed(1) : 0}%`,
                    inline: false
                });
                rank++;
            } catch {
                // Bỏ qua nếu không tìm thấy user
            }
        }

        await interaction.reply({ embeds: [embed] });
    }
});

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
        console.error('❌ Lỗi:', err);
        await interaction.reply({ content: '❌ Có lỗi xảy ra.', ephemeral: true }).catch(() => {});
    }
});

// ===== LOGIN =====
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ Không tìm thấy DISCORD_TOKEN");
    process.exit(1);
}

console.log("✅ Đang đăng nhập...");
client.login(process.env.DISCORD_TOKEN);
