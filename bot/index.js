require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const CryptoJS = require('crypto-js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SECRET_KEY = process.env.SECRET_KEY || 'CHELL_SECURITY_KEY_2026_ULTRA_SECURE';
const SITE_URL = process.env.SITE_URL || 'https://joynix28.github.io/chell-unblacklist';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
                .setDescription('Qui mentionner lors de la réception ? (everyone/here/aucun)')
                .setRequired(false)
                .addChoices(
                    { name: '@everyone', value: 'everyone' },
                    { name: '@here', value: 'here' },
                    { name: 'Aucun ping', value: 'none' }
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
    console.log(`🚀 Bot connecté : ${client.user.tag}`);
    console.log(`🎯 Serveurs actifs : ${client.guilds.cache.size}`);
    console.log(`🔗 Site web : ${SITE_URL}`);
    console.log('\n✅ Prêt à recevoir des commandes !\n');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'appel') {
        const channel = interaction.options.getChannel('salon');
        const pingOption = interaction.options.getString('ping') || 'everyone';
        
        if (!channel.isTextBased()) {
            return interaction.reply({ 
                content: '❌ Ce salon n\'est pas un salon textuel.', 
                ephemeral: true 
            });
        }
        
        // Création/récupération webhook
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
                console.log(`✅ Webhook créé pour #${channel.name}`);
            }
        } catch (error) {
            console.error('Erreur webhook:', error);
            return interaction.reply({ 
                content: '❌ Impossible de créer un webhook. Vérifiez les permissions du bot (Gérer les webhooks).', 
                ephemeral: true 
            });
        }

        // Encodage des paramètres (webhook URL + ping option)
        const dataToEncrypt = JSON.stringify({
            webhookUrl: webhook.url,
            ping: pingOption
        });
        const encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, SECRET_KEY).toString();
        const safeCode = encodeURIComponent(encryptedData);
        
        const finalLink = `${SITE_URL}/?code=${safeCode}`;

        // Embed de réponse professionnel
        const embed = new EmbedBuilder()
            .setTitle('✅ Formulaire d\'appel configuré')
            .setDescription(`Le lien sécurisé a été généré avec succès.`)
            .setColor(0x6366f1)
            .addFields(
                { name: '📨 Salon de destination', value: `<#${channel.id}>`, inline: true },
                { name: '🔔 Notification', value: pingOption === 'everyone' ? '@everyone' : pingOption === 'here' ? '@here' : 'Aucune', inline: true },
                { name: '\u200b', value: '\u200b', inline: false },
                { name: '🔗 Lien sécurisé', value: `[Cliquez ici pour accéder au formulaire](${finalLink})` },
                { name: '🔒 Sécurité', value: 'Cryptage AES-256 • Lien à usage unique recommandé' }
            )
            .setFooter({ text: 'Système Chell • Ne partagez ce lien qu\'avec la personne concernée' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
        
        console.log(`🔗 Lien généré par ${interaction.user.tag} pour #${channel.name} (ping: ${pingOption})`);
        
        // Message de confirmation en salon (optionnel)
        try {
            const confirmEmbed = new EmbedBuilder()
                .setDescription(`📝 Un formulaire d'appel a été configuré pour ce salon par ${interaction.user}.`)
                .setColor(0xa855f7)
                .setFooter({ text: 'Les demandes seront postées ici automatiquement' })
                .setTimestamp();
            
            await channel.send({ embeds: [confirmEmbed] });
        } catch (e) {
            // Ignore si pas de permission d'écrire
        }
    }
});

client.on('error', error => {
    console.error('❌ Erreur Discord:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée:', error);
});

client.login(TOKEN);