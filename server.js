const { Client, Intents } = require("discord.js");
const Discord = require("discord.js");
const fs = require("fs");
const path = require("path");
const client = new Client({
  intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS]
});

const { createCanvas, loadImage } = require("canvas");
const canvas = createCanvas(1000, 1000);
const ctx = canvas.getContext("2d");

const sprites = [];
const numberSprites = [];
const flagNumberSprites = [];

var gamestate = {};

// When the client is ready, run this code (only once)
client.once("ready", async () => {
  console.log("Ready2!");

  for (let i = 0; i <= 9; i++) {
    sprites[i] = await loadImage("./sprites/tiles/sprite_0" + i + ".png");
    numberSprites[i] = await loadImage(
      "./sprites/covernums/num_0" + i + ".png"
    );
    flagNumberSprites[i] = await loadImage(
      "./sprites/flagnums/num_0" + i + ".png"
    );
  }
  sprites[10] = await loadImage("./sprites/tiles/sprite_10.png");
  sprites[11] = await loadImage("./sprites/tiles/sprite_11.png");
  
  //var channel = await client.channels.cache.get("470033792073990147")
  //var message = await channel.messages.cache.get("919349057166651472")
  //var madcatgeneral = client.channels.get("470033792073990147")
  //var testdelete = madcatgeneral.messages.fetch("919349057166651472")
  //console.log(message.content)
});

function uncoverTile(i, j, tiles) {
  if (!tiles[i][j].isUncovered && !tiles[i][j].isMine) {
    tiles[i][j].isUncovered = true;
    if (tiles[i][j].bombNeighbors == 0) {
      for (let x = -1; x <= 1; x++) {
        if (0 <= i + x && i + x < 10 && x != 0) uncoverTile(i + x, j, tiles);
        if (0 <= j + x && j + x < 10 && x != 0) uncoverTile(i, j + x, tiles);
      }
    }

    return true;
  }
  if (tiles[i][j].isMine) {
    return false;
  }
}

function initTiles(prob) {
  var tiles = [];
  for (let i = 0; i < 10; i++) {
    tiles[i] = [];
    for (let j = 0; j < 10; j++) {
      var isMine = false;
      if (Math.random() < prob) {
        isMine = true;
      }
      tiles[i][j] = {
        isMine: isMine,
        isUncovered: false,
        isFlagged: false,
        bombNeighbors: 0
      };
    }
  }
  return tiles;
}
function isStart(tiles) {
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      if (tiles[i][j].isUncovered) {
        return false;
      }
    }
  }
  return true;
}
function countBombs(tiles) {
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          if (
            0 <= i + x &&
            i + x < 10 &&
            0 <= j + y &&
            j + y < 10 &&
            (x != 0 || y != 0)
          ) {
            if (tiles[i + x][j + y].isMine) {
              tiles[i][j].bombNeighbors++;
            }
          }
        }
      }
    }
  }
  return tiles;
}

function renderTiles(reveal, tiles) {
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      var image = {};

      if (tiles[i][j].bombNeighbors <= 8) {
        image = sprites[tiles[i][j].bombNeighbors];
      }

      if (tiles[i][j].isMine) {
        image = sprites[10];
      }
      if (!tiles[i][j].isUncovered) {
        image = sprites[9];
      }
      if (tiles[i][j].isFlagged) {
        image = sprites[11];
      }
      if (reveal) {
        if (tiles[i][j].isMine) {
          image = sprites[10];
        } else {
          image = sprites[0];
        }
      }
      //ctx.fillRect(i*100,j*100,100,100)
      //this following line is prolly un optimal
      ctx.patternQuality = "nearest";
      ctx.drawImage(image, i * 100, j * 100, 100, 100);
      if (!reveal && !tiles[i][j].isUncovered) {
        if (tiles[i][j].isFlagged) {
          ctx.drawImage(flagNumberSprites[i], i * 100, j * 100, 100, 100);
          ctx.drawImage(
            flagNumberSprites[9 - j],
            i * 100 - 35,
            j * 100,
            100,
            100
          );
        } else {
          ctx.drawImage(numberSprites[i], i * 100, j * 100, 100, 100);
          ctx.drawImage(numberSprites[9 - j], i * 100 - 35, j * 100, 100, 100);
        }
      }
    }
  }
}

function sendImage(msg, id) {
  if (checkWinstate(gamestate[id].tiles)) {
    msg.reply({
      content: "CONGRATULATIONS! YOU WIN!!",
      files: [
        canvas.toBuffer(),
        "https://c.tenor.com/I2eCLcG3EVAAAAAd/congratulations-omedetou.gif"
      ]
    });
    gamestate[id] = {
      tiles: {}
    };
  } else {
    msg.reply({
      content:
        "Enter the tile id (without `!mad`) to unveil it. Precede it with `flag`/`mark` or `unflag`/`unmark` and a space to flag or unflag it, respectively. Type `!mad help` for a list of commands.",
      files: [canvas.toBuffer()]
    });
  }
}
function checkWinstate(tiles) {
  var out = true;
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      if (!tiles[i][j].isMine && !tiles[i][j].isUncovered) {
        out = false;
      }
    }
  }
  return out;
}

client.on("messageCreate", async msg => {
  const id = msg.author.id;
  var inProgress = false;
  if (typeof gamestate[id] !== "undefined") {
    inProgress = true;

    //console.log( Object.keys(gamestate[id].tiles).length === 0 )
    if (Object.keys(gamestate[id].tiles).length === 0) {
      inProgress = false;
    }
  }
  if (msg.content.length === 2 && inProgress) {
    const parse = parseInt(msg.content, 10);
    if (!isNaN(parse)) {
      let coords = { x: parse % 10, y: 9 - Math.trunc(parse / 10) };
      console.log(parse);
      console.log(coords);
      if (isStart(gamestate[id].tiles)) {
        console.log("starting");
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            if (
              0 <= coords.x + x &&
              coords.x + x < 10 &&
              0 <= coords.y + y &&
              coords.y + y < 10
            ) {
              console.log(
                coords.x +
                  x +
                  " " +
                  (coords.y + y) +
                  " " +
                  gamestate[id].tiles[coords.x + x][coords.y + y].isMine
              );
              gamestate[id].tiles[coords.x + x][coords.y + y].isMine = false;
              console.log(
                coords.x +
                  x +
                  " " +
                  (coords.y + y) +
                  " " +
                  gamestate[id].tiles[coords.x + x][coords.y + y].isMine
              );
            }
          }
        }
        countBombs(gamestate[id].tiles);
      }
      uncoverTile(coords.x, coords.y, gamestate[id].tiles);

      if (gamestate[id].tiles[coords.x][coords.y].isFlagged) {
        msg.reply({
          content:
            "WARNING: You have flagged this tile, you must unflag it to reveal it"
        });
      } else {
        if (!gamestate[id].tiles[coords.x][coords.y].isMine) {
          renderTiles(false, gamestate[id].tiles);
          sendImage(msg, id);
        } else {
          renderTiles(true, gamestate[id].tiles);
          msg.reply({
            content: "You Hit A Mine RIP LMAO",
            files: [
              canvas.toBuffer(),
              (() => {if(Math.random() < .5) {return "https://c.tenor.com/VGWokGdwt-EAAAAd/the-voices-voices-in-my-head.gif" }else{ return "./dancin_peach_3-1.gif"}})()
            ]
          });
          gamestate[id] = {
            tiles: {}
          };
        }
      }
    }
  }
  if (msg.content.startsWith("flag") || msg.content.startsWith("mark")) {
    const args = msg.content
      .slice(4)
      .trim()
      .split(/ +/g);
    if (args[0].length === 2 && inProgress) {
      const parse = parseInt(args[0], 10);

      if (!isNaN(parse)) {
        let coords = { x: parse % 10, y: 9 - Math.trunc(parse / 10) };
        if (!gamestate[id].tiles[coords.x][coords.y].isUncovered) {
          gamestate[id].tiles[coords.x][coords.y].isFlagged = true;
          renderTiles(false, gamestate[id].tiles);
          sendImage(msg, id);
        } else {
          msg.reply({ content: "ERROR: You cant flag an uncovered tile!" });
        }
      } else {
        msg.reply({ content: "ERROR: Please enter a valid tile id" });
      }
    }
  }
  if (msg.content.startsWith("unflag") || msg.content.startsWith("unmark")) {
    const args = msg.content
      .slice(6)
      .trim()
      .split(/ +/g);
    if (args[0].length === 2 && inProgress) {
      const parse = parseInt(args[0], 10);

      if (!isNaN(parse)) {
        let coords = { x: parse % 10, y: 9 - Math.trunc(parse / 10) };
        gamestate[id].tiles[coords.x][coords.y].isFlagged = false;
        renderTiles(false, gamestate[id].tiles);
        sendImage(msg, id);
      } else {
        msg.reply({ content: "ERROR: Please enter a valid tile id" });
      }
    }
  }
  if (msg.content.startsWith("!mad")) {
    const args = msg.content
      .slice(4)
      .trim()
      .split(/ +/g);
    const command = args.shift().toLowerCase();

    //console.log(gamestate[id])
    if (command == "help") {
      msg.reply({
        content:
          "```start - start a new game (easy, medium or hard)\nrestart - abandon current game a restart (easy, medium or hard)\nshow - show your current game\ndebug - cheat :(```"
      });
    }
    if (command == "start") {
      if (inProgress) {
        msg.reply({
          content:
            "You have a game in progress, if you have wish to restart, use the restart commant"
        });
      } else {
        gamestate[id] = {
          tiles: {}
        };
        let prob = 0.2;
        if (typeof args[0] === "undefined") {
          prob = 0.2;
        } else {
          if (args[0] == "easy") {
            prob = 0.1;
          }
          if (args[0] == "medium") {
            prob = 0.2;
          }
          if (args[0] == "hard") {
            prob = 0.4;
          }
        }
        gamestate[id].tiles = initTiles(prob);
        renderTiles(false, gamestate[id].tiles);
        sendImage(msg, id);
      }
    }

    if (inProgress) {
      if (command == "restart") {
        gamestate[id] = {
          tiles: {}
        };
        let prob = 0.2;
        if (typeof args[0] === "undefined") {
          prob = 0.2;
        } else {
          if (args[0] == "easy") {
            prob = 0.1;
          }
          if (args[0] == "medium") {
            prob = 0.2;
          }
          if (args[0] == "hard") {
            prob = 0.4;
          }
        }
        gamestate[id].tiles = initTiles(prob);
        renderTiles(false, gamestate[id].tiles);
        sendImage(msg, id);
      }
      if (command == "show") {
        renderTiles(false, gamestate[id].tiles);
        sendImage(msg, id);
      }
      if (command == "debug") {
        renderTiles(true, gamestate[id].tiles);
        sendImage(msg, id);
      }
      /*
        if(command == 'unflag'){
          let coords = {x:(Number(args[0])-1),y:(9-(Number(args[1])-1))}
          if( !(coords.x < 0 || coords.x > 9 || coords.y < 0 || coords.y > 9) ){
            gamestate[id].tiles[coords.x][coords.y].isFlagged = false
            renderTiles(false,gamestate[id].tiles)
            msg.reply({  files: [canvas.toBuffer()] })
          }else{
            msg.reply({ content: "ERROR: Please enter coordinates between 1 and 10"})
          }
        }*/
    } else if (command !== "start" && command !== "help") {
      msg.reply({
        content:
          "ERROR: You do not have a game in progress, please use start to start a new game"
      });
    }
  }

  //msg.channel.send(message) // without mention
  //msg.reply(message) // with mention
});

// Login to Discord with your client's token
client.login(process.env.BOT_TOKEN);
