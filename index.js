const express = require('express');
var app = express();
const massive = require('massive');
const parser = require('body-parser');
const cors = require('cors');
var session = require('express-session');
const path = require('path');
const cookieSession = require('cookie-session')

var dbURL = process.env.DATABASE_URL;

const pocUsername = 'thisismyusername';
const pocPassword = 'thisismypassword';
const pocAdminUsername = 'admin_user';
const pocAdminPassword = 'admin_password';

const runningLocally = (dbURL == null);
var db = null;

if (!runningLocally) {
	db = massive.connectSync(dbURL);
	app.set('db', massiveInstance);
}

app.use(parser.json());
app.use(parser.urlencoded({ extended: true }));

app.use(cors());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

Date.prototype.addDays = function(days) {
	var date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
}
function getMonday(d) {
	d = new Date(d);
	var day = d.getDay(),
      	diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}


app.use(session({
	secret: 'loggedIn',
	resave: false,
  	saveUninitialized: true,
	cookie: { secure: !runningLocally}
}));

app.get('/', function(req, res) {
	if (req.session.isLoggedIn) {
		res.redirect('/index');
	} else {
		res.render('login');
	}
});

app.get('/index', function(req, res) {
	if (req.session.isLoggedIn) {
		if (req.session.isAdmin) {
			res.render('index_admin');
		} else {
			res.render('index');
		}
	} else {
		res.redirect('/');
	}
});

app.get('/addCourse', function(req, res) {
	if (req.session.isLoggedIn) {
		if (req.session.isAdmin) {
			res.redirect('/course/add/admin');
		} else {
			res.redirect('/course/add');
		}
	} else {
		res.render('login');
	}
});

app.get('/course/add', function(req, res) {
	if (req.session.isLoggedIn) {
		var colleges = getColleges();
		res.render('add_course', {colleges: colleges});
	} else {
		res.render('login');
	}
});

app.get('/course/add/admin', function(req, res) {
	if (req.session.isLoggedIn) {
		var colleges = getColleges();
		res.render('add_course_admin', {colleges: colleges});
	} else {
		res.render('login');
	}
});

app.get('/removeCourse', function(req, res) {
	if (req.session.isLoggedIn) {
		if (req.session.isAdmin) {
			res.redirect('/course/remove/admin');
		} else {
			res.redirect('/course/remove');
		}
	} else {
		res.render('login');
	}
});

app.post('/login', function(req, res) {
	var body = req.body;
	if (runningLocally) {
		if (body.username == pocUsername && body.password == pocPassword) {
			req.session.isLoggedIn = true;
			req.session.isAdmin = false;
			req.session.save();
			res.send('Success');
		} else if (body.username == pocAdminUsername && body.password == pocAdminPassword) {
			req.session.isLoggedIn = true;
			req.session.isAdmin = true;
			req.session.save();
			res.send('Success');
		} else {
			req.session.isLoggedIn = false;
			req.session.save();
			res.status(500);
			res.send('Failure');
		}
	} else {
		db.users.findOne({scrn_nm: body.username, pass_wd: body.password}, function(err, result) {
			if (err) {
				req.session.isLoggedIn = false;
				req.session.save();
				res.status(500);
				res.send('Failure');
			} else {
				req.session.user_data = result;
				if (result.type_id == 0) {
					req.session.isLoggedIn = true;
					req.session.isAdmin = true;
					req.session.save();
					res.send('Success');
				} else {
					req.session.isLoggedIn = true;
					req.session.isAdmin = false;
					req.session.save();
					res.send('Success');
				}
			}
		});
	}
	
});


app.get('/college/:cllge/departments', function(req, res) {
	var college = req.params.cllge;
	var depts = getDepartments(college);
	res.send({departments: depts});
});

app.get('/courses/:cllge/:dpt/search', function (req, res) {
	var college = req.params.cllge;
	var depts = req.params.dpt;
	var courses = getAllCourses(college, dept);
	res.render('search_results', {courses: courses});
});

app.listen((process.env.PORT || 5000), function() {
	console.log('Node app is running on port', (process.env.PORT || 5000));
});

function getColleges() {
	return db.runSync("select * from college");
}

function getDepartments(college) {
	return db.department.findSync({cllge_id: college});
}

function getAllCourses(college, department) {
	var courses = db.course.findSync({cllge_id: college, dept_id: department});
	for (var i = 0 ; i < courses.length ; i++) {
		var course = courses[i];
		var sections = db.section.findSync({course_id: course.course_id});
		for (var j = 0 ; j < sections.length ; j++) {
			var section = sections[j];
			var professor = db.users.findSync({user_id: section.prof_id});
			section.prof = professor;
			sections[j] = section;
		}
		course.sections = sections;
		courses[i] = course;
	}
	return courses;
}

function getSchedule(user_id) {
	return db.schedule.findSync({user_id: user_id});
}

function addCourseStudent(course_id, section_id, user_id) {
	var newEntry = {
		user_id: user_id,
		course_id: course_id,
		sctn_id: section_id
	};
	if (isSectionOpen(section_id)) {
		db.schedule.insertSync(newEntry);
	} else {
		var waitlist = db.waitlist.findOneSync({sctn_id: section_id});
		var size = waitlist.size_lmt;
		var peopleInWaitList = db.waitlistpeople.findSync({wtlst_id: waitlist.wtlst_id});
		if (peopleInWaitList.length < size) {
			var newEntry2 = {
				user_id: user_id,
				wtlst_id: waitlist.wtlst_id
			};
			db.waitlistpeople.insertSync(newEntry2);
		}
	}
}

function dropCourseStudent(course_id, section_id, user_id) {
	var newEntry = {
		user_id: user_id,
		course_id: course_id,
		sctn_id: section_id
	};
	db.schedule.destroySync(newEntry);
	var waitlist = db.waitlist.findOneSync({sctn_id: section_id});
	var peopleInWaitList = db.waitlistpeople.findSync({wtlst_id: waitlist.wtlst_id});
	if (peopleInWaitList.length > 0) {
		var user = peopleInWaitList[0];
		var newEntry2 = {
			user_id: user.user_id,
			wtlst_id: waitlist.wtlst_id
		};
		db.waitlistpeople.destroySync(newEntry2);
		var newEntry3 = {
			user_id: user.user_id,
			course_id: course_id,
			sctn_id: section_id
		};
		db.schedule.insertSync(newEntry3);
	}

}

function isSectionOpen(sctn_id) {
	var section = db.section.findOneSync(sctn_id);
	var size = section.size_lmt;
	var peopleInClass = db.schedule.findSync({sctn_id: sctn_id});
	return (peopleInClass.length < size);
}
