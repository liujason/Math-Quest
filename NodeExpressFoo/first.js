var express=require('express'),
	app=express.createServer(
		express.logger(),
		express.bodyParser()
		);

var items=[{name:'item1'},{name:'item2'},{name:'item3'}];
app.configure('dev',function(){ //environment is read from NODE_ENV
	app.use(express.logger());
});


app.get('/', function(req,res){
	res.send("hello world");
});



app.all("/i/:id/:op?", function(req, res, next){
	req.item=items[req.params.id];
	if(req.item){
		next();
	}else{
		next(new Error("not found "+req.params.id));
	}
});

app.get("/i/:id", function(req, res){
	res.send(req.item.name+__dirname);
});

app.get("/i/:id/edit", function(req, res){
	res.send('edit '+req.item.name);
});
	
app.listen(80, function(){
	console.log("express server started at port %s", app.address().port);
});