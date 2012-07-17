var mongoose=require('mongoose'),
	Schema=mongoose.Schema;

var UsersSchema=new Schema({
	name: String,
	email: String
});

var CommentsSchema= new Schema({
	title: String,
	body: String,
	date: Date,
	author: [Users]
});

var CardsSchema=new Schema({
	title: String,
	body: String,
	from: [Users],
	to: [Users],
	date: Date,
	comments: [Comments]
});

mongoose.connect('mongodb://localhost/test');
var Cards=mongoose.model('Cards', CardsSchema);
var Users=mongoose.model('Users', UsersSchema);
var Comments=mongoose.model('Comments', CommentsSchema);

var cards=new Cards();

cards.title='testtitle';
cards.body='testBody';
cards.from=new Users({
	name: 'FromUserName',
	email: 'test@test.com'
});
cards.to=new Users({
	name:'toUser',
	email: 'toUser@email.com'
});
cards.date=new Date();
cards.comments=new Comments({
	title:'CommentsTitle',
	body:'CommentsBody',
	date:new Date(),
	auther:new Users({
		name:'commentUser',
		email:'comment@user.com'
	})
});

cards.save(function(err){
	console.log(err);
});
