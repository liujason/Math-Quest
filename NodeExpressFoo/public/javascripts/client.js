var socket;
var gameState=0;//0:idle,1:countdown,2:gamestarted, 3:idleInRoom, 4: idleReady
var currentQuest;
var tick;
var gameLength=10;
$(document).ready(function(){
	socket=io.connect(window.location.host);
	socket.on('connection', function(data){
		if(data.msg==='pong'){
			console.log('Server ready');
			reset();
		}
	});
	socket.on('quest', function(data){
		console.log(data);
		gameState=2;
		currentQuest=data;
		populateArena();
	});
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
	socket.on('playerStatus', function(player){
		//other player answered quest, server sent status
		multiPlayer.playerStatus(player);
	});
	socket.on('timeLeft', function(time){
		//other player answered quest, server sent status
		multiPlayer.updateTime(time.current, time.maxTime);
	});
	socket.on('gameEnded', function(data){
		multiPlayer.gameEnded(data);
	});
	socket.on('playerReady', function(data){
		multiPlayer.playerReady(data);
	});
	$('input[name=mode]','#settingsForm').click(function(){
		if($(this).prop('checked')){
			$('#mainButton').html('Join a game');
		}else{
			$('#mainButton').html('Start<i class="icon-pencil icon-white"></i>');
		}
		
	});
	
	
});

$(window).bind('beforeunload',function(){
	if(socket){
		socket.emit('leaveRoom', {});
	};
});

reset=function(){
	gameState=0;
	$('#arena').html('<h1>math-quest</h1><p>Practice your math skills and compete with others!</p><button id="mainButton" type="submit" class="btn btn-primary btn-large span2">Start<i class="icon-pencil icon-white"></i></button>');
	initStartButton();
	$('#pbar').width(0);
	
};

initStartButton=function(){
	$('#mainButton').unbind("click").click(function(){
		if($('input[name=mode]','#settingsForm').prop('checked')){
			multiPlayer.join();
		}else{
			if(socket && gameState==0){
				socket.emit('newGame',{
					operations:$('input[name=operations]:checked', '#settingsForm').val(),
					difficulty:$('input[name=difficulty]:checked', '#settingsForm').val(),
					competeMode:$('input[name=mode]','#settingsForm').prop('checked'),
					playerName:$('input[name=playerName]','#settingsForm').val(),
					gameLength:gameLength
				});
			}else if(socket&& gameState==3){
				multiPlayer.ready();
			}
		};
	});
};

populateArena=function(){
	$('#arena').html('<h1>'+currentQuest.quest+' = <form class="well form-inline" id="answerForm" style="display:inline"><input type="text" id="answerInput" class="input-xlarge focused"></form></h1>');
	$('#answerInput').focus();
	$('#answerForm').submit(function(){
		$('#answerInput').select();
		socket.emit('answer',{answer:$('#answerInput').val()});
		return false;
	});
	if(currentQuest.isCorrect==true){
		$('#answerInput').css('borderColor','green');
	}else if(currentQuest.isCorrect==false){
		$('#answerInput').css('borderColor','red');
	}
};

gameOver=function(){
	socket.emit('getResult');
	$('#arena').html('<h1>Getting result...</h1>');
	gameState=0;
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
			socket.emit('joinRoom', {name:$('input[name=playerName]','#settingsForm').val().length==0?'Player':$('input[name=playerName]','#settingsForm').val(),
				difficulty:$('input[name=difficulty]:checked', '#settingsForm').val()});
			$('#mainButton').html('Joining a room');
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
		$('#pid'+player.id).css('background-color','green');
	},
	leaveRoom:function(){
		
		if(socket){
			socket.emit('leaveRoom', {});
			$('#secButton').detach();
			$('#mainButton').html('Join a game');
			initStartButton();
		};
		$('#otherPlayers').empty();
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
			gameState=0;
		});
		
	},
	gameStarted:function(data){
		gameState=1;
		//prepare arena for quests, count down and wait for the first quest.
		$('#arena').fadeOut(500, function(){
			var i=3; //count down
			$('#arena').html('<h1>'+i+'</h1>');
			$('#arena').fadeIn(500);
			tick=setInterval(function(){
				if(i==1){
					gameState=2;
					clearInterval(tick);
//					populateArena();
//					tick=setInterval(function(){
//						$('#pbar').css('width',$('#pbar').width()+$('#pbar').parent().width()/gameLength);
//						if($('#pbar').width()>=$('#pbar').parent().width()){
//							clearInterval(tick);
//							gameOver();
//						}
//					},1000);
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
		$('#pid'+player.id).css('background-color',player.isCorrect?'green':'red');
		$('#pid'+player.id).stop().animate({backgroundColor:'#fff'},1000);
	},
	updateTime:function(current, max){
		$('#pbar').css('width',$('#pbar').parent().width()*current/max);
	},
	addPlayer: function(player){
		console.log(player);
		this.players.push(player);
		$('#otherPlayers').append('<div id="pid'+player.id+'" class="span4">'+
				'<h2>'+player.name+'</h2><div id="pid'+player.id+'_quest"></div>'+
				'<div id="pid'+player.id+'_score">Score 0</div></div>');
	}, 
	removePlayer: function(player){
		console.log(player.id+' left');
		$.each(this.players, function(p, key){
			if(p.id===player.id){
				this.players.splice(key,1);
			};
		});
		$('#pid'+player.id).detach();
	},
	gameEnded:function(data){
		$('#arena').html('<h1>Game Ended</h1>');
	}
};


