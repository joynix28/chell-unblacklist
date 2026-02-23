const CLIENT_ID = "1475575856993665134"; 
const SECRET_KEY = "CHELL_SECURITY_KEY_2026_ULTRA_SECURE";

const REDIRECT_URI = window.location.origin + window.location.pathname;

function getParams() {
    const hash = window.location.hash.substring(1);
    const query = window.location.search.substring(1);
    return {
        ...Object.fromEntries(new URLSearchParams(hash)),
        ...Object.fromEntries(new URLSearchParams(query))
    };
}

const params = getParams();

function loginDiscord() {
    const encryptedCode = params.code || localStorage.getItem('pending_code');
    if (!encryptedCode) {
        alert("❌ Lien invalide. Génère un lien avec la commande /appel sur le serveur Discord.");
        return;
    }
    
    localStorage.setItem('pending_code', encryptedCode);
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify&state=${encryptedCode}`;
    window.location.href = authUrl;
}

window.onload = async () => {
    if (params.access_token) {
        localStorage.setItem('discord_token', params.access_token);
        if (params.state) localStorage.setItem('pending_code', params.state);
        window.history.replaceState(null, null, window.location.pathname);
    }

    const token = localStorage.getItem('discord_token');
    const encryptedCode = params.code || localStorage.getItem('pending_code');

    if (!encryptedCode) {
        document.body.innerHTML = "<div style='color:white;text-align:center;margin-top:20%;font-family:Inter,sans-serif'><h1>❌ Lien invalide</h1><p>Utilise la commande /appel sur le serveur pour générer un lien valide.</p></div>";
        return;
    }
    
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
            
            document.getElementById('user-name').innerText = user.username;
            document.getElementById('user-avatar').src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
            window.discordUser = user;
        } catch (e) {
            localStorage.removeItem('discord_token');
            if (!params.access_token) window.location.reload();
        }
    }
};

function toggleReasonInput() {
    const val = document.getElementById('reason_known').value;
    document.getElementById('reason_yes').classList.add('hidden');
    document.getElementById('reason_no').classList.add('hidden');
    if (val === 'Oui') document.getElementById('reason_yes').classList.remove('hidden');
    if (val === 'Non') document.getElementById('reason_no').classList.remove('hidden');
}

let isSubmitting = false;

document.getElementById('unbanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    isSubmitting = true;
    
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Envoi en cours...';
    submitBtn.disabled = true;
    
    const encryptedCode = localStorage.getItem('pending_code');
    
    try {
        const bytes = CryptoJS.AES.decrypt(decodeURIComponent(encryptedCode), SECRET_KEY);
        const webhookUrl = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!webhookUrl.startsWith("http")) throw new Error("URL invalide");
        
        const formData = new FormData(e.target);
        const user = window.discordUser;
        
        const embed = {
            title: "📨 Nouvelle demande d'Unblacklist",
            color: 0x6366f1,
            thumbnail: { url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` },
            fields: [
                { name: "👤 Utilisateur", value: `${user.username} (<@${user.id}>)\nID: \`${user.id}\``, inline: false },
                { name: "📅 Date du blacklist", value: formData.get("date_blacklist") || "Non renseignée", inline: true },
                { name: "❓ Raison connue ?", value: formData.get("reason_known"), inline: true },
                { name: "📝 Explication", value: (formData.get("reason_explanation") || formData.get("reason_unknown") || "Aucune explication fournie").substring(0, 1024) },
                { name: "⚖️ Accord avec sanction", value: `**${formData.get("agreement")}**\n${formData.get("agreement_desc").substring(0, 900)}` },
                { name: "🏳️ Reconnaissance des faits", value: `**${formData.get("admission")}**\n${formData.get("admission_desc").substring(0, 900)}` },
                { name: "🔧 Analyse personnelle", value: formData.get("analysis").substring(0, 1024) },
                { name: "✨ Motivation", value: formData.get("motivation").substring(0, 1024) }
            ],
            footer: { text: "Système Unblacklist • Chell Bot" },
            timestamp: new Date().toISOString()
        };
        
        if (formData.get("extras")) {
            embed.fields.push({ name: "💬 Compléments", value: formData.get("extras").substring(0, 1024) });
        }

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] })
        });
        
        if (!response.ok) throw new Error('Erreur webhook');

        alert("✅ Demande envoyée avec succès !\n\nL'équipe de modération examinera ta demande.");
        localStorage.removeItem('pending_code');
        localStorage.removeItem('discord_token');
        window.location.href = "https://discord.com";
        
    } catch (err) {
        console.error(err);
        alert("❌ Erreur : Le lien est invalide, expiré ou corrompu.\n\nGénère un nouveau lien avec /appel.");
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        isSubmitting = false;
    }
});