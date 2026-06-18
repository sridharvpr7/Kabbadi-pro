// =============================================
//  KABADDI TOURNAMENT - Frontend (sports.js)
//  MySQL Backend Version
// =============================================

const API = "kabbadi-pro-production.up.railway.app"; // 🔁 Change this to your server URL

let editMode = false;
let editTeamIndex = null;
let editPlayerIndex = null;
let teams = [];
let currentTeam = null;
let fixtures = [];
let settings = {};

async function apiGet(path) {
    const res = await fetch(API + path);
    return res.json();
}

async function apiPost(path, data) {
    const res = await fetch(API + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiPut(path, data) {
    const res = await fetch(API + path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiDelete(path) {
    const res = await fetch(API + path, { method: "DELETE" });
    return res.json();
}

async function initApp() {
    showLoading(true);
    try {
        const [teamsData, fixturesData, settingsData] = await Promise.all([
            apiGet("/api/teams"),
            apiGet("/api/fixtures"),
            apiGet("/api/settings")
        ]);
        teams = teamsData;
        fixtures = fixturesData;
        settings = settingsData;

        loadTeams();
        loadPlayers();
        loadFixtures();
        loadPointsTable();
        loadTop4Teams();
        loadAnalysis();
        loadTopPlayers();
        loadMatchStatus();
        showhome();
        loadStatsBox();
    } catch (err) {
        alert("❌ Cannot connect to server. Check your API URL in sports.js");
        console.error(err);
    }
    showLoading(false);
}

function showLoading(show) {
    let el = document.getElementById("loadingOverlay");
    if (el) el.style.display = show ? "flex" : "none";
}

function getSetting(key) {
    return settings[key] || null;
}

async function setSetting(key, value) {
    settings[key] = value;
    await apiPost("/api/settings", { key, value });
}

async function resetMatch() {
    if (!confirm("Delete ALL data?")) return;

    await apiDelete("/api/reset");

    teams = [];
    fixtures = [];
    settings = {};

    document.getElementById("teamlist").innerHTML = "";
    document.getElementById("playerTable").innerHTML = "";
    document.getElementById("fixtureList").innerHTML = "";
    document.getElementById("pointsBody").innerHTML = "";

    document.querySelectorAll(".dashcard p")[0].innerText = "0";
    document.querySelectorAll(".dashcard p")[1].innerText = "0";
    document.querySelectorAll(".dashcard p")[2].innerText = "0";

    document.querySelector(".winner").innerText = "";

    document.getElementById("topRaiderName").innerText = "-";
    document.getElementById("topDefenderName").innerText = "-";
    document.getElementById("topAllRounderName").innerText = "-";
    document.getElementById("fileName").innerText = "-";

    document.getElementById("allmatch").innerHTML = "";
    document.querySelector(".box1").innerHTML = "";
    document.querySelector(".box2").innerHTML = "";
    document.querySelector(".box3").innerHTML = "";

    alert("FULL RESET DONE 🔥");
}

function showFileName(event){
    const file = event.target.files[0];
    if(file){
        document.getElementById("fileName").innerText = file.name;
        importTournament(event);
    }
}

function closeall() {
    document.querySelector(".body1").style.display = "none";
    document.getElementById("team").style.display = "none";
    document.getElementById("players").style.display = "none";
    document.getElementById("point").style.display = "none";
    document.getElementById("fixtures").style.display = "none";
    document.getElementById("analysis").style.display = "none";
}

function showhome() { 
    closeall();
    document.querySelector(".body1").style.display = "block"; 
}

function showteam() { 
    closeall(); 
    document.getElementById("team").style.display = "block"; 
}

function showplayers() { 
    closeall(); 
    document.getElementById("players").style.display = "block"; 
}

function showpoint() {
    closeall(); 
    document.getElementById("point").style.display = "block"; 
}

function showfixtures() { 
    closeall(); 
    document.getElementById("fixtures").style.display = "block"; 
}

function showanalysis() {
    closeall();
    document.getElementById("analysis").style.display = "block";
    loadAnalysis();
}

async function addTeam() {
    let teamname = document.getElementById("teamname").value.trim();

    if (teamname === "") { alert("Enter Team Name"); return; }

    if (teams.some(t => t.name.toLowerCase() === teamname.toLowerCase())) {
        alert("Team already exists");
        return;
    }

    showLoading(true);
    const newTeam = await apiPost("/api/teams", { name: teamname });
    teams.push({ id: newTeam.id, name: teamname, players: [] });
    document.getElementById("teamname").value = "";
    loadTeams();
    showLoading(false);
}

async function deleteTeam(index) {
    if (!confirm("Delete this team?")) return;

    const teamId = teams[index].id;
    const teamName = teams[index].name;

    fixtures = fixtures.filter(f => f.team1 !== teamName && f.team2 !== teamName);
    await apiPost("/api/fixtures/replace", { fixtures });

    await apiDelete(`/api/teams/${teamId}`);
    teams.splice(index, 1);

    loadTeams();
    loadPlayers();
}

function loadTeams() {
    let teamlist = document.getElementById("teamlist");
    teamlist.innerHTML = "";

    teams.forEach((team, index) => {
        let borderColor = team.players.length === 0 ? "red" : team.players.length < 7 ? "blue" : "green";
        let maxPlayers = getSetting("maxPlayers") || 12;

        teamlist.innerHTML += `
        <div class="teamcard" style="border-left:8px solid ${borderColor}; padding-left:10px;">
            <div class="pcount">
                ${team.players.length >= 7
                    ? `<p style="color:${borderColor};font-weight:bold;">✅ Min Players Reached</p>`
                    : `<p style="color:${borderColor};font-weight:bold;">Need ${7 - team.players.length} More Players<br>to reach min</p>`
                }
            </div>
            <h3 style="width:100px;">${team.name}</h3>
            <p>Players : ${team.players.length} / ${maxPlayers}</p>
            <div style="display:flex; justify-content:space-between;">
                <button onclick="deleteTeam(${index})">Delete</button>
                <button class="teammanage" onclick="openTeamManagement(${index})">Add teammate</button>
            </div>
        </div>`;
    });

    loadStatsBox();
    document.querySelectorAll(".dashcard p")[0].innerText = teams.length;
}

function openTeamManagement(index) {
    currentTeam = index;
    document.getElementById("selectedTeamName").innerText = teams[index].name;
    document.getElementById("teammanagement").style.display = "block";
}

function closeteammanagement() {
    document.getElementById("teammanagement").style.display = "none";
    editMode = false;
    editTeamIndex = null;
    editPlayerIndex = null;
    clearForm();
}

async function submitform() {
    let maxPlayers = Number(getSetting("maxPlayers")) || 12;

    if (!editMode && teams[currentTeam].players.length >= maxPlayers) {
        alert(`Maximum ${maxPlayers} players allowed`);
        return;
    }

    let playerName = document.getElementById("playername").value.trim();
    let age        = document.getElementById("age").value;
    let jnum       = document.getElementById("jnum").value.trim();

    if (playerName === "") { alert("Enter Player Name"); return; }
    if (jnum === "")       { alert("Enter a jersey number"); return; }

    let jerseyExists = teams[currentTeam].players.some((p, i) => {
        if (editMode && editTeamIndex === currentTeam && i === editPlayerIndex) return false;
        return p.jnum === jnum;
    });
    if (jerseyExists) { alert("Jersey Number Already Exists"); return; }

    let dob     = document.getElementById("dob").value;
    let height  = document.getElementById("height").value;
    let weight  = Number(document.getElementById("weight").value);
    let contact = document.getElementById("contact").value;

    if (!weight)               { alert("Enter a player weight in kg"); return; }
    if (contact.length !== 10) { alert("Enter Valid Mobile Number"); return; }

    let position = document.getElementById("position").value;
    if (position === "") { alert("Select a player position"); return; }

    let place       = document.getElementById("place").value;
    let captain     = document.getElementById("captain").checked;
    let vicecaptain = document.getElementById("vicecaptain").checked;

    let limitStr = getSetting("weightLimit") || "0";
    let limit    = Number(limitStr.replace(" Kg", "")) || 0;

    if (limit > 0 && weight > limit) {
        alert(`❌ Weight Limit Exceeded!\n\nPlayer Weight : ${weight} Kg\nAllowed Weight : ${limit} Kg`);
        return;
    }

    let oldPlayer = editMode ? teams[editTeamIndex].players[editPlayerIndex] : null;

    let playerData = {
        name: playerName, jnum, age, dob, height, weight,
        contact, position, place, captain, vicecaptain,
        raidPoints:    oldPlayer?.raidPoints    || 0,
        defencePoints: oldPlayer?.defencePoints || 0,
        totalPoints:   oldPlayer?.totalPoints   || 0
    };

    showLoading(true);

    if (editMode) {
        teams[editTeamIndex].players[editPlayerIndex] = playerData;
        await apiPut(`/api/teams/${teams[editTeamIndex].id}`, { players: teams[editTeamIndex].players });
        editMode        = false;
        editTeamIndex   = null;
        editPlayerIndex = null;
    } else {
        teams[currentTeam].players.push(playerData);
        await apiPut(`/api/teams/${teams[currentTeam].id}`, { players: teams[currentTeam].players });
    }

    loadTeams();
    loadPlayers();
    clearForm();
    closeteammanagement();
    showLoading(false);
    alert("✅ Player Saved Successfully");
}

function loadPlayers() {
    let totalPlayers = 0;
    teams.forEach(team => totalPlayers += team.players.length);
    document.querySelectorAll(".dashcard p")[1].innerText = totalPlayers;

    let playerTable = document.getElementById("playerTable");
    playerTable.innerHTML = "";

    teams.forEach((team, teamIndex) => {
        playerTable.innerHTML += `
        <h2 style="color:white; padding:10px; font-size:30px;">${team.name}</h2>
        <table border="1" width="100%" style="width:98%; margin-left:1%;">
            <tr>
                <th>S.No</th><th>Name</th><th>Jersey</th><th>Age</th><th>Dob</th>
                <th>Height</th><th>Weight</th><th>Contact</th><th>Position</th>
                <th>Place</th><th>Captain</th><th>Vice Captain</th><th>Actions</th>
            </tr>
            ${team.players.map((player, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${player.name}</td><td>${player.jnum}</td>
                    <td>${player.age}</td><td>${player.dob}</td>
                    <td>${player.height}</td><td>${player.weight}</td>
                    <td>${player.contact}</td><td>${player.position}</td>
                    <td>${player.place}</td>
                    <td>${player.captain ? "✅" : "❌"}</td>
                    <td>${player.vicecaptain ? "✅" : "❌"}</td>
                    <td>
                        <button onclick="editPlayer(${teamIndex},${index}); showteam();" class="jsbtn" style="background-color:rgb(46,46,255);">Edit</button>
                        <button onclick="deletePlayer(${teamIndex},${index})" class="jsbtn" style="background-color:red;">Delete</button>
                    </td>
                </tr>
            `).join("")}
        </table><br><br>`;
    });
}

function editPlayer(teamIndex, playerIndex) {
    currentTeam = teamIndex;
    document.getElementById("selectedTeamName").innerText = teams[teamIndex].name;

    let player = teams[teamIndex].players[playerIndex];
    document.getElementById("playername").value    = player.name;
    document.getElementById("jnum").value          = player.jnum;
    document.getElementById("age").value           = player.age;
    document.getElementById("dob").value           = player.dob;
    document.getElementById("height").value        = player.height;
    document.getElementById("weight").value        = player.weight;
    document.getElementById("contact").value       = player.contact;
    document.getElementById("position").value      = player.position;
    document.getElementById("place").value         = player.place;
    document.getElementById("captain").checked     = player.captain;
    document.getElementById("vicecaptain").checked = player.vicecaptain;

    document.querySelector(".submitbtn").innerText = "Update Player";
    editMode        = true;
    editTeamIndex   = teamIndex;
    editPlayerIndex = playerIndex;
    document.getElementById("teammanagement").style.display = "block";
}

function clearForm() {
    document.getElementById("playername").value       = "";
    document.getElementById("jnum").value             = "";
    document.getElementById("age").value              = "";
    document.getElementById("dob").value              = "";
    document.getElementById("height").value           = "";
    document.getElementById("weight").value           = "";
    document.getElementById("contact").value          = "";
    document.getElementById("position").selectedIndex = 0;
    document.getElementById("place").selectedIndex    = 0;
    document.getElementById("captain").checked        = false;
    document.getElementById("vicecaptain").checked    = false;
    document.querySelector(".submitbtn").innerText    = "Save Player";
}

async function deletePlayer(teamIndex, playerIndex) {
    if (!confirm("Delete this player?")) return;

    teams[teamIndex].players.splice(playerIndex, 1);
    showLoading(true);
    await apiPut(`/api/teams/${teams[teamIndex].id}`, { players: teams[teamIndex].players });
    loadTeams();
    loadPlayers();
    showLoading(false);
}

async function generateFixtures() {
    let type = document.getElementById("fixtureType").value;

    if (type === "")      { alert("Select Tournament Format"); return; }
    if (teams.length < 2) { alert("Minimum 2 teams required"); return; }

    fixtures = [];

    if (type === "roundrobin") {
        let teamNames = teams.map(t => t.name);
        if (teamNames.length % 2 !== 0) teamNames.push("BYE");

        let totalRounds = teamNames.length - 1;
        let half        = teamNames.length / 2;

        for (let round = 0; round < totalRounds; round++) {
            for (let i = 0; i < half; i++) {
                let team1 = teamNames[i];
                let team2 = teamNames[teamNames.length - 1 - i];
                if (team1 !== "BYE" && team2 !== "BYE") {
                    fixtures.push({ round: round + 1, team1, team2, score1: "", score2: "", status: "Upcoming" });
                }
            }
            let fixed = teamNames[0];
            let rest  = teamNames.slice(1);
            rest.unshift(rest.pop());
            teamNames = [fixed, ...rest];
        }
    } else if (type === "knockout") {
        let shuffled = [...teams].sort(() => Math.random() - 0.5);
        let round    = 1;
        for (let i = 0; i < shuffled.length; i += 2) {
            fixtures.push({
                round:  "Knockout Round " + round,
                team1:  shuffled[i]?.name    || "BYE",
                team2:  shuffled[i + 1]?.name || "BYE",
                score1: "", score2: "", status: "Upcoming", knockout: true
            });
            round++;
        }
    }

    showLoading(true);
    await apiPost("/api/fixtures/replace", { fixtures });
    fixtures = await apiGet("/api/fixtures");

    loadFixtures();
    loadMatchStatus();
    loadTournamentInfo();
    document.querySelectorAll(".dashcard p")[2].innerText = fixtures.length;
    showLoading(false);
    alert(type.toUpperCase() + " Fixtures Generated ✅");
}

function loadFixtures() {
    let fixtureList  = document.getElementById("fixtureList");
    fixtureList.innerHTML = "";
    let currentRound = null;

    fixtures.forEach((match, index) => {
        if (match.round !== currentRound) {
            currentRound = match.round;
            fixtureList.innerHTML += `
            <h2 style="color:white;padding:15px;margin-top:20px;background:#222;border-left:5px solid orange;">
                ROUND ${currentRound}
            </h2>`;
        }

        fixtureList.innerHTML += `
        <div class="fixture-card">
            <h3>${match.team1} VS ${match.team2}</h3>
            <p>Status : ${match.status}</p>
            <div id="coin${index}">🪙</div>
            <button onclick="coinToss(${index})" style="background:orange;height:35px;width:90px;">Coin Toss</button>
            <h4 id="tossResult${index}">Toss result</h4>
            <p>Score : ${match.score1} - ${match.score2}</p>
            ${match.status === "Completed"
                ? `<button style="background:blue" onclick="reopenMatch(${index})">Reopen Match</button>`
                : `<button onclick="startMatch(${index})">Start Match</button>`
            }
            <div id="matchPanel${index}"></div>
        </div>`;
    });

    loadStatsBox();
}

function coinToss(index) {
    let coin   = document.getElementById(`coin${index}`);
    let result = document.getElementById(`tossResult${index}`);
    coin.style.transition = "none";
    coin.style.transform  = "rotateY(0deg)";
    setTimeout(() => {
        coin.style.transition = "transform 2s";
        coin.style.transform  = "rotateY(1800deg)";
    }, 50);
    result.innerText = "Tossing...";
    setTimeout(() => {
        result.innerText = Math.random() < 0.5 ? "HEADS" : "TAILS";
    }, 2000);
}

function startMatch(index) {
    let team1Obj = teams.find(t => t.name === fixtures[index].team1);
    let team2Obj = teams.find(t => t.name === fixtures[index].team2);

    if (!team1Obj || !team2Obj)              { alert("Team data not found!"); return; }
    if (fixtures[index].status === "Completed") { alert("Match already finished!"); return; }

    fixtures[index].status = "Live";
    loadMatchStatus();

    let panel = document.getElementById(`matchPanel${index}`);
    panel.innerHTML = `
    <hr>
    <div style="text-align:right; margin-bottom:10px;">
        <button style="background:pink;color:red;font-size:15px;width:50px;" onclick="closeMatchPanel(${index})">❌</button>
    </div>
    <h3>${fixtures[index].team1}
        <button style="margin-left:200px;background:red;" onclick="clearinsideform1(${index})">clear</button>
    </h3>
    <div style="position:relative;">
        <div class="scorebox">
            <div class="scoretitle">
                <p>Raid:</p>
                <button onclick="changeScore(${index},'r1',-1)">-</button>
                <p id="r1${index}" style="margin-left:10px;">0</p>
                <button onclick="changeScore(${index},'r1',1)">+</button>
            </div><br><br>
            <div class="scoretitle">
                <p>Defence:</p>
                <button onclick="changeScore(${index},'d1',-1)">-</button>
                <p id="d1${index}" style="margin-left:10px;">0</p>
                <button onclick="changeScore(${index},'d1',1)">+</button>
            </div><br><br>
            <div class="scoretitle">
                <p>Allout(+2):</p>
                <button onclick="changeBonus(${index},'a1',-1)">-</button>
                <p id="a1${index}" style="margin-left:10px;">0</p>
                <button onclick="changeBonus(${index},'a1',1)">+</button>
            </div><br><br>
            <div class="scoretitle">
                <p>Extra:</p>
                <button onclick="changeScore(${index},'e1',-1)">-</button>
                <p id="e1${index}" style="margin-left:10px;">0</p>
                <button onclick="changeScore(${index},'e1',1)">+</button>
            </div>
        </div>
        <div class="player-list1">
            <h4>Raiders</h4>
            ${team1Obj.players.map((player, playerIndex) => {
                if (player.position !== "raider") return "";
                return `<div class="rbody">
                    <p>#${player.jnum} ${player.name}</p>
                    <button onclick="playerRaid(${index},1,${playerIndex})">+</button>
                    <button onclick="playerRaidMinus(${index},1,${playerIndex})">-</button><br>
                    Total:<span id="raid_1_${index}_${playerIndex}" style="margin-left:90px;">${player.raidPoints}</span>
                </div>`;
            }).join("")}
        </div>
        <div class="player-list1" style="left:800px;">
            <h4>Defenders</h4>
            ${team1Obj.players.map((player, playerIndex) => {
                if (player.position !== "defender") return "";
                return `<div class="dbody">
                    <p>#${player.jnum} ${player.name}</p>
                    <button onclick="playerDefence(${index},1,${playerIndex})">+</button>
                    <button onclick="playerDefenceMinus(${index},1,${playerIndex})">-</button><br>
                    Total:<span id="def_1_${index}_${playerIndex}" style="margin-left:90px;">${player.defencePoints}</span>
                </div>`;
            }).join("")}
        </div>
        <div class="player-list1" style="left:1200px;">
            <h4>All Rounders</h4>
            ${team1Obj.players.map((player, playerIndex) => {
                if (player.position !== "allrounder") return "";
                return `<div class="arbody">
                    <p>#${player.jnum} ${player.name}</p>
                    <button onclick="playerRaid(${index},1,${playerIndex})">R+</button>
                    <button onclick="playerRaidMinus(${index},1,${playerIndex})">R-</button>
                    <button onclick="playerDefence(${index},1,${playerIndex})">D+</button>
                    <button onclick="playerDefenceMinus(${index},1,${playerIndex})">D-</button><br>
                    Raid:<span id="raid_1_${index}_${playerIndex}" style="margin-left:120px;">${player.raidPoints}</span> |
                    Def:<span id="def_1_${index}_${playerIndex}">${player.defencePoints}</span>
                </div>`;
            }).join("")}
        </div>
    </div>
    <hr>
    <h3>${fixtures[index].team2}
        <button style="margin-left:200px;background:red;" onclick="clearinsideform2(${index})">clear</button>
    </h3>
    <div style="position:relative;">
        <div class="scorebox">
            <div class="scoretitle">
                <p>Raid:</p>
                <button onclick="changeScore(${index},'r2',-1)">-</button>
                <p id="r2${index}" style="margin-left:10px;">0</p>
                <button onclick="changeScore(${index},'r2',1)">+</button>
            </div><br><br>
            <div class="scoretitle">
                <p>Defence:</p>
                <button onclick="changeScore(${index},'d2',-1)">-</button>
                <p id="d2${index}" style="margin-left:10px;">0</p>
                <button onclick="changeScore(${index},'d2',1)">+</button>
            </div><br><br>
            <div class="scoretitle">
                <p>Allout(+2):</p>
                <button onclick="changeBonus(${index},'a2',-1)">-</button>
                <p id="a2${index}" style="margin-left:10px;">0</p>
                <button onclick="changeBonus(${index},'a2',1)">+</button>
            </div><br><br>
            <div class="scoretitle">
                <p>Extra:</p>
                <button onclick="changeScore(${index},'e2',-1)">-</button>
                <p id="e2${index}" style="margin-left:10px;">0</p>
                <button onclick="changeScore(${index},'e2',1)">+</button>
            </div>
        </div>
        <div class="player-list2">
            <h4>Raiders</h4>
            ${team2Obj.players.map((player, playerIndex) => {
                if (player.position !== "raider") return "";
                return `<div class="rbody">
                    #${player.jnum} ${player.name}<br>
                    <button onclick="playerRaid(${index},2,${playerIndex})">+</button>
                    <button onclick="playerRaidMinus(${index},2,${playerIndex})">-</button><br>
                    Total:<span id="raid_2_${index}_${playerIndex}" style="margin-left:90px;">${player.raidPoints}</span>
                </div>`;
            }).join("")}
        </div>
        <div class="player-list2" style="left:800px;">
            <h4>Defenders</h4>
            ${team2Obj.players.map((player, playerIndex) => {
                if (player.position !== "defender") return "";
                return `<div class="dbody">
                    #${player.jnum} ${player.name}<br>
                    <button onclick="playerDefence(${index},2,${playerIndex})">+</button>
                    <button onclick="playerDefenceMinus(${index},2,${playerIndex})">-</button><br>
                    Total:<span id="def_2_${index}_${playerIndex}" style="margin-left:90px;">${player.defencePoints}</span>
                </div>`;
            }).join("")}
        </div>
        <div class="player-list2" style="left:1200px;">
            <h4>All Rounders</h4>
            ${team2Obj.players.map((player, playerIndex) => {
                if (player.position !== "allrounder") return "";
                return `<div class="arbody">
                    <p>#${player.jnum} ${player.name}</p>
                    <button onclick="playerRaid(${index},2,${playerIndex})">R+</button>
                    <button onclick="playerRaidMinus(${index},2,${playerIndex})">R-</button>
                    <button onclick="playerDefence(${index},2,${playerIndex})">D+</button>
                    <button onclick="playerDefenceMinus(${index},2,${playerIndex})">D-</button><br>
                    Raid:<span id="raid_2_${index}_${playerIndex}" style="margin-left:120px;">${player.raidPoints}</span> |
                    Def:<span id="def_2_${index}_${playerIndex}">${player.defencePoints}</span>
                </div>`;
            }).join("")}
        </div>
    </div>
    <br><br>
    <button style="background:green" onclick="finishMatch(${index})">Finish Match</button>`;
}

function closeMatchPanel(index) {
    document.getElementById(`matchPanel${index}`).innerHTML = "";
}

async function clearinsideform1(index) {
    if (!confirm("Clear Team 1 Match Data?")) return;

    document.getElementById(`r1${index}`).innerText = "0";
    document.getElementById(`d1${index}`).innerText = "0";
    document.getElementById(`a1${index}`).innerText = "0";
    document.getElementById(`e1${index}`).innerText = "0";

    let team = teams.find(t => t.name === fixtures[index].team1);
    team.players.forEach(p => { p.raidPoints = 0; p.defencePoints = 0; p.totalPoints = 0; });

    await apiPut(`/api/teams/${team.id}`, { players: team.players });
    startMatch(index);
}

async function clearinsideform2(index) {
    if (!confirm("Clear Team 2 Match Data?")) return;

    document.getElementById(`r2${index}`).innerText = "0";
    document.getElementById(`d2${index}`).innerText = "0";
    document.getElementById(`a2${index}`).innerText = "0";
    document.getElementById(`e2${index}`).innerText = "0";

    let team = teams.find(t => t.name === fixtures[index].team2);
    team.players.forEach(p => { p.raidPoints = 0; p.defencePoints = 0; p.totalPoints = 0; });

    await apiPut(`/api/teams/${team.id}`, { players: team.players });
    startMatch(index);
}

function changeScore(index, type, value) {
    let el      = document.getElementById(`${type}${index}`);
    let current = Number(el.innerText) || 0;
    current    += value;
    if (current < 0) current = 0;
    el.innerText = current;
}

function changeBonus(index, type, value) {
    let el      = document.getElementById(`${type}${index}`);
    let current = Number(el.innerText) || 0;
    current    += (value * 2);
    if (current < 0) current = 0;
    el.innerText = current;
}

async function finishMatch(index) {
    let team1Score =
        (Number(document.getElementById(`r1${index}`).innerText) || 0) +
        (Number(document.getElementById(`d1${index}`).innerText) || 0) +
        (Number(document.getElementById(`a1${index}`).innerText) || 0) +
        (Number(document.getElementById(`e1${index}`).innerText) || 0);

    let team2Score =
        (Number(document.getElementById(`r2${index}`).innerText) || 0) +
        (Number(document.getElementById(`d2${index}`).innerText) || 0) +
        (Number(document.getElementById(`a2${index}`).innerText) || 0) +
        (Number(document.getElementById(`e2${index}`).innerText) || 0);

    fixtures[index].score1 = team1Score;
    fixtures[index].score2 = team2Score;
    fixtures[index].status = "Completed";

    if (team1Score === team2Score) {
        showLoading(true);
        await apiPut(`/api/fixtures/${fixtures[index].id}`, fixtures[index]);
        loadFixtures();
        loadPointsTable();
        loadMatchStatus();
        showLoading(false);
        alert("Draw Match 🤝");
        return;
    }

    let winnerTeam = team1Score > team2Score ? fixtures[index].team1 : fixtures[index].team2;
    let winnerObj  = teams.find(t => t.name === winnerTeam);
    let captain    = winnerObj?.players.find(p => p.captain);

    let password = prompt(`Winner: ${winnerTeam}\nCaptain (${captain ? captain.name : "No Captain"}) — set a password to lock this result:`);
    if (!password)           { alert("Password Required"); return; }
    if (password.length < 4) { alert("Minimum 4 characters"); return; }

    let team1Obj = teams.find(t => t.name === fixtures[index].team1);
    let team2Obj = teams.find(t => t.name === fixtures[index].team2);

    fixtures[index].team1Players   = JSON.parse(JSON.stringify(team1Obj.players));
    fixtures[index].team2Players   = JSON.parse(JSON.stringify(team2Obj.players));
    fixtures[index].secretPassword = password;

    showLoading(true);
    await apiPut(`/api/fixtures/${fixtures[index].id}`, fixtures[index]);

    loadFixtures();
    loadPointsTable();
    loadTopPlayers();
    loadMatchStatus();
    loadTop4Teams();
    loadTournamentInfo();
    loadStatsBox();
    showLoading(false);

    alert("Match Finished Successfully ✅");
}

async function reopenMatch(index) {
    if (fixtures[index].status !== "Completed") { alert("Match not finished yet"); return; }

    if (!fixtures[index].secretPassword) {
        fixtures[index].status         = "Upcoming";
        fixtures[index].score1         = "";
        fixtures[index].score2         = "";
        fixtures[index].secretPassword = "";
        showLoading(true);
        await apiPut(`/api/fixtures/${fixtures[index].id}`, fixtures[index]);
        loadFixtures();
        loadPointsTable();
        showLoading(false);
        alert("Draw Match Reopened ✅");
        return;
    }

    let enteredPassword = prompt("Enter Winner Captain Password to reopen:");
    if (!enteredPassword) return;

    if (enteredPassword !== fixtures[index].secretPassword) {
        alert("Wrong Password ❌");
        return;
    }

    fixtures[index].status         = "Upcoming";
    fixtures[index].score1         = "";
    fixtures[index].score2         = "";
    fixtures[index].team1Players   = [];
    fixtures[index].team2Players   = [];
    fixtures[index].secretPassword = "";

    let team1 = teams.find(t => t.name === fixtures[index].team1);
    let team2 = teams.find(t => t.name === fixtures[index].team2);

    team1.players.forEach(p => { p.raidPoints = 0; p.defencePoints = 0; p.totalPoints = 0; });
    team2.players.forEach(p => { p.raidPoints = 0; p.defencePoints = 0; p.totalPoints = 0; });

    showLoading(true);
    await Promise.all([
        apiPut(`/api/teams/${team1.id}`, { players: team1.players }),
        apiPut(`/api/teams/${team2.id}`, { players: team2.players }),
        apiPut(`/api/fixtures/${fixtures[index].id}`, fixtures[index])
    ]);

    loadFixtures();
    loadPointsTable();
    loadAnalysis();
    loadMatchStatus();
    loadTopPlayers();
    loadTop4Teams();
    loadTournamentInfo();
    loadStatsBox();
    showLoading(false);
    alert("Match Reopened ✅");
}

async function playerRaid(matchIndex, teamNo, playerIndex) {
    let teamName = teamNo === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let team     = teams.find(t => t.name === teamName);
    team.players[playerIndex].raidPoints++;
    team.players[playerIndex].totalPoints++;
    document.getElementById(`raid_${teamNo}_${matchIndex}_${playerIndex}`).innerText = team.players[playerIndex].raidPoints;
    await apiPut(`/api/teams/${team.id}`, { players: team.players });
    loadTopPlayers();
}

async function playerRaidMinus(matchIndex, teamNo, playerIndex) {
    let teamName = teamNo === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let team     = teams.find(t => t.name === teamName);
    if (team.players[playerIndex].raidPoints > 0) {
        team.players[playerIndex].raidPoints--;
        team.players[playerIndex].totalPoints--;
        document.getElementById(`raid_${teamNo}_${matchIndex}_${playerIndex}`).innerText = team.players[playerIndex].raidPoints;
        await apiPut(`/api/teams/${team.id}`, { players: team.players });
    }
    loadTopPlayers();
}

async function playerDefence(matchIndex, teamNo, playerIndex) {
    let teamName = teamNo === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let team     = teams.find(t => t.name === teamName);
    team.players[playerIndex].defencePoints++;
    team.players[playerIndex].totalPoints++;
    document.getElementById(`def_${teamNo}_${matchIndex}_${playerIndex}`).innerText = team.players[playerIndex].defencePoints;
    await apiPut(`/api/teams/${team.id}`, { players: team.players });
    loadTopPlayers();
}

async function playerDefenceMinus(matchIndex, teamNo, playerIndex) {
    let teamName = teamNo === 1 ? fixtures[matchIndex].team1 : fixtures[matchIndex].team2;
    let team     = teams.find(t => t.name === teamName);
    if (team.players[playerIndex].defencePoints > 0) {
        team.players[playerIndex].defencePoints--;
        team.players[playerIndex].totalPoints--;
        document.getElementById(`def_${teamNo}_${matchIndex}_${playerIndex}`).innerText = team.players[playerIndex].defencePoints;
        await apiPut(`/api/teams/${team.id}`, { players: team.players });
    }
    loadTopPlayers();
}

function loadPointsTable() {
    let points = {};
    teams.forEach(team => {
        points[team.name] = { team: team.name, played: 0, won: 0, lost: 0, draw: 0, pts: 0 };
    });

    fixtures.forEach(match => {
        if (match.status !== "Completed") return;
        let t1 = points[match.team1];
        let t2 = points[match.team2];
        if (!t1 || !t2) return;
        t1.played++; t2.played++;
        if (match.score1 > match.score2)     { t1.won++; t1.pts += 5; t2.lost++; }
        else if (match.score2 > match.score1) { t2.won++; t2.pts += 5; t1.lost++; }
        else                                  { t1.draw++; t2.draw++; t1.pts += 3; t2.pts += 3; }
    });

    let standings = Object.values(points).sort((a, b) => b.pts - a.pts);
    let tbody     = document.getElementById("pointsBody");
    tbody.innerHTML = "";

    standings.forEach((team, index) => {
        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${team.team}</td>
            <td style="color:blue;">${team.played}</td>
            <td style="color:green;">${team.won}</td>
            <td style="color:red;">${team.lost}</td>
            <td style="color:rgb(66,66,66);">${team.draw}</td>
            <td style="color:black;">${team.pts}</td>
        </tr>`;
    });

    if (standings.length > 0) document.querySelector(".winner").innerText = standings[0].team;
    loadTop4Teams();
    loadStatsBox();
}

function loadAnalysis() {
    let analysis = document.getElementById("analysisContainer");
    analysis.innerHTML = "";

    fixtures.forEach(match => {
        if (match.status !== "Completed") return;

        let winner     = "Draw";
        let allPlayers = [...(match.team1Players || []), ...(match.team2Players || [])];

        if (!allPlayers.length) return;

        let topRaider   = allPlayers.reduce((best, p) => (p.raidPoints    || 0) > (best.raidPoints    || 0) ? p : best, allPlayers[0]);
        let topDefender = allPlayers.reduce((best, p) => (p.defencePoints || 0) > (best.defencePoints || 0) ? p : best, allPlayers[0]);

        if (match.score1 > match.score2)     winner = match.team1;
        else if (match.score2 > match.score1) winner = match.team2;

        analysis.innerHTML += `
        <div class="analysistitlecard">
            <div>
                <h2>${match.team1} VS ${match.team2}</h2>
                <p style="font-size:20px;font-weight:bold;">📊 ${match.score1} - ${match.score2}</p>
                <p style="color:green;font-size:18px;">🏆 Winner : ${winner}</p>
            </div>
            <div class="topplayers">
                <h3 class="topplayer1">🔥 Top Raider : ${topRaider?.name || "-"} #${topRaider?.jnum || "-"} (${topRaider?.raidPoints || 0} Raid Points)</h3>
                <h3 class="topplayer2">🛡️ Top Defender : ${topDefender?.name || "-"} #${topDefender?.jnum || "-"} (${topDefender?.defencePoints || 0} Defence Points)</h3>
            </div>
        </div>
        <div class="analysisshow">
            <div>
                <h3>Raiders</h3>
                ${allPlayers.filter(p => p.position === "raider")
                    .map(p => `<p>#${p.jnum} --- ${p.name} - Total:${p.totalPoints || 0}</p>`).join("")}
            </div>
            <div>
                <h3>Defenders</h3>
                ${allPlayers.filter(p => p.position === "defender")
                    .map(p => `<p>#${p.jnum} --- ${p.name} - Total:${p.totalPoints || 0}</p>`).join("")}
            </div>
            <div>
                <h3>All Rounders</h3>
                ${allPlayers.filter(p => p.position === "allrounder")
                    .map(p => `<p>#${p.jnum} --- ${p.name} - Raid:${p.raidPoints || 0} - Defence:${p.defencePoints || 0} - Total:${p.totalPoints || 0}</p>`).join("")}
            </div>
        </div>`;
    });
}

function loadTopPlayers() {
    let allPlayers = [];
    teams.forEach(team => allPlayers.push(...team.players));

    if (allPlayers.length === 0) {
        document.getElementById("topRaiderName").innerText     = "-";
        document.getElementById("topDefenderName").innerText   = "-";
        document.getElementById("topAllRounderName").innerText = "-";
        return;
    }

    let topRaider     = allPlayers.reduce((a, b) => (a.raidPoints    || 0) > (b.raidPoints    || 0) ? a : b);
    let topDefender   = allPlayers.reduce((a, b) => (a.defencePoints || 0) > (b.defencePoints || 0) ? a : b);
    let topAllRounder = allPlayers.reduce((a, b) => (a.totalPoints   || 0) > (b.totalPoints   || 0) ? a : b);

    document.getElementById("topRaiderName").innerHTML     = `${topRaider.name}<br><br>${topRaider.raidPoints || 0} Raid Pts`;
    document.getElementById("topDefenderName").innerHTML   = `${topDefender.name}<br><br>${topDefender.defencePoints || 0} Defence Pts`;
    document.getElementById("topAllRounderName").innerHTML = `${topAllRounder.name}<br><br>${topAllRounder.totalPoints || 0} Total Pts`;
}

function loadMatchStatus() {
    let fixtureList = document.getElementById("allmatch");
    fixtureList.innerHTML = "";

    fixtures.forEach(match => {
        fixtureList.innerHTML += `
        <div class="alllmatch">
            <h5>${match.team1} 🆚 ${match.team2}</h5>
            <h4>Status : ${match.status}</h4>
            <h4>Score : ${match.score1} - ${match.score2}</h4>
        </div>`;
    });
}

function loadTop4Teams() {
    let points = {};
    teams.forEach(team => {
        points[team.name] = { team: team.name, played: 0, won: 0, lost: 0, draw: 0, pts: 0 };
    });

    fixtures.forEach(match => {
        if (match.status !== "Completed") return;
        let t1 = points[match.team1];
        let t2 = points[match.team2];
        if (!t1 || !t2) return;
        t1.played++; t2.played++;
        if (match.score1 > match.score2)     { t1.won++; t1.pts += 5; t2.lost++; }
        else if (match.score2 > match.score1) { t2.won++; t2.pts += 5; t1.lost++; }
        else                                  { t1.draw++; t2.draw++; t1.pts += 3; t2.pts += 3; }
    });

    let standings = Object.values(points).sort((a, b) => b.pts - a.pts).slice(0, 4);

    document.querySelector(".box1").innerHTML = `
        <h2 style="text-align:center;padding:10px;">🏆 TOP 4 TEAMS</h2>
        <table style="width:100%;border-collapse:collapse;text-align:center;">
            <tr><th>Rank</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>D</th><th>Pts</th></tr>
            ${standings.map((team, index) => `
                <tr>
                    <td>${index + 1}</td><td>${team.team}</td>
                    <td>${team.played}</td>
                    <td style="color:green;">${team.won}</td>
                    <td style="color:red;">${team.lost}</td>
                    <td>${team.draw}</td>
                    <td><b>${team.pts}</b></td>
                </tr>
            `).join("")}
        </table>`;

    loadTournamentInfo();
}

function loadTournamentInfo() {
    let tournamentName = getSetting("tournamentName") || "";
    let organizerName  = getSetting("organizerName")  || "";
    let venue          = getSetting("venue")           || "";
    let startDate      = getSetting("startDate")       || "";
    let weightLimit    = getSetting("weightLimit")     || 0;

    let completedMatches = fixtures.filter(m => m.status === "Completed").length;
    let totalMatches     = fixtures.length;
    let percentage       = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

    document.querySelector(".box2").innerHTML = `
        <h2 style="text-align:center;padding:10px;color:#2563eb;">🏆 Tournament Info</h2>
        <div style="padding:15px;">
            <div class="infoinput">
                <input type="text"   id="inputTournamentName" placeholder="Tournament Name" value="${tournamentName}" style="font-size:15px;">
                <input type="text"   id="inputOrganizerName"  placeholder="Organizer Name"  value="${organizerName}"  style="font-size:15px;">
                <input type="text"   id="inputVenue"          placeholder="Venue"            value="${venue}"          style="font-size:15px;">
                <input type="date"   id="inputStartDate"      value="${startDate}"            style="font-size:15px;">
                <input type="number" id="inputWeightLimit"    placeholder="Weight Limit (Kg)" style="font-size:15px;"><br>
                <button onclick="saveTournamentSettings()">Save Tournament</button>
            </div>
            <p><b>Tournament :</b><br>${tournamentName}</p><br>
            <p><b>Organizer :</b><br>${organizerName}</p><br>
            <p><b>Venue :</b><br>${venue}</p><br>
            <p><b>Weight Limit :</b><br>${weightLimit}</p><br>
            <p><b>Completed :</b><br>${completedMatches}/${totalMatches}</p><br>
            <p><b>Progress :</b></p>
            <div style="width:100%;height:25px;background:#ddd;border-radius:20px;overflow:hidden;">
                <div style="width:${percentage}%;height:100%;background:green;color:white;text-align:center;line-height:25px;">
                    ${percentage}%
                </div>
            </div>
        </div>`;
}

async function saveTournamentSettings() {
    let tname     = document.getElementById("inputTournamentName").value.trim();
    let organizer = document.getElementById("inputOrganizerName").value.trim();
    let venue     = document.getElementById("inputVenue").value.trim();
    let date      = document.getElementById("inputStartDate").value;
    let weight    = document.getElementById("inputWeightLimit").value;

    showLoading(true);
    await Promise.all([
        setSetting("tournamentName", tname),
        setSetting("organizerName",  organizer),
        setSetting("venue",          venue),
        setSetting("startDate",      date),
        setSetting("weightLimit",    weight ? weight + " Kg" : "0")
    ]);
    loadTournamentInfo();
    showLoading(false);
    alert("Tournament Settings Saved ✅");
}

function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    const btn = document.getElementById("themeBtn");
    if (document.body.classList.contains("dark-theme")) {
        btn.innerText = "☀️ Light Mode";
        localStorage.setItem("darkTheme", "true");
    } else {
        btn.innerText = "🌙 Dark Mode";
        localStorage.setItem("darkTheme", "false");
    }
}

if (localStorage.getItem("darkTheme") === "true") {
    document.body.classList.add("dark-theme");
}

function loadStatsBox() {
    let allPlayers = [];
    teams.forEach(team => {
        team.players.forEach(player => {
            allPlayers.push({ ...player, team: team.name });
        });
    });

    let topRaiders     = [...allPlayers].sort((a, b) => (b.raidPoints    || 0) - (a.raidPoints    || 0)).slice(0, 3);
    let topDefenders   = [...allPlayers].sort((a, b) => (b.defencePoints || 0) - (a.defencePoints || 0)).slice(0, 3);
    let topAllRounders = [...allPlayers].sort((a, b) => (b.totalPoints   || 0) - (a.totalPoints   || 0)).slice(0, 3);

    let completedMatches = fixtures.filter(f => f.status === "Completed");

    let highestMatch = null;
    let lowestMatch  = null;

    if (completedMatches.length) {
        highestMatch = completedMatches.reduce((a, b) =>
            (Number(a.score1) + Number(a.score2)) > (Number(b.score1) + Number(b.score2)) ? a : b);
        lowestMatch = completedMatches.reduce((a, b) =>
            (Number(a.score1) + Number(a.score2)) < (Number(b.score1) + Number(b.score2)) ? a : b);
    }

    let teamStats = {};
    teams.forEach(team => {
        teamStats[team.name] = { total: 0, matches: 0, wins: 0, losses: 0, draws: 0 };
    });

    completedMatches.forEach(match => {
        if (!teamStats[match.team1] || !teamStats[match.team2]) return;
        teamStats[match.team1].total   += Number(match.score1);
        teamStats[match.team1].matches++;
        teamStats[match.team2].total   += Number(match.score2);
        teamStats[match.team2].matches++;

        if (match.score1 > match.score2)     { teamStats[match.team1].wins++;  teamStats[match.team2].losses++; }
        else if (match.score2 > match.score1) { teamStats[match.team2].wins++;  teamStats[match.team1].losses++; }
        else                                  { teamStats[match.team1].draws++; teamStats[match.team2].draws++;  }
    });

    let averages = [], totals = [], wins = [], losses = [], draws = [];
    Object.keys(teamStats).forEach(team => {
        let avg = teamStats[team].matches ? (teamStats[team].total / teamStats[team].matches) : 0;
        averages.push({ team, avg: avg.toFixed(1) });
        totals.push({  team, total: teamStats[team].total });
        wins.push({    team, value: teamStats[team].wins });
        losses.push({  team, value: teamStats[team].losses });
        draws.push({   team, value: teamStats[team].draws });
    });

    let highestTeam = [...totals].sort((a, b) => b.total - a.total)[0];
    let lowestTeam  = [...totals].sort((a, b) => a.total - b.total)[0];
    let mostWins    = [...wins].sort((a, b) => b.value - a.value)[0];
    let mostLosses  = [...losses].sort((a, b) => b.value - a.value)[0];
    let mostDraws   = [...draws].sort((a, b) => b.value - a.value)[0];

    let tournamentAverage = 0;
    if (completedMatches.length) {
        let totalScore = completedMatches.reduce((sum, m) => sum + Number(m.score1) + Number(m.score2), 0);
        tournamentAverage = (totalScore / (completedMatches.length * 2)).toFixed(1);
    }

    document.querySelector(".box3").innerHTML = `
    <h2 style="text-align:center;padding:10px;">📈 TOURNAMENT RECORDS</h2>
    <div class="matchsum" style="padding:15px;line-height:1.8;">
        <h3>🔥 Top 3 Raiders</h3>
        ${topRaiders.map((p, i) => `<p>${i + 1}. ${p.name} (${p.raidPoints || 0})</p>`).join("")}

        <h3>🛡️ Top 3 Defenders</h3>
        ${topDefenders.map((p, i) => `<p>${i + 1}. ${p.name} (${p.defencePoints || 0})</p>`).join("")}

        <h3>⭐ Top 3 All-Rounders</h3>
        ${topAllRounders.map((p, i) => `<p>${i + 1}. ${p.name} (${p.totalPoints || 0})</p>`).join("")}

        <h3>🏆 Highest Scoring Match</h3>
        <p>${highestMatch ? `${highestMatch.team1} ${highestMatch.score1} - ${highestMatch.score2} ${highestMatch.team2}` : "No Matches"}</p>

        <h3>😬 Lowest Scoring Match</h3>
        <p>${lowestMatch ? `${lowestMatch.team1} ${lowestMatch.score1} - ${lowestMatch.score2} ${lowestMatch.team2}` : "No Matches"}</p>

        <h3>🚀 Highest Scoring Team</h3>
        <p>${highestTeam?.team || "-"} (${highestTeam?.total || 0} Pts)</p>

        <h3>📉 Lowest Scoring Team</h3>
        <p>${lowestTeam?.team || "-"} (${lowestTeam?.total || 0} Pts)</p>

        <h3>📊 Tournament Average Score</h3>
        <p>${tournamentAverage}</p>

        <h3>📋 Team-wise Average Score</h3>
        ${averages.map(team => `<p>${team.team} : ${team.avg}</p>`).join("")}

        <h3>🥇 Most Wins Team</h3>
        <p>${mostWins?.team || "-"} (${mostWins?.value || 0} Wins)</p>

        <h3>❌ Most Losses Team</h3>
        <p>${mostLosses?.team || "-"} (${mostLosses?.value || 0} Losses)</p>

        <h3>🤝 Most Draws Team</h3>
        <p>${mostDraws?.team || "-"} (${mostDraws?.value || 0} Draws)</p>
    </div>`;
}

function exportTournament() {
    const tournamentData = {
        teams,
        fixtures,
        settings: settings || {},
        exportDate: new Date().toLocaleString()
    };

    const dataStr = JSON.stringify(tournamentData, null, 2);
    const blob    = new Blob([dataStr], { type: "application/json" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");

    a.href     = url;
    a.download = "kabaddi_tournament_" + Date.now() + ".json";
    a.click();

    URL.revokeObjectURL(url);
}

function importTournament(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);

            await apiDelete("/api/reset");

            for (const team of data.teams) {
                await apiPost("/api/teams", {
                    name:    team.name,
                    players: team.players || []
                });
            }

            await apiPost("/api/fixtures/replace", {
                fixtures: data.fixtures || []
            });

            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    await apiPost("/api/settings", { key, value });
                }
            }

            await initApp();

            alert("Tournament Imported Successfully ✅");

        } catch (err) {
            console.error(err);
            alert("Invalid Tournament File ❌");
        }
    };

    reader.readAsText(file);
    event.target.value = "";
}

// ── Boot ──
initApp();