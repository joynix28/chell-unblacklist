const CLIENT_ID = "1475575856993665134";
const SECRET_KEY = "CHELL_SECURITY_KEY_2026_ULTRA_SECURE";
const REDIRECT_URI = window.location.origin + window.location.pathname;

let uploadedFiles = [];
let webhookConfig = null;
let userAttempts = 0;
let maxAttempts = 1;

function getParams() {
    const hash = window.location.hash.substring(1);
    const query = window.location.search.substring(1);
    return {
        ...Object.fromEntries(new URLSearchParams(hash)),
        ...Object.fromEntries(new URLSearchParams(query))
    };
}

const params = getParams();

function openPrivacyModal() {
    document.getElementById('privacyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePrivacyModal() {
    document.getElementById('privacyModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

window.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePrivacyModal();
            }
        });
    }
});

function loginDiscord() {
    const encryptedCode = params.code || localStorage.getItem('pending_code');
    if (!encryptedCode) {
        alert("❌ Lien invalide. Générez un lien avec la commande /appel sur le serveur Discord.");
        return;
    }
    
    localStorage.setItem('pending_code', encryptedCode);
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify&state=${encryptedCode}`;
    window.location.href = authUrl;
}

async function checkUserAttempts(userId, webhookUrl) {
    const trackingKey = `appeals_${userId}`;
    const stored = localStorage.getItem(trackingKey);
    
    if (stored) {
        const data = JSON.parse(stored);
        userAttempts = data.attempts || 0;
        maxAttempts = data.maxAttempts || 1;
        
        const counter = document.getElementById('attempt-counter');
        if (counter) {
            if (userAttempts >= maxAttempts) {
                counter.innerHTML = `<span style="color: var(--color-error); font-weight: 700;">❌ Limite atteinte (${userAttempts}/${maxAttempts})</span>`;
                return false;
            } else {
                counter.innerHTML = `📊 Tentative ${userAttempts + 1}/${maxAttempts}`;
            }
        }
    }
    
    return true;
}

function saveUserAttempt(userId, success = false) {
    const trackingKey = `appeals_${userId}`;
    const stored = localStorage.getItem(trackingKey);
    
    let data = stored ? JSON.parse(stored) : { attempts: 0, maxAttempts: 1 };
    
    if (!success) {
        data.attempts += 1;
    }
    
    localStorage.setItem(trackingKey, JSON.stringify(data));
}

function increaseUserLimit(userId, newMax) {
    const trackingKey = `appeals_${userId}`;
    const stored = localStorage.getItem(trackingKey);
    
    let data = stored ? JSON.parse(stored) : { attempts: 0, maxAttempts: 1 };
    data.maxAttempts = newMax;
    
    localStorage.setItem(trackingKey, JSON.stringify(data));
}

window.onload = async () => {
    console.log('🔍 Démarrage du formulaire...');
    
    if (params.access_token) {
        console.log('✅ Token OAuth2 reçu');
        localStorage.setItem('discord_token', params.access_token);
        if (params.state) localStorage.setItem('pending_code', params.state);
        window.history.replaceState(null, null, window.location.pathname);
    }

    const token = localStorage.getItem('discord_token');
    let encryptedCode = params.code || localStorage.getItem('pending_code');

    console.log('🔐 Code crypté (brut):', encryptedCode ? encryptedCode.substring(0, 50) + '...' : 'Absent');
    console.log('🎫 Token Discord:', token ? 'Présent' : 'Absent');

    if (!encryptedCode) {
        console.error('❌ Aucun code crypté trouvé');
        document.body.innerHTML = "<div style='padding:40px;text-align:center;font-family:Inter,sans-serif'><h1 style='color:#d4351c'>❌ Lien invalide</h1><p>Utilisez la commande <code>/appel</code> sur le serveur pour générer un lien valide.</p></div>";
        return;
    }
    
    // FIX: Restaurer les caractères URL-safe
    encryptedCode = encryptedCode.replace(/-/g, '+').replace(/_/g, '/');
    console.log('🔧 Code restauré:', encryptedCode.substring(0, 50) + '...');
    
    if (params.code) localStorage.setItem('pending_code', params.code);

    if (token) {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('form-container').classList.remove('hidden');
        
        try {
            console.log('🔄 Récupération des infos utilisateur Discord...');
            const userReq = await fetch('https://discord.com/api/users/@me', {
                headers: { authorization: `Bearer ${token}` }
            });
            
            if (!userReq.ok) {
                console.error('❌ Token expiré ou invalide');
                throw new Error('Token expired');
            }
            
            const user = await userReq.json();
            console.log('✅ Utilisateur Discord:', user.username);
            
            try {
                console.log('🔓 Tentative de décryptage...');
                console.log('🔑 Clé utilisée:', SECRET_KEY);
                
                const bytes = CryptoJS.AES.decrypt(encryptedCode, SECRET_KEY);
                const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
                
                console.log('📝 Longueur données décryptées:', decryptedData.length);
                console.log('📝 Données décryptées:', decryptedData.substring(0, 100));
                
                if (!decryptedData || decryptedData === '') {
                    console.error('❌ Décryptage échoué - résultat vide');
                    console.error('🔴 Vérifiez que SECRET_KEY est identique dans le bot !');
                    throw new Error('Décryptage échoué');
                }
                
                webhookConfig = JSON.parse(decryptedData);
                console.log('✅ Webhook configuré:', webhookConfig.webhookUrl ? 'OK' : 'ERREUR');
                console.log('🔔 Ping:', webhookConfig.ping);
                
                const allowed = await checkUserAttempts(user.id, webhookConfig.webhookUrl);
                
                if (!allowed) {
                    console.warn('⚠️ Utilisateur bloqué');
                    document.getElementById('form-container').innerHTML = `
                        <div class="container">
                            <div style="text-align: center; padding: 60px 20px;">
                                <h1 style="color: var(--color-error); font-size: 3rem;">❌ Accès refusé</h1>
                                <p style="font-size: 1.2rem; margin-top: 20px; color: var(--color-text-secondary);">Vous avez déjà utilisé votre quota de tentatives (${userAttempts}/${maxAttempts}).</p>
                                <p style="margin-top: 20px;">Contactez un modérateur pour obtenir une autorisation supplémentaire via la commande <code>/autoriser</code>.</p>
                            </div>
                        </div>
                    `;
                    
                    const blockEmbed = {
                        title: "⚠️ Tentative d'accès bloquée",
                        description: `L'utilisateur **${user.username}** (\`${user.id}\`) a tenté d'accéder au formulaire mais a dépassé son quota de tentatives.`,
                        color: 0xd4351c,
                        fields: [
                            { name: "Tentatives effectuées", value: `${userAttempts}/${maxAttempts}`, inline: true },
                            { name: "Action requise", value: "Utilisez `/autoriser` pour débloquer", inline: true }
                        ],
                        thumbnail: {
                            url: user.avatar 
                                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
                                : `https://cdn.discordapp.com/embed/avatars/0.png`
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    await fetch(webhookConfig.webhookUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ embeds: [blockEmbed] })
                    });
                    
                    return;
                }
            } catch (decryptError) {
                console.error('❌ Erreur de décryptage:', decryptError);
                console.error('Code reçu:', encryptedCode.substring(0, 100));
                alert('❌ Erreur de décryptage du lien.\n\nLe lien est invalide ou la clé de cryptage ne correspond pas.\n\nVérifiez que SECRET_KEY est identique dans bot/.env et public/script.js\n\nGénérez un nouveau lien avec /appel.');
                localStorage.removeItem('pending_code');
                localStorage.removeItem('discord_token');
                setTimeout(() => {
                    window.location.href = window.location.pathname;
                }, 3000);
                return;
            }
            
            console.log('✅ Configuration réussie, affichage du formulaire');
            document.getElementById('user-name').innerText = user.username;
            const avatarUrl = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
            document.getElementById('user-avatar').src = avatarUrl;
            window.discordUser = user;
            
        } catch (e) {
            console.error('❌ Erreur globale:', e);
            alert('❌ Une erreur est survenue.\n\n' + e.message + '\n\nVous allez être redirigé.');
            localStorage.removeItem('discord_token');
            if (!params.access_token) {
                setTimeout(() => window.location.reload(), 2000);
            }
        }
    }
    
    const fileInput = document.getElementById('attachments');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    window.addEventListener('beforeunload', () => {
        if (window.discordUser && !window.formSubmitted) {
            saveUserAttempt(window.discordUser.id, false);
        }
    });
};

function toggleReasonInput() {
    const val = document.getElementById('reason_known').value;
    document.getElementById('reason_yes').classList.add('hidden');
    document.getElementById('reason_no').classList.add('hidden');
    if (val === 'Oui') document.getElementById('reason_yes').classList.remove('hidden');
    if (val === 'Non') document.getElementById('reason_no').classList.remove('hidden');
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    const fileList = document.getElementById('file-list');
    
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`Le fichier "${file.name}" dépasse la taille maximale de 10 Mo.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedFiles.push({
                name: file.name,
                size: file.size,
                type: file.type,
                data: event.target.result
            });
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>📄 ${file.name} (${(file.size / 1024).toFixed(1)} Ko)</span>
                <button type="button" class="file-remove" onclick="removeFile(${uploadedFiles.length - 1})">❌ Retirer</button>
            `;
            fileList.appendChild(fileItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    const fileList = document.getElementById('file-list');
    fileList.children[index].remove();
}

let isSubmitting = false;
window.formSubmitted = false;

document.getElementById('unbanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    isSubmitting = true;
    
    const submitBtn = e.target.querySelector('.button-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Envoi en cours...';
    submitBtn.disabled = true;
    
    try {
        console.log('📤 Début de la soumission...');
        
        if (!webhookConfig) {
            console.log('⚙️ Webhook non configuré, décryptage...');
            let encryptedCode = localStorage.getItem('pending_code');
            
            // Restaurer caractères URL-safe
            encryptedCode = encryptedCode.replace(/-/g, '+').replace(/_/g, '/');
            
            const bytes = CryptoJS.AES.decrypt(encryptedCode, SECRET_KEY);
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedData) throw new Error("Décryptage échoué");
            
            webhookConfig = JSON.parse(decryptedData);
        }
        
        const webhookUrl = webhookConfig.webhookUrl;
        const pingType = webhookConfig.ping || 'none';
        
        if (!webhookUrl.startsWith("http")) throw new Error("URL invalide");
        
        const formData = new FormData(e.target);
        const user = window.discordUser;
        
        if (!document.getElementById('accept_terms').checked) {
            alert("❌ Vous devez accepter le protocole de confidentialité pour continuer.");
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            isSubmitting = false;
            return;
        }
        
        let pingContent = '';
        if (pingType === 'everyone') pingContent = '@everyone';
        else if (pingType === 'here') pingContent = '@here';
        
        const mainEmbed = {
            title: "📨 Nouvelle demande de révision de sanction",
            description: `**Utilisateur :** ${user.username} (\`${user.id}\`)`,
            color: 0x6366f1,
            thumbnail: { 
                url: user.avatar 
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
                    : `https://cdn.discordapp.com/embed/avatars/0.png`
            },
            fields: [
                { 
                    name: "📅 Date de la sanction", 
                    value: formData.get("date_blacklist") || "Non renseignée", 
                    inline: true 
                },
                { 
                    name: "❓ Raison connue", 
                    value: formData.get("reason_known"), 
                    inline: true 
                },
                { name: "\u200b", value: "\u200b", inline: false },
                { 
                    name: "📝 Explication de la raison", 
                    value: (formData.get("reason_explanation") || formData.get("reason_unknown") || "_Aucune explication fournie_").substring(0, 1024)
                },
                { 
                    name: "⚖️ Position sur la décision", 
                    value: `**${formData.get("agreement")}**\n${formData.get("agreement_desc").substring(0, 900)}`
                },
                { 
                    name: "🏳️ Reconnaissance des faits", 
                    value: `**${formData.get("admission")}**\n${formData.get("admission_desc").substring(0, 900)}`
                }
            ],
            footer: { text: "Système de révision Chell" },
            timestamp: new Date().toISOString()
        };
        
        const detailsEmbed = {
            color: 0xa855f7,
            fields: [
                { 
                    name: "🔧 Analyse et prise de recul", 
                    value: formData.get("analysis").substring(0, 1024)
                },
                { 
                    name: "✨ Motivation pour la levée de sanction", 
                    value: formData.get("motivation").substring(0, 1024)
                }
            ]
        };
        
        if (formData.get("extras")) {
            detailsEmbed.fields.push({ 
                name: "💬 Informations complémentaires", 
                value: formData.get("extras").substring(0, 1024) 
            });
        }
        
        if (uploadedFiles.length > 0) {
            const fileNames = uploadedFiles.map(f => `📄 ${f.name}`).join('\n');
            detailsEmbed.fields.push({ 
                name: "📎 Pièces jointes", 
                value: fileNames.substring(0, 1024)
            });
        }
        
        const payload = {
            content: pingContent,
            embeds: [mainEmbed, detailsEmbed]
        };
        
        console.log('📨 Envoi de l\'embed principal...');
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('❌ Erreur webhook:', response.status);
            throw new Error('Erreur webhook');
        }
        
        console.log('✅ Embed envoyé');
        
        for (const file of uploadedFiles) {
            console.log('📎 Envoi fichier:', file.name);
            const formDataFile = new FormData();
            const blob = await fetch(file.data).then(r => r.blob());
            formDataFile.append('files[0]', blob, file.name);
            formDataFile.append('content', `📎 Pièce jointe de **${user.username}**`);
            
            await fetch(webhookUrl, {
                method: "POST",
                body: formDataFile
            });
        }

        window.formSubmitted = true;
        saveUserAttempt(user.id, true);
        
        console.log('✅ Formulaire soumis avec succès');
        alert("✅ Demande envoyée avec succès !\n\nL'équipe de modération examinera votre dossier dans les plus brefs délais.");
        localStorage.removeItem('pending_code');
        localStorage.removeItem('discord_token');
        window.location.href = "https://discord.com";
        
    } catch (err) {
        console.error('❌ Erreur soumission:', err);
        alert("❌ Erreur lors de l'envoi\n\n" + err.message + "\n\nVérifiez votre connexion ou générez un nouveau lien avec /appel.");
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        isSubmitting = false;
    }
});