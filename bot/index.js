require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SECRET_KEY = process.env.SECRET_KEY || 'CHELL_SECURITY_KEY_2026_ULTRA_SECURE';
const SITE_URL = process.env.SITE_URL || 'https://joynix28.github.io/chell-unblacklist';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Base de données locale (JSON)
const DB_FILE = path.join(__dirname, 'appeals_db.json');
let appealsDB = {};

if (fs.existsSync(DB_FILE)) {
    appealsDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(appealsDB, null, 2));
}

const commands = [
    new SlashCommandBuilder()
        .setName('appel')
        .setDescription('Génère un lien de formulaire d\'unblacklist')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Salon qui recevra les demandes')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ping')
                .setDescription('Qui mentionner lors de la réception ?')
                .setRequired(false)
                .addChoices(
                    { name: '@everyone', value: 'everyone' },
                    { name: '@here', value: 'here' },
                    { name: 'Aucun ping', value: 'none' }
                )),
    
    new SlashCommandBuilder()
        .setName('autoriser')
        .setDescription('Autorise un utilisateur à soumettre une nouvelle demande')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à autoriser')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('tentatives')
                .setDescription('Nombre de tentatives supplémentaires (défaut: +1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)),
    
    new SlashCommandBuilder()
        .setName('statut-appel')
        .setDescription('Affiche les statistiques des demandes d\'unblacklist')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Voir le statut d\'un utilisateur spécifique')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('reset-appel')
        .setDescription('Réinitialise complètement le compteur d\'un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à réinitialiser')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('formulaire-interactif')
        .setDescription('Lance un formulaire d\'appel directement sur Discord')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur concerné')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('liste-appels')
        .setDescription('Liste tous les appels en attente ou traités')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('statut')
                .setDescription('Filtrer par statut')
                .addChoices(
                    { name: 'En attente', value: 'pending' },
                    { name: 'Approuvés', value: 'approved' },
                    { name: 'Refusés', value: 'rejected' }
                ))
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🔄 Mise à jour des commandes slash...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commandes enregistrées avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
    }
})();

client.once('ready', () => {
    console.log(`\n═══════════════════════════════════`);
    console.log(`🚀 ${client.user.tag} est en ligne !`);
    console.log(`═══════════════════════════════════`);
    console.log(`🎯 Serveurs actifs : ${client.guilds.cache.size}`);
    console.log(`🔗 Site web : ${SITE_URL}`);
    console.log(`📊 Appels enregistrés : ${Object.keys(appealsDB).length}`);
    console.log(`\n🛠️  Commandes disponibles :`);
    console.log(`   /appel - Générer un lien de formulaire`);
    console.log(`   /autoriser - Autoriser une nouvelle tentative`);
    console.log(`   /statut-appel - Voir les statistiques`);
    console.log(`   /reset-appel - Réinitialiser un utilisateur`);
    console.log(`   /formulaire-interactif - Formulaire Discord`);
    console.log(`   /liste-appels - Liste des appels`);
    console.log(`\n✅ Prêt à recevoir des commandes !\n`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // === /APPEL ===
    if (interaction.commandName === 'appel') {
        const channel = interaction.options.getChannel('salon');
        const pingOption = interaction.options.getString('ping') || 'everyone';
        
        if (!channel.isTextBased()) {
            return interaction.reply({ 
                content: '❌ Ce salon n\'est pas un salon textuel.', 
                ephemeral: true 
            });
        }
        
        let webhook;
        try {
            const webhooks = await channel.fetchWebhooks();
            webhook = webhooks.find(wh => wh.owner.id === client.user.id && wh.name === 'Chell Appeals');
            
            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: 'Chell Appeals',
                    avatar: 'https://i.imgur.com/AfFp7pu.png',
                    reason: 'Webhook pour système d\'unblacklist Chell'
                });
            }
        } catch (error) {
            return interaction.reply({ 
                content: '❌ Impossible de créer un webhook. Vérifiez les permissions.', 
                ephemeral: true 
            });
        }

        const dataToEncrypt = JSON.stringify({
            webhookUrl: webhook.url,
            ping: pingOption
        });
        const encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, SECRET_KEY).toString();
        const safeCode = encodeURIComponent(encryptedData);
        const finalLink = `${SITE_URL}/?code=${safeCode}`;

        const embed = new EmbedBuilder()
            .setTitle('✅ Formulaire d\'appel configuré')
            .setDescription(`Le lien sécurisé a été généré avec succès.`)
            .setColor(0x6366f1)
            .addFields(
                { name: '📨 Salon de destination', value: `<#${channel.id}>`, inline: true },
                { name: '🔔 Notification', value: pingOption === 'everyone' ? '@everyone' : pingOption === 'here' ? '@here' : 'Aucune', inline: true },
                { name: '\u200b', value: '\u200b', inline: false },
                { name: '🔗 Lien sécurisé', value: `[Cliquez ici pour accéder au formulaire](${finalLink})` },
                { name: '🔒 Sécurité', value: 'Cryptage AES-256 • Une tentative par utilisateur par défaut' }
            )
            .setFooter({ text: 'Système Chell • Ne partagez ce lien qu\'avec la personne concernée' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        console.log(`🔗 Lien généré par ${interaction.user.tag} pour #${channel.name}`);
    }
    
    // === /AUTORISER ===
    else if (interaction.commandName === 'autoriser') {
        const targetUser = interaction.options.getUser('utilisateur');
        const additionalAttempts = interaction.options.getInteger('tentatives') || 1;
        
        if (!appealsDB[targetUser.id]) {
            appealsDB[targetUser.id] = { attempts: 0, maxAttempts: 1, history: [] };
        }
        
        appealsDB[targetUser.id].maxAttempts += additionalAttempts;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Autorisation accordée')
            .setDescription(`${targetUser} peut maintenant soumettre ${additionalAttempts} demande(s) supplémentaire(s).`)
            .setColor(0x00703c)
            .addFields(
                { name: 'Tentatives effectuées', value: `${appealsDB[targetUser.id].attempts}`, inline: true },
                { name: 'Limite maximale', value: `${appealsDB[targetUser.id].maxAttempts}`, inline: true },
                { name: 'Tentatives restantes', value: `${appealsDB[targetUser.id].maxAttempts - appealsDB[targetUser.id].attempts}`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        console.log(`✅ ${interaction.user.tag} a autorisé ${targetUser.tag} (+${additionalAttempts})`);
    }
    
    // === /STATUT-APPEL ===
    else if (interaction.commandName === 'statut-appel') {
        const targetUser = interaction.options.getUser('utilisateur');
        
        if (targetUser) {
            const data = appealsDB[targetUser.id] || { attempts: 0, maxAttempts: 1, history: [] };
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 Statut de ${targetUser.username}`)
                .setColor(0x6366f1)
                .addFields(
                    { name: 'Tentatives', value: `${data.attempts}/${data.maxAttempts}`, inline: true },
                    { name: 'Restantes', value: `${data.maxAttempts - data.attempts}`, inline: true },
                    { name: 'Statut', value: data.attempts >= data.maxAttempts ? '❌ Bloqué' : '✅ Autorisé', inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const totalUsers = Object.keys(appealsDB).length;
            const totalAttempts = Object.values(appealsDB).reduce((sum, u) => sum + u.attempts, 0);
            const blocked = Object.values(appealsDB).filter(u => u.attempts >= u.maxAttempts).length;
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Statistiques globales')
                .setColor(0xa855f7)
                .addFields(
                    { name: 'Utilisateurs suivis', value: `${totalUsers}`, inline: true },
                    { name: 'Tentatives totales', value: `${totalAttempts}`, inline: true },
                    { name: 'Utilisateurs bloqués', value: `${blocked}`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    
    // === /RESET-APPEL ===
    else if (interaction.commandName === 'reset-appel') {
        const targetUser = interaction.options.getUser('utilisateur');
        
        if (appealsDB[targetUser.id]) {
            delete appealsDB[targetUser.id];
            saveDB();
        }
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Réinitialisation effectuée')
            .setDescription(`Le compteur de ${targetUser} a été complètement réinitialisé.`)
            .setColor(0x00703c)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        console.log(`🔄 ${interaction.user.tag} a réinitialisé ${targetUser.tag}`);
    }
    
    // === /FORMULAIRE-INTERACTIF ===
    else if (interaction.commandName === 'formulaire-interactif') {
        const targetUser = interaction.options.getUser('utilisateur');
        
        const embed = new EmbedBuilder()
            .setTitle('📝 Formulaire d\'appel interactif')
            .setDescription(`${targetUser}, cliquez sur le bouton ci-dessous pour commencer votre demande d'unblacklist.`)
            .setColor(0x6366f1)
            .setFooter({ text: 'Vous serez guidé étape par étape' });
        
        const button = new ButtonBuilder()
            .setCustomId(`start_appeal_${targetUser.id}`)
            .setLabel('Commencer la demande')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝');
        
        const row = new ActionRowBuilder().addComponents(button);
        
        await interaction.reply({ embeds: [embed], components: [row] });
    }
    
    // === /LISTE-APPELS ===
    else if (interaction.commandName === 'liste-appels') {
        const filter = interaction.options.getString('statut');
        
        let list = Object.entries(appealsDB)
            .map(([userId, data]) => {
                const status = data.attempts >= data.maxAttempts ? '❌ Bloqué' : '✅ Actif';
                return `<@${userId}> - ${data.attempts}/${data.maxAttempts} - ${status}`;
            });
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Liste des appels')
            .setDescription(list.length > 0 ? list.join('\n') : '_Aucun appel enregistré_')
            .setColor(0xa855f7)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

client.on('error', error => console.error('❌ Erreur Discord:', error));
process.on('unhandledRejection', error => console.error('❌ Erreur non gérée:', error));

client.login(TOKEN);