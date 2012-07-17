var socket;
var gameState=0;//0:idle,1:countdown,2:gamestarted
var currentQuest;
var tick;
var gameLength=10;
$(document).ready(function(){
	socket=io.connect('http://localhost');
	socket.on('connection', function(data){
		if(data.msg==='pong'){
			console.log('Server ready');
			reset();
		}
	});
	socket.on('quest', function(data){
		console.log(data);
		currentQuest=data;
		if(gameState==0){
			gameState=1;
			$('#arena').fadeOut(500, function(){
				var i=3;
				$('#arena').html('<h1>'+i+'</h1>');
				$('#arena').fadeIn(500);
				tick=setInterval(function(){
					if(i==1){
						gameState=2;
						clearInterval(tick);
						populateArena();
						tick=setInterval(function(){
							$('#pbar').css('width',$('#pbar').width()+$('#pbar').parent().width()/gameLength);
							if($('#pbar').width()>=$('#pbar').parent().width()){
								clearInterval(tick);
								gameOver();
							}
						},1000);
					}else{
						i--;
						$('#arena').html('<h1>'+i+'</h1>');
					}
				},1000);
				
			});
		}else if(gameState==2){
			populateArena();
			
		}
	});
	socket.on('result', function(data){
		console.log(data);
		if(data.cheated){
			$('#arena').html('<h1>Math Quest Heroes wouldn\'t cheat...</h1><button id="startGame" type="submit" class="btn btn-primary btn-large span2">Do it right this time <i class="icon-pencil icon-white"></i></button>');
		}else{
			$('#arena').html('<h1>You scored: '+data.correctCount+'</h1><button id="startGame" type="submit" class="btn btn-primary btn-large span2">Play Again <i class="icon-pencil icon-white"></i></button>');
		}
		$('#pbar').width(0);
		$('#startGame').click(function(){
			
			if(socket){
				socket.emit('newGame',{
					operations:$('input[name=operations]:checked', '#settingsForm').val(),
					difficulty:$('input[name=difficulty]:checked', '#settingsForm').val(),
					competeMode:$('input[name=mode]','#settingsForm').prop('checked'),
					playerName:$('input[name=playerName','#settingsForm').val(),
					gameLength:gameLength
				});
			}
		});
	});
	$('input[name=mode]','#settingsForm').click(function(){
		if($(this).prop('checked')){
			$('#startGame').html('Ready<i class="icon-pencil icon-white"></i>');
		}else{
			$('#startGame').html('Start<i class="icon-pencil icon-white"></i>');
		}
		
	});
});


reset=function(){
	gameState=0;
	$('#arena').html('<h1>math-quest</h1><p>Practice your math skills and compete with others!</p><button id="startGame" type="submit" class="btn btn-primary btn-large span2">Start<i class="icon-pencil icon-white"></i></button>');
	$('#startGame').click(function(){
		if($('input[name=mode]','#settingsForm').prop('checked')){
			var player={name:'playerName',id:Math.random()*100};
			multiPlayer.addPlayer(player);
		}else{
			if(socket){
				socket.emit('newGame',{
					operations:$('input[name=operations]:checked', '#settingsForm').val(),
					difficulty:$('input[name=difficulty]:checked', '#settingsForm').val(),
					competeMode:$('input[name=mode]','#settingsForm').prop('checked'),
					playerName:$('input[name=playerName]','#settingsForm').val(),
					gameLength:gameLength
				});
			};
		};
	});
	$('#pbar').width(0);
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

var multiPlayer={
	addPlayer: function(player){
		$('#otherPlayers').append('<div id="pid'+player.id+'" class="span4"><h2>'+player.name+'</h2></div>');
	}, 
	removePlayer: function(player){
		
	}
};
