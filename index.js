const express = require('express');
var app = express();
const massive = require('massive');
const parser = require('body-parser');
const cors = require('cors');
var session = require('express-session');
const path = require('path');
const cookieSession = require('cookie-session');
const moment = require('moment');

var dbURL = process.env.DATABASE_URL;

const pocUsername = 'thisismyusername';
const pocPassword = 'thisismypassword';
const pocAdminUsername = 'admin_user';
const pocAdminPassword = 'admin_password';

const runningLocally = (dbURL == null);
var db = null;

if (!runningLocally) {
	db = massive.connectSync({connectionString: dbURL});
	app.set('db', db);
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

app.use(cookieSession({
	name: 'loggedIn',
	keys: ['key1', 'key2']
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
			console.log('Showed index admin');
			res.render('index_admin');
		} else {
			var user_data = req.session.user_data;
			var schedule = getSchedule(user_data.user_id);
			console.log('Showed index');
			res.render('index', {schedule: schedule, moment: moment});
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

app.get('/course/remove/admin', function(req, res) {
	if (req.session.isLoggedIn) {
		res.render('remove_course_admin');
	} else {
		res.render('login');
	}
});

app.post('/course/add/admin', function(req, res) {
	var cllge_id = req.body.cllge_id;
	var dept_id = req.body.dept_id;
	var course_nm = req.body.course_nm;
	var course_desc = req.body.course_desc;
	var num_credits = req.body.num_credits;
	addCourseAdmin(cllge_id, dept_id, course_nm, course_desc, num_credits);
	res.send('Success');
});

app.post('/course/remove/admin', function(req, res) {
	var course_id = req.body.c_id;
	removeCourseAdmin(course_id);
	res.send('Success');
});

app.get('/addClassroom', function(req, res) {
	res.render('add_classroom');
});

app.get('/addUser', function(req, res) {
	res.render('add_user');
});

app.get('/removeClassroom', function(req, res) {
	res.render('remove_classroom');
});

app.get('/removeUser', function(req, res) {
	res.render('remove_user');
});

app.post('/addClassroom', function(req, res) {
	var c_desc = req.body.description;
	db.classroom.insertSync({clssrm_desc: c_desc, size_lmt: 30});
	res.send("Success");
});

app.get('/addSection', function(req, res) {
	var colleges = getColleges();
	var profs = getProfs();
	var classrooms = getClasses();
	res.render('add_section', {colleges: colleges, profs: profs, classes: classrooms});
});

app.post('/addSection', function(req, res) {
	var cllge_id = req.body.cllge_id;
	var dept_id = req.body.dept_id;
	var course_id = req.body.course_id;
	var prof_id = req.body.prof_id;
	var clssrm_id = req.body.clssrm_id;
	var size_lmt = req.body.size_lmt;
	var start_tm = req.body.start_tm;
	var end_tm = req.body.end_tm;
	var m = req.body.m;
	var t = req.body.t;
	var w = req.body.w;
	var th = req.body.th;
	var f = req.body.f;
    var wtlst_lmt = req.body.wtlst_lmt;
    var section = {
		course_id: course_id,
		prof_id: prof_id,
		clssrm_id: clssrm_id,
		size_lmt: size_lmt,
		start_tm: start_tm,
		end_tm: end_tm,
		m: m,
		t: t,
		w: w,
		th: th,
		f: f
    };

    db.section.insertSync(section);
    var sectionResult = db.section.findOneSync(section);
    var section_id = sectionResult.sctn_id;
    var waitlist = {
    	sctn_id: section_id,
    	size_lmt: wtlst_lmt
    };
    db.waitlist.insertSync(waitlist);

    res.send("Success");
});

app.get('/removeSection', function(req, res) {
	res.render('remove_section');
});

app.post('/removeSection', function(req, res) {
	var course_id = req.body.course_id;
	var section_id = req.body.section_id;
	removeSectionAdmin(course_id, section_id);
	res.send("Success");
});

app.post('/addUser', function(req, res) {
	var first_nm = req.body.first_nm;
	var last_nm = req.body.last_nm;
	var scrn_nm = req.body.scrn_nm;
	var pass_wd = req.body.pass_wd;
	var email_id = req.body.email_id;
	var type = req.body.type_id;
	var user = {
		first_nm: first_nm,
		last_nm: last_nm,
		scrn_nm: scrn_nm,
		pass_wd: pass_wd,
		email_id: email_id,
		type_id: type
	};
	db.users.insertSync(user);
	res.send("Success");
});

app.post('/removeClassroom', function(req, res) {
	var classroom_id = req.body.classroom_id;
	var sections = db.section.findSync({clssrm_id: classroom_id});
	for (var i = 0 ; i < sections.length ; i++) {
		db.schedule.destroySync({sctn_id: sections[i].sctn_id});
		var waitlist = db.waitlist.findOneSync({sctn_id: sections[i].sctn_id});
		db.waitlistpeople.destroySync({wtlst_id: waitlist.wtlst_id});
		db.waitlist.destroySync({sctn_id: sections[i].sctn_id});
		db.section.destroySync({sctn_id: sections[i].sctn_id});
	}
	db.classroom.destroySync({clssrm_id: classroom_id});
	res.send("Success");
});

app.post('/removeUser', function(req, res) {
	var user_id = req.body.user_id;
	db.waitlistpeople.destroySync({user_id: user_id});
	db.schedule.destroySync({user_id: user_id});
	var sections = db.section.findSync({prof_id: user_id});
	for (var i = 0 ; i < sections.length ; i++) {
		db.schedule.destroySync({sctn_id: sections[i].sctn_id});
		var waitlist = db.waitlist.findOneSync({sctn_id: sections[i].sctn_id});
		db.waitlistpeople.destroySync({wtlst_id: waitlist.wtlst_id});
		db.waitlist.destroySync({sctn_id: sections[i].sctn_id});
		db.section.destroySync({sctn_id: sections[i].sctn_id});
	}
	db.users.destroySync({user_id: user_id});
	res.send("Success");

});

app.get('/removeCourse', function(req, res) {
	if (req.session.isLoggedIn) {
		if (req.session.isAdmin) {
			res.redirect('/course/remove/admin');
		}
	} else {
		res.render('login');
	}
});

app.post('/removeCourse', function(req, res) {
	var course_id = req.body.c_id;
	var section_id = req.body.s_id;
	var user_id = req.session.user_data.user_id;
	dropCourseStudent(course_id, section_id, user_id);
	res.send("Success");
});

app.post('/login', function(req, res) {
	var body = req.body;
	if (runningLocally) {
		if (body.username == pocUsername && body.password == pocPassword) {
			req.session.isLoggedIn = true;
			req.session.isAdmin = false;
			req.session.save();
			console.log('Local success');
			res.send('Success');
		} else if (body.username == pocAdminUsername && body.password == pocAdminPassword) {
			req.session.isLoggedIn = true;
			req.session.isAdmin = true;
			req.session.save();
			res.send('Success');
			console.log('Local success');
		} else {
			req.session.isLoggedIn = false;
			req.session.save();
			res.status(500);
			res.send('Failure');
			console.log('Local failure');
		}
	} else {
		db.users.findOne({scrn_nm: body.username, pass_wd: body.password}, function(err, result) {
			if (err) {
				req.session.isLoggedIn = false;
				req.session.save();
				res.status(500);
				res.send('Failure');
				console.log('Failure');
			} else {
				req.session.user_data = result;
				if (result.type_id == 1) {
					req.session.isLoggedIn = true;
					req.session.isAdmin = true;
					req.session.save();
					res.send('Success');
					console.log('success');
					console.log(req.session.isLoggedIn);
				} else {
					req.session.isLoggedIn = true;
					req.session.isAdmin = false;
					req.session.save();
					res.send('Success');
					console.log('success');
					console.log(req.session.isLoggedIn);
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

app.get('/college/:cllge/:dpt/getCourses', function(req, res) {
	var college = req.params.cllge;
	var dept = req.params.dpt;
	var courses = getCourseList(college, dept);
	res.send({courses: courses});
});

app.get('/courses/:cllge/:dpt/search', function (req, res) {
	var college = req.params.cllge;
	var depts = req.params.dpt;
	var courses = getAllCourses(college, dept);
	res.render('search_results', {courses: courses});
});

app.post('/addCourse', function(req, res) {
	var course_id = req.body.course_id;
	var section_id = req.body.section_id;
	var user_id = req.session.user_data.user_id;
	addCourseStudent(course_id, section_id, user_id);
	res.send('Success');
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

function getProfs() {
	return db.users.findSync({type_id: 2});
}

function getClasses() {
	return db.runSync("select * from classroom");
}

function getCourseList(college, department) {
	return db.course.findSync({cllge_id: college, dept_id: department});
}

function getAllCourses(college, department) {
	var courses = db.course.findSync({cllge_id: college, dept_id: department});
	for (var i = 0 ; i < courses.length ; i++) {
		var course = courses[i];
		var sections = db.section.findSync({course_id: course.course_id});
		for (var j = 0 ; j < sections.length ; j++) {

			var section = sections[j];
			var professor = db.users.findSync({user_id: section.prof_id});
			var classroom = db.classroom.findOneSync({clssrm_id: section.clssrm_id});
			var start_tm = section.start_tm;
			var start_tm_hour = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [start_tm]);
			var start_tm_minute = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [start_tm]);
			var end_tm = section.end_tm;
			var end_tm_hour = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [end_tm]);
			var end_tm_minute = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [end_tm]);
			var dow = [];
			var days = [];
			var monday = getMonday(new Date());
			if (section.m) {
				dow.push('Monday');
				var start = monday.setHours(start_tm_hour, start_tm_minute);
				var end = monday.setHours(end_tm_hour, end_tm_minute);
				var day = {
					start: start,
					end: end
				};
				days.push(day);
			} if (section.t) {
				dow.push('Tuesday');
				var tuesday = monday.addDays(1);
				var start = tuesday.setHours(start_tm_hour, start_tm_minute);
				var end = tuesday.setHours(end_tm_hour, end_tm_minute);
				var day = {
					start: start,
					end: end
				};
				days.push(day);
			} if (section.w) {
				dow.push('Wednesday');
				var wednesday = monday.addDays(2);
				var start = wednesday.setHours(start_tm_hour, start_tm_minute);
				var end = wednesday.setHours(end_tm_hour, end_tm_minute);
				var day = {
					start: start,
					end: end
				};
				days.push(day);
			} if (section.th) {
				dow.push('Thursday');
				var thursday = monday.addDays(3);
				var start = thursday.setHours(start_tm_hour, start_tm_minute);
				var end = thursday.setHours(end_tm_hour, end_tm_minute);
				var day = {
					start: start,
					end: end
				};
				days.push(day);
			} if (section.f) {
				dow.push('Friday');
				var friday = monday.addDays(4);
				var start = friday.setHours(start_tm_hour, start_tm_minute);
				var end = friday.setHours(end_tm_hour, end_tm_minute);
				var day = {
					start: start,
					end: end
				};
				days.push(day);
			}
			var obj = {
				classroom: classroom,
				professor: professor,
				dow: dow,
				days: days
			};
			section.data = obj;
			sections[j] = section;
		}
		course.sections = sections;
		courses[i] = course;
	}
	return courses;
}

function getSchedule(user_id) {
	var scheduleRaw = db.schedule.findSync({user_id: user_id});
	var schedule = [];
	for (var i = 0 ; i < scheduleRaw.length ; i++) {
		var course = db.course.findOneSync({course_id: scheduleRaw[i].course_id});
		var section = db.section.findOneSync({sctn_id: scheduleRaw[i].sctn_id});
		var classroom = db.classroom.findOneSync({clssrm_id: section.clssrm_id});
		var professor = db.users.findOneSync({user_id: section.prof_id});
		var start_tm = section.start_tm;
		var start_tm_hour = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [start_tm]);
		var start_tm_minute = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [start_tm]);
		var end_tm = section.end_tm;
		var end_tm_hour = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [end_tm]);
		var end_tm_minute = db.runSync("select EXTRACT(HOUR FROM TIME '$1')", [end_tm]);
		var dow = [];
		var days = [];
		var monday = getMonday(new Date());
		if (section.m) {
			dow.push('Monday');
			var start = monday.setHours(start_tm_hour, start_tm_minute);
			var end = monday.setHours(end_tm_hour, end_tm_minute);
			var day = {
				start: start,
				end: end
			};
			days.push(day);
		} if (section.t) {
			dow.push('Tuesday');
			var tuesday = monday.addDays(1);
			var start = tuesday.setHours(start_tm_hour, start_tm_minute);
			var end = tuesday.setHours(end_tm_hour, end_tm_minute);
			var day = {
				start: start,
				end: end
			};
			days.push(day);
		} if (section.w) {
			dow.push('Wednesday');
			var wednesday = monday.addDays(2);
			var start = wednesday.setHours(start_tm_hour, start_tm_minute);
			var end = wednesday.setHours(end_tm_hour, end_tm_minute);
			var day = {
				start: start,
				end: end
			};
			days.push(day);
		} if (section.th) {
			dow.push('Thursday');
			var thursday = monday.addDays(3);
			var start = thursday.setHours(start_tm_hour, start_tm_minute);
			var end = thursday.setHours(end_tm_hour, end_tm_minute);
			var day = {
				start: start,
				end: end
			};
			days.push(day);
		} if (section.f) {
			dow.push('Friday');
			var friday = monday.addDays(4);
			var start = friday.setHours(start_tm_hour, start_tm_minute);
			var end = friday.setHours(end_tm_hour, end_tm_minute);
			var day = {
				start: start,
				end: end
			};
			days.push(day);
		}
		var obj = {
			course: course,
			section: section,
			classroom: classroom,
			professor: professor,
			dow: dow,
			days: days
		};
		schedule.push(obj);
	}
	return schedule;
	
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

function removeCourseAdmin(course_id) {
	var course = db.course.findOneSync({course_id: course_id});
	var sections = db.section.findSync({course_id: course_id});
	for (var i = 0 ; i < sections.length ; i++) {
		removeSectionAdmin(course_id, sections[i].sctn_id);
	}
	db.course.destroySync({course_id: course_id});
}

function removeSectionAdmin(course_id, sctn_id) {
	db.schedule.destroySync({course_id: course_id, sctn_id: sctn_id});
	var waitlist = db.waitlist.findOneSync({sctn_id: sctn_id});
	db.waitlistpeople.destroySync({wtlst_id: waitlist.wtlst_id});
	db.waitlist.destroySync({sctn_id: sctn_id});
	db.section.destroySync({sctn_id: sctn_id});
}

function addCourseAdmin(cllge_id, dept_id, course_nm, course_desc, num_credits) {
	var entry = {
		cllge_id: cllge_id,
		dept_id: dept_id,
		course_nm: course_nm,
		course_desc: course_desc,
		num_credits: num_credits
	};
	db.course.insertSync(entry);
}
