const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ===== HỆ THỐNG LƯU TRỮ DỮ LIỆU =====
const userBalances = {};
const COOLDOWN = new Set();
const DAILY_REWARDS = {};

// ===== HÀM HỖ TRỢ =====

function ensureUser(userId) {
    if (!userBalances[userId]) {
        userBalances[userId] = {
            balance: 1000,
            totalWins: 0,
            totalLosses: 0,
            totalBets: 0,
            lastGame: null,
            totalFreeClaimed: 0,
            freeClaimCount: 0
        };
    }
    return userBalances[userId];
}

function ensureDaily(userId) {
    if (!DAILY_REWARDS[userId]) {
        DAILY_REWARDS[userId] = {
            lastClaim: null,
            streak: 0
        };
    }
    return DAILY_REWARDS[userId];
}

function rollDice() {
    const result = Math.random() < 0.5 ? 'tài' : 'xỉu';
    const number = Math.floor(Math.random() * 6) + 1;
    return { result, number };
}

function checkWin(betType, rollResult) {
    return betType === rollResult;
}

function isDailyAvailable(lastClaim) {
    if (!lastClaim) return true;
    const now = new Date();
    const last = new Date(lastClaim);
    const diffHours = (now - last) / (1000 * 60 * 60);
    return diffHours >= 24;
}

function getDailyReward() {
    const min = 10000;
    const max = 100000;
    const reward = Math.floor(Math.random() * (max - min + 1) + min);
    return Math.round(reward / 1000) * 1000;
}

// ===== LỆNH /HUONGDAN =====
// Lệnh này được đặt ở đầu để dễ tìm
{
    data: new SlashCommandBuilder()
        .setName('huongdan')
        .setDescription('📖 Hướng dẫn sử dụng tất cả lệnh trong bot'),

    async execute(interaction) {
        const guideEmbed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('📖 HƯỚNG DẪN SỬ DỤNG BOT')
            .setDescription('Dưới đây là tất cả lệnh và cách sử dụng:')
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .addFields(
                {
                    name: '🎁 **Lệnh nhận thưởng**',
                    value: '```\n/free\n```',
                    inline: false
                },
                {
                    name: '📌 Cách dùng',
                    value: '```\n• Nhận tiền thưởng hàng ngày (10,000 - 100,000 VND)\n• Mỗi 24 giờ được nhận 1 lần\n• Nhận liên tục sẽ được bonus thêm\n```',
                    inline: false
                },
                {
                    name: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
                    value: ' ',
                    inline: false
                },
                {
                    name: '💳 **Lệnh kiểm tra tài khoản**',
                    value: '```\n/tk [@user]\n```',
                    inline: false
                },
                {
                    name: '📌 Cách dùng',
                    value: '```\n• /tk - Xem số dư của bạn\n• /tk @user - Xem số dư của người khác\n• Hiển thị thống kê: thắng, thua, tỷ lệ thắng\n```',
                    inline: false
                },
                {
                    name: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
                    value: ' ',
                    inline: false
                },
                {
                    name: '🎲 **Lệnh chơi tài xỉu**',
                    value: '```\n/tx tài <số_tiền>\n/tx xỉu <số_tiền>\n/tx help\n```',
                    inline: false
                },
                {
                    name: '📌 Cách dùng',
                    value: '```\n• /tx tài 1000 - Đặt cược 1,000 VND vào TÀI\n• /tx xỉu 500 - Đặt cược 500 VND vào XỈU\n• /tx help - Xem hướng dẫn chi tiết\n```',
                    inline: false
                },
                {
                    name: '📊 Luật chơi',
                    value: '```\n• TÀI: Xúc xắc ra 4, 5, 6 (50%)\n• XỈU: Xúc xắc ra 1, 2, 3 (50%)\n• Thắng: Nhận gấp 2 lần tiền cược\n• Thua: Mất số tiền đã cược\n```',
                    inline: false
                },
                {
                    name: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
                    value: ' ',
                    inline: false
                },
                {
                    name: '📖 **Lệnh hướng dẫn**',
                    value: '```\n/huongdan\n```',
                    inline: false
                },
                {
                    name: '📌 Cách dùng',
                    value: '```\n• Hiển thị hướng dẫn tất cả lệnh\n• Thông tin cách dùng ngắn gọn\n```',
                    inline: false
                }
            )
            .addFields(
                {
                    name: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
                    value: ' ',
                    inline: false
                },
                {
                    name: '💰 **Tiền tệ trong game**',
                    value: '```\n• Mỗi người chơi được cấp 1,000 VND ban đầu\n• Kiếm tiền qua: /free, thắng cược\n• Xem số dư: /tk\n```',
                    inline: false
                },
                {
                    name: '⚠️ **Lưu ý quan trọng**',
                    value: '```\n• Không đặt cược quá số dư hiện có\n• Không spam lệnh (cooldown 3s)\n• Nhận /free mỗi 24h để có thêm vốn\n• Streak càng cao bonus càng nhiều\n```',
                    inline: false
                },
                {
                    name: '📊 **Tóm tắt nhanh**',
                    value: '```\n🎁 /free      - Nhận thưởng hàng ngày\n💳 /tk        - Kiểm tra số dư\n🎲 /tx        - Chơi tài xỉu\n📖 /huongdan  - Hướng dẫn sử dụng\n```',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `Yêu cầu bởi ${interaction.user.tag} | Bot version 1.0`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [guideEmbed] });
        console.log(`📖 ${interaction.user.tag} đã xem /huongdan`);
    }
},
// ===== LỆNH TÀI XỈU =====
{
    data: new SlashCommandBuilder()
        .setName('tx')
        .setDescription('🎲 Chơi tài xỉu - Đặt cược tài hoặc xỉu')
        .addSubcommand(subcommand =>
            subcommand
                .setName('tài')
                .setDescription('Đặt cược TÀI')
                .addIntegerOption(option =>
                    option.setName('số_tiền')
                        .setDescription('Số tiền muốn đặt cược')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('xỉu')
                .setDescription('Đặt cược XỈU')
                .addIntegerOption(option =>
                    option.setName('số_tiền')
                        .setDescription('Số tiền muốn đặt cược')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('📖 Hướng dẫn chi tiết chơi tài xỉu')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;

        if (subcommand === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎲 HƯỚNG DẪN CHƠI TÀI XỈU')
                .setDescription('Đặt cược vào kết quả của 1 viên xúc xắc (1-6)')
                .addFields(
                    { 
                        name: '📌 Cách chơi', 
                        value: '```\n/tx tài <số_tiền>\n/tx xỉu <số_tiền>\n/tk - Kiểm tra số dư\n/free - Nhận tiền thưởng hàng ngày\n/huongdan - Xem tất cả lệnh\n```', 
                        inline: false 
                    },
                    { 
                        name: '🎯 Luật chơi', 
                        value: '```\n• TÀI: Xúc xắc ra 4, 5, 6 (50%)\n• XỈU: Xúc xắc ra 1, 2, 3 (50%)\n• Thắng: Nhận gấp 2 lần tiền cược\n• Thua: Mất số tiền đã cược\n```', 
                        inline: false 
                    },
                    { 
                        name: '💰 Tiền khởi tạo', 
                        value: '```\n• Mỗi người chơi được cấp 1,000 VND\n• Thắng thua được cập nhật tự động\n```', 
                        inline: false 
                    },
                    { 
                        name: '🎁 Nhận thưởng hàng ngày', 
                        value: '```\n/free - Nhận từ 10,000 - 100,000 VND mỗi 24h\n```', 
                        inline: false 
                    },
                    { 
                        name: '⚠️ Lưu ý', 
                        value: '```\n• Không được đặt cược quá số dư hiện có\n• Không spam lệnh (cooldown 3s)\n• Tỷ lệ thắng là 50-50\n```', 
                        inline: false 
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Chúc bạn may mắn! 🍀' });

            return await interaction.reply({ embeds: [helpEmbed] });
        }

        if (subcommand === 'tài' || subcommand === 'xỉu') {
            const betType = subcommand;
            const betAmount = interaction.options.getInteger('số_tiền');
            
            if (COOLDOWN.has(userId)) {
                const cooldownEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('⏳ Đợi chút!')
                    .setDescription('Bạn đang spam quá nhanh. Vui lòng đợi **3 giây**!')
                    .setTimestamp();
                return await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
            }

            const userData = ensureUser(userId);

            if (betAmount > userData.balance) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Số dư không đủ!')
                    .setDescription(`Bạn chỉ còn \`${userData.balance.toLocaleString()} VND\`\nCần thêm \`${(betAmount - userData.balance).toLocaleString()} VND\` để đặt cược.`)
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const rollResult = rollDice();
            const isWin = checkWin(betType, rollResult.result);
            
            let winAmount = 0;
            let newBalance = userData.balance;

            if (isWin) {
                winAmount = betAmount;
                newBalance = userData.balance + betAmount;
                userData.totalWins++;
            } else {
                newBalance = userData.balance - betAmount;
                userData.totalLosses++;
            }

            userData.balance = newBalance;
            userData.totalBets++;
            userData.lastGame = new Date();

            const resultEmbed = new EmbedBuilder()
                .setColor(isWin ? 0x00FF00 : 0xFF0000)
                .setTitle(isWin ? '🎉 BẠN THẮNG!' : '😔 BẠN THUA!')
                .setDescription(`Bạn đã đặt cược \`${betAmount.toLocaleString()} VND\` vào **${betType.toUpperCase()}**`)
                .addFields(
                    { 
                        name: '🎲 Xúc xắc', 
                        value: `\`\`\`\n⚪ Kết quả: ${rollResult.number} (${rollResult.result.toUpperCase()})\n\`\`\``, 
                        inline: false 
                    },
                    { 
                        name: isWin ? '💰 Tiền thưởng' : '💸 Tiền mất', 
                        value: isWin 
                            ? `\`+${winAmount.toLocaleString()} VND\`` 
                            : `\`-${betAmount.toLocaleString()} VND\``, 
                        inline: true 
                    },
                    { 
                        name: '💳 Số dư mới', 
                        value: `\`${newBalance.toLocaleString()} VND\``, 
                        inline: true 
                    },
                    { 
                        name: '📊 Tỷ lệ thắng', 
                        value: `\`${((userData.totalWins / userData.totalBets) * 100).toFixed(1)}%\``, 
                        inline: true 
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `${isWin ? '🎊' : '😢'} ${isWin ? 'Chúc mừng bạn đã thắng!' : 'Chúc bạn may mắn lần sau!'}` 
                });

            COOLDOWN.add(userId);
            setTimeout(() => {
                COOLDOWN.delete(userId);
            }, 3000);

            await interaction.reply({ embeds: [resultEmbed] });
            console.log(`🎲 ${userTag} đặt ${betAmount} VND vào ${betType}. Kết quả: ${rollResult.result} (${rollResult.number}). ${isWin ? 'THẮNG' : 'THUA'}`);
        }
    }
},
// ===== LỆNH /TK (KIỂM TRA SỐ DƯ) =====
{
    data: new SlashCommandBuilder()
        .setName('tk')
        .setDescription('💳 Kiểm tra số dư tài khoản và thống kê')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Xem số dư của người khác (tùy chọn)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const userId = interaction.options.getUser('user')?.id || interaction.user.id;
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        const userData = ensureUser(userId);
        
        const balanceEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`💳 Số dư của ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: '💰 Số dư hiện tại', value: `\`${userData.balance.toLocaleString()} VND\``, inline: true },
                { name: '🏆 Tổng thắng', value: `\`${userData.totalWins}\` lần`, inline: true },
                { name: '💔 Tổng thua', value: `\`${userData.totalLosses}\` lần`, inline: true },
                { name: '🎲 Tổng cược', value: `\`${userData.totalBets}\` lần`, inline: true },
                { name: '📊 Tỷ lệ thắng', value: userData.totalBets > 0 
                    ? `\`${((userData.totalWins / userData.totalBets) * 100).toFixed(1)}%\`` 
                    : '`Chưa có dữ liệu`', 
                    inline: true },
                { name: '🎁 Tổng tiền nhận free', value: `\`${userData.totalFreeClaimed.toLocaleString()} VND\``, inline: true },
                { name: '📦 Số lần nhận free', value: `\`${userData.freeClaimCount}\` lần`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [balanceEmbed] });
    }
},
// ===== LỆNH /FREE (NHẬN TIỀN HÀNG NGÀY) =====
{
    data: new SlashCommandBuilder()
        .setName('free')
        .setDescription('🎁 Nhận tiền thưởng hàng ngày (10,000 - 100,000 VND)'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;

        const userData = ensureUser(userId);
        const dailyData = ensureDaily(userId);

        if (!isDailyAvailable(dailyData.lastClaim)) {
            const lastClaim = new Date(dailyData.lastClaim);
            const now = new Date();
            const diffMs = 24 * 60 * 60 * 1000 - (now - lastClaim);
            const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
            const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            const waitEmbed = new EmbedBuilder()
                .setColor(0xFF6600)
                .setTitle('⏳ Đã nhận thưởng hôm nay!')
                .setDescription(`Bạn đã nhận thưởng rồi. Vui lòng quay lại sau:`)
                .addFields(
                    { name: '⏰ Thời gian còn lại', value: `\`${hoursLeft} giờ ${minutesLeft} phút\``, inline: true },
                    { name: '📅 Ngày nhận gần nhất', value: `\`${lastClaim.toLocaleString('vi-VN')}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Hãy quay lại vào ngày mai! 🌅` });

            return await interaction.reply({ embeds: [waitEmbed], ephemeral: true });
        }

        const reward = getDailyReward();
        const bonusMultiplier = 1 + Math.floor(dailyData.streak / 5) * 0.1;
        const finalReward = Math.round(reward * bonusMultiplier);

        userData.balance += finalReward;
        userData.totalFreeClaimed += finalReward;
        userData.freeClaimCount += 1;
        
        dailyData.lastClaim = new Date();
        dailyData.streak += 1;

        const rewardEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🎁 NHẬN THƯỞNG HÀNG NGÀY THÀNH CÔNG!')
            .setDescription(`Chúc mừng bạn đã nhận được tiền thưởng!`)
            .addFields(
                { 
                    name: '💰 Số tiền nhận được', 
                    value: `\`+${finalReward.toLocaleString()} VND\``, 
                    inline: true 
                },
                { 
                    name: '🎯 Bonus nhân đôi', 
                    value: `\`x${bonusMultiplier.toFixed(1)}\``, 
                    inline: true 
                },
                { 
                    name: '🔥 Streak hiện tại', 
                    value: `\`${dailyData.streak} ngày\``, 
                    inline: true 
                },
                { 
                    name: '💳 Số dư mới', 
                    value: `\`${userData.balance.toLocaleString()} VND\``, 
                    inline: false 
                },
                { 
                    name: '📦 Tổng tiền đã nhận free', 
                    value: `\`${userData.totalFreeClaimed.toLocaleString()} VND\``, 
                    inline: true 
                },
                { 
                    name: '📅 Ngày nhận tiếp theo', 
                    value: `\`${new Date(Date.now() + 24*60*60*1000).toLocaleString('vi-VN')}\``, 
                    inline: true 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `🎊 Chúc mừng bạn đã có ${dailyData.streak} ngày nhận thưởng liên tục!`,
                iconURL: interaction.user.displayAvatarURL()
            });

        if (dailyData.streak === 7) {
            rewardEmbed.addFields({
                name: '🌟 THÀNH TỰU ĐẶC BIỆT!',
                value: 'Bạn đã đạt **7 ngày liên tục** nhận thưởng! Hãy tiếp tục duy trì nhé! 🎉',
                inline: false
            });
        }

        await interaction.reply({ embeds: [rewardEmbed] });
        console.log(`🎁 ${userTag} đã nhận ${finalReward.toLocaleString()} VND từ /free (Streak: ${dailyData.streak} ngày)`);
    }
}
];
