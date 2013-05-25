var socket;
var gameState=0;//0:idle,1:countdown,2:gamestarted, 3:idleInRoom, 4: idleReady
var currentQuest;
var tick;
var gameLength=10;
$(document).ready(function(){
	socket=io.connect(window.location.host);
	//establish connection with the server
	socket.on('connection', function(data){
		if(data.msg==='pong'){
			console.log('Server ready');
			reset();
		}
	});
	//server sends a quest challenge
	socket.on('quest', function(data){
		console.log(data);
		gameState=2;
		currentQuest=data;
		populateArena();
	});
	//server sends a game result
	socket.on('result', function(data){
		console.log(data);
		if(data.cheated){
			$('#arena').html('<h1>Math Quest Heroes wouldn\'t cheat...</h1><button id="mainButton" type="submit" class="btn btn-primary btn-large span2">Do it right this time <i class="icon-pencil icon-white"></i></button>');
		}else{
			$('#arena').html('<h1>You scored: '+data.correctCount+'</h1><button id="mainButton" type="submit" class="btn btn-primary btn-large span2">Play Again <i class="icon-pencil icon-white"></i></button>');
		}
		$('#pbar').width(0);
		initStartButton();
	});
	
	/**
	 * Multiplayer mode
	 * Buttons (emits): Join a room -> Ready / Leave
	 * States (on): 
	 * 	Joined a room, 
	 * 	Player Joined, 
	 * 	Player Ready,
	 * 	Player left, 
	 * 	Game Started, 
	 * 	Player Scored, 
	 * 	Game Ended.  
	 *  
	 */
	
	socket.on('joinedRoom', function(){
		multiPlayer.joinedRoom();
	});
	socket.on('playerJoined', function(player){
		console.log(player);
		multiPlayer.addPlayer(player);
	});
	socket.on('playerLeft', function(player){
		multiPlayer.removePlayer(player);
	});
	socket.on('gameStarted', function(data){
		multiPlayer.gameStarted(data);
	});
	//other player answered a quest, server sent status
	socket.on('playerStatus', function(player){
		multiPlayer.playerStatus(player);
	});
	//server sends how much time is left
	socket.on('timeLeft', function(time){
		//other player answered quest, server sent status
		multiPlayer.updateTime(time.current, time.maxTime);
	});
	//game ends
	socket.on('gameEnded', function(data){
		multiPlayer.gameEnded(data);
	});
	//a player in the room is ready
	socket.on('playerReady', function(data){
		multiPlayer.playerReady(data);
	});	
	$('input[name=playerName]','#settingsForm').prop('placeholder','Player'+getRandomInt(1000000,9999999));
});

//when a window is refreshed or closed, leave the room.
$(window).bind('beforeunload',function(){
	if(socket){
		socket.emit('leaveRoom', {});
	};
});

//resets game state, title text up on server connection.
reset=function(){
	gameState=0;
	$('#arena').html('<h1>math-quest</h1><p>Practice your math skills and compete with others!</p><button id="mainButton" type="submit" class="btn btn-primary btn-large span2">Join a game<i class="icon-pencil icon-white"></i></button>');
	initStartButton();
	$('#pbar').width(0);
	$('#otherPlayers').hide(500, function(){
		$('#otherPlayers').empty();
	});
	
};

initStartButton=function(){
	$('#mainButton').unbind("click").click(function(){
		if(socket && gameState==0){
			multiPlayer.join();
		}else if(socket&& gameState==3){
			multiPlayer.ready();
		}
	});
};

//show the challenge quest. 
populateArena=function(){
	$('#arena').html('<h1><span class="span7">'+currentQuest.quest+'</span> x=<form class="well form-inline" id="answerForm" style="display:inline"><input type="text" id="answerInput" class="span1 input-xlarge focused"></form></h1>');
	$('#answerInput').focus();
	$('#answerForm').submit(function(){
		$('#answerInput').select();
		socket.emit('answer',{answer:$('#answerInput').val()});
		return false;
	});
	if(currentQuest.isCorrect==true){
		$('#answerForm').css('background-color', '#aaffaa');
		$('#answerForm').animate({backgroundColor:'#f5f5f5'},1000);
	}else if(currentQuest.isCorrect==false){
		$('#answerForm').css('background-color', '#ffaaaa');
		$('#answerForm').animate({backgroundColor:'#f5f5f5'},1000);
	}
};


/**
 * Multiplayer mode
 * Buttons (emits): Join a room -> Ready / Leave
 * States (on): 
 * 	Joined a room, 
 * 	Player Joined, 
 * 	Player Ready,
 * 	Player left, 
 * 	Game Started, 
 * 	Player Scored, 
 * 	Game Ended.  
 *  
 */

var multiPlayer={
	players:[],
	join:function(){
		//Join a room
		if(socket){
			socket.emit('joinRoom', {name:$('input[name=playerName]','#settingsForm').val().length==0?$('input[name=playerName]','#settingsForm').prop('placeholder'):$('input[name=playerName]','#settingsForm').val(),
				difficulty:$('input[name=difficulty]:checked', '#settingsForm').val()});
			$('#mainButton').html('Joining a room');
			$('#otherPlayers').append('<div id="pid_me" class="span4 seat">'+
					'<i class="icon-user"></i><h2>You</h2><div id="pid_me_quest"></div>'+
					'<div id="pid_me_score"></div></div>');
			$('#otherPlayers').show(500);
		};
	},
	ready:function(){
		if(socket){
			socket.emit('ready');
			$('#mainButton').html('Waiting for everyone to be ready');
			$('#mainButton').prop('disabled',true);
		};
	},
	playerReady:function(player){
		$('#pid'+player.id).stop().animate({backgroundColor:'#aaffaa'},1000);
	},
	leaveRoom:function(){
		gameState=0;
		$('#otherPlayers').hide(500, function(){
			$('#otherPlayers').empty();
		});
		if(socket){
			socket.emit('leaveRoom', {});
			$('#secButton').detach();
			$('#mainButton').html('Join a game');
			initStartButton();
		};
		
	},
	joinedRoom:function(players){
		//joined a room
		gameState=3;
		$('#mainButton').html('Click to be Ready');
		$('#mainButton').unbind("click").click(function(){
			multiPlayer.ready();
		});
		$('#mainButton').after('<button id="secButton" class="btn btn-primary btn-large span2">Leave the room.</button>');
		$('#secButton').unbind("click").click(function(){
			multiPlayer.leaveRoom();			
		});
		
	},
	gameStarted:function(data){
		gameState=1;
		$('#pbar').css('width',$('#pbar').parent().width());
		//prepare arena for quests, count down and wait for the first quest.
		$('#arena').fadeOut(500, function(){
			var i=3; //count down
			$('#arena').html('<h1>'+i+'</h1>');
			$('#arena').fadeIn(500);
			tick=setInterval(function(){
				if(i==1){
					gameState=2;
					clearInterval(tick);
				}else{
					i--;
					$('#arena').html('<h1>'+i+'</h1>');
				}
			},1000);
			
		});
	},
	playerStatus:function(player){
		//{id, isCorrect, quest, correctCount}
		$('#pid'+player.id+'_quest').html(player.quest);
		$('#pid'+player.id+'_score').html('Score '+player.correctCount);
		$('#pid'+player.id).css('background-color',player.isCorrect?'#aaffaa':'#ffaaaa');
		$('#pid'+player.id).stop().animate({backgroundColor:'#eee'},1000);
	},
	updateTime:function(current, max){
		$('#pbar').css('width',$('#pbar').parent().width()*current/max);
	},
	addPlayer: function(player){
		console.log(player);
		this.players.push(player);
		$('#otherPlayers').append('<div style="display:none" id="pid'+player.id+'" class="span4 seat">'+
				'<i class="icon-user"></i><h2>'+player.name+'</h2><div id="pid'+player.id+'_quest"></div>'+
				'<div id="pid'+player.id+'_score">Score 0</div></div>');
		$('#pid'+player.id).show(500);
	}, 
	removePlayer: function(player){
		console.log(player.id+' left');
		$.each(this.players, function(p, key){
			if(p.id===player.id){
				this.players.splice(key,1);
			};
		});
		$('#pid'+player.id).hide(500, function(){
			$('#pid'+player.id).detach();
		});
		
	},
	gameEnded:function(data){
		$('#arena').html('<h1>Game Ended</h1>');
		multiPlayer.joinedRoom();
		$.each(data.scores, function(index,value){
			console.log(value.name);
			console.log(value.score);
			console.log(value);
			$('#arena').append('<div class="score">['+value.name+'] '+value.score+'</div>');
			
		});
		$('#arena').append('<button id="mainButton" type="submit" class="btn btn-primary btn-large span2">Join a game<i class="icon-pencil icon-white"></i></button>');
		multiPlayer.joinedRoom();
	}
};

function getRandomInt (min, max) {
    return Math.floor(Math.random()*(max-min+1))+min;
}

