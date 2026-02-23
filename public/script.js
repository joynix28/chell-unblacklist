const CLIENT_ID = "1475575856993665134";
const SECRET_KEY = "CHELL_SECURITY_KEY_2026_ULTRA_SECURE";
const REDIRECT_URI = window.location.origin + window.location.pathname;
const BOT_API_URL = "n1mrs.cloudnest-hosting.xyz:2835";

let uploadedFiles = [];
let webhookConfig = null;
let userLimitsData = null;

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
        alert("❌ Pour demander un Unblacklist, ouvre un ticket ici : https://discord.gg/f5HpfrvWXx");
        return;
    }
    
    localStorage.setItem('pending_code', encryptedCode);
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify&state=${encryptedCode}`;
    window.location.href = authUrl;
}

function generateCustomForm(customFormData) {
    console.log('🎨 Génération formulaire personnalisé:', customFormData);
    const form = document.getElementById('unbanForm');
    form.innerHTML = '';
    if (customFormData.theme) {
        document.documentElement.style.setProperty('--color-primary', customFormData.theme.color || '#6366f1');
    }
    const intro = document.createElement('div');
    intro.innerHTML = `
        <h1 class="heading-xl">Formulaire personnalisé</h1>
        <p class="body-lead">Remplissez tous les champs avec sincérité.</p>
    `;
    form.appendChild(intro);
    customFormData.questions.forEach((q, index) => {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'fieldset';
        const legend = document.createElement('legend');
        legend.className = 'fieldset-legend';
        legend.innerHTML = `<h2 class="heading-l">${index + 1}. ${q.label}</h2>`;
        fieldset.appendChild(legend);
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        let inputHTML = '';
        const fieldName = `custom_field_${index}`;
        if (q.type === 'short_text') {
            inputHTML = `<input class="form-control" type="text" id="${fieldName}" name="${fieldName}" ${q.required ? 'required' : ''}>`;
        } else if (q.type === 'long_text') {
            inputHTML = `<textarea class="form-textarea" id="${fieldName}" name="${fieldName}" rows="5" ${q.required ? 'required' : ''}></textarea>`;
        } else if (q.type === 'select') {
            inputHTML = `
                <select class="form-select" id="${fieldName}" name="${fieldName}" ${q.required ? 'required' : ''}>
                    <option value="">-- Sélectionnez --</option>
                    ${q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
        } else if (q.type === 'checkbox') {
            inputHTML = q.options.map(opt => `
                <div class="checkbox-wrapper">
                    <input type="checkbox" id="${fieldName}_${opt}" name="${fieldName}[]" value="${opt}" class="form-checkbox">
                    <label for="${fieldName}_${opt}" class="checkbox-label">${opt}</label>
                </div>
            `).join('');
        } else if (q.type === 'file') {
            inputHTML = `
                <input type="file" class="form-file" id="${fieldName}" name="${fieldName}" multiple accept="image/*,.pdf,.txt">
                <div id="file-list-${index}" class="file-list"></div>
            `;
        }
        formGroup.innerHTML = `
            <label class="form-label" for="${fieldName}">
                ${q.label} ${q.required ? '<span class="form-required">(obligatoire)</span>' : '<span class="form-optional">(facultatif)</span>'}
            </label>
            ${inputHTML}
        `;
        fieldset.appendChild(formGroup);
        form.appendChild(fieldset);
    });
    const cguGroup = document.createElement('div');
    cguGroup.className = 'form-group';
    cguGroup.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" id="accept_terms" name="accept_terms" class="form-checkbox" required>
            <label for="accept_terms" class="checkbox-label">
                J'ai lu et j'accepte le protocole de confidentialité
                <span class="form-required">(obligatoire)</span>
            </label>
        </div>
    `;
    form.appendChild(cguGroup);
    const warning = document.createElement('div');
    warning.className = 'warning-text';
    warning.innerHTML = `
        <span class="warning-icon">⚠️</span>
        <div>
            <strong>Avertissement</strong>
            <p>Toute fausse déclaration entraînera un rejet immédiat de votre demande.</p>
        </div>
    `;
    form.appendChild(warning);
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'button-submit';
    submitBtn.textContent = 'Soumettre la demande';
    form.appendChild(submitBtn);
    console.log('✅ Formulaire personnalisé généré');
}

window.onload = async () => {
    if (params.access_token) {
        localStorage.setItem('discord_token', params.access_token);
        if (params.state) localStorage.setItem('pending_code', params.state);
        window.history.replaceState(null, null, window.location.pathname);
    }

    const token = localStorage.getItem('discord_token');
    let encryptedCode = params.code || localStorage.getItem('pending_code');

    if (!encryptedCode) {
        document.body.innerHTML = "<div style='padding:40px;text-align:center;font-family:Inter,sans-serif'><h1 style='color:#d4351c'>❌ Lien invalide</h1><p>❌ Pour demander un Unblacklist, ouvre un ticket ici : https://discord.gg/f5HpfrvWXx</p></div>";
        return;
    }
    
    encryptedCode = encryptedCode.replace(/-/g, '+').replace(/_/g, '/');
    if (params.code) localStorage.setItem('pending_code', params.code);

    if (token) {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('form-container').classList.remove('hidden');
        
        try {
            const userReq = await fetch('https://discord.com/api/users/@me', {
                headers: { authorization: `Bearer ${token}` }
            });
            
            if (!userReq.ok) throw new Error('Token expired');
            
            const user = await userReq.json();
            console.log('✅ User connecté:', user.username, `(${user.id})`);
            
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedCode, SECRET_KEY);
                const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
                
                if (!decryptedData || decryptedData === '') throw new Error('Décryptage échoué');
                
                webhookConfig = JSON.parse(decryptedData);
                console.log('✅ Config chargée:', {
                    webhook: webhookConfig.webhookUrl ? 'OK' : 'ERREUR',
                    form: webhookConfig.formName
                });
                
                // 🚫 Vérifier si le webhook est blacklisté
                const webhookIdMatch = webhookConfig.webhookUrl.match(/webhooks\/(\d+)/);
                if (webhookIdMatch) {
                    const webhookId = webhookIdMatch[1];
                    console.log(`🔍 Vérification blacklist pour webhook ${webhookId}...`);
                    
                    try {
                        const blacklistCheck = await fetch(`http://${BOT_API_URL}/api/check-webhook/${webhookId}`);
                        
                        if (blacklistCheck.ok) {
                            const blacklistData = await blacklistCheck.json();
                            
                            if (blacklistData.blacklisted) {
                                console.error('🚫 Lien désactivé');
                                
                                document.getElementById('form-container').innerHTML = `
                                    <div class="container">
                                        <div style="text-align: center; padding: 60px 20px;">
                                            <h1 style="color: var(--color-error); font-size: 3rem;">🚫 Lien désactivé</h1>
                                            <p style="font-size: 1.2rem; margin-top: 20px; color: var(--color-text-secondary);">Ce lien de formulaire a été désactivé par un administrateur.</p>
                                            <div style="margin-top: 30px; padding: 20px; background: var(--color-error-bg); border-radius: 8px; border-left: 4px solid var(--color-error);">
                                                <strong>Raison :</strong> ${blacklistData.reason || 'Aucune raison spécifiée'}
                                            </div>
                                            <p style="margin-top: 20px;">Contactez un modérateur pour plus d'informations.</p>
                                        </div>
                                    </div>
                                `;
                                return;
                            }
                        }
                    } catch (apiError) {
                        console.warn('⚠️ Impossible de vérifier la blacklist');
                    }
                }
                
                // Vérifier les tentatives via API bot
                console.log(`🔍 Vérification tentatives pour ${user.id}...`);
                try {
                    const checkResponse = await fetch(`http://${BOT_API_URL}/api/check-attempts/${user.id}`);
                    
                    if (!checkResponse.ok) {
                        console.warn('⚠️ API tentatives non disponible');
                        userLimitsData = { allowed: true, attempts: 0, maxAttempts: 1 };
                    } else {
                        userLimitsData = await checkResponse.json();
                        console.log('📊 Tentatives:', userLimitsData);
                        
                        const counter = document.getElementById('attempt-counter');
                        if (counter) {
                            if (!userLimitsData.allowed) {
                                counter.innerHTML = `<span style="color: var(--color-error); font-weight: 700;">❌ Limite atteinte (${userLimitsData.attempts}/${userLimitsData.maxAttempts})</span>`;
                                
                                document.getElementById('form-container').innerHTML = `
                                    <div class="container">
                                        <div style="text-align: center; padding: 60px 20px;">
                                            <h1 style="color: var(--color-error); font-size: 3rem;">❌ Accès refusé</h1>
                                            <p style="font-size: 1.2rem; margin-top: 20px; color: var(--color-text-secondary);">Vous avez déjà utilisé votre quota de tentatives (${userLimitsData.attempts}/${userLimitsData.maxAttempts}).</p>
                                            <p style="margin-top: 20px;">Contactez un modérateur pour obtenir une autorisation supplémentaire via <code>/autoriser</code>.</p>
                                        </div>
                                    </div>
                                `;
                                
                                const blockEmbed = {
                                    title: "⚠️ Tentative d'accès bloquée",
                                    description: `L'utilisateur **${user.username}** (\`${user.id}\`) a tenté d'accéder au formulaire mais a dépassé son quota.`,
                                    color: 0xd4351c,
                                    fields: [
                                        { name: "Tentatives", value: `${userLimitsData.attempts}/${userLimitsData.maxAttempts}`, inline: true },
                                        { name: "Action", value: "Utilisez `/autoriser` pour débloquer", inline: true }
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
                            } else {
                                counter.innerHTML = `📊 Tentative ${userLimitsData.attempts + 1}/${userLimitsData.maxAttempts}`;
                            }
                        }
                    }
                } catch (apiError) {
                    console.warn('⚠️ Continuer sans vérification');
                    userLimitsData = { allowed: true, attempts: 0, maxAttempts: 1 };
                }
                
                if (webhookConfig.customForm) {
                    console.log('🎨 Formulaire personnalisé détecté');
                    generateCustomForm(webhookConfig.customForm);
                }
                
            } catch (decryptError) {
                console.error('❌ Erreur décryptage:', decryptError);
                alert('❌ Erreur de décryptage du lien.\n\nContacte le support.');
                localStorage.removeItem('pending_code');
                localStorage.removeItem('discord_token');
                setTimeout(() => window.location.href = window.location.pathname, 3000);
                return;
            }
            
            document.getElementById('user-name').innerText = user.username;
            const avatarUrl = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
            document.getElementById('user-avatar').src = avatarUrl;
            window.discordUser = user;
            
        } catch (e) {
            console.error('❌ Erreur:', e);
            alert('❌ Une erreur est survenue.\n\n' + e.message);
            localStorage.removeItem('discord_token');
            if (!params.access_token) setTimeout(() => window.location.reload(), 2000);
        }
    }
    
    const fileInput = document.getElementById('attachments');
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
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
            uploadedFiles.push({ name: file.name, size: file.size, type: file.type, data: event.target.result });
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

document.getElementById('unbanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    const submitBtn = e.target.querySelector('.button-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Envoi en cours...';
    submitBtn.disabled = true;
    try {
        if (!webhookConfig) {
            let encryptedCode = localStorage.getItem('pending_code').replace(/-/g, '+').replace(/_/g, '/');
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
            alert("❌ Vous devez accepter le protocole de confidentialité.");
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            isSubmitting = false;
            return;
        }
        let pingContent = '';
        if (pingType === 'everyone') pingContent = '@everyone';
        else if (pingType === 'here') pingContent = '@here';
        let fields = [];
        if (webhookConfig.customForm) {
            webhookConfig.customForm.questions.forEach((q, index) => {
                const fieldName = `custom_field_${index}`;
                let value = formData.get(fieldName) || '_Non fourni_';
                if (q.type === 'checkbox') {
                    const checked = formData.getAll(`${fieldName}[]`);
                    value = checked.length > 0 ? checked.join(', ') : '_Aucune sélection_';
                }
                fields.push({ name: q.label, value: value.substring(0, 1024), inline: false });
            });
        } else {
            fields = [
                { name: "📅 Date de la sanction", value: formData.get("date_blacklist") || "Non renseignée", inline: true },
                { name: "❓ Raison connue", value: formData.get("reason_known"), inline: true },
                { name: "\u200b", value: "\u200b", inline: false },
                { name: "📝 Explication", value: (formData.get("reason_explanation") || formData.get("reason_unknown") || "_Aucune_").substring(0, 1024) },
                { name: "⚖️ Position", value: `**${formData.get("agreement")}**\n${formData.get("agreement_desc").substring(0, 900)}` },
                { name: "🏳️ Reconnaissance", value: `**${formData.get("admission")}**\n${formData.get("admission_desc").substring(0, 900)}` },
                { name: "🔧 Analyse", value: formData.get("analysis").substring(0, 1024) },
                { name: "✨ Motivation", value: formData.get("motivation").substring(0, 1024) }
            ];
            if (formData.get("extras")) fields.push({ name: "💬 Infos supplémentaires", value: formData.get("extras").substring(0, 1024) });
        }
        if (uploadedFiles.length > 0) {
            const fileNames = uploadedFiles.map(f => `📄 ${f.name}`).join('\n');
            fields.push({ name: "📎 Pièces jointes", value: fileNames.substring(0, 1024) });
        }
        const mainEmbed = {
            title: "📨 Nouvelle demande de révision de sanction",
            description: `**Utilisateur :** ${user.username} (\`${user.id}\`)`,
            color: 0x6366f1,
            thumbnail: { url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png` },
            fields: fields,
            footer: { text: "Système Chell" },
            timestamp: new Date().toISOString()
        };
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: pingContent, embeds: [mainEmbed] })
        });
        if (!response.ok) throw new Error('Erreur webhook');
        for (const file of uploadedFiles) {
            const formDataFile = new FormData();
            const blob = await fetch(file.data).then(r => r.blob());
            formDataFile.append('files[0]', blob, file.name);
            formDataFile.append('content', `📎 Pièce jointe de **${user.username}**`);
            await fetch(webhookUrl, { method: "POST", body: formDataFile });
        }
        try {
            await fetch(`http://${BOT_API_URL}/api/increment-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            console.log('✅ Tentative incrémentée');
        } catch (err) {
            console.warn('⚠️ Impossible d\'incrémenter');
        }
        alert("✅ Demande envoyée avec succès !");
        localStorage.removeItem('pending_code');
        localStorage.removeItem('discord_token');
        window.location.href = "https://discord.gg/f5HpfrvWXx";
    } catch (err) {
        console.error('❌ Erreur:', err);
        alert("❌ Erreur lors de l'envoi\n\n" + err.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        isSubmitting = false;
    }
});