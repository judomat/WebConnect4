//@ts-check

var express = require("express");
var http = require("http");
var websocket = require("ws");

var Game = require("./game");

var port = process.argv[2];
var app = express();

app.use(express.static(__dirname + "/public"));
var server = http.createServer(app);

const wss = new websocket.Server({ server });

var connectionsCount = 0;

var lastGameID = -1;
var games = [];

wss.on("connection", function(socket) 
{
    console.log("connection");
    
    let game = undefined;
    let gameIndex = games.length;
    let playerNumber = 0;
    if (connectionsCount % 2 == 0) {
        game = new Game(gameIndex);
        games.push({"game" : game, "sockets": [socket]});
    }
    else {
        game = games[games.length-1]["game"];
        games[games.length-1]["sockets"].push(socket);
        gameIndex = games.length-1;
        playerNumber = 1;
    }
    socket.send(JSON.stringify({"gameID": gameIndex}));

    connectionsCount++;

    socket.on("message", function(message) 
    {
        if (games[gameIndex] == undefined)
            return;

        let messageString = String(message);
        let parts = messageString.split(" ");
        if (parts[0] == "clicked")
        {
            //console.log(`row ${parts[1]} was clicked`)

            if (playerNumber != game.nextPlayerToMove)
            {
                socket.send(JSON.stringify({"comunication": "it is not your turn!"}));
                return;
            }

            game.nextPlayerToMove =  game.nextPlayerToMove == 0? 1: 0;;
            let rowIndex = parseInt(parts[1]);
            let row = game.state[rowIndex];
            for (let i = 0; i < row.length; i++)
            {
                if (row[i] == "white")
                {
                    row[i] = playerNumber == 0? "red": "yellow";
                    break;
                }
            }

            let sockets = games[gameIndex]["sockets"];
            for (const playerSocket of sockets) {
                playerSocket.send(JSON.stringify({gameState: game.state}));
            }    
        }
    })

    socket.on("close", function(closingCode)
    {
        if (games[gameIndex] == undefined)
            return;

        console.log("connection closed");
        for (const playerSocket of games[gameIndex]["sockets"]) 
        {
            if (socket != playerSocket) {
                playerSocket.send(JSON.stringify({"comunication": "the other player rage quitted, refresh page to play again"}))
            } else {
                playerSocket.send(JSON.stringify({"comunication": "hasta luego"}));
            }
        }
        games[gameIndex] = undefined;
    });
});

server.listen(port);
