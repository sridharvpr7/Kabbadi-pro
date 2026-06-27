let editMode = false;
let editTeamIndex = null;
let editPlayerIndex = null;
let currentTeam = null;

/* ===================== IMPROVED LOCAL STORAGE LAYER ===================== */
/*
   All reads/writes to localStorage go through these helpers so that:
   - A corrupted / manually-edited localStorage value can never crash the app
     (bad JSON just falls back to a safe default instead of breaking load).
   - A full / blocked storage (private browsing, quota exceeded) fails
     quietly with a console warning + one-time alert instead of losing data
     silently or throwing inside random click handlers.
   - Every "save the whole teams/fixtures array" call site uses the exact
     same logic, so it's easy to extend later (e.g. add versioning/backups).
*/

let storageWarned = false;

function safeGetJSON(key, fallback) {
    try {
        let raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        console.error(`⚠️ Corrupt data for "${key}" in localStorage, using default.`, err);
        return fallback;
    }
}

function safeSetJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.error(`⚠️ Failed to save "${key}" to localStorage.`, err);
        if (!storageWarned) {
            storageWarned = true;
            alert("⚠️ Could not save data to your browser's storage (it may be full or in private mode). Your changes might be lost on refresh — consider using 📥 Export JSON to back up now.");
        }
        return false;
    }
}

function safeSetRaw(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err) {
        console.error(`⚠️ Failed to save "${key}" to localStorage.`, err);
        return false;
    }
}

/* Save the full in-memory teams / fixtures arrays. Use these everywhere
   instead of calling localStorage.setItem(...) directly. */
function saveTeams() {
    return safeSetJSON("teams", teams);
}

function saveFixtures() {
    return safeSetJSON("fixtures", fixtures);
}

let teams = safeGetJSON("teams", []);
let fixtures = safeGetJSON("fixtures", []);

/* RESET MATCH */

function resetMatch() {
    if (!confirm("Delete ALL data?")) return;

    localStorage.clear();

    teams = [];
    fixtures = [];

    document.getElementById("teamlist").innerHTML = "";
    document.getElementById("playerTable").innerHTML = "";
    document.getElementById("fixtureList").innerHTML = "";
    document.getElementById("pointsBody").innerHTML = "";

    document.querySelectorAll(".dashcard p")[0].innerText = "0";
    document.querySelectorAll(".dashcard p")[1].innerText = "0";
    document.querySelectorAll(".dashcard p")[2].innerText = "0";

    document.querySelector(".winner").innerText = "";

    alert("FULL RESET DONE 🔥");
}

/* CLOSE ALL PAGE */

function closeall() {
    document.querySelector(".body1").style.display = "none";
    document.getElementById("team").style.display = "none";
    document.getElementById("players").style.display = "none";
    document.getElementById("point").style.display = "none";
    document.getElementById("fixtures").style.display = "none";
    document.getElementById("analysis").style.display = "none";
}

/* SHOW HOME PAGE */

function showhome() {
    closeall();
    document.querySelector(".body1").style.display = "block";
}

/* SHOW TEAM PAGE */

function showteam() {
    closeall();
    document.getElementById("team").style.display = "block";
}

/* SHOW PLAYERS PAGE */

function showplayers() {
    closeall();
    document.getElementById("players").style.display = "block";
}

/* SHOW POINT PAGE */

function showpoint() {
    closeall();
    document.getElementById("point").style.display = "block";
}

/* SHOW FIXTURES PAGE */

function showfixtures() {
    closeall();
    document.getElementById("fixtures").style.display = "block";
}

/* SHOW ANALYSIS PAGE */

function showanalysis() {
    closeall();
    document.getElementById("analysis").style.display = "block";
    loadAnalysis();
}

/* ADD TEAM */

function addTeam() {

    let teamname =
        document.getElementById("teamname").value.trim();

    if (teamname === "") {
        alert("Enter Team Name");
        return;
    }

    if (
        teams.some(
            t => t.name.toLowerCase() === teamname.toLowerCase()
        )
    ) {
        alert("Team already exists");
        return;
    }

    teams.push({
        name: teamname,
        players: []
    });

    saveTeams();

    document.getElementById("teamname").value = "";

    loadTeams();
}

/* DELETE TEAM */

function deleteTeam(index) {
    if (!confirm("Delete this team?")) return;

    teams.splice(index, 1);
    saveTeams();

    loadTeams();
    loadPlayers();
}

/* LOAD TEAM */

function loadTeams() {

    let teamlist = document.getElementById("teamlist");
    teamlist.innerHTML = "";

    teams.forEach((team, index) => {

        let borderColor = "red";

        if (team.players.length === 0) {
            borderColor = "red";
        } else if (team.players.length < 7) {
            borderColor = "blue";
        } else {
            borderColor = "green";
        }

        let color = "red";

        if (team.players.length === 0) {
            color = "red";
        } else if (team.players.length < 7) {
            color = "blue";
        } else {
            color = "green";
        }

        teamlist.innerHTML += `
<div class="teamcard"
style="
border-left:8px solid ${borderColor};
padding-left:10px;
">

<div class="pcount">
    ${team.players.length >= 7
                ? `<p style="color:${color};font-weight:bold;">
             ✅ Min Players Reached
           </p>`
                : `<p style="color:${color};font-weight:bold;">
             Need ${7 - team.players.length} More Players <br>
           </p>`
            }
</div>

<h3 style="width:170px;">${team.name}</h3>

<p>
Players :
${team.players.length} /
${localStorage.getItem("maxPlayers") || 12}
</p>

<div style="display:flex; justify-content:space-between;">
    <button onclick="deleteTeam(${index})">Delete</button>

    <button class="teammanage"
    onclick="teammanagement(${index})">
        Add teammate
    </button>
</div>

</div>`;
    });

    document.querySelectorAll(".dashcard p")[0].innerText = teams.length;
}

/* TEAM MANAGEMENT */

function teammanagement(index) {
    currentTeam = index;
    document.getElementById("selectedTeamName").innerText = teams[index].name;
    document.getElementById("teammanagement").style.display = "block";
}

/* CLOSE TEAM MANAGEMENT */

function closeteammanagement() {
    document.getElementById("teammanagement").style.display = "none";
    editMode = false;
    editTeamIndex = null;
    editPlayerIndex = null;
    clearForm();
}

/* SUBMIT FORM */

function submitform() {

    let maxPlayers =
        Number(localStorage.getItem("maxPlayers")) || 12;

    if (
        !editMode &&
        teams[currentTeam].players.length >= maxPlayers
    ) {
        alert(`Maximum ${maxPlayers} players allowed`);
        return;
    }

    let playerName = document.getElementById("playername").value;
    let age = document.getElementById("age").value;
    let jnum = document.getElementById("jnum").value;


    if (jnum == "") {
        alert("Enter a jersey number")
        return;
    }


    if (teams[currentTeam].players.some(
        p => p.jnum === jnum && !editMode
    )) {
        alert("Jersey Number Already Exists");
        return;
    }


    let dob = document.getElementById("dob").value;
    let height = document.getElementById("height").value;
    let weight = Number(document.getElementById("weight").value);


    if (weight == "") {
        alert("Enter a player weight in kg")
        return;
    }


    let contact = document.getElementById("contact").value;


    if (contact.length !== 10) {
        alert("Enter Valid Mobile Number");
        return;
    }


    let position = document.getElementById("position").value;


    if (position == "") {
        alert("Enter a player position")
        return;
    }


    let place = document.getElementById("place").value;
    let captain = document.getElementById("captain").checked;
    let vicecaptain = document.getElementById("vicecaptain").checked;

    if (playerName.trim() === "") {
        alert("Enter Player Name");
        return;
    }

    let limit =
        Number(localStorage.getItem("weightLimit")?.replace(" Kg", "")) || 0;

    if (limit > 0 && weight > limit) {
        alert(
            `❌ Weight Limit Exceeded!\n\nPlayer Weight : ${weight} Kg\nAllowed Weight : ${limit} Kg`
        );
        return;
    }

    let oldPlayer = teams[editTeamIndex]?.players[editPlayerIndex];

    let playerData = {
        name: playerName,
        jnum: jnum,
        age: age,
        dob: dob,
        height: height,
        weight: weight,
        contact: contact,
        position: position,
        place: place,
        captain: captain,
        vicecaptain: vicecaptain,

        raidPoints: oldPlayer?.raidPoints || 0,
        defencePoints: oldPlayer?.defencePoints || 0,
        totalPoints: oldPlayer?.totalPoints || 0,

        onCourt: oldPlayer?.onCourt ?? false,
        out: oldPlayer?.out || false,
        suspended: oldPlayer?.suspended || false,
        cards: oldPlayer?.cards || { green: 0, yellow: 0, red: 0 }
    };

    if (editMode) {

        teams[editTeamIndex].players[editPlayerIndex] = playerData;

        editMode = false;
        editTeamIndex = null;
        editPlayerIndex = null;

    } else {

        teams[currentTeam].players.push(playerData);

    }

    saveTeams();

    loadTeams();
    loadPlayers();

    clearForm();
    closeteammanagement();

    alert("✅ Player Saved Successfully");
}

/* LOAD PLAYERS */

function loadPlayers() {
    let totalPlayers = 0;
    teams.forEach(team => {
        totalPlayers += team.players.length;
    });

    document.querySelectorAll(".dashcard p")[1].innerText = totalPlayers;

    let playerTable = document.getElementById("playerTable");
    playerTable.innerHTML = "";

    teams.forEach((team, teamIndex) => {
        playerTable.innerHTML += `
        <h2 style="color:white; padding:10px; font-size:30px; ">${team.name}</h2>
        <table border="1" width="100%" style="width: 98%; margin-left: 1%;">
            <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Jersey</th>
                <th>Age</th>
                <th>Dob</th>
                <th>Height</th>
                <th>Weight</th>
                <th>Contact</th>
                <th>Position</th>
                <th>Place</th>
                <th>Captain</th>
                <th>Vice Captain</th>
                <th>Actions</th>
            </tr>
            ${team.players.map((player, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.jnum}</td>
                    <td>${player.age}</td>
                    <td>${player.dob}</td>
                    <td>${player.height}</td>
                    <td>${player.weight}</td>
                    <td>${player.contact}</td>
                    <td>${player.position}</td>
                    <td>${player.place}</td>
                    <td>${player.captain ? "✅" : "❌"}</td>
                    <td>${player.vicecaptain ? "✅" : "❌"}</td>
                    <td>
                        <button onclick="editPlayer(${teamIndex},${index}),showteam()" class="jsbtn" style="background-color: rgb(46, 46, 255);">Edit</button>
                        <button onclick="deletePlayer(${teamIndex},${index})" class="jsbtn" style="background-color: red;">Delete</button>
                    </td>
                </tr>
            `).join("")}
        </table>
        <br><br>`;
    });
}

/* EDIT  PLAYERS */

function editPlayer(teamIndex, playerIndex) {
    currentTeam = teamIndex;
    document.getElementById("selectedTeamName").innerText = teams[teamIndex].name;

    let player = teams[teamIndex].players[playerIndex];

    document.getElementById("playername").value = player.name;
    document.getElementById("jnum").value = player.jnum;
    document.getElementById("age").value = player.age;
    document.getElementById("dob").value = player.dob;
    document.getElementById("height").value = player.height;
    document.getElementById("weight").value = player.weight;
    document.getElementById("contact").value = player.contact;
    document.getElementById("position").value = player.position;
    document.getElementById("place").value = player.place;
    document.getElementById("captain").checked = player.captain;
    document.getElementById("vicecaptain").checked = player.vicecaptain;

    document.querySelector(".form button").innerText = "Update";

    editMode = true;
    editTeamIndex = teamIndex;
    editPlayerIndex = playerIndex;

    document.getElementById("teammanagement").style.display = "block";
}

/* CLEAR FORM */

function clearForm() {
    document.getElementById("playername").value = "";
    document.getElementById("jnum").value = "";
    document.getElementById("age").value = "";
    document.getElementById("dob").value = "";
    document.getElementById("height").value = "";
    document.getElementById("weight").value = "";
    document.getElementById("contact").value = "";
    document.getElementById("position").selectedIndex = 0;
    document.getElementById("place").selectedIndex = 0;
    document.getElementById("captain").checked = false;
    document.getElementById("vicecaptain").checked = false;

    document.querySelector(".form button").innerText = "Submit";
}

/* DELETE PLAYER */

function deletePlayer(teamIndex, playerIndex) {
    if (!confirm("Delete this player?")) return;

    teams[teamIndex].players.splice(playerIndex, 1);
    saveTeams();
    loadTeams();
    loadPlayers();
}

/* GENARATE FIXTURES */

function generateFixtures() {

    let type = document.getElementById("fixtureType").value;

    if (type === "") {
        alert("Select Tournament Format");
        return;
    }

    if (teams.length < 2) {
        alert("Minimum 2 teams required");
        return;
    }

    fixtures = [];

    if (type === "roundrobin") {

        let teamNames = teams.map(t => t.name);

        if (teamNames.length % 2 !== 0) {
            teamNames.push("BYE");
        }

        let totalRounds = teamNames.length - 1;
        let half = teamNames.length / 2;

        for (let round = 0; round < totalRounds; round++) {

            for (let i = 0; i < half; i++) {

                let team1 = teamNames[i];
                let team2 = teamNames[teamNames.length - 1 - i];

                if (team1 !== "BYE" && team2 !== "BYE") {

                    fixtures.push({
                        round: round + 1,
                        team1,
                        team2,
                        score1: "",
                        score2: "",
                        status: "Upcoming"
                    });

                }
            }

            let fixed = teamNames[0];
            let rest = teamNames.slice(1);

            rest.unshift(rest.pop());

            teamNames = [fixed, ...rest];
        }

    }

    else if (type === "knockout") {

        let shuffled = [...teams]
            .sort(() => Math.random() - 0.5);

        let round = 1;

        for (let i = 0; i < shuffled.length; i += 2) {

            let team1 = shuffled[i]?.name || "BYE";
            let team2 = shuffled[i + 1]?.name || "BYE";

            fixtures.push({
                round: "Knockout Round " + round,
                team1,
                team2,
                score1: "",
                score2: "",
                status: "Upcoming",
                knockout: true
            });

            round++;
        }
    }

    saveFixtures();

    loadFixtures();
    loadMatchStatus();
    loadTournamentInfo();

    document.querySelectorAll(".dashcard p")[2].innerText =
        fixtures.length;

    alert(type.toUpperCase() + " Fixtures Generated ✅");

    loadTournamentRecords();
}

/* LOAD FIXTURES */

function loadFixtures() {

    let fixtureList = document.getElementById("fixtureList");
    fixtureList.innerHTML = "";

    let currentRound = 0;

    fixtures.forEach((match, index) => {

        if (match.round !== currentRound) {

            currentRound = match.round;

            fixtureList.innerHTML += `
            <h2 class="round-header">
                ROUND ${currentRound}
            </h2>`;
        }

        fixtureList.innerHTML += `
        <div class="fixture-card">

            <h3>${match.team1} VS ${match.team2}</h3>

            <p><span class="status-badge status-${match.status}">${match.status}</span></p>

            <div id="coin${index}">🪙</div>

            <button onclick="coinToss(${index})"
            style="background:orange;height:35px;width:90px;">
                Coin Toss
            </button>

            <h4 id="tossResult${index}">Toss result</h4>

            ${match.score1 !== "" || match.score2 !== ""
                ? `<p>Score : ${match.score1} - ${match.score2}</p>`
                : ""
            }

            ${match.status === "Completed"
                ? `<button style="background:blue"
                     onclick="reopenMatch(${index})">
                     Reopen Match
                   </button>
                   <button style="background:#444;color:white;"
                     onclick="downloadMatchPDF(${index})">
                     📄 Download Match PDF
                   </button>
                   <button style="background:#0f766e;color:white;"
                     onclick="downloadMatchJSON(${index})">
                     📄 Export Match JSON
                   </button>`
                : `<button onclick="startMatch(${index})">
                     Start Match
                   </button>`
            }

            <div id="matchPanel${index}"></div>

        </div>`;
    });
}

/* COIN TOSS */

function coinToss(index) {

    let coin =
        document.getElementById(`coin${index}`);

    let result =
        document.getElementById(`tossResult${index}`);

    if (!coin || !result) return;

    coin.style.transition = "transform 2s";
    coin.style.transform = "rotateY(1800deg)";

    result.innerText = "Tossing...";

    setTimeout(() => {
        result.innerText =
            Math.random() < 0.5
                ? "HEADS"
                : "TAILS";
    }, 2000);
}

/* BUILD PLAYER LIST HTML (ONLY ON-COURT, NON-ELIMINATED PLAYERS) */

function cardControlsHTML(matchIndex, teamNum, playerIndex, player) {
    if (!player.cards) player.cards = { green: 0, yellow: 0, red: 0 };

    return `
        <div class="cardrow">
            <button class="cardbtn" title="Green Card" onclick="giveCard(${matchIndex},${teamNum},${playerIndex},'green')">🟩</button>
            <button class="cardbtn" title="Yellow Card" onclick="giveCard(${matchIndex},${teamNum},${playerIndex},'yellow')">🟨</button>
            <button class="cardbtn" title="Red Card" onclick="giveCard(${matchIndex},${teamNum},${playerIndex},'red')">🟥</button>
            <span id="cards_${teamNum}_${matchIndex}_${playerIndex}" class="cardcount">🟩${player.cards.green} 🟨${player.cards.yellow} 🟥${player.cards.red}</span>
            <span id="suspend_${teamNum}_${matchIndex}_${playerIndex}" class="suspended-badge">${player.suspended ? "⏳ Suspended (2 min)" : ""}</span>
        </div>`;
}

function playerListsHTML(matchIndex, teamNum, teamObj) {

    let active = teamObj.players
        .map((p, i) => ({ p, i }))
        .filter(o => o.p.onCourt && !o.p.out);

    let raiders = active.filter(o => o.p.position === "raider").map(({ p, i }) => `
        <div class="rbody">
            <p>#${p.jnum} ${p.name}</p>
            <button onclick="playerRaid(${matchIndex},${teamNum},${i})">+</button>
            <button onclick="playerRaidMinus(${matchIndex},${teamNum},${i})">-</button> <br>
            Total :<span id="raid_${teamNum}_${matchIndex}_${i}" style="margin-left:10px;">${p.raidPoints}</span>
            ${cardControlsHTML(matchIndex, teamNum, i, p)}
        </div>`).join("");

    let defenders = active.filter(o => o.p.position === "defender").map(({ p, i }) => `
        <div class="dbody">
            <p>#${p.jnum} ${p.name}</p>
            <button onclick="playerDefence(${matchIndex},${teamNum},${i})">+</button>
            <button onclick="playerDefenceMinus(${matchIndex},${teamNum},${i})">-</button> <br>
            Total :<span id="def_${teamNum}_${matchIndex}_${i}" style="margin-left:10px;">${p.defencePoints}</span>
            ${cardControlsHTML(matchIndex, teamNum, i, p)}
        </div>`).join("");

    let allrounders = active.filter(o => o.p.position === "allrounder").map(({ p, i }) => `
        <div class="arbody">
            <p>#${p.jnum} ${p.name}</p>
            <button onclick="playerRaid(${matchIndex},${teamNum},${i})">R+</button>
            <button onclick="playerRaidMinus(${matchIndex},${teamNum},${i})">R-</button>
            <button onclick="playerDefence(${matchIndex},${teamNum},${i})">D+</button>
            <button onclick="playerDefenceMinus(${matchIndex},${teamNum},${i})">D-</button> <br>
            Raid :<span id="raid_${teamNum}_${matchIndex}_${i}" style="margin-left:10px;">${p.raidPoints}</span> |
            Def :<span id="def_${teamNum}_${matchIndex}_${i}">${p.defencePoints}</span>
            ${cardControlsHTML(matchIndex, teamNum, i, p)}
        </div>`).join("");

    return {
        raiders: raiders || `<p class="emptylist">No active raiders</p>`,
        defenders: defenders || `<p class="emptylist">No active defenders</p>`,
        allrounders: allrounders || `<p class="emptylist">No active all rounders</p>`
    };
}

function refreshPlayerLists(matchIndex, teamNum) {

    let teamName = teamNum === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let teamObj = teams.find(t => t.name === teamName);
    if (!teamObj) return;

    let lists = playerListsHTML(matchIndex, teamNum, teamObj);

    let raidersEl = document.getElementById(`raidersList${teamNum}_${matchIndex}`);
    let defendersEl = document.getElementById(`defendersList${teamNum}_${matchIndex}`);
    let allroundersEl = document.getElementById(`allroundersList${teamNum}_${matchIndex}`);

    if (raidersEl) raidersEl.innerHTML = lists.raiders;
    if (defendersEl) defendersEl.innerHTML = lists.defenders;
    if (allroundersEl) allroundersEl.innerHTML = lists.allrounders;

    refreshSubstitutionPanel(matchIndex, teamNum);
    refreshEliminatedCount(matchIndex, teamNum);
}

/* SUBSTITUTION PANEL (ON-COURT 7 VS BENCH) */

function substitutionPanelHTML(matchIndex, teamNum, teamObj) {

    let onCourtOptions = teamObj.players
        .map((p, i) => ({ p, i }))
        .filter(o => o.p.onCourt && !o.p.out)
        .map(o => `<option value="${o.i}">#${o.p.jnum} ${o.p.name}</option>`)
        .join("");

    let benchOptions = teamObj.players
        .map((p, i) => ({ p, i }))
        .filter(o => !o.p.onCourt && !o.p.out)
        .map(o => `<option value="${o.i}">#${o.p.jnum} ${o.p.name}</option>`)
        .join("");

    return `
        <label>Sub Out (On Court) :</label>
        <select id="subOut${teamNum}_${matchIndex}">${onCourtOptions || `<option value="">No players on court</option>`}</select>

        <label>Sub In (Bench) :</label>
        <select id="subIn${teamNum}_${matchIndex}">${benchOptions || `<option value="">No bench players</option>`}</select>

        <button onclick="doSubstitution(${matchIndex},${teamNum})" class="tournadmin">🔄 Swap</button>
    `;
}

function refreshSubstitutionPanel(matchIndex, teamNum) {
    let teamName = teamNum === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let teamObj = teams.find(t => t.name === teamName);
    if (!teamObj) return;

    let el = document.getElementById(`subPanelBody${teamNum}_${matchIndex}`);
    if (el) el.innerHTML = substitutionPanelHTML(matchIndex, teamNum, teamObj);
}

function toggleSubPanel(matchIndex, teamNum) {
    let panel = document.getElementById(`subPanel${teamNum}_${matchIndex}`);
    if (!panel) return;
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function doSubstitution(matchIndex, teamNum) {
    let teamName = teamNum === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;

    let outSel = document.getElementById(`subOut${teamNum}_${matchIndex}`);
    let inSel = document.getElementById(`subIn${teamNum}_${matchIndex}`);

    if (!outSel.value || !inSel.value) {
        alert("⚠️ Select both a Sub Out and Sub In player");
        return;
    }

    substitutePlayer(teamName, Number(outSel.value), Number(inSel.value));
    refreshPlayerLists(matchIndex, teamNum);
}

/* ELIMINATED / OUT-QUEUE COUNTER */

function refreshEliminatedCount(matchIndex, teamNum) {
    let match = fixtures[matchIndex];
    let queue = teamNum === 1 ? match.team1OutQueue : match.team2OutQueue;

    let el = document.getElementById(`eliminated${teamNum}_${matchIndex}`);
    if (el) el.innerText = `🚫 Eliminated: ${(queue || []).length}`;
}

/* INIT ON-COURT (7 ACTIVE, REST ON BENCH) */

function initOnCourt(teamObj) {
    if (!teamObj) return;

    let alreadySet = teamObj.players.some(p => p.onCourt === true);

    teamObj.players.forEach((p, i) => {
        if (p.out === undefined) p.out = false;
        if (!p.cards) p.cards = { green: 0, yellow: 0, red: 0 };

        p.out = false;

        if (!alreadySet) {
            p.onCourt = i < 7;
        }
    });

    saveTeams();
}

/* START MATCH */

function startMatch(index) {

    saveFixtures();

    loadMatchStatus();


    let team1Obj = teams.find(t => t.name === fixtures[index].team1);
    let team2Obj = teams.find(t => t.name === fixtures[index].team2);

    if (fixtures[index].status === "Completed") {
        alert("Match already finished!");
        return;
    }

    fixtures[index].status = "Live";

    fixtures[index].team1OutQueue = fixtures[index].team1OutQueue || [];
    fixtures[index].team2OutQueue = fixtures[index].team2OutQueue || [];
    fixtures[index].team1EmptyRaids = fixtures[index].team1EmptyRaids || 0;
    fixtures[index].team2EmptyRaids = fixtures[index].team2EmptyRaids || 0;
    fixtures[index].team1DoOrDie = fixtures[index].team1DoOrDie || false;
    fixtures[index].team2DoOrDie = fixtures[index].team2DoOrDie || false;

    // Official Timeouts: unlimited, just counts up from 0 — no maximum.
    fixtures[index].officialTimeouts = fixtures[index].officialTimeouts || 0;

    // Raid & Do-or-Die stats kept for the match summary (PDF/JSON):
    // - RaidAttempts: every successful raid touch (+1 click), per team.
    // - EmptyRaidsTotal: EVERY empty raid all match long (never resets,
    //   unlike team1EmptyRaids/team2EmptyRaids which reset to 0 after a
    //   successful raid since those only track the *current* do-or-die streak).
    // - DoOrDieTriggerCount: how many separate times a team was forced into
    //   a do-or-die raid (i.e. hit 2 empty raids in a row) during the match.
    // - DoOrDieFailures: players declared OUT for failing a do-or-die raid.
    fixtures[index].team1RaidAttempts = fixtures[index].team1RaidAttempts || 0;
    fixtures[index].team2RaidAttempts = fixtures[index].team2RaidAttempts || 0;
    fixtures[index].team1EmptyRaidsTotal = fixtures[index].team1EmptyRaidsTotal || 0;
    fixtures[index].team2EmptyRaidsTotal = fixtures[index].team2EmptyRaidsTotal || 0;
    fixtures[index].team1DoOrDieTriggerCount = fixtures[index].team1DoOrDieTriggerCount || 0;
    fixtures[index].team2DoOrDieTriggerCount = fixtures[index].team2DoOrDieTriggerCount || 0;
    fixtures[index].team1DoOrDieFailures = fixtures[index].team1DoOrDieFailures || [];
    fixtures[index].team2DoOrDieFailures = fixtures[index].team2DoOrDieFailures || [];

    // Live scoreboard (raid/defence/allout/extra per team) — persisted so a
    // page refresh during a live match doesn't wipe the on-screen score back
    // to 0 while player raid/defence totals keep their real values.
    fixtures[index].liveScore = fixtures[index].liveScore || {
        r1: 0, d1: 0, a1: 0, e1: 0,
        r2: 0, d2: 0, a2: 0, e2: 0
    };

    initOnCourt(team1Obj);
    initOnCourt(team2Obj);

    let panel = document.getElementById(`matchPanel${index}`);
    panel.innerHTML = `

    <hr>

    <div style="text-align:right; margin-bottom:10px;">
    <button
        style="background:pink;color:red; font-size:15px;width:50px;"
        onclick="closeMatchPanel(${index})">
        ❌
    </button>
</div>

<div class="match-control-panel">

<div class="timer-setup" id="timerSetup${index}" style="${fixtures[index].halfDuration ? 'display:none;' : 'display:flex;'}">

    <h3 style="width:100%;">⏱️ Set Match Duration</h3>

    <input type="number" id="halfDurationInput${index}" placeholder="Match Duration (min)" min="1" class="timer-input">

    <input type="number" id="breakDurationInput${index}" placeholder="Break Duration (min)" min="1" class="timer-input">

    <button onclick="setMatchDuration(${index})" class="tournadmin" style="
    position: absolute;
    top:283px;
    left: 480px;">
    ✅ Set Duration
    </button>

</div>

<div class="timer-display" id="timerMain${index}" style="${fixtures[index].halfDuration ? 'display:flex;' : 'display:none;'}">

<h2 id="timer${index}">00:00</h2>

<h3>Half : <span id="half${index}">${fixtures[index].half || 1}</span></h3>

<button onclick="startTimer(${index})" class="tournadmin">
▶ Start Timer
</button>

<button onclick="pauseTimer(${index})" class="tournadmin">
⏸ Pause
</button>

<button onclick="resumeTimer(${index})" class="tournadmin">
▶ Resume
</button>

<button onclick="officialTimeout(${index})" class="tournadmin">
🚨 Official Timeout
</button>
<span id="officialTimeoutCount${index}" class="timeout-counter">Used: ${fixtures[index].officialTimeouts || 0}</span>

<button onclick="addExtraTime(${index})" class="tournadmin">
➕ Add Time
</button>

<button onclick="editMatchDuration(${index})" class="tournadmin">
✏️ Edit Duration
</button>

</div>

<div class="break-panel" id="breakPanel${index}" style="display:none;">

    <h3 id="breakLabel${index}">Break</h3>

    <h2 id="breakTimer${index}">00:00</h2>

    <button onclick="stopBreakManually(${index})" class="tournadmin breakstop">
    ⏭ Skip / Stop Break
    </button>

</div>

<div class="raid-timer-box">

    <h2 id="raidTimer${index}">00:30</h2>

    <button onclick="startRaidTimer(${index})" class="tournadmin">
    ▶ Start Raid
    </button>   

    <button id="ret" onclick="resetRaidTimer(${index})" class="tournadmin">
    🔁 Reset
    </button>

</div>

</div>  

    <h3>${fixtures[index].team1}
<button style="margin-right:20px; background:red;"
onclick="clearinsideform1(${index})">
clear
</button>
</h3>

<button onclick="superTackle(${index},1)" class="tournadmin">
🛡️ Super Tackle
</button>


<button onclick="teamTimeout(${index},1)" class="tournadmin">
Timeout
</button>

<button onclick="toggleSubPanel(${index},1)" class="tournadmin">
🔁 Substitution
</button>

<span id="eliminated1_${index}" class="eliminated-counter">🚫 Eliminated: ${(fixtures[index].team1OutQueue || []).length}</span>

<div id="subPanel1_${index}" class="sub-panel" style="display:none;">
    <h4>🔁 Substitution — ${fixtures[index].team1}</h4>
    <div id="subPanelBody1_${index}">
        ${substitutionPanelHTML(index, 1, team1Obj)}
    </div>
</div>

<div id="dodBanner1_${index}" class="dod-banner">${fixtures[index].team1DoOrDie ? "🚨 DO-OR-DIE RAID!" : ""}</div>
<div id="emptyRaidCount1_${index}" class="empty-raid-counter">🕳️ Empty Raids: ${fixtures[index].team1EmptyRaids || 0}/2</div>

    <div style="position:relative;">
        <div class="scorebox">
            <div class="scoretitle"> 
               <p>Raid:</p>
               <button onclick="changeScore(${index}, 'r1', -1)">-</button>
               <p id="r1${index}" style="margin-left:0px;">${fixtures[index].liveScore.r1}</p>
               <button onclick="changeScore(${index}, 'r1', 1)">+</button>
            </div>
            <div class="dod-controls">
                <button onclick="emptyRaid(${index},1)" class="tournadmin emptyraidbtn">🕳️ Empty Raid</button>
                <button onclick="raidFailed(${index},1)" class="tournadmin raidoutbtn">❌ Raid Out</button>
            </div>
         <br><br>
            <div class="scoretitle"> 
            <p>Defence:</p>
            <button onclick="changeScore(${index}, 'd1', -1)">-</button>
            <p id="d1${index}" style="margin-left:0px;">${fixtures[index].liveScore.d1}</p>
            <button onclick="changeScore(${index}, 'd1', 1)">+</button>
            </div>
         <br><br>
            <div class="scoretitle"> 
            <p>Allout(+2):</p>
            <button onclick="changeBonus(${index}, 'a1', -1)">-</button>
            <p id="a1${index}" style="margin-left:0px;">${fixtures[index].liveScore.a1}</p>
            <button onclick="changeBonus(${index}, 'a1', 1)">+</button>
            </div>
         <br><br>
            <div class="scoretitle"> 
            <p>Extra:</p>
            <button onclick="changeScore(${index}, 'e1', -1)">-</button>
            <p id="e1${index}" style="margin-left:0px;">${fixtures[index].liveScore.e1}</p>
            <button onclick="changeScore(${index}, 'e1', 1)">+</button>
            </div>
        </div>
        
        
        <div class="player-list1">
            <h4>Raiders</h4>
            <div id="raidersList1_${index}">${playerListsHTML(index, 1, team1Obj).raiders}</div>
        </div>
            
        <div class="player-list1" style="left:800px;">
            <h4>Defenders</h4>
            <div id="defendersList1_${index}">${playerListsHTML(index, 1, team1Obj).defenders}</div>
        </div>
                
        <div class="player-list1" style="left:1200px;">
            <h4>All Rounders</h4>
            <div id="allroundersList1_${index}">${playerListsHTML(index, 1, team1Obj).allrounders}</div>
        </div>              
            
    
    </div>
                          
    <hr>
    <h3>${fixtures[index].team2}<button style="margin-left:20px; background: red;" onclick="clearinsideform2(${index})">clear</button></h3>
    
    <button onclick="superTackle(${index},2)" class="tournadmin">
🛡️ Super Tackle
</button>

<button onclick="teamTimeout(${index},2)" class="tournadmin">
Timeout
</button>

<button onclick="toggleSubPanel(${index},2)" class="tournadmin">
🔁 Substitution
</button>

<span id="eliminated2_${index}" class="eliminated-counter">🚫 Eliminated: ${(fixtures[index].team2OutQueue || []).length}</span>

<div id="subPanel2_${index}" class="sub-panel" style="display:none;">
    <h4>🔁 Substitution — ${fixtures[index].team2}</h4>
    <div id="subPanelBody2_${index}">
        ${substitutionPanelHTML(index, 2, team2Obj)}
    </div>
</div>

<div id="dodBanner2_${index}" class="dod-banner">${fixtures[index].team2DoOrDie ? "🚨 DO-OR-DIE RAID!" : ""}</div>
<div id="emptyRaidCount2_${index}" class="empty-raid-counter">🕳️ Empty Raids: ${fixtures[index].team2EmptyRaids || 0}/2</div>

    <div style="position: relative;"> 
        <div class="scorebox">
            <div class="scoretitle"> 
               <p>Raid:</p>
               <button onclick="changeScore(${index}, 'r2', -1)">-</button>
               <p id="r2${index}" style="margin-left:0px;">${fixtures[index].liveScore.r2}</p>
               <button onclick="changeScore(${index}, 'r2', 1)">+</button>
            </div>
            <div class="dod-controls">
                <button onclick="emptyRaid(${index},2)" class="tournadmin emptyraidbtn">🕳️ Empty Raid</button>
                <button onclick="raidFailed(${index},2)" class="tournadmin raidoutbtn">❌ Raid Out</button>
            </div>
         <br><br>
            <div class="scoretitle"> 
            <p>Defence:</p>
            <button onclick="changeScore(${index}, 'd2', -1)">-</button>
            <p id="d2${index}" style="margin-left:0px;">${fixtures[index].liveScore.d2}</p>
            <button onclick="changeScore(${index}, 'd2', 1)">+</button>
            </div>
         <br><br>
            <div class="scoretitle"> 
            <p>Allout(+2):</p>
            <button onclick="changeBonus(${index}, 'a2', -1)">-</button>
            <p id="a2${index}" style="margin-left:0px;">${fixtures[index].liveScore.a2}</p>
            <button onclick="changeBonus(${index}, 'a2', 1)">+</button>
            </div>
         <br><br>
            <div class="scoretitle"> 
            <p>Extra:</p>
            <button onclick="changeScore(${index}, 'e2', -1)">-</button>
            <p id="e2${index}" style="margin-left:0px;">${fixtures[index].liveScore.e2}</p>
            <button onclick="changeScore(${index}, 'e2', 1)">+</button>
            </div>
        </div>   
        
        <div class="player-list2">
            <h4>Raiders</h4>
            <div id="raidersList2_${index}">${playerListsHTML(index, 2, team2Obj).raiders}</div>
        </div>
                        
        <div class="player-list2" style="left:800px;">
            <h4>Defenders</h4>
            <div id="defendersList2_${index}">${playerListsHTML(index, 2, team2Obj).defenders}</div>
        </div>
                            
        <div class="player-list2" style="left:1200px;">
            <h4>All Rounders</h4>
            <div id="allroundersList2_${index}">${playerListsHTML(index, 2, team2Obj).allrounders}</div>
        </div>  

    </div>  
    <br><br>
    <button style="background:green" onclick="finishMatch(${index})">Finish Match</button>

    <button style="background:#444;color:white;" onclick="downloadMatchPDF(${index})">
        📄 Download Match PDF
    </button>`;

    restoreTimerPanelState(index);
}

/* RESTORE TIMER / BREAK / RAID DISPLAY AFTER PANEL RE-RENDER */

function restoreTimerPanelState(index) {

    let match = fixtures[index];

    if (typeof match.raidTimer !== "number") {
        match.raidTimer = 30;
    }

    updateRaidTimerDisplay(index);

    if (match.halfDuration) {
        updateTimer(index);
    }

    if (match.breakActive) {

        let panelEl = document.getElementById(`breakPanel${index}`);
        let labelEl = document.getElementById(`breakLabel${index}`);

        if (panelEl) panelEl.style.display = "block";
        if (labelEl) labelEl.innerText = match.breakLabel || "Break";

        updateBreakTimerDisplay(index);
    }
}

/* CLOSE MATCH */

function closeMatchPanel(index) {
    document.getElementById(`matchPanel${index}`).innerHTML = "";
}

/* CLEAR INSIDE FORM 1 */

function clearinsideform1(index) {
    if (!confirm("Clear Team 1 Match Data?")) return;

    document.getElementById(`r1${index}`).innerText = "0";
    document.getElementById(`d1${index}`).innerText = "0";
    document.getElementById(`a1${index}`).innerText = "0";
    document.getElementById(`e1${index}`).innerText = "0";

    let team = teams.find(t => t.name === fixtures[index].team1);
    team.players.forEach(player => {
        player.raidPoints = 0;
        player.defencePoints = 0;
        player.totalPoints = 0;
    });

    let match = fixtures[index];
    if (match.liveScore) {
        match.liveScore.r1 = 0;
        match.liveScore.d1 = 0;
        match.liveScore.a1 = 0;
        match.liveScore.e1 = 0;
    }
    match.team1EmptyRaids = 0;
    match.team1DoOrDie = false;

    saveTeams();
    saveFixtures();
    startMatch(index);
}

/* CLEAR INSIDE FORM 2 */

function clearinsideform2(index) {
    if (!confirm("Clear Team 2 Match Data?")) return;

    document.getElementById(`r2${index}`).innerText = "0";
    document.getElementById(`d2${index}`).innerText = "0";
    document.getElementById(`a2${index}`).innerText = "0";
    document.getElementById(`e2${index}`).innerText = "0";

    let team = teams.find(t => t.name === fixtures[index].team2);
    team.players.forEach(player => {
        player.raidPoints = 0;
        player.defencePoints = 0;
        player.totalPoints = 0;
    });

    let match = fixtures[index];
    if (match.liveScore) {
        match.liveScore.r2 = 0;
        match.liveScore.d2 = 0;
        match.liveScore.a2 = 0;
        match.liveScore.e2 = 0;
    }
    match.team2EmptyRaids = 0;
    match.team2DoOrDie = false;

    saveTeams();
    saveFixtures();
    startMatch(index);
}

/* CHANGE SCORE */

function changeScore(index, type, value) {
    let el = document.getElementById(`${type}${index}`);
    let current = Number(el.innerText) || 0;
    current += value;

    if (current < 0) current = 0;
    el.innerText = current;

    // Persist so the scoreboard survives a page refresh mid-match.
    let match = fixtures[index];
    if (match) {
        match.liveScore = match.liveScore || {};
        match.liveScore[type] = current;
        saveFixtures();
        loadMatchStatus();
    }
}

/* CHANGE ALLOUT POINT */

function changeBonus(index, type, value) {
    let el = document.getElementById(`${type}${index}`);
    let current = Number(el.innerText) || 0;

    // bonus = +2 per click
    current += (value * 2);

    if (current < 0) current = 0;
    el.innerText = current;

    // Persist so the scoreboard survives a page refresh mid-match.
    let match = fixtures[index];
    if (match) {
        match.liveScore = match.liveScore || {};
        match.liveScore[type] = current;
        saveFixtures();
        loadMatchStatus();
    }

    alert("Allout point +2");
}

/* FINISH MATCH */

function finishMatch(index) {
    let r1 = Number(document.getElementById(`r1${index}`).innerText) || 0;
    let d1 = Number(document.getElementById(`d1${index}`).innerText) || 0;
    let a1 = Number(document.getElementById(`a1${index}`).innerText) || 0;
    let e1 = Number(document.getElementById(`e1${index}`).innerText) || 0;

    let r2 = Number(document.getElementById(`r2${index}`).innerText) || 0;
    let d2 = Number(document.getElementById(`d2${index}`).innerText) || 0;
    let a2 = Number(document.getElementById(`a2${index}`).innerText) || 0;
    let e2 = Number(document.getElementById(`e2${index}`).innerText) || 0;

    let team1Score = r1 + d1 + a1 + e1;
    let team2Score = r2 + d2 + a2 + e2;

    let breakdown = {
        team1: { raid: r1, defence: d1, allout: a1, extra: e1 },
        team2: { raid: r2, defence: d2, allout: a2, extra: e2 }
    };

    let team1Obj = teams.find(t => t.name === fixtures[index].team1);
    let team2Obj = teams.find(t => t.name === fixtures[index].team2);

    let winnerTeam = "";

    if (team1Score > team2Score) {
        winnerTeam = fixtures[index].team1;
    } else if (team2Score > team1Score) {
        winnerTeam = fixtures[index].team2;
    } else {
        fixtures[index].score1 = team1Score;
        fixtures[index].score2 = team2Score;
        fixtures[index].breakdown = breakdown;
        fixtures[index].team1Players = JSON.parse(JSON.stringify(team1Obj.players));
        fixtures[index].team2Players = JSON.parse(JSON.stringify(team2Obj.players));
        fixtures[index].status = "Completed";

        saveFixtures();
        loadFixtures();
        loadPointsTable();
        loadMatchStatus();

        alert("Draw Match");
        return;
    }

    let winnerObj = teams.find(t => t.name === winnerTeam);
    let captain = winnerObj.players.find(p => p.captain);

    let password = prompt(`Winner Captain (${captain ? captain.name : "No Captain"}) Password Set Pannunga`);

    if (!password) {
        alert("Password Required");
        return;
    }

    if (password.length < 4) {
        alert("Minimum 4 characters");
        return;
    }

    fixtures[index].score1 = team1Score;
    fixtures[index].score2 = team2Score;
    fixtures[index].breakdown = breakdown;
    fixtures[index].team1Players = JSON.parse(JSON.stringify(team1Obj.players));
    fixtures[index].team2Players = JSON.parse(JSON.stringify(team2Obj.players));
    fixtures[index].secretPassword = password;
    fixtures[index].status = "Completed";

    saveFixtures();
    loadFixtures();
    loadPointsTable();
    loadTopPlayers();
    loadTop4Teams();
    loadTournamentInfo();
    loadTournamentRecords();
    loadMatchStatus();

    alert("Match Finished Successfully ✅");
}

/* DOWNLOAD MATCH SUMMARY PDF */

function downloadMatchPDF(index) {
    let match = fixtures[index];

    if (!match || match.status !== "Completed") {
        alert("⚠️ Finish the match first to generate its PDF report");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let tournamentName = localStorage.getItem("tournamentName") || "Kabaddi Tournament";

    let y = 20;

    doc.setFontSize(18);
    doc.text(tournamentName, 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(14);
    doc.text("Match Report", 105, y, { align: "center" });
    y += 12;

    doc.setFontSize(12);
    doc.text(`${match.team1}  vs  ${match.team2}`, 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(16);
    doc.text(`${match.score1}  -  ${match.score2}`, 105, y, { align: "center" });
    y += 14;

    let winner =
        match.score1 > match.score2 ? match.team1 :
            match.score2 > match.score1 ? match.team2 :
                "Match Drawn";

    doc.setFontSize(12);
    doc.text(`Result: ${winner === "Match Drawn" ? winner : winner + " Won"}`, 14, y);
    y += 12;

    doc.setFontSize(13);
    doc.text("Point Breakdown", 14, y);
    y += 8;

    let bd = match.breakdown || {
        team1: { raid: 0, defence: 0, allout: 0, extra: 0 },
        team2: { raid: 0, defence: 0, allout: 0, extra: 0 }
    };

    doc.setFontSize(11);
    doc.text("Category", 14, y);
    doc.text(match.team1, 90, y);
    doc.text(match.team2, 150, y);
    y += 6;

    [
        ["Raid Points", "raid"],
        ["Defence Points", "defence"],
        ["All Out (+2)", "allout"],
        ["Extra Points", "extra"]
    ].forEach(([label, key]) => {
        doc.text(label, 14, y);
        doc.text(String(bd.team1[key] || 0), 90, y);
        doc.text(String(bd.team2[key] || 0), 150, y);
        y += 6;
    });

    y += 8;

    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.text("Raid & Do-or-Die Details", 14, y);
    y += 8;

    let totalRaids1 = (match.team1RaidAttempts || 0) + (match.team1EmptyRaidsTotal || 0);
    let totalRaids2 = (match.team2RaidAttempts || 0) + (match.team2EmptyRaidsTotal || 0);

    let failures1 = match.team1DoOrDieFailures || [];
    let failures2 = match.team2DoOrDieFailures || [];

    doc.setFontSize(11);
    doc.text("Stat", 14, y);
    doc.text(match.team1, 90, y);
    doc.text(match.team2, 150, y);
    y += 6;

    [
        ["Total Raids Taken", String(totalRaids1), String(totalRaids2)],
        ["Successful Raids", String(match.team1RaidAttempts || 0), String(match.team2RaidAttempts || 0)],
        ["Empty Raids", String(match.team1EmptyRaidsTotal || 0), String(match.team2EmptyRaidsTotal || 0)],
        ["Do-or-Die Triggered", String(match.team1DoOrDieTriggerCount || 0), String(match.team2DoOrDieTriggerCount || 0)],
        ["Do-or-Die Failures", String(failures1.length), String(failures2.length)]
    ].forEach(([label, v1, v2]) => {
        doc.text(label, 14, y);
        doc.text(v1, 90, y);
        doc.text(v2, 150, y);
        y += 6;
    });

    y += 4;

    if (failures1.length || failures2.length) {

        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(10);

        if (failures1.length) {
            let line = `${match.team1} Do-or-Die Outs: ` +
                failures1.map(p => `#${p.jnum} ${p.name}`).join(", ");
            doc.splitTextToSize(line, 180).forEach(l => {
                doc.text(l, 14, y);
                y += 5;
            });
        }

        if (failures2.length) {
            let line = `${match.team2} Do-or-Die Outs: ` +
                failures2.map(p => `#${p.jnum} ${p.name}`).join(", ");
            doc.splitTextToSize(line, 180).forEach(l => {
                doc.text(l, 14, y);
                y += 5;
            });
        }

        y += 4;
    }

    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.text("Match MVP", 14, y);
    y += 8;

    let allPlayers = [
        ...(match.team1Players || []),
        ...(match.team2Players || [])
    ];

    if (allPlayers.length) {
        let mvp = allPlayers.reduce((best, p) =>
            (p.totalPoints || 0) > (best.totalPoints || 0) ? p : best,
            allPlayers[0]
        );

        doc.setFontSize(11);
        doc.text(
            `#${mvp.jnum}  ${mvp.name}   —   ${mvp.totalPoints || 0} Total Points`,
            14, y
        );
        y += 6;
        doc.text(
            `Raid Points: ${mvp.raidPoints || 0}   |   Defence Points: ${mvp.defencePoints || 0}`,
            14, y
        );
        y += 10;
    } else {
        doc.setFontSize(11);
        doc.text("No player data available", 14, y);
        y += 10;
    }

    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 285);

    doc.save(`${match.team1}_vs_${match.team2}_MatchReport.pdf`);
}

/* DOWNLOAD MATCH SUMMARY AS JSON (full detail — every stat, raid count,
   and do-or-die history for this single match) */

function downloadMatchJSON(index) {

    let match = fixtures[index];

    if (!match || match.status !== "Completed") {
        alert("⚠️ Finish the match first to generate its JSON summary");
        return;
    }

    let bd = match.breakdown || {
        team1: { raid: 0, defence: 0, allout: 0, extra: 0 },
        team2: { raid: 0, defence: 0, allout: 0, extra: 0 }
    };

    let winner =
        match.score1 > match.score2 ? match.team1 :
            match.score2 > match.score1 ? match.team2 :
                "Draw";

    let allPlayers = [
        ...(match.team1Players || []),
        ...(match.team2Players || [])
    ];

    let mvp = allPlayers.length
        ? allPlayers.reduce((best, p) =>
            (p.totalPoints || 0) > (best.totalPoints || 0) ? p : best,
            allPlayers[0])
        : null;

    let summary = {
        app: "Kabaddi Pro",
        type: "Match Summary",
        exportedAt: new Date().toISOString(),

        tournamentName: localStorage.getItem("tournamentName") || "Kabaddi Tournament",

        team1: match.team1,
        team2: match.team2,
        score1: match.score1,
        score2: match.score2,
        winner: winner,

        pointBreakdown: bd,

        raidDetails: {
            team1: {
                successfulRaids: match.team1RaidAttempts || 0,
                emptyRaids: match.team1EmptyRaidsTotal || 0,
                totalRaidsTaken: (match.team1RaidAttempts || 0) + (match.team1EmptyRaidsTotal || 0)
            },
            team2: {
                successfulRaids: match.team2RaidAttempts || 0,
                emptyRaids: match.team2EmptyRaidsTotal || 0,
                totalRaidsTaken: (match.team2RaidAttempts || 0) + (match.team2EmptyRaidsTotal || 0)
            }
        },

        doOrDieDetails: {
            team1: {
                timesTriggered: match.team1DoOrDieTriggerCount || 0,
                failures: match.team1DoOrDieFailures || []
            },
            team2: {
                timesTriggered: match.team2DoOrDieTriggerCount || 0,
                failures: match.team2DoOrDieFailures || []
            }
        },

        officialTimeoutsUsed: match.officialTimeouts || 0,
        superTackles: {
            team1: match.super1 || 0,
            team2: match.super2 || 0
        },
        eliminatedPlayers: {
            team1: (match.team1OutQueue || []).map(p => ({ jnum: p.jnum, name: p.name })),
            team2: (match.team2OutQueue || []).map(p => ({ jnum: p.jnum, name: p.name }))
        },

        mvp: mvp ? {
            jnum: mvp.jnum,
            name: mvp.name,
            raidPoints: mvp.raidPoints || 0,
            defencePoints: mvp.defencePoints || 0,
            totalPoints: mvp.totalPoints || 0
        } : null,

        team1Players: match.team1Players || [],
        team2Players: match.team2Players || []
    };

    let blob;

    try {
        blob = new Blob(
            [JSON.stringify(summary, null, 2)],
            { type: "application/json" }
        );
    } catch (err) {
        console.error(err);
        alert("❌ Could not build the JSON match summary.");
        return;
    }

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${match.team1}_vs_${match.team2}_MatchSummary.json`.replace(/\s+/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    alert("📄 Match summary exported as JSON ✅");
}

/* SAVE MATCH RESULT */

function saveMatchResult(index) {
    let score1 = document.getElementById(`s1${index}`).value;
    let score2 = document.getElementById(`s2${index}`).value;

    if (score1 === "" || score2 === "") {
        alert("Enter both scores");
        return;
    }

    fixtures[index].score1 = Number(score1);
    fixtures[index].score2 = Number(score2);
    fixtures[index].status = "Completed";

    saveFixtures();
    loadFixtures();
    loadPointsTable();
}

/* LOAD POINT TABLE */

function loadPointsTable() {
    let points = {};

    teams.forEach(team => {
        points[team.name] = {
            team: team.name,
            played: 0,
            won: 0,
            lost: 0,
            draw: 0,
            pts: 0
        };
    });

    fixtures.forEach(match => {
        if (match.status !== "Completed") return;

        let t1 = points[match.team1];
        let t2 = points[match.team2];

        t1.played++;
        t2.played++;

        if (match.score1 > match.score2) {
            t1.won++;
            t1.pts += 5;
            t2.lost++;
        } else if (match.score2 > match.score1) {
            t2.won++;
            t2.pts += 5;
            t1.lost++;
        } else {
            t1.draw++;
            t2.draw++;
            t1.pts += 3;
            t2.pts += 3;
        }
    });

    let standings = Object.values(points);
    standings.sort((a, b) => b.pts - a.pts);

    let tbody = document.getElementById("pointsBody");
    tbody.innerHTML = "";

    standings.forEach((team, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${team.team}</td>
                <td style="color:blue;">${team.played}</td>
                <td style="color:green;">${team.won}</td>
                <td style="color:red;">${team.lost}</td>
                <td style="color:rgb(66, 66, 66);">${team.draw}</td>
                <td style="color:black;">${team.pts}</td>
            </tr>`;
    });

    if (standings.length > 0) {
        document.querySelector(".winner").innerText = standings[0].team;
    }

    loadTop4Teams()
}

/* REOPEN MATCH */

function reopenMatch(index) {
    if (fixtures[index].status !== "Completed") {
        alert("Match not finished yet");
        return;
    }

    // Handle Draw match reopen logic
    if (!fixtures[index].secretPassword) {
        fixtures[index].status = "Upcoming";
        fixtures[index].score1 = "";
        fixtures[index].score2 = "";

        delete fixtures[index].secretPassword;

        saveFixtures();
        loadFixtures();
        loadPointsTable();

        alert("Draw Match Reopened ✅");
        return;
    }

    let enteredPassword = prompt("Enter Winner Captain Password");

    if (enteredPassword === fixtures[index].secretPassword) {
        fixtures[index].status = "Upcoming";

        loadMatchStatus();
        fixtures[index].score1 = "";
        fixtures[index].score2 = "";
        fixtures[index].team1Players = [];
        fixtures[index].team2Players = [];

        let team1 = teams.find(t => t.name === fixtures[index].team1);
        let team2 = teams.find(t => t.name === fixtures[index].team2);

        team1.players.forEach(player => {
            player.raidPoints = 0;
            player.defencePoints = 0;
            player.totalPoints = 0;
        });

        team2.players.forEach(player => {
            player.raidPoints = 0;
            player.defencePoints = 0;
            player.totalPoints = 0;
        });

        saveTeams();

        delete fixtures[index].secretPassword;

        saveFixtures();
        loadFixtures();
        loadPointsTable();
        loadAnalysis(); // Note: Ensure loadAnalysis() is defined elsewhere in your script      

        alert("Match Reopened ✅");
    } else {
        alert("Wrong Password ❌");
    }

    loadTopPlayers();
    loadTop4Teams();
    loadTournamentInfo();
    loadTournamentRecords();
}

/* SHOW ANALYSIS */

function showAnalysis(match) {
    let html = `<h2>${match.team1} vs ${match.team2}</h2>`;

    match.team1Players.forEach(player => {
        if (player.position === "raider") {
            html += `<div>#${player.jnum} ${player.name} Raid Points : ${player.raidPoints}</div>`;
        }
    });

    match.team1Players.forEach(player => {
        if (player.position === "defender") {
            html += `<div>#${player.jnum} ${player.name} Defence Points : ${player.defencePoints}</div>`;
        }
    });

    document.getElementById("analysisContainer").innerHTML = html;
}

/* PLAYER RAID */

function playerRaid(matchIndex, teamNum, playerIndex) {
    let teamName = teamNum === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let teamObj = teams.find(t => t.name === teamName);
    let player = teamObj.players[playerIndex];

    player.raidPoints = (player.raidPoints || 0) + 1;
    player.totalPoints = (player.totalPoints || 0) + 1;

    document.getElementById(`raid_${teamNum}_${matchIndex}_${playerIndex}`).innerText = player.raidPoints;
    changeScore(matchIndex, `r${teamNum}`, 1);
    saveTeams();

    let match = fixtures[matchIndex];

    if (teamNum === 1) {

        match.team1RaidAttempts = (match.team1RaidAttempts || 0) + 1;
        match.team1EmptyRaids = 0;
        match.team1DoOrDie = false;

    } else {

        match.team2RaidAttempts = (match.team2RaidAttempts || 0) + 1;
        match.team2EmptyRaids = 0;
        match.team2DoOrDie = false;
    }

    updateDoOrDie(matchIndex);
    saveFixtures();
}

function updateDoOrDie(matchIndex) {

    let match = fixtures[matchIndex];

    let b1 = document.getElementById(`dodBanner1_${matchIndex}`);
    let b2 = document.getElementById(`dodBanner2_${matchIndex}`);

    if (b1) {
        b1.innerHTML = match.team1DoOrDie
            ? `🚨 DO-OR-DIE RAID!`
            : "";
    }

    if (b2) {
        b2.innerHTML = match.team2DoOrDie
            ? `🚨 DO-OR-DIE RAID!`
            : "";
    }

    // Do-or-Die also tracks/shows the empty raid count (0/2, 1/2, 2/2...)
    // so the team/officials can see how close a side is to a do-or-die raid.
    let e1 = document.getElementById(`emptyRaidCount1_${matchIndex}`);
    let e2 = document.getElementById(`emptyRaidCount2_${matchIndex}`);

    if (e1) e1.innerText = `🕳️ Empty Raids: ${match.team1EmptyRaids || 0}/2`;
    if (e2) e2.innerText = `🕳️ Empty Raids: ${match.team2EmptyRaids || 0}/2`;
}

function playerRaidMinus(matchIndex, teamNum, playerIndex) {
    let teamName = teamNum === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let teamObj = teams.find(t => t.name === teamName);
    let player = teamObj.players[playerIndex];

    if ((player.raidPoints || 0) > 0) {
        player.raidPoints--;
        player.totalPoints--;
        document.getElementById(`raid_${teamNum}_${matchIndex}_${playerIndex}`).innerText = player.raidPoints;
        changeScore(matchIndex, `r${teamNum}`, -1);
        saveTeams();

        let match = fixtures[matchIndex];
        if (teamNum === 1 && match.team1RaidAttempts > 0) {
            match.team1RaidAttempts--;
        } else if (teamNum === 2 && match.team2RaidAttempts > 0) {
            match.team2RaidAttempts--;
        }
        saveFixtures();
    }
}

function playerDefence(matchIndex, teamNum, playerIndex) {
    let teamName = teamNum === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let teamObj = teams.find(t => t.name === teamName);
    let player = teamObj.players[playerIndex];

    player.defencePoints = (player.defencePoints || 0) + 1;
    player.totalPoints = (player.totalPoints || 0) + 1;

    document.getElementById(`def_${teamNum}_${matchIndex}_${playerIndex}`).innerText = player.defencePoints;
    changeScore(matchIndex, `d${teamNum}`, 1);
    saveTeams();

    let queue =
        teamNum === 1
            ? fixtures[matchIndex].team1OutQueue
            : fixtures[matchIndex].team2OutQueue;

    if (queue && queue.length) {

        let revived = queue.shift();
        revived.out = false;
        revived.onCourt = true;

        alert(`🔄 ${revived.name} Revived`);

        saveTeams();
        saveFixtures();

        refreshPlayerLists(matchIndex, teamNum);
    }
}

function playerDefenceMinus(matchIndex, teamNum, playerIndex) {
    let teamName = teamNum === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let teamObj = teams.find(t => t.name === teamName);
    let player = teamObj.players[playerIndex];

    if ((player.defencePoints || 0) > 0) {
        player.defencePoints--;
        player.totalPoints--;
        document.getElementById(`def_${teamNum}_${matchIndex}_${playerIndex}`).innerText = player.defencePoints;
        changeScore(matchIndex, `d${teamNum}`, -1);
        saveTeams();
    }
}

/* LOADANALYSIS */

function loadAnalysis() {
    let analysis = document.getElementById("analysisContainer");
    analysis.innerHTML = "";

    /* ===== OVERALL PLAYER CATEGORY BREAKDOWN (WHOLE TOURNAMENT) =====
       Always shown (even before any match is completed) — built straight
       from the live teams data, grouped by each player's actual position
       (Raider / Defender / All Rounder) and ranked by their relevant stat. */

    let allPlayersOverall = teams.flatMap(team =>
        (team.players || []).map(p => ({ ...p, teamName: team.name }))
    );

    let raidersOverall = allPlayersOverall
        .filter(p => p.position === "raider")
        .sort((a, b) => (b.raidPoints || 0) - (a.raidPoints || 0));

    let defendersOverall = allPlayersOverall
        .filter(p => p.position === "defender")
        .sort((a, b) => (b.defencePoints || 0) - (a.defencePoints || 0));

    let allroundersOverall = allPlayersOverall
        .filter(p => p.position === "allrounder")
        .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    analysis.innerHTML += `
        <div class="analysistitlecard" style="display:block;">
            <h2 style="margin:0;">📊 Player Category Overview — Whole Tournament</h2>
        </div>
        <div class="analysisshow">
            <div>
                <h3>🔥 Raiders (${raidersOverall.length})</h3>
                ${raidersOverall.length
            ? raidersOverall.map(p =>
                `<p>#${p.jnum} --- ${p.name} (${p.teamName}) - Raid:${p.raidPoints || 0}</p>`
            ).join("")
            : `<p class="emptylist">No raiders added yet</p>`}
            </div>
            <div>
                <h3>🛡️ Defenders (${defendersOverall.length})</h3>
                ${defendersOverall.length
            ? defendersOverall.map(p =>
                `<p>#${p.jnum} --- ${p.name} (${p.teamName}) - Defence:${p.defencePoints || 0}</p>`
            ).join("")
            : `<p class="emptylist">No defenders added yet</p>`}
            </div>
            <div>
                <h3>⭐ All Rounders (${allroundersOverall.length})</h3>
                ${allroundersOverall.length
            ? allroundersOverall.map(p =>
                `<p>#${p.jnum} --- ${p.name} (${p.teamName}) - Raid:${p.raidPoints || 0} - Defence:${p.defencePoints || 0} - Total:${p.totalPoints || 0}</p>`
            ).join("")
            : `<p class="emptylist">No all rounders added yet</p>`}
            </div>
        </div>
    `;

    /* ===== PER-MATCH BREAKDOWN (COMPLETED MATCHES ONLY) ===== */

    fixtures.forEach(match => {
        if (match.status !== "Completed") return;

        let winner = "Draw";

        let allPlayers = [
            ...(match.team1Players || []),
            ...(match.team2Players || [])
        ];

        let topRaider = allPlayers.reduce((best, player) => {
            return (player.raidPoints || 0) > (best.raidPoints || 0)
                ? player
                : best;
        }, allPlayers[0]);

        let topDefender = allPlayers.reduce((best, player) => {
            return (player.defencePoints || 0) > (best.defencePoints || 0)
                ? player
                : best;
        }, allPlayers[0]);

        if (match.score1 > match.score2) {
            winner = match.team1;
        } else if (match.score2 > match.score1) {
            winner = match.team2;
        }

        analysis.innerHTML += `
            <div class="analysistitlecard">
                <div>
                    <h2>${match.team1} VS ${match.team2}</h2>
                    <p style="font-size:20px; font-weight:bold;">📊 ${match.score1} - ${match.score2}</p>
                    <p style="color:green; font-size:18px;">🏆 Winner : ${winner}</p>
                </div>
                <div class="topplayers">
                    <h3 class="topplayer1">
                        🔥 Top Raider : ${topRaider?.name || "-"} #${topRaider?.jnum || "-"} (${topRaider?.raidPoints || 0} Raid Points)
                    </h3>
                    <h3 class="topplayer2">
                        🛡️ Top Defender : ${topDefender?.name || "-"} #${topDefender?.jnum || "-"} (${topDefender?.defencePoints || 0} Defence Points)
                    </h3>
                </div>
            </div>
            <div class="analysisshow">
                <div>
                    <h3>Raiders</h3>
                    ${[...(match.team1Players || []), ...(match.team2Players || [])]
                .filter(p => p.position === "raider")
                .map(p => `<p>#${p.jnum} --- ${p.name} - Total:${p.totalPoints || 0}</p>`)
                .join("")}
                </div>
                <div>
                    <h3>Defenders</h3>
                    ${[...(match.team1Players || []), ...(match.team2Players || [])]
                .filter(p => p.position === "defender")
                .map(p => `<p>#${p.jnum} --- ${p.name} - Total:${p.totalPoints || 0}</p>`)
                .join("")}
                </div>
                <div>
                    <h3>All Rounders</h3>
                    ${[...(match.team1Players || []), ...(match.team2Players || [])]
                .filter(p => p.position === "allrounder")
                .map(p => `<p>#${p.jnum} --- ${p.name} - Raid:${p.raidPoints || 0} - Defence:${p.defencePoints || 0} - Total:${p.totalPoints || 0}</p>`)
                .join("")}
                </div>
            </div>`;
    });
}

/* LOAD PLAYERS */

function loadTopPlayers() {

    let allPlayers = [];

    teams.forEach(team => {
        allPlayers.push(...team.players);
    });

    if (allPlayers.length === 0) {
        document.getElementById("topRaiderName").innerText = "-";
        document.getElementById("topDefenderName").innerText = "-";
        document.getElementById("topAllRounderName").innerText = "-";
        return;
    }

    let topRaider = allPlayers.reduce((a, b) =>
        (a.raidPoints || 0) > (b.raidPoints || 0) ? a : b
    );

    let topDefender = allPlayers.reduce((a, b) =>
        (a.defencePoints || 0) > (b.defencePoints || 0) ? a : b
    );

    let topAllRounder = allPlayers.reduce((a, b) =>
        (a.totalPoints || 0) > (b.totalPoints || 0) ? a : b
    );

    document.getElementById("topRaiderName").innerHTML = `
    🥇 ${topRaider.name}<br>
    <span style="font-size:30px;margin-left:25%;">${topRaider.raidPoints || 0} Pts</span>
    `;

    document.getElementById("topDefenderName").innerHTML = `
    🥇 ${topDefender.name}<br>
    <span style="font-size:30px;margin-left:25%;">${topDefender.defencePoints || 0} Pts</span>
    `;

    document.getElementById("topAllRounderName").innerHTML = `
    🥇 ${topAllRounder.name}<br>
    <span style="font-size:30px;margin-left:25%;">${topAllRounder.totalPoints || 0} Pts</span>
    `;

    loadTournamentRecords();
}

/* LOAD MATCH STATUSE */

function loadMatchStatus() {

    let fixtureList = document.getElementById("allmatch");
    fixtureList.innerHTML = "";

    let counterEl = document.getElementById("matchCounter");
    if (counterEl) {
        counterEl.innerText = `${fixtures.length} Match${fixtures.length === 1 ? "" : "es"}`;
    }

    if (fixtures.length === 0) {
        fixtureList.innerHTML = `
            <p style="color:white; opacity:.7; padding:20px;">
                No fixtures yet — generate fixtures to see matches here.
            </p>`;
        return;
    }

    fixtures.forEach((match, index) => {

        let displayScore1 = match.score1;
        let displayScore2 = match.score2;

        if (match.status === "Live" && match.liveScore) {
            displayScore1 =
                (match.liveScore.r1 || 0) +
                (match.liveScore.d1 || 0) +
                (match.liveScore.a1 || 0) +
                (match.liveScore.e1 || 0);

            displayScore2 =
                (match.liveScore.r2 || 0) +
                (match.liveScore.d2 || 0) +
                (match.liveScore.a2 || 0) +
                (match.liveScore.e2 || 0);
        }

        fixtureList.innerHTML += `
            <div class="alllmatch ${match.status.toLowerCase()}">

    <div class="match-head">
    <h5>${match.team1}
    <span>VS</span>
    ${match.team2}</h5>
    </div>

    <div class="match-score">
    ${displayScore1 || 0}
    -
    ${displayScore2 || 0}
    </div>

    <div class="match-status">
    ${match.status}
    </div>

    </div>`;
    });
}

/* LOAD TOP 4 TEAM */

function loadTop4Teams() {

    let points = {};

    teams.forEach(team => {
        points[team.name] = {
            team: team.name,
            played: 0,
            won: 0,
            lost: 0,
            draw: 0,
            pts: 0
        };
    });

    fixtures.forEach(match => {

        if (match.status !== "Completed") return;

        let t1 = points[match.team1];
        let t2 = points[match.team2];

        t1.played++;
        t2.played++;

        if (match.score1 > match.score2) {

            t1.won++;
            t1.pts += 5;

            t2.lost++;

        }
        else if (match.score2 > match.score1) {

            t2.won++;
            t2.pts += 5;

            t1.lost++;

        }
        else {

            t1.draw++;
            t2.draw++;

            t1.pts += 3;
            t2.pts += 3;
        }
    });

    let standings = Object.values(points)
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 4);

    document.querySelector(".box1").innerHTML = `

            <h2 style="
                text-align:center;
                padding:10px;
                
            ">
                🏆 TOP 4 TEAMS
            </h2>

            <table style="
                width:100%;
                border-collapse:collapse;
                text-align:center;
            ">

                <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>L</th>
                    <th>D</th>
                    <th>Pts</th>
                </tr>

                ${standings.map((team, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${team.team}</td>
                        <td>${team.played}</td>
                        <td style="color:green;">${team.won}</td>
                        <td style="color:red;">${team.lost}</td>
                        <td>${team.draw}</td>
                        <td><b>${team.pts}</b></td>
                    </tr>
                `).join("")}

            </table>
        `;

    loadTournamentInfo();
}

/* LOAD TOURNAMENT INFO */

function loadTournamentInfo() {

    const box2 =
        document.querySelector(".box2");

    const data = safeGetJSON("tournamentDetails", null);

    // FIRST TIME FORM
    if (!data) {

        box2.innerHTML = `

    <h2 class="stats-title">
    🏆 Tournament Setup
    </h2>

    <div class="tour-form">

    <input id="tourName"
    placeholder="Tournament Name">

    <input id="organizer"
    placeholder="Organizer Name">

    <input id="venue"
    placeholder="Venue">

    <input id="tourDate"
    type="date">

    <h3>👥 Committee Members</h3>

    <div id="committeeContainer">
        <input class="committee-input"
        placeholder="Committee Member">
    </div>

    <button onclick="addCommitteeMember()">
    ➕ Add Member
    </button>

    <hr>

    <h3>👥 Match Umpires</h3>

    <div id="umpaiersContainer">
        <input class="umpaiers-input"
        placeholder="Umpire">
    </div>

    <button onclick="addumpaiers()">
    ➕ Add Member
    </button>

    <hr>

    <h3>🏆 Prize Amounts</h3>

    <div id="prizeContainer">

    <div class="prize-row">
        <input class="prize-name"
        placeholder="Prize Name">

        <input class="prize-amount"
        placeholder="Amount">
    </div>

    </div>

    <button onclick="addPrize()">
    ➕ Add Prize
    </button>

    <button
    onclick="saveTournamentDetails()">
    Save Tournament
    </button>

    </div>
    `;

        return;
    }

    // AFTER SAVE

    box2.innerHTML = `

    <h2 class="stats-title">
    🏆 ${data.tournamentName}
    </h2>

    <div class="stats-grid">

    <div class="stat-card">
    👤 Organizer
    <br><br>
    ${data.organizer}
    </div>

    <div class="stat-card">
    📍 Venue
    <br><br>
    ${data.venue}
    </div>

    <div class="stat-card">
    📅 Date
    <br><br>
    ${data.date}
    </div>

    <div class="stat-card">
    👥 Committee Members
    <br><br>

    ${data.committee
            .map((m, i) =>
                `${i + 1}. ${m}`)
            .join("<br>")}

    </div>

    <div class="stat-card">
    👥 Match Umpires
    <br><br>

    ${data.umpaiers
            .map((m, i) =>
                `${i + 1}. ${m}`)
            .join("<br>")}

    </div>

    <div class="stat-card">
    🏆 Prize Details
    <br><br>

    ${data.prizes
            .map(p =>
                `${p.name} - ₹${p.amount}`)
            .join("<br>")}

    </div>

    </div>

    <button
    style="margin-top:20px;background:red;"
    onclick="editTournamentDetails()">
    ✏️ Edit Details
    </button>
    `;
}

/* SAVE TOURNAMENT DETAILES */

function saveTournamentDetails() {

    const committee = [];

    document
        .querySelectorAll(".committee-input")
        .forEach(input => {

            if (input.value.trim())
                committee.push(input.value);
        });

    const umpaiers = [];

    document
        .querySelectorAll(".umpaiers-input")
        .forEach(input => {

            if (input.value.trim())
                umpaiers.push(input.value);
        });

    const prizes = [];

    document
        .querySelectorAll(".prize-row")
        .forEach(row => {

            const name =
                row.querySelector(".prize-name").value;

            const amount =
                row.querySelector(".prize-amount").value;

            if (name && amount) {

                prizes.push({
                    name,
                    amount
                });
            }
        });

    const data = {

        tournamentName:
            document.getElementById("tourName").value,

        organizer:
            document.getElementById("organizer").value,

        venue:
            document.getElementById("venue").value,

        date:
            document.getElementById("tourDate").value,

        committee,
        umpaiers,
        prizes
    };

    localStorage.setItem(
        "tournamentDetails",
        JSON.stringify(data)
    );

    loadTournamentInfo();
}

/* ADD COMMITEE MEMBER */

function addCommitteeMember() {

    let div =
        document.createElement("div");

    div.innerHTML = `
        <input
        class="committee-input"
        placeholder="Committee Member">

        <button
        onclick="this.parentElement.remove()">
        ❌
        </button>
        `;

    document
        .getElementById("committeeContainer")
        .appendChild(div);
}

/* ADD UPAIERS */

function addumpaiers() {

    let div = document.createElement("div");

    div.innerHTML = `
            <input
            class="umpaiers-input"
            placeholder="Match Umpire">

            <button
            onclick="this.parentElement.remove()">
            ❌
            </button>
        `;

    document
        .getElementById("umpaiersContainer")
        .appendChild(div);
}

/* ADD PRICE */

function addPrize() {

    let div =
        document.createElement("div");

    div.className = "prize-row";

    div.innerHTML = `

    <input
    class="prize-name"
    placeholder="Prize Name">

    <input
    class="prize-amount"
    placeholder="Amount">

    <button
    onclick="this.parentElement.remove()">
    ❌
    </button>

    `;

    document
        .getElementById("prizeContainer")
        .appendChild(div);
}

function editTournamentDetails() {

    localStorage.removeItem(
        "tournamentDetails"
    );

    loadTournamentInfo();
}

/* SAVE TOURNAMENT INFO (Dashboard "Tournament Information" card) */
/* Fixed: this used to reference input IDs that don't exist in the form
   (organizerInput, placeInput, dateInput, ...) and never wrote anything to
   localStorage, so the info was lost on every refresh. It now reads the
   actual form fields and saves them under "tournamentInfo", which is what
   loadTournamentdetailes() reads back. */

function saveTournamentInfo() {

    const info = {
        tournamentName: document.getElementById("tournamentName").value,
        organizer: document.getElementById("organizerName").value,
        venue: document.getElementById("venueName").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        entryFee: document.getElementById("entryFee").value,
        prizeAmount: document.getElementById("prizeAmount").value,
        donor: document.getElementById("donorName").value
    };

    safeSetJSON("tournamentInfo", info);

    loadTournamentdetailes();

    alert("✅ Tournament Info Saved");
}

function loadTournamentdetailes() {

    const data = safeGetJSON("tournamentInfo", null);

    if (!data) return;

    document.getElementById(
        "showTournamentName"
    ).innerText =
        "🏆 " + data.tournamentName;

    document.getElementById(
        "showOrganizer"
    ).innerText =
        data.organizer;

    document.getElementById(
        "showVenue"
    ).innerText =
        data.venue;

    document.getElementById(
        "showStartDate"
    ).innerText =
        data.startDate;

    document.getElementById(
        "showEndDate"
    ).innerText =
        data.endDate;

    document.getElementById(
        "showEntryFee"
    ).innerText =
        data.entryFee;

    document.getElementById(
        "showPrizeAmount"
    ).innerText =
        data.prizeAmount;

    document.getElementById(
        "showDonor"
    ).innerText =
        data.donor;
}

function saveTournamentSettings() {

    let tname =
        document.getElementById("tournamentName").value;

    let weight =
        document.getElementById("weightLimitInput").value;

    localStorage.setItem("tournamentName", tname);
    localStorage.setItem("weightLimit", weight + " Kg");

    loadTournamentInfo();

    alert("Tournament Settings Saved ✅");


    loadTournamentdetailes();
}

function loadTournamentRecords() {

    const box3 = document.querySelector(".box3");

    if (!box3) return;

    const allPlayers =
        teams.flatMap(team => team.players || []);

    const completedMatches =
        fixtures.filter(f => f.status === "Completed");

    // Top Players

    const topRaiders = [...allPlayers]
        .sort((a, b) => (b.raidPoints || 0) - (a.raidPoints || 0))
        .slice(0, 3);

    const topDefenders = [...allPlayers]
        .sort((a, b) => (b.defencePoints || 0) - (a.defencePoints || 0))
        .slice(0, 3);

    const topAllRounders = [...allPlayers]
        .sort((a, b) =>
            ((b.raidPoints || 0) + (b.defencePoints || 0))
            -
            ((a.raidPoints || 0) + (a.defencePoints || 0))
        )
        .slice(0, 3);

    // Match Stats

    let highestMatch = null;
    let lowestMatch = null;

    if (completedMatches.length) {

        highestMatch =
            completedMatches.reduce((a, b) =>
                (a.score1 + a.score2) >
                    (b.score1 + b.score2)
                    ? a : b
            );

        lowestMatch =
            completedMatches.reduce((a, b) =>
                (a.score1 + a.score2) <
                    (b.score1 + b.score2)
                    ? a : b
            );
    }

    // Team Scores

    const teamScores = {};

    teams.forEach(team => {
        teamScores[team.name] = 0;
    });

    completedMatches.forEach(match => {

        teamScores[match.team1] =
            (teamScores[match.team1] || 0)
            + Number(match.score1 || 0);

        teamScores[match.team2] =
            (teamScores[match.team2] || 0)
            + Number(match.score2 || 0);
    });

    const scoreEntries =
        Object.entries(teamScores);

    const highestTeam =
        scoreEntries.length
            ? scoreEntries.reduce((a, b) => a[1] > b[1] ? a : b)
            : ["-", 0];

    const lowestTeam =
        scoreEntries.length
            ? scoreEntries.reduce((a, b) => a[1] < b[1] ? a : b)
            : ["-", 0];

    // Wins Loss Draw

    const teamStats = {};

    teams.forEach(team => {

        teamStats[team.name] = {
            wins: 0,
            losses: 0,
            draws: 0,
            played: 0
        };
    });

    completedMatches.forEach(match => {

        teamStats[match.team1].played++;
        teamStats[match.team2].played++;

        if (match.score1 > match.score2) {

            teamStats[match.team1].wins++;
            teamStats[match.team2].losses++;

        } else if (match.score2 > match.score1) {

            teamStats[match.team2].wins++;
            teamStats[match.team1].losses++;

        } else {

            teamStats[match.team1].draws++;
            teamStats[match.team2].draws++;
        }
    });

    const mostWins =
        Object.entries(teamStats)
            .sort((a, b) => b[1].wins - a[1].wins)[0];

    const mostLosses =
        Object.entries(teamStats)
            .sort((a, b) => b[1].losses - a[1].losses)[0];

    const mostDraws =
        Object.entries(teamStats)
            .sort((a, b) => b[1].draws - a[1].draws)[0];

    // Totals

    const totalRaidPoints =
        allPlayers.reduce((sum, p) =>
            sum + (p.raidPoints || 0), 0);

    const totalDefencePoints =
        allPlayers.reduce((sum, p) =>
            sum + (p.defencePoints || 0), 0);

    const totalTournamentScore =
        Object.values(teamScores)
            .reduce((a, b) => a + b, 0);

    const avgTournamentScore =
        completedMatches.length
            ? (totalTournamentScore /
                completedMatches.length).toFixed(1)
            : 0;

    const totalMatchesPlayed = completedMatches.length;

    const progressPercent =
        fixtures.length
            ? Math.round((completedMatches.length / fixtures.length) * 100)
            : 0;

    // Team Average Score

    const teamAverageScores = {};

    Object.keys(teamScores).forEach(team => {

        let played = teamStats[team]?.played || 0;

        teamAverageScores[team] =
            played > 0
                ? (teamScores[team] / played).toFixed(1)
                : 0;
    });

    const highestAvgTeam =
        Object.entries(teamAverageScores)
            .sort((a, b) => b[1] - a[1])[0];

    // MVP

    const mvp =
        [...allPlayers]
            .sort((a, b) =>
                (b.totalPoints || 0)
                -
                (a.totalPoints || 0)
            )[0];

    // Champion

    const currentChampion =
        Object.entries(teamStats)
            .sort((a, b) =>
                b[1].wins - a[1].wins
            )[0];

    // Longest Winning Streak

    let streaks = {};

    teams.forEach(team => {
        streaks[team.name] = 0;
    });

    let longestStreakTeam = "-";
    let longestStreak = 0;

    completedMatches.forEach(match => {

        if (match.score1 > match.score2) {

            streaks[match.team1]++;

            if (streaks[match.team1] > longestStreak) {

                longestStreak =
                    streaks[match.team1];

                longestStreakTeam =
                    match.team1;
            }

            streaks[match.team2] = 0;

        }

        else if (match.score2 > match.score1) {

            streaks[match.team2]++;

            if (streaks[match.team2] > longestStreak) {

                longestStreak =
                    streaks[match.team2];

                longestStreakTeam =
                    match.team2;
            }

            streaks[match.team1] = 0;
        }
    });

    // Team Form Rating (Last 5 Matches)

    const formRatings = {};

    teams.forEach(team => {

        let matches = completedMatches.filter(m =>
            m.team1 === team.name || m.team2 === team.name
        );

        let points = 0;

        matches.slice(-5).forEach(match => {

            if (
                (match.team1 === team.name && match.score1 > match.score2) ||
                (match.team2 === team.name && match.score2 > match.score1)
            ) {
                points += 3;
            }
            else if (match.score1 === match.score2) {
                points += 1;
            }

        });

        formRatings[team.name] = points;
    });

    const bestFormTeam =
        Object.entries(formRatings)
            .sort((a, b) => b[1] - a[1])[0];


    // Most Active Team

    const mostActiveTeam =
        Object.entries(teamStats)
            .sort((a, b) => b[1].played - a[1].played)[0];


    // Raid Efficiency

    const bestRaidEfficiency =
        [...allPlayers]
            .sort((a, b) =>
                (b.raidPoints || 0) - (a.raidPoints || 0)
            )[0];


    // Defence Efficiency

    const bestDefenceEfficiency =
        [...allPlayers]
            .sort((a, b) =>
                (b.defencePoints || 0) - (a.defencePoints || 0)
            )[0];


    // Best Captain

    let bestCaptain = "-";
    let captainWins = 0;

    teams.forEach(team => {

        const captain =
            team.players.find(p => p.captain);

        if (!captain) return;

        const wins =
            teamStats[team.name]?.wins || 0;

        if (wins > captainWins) {
            captainWins = wins;
            bestCaptain = captain.name;
        }
    });


    // Win Percentage Leader

    const winLeader =
        Object.entries(teamStats)
            .sort((a, b) => {

                const aPct =
                    a[1].played
                        ? (a[1].wins / a[1].played)
                        : 0;

                const bPct =
                    b[1].played
                        ? (b[1].wins / b[1].played)
                        : 0;

                return bPct - aPct;

            })[0];


    // Most Dominant Win

    const dominantMatch =
        completedMatches.length
            ?
            completedMatches.reduce((a, b) =>
                Math.abs(a.score1 - a.score2)
                    >
                    Math.abs(b.score1 - b.score2)
                    ? a : b
            )
            : null;


    // MVP Race

    const mvpRace =
        [...allPlayers]
            .sort((a, b) =>
                (b.totalPoints || 0)
                -
                (a.totalPoints || 0)
            )
            .slice(0, 5);


    // Champion Prediction

    const championPrediction =
        Object.entries(teamStats)
            .sort((a, b) =>
                b[1].wins - a[1].wins
            )[0];


    // Biggest Upset

    const biggestUpset =
        completedMatches.length
            ?
            completedMatches.reduce((a, b) =>
                Math.abs(a.score1 - a.score2)
                    <
                    Math.abs(b.score1 - b.score2)
                    ? a : b
            )
            : null;

    box3.innerHTML = `

    <h2 class="stats-title">
    🏆 TOURNAMENT RECORDS
    </h2>

    <div class="stats-grid">

    <div class="stat-card">
    🔥 Top 3 Raiders
    <br><br>
    ${topRaiders.map((p, i) =>
        `${i + 1}. ${p.name}
    (${p.raidPoints || 0})`
    ).join("<br>")}
    </div>

    <div class="stat-card">
    🛡️ Top 3 Defenders
    <br><br>
    ${topDefenders.map((p, i) =>
        `${i + 1}. ${p.name}
    (${p.defencePoints || 0})`
    ).join("<br>")}
    </div>

    <div class="stat-card">
    ⭐ Top 3 All Rounders
    <br><br>
    ${topAllRounders.map((p, i) =>
        `${i + 1}. ${p.name}
    (${p.totalPoints || 0})`
    ).join("<br>")}
    </div>

    <div class="stat-card">
    🏆 Highest Match
    <br><br>
    ${highestMatch ?
            `${highestMatch.team1}
    ${highestMatch.score1}
    -
    ${highestMatch.score2}
    ${highestMatch.team2}`
            : "-"}
    </div>

    <div class="stat-card">
    😬 Lowest Match
    <br><br>
    ${lowestMatch ?
            `${lowestMatch.team1}
    ${lowestMatch.score1}
    -
    ${lowestMatch.score2}
    ${lowestMatch.team2}`
            : "-"}
    </div>

    <div class="stat-card">
    🚀 Highest Scoring Team
    <br><br>
    ${highestTeam[0]}
    (${highestTeam[1]} pts)
    </div>

    <div class="stat-card">
    📉 Lowest Scoring Team
    <br><br>
    ${lowestTeam[0]}
    (${lowestTeam[1]} pts)
    </div>

    <div class="stat-card">
    📊 Tournament Avg Score
    <br><br>
    ${avgTournamentScore}
    </div>

    <div class="stat-card">
    📋 Best Team Avg
    <br><br>
    ${highestAvgTeam?.[0] || "-"}
    (${highestAvgTeam?.[1] || 0})
    </div>

    <div class="stat-card">
    🥇 Most Wins
    <br><br>
    ${mostWins?.[0] || "-"}
    (${mostWins?.[1]?.wins || 0})
    </div>

    <div class="stat-card">
    ❌ Most Losses
    <br><br>
    ${mostLosses?.[0] || "-"}
    (${mostLosses?.[1]?.losses || 0})
    </div>

    <div class="stat-card">
    🤝 Most Draws
    <br><br>
    ${mostDraws?.[0] || "-"}
    (${mostDraws?.[1]?.draws || 0})
    </div>

    <div class="stat-card">
    🎯 Total Raid Points
    <br><br>
    ${totalRaidPoints}
    </div>

    <div class="stat-card">
    🛡️ Total Defence Points
    <br><br>
    ${totalDefencePoints}
    </div>

    <div class="stat-card">
    🏅 MVP
    <br><br>
    ${mvp?.name || "-"}
    (${mvp?.totalPoints || 0})
    </div>

    <div class="stat-card">
    ⚡ Highest Raid Points
    <br><br>
    ${topRaiders?.[0]?.name || "-"}
    (${topRaiders?.[0]?.raidPoints || 0})
    </div>

    <div class="stat-card">
    🧱 Highest Defence Points
    <br><br>
    ${topDefenders?.[0]?.name || "-"}
    (${topDefenders?.[0]?.defencePoints || 0})
    </div>

    <div class="stat-card">
    🏆 Current Champion
    <br><br>
    ${currentChampion?.[0] || "-"}
    </div>

    <div class="stat-card">
    🎮 Matches Played
    <br><br>
    ${totalMatchesPlayed}
    </div>

    <div class="stat-card">
    📈 Tournament Progress
    <br><br>
    ${progressPercent}%
    </div>

    <div class="stat-card">
    🔥 Longest Win Streak
    <br><br>
    ${longestStreakTeam}
    (${longestStreak})
    </div>

    <div class="stat-card">
    🏆 Champion Prediction
    <br><br>
    ${championPrediction?.[0] || "-"}
    </div>

    <div class="stat-card">
    ⚡ Team Form Rating
    <br><br>
    ${bestFormTeam?.[0] || "-"}
    (${bestFormTeam?.[1] || 0})
    </div>

    <div class="stat-card">
    🔥 Most Active Team
    <br><br>
    ${mostActiveTeam?.[0] || "-"}
    (${mostActiveTeam?.[1]?.played || 0} Matches)
    </div>

    <div class="stat-card">
    🎯 Raid Efficiency
    <br><br>
    ${bestRaidEfficiency?.name || "-"}
    (${bestRaidEfficiency?.raidPoints || 0})
    </div>

    <div class="stat-card">
    🛡️ Defence Efficiency
    <br><br>
    ${bestDefenceEfficiency?.name || "-"}
    (${bestDefenceEfficiency?.defencePoints || 0})
    </div>

    <div class="stat-card">
    👑 Best Captain
    <br><br>
    ${bestCaptain}
    (${captainWins} Wins)
    </div>

    <div class="stat-card">
    📈 Win % Leader
    <br><br>
    ${winLeader?.[0] || "-"}
    </div>

    <div class="stat-card">
    🚀 Most Dominant Win
    <br><br>
    ${dominantMatch
            ? `${dominantMatch.team1}
    ${dominantMatch.score1}-${dominantMatch.score2}
    ${dominantMatch.team2}`
            : "-"
        }
    </div>

    <div class="stat-card">
    💀 Biggest Upset
    <br><br>
    ${biggestUpset
            ? `${biggestUpset.team1}
    ${biggestUpset.score1}-${biggestUpset.score2}
    ${biggestUpset.team2}`
            : "-"
        }
    </div>

    <div class="stat-card">
    🎖️ MVP Race
    <br><br>
    ${mvpRace.map((p, i) =>
            `${i + 1}. ${p.name} (${p.totalPoints || 0})`
        ).join("<br>")}
    </div>

    </div>
    `;
}

function toggleTheme() {
    document.body.classList.toggle("dark-theme");

    const btn = document.getElementById("themeBtn");

    if (document.body.classList.contains("dark-theme")) {
        btn.innerHTML = "☀️ Light Mode";
        localStorage.setItem("theme", "dark");
    } else {
        btn.innerHTML = "🌙 Dark Mode";
        localStorage.setItem("theme", "light");
    }
}

/* EXPORT TOURNAMENT AS JSON (FULL BACKUP — RESTORABLE VIA "CHOOSE FILE") */

function exportTournamentJSON() {

    if (teams.length === 0 && fixtures.length === 0) {
        alert("No Tournament Data Found!");
        return;
    }

    const exportData = {
        app: "Kabaddi Pro",
        version: 1,
        exportedAt: new Date().toISOString(),

        teams: teams,
        fixtures: fixtures,

        settings: {
            tournamentName: localStorage.getItem("tournamentName") || "",
            weightLimit: localStorage.getItem("weightLimit") || "",
            maxPlayers: localStorage.getItem("maxPlayers") || "12"
        },

        tournamentInfo: safeGetJSON("tournamentInfo", null),
        tournamentDetails: safeGetJSON("tournamentDetails", null),
        theme: localStorage.getItem("theme") || "light"
    };

    let blob;

    try {
        blob = new Blob(
            [JSON.stringify(exportData, null, 2)],
            { type: "application/json" }
        );
    } catch (err) {
        console.error(err);
        alert("❌ Could not build the JSON export file.");
        return;
    }

    const safeName =
        (exportData.settings.tournamentName || "Kabaddi_Tournament")
            .trim()
            .replace(/[^a-z0-9]+/gi, "_") || "Kabaddi_Tournament";

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    alert("📥 Tournament data exported as JSON ✅");
}

function exportTournament() {

    if (!window.jspdf) {
        alert("PDF library not loaded. Check your internet connection and try again.");
        return;
    }

    const tDetails = JSON.parse(localStorage.getItem("tournamentDetails")) || null;

    const tournamentName =
        tDetails?.tournamentName ||
        localStorage.getItem("tournamentName") ||
        "Tournament Report";

    if (!tDetails && teams.length === 0 && fixtures.length === 0) {
        alert("No Tournament Data Found!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const PRIMARY = [30, 60, 114];
    const ACCENT = [202, 89, 19];
    const LIGHT = [243, 246, 250];
    const TEXT = [40, 40, 40];
    const MUTED = [120, 120, 120];

    let y = margin;

    /* ---- layout helpers ---- */

    function newPage() {
        doc.addPage();
        y = margin;
    }

    function ensureSpace(height) {
        if (y + height > pageHeight - 18) newPage();
    }

    function sectionTitle(title) {
        ensureSpace(16);
        doc.setFillColor(...PRIMARY);
        doc.rect(margin, y, contentWidth, 9, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, margin + 3, y + 6.3);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT);
        y += 14;
    }

    function subTitle(title) {
        ensureSpace(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...ACCENT);
        doc.text(title, margin, y);
        doc.setTextColor(...TEXT);
        doc.setFont("helvetica", "normal");
        y += 7;
    }

    function note(text) {
        ensureSpace(7);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(...MUTED);
        doc.text(text, margin, y);
        doc.setTextColor(...TEXT);
        doc.setFont("helvetica", "normal");
        y += 8;
    }

    function drawTable(headers, rows, colWidths) {
        const rowHeight = 7;
        const totalWidth = colWidths.reduce((a, b) => a + b, 0);

        function header() {
            let x = margin;
            doc.setFillColor(...PRIMARY);
            doc.rect(margin, y, totalWidth, rowHeight, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            headers.forEach((h, i) => {
                doc.text(String(h), x + 2, y + 4.8);
                x += colWidths[i];
            });
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...TEXT);
            y += rowHeight;
        }

        ensureSpace(rowHeight * 2);
        header();

        if (rows.length === 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(...MUTED);
            doc.text("No data available", margin + 2, y + 4.8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...TEXT);
            y += rowHeight;
        }

        rows.forEach((row, rIndex) => {

            if (y + rowHeight > pageHeight - 18) {
                newPage();
                header();
            }

            if (rIndex % 2 === 1) {
                doc.setFillColor(...LIGHT);
                doc.rect(margin, y, totalWidth, rowHeight, "F");
            }

            let cx = margin;
            doc.setFontSize(9);
            row.forEach((cell, cIndex) => {
                doc.text(String(cell ?? "-"), cx + 2, y + 4.8, { maxWidth: colWidths[cIndex] - 3 });
                cx += colWidths[cIndex];
            });

            y += rowHeight;
        });

        y += 6;
    }

    /* ---- data helpers (computed fresh, independent of the DOM) ---- */

    function computeStandings() {
        let points = {};

        teams.forEach(team => {
            points[team.name] = { team: team.name, played: 0, won: 0, lost: 0, draw: 0, pts: 0 };
        });

        fixtures.forEach(match => {
            if (match.status !== "Completed") return;

            let t1 = points[match.team1];
            let t2 = points[match.team2];
            if (!t1 || !t2) return;

            t1.played++;
            t2.played++;

            if (match.score1 > match.score2) {
                t1.won++; t1.pts += 5; t2.lost++;
            } else if (match.score2 > match.score1) {
                t2.won++; t2.pts += 5; t1.lost++;
            } else {
                t1.draw++; t2.draw++; t1.pts += 3; t2.pts += 3;
            }
        });

        return Object.values(points).sort((a, b) => b.pts - a.pts);
    }

    function computeTopPerformers() {
        const allPlayers = teams.flatMap(t => t.players || []);
        if (allPlayers.length === 0) return null;

        const topRaider = allPlayers.reduce((a, b) => (a.raidPoints || 0) > (b.raidPoints || 0) ? a : b);
        const topDefender = allPlayers.reduce((a, b) => (a.defencePoints || 0) > (b.defencePoints || 0) ? a : b);
        const topAllRounder = allPlayers.reduce((a, b) => (a.totalPoints || 0) > (b.totalPoints || 0) ? a : b);

        const teamOf = (player) => teams.find(t => t.players.includes(player))?.name || "-";

        return {
            topRaider, topDefender, topAllRounder,
            topRaiderTeam: teamOf(topRaider),
            topDefenderTeam: teamOf(topDefender),
            topAllRounderTeam: teamOf(topAllRounder)
        };
    }

    function computeTournamentRecords() {
        const allPlayers = teams.flatMap(team => team.players || []);
        const completedMatches = fixtures.filter(f => f.status === "Completed");
        const standings = computeStandings();

        const teamStats = {};
        standings.forEach(s => {
            teamStats[s.team] = { wins: s.won, losses: s.lost, draws: s.draw, played: s.played };
        });

        const topRaiders = [...allPlayers].sort((a, b) => (b.raidPoints || 0) - (a.raidPoints || 0)).slice(0, 3);
        const topDefenders = [...allPlayers].sort((a, b) => (b.defencePoints || 0) - (a.defencePoints || 0)).slice(0, 3);
        const topAllRounders = [...allPlayers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 3);
        const mvpRace = [...allPlayers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 5);

        let highestMatch = null, lowestMatch = null, dominantMatch = null, biggestUpset = null;

        if (completedMatches.length) {
            highestMatch = completedMatches.reduce((a, b) => (a.score1 + a.score2) > (b.score1 + b.score2) ? a : b);
            lowestMatch = completedMatches.reduce((a, b) => (a.score1 + a.score2) < (b.score1 + b.score2) ? a : b);
            dominantMatch = completedMatches.reduce((a, b) => Math.abs(a.score1 - a.score2) > Math.abs(b.score1 - b.score2) ? a : b);
            biggestUpset = completedMatches.reduce((a, b) => Math.abs(a.score1 - a.score2) < Math.abs(b.score1 - b.score2) ? a : b);
        }

        const teamScores = {};
        teams.forEach(team => { teamScores[team.name] = 0; });

        completedMatches.forEach(match => {
            teamScores[match.team1] = (teamScores[match.team1] || 0) + Number(match.score1 || 0);
            teamScores[match.team2] = (teamScores[match.team2] || 0) + Number(match.score2 || 0);
        });

        const scoreEntries = Object.entries(teamScores);
        const highestTeam = scoreEntries.length ? scoreEntries.reduce((a, b) => a[1] > b[1] ? a : b) : ["-", 0];
        const lowestTeam = scoreEntries.length ? scoreEntries.reduce((a, b) => a[1] < b[1] ? a : b) : ["-", 0];

        const mostWins = Object.entries(teamStats).sort((a, b) => b[1].wins - a[1].wins)[0];
        const mostLosses = Object.entries(teamStats).sort((a, b) => b[1].losses - a[1].losses)[0];
        const mostDraws = Object.entries(teamStats).sort((a, b) => b[1].draws - a[1].draws)[0];

        const totalRaidPoints = allPlayers.reduce((sum, p) => sum + (p.raidPoints || 0), 0);
        const totalDefencePoints = allPlayers.reduce((sum, p) => sum + (p.defencePoints || 0), 0);
        const totalTournamentScore = Object.values(teamScores).reduce((a, b) => a + b, 0);
        const avgTournamentScore = completedMatches.length ? (totalTournamentScore / completedMatches.length).toFixed(1) : 0;
        const totalMatchesPlayed = completedMatches.length;
        const progressPercent = fixtures.length ? Math.round((completedMatches.length / fixtures.length) * 100) : 0;

        const teamAverageScores = {};
        Object.keys(teamScores).forEach(team => {
            let played = teamStats[team]?.played || 0;
            teamAverageScores[team] = played > 0 ? (teamScores[team] / played).toFixed(1) : 0;
        });
        const highestAvgTeam = Object.entries(teamAverageScores).sort((a, b) => b[1] - a[1])[0];

        const mvp = [...allPlayers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))[0];
        const currentChampion = Object.entries(teamStats).sort((a, b) => b[1].wins - a[1].wins)[0];

        let streaks = {};
        teams.forEach(team => { streaks[team.name] = 0; });
        let longestStreakTeam = "-", longestStreak = 0;

        completedMatches.forEach(match => {
            if (match.score1 > match.score2) {
                streaks[match.team1]++;
                if (streaks[match.team1] > longestStreak) {
                    longestStreak = streaks[match.team1];
                    longestStreakTeam = match.team1;
                }
                streaks[match.team2] = 0;
            } else if (match.score2 > match.score1) {
                streaks[match.team2]++;
                if (streaks[match.team2] > longestStreak) {
                    longestStreak = streaks[match.team2];
                    longestStreakTeam = match.team2;
                }
                streaks[match.team1] = 0;
            }
        });

        const formRatings = {};
        teams.forEach(team => {
            let matches = completedMatches.filter(m => m.team1 === team.name || m.team2 === team.name);
            let points = 0;
            matches.slice(-5).forEach(match => {
                if ((match.team1 === team.name && match.score1 > match.score2) ||
                    (match.team2 === team.name && match.score2 > match.score1)) {
                    points += 3;
                } else if (match.score1 === match.score2) {
                    points += 1;
                }
            });
            formRatings[team.name] = points;
        });
        const bestFormTeam = Object.entries(formRatings).sort((a, b) => b[1] - a[1])[0];

        const mostActiveTeam = Object.entries(teamStats).sort((a, b) => b[1].played - a[1].played)[0];

        let bestCaptain = "-", captainWins = 0;
        teams.forEach(team => {
            const captain = team.players.find(p => p.captain);
            if (!captain) return;
            const wins = teamStats[team.name]?.wins || 0;
            if (wins > captainWins) {
                captainWins = wins;
                bestCaptain = captain.name;
            }
        });

        const winLeader = Object.entries(teamStats).sort((a, b) => {
            const aPct = a[1].played ? (a[1].wins / a[1].played) : 0;
            const bPct = b[1].played ? (b[1].wins / b[1].played) : 0;
            return bPct - aPct;
        })[0];

        return {
            completedMatches, topRaiders, topDefenders, topAllRounders, mvpRace,
            highestMatch, lowestMatch, dominantMatch, biggestUpset,
            highestTeam, lowestTeam, mostWins, mostLosses, mostDraws,
            totalRaidPoints, totalDefencePoints, avgTournamentScore,
            totalMatchesPlayed, progressPercent, highestAvgTeam, mvp,
            currentChampion, longestStreakTeam, longestStreak, bestFormTeam,
            mostActiveTeam, bestCaptain, captainWins, winLeader
        };
    }

    /* ==================== COVER ==================== */

    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageWidth, 48, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(tournamentName, pageWidth / 2, 23, { align: "center", maxWidth: contentWidth });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Official Tournament Report", pageWidth / 2, 34, { align: "center" });

    doc.setFontSize(9);
    doc.text("Generated on " + new Date().toLocaleDateString(), pageWidth / 2, 42, { align: "center" });

    doc.setTextColor(...TEXT);
    y = 58;

    /* ==================== TOURNAMENT SETUP ==================== */

    sectionTitle("TOURNAMENT SETUP");

    drawTable(
        ["Field", "Detail"],
        [
            ["Organizer", tDetails?.organizer || "-"],
            ["Venue", tDetails?.venue || "-"],
            ["Date", tDetails?.date || "-"],
            ["Teams Registered", String(teams.length)],
            ["Total Fixtures", String(fixtures.length)],
            ["Weight Limit", localStorage.getItem("weightLimit") || "No Limit"]
        ],
        [55, contentWidth - 55]
    );

    if (tDetails?.committee?.length) {
        subTitle("Committee Members");
        drawTable(["#", "Name"], tDetails.committee.map((m, i) => [i + 1, m]), [15, contentWidth - 15]);
    }

    if (tDetails?.umpaiers?.length) {
        subTitle("Match Umpires");
        drawTable(["#", "Name"], tDetails.umpaiers.map((m, i) => [i + 1, m]), [15, contentWidth - 15]);
    }

    if (tDetails?.prizes?.length) {
        subTitle("Prize Details");
        drawTable(
            ["#", "Prize", "Amount (Rs.)"],
            tDetails.prizes.map((p, i) => [i + 1, p.name, p.amount]),
            [15, contentWidth - 65, 50]
        );
    }

    /* ==================== TEAMS & SQUADS ==================== */

    if (teams.length) {
        sectionTitle("TEAMS & SQUADS");

        teams.forEach(team => {
            subTitle(`${team.name}  (${team.players.length} Players)`);

            if (team.players.length === 0) {
                note("No players added yet.");
                return;
            }

            drawTable(
                ["#", "Name", "Jersey", "Position", "Age", "Role"],
                team.players.map((p, i) => [
                    i + 1,
                    p.name,
                    p.jnum,
                    p.position || "-",
                    p.age || "-",
                    p.captain ? "Captain" : p.vicecaptain ? "Vice Captain" : "-"
                ]),
                [12, contentWidth - (12 + 22 + 35 + 18 + 30), 22, 35, 18, 30]
            );
        });
    }

    /* ==================== FIXTURES & RESULTS ==================== */

    if (fixtures.length) {
        sectionTitle("FIXTURES & RESULTS");

        drawTable(
            ["Round", "Match", "Score", "Status"],
            fixtures.map(m => [
                m.round,
                `${m.team1} vs ${m.team2}`,
                (m.score1 !== "" && m.score2 !== "") ? `${m.score1} - ${m.score2}` : "-",
                m.status
            ]),
            [35, contentWidth - (35 + 35 + 30), 35, 30]
        );
    }

    /* ==================== POINTS TABLE ==================== */

    if (teams.length) {
        sectionTitle("POINTS TABLE");

        const standings = computeStandings();

        drawTable(
            ["Rank", "Team", "P", "W", "L", "D", "Pts"],
            standings.map((t, i) => [i + 1, t.team, t.played, t.won, t.lost, t.draw, t.pts]),
            [18, contentWidth - (18 + 20 * 5), 20, 20, 20, 20, 20]
        );
    }

    /* ==================== TOP PERFORMERS ==================== */

    const performers = computeTopPerformers();

    if (performers) {
        sectionTitle("TOP PERFORMERS");

        drawTable(
            ["Category", "Player", "Team", "Points"],
            [
                ["Top Raider", performers.topRaider.name, performers.topRaiderTeam, performers.topRaider.raidPoints || 0],
                ["Top Defender", performers.topDefender.name, performers.topDefenderTeam, performers.topDefender.defencePoints || 0],
                ["Top All Rounder", performers.topAllRounder.name, performers.topAllRounderTeam, performers.topAllRounder.totalPoints || 0]
            ],
            [40, contentWidth - (40 + 40 + 30), 40, 30]
        );
    }

    /* ==================== TOURNAMENT RECORDS ==================== */

    if (teams.length) {

        const r = computeTournamentRecords();

        sectionTitle("TOURNAMENT RECORDS");

        subTitle("Top 3 Raiders");
        drawTable(["#", "Player", "Raid Pts"], r.topRaiders.map((p, i) => [i + 1, p.name, p.raidPoints || 0]), [15, contentWidth - 45, 30]);

        subTitle("Top 3 Defenders");
        drawTable(["#", "Player", "Defence Pts"], r.topDefenders.map((p, i) => [i + 1, p.name, p.defencePoints || 0]), [15, contentWidth - 45, 30]);

        subTitle("Top 3 All Rounders");
        drawTable(["#", "Player", "Total Pts"], r.topAllRounders.map((p, i) => [i + 1, p.name, p.totalPoints || 0]), [15, contentWidth - 45, 30]);

        subTitle("MVP Race (Top 5)");
        drawTable(["#", "Player", "Total Pts"], r.mvpRace.map((p, i) => [i + 1, p.name, p.totalPoints || 0]), [15, contentWidth - 45, 30]);

        subTitle("Match & Team Records");

        const fmtMatch = (m) => m ? `${m.team1} ${m.score1} - ${m.score2} ${m.team2}` : "-";

        drawTable(
            ["Record", "Detail"],
            [
                ["Highest Scoring Match", fmtMatch(r.highestMatch)],
                ["Lowest Scoring Match", fmtMatch(r.lowestMatch)],
                ["Most Dominant Win", fmtMatch(r.dominantMatch)],
                ["Biggest Upset", fmtMatch(r.biggestUpset)],
                ["Highest Scoring Team", `${r.highestTeam[0]} (${r.highestTeam[1]} pts)`],
                ["Lowest Scoring Team", `${r.lowestTeam[0]} (${r.lowestTeam[1]} pts)`],
                ["Tournament Avg Score", String(r.avgTournamentScore)],
                ["Best Team Average", `${r.highestAvgTeam?.[0] || "-"} (${r.highestAvgTeam?.[1] || 0})`],
                ["Most Wins", `${r.mostWins?.[0] || "-"} (${r.mostWins?.[1]?.wins || 0})`],
                ["Most Losses", `${r.mostLosses?.[0] || "-"} (${r.mostLosses?.[1]?.losses || 0})`],
                ["Most Draws", `${r.mostDraws?.[0] || "-"} (${r.mostDraws?.[1]?.draws || 0})`],
                ["Total Raid Points", String(r.totalRaidPoints)],
                ["Total Defence Points", String(r.totalDefencePoints)],
                ["MVP", `${r.mvp?.name || "-"} (${r.mvp?.totalPoints || 0} pts)`],
                ["Current Champion", r.currentChampion?.[0] || "-"],
                ["Matches Played", String(r.totalMatchesPlayed)],
                ["Tournament Progress", `${r.progressPercent}%`],
                ["Longest Win Streak", `${r.longestStreakTeam} (${r.longestStreak})`],
                ["Best Current Form", `${r.bestFormTeam?.[0] || "-"} (${r.bestFormTeam?.[1] || 0} pts, last 5)`],
                ["Most Active Team", `${r.mostActiveTeam?.[0] || "-"} (${r.mostActiveTeam?.[1]?.played || 0} matches)`],
                ["Best Captain", `${r.bestCaptain} (${r.captainWins} wins)`],
                ["Win % Leader", r.winLeader?.[0] || "-"]
            ],
            [55, contentWidth - 55]
        );
    }

    /* ==================== FOOTER / PAGE NUMBERS ==================== */

    const totalPages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`${tournamentName} | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    const safeName = tournamentName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Tournament";

    doc.save(`${safeName}_Tournament_Report.pdf`);
}

function importTournament(event) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        try {

            const data =
                JSON.parse(e.target.result);

            teams = data.teams || [];
            fixtures = data.fixtures || [];

            saveTeams();

            saveFixtures();

            if (data.settings) {

                localStorage.setItem(
                    "tournamentName",
                    data.settings.tournamentName || ""
                );

                localStorage.setItem(
                    "weightLimit",
                    data.settings.weightLimit || ""
                );

                localStorage.setItem(
                    "maxPlayers",
                    data.settings.maxPlayers || "12"
                );
            }

            if (data.tournamentInfo) {
                safeSetJSON("tournamentInfo", data.tournamentInfo);
            }

            if (data.tournamentDetails) {
                safeSetJSON("tournamentDetails", data.tournamentDetails);
            }

            if (data.theme) {
                localStorage.setItem("theme", data.theme);
            }

            loadTeams();
            loadPlayers();
            loadFixtures();
            loadPointsTable();
            loadTop4Teams();
            loadTopPlayers();
            loadMatchStatus();
            loadTournamentInfo();
            loadTournamentRecords();
            loadTournamentdetailes();

            alert("Tournament Imported Successfully ✅");

        }
        catch (err) {

            console.error(err);

            alert("Invalid Tournament File ❌");
        }
    };

    reader.readAsText(file);
}

function showFileName(event) {

    let file = event.target.files[0];

    if (file) {
        document.getElementById("fileName").innerText =
            file.name;

        importTournament(event);
    }
}

/* SET MATCH DURATION (FIRST STEP — USER ENTERS HALF + BREAK LENGTH) */

function setMatchDuration(index) {

    let halfMin = Number(
        document.getElementById(`halfDurationInput${index}`).value
    );

    let breakMin = Number(
        document.getElementById(`breakDurationInput${index}`).value
    ) || 5;

    if (!halfMin || halfMin <= 0) {
        alert("⚠️ Enter a valid half duration in minutes");
        return;
    }

    let match = fixtures[index];

    match.halfDuration = halfMin * 60;
    match.breakDuration = breakMin * 60;

    match.timer = match.halfDuration;
    match.half = match.half || 1;

    match.running = false;

    match.team1Timeout = match.team1Timeout ?? 1;
    match.team2Timeout = match.team2Timeout ?? 1;

    match.officialTimeouts = match.officialTimeouts || 0;

    match.super1 = match.super1 || 0;
    match.super2 = match.super2 || 0;

    // 🚨 Do Or Die System

    match.team1EmptyRaids = match.team1EmptyRaids || 0;
    match.team2EmptyRaids = match.team2EmptyRaids || 0;

    match.team1DoOrDie = match.team1DoOrDie || false;
    match.team2DoOrDie = match.team2DoOrDie || false;

    match.raidTimer = 30;
    match.raidRunning = false;

    saveFixtures();

    document.getElementById(`timerSetup${index}`).style.display = "none";
    document.getElementById(`timerMain${index}`).style.display = "flex";

    document.getElementById(`half${index}`).innerText = match.half;

    updateTimer(index);
    updateRaidTimerDisplay(index);

    alert(`⏱️ Duration Set — ${halfMin} min/half, ${breakMin} min break`);
}

/* EDIT MATCH DURATION (GO BACK TO SETUP) */

function editMatchDuration(index) {

    document.getElementById(`timerSetup${index}`).style.display = "flex";
    document.getElementById(`timerMain${index}`).style.display = "none";
}

function emptyRaid(matchIndex, teamNum) {

    let match = fixtures[matchIndex];

    if (teamNum === 1) {

        match.team1EmptyRaids++;
        match.team1EmptyRaidsTotal = (match.team1EmptyRaidsTotal || 0) + 1;

        if (match.team1EmptyRaids >= 2) {
            if (!match.team1DoOrDie) {
                match.team1DoOrDieTriggerCount = (match.team1DoOrDieTriggerCount || 0) + 1;
            }
            match.team1DoOrDie = true;
            playBuzzer();
        }

    } else {

        match.team2EmptyRaids++;
        match.team2EmptyRaidsTotal = (match.team2EmptyRaidsTotal || 0) + 1;

        if (match.team2EmptyRaids >= 2) {
            if (!match.team2DoOrDie) {
                match.team2DoOrDieTriggerCount = (match.team2DoOrDieTriggerCount || 0) + 1;
            }
            match.team2DoOrDie = true;
            playBuzzer();
        }
    }

    updateDoOrDie(matchIndex);

    saveFixtures();
}

/* BUZZER SOUND (NO EXTERNAL AUDIO FILE NEEDED) */

function playBuzzer() {
    try {
        let ctx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = ctx.createOscillator();
        let gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.value = 220;
        gain.gain.value = 0.3;

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();

        setTimeout(() => {
            osc.stop();
            ctx.close();
        }, 700);

    } catch (e) {
        console.log("Buzzer not supported", e);
    }
}

/* RAID FAILED — DO OR DIE ENFORCEMENT */

function raidFailed(matchIndex, teamNum) {

    let match = fixtures[matchIndex];
    let isDoOrDie = teamNum === 1 ? match.team1DoOrDie : match.team2DoOrDie;

    if (!isDoOrDie) {
        alert("⚠️ This is only used during a Do-or-Die Raid.");
        return;
    }

    let teamName = teamNum === 1 ? match.team1 : match.team2;
    let teamObj = teams.find(t => t.name === teamName);

    let jnum = prompt("Enter Jersey Number of the raider who failed:");
    if (jnum === null || jnum.trim() === "") return;

    let playerIndex = teamObj.players.findIndex(
        p => p.jnum === jnum.trim()
    );

    if (playerIndex === -1) {
        alert("❌ Player not found");
        return;
    }

    playerOut(matchIndex, teamNum, playerIndex);

    let oppNum = teamNum === 1 ? 2 : 1;
    changeScore(matchIndex, `d${oppNum}`, 1);

    let failedPlayer = teamObj.players[playerIndex];
    let failureRecord = {
        jnum: failedPlayer.jnum,
        name: failedPlayer.name
    };

    if (teamNum === 1) {
        match.team1EmptyRaids = 0;
        match.team1DoOrDie = false;
        match.team1DoOrDieFailures = match.team1DoOrDieFailures || [];
        match.team1DoOrDieFailures.push(failureRecord);
    } else {
        match.team2EmptyRaids = 0;
        match.team2DoOrDie = false;
        match.team2DoOrDieFailures = match.team2DoOrDieFailures || [];
        match.team2DoOrDieFailures.push(failureRecord);
    }

    updateDoOrDie(matchIndex);

    saveFixtures();

    alert(`🚨 Raider #${jnum} declared OUT (Do-or-Die failed)`);
}

/* START TIMER */

function startTimer(index) {

    let match = fixtures[index];

    if (!match.halfDuration) {
        alert("⚠️ Please set the match duration first");
        return;
    }

    if (match.breakActive) {
        alert("⏳ A break is currently running — wait or skip it first");
        return;
    }

    match.running = true;

    clearInterval(match.interval);

    match.interval = setInterval(() => {

        if (!match.running) return;

        if (match.timer <= 0) {

            clearInterval(match.interval);
            match.running = false;

            if (match.half === 1) {

                startBreak(
                    index,
                    match.breakDuration || 300,
                    "🏟️ Half-Time Break",
                    "half2"
                );

                return;
            }

            match.status = "Completed";

            loadMatchStatus();

            alert("🏆 Match Completed");

            return;
        }

        match.timer--;

        updateTimer(index);

    }, 1000);
}

/* UPDATE TIMER */

function updateTimer(index) {

    let match = fixtures[index];

    let min =
        Math.floor(match.timer / 60);

    let sec =
        match.timer % 60;

    let el = document.getElementById(`timer${index}`);

    if (el) {
        el.innerText =
            `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
}

/* PAUSE */

function pauseTimer(index) {

    fixtures[index].running = false;

}

/* RESUME */

function resumeTimer(index) {

    if (fixtures[index].breakActive) {
        alert("⏳ A break is running — wait or skip it first");
        return;
    }

    fixtures[index].running = true;

}

/* ===================== BREAK / TIMEOUT COUNTDOWN SYSTEM ===================== */
/* Used for Half-Time Break, Team Timeouts, and Official Timeouts — every break  */
/* shows a live countdown, and can also be stopped manually before it ends.      */

function startBreak(index, seconds, label, nextAction) {

    let match = fixtures[index];

    clearInterval(match.breakInterval);

    match.breakActive = true;
    match.breakTimer = seconds;
    match.breakLabel = label;
    match.breakNextAction = nextAction;

    let panelEl = document.getElementById(`breakPanel${index}`);
    let labelEl = document.getElementById(`breakLabel${index}`);

    if (panelEl) panelEl.style.display = "block";
    if (labelEl) labelEl.innerText = label;

    updateBreakTimerDisplay(index);

    playBuzzer();

    match.breakInterval = setInterval(() => {

        let m = fixtures[index];

        if (m.breakTimer <= 0) {
            finishBreak(index);
            return;
        }

        m.breakTimer--;
        updateBreakTimerDisplay(index);

    }, 1000);

    saveFixtures();
}

function updateBreakTimerDisplay(index) {

    let match = fixtures[index];

    let min = Math.floor(match.breakTimer / 60);
    let sec = match.breakTimer % 60;

    let el = document.getElementById(`breakTimer${index}`);

    if (el) {
        el.innerText =
            `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
}

function finishBreak(index) {

    let match = fixtures[index];

    clearInterval(match.breakInterval);
    match.breakActive = false;

    let panelEl = document.getElementById(`breakPanel${index}`);
    if (panelEl) panelEl.style.display = "none";

    playBuzzer();

    runNextAction(index, match.breakNextAction);
}

/* MANUALLY STOP / SKIP THE CURRENT BREAK */

function stopBreakManually(index) {

    let match = fixtures[index];

    if (!match.breakActive) return;

    clearInterval(match.breakInterval);
    match.breakActive = false;

    let panelEl = document.getElementById(`breakPanel${index}`);
    if (panelEl) panelEl.style.display = "none";

    runNextAction(index, match.breakNextAction);
}

function runNextAction(index, action) {

    let match = fixtures[index];

    if (action === "half2") {

        match.half = 2;
        match.timer = match.halfDuration;

        let halfEl = document.getElementById(`half${index}`);
        if (halfEl) halfEl.innerText = "2";

        updateTimer(index);

        alert("🏆 Half-Time Over — Second Half Starting");

    } else if (action === "resume") {

        match.running = true;
    }

    saveFixtures();
}

/* TEAM TIMEOUT (30 SEC — SHOWS LIVE COUNTDOWN) */

function teamTimeout(index, team) {

    let match = fixtures[index];

    if (team === 1) {

        if (match.team1Timeout <= 0) {

            alert("❌ Team 1 Timeout Finished");
            return;
        }

        match.team1Timeout--;

    } else {

        if (match.team2Timeout <= 0) {

            alert("❌ Team 2 Timeout Finished");
            return;
        }

        match.team2Timeout--;
    }

    pauseTimer(index);

    saveFixtures();

    startBreak(index, 30, `⏱ Team ${team} Timeout`, "resume");
}

/* OFFICIAL TIMEOUT (30 SEC BREAK — UNLIMITED, COUNTS UP FROM 0) */

function officialTimeout(index) {

    let match = fixtures[index];

    pauseTimer(index);

    match.officialTimeouts = (match.officialTimeouts || 0) + 1;

    let countEl = document.getElementById(`officialTimeoutCount${index}`);
    if (countEl) countEl.innerText = `Used: ${match.officialTimeouts}`;

    saveFixtures();

    startBreak(index, 30, "🚨 Official Timeout", "resume");
}

/* ADD EXTRA TIME */

function addExtraTime(index) {

    let mins =
        Number(prompt("Enter Extra Minutes"));

    if (isNaN(mins) || mins <= 0)
        return;

    fixtures[index].timer +=
        mins * 60;

    updateTimer(index);

    alert(
        mins +
        " Minute Added"
    );
}

/* ===================== RAID TIMER (30 SECONDS) ===================== */

function startRaidTimer(index) {

    let match = fixtures[index];

    clearInterval(match.raidInterval);

    match.raidTimer = 30;
    match.raidRunning = true;

    updateRaidTimerDisplay(index);

    match.raidInterval = setInterval(() => {

        let m = fixtures[index];

        if (!m.raidRunning) return;

        if (m.raidTimer <= 0) {

            clearInterval(m.raidInterval);
            m.raidRunning = false;

            playBuzzer();

            return;
        }

        m.raidTimer--;
        updateRaidTimerDisplay(index);

    }, 1000);
}

function resetRaidTimer(index) {

    let match = fixtures[index];

    clearInterval(match.raidInterval);

    match.raidTimer = 30;
    match.raidRunning = false;

    updateRaidTimerDisplay(index);
}

function updateRaidTimerDisplay(index) {

    let match = fixtures[index];
    let sec = match.raidTimer ?? 30;

    let el = document.getElementById(`raidTimer${index}`);

    if (el) {
        el.innerText = `00:${String(sec).padStart(2, "0")}`;
    }
}

/* SUPER TACKLE */

function superTackle(index, team) {

    let match = fixtures[index];

    if (team === 1) {

        match.super1++;

        let score =
            Number(
                document.getElementById(
                    `d1${index}`
                ).innerText
            );

        document.getElementById(
            `d1${index}`
        ).innerText = score + 2;

    } else {

        match.super2++;

        let score =
            Number(
                document.getElementById(
                    `d2${index}`
                ).innerText
            );

        document.getElementById(
            `d2${index}`
        ).innerText = score + 2;
    }

    alert("🛡️ Super Tackle +2");
}

function substitutePlayer(teamName, outIndex, inIndex) {

    let team = teams.find(t => t.name === teamName);
    if (!team) return;

    let outPlayer = team.players[outIndex];
    let inPlayer = team.players[inIndex];

    if (!outPlayer || !inPlayer) {
        alert("⚠️ Select valid players for substitution");
        return;
    }

    if (outPlayer.out || inPlayer.out) {
        alert("⚠️ Cannot substitute an eliminated player");
        return;
    }

    outPlayer.onCourt = false;
    inPlayer.onCourt = true;

    saveTeams();

    alert(`🔄 Substitution Done: ${inPlayer.name} IN, ${outPlayer.name} OUT`);
}

function playerOut(matchIndex, teamNum, playerIndex) {

    let match = fixtures[matchIndex];

    let teamName = teamNum === 1 ? match.team1 : match.team2;
    let team = teams.find(t => t.name === teamName);
    let player = team.players[playerIndex];

    if (!player || player.out) return;

    player.out = true;
    player.onCourt = false;

    if (teamNum === 1) {
        match.team1OutQueue = match.team1OutQueue || [];
        match.team1OutQueue.push(player);
    } else {
        match.team2OutQueue = match.team2OutQueue || [];
        match.team2OutQueue.push(player);
    }

    saveTeams();
    saveFixtures();

    refreshPlayerLists(matchIndex, teamNum);
}

/* CARD SYSTEM (GREEN / YELLOW / RED) */

function giveCard(matchIndex, teamNum, playerIndex, type) {

    let teamName = teamNum === 1
        ? fixtures[matchIndex].team1
        : fixtures[matchIndex].team2;

    let team = teams.find(t => t.name === teamName);
    let player = team.players[playerIndex];

    if (!player) return;

    if (!player.cards) {
        player.cards = { green: 0, yellow: 0, red: 0 };
    }

    player.cards[type]++;

    let countEl = document.getElementById(
        `cards_${teamNum}_${matchIndex}_${playerIndex}`
    );

    if (countEl) {
        countEl.innerText =
            `🟩${player.cards.green} 🟨${player.cards.yellow} 🟥${player.cards.red}`;
    }

    if (type === "yellow") {

        player.suspended = true;

        let suspendEl = document.getElementById(
            `suspend_${teamNum}_${matchIndex}_${playerIndex}`
        );
        if (suspendEl) suspendEl.innerText = "⏳ Suspended (2 min)";

        setTimeout(() => {
            player.suspended = false;

            let el = document.getElementById(
                `suspend_${teamNum}_${matchIndex}_${playerIndex}`
            );
            if (el) el.innerText = "";

            saveTeams();
        }, 120000);

        alert(`🟨 Yellow Card: #${player.jnum} ${player.name} — 2 Minute Suspension`);
    }

    else if (type === "red") {
        alert(`🟥 Red Card: #${player.jnum} ${player.name} is OUT of the match`);
        playerOut(matchIndex, teamNum, playerIndex);
    }

    else {
        alert(`🟩 Green Card (Warning): #${player.jnum} ${player.name}`);
    }

    saveTeams();
}

function exportTournament() {

    const exportData = {

        version: "Kabbadi Pro v1",

        exportedAt: new Date().toLocaleString(),

        tournamentInfo:
            JSON.parse(
                localStorage.getItem(
                    "tournamentDetails"
                )
            ) || {},

        teams: teams,

        fixtures: fixtures,

        statistics: {

            totalTeams:
                teams.length,

            totalPlayers:
                teams.reduce(
                    (sum, team) =>
                        sum + team.players.length,
                    0
                ),

            totalMatches:
                fixtures.length,

            completedMatches:
                fixtures.filter(
                    m => m.status === "Completed"
                ).length,

            liveMatches:
                fixtures.filter(
                    m => m.status === "Live"
                ).length
        },

        settings: {

            maxPlayers:
                localStorage.getItem(
                    "maxPlayers"
                ),

            weightLimit:
                localStorage.getItem(
                    "weightLimit"
                ),

            theme:
                localStorage.getItem(
                    "theme"
                )
        }
    };

    const blob =
        new Blob(
            [
                JSON.stringify(
                    exportData,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        `Tournament_Backup_${Date.now()
        }.json`;

    link.click();

    URL.revokeObjectURL(
        link.href
    );

    alert(
        "🏆 Full Tournament Exported Successfully"
    );
}

loadTeams();
loadPlayers();
loadFixtures();
loadPointsTable();
loadTop4Teams();
loadAnalysis();
showhome();
loadTopPlayers();
loadMatchStatus();
loadTournamentInfo();
loadTournamentdetailes();