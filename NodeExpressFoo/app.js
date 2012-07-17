
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

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
		console.log('answer: '+data.answer);
		socket.get('game',function(err, questData){
			var isCorrect=false;
			if(questData.answer==data.answer){
				isCorrect=true;
				questData.correctCount++;
			}
			var quest= generateQuest(questData.operations, questData.difficulty);
			console.log(quest);
			questData.quest=quest.quest;
			questData.answer=quest.answer;
			socket.set('game',questData);
			socket.emit('quest', {isCorrect:isCorrect, quest:quest.quest});
		});
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
});

var gameLobby={
	players:[],
	gameRoomEasy:[],
	gameRoomNormal:[],
	gameRoomHard:[]

};

var gameRoom={
	players:[],
	quests:[]
};

var player={
	name:null,
	id:null,
	gameRoom:null,
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