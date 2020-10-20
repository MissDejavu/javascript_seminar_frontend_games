const fetch = require('node-fetch');


// Map <SessionId, GameState>
var openSessions = new Map();
var io;


module.exports = {
    gameInit: function (ioServer) {
        console.log("Creating Games socket");
        //create a io socket
        io = ioServer
        // io = socket(server);
        const connectedUsers = new Set(); //a list of every connection to the socket
        io.on("connection", function (socket) {
            console.log("Made socket connection");

            // Defines Signals to react to
            socket.on("connect", (data) => {
                console.log("Client Connected: " + data);
            });

            socket.on("disconnect", () => {
                console.log("Disconnecting");
                connectedUsers.delete(socket.userId);
            });

            socket.on("joinGame", (data) => {
                handleJoinGameMessage(data, socket);
            });

            socket.on("updateGame", (data) => {
                handleUpdateGameMessage(data);
            });

            socket.on("playerResult", (data) => {
                handlePlayerResultMessage(data);
            });
        });

    }
}

async function handleJoinGameMessage(data, socket) {

    // Join Room that will be subscribed
    socket.join(data.sessionId);

    if (openSessions.get(data.sessionId) == undefined) {
        // Create new Session  

        console.log("Create new Session for " + data.playerName);
        let currentGame = await createSession(data.sessionId, data.gameType, data.playerName, data.taskId);
        openSessions.set(data.sessionId, currentGame);

        io.to(data.sessionId).emit("updateGame", currentGame);
    } else {
        // use existing Session
        console.log("Existing Session!" + openSessions.get(data.sessionId));

        // TODO what happens with wrong taskid?

        // Update Gamesession
        let currentGame = openSessions.get(data.sessionId);
        currentGame.players.push(data.playerName);
        // TODO further update Details

        // Send new State in Room to every listener
        io.to(data.sessionId).emit("updateGame", openSessions.get(data.sessionId));
    }
};

function createSession(sessionId, gameType, playerName, taskId) {
    if (gameType == "alias") {
        return createAliasSession(sessionId, gameType, playerName, taskId)
    } else if (gameType == "drawit") {
        return createDrawItSession(sessionId, gameType, playerName, taskId);
    } else if (gameType == "quiz") {
        return createQuizSession(sessionId, gameType, playerName, taskId);
    }
}

async function createQuizSession(sessionId, gameType, playerName, taskId) {
    var session = {
        gameType: gameType,
        sessionId: sessionId,
        players: [playerName],
        quizes: [],
        quizIndex: 0,
        getSolution: false,
        countDownStarted: false,
        quizOver: false,
        taskId: taskId
    }
    return session;
}

async function createAliasSession(sessionId, gameType, playerName, taskId) {
    var session = {
        gameType: gameType,
        sessionId: sessionId,
        players: [playerName],
        currentPlayer: playerName,
        numberOfGuessedWords: 0,
        countDownStarted: false,
        words: [],
        name: "",
        description: "",
        taskId: taskId,
        state: "lobby",
        timelimit: 30,
        timeleft: 30
    }
    try {
        let alias = await getAliasGame(taskId);
        session.words = alias.words;
        session.name = alias.name;
        session.description = alias.description;
        return session;

    } catch (error) {
        console.log("could not get alias game")
        return null;
    }
}

function createDrawItSession(sessionId, gameType, playerName, taskId) {
    var session = {
        gameType: gameType,
        sessionId: sessionId,
        players: [playerName],
        currentPlayer: playerName,
        numberOfGuessedWords: 0,
        countDownStarted: false,
        drawitOver: false,
        wordsToGuess: [],
        taskId: taskId
    }
    return session;
}

async function getAliasGame(taskId) {
    var hex = /[0-9A-Fa-f]{6}/g;
    if (taskId == "" || taskId == null || taskId == undefined || !hex.test(taskId)) {
        // Get random words
        console.log("Wrong taskID, get random words"); // TODO -> throw and handle error! 
        return {
            id: taskId,
            name: "Mock Alias Game",
            description: "this is not a real game",
            words: ["Banana", "Trump", "Bicycle", "Pluto"]
        }

    } else {
        // Find by ID
        try {
            let alias = fetch('http://localhost:8080/games/alias/' + taskId).then(res => res.json())
            console.log("FETCHED ALIAS", alias);
            return alias;
        } catch (error) {
            console.log(error)
            return null;
        }
    }
}

// Send Update to every participant
async function handleUpdateGameMessage(data) {
    // Remove session data if nobody is connected
    if (data.players.length == 0) {
        openSessions.set(data.sessionId, undefined);
        console.log("Closing session: " + data.sessionId);
        return;
    }
    if (data.gameType == "alias") {
        await handleAliasUpdateMessage(data);
    } else if (data.gameType == "drawit") {
        await handleDrawItUpdateMessage(data);
    } else if (data.gameType == "quiz") {
        await handleQuizUpdateMessage(data);
    } else {
        console.log("Unknown gameType: " + data.gameType);
    }
};

async function handleAliasUpdateMessage(data) {
    io.to(data.sessionId).emit("updateGame", data);
    openSessions.set(data.sessionId, data);
}

async function handleDrawItUpdateMessage(data) {
    if (data.countDownStarted == true && data.wordsToGuess.length == 0 || data.getWords == true) {
        var hex = /[0-9A-Fa-f]{6}/g;
        data.getWords = false;
        if (data.taskId == "" || data.taskId == null || data.taskId == undefined || !hex.test(data.taskId)) {
            // Get random words
            console.log("Wrong taskID, get random words");

            fetch('http://localhost:8080/games/drawit/games/').then(res => res.json()).then(json => {
                data.wordsToGuess = json[Math.floor(Math.random() * json.length)].words;
                io.to(data.sessionId).emit("updateGame", data);
                openSessions.set(data.sessionId, data);
            }).catch(err => console.log(err));
        } else {
            // Find by ID
            fetch('http://localhost:8080/games/drawit/' + data.taskId).then(res => res.json()).then(json => {
                data.wordsToGuess = json[Math.floor(Math.random() * json.length)].words;
                io.to(data.sessionId).emit("updateGame", data);
                openSessions.set(data.sessionId, data);
            }).catch(err => {
                console.log(err);
                data.wordsToGuess = ["Banana", "Trump", "Bicycle", "Pluto"];
                io.to(data.sessionId).emit("updateGame", data);
                openSessions.set(data.sessionId, data);
            });
        }
    }
    io.to(data.sessionId).emit("updateGame", data);
    openSessions.set(data.sessionId, data);
}

function handleQuizUpdateMessage(data) {
    // Get new Questions!
    if (data.countDownStarted == true && data.quizes.length == 0) {
        var taskId;
        var hex = /[0-9A-Fa-f]{6}/g;
        if (data.taskId == null || data.taskId == undefined || data.taskId == "" || !hex.test(data.taskId)) {
            console.log("Invalid Task ID, sending random quiz");
            taskId = "5f8efa97d5841b00176305f4";
            fetch('http://localhost:8080/games/quiz/quizzes/').then(res => res.json()).then(json => {
                taskId = json[Math.floor(Math.random() * json.length)]._id;
            }).catch(err => console.log(err));
        } else {
            taskId = data.taskId;
        }
        fetch('http://localhost:8080/games/quiz/quizzes/' + taskId + '/questions').then(res => res.json()).then(json => {
            json.forEach(question => {
                var q = {
                    question: question.question,
                    answers: question.options,
                    correctAnswers: question.answer,
                    selectedAnswers: [],
                    type: question.type
                };
                data.quizes.push(q);
            });
            io.to(data.sessionId).emit("updateGame", data);
            openSessions.set(data.sessionId, data);
        }).catch(err => console.log(err));

    } else {
        // TODO Maybe get answers later
        io.to(data.sessionId).emit("updateGame", data);
        openSessions.set(data.sessionId, data);
    }
}

// For Quiz give students also the correct result
// For Alias and Drawit just forward the number of correct words!
function handlePlayerResultMessage(data) {
    if (data.gameType == "alias" || data.gameType == "drawit") {
        console.log("Send gameResult for " + data.gameType);
        io.to(data.sessionId).emit("gameResult", data);
        openSessions.set(data.sessionId, data);
    } else if (data.gameType == "quiz") {
        console.log("Got quiz Result. TODO");
    }
};