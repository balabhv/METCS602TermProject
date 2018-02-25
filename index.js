const express = require('express');
var app = express();
const massive = require('massive');
const parser = require('body-parser');
const cors = require('cors');

var dbURL = process.env.DATABASE_URL;

var db = massive.connectSync({connectionString: dbURL});

app.use(parser.json());
app.use(parser.urlencoded({ extended: true }));

app.use(cors());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
	res.render('index');
});

app.listen((process.env.PORT || 5000), function() {
	console.log('Node app is running on port', (process.env.PORT || 5000));
});