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
    
    else if (commandName === 'autoriser') {
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
                { name: 'Tentatives', value: `${appealsDB[targetUser.id].attempts}`, inline: true },
                { name: 'Limite', value: `${appealsDB[targetUser.id].maxAttempts}`, inline: true },
                { name: 'Restantes', value: `${appealsDB[targetUser.id].maxAttempts - appealsDB[targetUser.id].attempts}`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        console.log(`✅ ${interaction.user.tag} a autorisé ${targetUser.tag} (+${additionalAttempts})`);
    }
    
    else if (commandName === 'statut-appel') {
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
                    { name: 'Utilisateurs', value: `${totalUsers}`, inline: true },
                    { name: 'Tentatives', value: `${totalAttempts}`, inline: true },
                    { name: 'Bloqués', value: `${blocked}`, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    
    else if (commandName === 'reset-appel') {
        const targetUser = interaction.options.getUser('utilisateur');
        if (appealsDB[targetUser.id]) delete appealsDB[targetUser.id];
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Réinitialisation effectuée')
            .setDescription(`Le compteur de ${targetUser} a été complètement réinitialisé.`)
            .setColor(0x00703c)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        console.log(`🔄 ${interaction.user.tag} a réinitialisé ${targetUser.tag}`);
    }
    
    else if (commandName === 'historique') {
        const targetUser = interaction.options.getUser('utilisateur');
        const history = historyDB[targetUser.id] || [];
        
        if (history.length === 0) {
            return interaction.reply({ content: `❌ Aucun historique pour ${targetUser}.`, ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📜 Historique de ${targetUser.username}`)
            .setColor(0x6366f1)
            .setDescription(history.slice(0, 10).map((entry, i) => 
                `**${i+1}.** ${entry.decision || 'En attente'} - <t:${Math.floor(entry.timestamp / 1000)}:R>`
            ).join('\n'))
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: `Total: ${history.length} demande(s)` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (commandName === 'exporter-appels') {
        let csv = 'UserID,Username,Attempts,MaxAttempts,Status\n';
        
        for (const [userId, data] of Object.entries(appealsDB)) {
            const user = await client.users.fetch(userId).catch(() => null);
            const username = user ? user.username : 'Inconnu';
            const status = data.attempts >= data.maxAttempts ? 'Bloqué' : 'Actif';
            csv += `${userId},${username},${data.attempts},${data.maxAttempts},${status}\n`;
        }
        
        const buffer = Buffer.from(csv, 'utf8');
        await interaction.reply({ 
            content: '📊 Voici l\'export CSV des appels:', 
            files: [{ attachment: buffer, name: `appeals_${Date.now()}.csv` }],
            ephemeral: true
        });
    }
    
    else if (commandName === 'notifier-decision') {
        const targetUser = interaction.options.getUser('utilisateur');
        const decision = interaction.options.getString('decision');
        const customMessage = interaction.options.getString('message');
        
        const decisionEmojis = {
            approved: { emoji: '✅', text: 'Approuvée', color: 0x00703c },
            rejected: { emoji: '❌', text: 'Refusée', color: 0xd4351c },
            pending: { emoji: '⏳', text: 'En cours d\'examen', color: 0xf47738 }
        };
        
        const d = decisionEmojis[decision];
        
        const embed = new EmbedBuilder()
            .setTitle(`${d.emoji} Décision concernant votre demande`)
            .setDescription(customMessage || `Votre demande d'unblacklist a été **${d.text.toLowerCase()}**.`)
            .setColor(d.color)
            .setFooter({ text: 'Système Chell Appeals' })
            .setTimestamp();
        
        try {
            await targetUser.send({ embeds: [embed] });
            
            if (!historyDB[targetUser.id]) historyDB[targetUser.id] = [];
            historyDB[targetUser.id].push({ decision: d.text, timestamp: Date.now() });
            saveDB();
            
            await interaction.reply({ content: `✅ Notification envoyée à ${targetUser}.`, ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: `❌ Impossible d'envoyer un MP à ${targetUser}.`, ephemeral: true });
        }
    }
    
    else if (commandName === 'auto-reset') {
        const days = interaction.options.getInteger('jours');
        const config = { autoReset: days > 0, days: days };
        fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2));
        
        const embed = new EmbedBuilder()
            .setTitle(days > 0 ? '✅ Auto-reset activé' : '❌ Auto-reset désactivé')
            .setDescription(days > 0 ? `Les compteurs seront réinitialisés automatiquement tous les ${days} jours.` : 'Le reset automatique a été désactivé.')
            .setColor(days > 0 ? 0x00703c : 0xd4351c)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'creer-formulaire') {
        await startFormBuilder(interaction);
    }
    
    else if (commandName === 'liste-formulaires') {
        const formsList = Object.keys(customForms);
        
        if (formsList.length === 0) {
            return interaction.reply({ content: '❌ Aucun formulaire personnalisé créé.', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📝 Formulaires personnalisés')
            .setDescription(formsList.map((name, i) => {
                const form = customForms[name];
                return `**${i+1}. ${name}**\n└ ${form.questions.length} question(s) • Couleur: ${form.theme.color}`;
            }).join('\n\n'))
            .setColor(0x6366f1)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (commandName === 'supprimer-formulaire') {
        const formName = interaction.options.getString('nom');
        
        if (!customForms[formName]) {
            return interaction.reply({ content: `❌ Le formulaire "${formName}" n'existe pas.`, ephemeral: true });
        }
        
        delete customForms[formName];
        saveDB();
        
        await interaction.reply({ content: `✅ Formulaire "${formName}" supprimé.`, ephemeral: true });
    }
}

async function startFormBuilder(interaction) {
    const userId = interaction.user.id;
    
    formBuilderSessions[userId] = {
        name: '',
        questions: [],
        theme: { color: '#6366f1', buttonColor: '#00703c' },
        maxFiles: 3,
        currentStep: 'name'
    };
    
    const embed = new EmbedBuilder()
        .setTitle('🎨 Créateur de formulaire personnalisé')
        .setDescription('Bienvenue dans le créateur de formulaire interactif !\n\nVous pouvez créer un formulaire avec jusqu\'\u00e0 **10 questions** personnalisées.')
        .setColor(0x6366f1)
        .addFields(
            { name: '📝 Types de champs disponibles', value: '• Texte court\n• Texte long\n• Choix multiple (cocher)\n• Sélection unique\n• Upload de fichiers' },
            { name: '🎨 Personnalisation', value: 'Couleurs des boutons, nombre de fichiers max, etc.' }
        )
        .setFooter({ text: 'Cliquez sur "Commencer" pour démarrer' });
    
    const button = new ButtonBuilder()
        .setCustomId(`form_builder_start_${userId}`)
        .setLabel('Commencer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🚀');
    
    const row = new ActionRowBuilder().addComponents(button);
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleButtons(interaction) {
    const [action, ...params] = interaction.customId.split('_');
    
    if (action === 'form' && params[0] === 'builder') {
        await handleFormBuilder(interaction, params);
    }
}

async function handleFormBuilder(interaction, params) {
    const userId = interaction.user.id;
    const session = formBuilderSessions[userId];
    
    if (!session) {
        return interaction.reply({ content: '❌ Session expirée. Relancez `/creer-formulaire`.', ephemeral: true });
    }
    
    if (params[1] === 'start') {
        const modal = new ModalBuilder()
            .setCustomId(`form_name_${userId}`)
            .setTitle('Nom du formulaire');
        
        const nameInput = new TextInputBuilder()
            .setCustomId('form_name')
            .setLabel('Nom du formulaire')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Appel Staff, Candidature Mod...')
            .setRequired(true)
            .setMaxLength(50);
        
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);
    }
    else if (params[1] === 'addquestion') {
        if (session.questions.length >= 10) {
            return interaction.reply({ content: '❌ Limite de 10 questions atteinte.', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📝 Question ${session.questions.length + 1}/10`)
            .setDescription('Quel type de champ souhaitez-vous ajouter ?')
            .setColor(0x6366f1);
        
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`form_questiontype_${userId}`)
            .setPlaceholder('Sélectionnez un type de champ')
            .addOptions([
                { label: 'Texte court', description: 'Une ligne de texte', value: 'short_text', emoji: '📝' },
                { label: 'Texte long', description: 'Paragraphe', value: 'long_text', emoji: '📄' },
                { label: 'Choix multiple', description: 'Cases à cocher', value: 'checkbox', emoji: '☑️' },
                { label: 'Sélection unique', description: 'Liste déroulante', value: 'select', emoji: '🔽' },
                { label: 'Upload fichier', description: 'Pièces jointes', value: 'file', emoji: '📎' }
            ]);
        
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.update({ embeds: [embed], components: [row] });
    }
    else if (params[1] === 'theme') {
        const modal = new ModalBuilder()
            .setCustomId(`form_theme_${userId}`)
            .setTitle('Personnalisation du thème');
        
        const colorInput = new TextInputBuilder()
            .setCustomId('theme_color')
            .setLabel('Couleur principale (hex)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#6366f1')
            .setValue(session.theme.color)
            .setRequired(true);
        
        const btnInput = new TextInputBuilder()
            .setCustomId('button_color')
            .setLabel('Couleur des boutons (hex)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#00703c')
            .setValue(session.theme.buttonColor)
            .setRequired(true);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(btnInput)
        );
        
        await interaction.showModal(modal);
    }
    else if (params[1] === 'finish') {
        if (session.questions.length === 0) {
            return interaction.reply({ content: '❌ Ajoutez au moins une question.', ephemeral: true });
        }
        
        customForms[session.name] = {
            questions: session.questions,
            theme: session.theme,
            maxFiles: session.maxFiles,
            createdBy: userId,
            createdAt: Date.now()
        };
        saveDB();
        
        delete formBuilderSessions[userId];
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Formulaire créé avec succès !')
            .setDescription(`Le formulaire **${session.name}** a été créé.\n\nUtilisez-le avec:\n\`\`\`/appel formulaire:${session.name}\`\`\``)
            .setColor(0x00703c)
            .setTimestamp();
        
        await interaction.update({ embeds: [embed], components: [] });
    }
}

async function handleSelectMenus(interaction) {
    const [action, type, userId] = interaction.customId.split('_');
    
    if (action === 'form' && type === 'questiontype') {
        const session = formBuilderSessions[userId];
        const fieldType = interaction.values[0];
        
        session.currentQuestionType = fieldType;
        
        const modal = new ModalBuilder()
            .setCustomId(`form_question_${userId}`)
            .setTitle(`Question ${session.questions.length + 1}`);
        
        const labelInput = new TextInputBuilder()
            .setCustomId('question_label')
            .setLabel('Texte de la question')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Pourquoi voulez-vous rejoindre ?')
            .setRequired(true);
        
        const requiredInput = new TextInputBuilder()
            .setCustomId('question_required')
            .setLabel('Obligatoire ? (oui/non)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('oui')
            .setValue('oui')
            .setRequired(true);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(requiredInput)
        );
        
        if (fieldType === 'checkbox' || fieldType === 'select') {
            const optionsInput = new TextInputBuilder()
                .setCustomId('question_options')
                .setLabel('Options (séparées par des virgules)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Option 1, Option 2, Option 3')
                .setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(optionsInput));
        }
        
        await interaction.showModal(modal);
    }
}

async function handleModals(interaction) {
    const [action, type, userId] = interaction.customId.split('_');
    
    if (action === 'form') {
        const session = formBuilderSessions[userId];
        
        if (type === 'name') {
            session.name = interaction.fields.getTextInputValue('form_name');
            session.currentStep = 'questions';
            
            const embed = new EmbedBuilder()
                .setTitle(`📝 Formulaire: ${session.name}`)
                .setDescription('Questions: 0/10\n\nCliquez sur "Ajouter une question" pour commencer.')
                .setColor(0x6366f1);
            
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_builder_addquestion_${userId}`).setLabel('Ajouter une question').setStyle(ButtonStyle.Primary).setEmoji('➕'),
                new ButtonBuilder().setCustomId(`form_builder_theme_${userId}`).setLabel('Personnaliser').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
                new ButtonBuilder().setCustomId(`form_builder_finish_${userId}`).setLabel('Terminer').setStyle(ButtonStyle.Success).setEmoji('✅')
            );
            
            await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });
        }
        else if (type === 'question') {
            const label = interaction.fields.getTextInputValue('question_label');
            const required = interaction.fields.getTextInputValue('question_required').toLowerCase() === 'oui';
            const options = interaction.fields.fields.has('question_options') 
                ? interaction.fields.getTextInputValue('question_options').split(',').map(o => o.trim())
                : [];
            
            session.questions.push({
                type: session.currentQuestionType,
                label,
                required,
                options
            });
            
            const embed = new EmbedBuilder()
                .setTitle(`📝 Formulaire: ${session.name}`)
                .setDescription(`Questions: ${session.questions.length}/10\n\n**Dernière question ajoutée:**\n${label}`)
                .setColor(0x6366f1);
            
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_builder_addquestion_${userId}`).setLabel('Ajouter une question').setStyle(ButtonStyle.Primary).setEmoji('➕').setDisabled(session.questions.length >= 10),
                new ButtonBuilder().setCustomId(`form_builder_theme_${userId}`).setLabel('Personnaliser').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
                new ButtonBuilder().setCustomId(`form_builder_finish_${userId}`).setLabel('Terminer').setStyle(ButtonStyle.Success).setEmoji('✅')
            );
            
            await interaction.update({ embeds: [embed], components: [buttons] });
        }
        else if (type === 'theme') {
            session.theme.color = interaction.fields.getTextInputValue('theme_color');
            session.theme.buttonColor = interaction.fields.getTextInputValue('button_color');
            
            await interaction.reply({ content: '✅ Thème personnalisé sauvegardé !', ephemeral: true });
        }
    }
}

client.on('error', error => console.error('❌ Erreur Discord:', error));
process.on('unhandledRejection', error => console.error('❌ Erreur non gérée:', error));

client.login(TOKEN);