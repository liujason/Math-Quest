
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , _=require('underscore');

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
//quest.operations
//quest.difficulty
//quest.quest
//quest.answer
//quest.startTime
//quest.correctCount
//quest.competeMode
//quest.playerName
io.sockets.on('connection', function(socket){
	socket.emit('connection', {msg:'pong'});
	socket.on('startGame', function(data){
		console.log(data);
	});
	socket.on('newGame', function(data){
		console.log(data);
		var quest= generateQuest(data.operations, data.difficulty);
		quest.correctCount=0;
		quest.gameLength=data.gameLength;
		quest.operations=data.operations;
		quest.difficulty=data.difficulty;
		quest.startTime=new Date().getTime()/1000;
		quest.competeMode=data.competeMode;
		quest.playerName=data.playerName;
		socket.set('game',quest);
		socket.emit('quest', {quest:quest.quest});
	});
	socket.on('answer', function(data){
		
		multiPlayer.checkAnswer(socket, data.answer);
		///////////////
//		console.log('answer: '+data.answer);
//		socket.get('game',function(err, questData){
//			var isCorrect=false;
//			if(questData.answer==data.answer){
//				isCorrect=true;
//				questData.correctCount++;
//			}
//			var quest= generateQuest(questData.operations, questData.difficulty);
//			console.log(quest);
//			questData.quest=quest.quest;
//			questData.answer=quest.answer;
//			socket.set('game',questData);
//			socket.emit('quest', {isCorrect:isCorrect, quest:quest.quest});
//		});
	});
	socket.on('getResult', function(data){
		socket.get('game', function(err, questData){
			var curTime=new Date().getTime()/1000;
			var cheated=true;
			console.log(questData.startTime);
			console.log(questData.gameLength);
			console.log(curTime);
			if(Math.abs(questData.startTime+questData.gameLength-curTime)<5){
				cheated=false;
			}
			socket.emit('result',{correctCount:questData.correctCount,
				cheated:cheated});
		});
		
	});
	
	socket.on('joinRoom', function(player){
		player.socket=socket;
		multiPlayer.newPlayer(player);
	});
	socket.on('ready', function(){
		multiPlayer.playerReady(socket);
	});
	socket.on('leaveRoom', function(player){
		player.socket=socket;
		multiPlayer.removePlayer(player);
	});
	socket.on('disconnect', function(player){
		player.socket=socket;
		multiPlayer.removePlayer(player);
	});
	
});

var multiPlayer={
	newPlayer:function(p){
		console.log(p.name+ ' player clicked "join room".');
		console.log(player);
		//Check if the socket is already in the allPlayers list, if yes, remove that one, and create a new player
		var p1=_.find(gameLobby.allPlayers, function(p1){
			return p1.id===p.socket.id;
		});
		if(p1){
			this.removePlayer(p1);
		}
		var p1=new player(p.name, p.socket.id, p.socket, p.difficulty);
		gameLobby.freePlayers.push(p1);
		gameLobby.allPlayers.push(p1);
		console.log(gameLobby.freePlayers.length+" free players");
		gameLobby.allocatePlayers();
	},
	removePlayer:function(p){
		_.each(gameLobby.allPlayers,function(p1,key){
			if(p1.socket===p.socket){
				gameLobby.allPlayers.splice(key,1);
				p1.gameRoom.removePlayer(p1);
				return;
			};
		});
	},
	playerReady:function(socket){
		var p=_.find(gameLobby.allPlayers,function(p1){
			return p1.id==socket.id;
		});
		_.each(p.gameRoom.players, function(p1, key){
			//tell other players that this player is ready.
			if(p1.id!=socket.id){
				p1.socket.emit('playerReady', {id:socket.id});
			}
		});
		if(p){
			p.ready=true;
			p.gameRoom.prepareStartGame();
		}
	},
	checkAnswer:function(socket, answer){
		var p=_.find(gameLobby.allPlayers, function(p1){
			return p1.id===socket.id;
		});
		var isCorrect=false;
		console.log(p.gameRoom.quests);
		console.log(p.questIndex);
		if(p.gameRoom.quests[p.questIndex-1].answer==answer){
			p.correctCount++;
			isCorrect=true;
		}
		var q=p.gameRoom.getQuest(p);
		//game room announce player status.
		p.socket.emit('quest', {isCorrect:isCorrect, quest:q});
		p.gameRoom.announceStatus(p, isCorrect);
		
		
	},
};
gameLobby={
	freePlayers:[],
	allPlayers:[],
	gameRoomEasy:[],
	gameRoomNormal:[],
	gameRoomHard:[],
	allocatePlayers:function(){
		//add free players to rooms
		_.each(this.freePlayers, function(player, key){
			console.log('freePlayers: '+player.difficulty);
			console.log(gameLobby.gameRoomEasy.length);
			switch(player.difficulty){
			case 'easy':
				var room=_.find(gameLobby.gameRoomEasy, function(r){
					console.log(r.status);
					console.log(r.players.length);
					console.log(r.max);
					return r.status==0 && r.players.length<=r.max;
				});
				if(room==null){
					//room Full! TODO: return room full msg.
				}else{
					room.add(player);
					player.gameRoom=room;
				};
				gameLobby.freePlayers.splice(key,1);//remove the player after adding to a room.
				break;
			case 'normal':
				break;
			case 'hard':
				break;
			}
		});
		//if there is no free room, create one, assign the player to the room.
	},

};
for (var i=0;i<10;i++){
	gameLobby.gameRoomEasy.push(new gameRoom('easy'));
	gameLobby.gameRoomNormal.push(new gameRoom('normal'));
	gameLobby.gameRoomHard.push(new gameRoom('hard'));
};
function gameRoom(difficulty){
	this.status=0; //0:awaiting joining, 1: started 
	this.max=6;
	this.maxTime=60;
	this.gameTime=this.maxTime;
	this.players=[];
	this.quests=[];
	this.difficulty=difficulty;
	this.add=function(player){
		console.log(player.name+' added into room.');
		_.each(this.players, function(p, key){
			p.socket.emit('playerJoined', {id:player.id,name:player.name});
			player.socket.emit('playerJoined',{id:p.id,name:p.name});
		});
		this.players.push(player);
		console.log('Total players in the room: '+this.players.length);
	};
	this.removePlayer=function(player){
		//announce to the other players in the same room
		_.each(this.players, function(p, key){
			if(p.id==player.id){
				p.gameRoom.players.splice(key,1);
			}else{
				p.socket.emit('playerLeft', {id:player.id});
			}
		});
		console.log('Total players in the room: '+this.players.length);
	};
	//prepare to start the game. Called whenever a player clicks "ready"
	this.prepareStartGame=function(){
		//go over each player, check the ready status. if everyone is ready, start the game
		var allReady=true;
		for(var i=0;i<this.players.length;i++){
			if(this.players[i].ready==false){
				allReady=false;
				break;
			}
		}
		if(allReady){
			this.gameStart();
		}
	};
	//start the game!
	this.gameStart=function(){
		this.status=1; //gameRoom status = started
		//tell everyone the game is started, client start count down
		_.each(this.players, function(p,key){
			p.socket.emit('gameStarted',{});
		});
		//after 3 seconds, send every player a quest
		setTimeout(function(gameRoom){
			_.each(gameRoom.players, function(p,key){
				p.socket.emit('quest',{quest:gameRoom.getQuest(p)});
			});
			//finish the game in gameRoom.gameTime seconds;
			var timerID=setInterval(function(gameRoom){
				gameRoom.gameTime--;
				_.each(gameRoom.players, function(p, key){
					p.socket.emit('timeLeft', {current:gameRoom.gameTime, maxTime:gameRoom.maxTime})
				});
				if(gameRoom.gameTime<=0){
					gameRoom.gameOver();
					clearInterval(timerID);
				};
			}, 1000, gameRoom);
		}, 3000, this);
		
	};
	this.gameOver=function(){
		this.status=0;
		this.quests=[];
		this.gameTime=this.maxTime;
		_.each(this.players, function(p,key){
			p.questIndex=0;
			p.ready=false;
			p.correctCount=0;
			p.socket.emit('gameEnded', {});
		});
	};
	//generates quests for the room.
	this.getQuest=function(player){
		//if there is enough quests in the quest queue, return the one in the queue
		if(player.questIndex<this.quests.length){
			return this.quests[player.questIndex++].quest;
		}else{
			//if there is not enough quest in the queue, generate one.
			var index=this.quests.push(generateQuest('operations',this.difficulty));
			player.questIndex++;
			return this.quests[index-1].quest;
		};
	};
	this.announceStatus=function(player, isCorrect){
		_.each(this.players, function(p,key){
			//send current player status to other players
			if(p.id!=player.id){
				p.socket.emit("playerStatus", {id:player.id, isCorrect:isCorrect, quest:player.gameRoom.quests[player.questIndex-1].quest, correctCount:player.correctCount});
			};
		});
	};
};

player=function(name, id, socket, difficulty){
	this.name=name;
	this.id=id;
	this.socket=socket;
	this.difficulty=difficulty;
	this.socket.emit('joinedRoom');
	this.ready=false;
	this.gameRoom=null;
	this.questIndex=0;
	this.correctCount=0;
};

generateQuest=function(operations, difficulty){
	if(difficulty==='easy'){
		var num1=getRandomInt(0,10);
		var num2=getRandomInt(0,10);
		var op='+';
		var answer=0;
		switch(getRandomInt(0,3)){
		case 0:
			op='+';
			answer=num1+num2;
			break;
		case 1:
			op='-';
			answer=num1-num2;
			break;
		case 2:
			op='*';
			answer=num1*num2;
			break;
		case 3:
			op='/';
			answer=num1/num2;
			break;
		}
		var data={quest:num1+' '+((op=='/')?'&divide;':((op=='*')?'&times;':op))+' '+num2, answer:answer};
		return data;
	}
	
};

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}