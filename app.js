const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();
app.use(express.json());

let db = null;

const initializingDataBase = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/");
        });
    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializingDataBase();

const convertPlayerToCamelCase = (dbObject) => {
    return {
        playerId: dbObject.player_id,
        playerName: dbObject.player_name,
    };
};

app.get("/players/", async (request, response) => {
    const getQuery = `
    SELECT * FROM player_details ORDER BY player_id;`;
    const playerArray = await db.all(getQuery);
    response.send(playerArray.map((each) => convertPlayerToCamelCase(each)));
});

app.get("/players/:playerId/", async (request, response) => {
    const { playerId } = request.params;
    const playerQuery = `
  SELECT * FROM player_details WHERE player_id = ${playerId};`;
    const playerObject = await db.get(playerQuery);
    response.send(convertPlayerToCamelCase(playerObject));
});

app.put("/players/:playerId/", async (request, response) => {
    const { playerId } = request.params;
    const playerDetails = request.body;
    const { playerName } = playerDetails;
    const updateQuery = `
  UPDATE player_details SET player_name = '${playerName}' WHERE player_id = ${playerId};`;
    await db.run(updateQuery);
    response.send("Player Details Updated");
});

const convertMatchDetailsToCamelCase = (dbObject) => {
    return {
        matchId: dbObject.match_id,
        match: dbObject.match,
        year: dbObject.year,
    };
};

app.get("/matches/:matchId/", async (request, response) => {
    const { matchId } = request.params;
    const matchQuery = `
  SELECT * FROM match_details WHERE match_id = ${matchId};`;
    const matchObject = await db.get(matchQuery);
    response.send(convertMatchDetailsToCamelCase(matchObject));
});

const convertPlayerMatch = (dbObject) => {
    return {
        matchId: dbObject.player_match_id,
        match: dbObject.match,
        year: dbObject.year,
    };
};

app.get("/players/:playerId/matches/", async (request, response) => {
    const { playerId } = request.params;
    const getMatchQuery = `
  SELECT * FROM player_match_score NATURAL JOIN match_details WHERE player_id = ${playerId};`;
    const dbResponse = await db.all(getMatchQuery);
    response.send(dbResponse.map((each) => convertPlayerMatch(each)));
});

app.get("/matches/:matchId/players", async (request, response) => {
    const { matchId } = request.params;
    const getQuery = `
  SELECT * FROM player_match_score NATURAL JOIN player_details WHERE match_id = ${matchId};`;
    const dbResponse = await db.all(getQuery);
    response.send(dbResponse.map((each) => convertPlayerToCamelCase(each)));
});

app.get("/players/:playerId/playerScores", async (request, response) => {
    const { playerId } = request.params;
    const getQuery = `
  SELECT player_details.player_id as playerId,
  player_details.player_name as playerName,
  SUM(score) as totalScore,
  SUM(fours) as totalFours,
  SUM(sixes) as totalSixes
  FROM player_details INNER JOIN player_match_score ON 
  player_details.player_id = player_match_score.player_id WHERE player_details.player_id = ${playerId};`;

    const dbResponse = await db.get(getQuery);
    response.send(dbResponse);
});

module.exports = app;
