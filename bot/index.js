require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');
const CryptoJS = require('crypto-js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SECRET_KEY = process.env.SECRET_KEY || 'CHELL_SECURITY_KEY_2026_ULTRA_SECURE';
const SITE_URL = process.env.SITE_URL || 'https://joynix28.github.io/chell-unblacklist';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('appel')
        .setDescription('Génère un lien de formulaire unblacklist pour ce salon')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Le salon qui recevra les demandes d\'unblacklist')
                .setRequired(true))
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
    console.log(`🚀 Bot connecté en tant que ${client.user.tag}`);
    console.log(`🎯 Serveurs: ${client.guilds.cache.size}`);
    console.log(`🔗 Site web: ${SITE_URL}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'appel') {
        const channel = interaction.options.getChannel('salon');
        
        // Vérification du type de salon
        if (!channel.isTextBased()) {
            return interaction.reply({ 
                content: '❌ Ce salon n\'est pas un salon textuel.', 
                ephemeral: true 
            });
        }
        
        // Création ou récupération du webhook
        let webhook;
        try {
            const webhooks = await channel.fetchWebhooks();
            webhook = webhooks.find(wh => wh.owner.id === client.user.id);
            
            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: 'Unblacklist Forms',
                    avatar: 'https://i.imgur.com/AfFp7pu.png',
                    reason: 'Webhook pour le système d\'unblacklist'
                });
                console.log(`✅ Webhook créé pour #${channel.name}`);
            }
        } catch (error) {
            console.error('Erreur webhook:', error);
            return interaction.reply({ 
                content: '❌ Impossible de créer un webhook dans ce salon. Vérifie mes permissions (Gérer les webhooks).', 
                ephemeral: true 
            });
        }

        // Cryptage de l'URL du webhook
        const encryptedUrl = CryptoJS.AES.encrypt(webhook.url, SECRET_KEY).toString();
        const safeCode = encodeURIComponent(encryptedUrl);
        
        const finalLink = `${SITE_URL}/?code=${safeCode}`;

        // Réponse avec embed
        await interaction.reply({
            embeds: [{
                title: '✅ Lien de formulaire généré',
                description: `Le formulaire d'unblacklist a été configuré pour ${channel}.\n\n**🔗 Lien sécurisé :**\n${finalLink}`,
                color: 0x6366f1,
                fields: [
                    { name: '📨 Destination', value: `<#${channel.id}>`, inline: true },
                    { name: '🔒 Sécurité', value: 'Cryptage AES-256', inline: true }
                ],
                footer: { text: 'Ne partage ce lien qu\'avec la personne concernée' },
                timestamp: new Date().toISOString()
            }],
            ephemeral: true
        });
        
        console.log(`🔗 Lien généré par ${interaction.user.tag} pour #${channel.name}`);
    }
});

client.on('error', error => {
    console.error('❌ Erreur Discord:', error);
});

client.login(TOKEN);