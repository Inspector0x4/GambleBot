const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Configuration

const TOKEN = '';
const CLIENT_ID = '1420513192571965452';
const GUILD_ID = '1383848181694988439'; // Pour les commandes de guild spécifiques

// ✅ INTENTS CORRECTS - Seul Guilds nécessaire pour les slash commands
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Base de données SQLite
const db = new sqlite3.Database('wins.db');

// Création de la table wins
db.run(`
    CREATE TABLE IF NOT EXISTS wins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        slot_name TEXT NOT NULL,
        win_link TEXT NOT NULL,
        montant_gagne REAL NOT NULL,
        montant_bet REAL NOT NULL,
        montant_achat REAL NOT NULL,
        multiplication REAL NOT NULL,
        max_win INTEGER NOT NULL DEFAULT 0,
        date_created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Commandes slash
const commands = [
    new SlashCommandBuilder()
        .setName('winadd')
        .setDescription('Ajouter une win au classement')
        .addStringOption(option =>
            option.setName('slot_name')
                .setDescription('Nom du slot')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('win_link')
                .setDescription('Lien de la win')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('montant_gagne')
                .setDescription('Montant gagné')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('montant_bet')
                .setDescription('Montant de la bet')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('montant_achat')
                .setDescription('Montant de l\'achat')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('maxwin')
                .setDescription('Est-ce une max win?')
                .setRequired(true)
                .addChoices(
                    { name: 'Oui', value: 'oui' },
                    { name: 'Non', value: 'non' }
                )
        ),
    
    new SlashCommandBuilder()
        .setName('winlist')
        .setDescription('Afficher le classement des wins')
        .addStringOption(option =>
            option.setName('recherche')
                .setDescription('Rechercher par nom de slot (optionnel)')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('wintop')
        .setDescription('Afficher le top des multiplications'),
    
    new SlashCommandBuilder()
        .setName('winuser')
        .setDescription('Afficher les wins d\'un utilisateur')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Utilisateur à rechercher')
                .setRequired(true)
        )
].map(command => command.toJSON());

// Enregistrement des commandes
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Démarrage de l\'enregistrement des commandes slash...');
        
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        
        console.log('Commandes slash enregistrées avec succès!');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes:', error);
    }
})();

// Événement ready
client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}!`);
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user } = interaction;

    if (commandName === 'winadd') {
        const slotName = options.getString('slot_name');
        const winLink = options.getString('win_link');
        const montantGagne = options.getNumber('montant_gagne');
        const montantBet = options.getNumber('montant_bet');
        const montantAchat = options.getNumber('montant_achat');
        const maxWin = options.getString('maxwin') === 'oui' ? 1 : 0;
        
        // Validation des données
        if (montantBet <= 0) {
            return await interaction.reply({
                content: '❌ Le montant de la bet doit être supérieur à 0!',
                ephemeral: true
            });
        }
        
        // Calcul de la multiplication
        const multiplication = montantGagne / montantBet;
        
        // Insertion dans la base de données
        const stmt = db.prepare(`
            INSERT INTO wins (user_id, username, slot_name, win_link, montant_gagne, montant_bet, montant_achat, multiplication, max_win)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            user.id,
            user.username,
            slotName,
            winLink,
            montantGagne,
            montantBet,
            montantAchat,
            multiplication,
            maxWin
        ], function(err) {
            if (err) {
                console.error('Erreur base de données:', err);
                return interaction.reply({
                    content: '❌ Erreur lors de l\'ajout de la win!',
                    ephemeral: true
                });
            }
        });
        
        stmt.finalize();
        
        // Création de l'embed de confirmation
        const embed = new EmbedBuilder()
            .setTitle('✅ Win ajoutée avec succès!')
            .setColor(maxWin ? '#FFD700' : '#00FF00') // Or pour max win, vert sinon
            .addFields(
                { name: '🎰 Slot', value: slotName, inline: true },
                { name: '💰 Montant gagné', value: `${montantGagne}$ARS`, inline: true },
                { name: '🎯 Montant bet', value: `${montantBet}$ARS`, inline: true },
                { name: '💳 Montant achat', value: `${montantAchat}$ARS`, inline: true },
                { name: '📊 Multiplication', value: `x${multiplication.toFixed(2)}`, inline: true },
                { name: '🏆 Max Win', value: maxWin ? 'Oui' : 'Non', inline: true },
                { name: '🔗 Lien', value: `[Voir la win](${winLink})` }
            )
            .setFooter({ text: `Ajouté par ${user.username}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'winlist') {
        const recherche = options.getString('recherche');
        
        let query = 'SELECT * FROM wins';
        let params = [];
        
        if (recherche) {
            query += ' WHERE slot_name LIKE ?';
            params.push(`%${recherche}%`);
        }
        
        query += ' ORDER BY multiplication DESC LIMIT 10';
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Erreur base de données:', err);
                return interaction.reply({
                    content: '❌ Erreur lors de la récupération des données!',
                    ephemeral: true
                });
            }
            
            if (rows.length === 0) {
                return interaction.reply({
                    content: recherche ? 
                        `❌ Aucune win trouvée pour "${recherche}"` : 
                        '❌ Aucune win enregistrée!',
                    ephemeral: true
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle(recherche ? `🔍 Recherche: "${recherche}"` : '🏆 Classement des Wins')
                .setColor('#0099ff')
                .setFooter({ text: `${rows.length} win(s) trouvée(s)` });
            
            let description = '```\n';
            description += 'Rang | Slot              | Multi  | Gagné   | User\n';
            description += '─────┼───────────────────┼────────┼─────────┼──────────\n';
            
            rows.forEach((row, index) => {
                const rang = (index + 1).toString().padStart(3);
                const slot = row.slot_name.substring(0, 17).padEnd(17);
                const multi = `x${row.multiplication.toFixed(2)}`.padStart(6);
                const gagne = `${row.montant_gagne}$ARS`.padStart(7);
                const user = row.username.substring(0, 10);
                const maxWinIcon = row.max_win ? '👑' : '';
                
                description += `${rang}  | ${slot} | ${multi} | ${gagne} | ${user} ${maxWinIcon}\n`;
            });
            
            description += '```';
            embed.setDescription(description);
            
            interaction.reply({ embeds: [embed] });
        });
    }
    
    else if (commandName === 'wintop') {
        db.all('SELECT * FROM wins ORDER BY multiplication DESC LIMIT 15', (err, rows) => {
            if (err) {
                console.error('Erreur base de données:', err);
                return interaction.reply({
                    content: '❌ Erreur lors de la récupération des données!',
                    ephemeral: true
                });
            }
            
            if (rows.length === 0) {
                return interaction.reply({
                    content: '❌ Aucune win enregistrée!',
                    ephemeral: true
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🏆 TOP 15 - Meilleures Multiplications')
                .setColor('#FFD700');
            
            let topList = '';
            rows.forEach((row, index) => {
                const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                const maxWin = row.max_win ? ' 👑' : '';
                
                topList += `${medal} **x${row.multiplication.toFixed(2)}** - ${row.slot_name}\n`;
                topList += `    ${row.montant_gagne}$ARS (bet: ${row.montant_bet}$ARS) - ${row.username}${maxWin}\n\n`;
            });
            
            embed.setDescription(topList);
            interaction.reply({ embeds: [embed] });
        });
    }
    
    else if (commandName === 'winuser') {
        const targetUser = options.getUser('user');
        
        db.all(
            'SELECT * FROM wins WHERE user_id = ? ORDER BY multiplication DESC',
            [targetUser.id],
            (err, rows) => {
                if (err) {
                    console.error('Erreur base de données:', err);
                    return interaction.reply({
                        content: '❌ Erreur lors de la récupération des données!',
                        ephemeral: true
                    });
                }
                
                if (rows.length === 0) {
                    return interaction.reply({
                        content: `❌ ${targetUser.username} n'a aucune win enregistrée!`,
                        ephemeral: true
                    });
                }
                
                // Calcul des statistiques
                const totalWins = rows.length;
                const maxWins = rows.filter(r => r.max_win === 1).length;
                const totalGagne = rows.reduce((sum, r) => sum + r.montant_gagne, 0);
                const totalBet = rows.reduce((sum, r) => sum + r.montant_bet, 0);
                const meilleureMulti = Math.max(...rows.map(r => r.multiplication));
                
                const embed = new EmbedBuilder()
                    .setTitle(`📊 Statistiques de ${targetUser.username}`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setColor('#9932CC')
                    .addFields(
                        { name: '🎯 Total wins', value: totalWins.toString(), inline: true },
                        { name: '👑 Max wins', value: maxWins.toString(), inline: true },
                        { name: '💰 Total gagné', value: `${totalGagne}$ARS`, inline: true },
                        { name: '🎲 Total misé', value: `${totalBet}$ARS`, inline: true },
                        { name: '📈 Meilleure multi', value: `x${meilleureMulti.toFixed(2)}`, inline: true },
                        { name: '📊 Bénéfice', value: `${(totalGagne - totalBet).toFixed(2)}$ARS`, inline: true }
                    );
                
                // Top 5 des wins de l'utilisateur
                let userTop = '';
                rows.slice(0, 5).forEach((row, index) => {
                    const maxWin = row.max_win ? ' 👑' : '';
                    userTop += `${index + 1}. **x${row.multiplication.toFixed(2)}** - ${row.slot_name}${maxWin}\n`;
                });
                
                embed.addFields({ name: '🏆 Top 5 des wins', value: userTop });
                
                interaction.reply({ embeds: [embed] });
            }
        );
    }
});

// Démarrage du bot
client.login(TOKEN);
