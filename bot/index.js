require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ] 
});

const DB_FILE = path.join(__dirname, 'appeals_db.json');
const FORMS_FILE = path.join(__dirname, 'custom_forms.json');
const HISTORY_FILE = path.join(__dirname, 'appeals_history.json');

let appealsDB = {};
let customForms = {};
let historyDB = {};
let formBuilderSessions = {};

if (fs.existsSync(DB_FILE)) appealsDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
if (fs.existsSync(FORMS_FILE)) customForms = JSON.parse(fs.readFileSync(FORMS_FILE, 'utf8'));
if (fs.existsSync(HISTORY_FILE)) historyDB = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(appealsDB, null, 2));
    fs.writeFileSync(FORMS_FILE, JSON.stringify(customForms, null, 2));
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyDB, null, 2));
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
                .addChoices(
                    { name: '@everyone', value: 'everyone' },
                    { name: '@here', value: 'here' },
                    { name: 'Aucun ping', value: 'none' }
                ))
        .addStringOption(option =>
            option.setName('formulaire')
                .setDescription('Formulaire personnalisé à utiliser (laisser vide pour le formulaire par défaut)')),
    
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
                .setMinValue(1)
                .setMaxValue(10)),
    
    new SlashCommandBuilder()
        .setName('statut-appel')
        .setDescription('Affiche les statistiques des demandes d\'unblacklist')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Voir le statut d\'un utilisateur spécifique')),
    
    new SlashCommandBuilder()
        .setName('reset-appel')
        .setDescription('Réinitialise complètement le compteur d\'un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à réinitialiser')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('historique')
        .setDescription('Voir l\'historique complet des demandes d\'un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à consulter')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('exporter-appels')
        .setDescription('Exporte tous les appels en CSV')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
        .setName('notifier-decision')
        .setDescription('Envoie la décision en MP à un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur concerné')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('decision')
                .setDescription('Décision prise')
                .setRequired(true)
                .addChoices(
                    { name: '✅ Approuvé', value: 'approved' },
                    { name: '❌ Refusé', value: 'rejected' },
                    { name: '⏳ En attente', value: 'pending' }
                ))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message personnalisé')),
    
    new SlashCommandBuilder()
        .setName('auto-reset')
        .setDescription('Configure le reset automatique des compteurs')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('jours')
                .setDescription('Nombre de jours avant reset (0 = désactiver)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(365)),
    
    new SlashCommandBuilder()
        .setName('creer-formulaire')
        .setDescription('Lance le créateur de formulaire personnalisé interactif')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
        .setName('liste-formulaires')
        .setDescription('Liste tous les formulaires personnalisés créés')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
        .setName('supprimer-formulaire')
        .setDescription('Supprime un formulaire personnalisé')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('nom')
                .setDescription('Nom du formulaire à supprimer')
                .setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🔄 Mise à jour des commandes slash...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commandes enregistrées avec succès !');
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
})();

client.once('ready', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 ${client.user.tag} est en ligne !`);
    console.log('='.repeat(50));
    console.log(`🎯 Serveurs: ${client.guilds.cache.size}`);
    console.log(`🔗 Site: ${SITE_URL}`);
    console.log(`🔑 SECRET_KEY: ${SECRET_KEY.substring(0, 20)}...`);
    console.log(`📊 Appels: ${Object.keys(appealsDB).length}`);
    console.log(`📝 Formulaires personnalisés: ${Object.keys(customForms).length}`);
    console.log(`\n🛠️ Commandes disponibles: ${commands.length}`);
    console.log('✅ Prêt à recevoir des commandes !\n');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        await handleCommands(interaction);
    } else if (interaction.isButton()) {
        await handleButtons(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenus(interaction);
    } else if (interaction.isModalSubmit()) {
        await handleModals(interaction);
    }
});

async function handleCommands(interaction) {
    const { commandName } = interaction;
    
    if (commandName === 'appel') {
        const channel = interaction.options.getChannel('salon');
        const pingOption = interaction.options.getString('ping') || 'none';
        const formName = interaction.options.getString('formulaire');
        
        if (!channel.isTextBased()) {
            return interaction.reply({ content: '❌ Ce salon n\'est pas un salon textuel.', ephemeral: true });
        }
        
        let webhook;
        try {
            const webhooks = await channel.fetchWebhooks();
            webhook = webhooks.find(wh => wh.owner && wh.owner.id === client.user.id && wh.name === 'Chell Appeals');
            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: 'Chell Appeals',
                    avatar: 'https://i.imgur.com/AfFp7pu.png'
                });
            }
        } catch (error) {
            console.error('❌ Erreur webhook:', error);
            return interaction.reply({ content: '❌ Impossible de créer un webhook.', ephemeral: true });
        }

        const dataToEncrypt = JSON.stringify({
            webhookUrl: webhook.url,
            ping: pingOption,
            formName: formName || 'default'
        });
        
        console.log('🔐 Données à crypter:', dataToEncrypt.substring(0, 100));
        console.log('🔑 Clé utilisée:', SECRET_KEY);
        
        const encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, SECRET_KEY).toString();
        console.log('🔒 Données cryptées (brut):', encryptedData.substring(0, 50));
        
        // FIX: Conversion URL-safe pour éviter troncature dans Discord
        const urlSafeEncrypted = encryptedData.replace(/\+/g, '-').replace(/\//g, '_');
        console.log('🔧 Données URL-safe:', urlSafeEncrypted.substring(0, 50));
        
        const finalLink = `${SITE_URL}/?code=${urlSafeEncrypted}`;
        console.log('🔗 Lien final:', finalLink.length, 'caractères');

        const embed = new EmbedBuilder()
            .setTitle('✅ Formulaire d\'appel configuré')
            .setDescription('Le lien sécurisé a été généré avec succès.')
            .setColor(0x6366f1)
            .addFields(
                { name: '📨 Salon', value: `<#${channel.id}>`, inline: true },
                { name: '🔔 Ping', value: pingOption === 'everyone' ? '@everyone' : pingOption === 'here' ? '@here' : 'Aucun', inline: true },
                { name: '📝 Formulaire', value: formName || 'Par défaut', inline: true },
                { name: '🔗 Lien sécurisé', value: `[Cliquez ici pour accéder au formulaire](${finalLink})` },
                { name: '📋 Instructions', value: `Copiez ce lien et envoyez-le à l'utilisateur concerné. Le ping sera automatiquement ajouté lors de la réception de la demande.` }
            )
            .setFooter({ text: 'Système Chell • Lien crypté AES-256' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        console.log(`🔗 Lien généré par ${interaction.user.tag} pour #${channel.name} (ping: ${pingOption})`);
    }
    
    // ... (Reste du code identique, pas touché)