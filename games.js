const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ===== HỆ THỐNG LƯU TRỮ DỮ LIỆU =====
// Trong thực tế, bạn nên dùng database. Đây là cache tạm thời.
const userBalances = {}; // { userId: { balance: 1000, totalWins: 0, totalLosses: 0, totalBets: 0 } }
const COOLDOWN = new Set(); // Chống spam

// ===== HÀM HỖ TRỢ =====

// Tạo tài khoản mới nếu chưa có
function ensureUser(userId) {
    if (!userBalances[userId]) {
        userBalances[userId] = {
            balance: 1000, // Số dư ban đầu
            totalWins: 0,
            totalLosses: 0,
            totalBets: 0,
            lastGame: null
        };
    }
    return userBalances[userId];
}

// Random kết quả tài/xỉu (tỷ lệ 50-50)
function rollDice() {
    const result = Math.random() < 0.5 ? 'tài' : 'xỉu';
    const number = Math.floor(Math.random() * 6) + 1; // Random số từ 1-6
    return { result, number };
}

// Kiểm tra thắng/thua
function checkWin(betType, rollResult) {
    return betType === rollResult;
}

// ===== LỆNH CHÍNH =====

module.exports = {
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
                .setName('balance')
                .setDescription('💳 Kiểm tra số dư và thống kê')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('📖 Hướng dẫn chơi tài xỉu')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;

        // ===== SUBCOMMAND: HELP =====
        if (subcommand === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎲 HƯỚNG DẪN CHƠI TÀI XỈU')
                .setDescription('Đặt cược vào kết quả của 1 viên xúc xắc (1-6)')
                .addFields(
                    { 
                        name: '📌 Cách chơi', 
                        value: '```\n/tx tài <số_tiền>\n/tx xỉu <số_tiền>\n```', 
                        inline: false 
                    },
                    { 
                        name: '🎯 Luật chơi', 
                        value: '```\n• TÀI: Xúc xắc ra 4, 5, 6 (50%)\n• XỈU: Xúc xắc ra 1, 2, 3 (50%)\n• Thắng: Nhận gấp 2 lần tiền cược\n• Thua: Mất số tiền đã cược\n```', 
                        inline: false 
                    },
                    { 
                        name: '💳 Xem số dư', 
                        value: '```\n/tx balance\n```', 
                        inline: false 
                    },
                    { 
                        name: '💰 Tiền khởi tạo', 
                        value: '```\n• Mỗi người chơi được cấp 1,000 VND\n• Thắng thua được cập nhật tự động\n```', 
                        inline: false 
                    },
                    { 
                        name: '⚠️ Lưu ý', 
                        value: '```\n• Không được đặt cược quá số dư hiện có\n• Không spam lệnh (cooldown 3s)\n• Tỷ lệ thắng là 50-50\n```', 
                        inline: false 
                    }
                )
                .setTimestamp()
                .setFooter({ text: `Chúc bạn may mắn! 🍀` });

            return await interaction.reply({ embeds: [helpEmbed] });
        }

        // ===== SUBCOMMAND: BALANCE =====
        if (subcommand === 'balance') {
            const userData = ensureUser(userId);
            
            const balanceEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`💳 Số dư của ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
                .addFields(
                    { name: '💰 Số dư hiện tại', value: `\`${userData.balance.toLocaleString()} VND\``, inline: true },
                    { name: '🏆 Tổng thắng', value: `\`${userData.totalWins}\` lần`, inline: true },
                    { name: '💔 Tổng thua', value: `\`${userData.totalLosses}\` lần`, inline: true },
                    { name: '🎲 Tổng cược', value: `\`${userData.totalBets}\` lần`, inline: true },
                    { name: '📊 Tỷ lệ thắng', value: userData.totalBets > 0 
                        ? `\`${((userData.totalWins / userData.totalBets) * 100).toFixed(1)}%\`` 
                        : '`Chưa có dữ liệu`', 
                        inline: true }
                )
                .setTimestamp();
            
            return await interaction.reply({ embeds: [balanceEmbed] });
        }

        // ===== SUBCOMMAND: TÀI hoặc XỈU =====
        if (subcommand === 'tài' || subcommand === 'xỉu') {
            const betType = subcommand;
            const betAmount = interaction.options.getInteger('số_tiền');
            
            // ===== KIỂM TRA COOLDOWN =====
            if (COOLDOWN.has(userId)) {
                const cooldownEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('⏳ Đợi chút!')
                    .setDescription('Bạn đang spam quá nhanh. Vui lòng đợi **3 giây**!')
                    .setTimestamp();
                return await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
            }

            // ===== LẤY DỮ LIỆU NGƯỜI CHƠI =====
            const userData = ensureUser(userId);

            // ===== KIỂM TRA SỐ DƯ =====
            if (betAmount > userData.balance) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Số dư không đủ!')
                    .setDescription(`Bạn chỉ còn \`${userData.balance.toLocaleString()} VND\`\nCần thêm \`${(betAmount - userData.balance).toLocaleString()} VND\` để đặt cược.`)
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // ===== TIẾN HÀNH QUAY =====
            const rollResult = rollDice();
            const isWin = checkWin(betType, rollResult.result);
            
            // ===== CẬP NHẬT SỐ DƯ =====
            let winAmount = 0;
            let newBalance = userData.balance;

            if (isWin) {
                winAmount = betAmount; // Thắng được gấp 2 (nhận lại tiền cược + thêm 1 lần)
                newBalance = userData.balance + betAmount;
                userData.totalWins++;
            } else {
                newBalance = userData.balance - betAmount;
                userData.totalLosses++;
            }

            userData.balance = newBalance;
            userData.totalBets++;
            userData.lastGame = new Date();

            // ===== TẠO EMBDED KẾT QUẢ =====
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

            // ===== THÊM COOLDOWN =====
            COOLDOWN.add(userId);
            setTimeout(() => {
                COOLDOWN.delete(userId);
            }, 3000);

            // ===== GỬI KẾT QUẢ =====
            await interaction.reply({ embeds: [resultEmbed] });

            // ===== LOG =====
            console.log(`🎲 ${userTag} đặt ${betAmount} VND vào ${betType}. Kết quả: ${rollResult.result} (${rollResult.number}). ${isWin ? 'THẮNG' : 'THUA'}`);
        }
    }
};
