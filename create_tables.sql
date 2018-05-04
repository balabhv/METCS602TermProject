CREATE SEQUENCE usr_type_id_seq;
CREATE TABLE USER_TYPE_REF(
    user_type_ref_id int not null PRIMARY KEY DEFAULT nextval('usr_type_id_seq'),
    usr_type_desc varchar not null
);
CREATE SEQUENCE usrs_id_seq;
CREATE TABLE USERS(
    user_id int not null PRIMARY KEY DEFAULT nextval('usrs_id_seq'),
    first_nm varchar(25) not null,
    last_nm varchar(30) not null,
    scrn_nm varchar(20) not null,
    pass_wd varchar(20) not null,
    email_id varchar(40) not null,
    type_id int not null REFERENCES USER_TYPE_REF(user_type_ref_id)
);
CREATE SEQUENCE cllge_id_seq;
CREATE TABLE COLLEGE(
    cllge_id int not null PRIMARY KEY DEFAULT nextval('cllge_id_seq'),
    cllge_nm varchar(25) not null,
    cllge_desc varchar(30)
);
CREATE SEQUENCE dept_id_seq;
CREATE TABLE DEPARTMENT(
    dept_id int not null PRIMARY KEY DEFAULT nextval('dept_id_seq'),
    cllge_id int not null REFERENCES COLLEGE(cllge_id),
    dept_nm varchar(25) not null,
    dept_desc varchar(30)
);
CREATE SEQUENCE course_id_seq;
CREATE TABLE COURSE(
    course_id int not null PRIMARY KEY DEFAULT nextval('course_id_seq'),
    course_nm varchar(25) not null,
    course_desc varchar not null,
    cllge_id int not null REFERENCES COLLEGE(cllge_id),
    dept_id int not null REFERENCES DEPARTMENT(dept_id),
    num_credits int not null
);
CREATE SEQUENCE sctn_id_seq;
CREATE TABLE SECTION(
    sctn_id int not null PRIMARY KEY DEFAULT nextval('sctn_id_seq'),
    course_id int not null REFERENCES COURSE(course_id),
    clssrm_id int not null REFERENCES CLASSROOM(clssrm_id),
    prof_id int not null REFERENCES USERS(user_id),
    size_lmt int not null,
    m boolean not null DEFAULT FALSE,
    t boolean not null DEFAULT FALSE,
    w boolean not null DEFAULT FALSE,
    th boolean not null DEFAULT FALSE,
    f boolean not null DEFAULT FALSE,
    start_tm time not null,
    end_tm time not null
);
CREATE SEQUENCE clssrm_id_seq;
CREATE TABLE CLASSROOM(
    clssrm_id int not null PRIMARY KEY DEFAULT nextval('clssrm_id_seq'),
    clssrm_desc varchar not null,
    size_lmt int not null
);

CREATE SEQUENCE schdle_id_seq;
CREATE TABLE SCHEDULE(
    schdle_entry_id int not null PRIMARY KEY DEFAULT nextval('schdle_id_seq'),
    user_id int not NULL REFERENCES USERS(user_id),
    course_id int not null REFERENCES COURSE(course_id),
    sctn_id int not null REFERENCES SECTION(sctn_id)
);

CREATE SEQUENCE wtlst_id_seq;
CREATE TABLE WAITLIST(
    wtlst_id int not null PRIMARY KEY DEFAULT nextval('wtlst_id_seq'),
    sctn_id int not null REFERENCES SECTION(sctn_id),
    size_lmt int not null
);

CREATE SEQUENCE wtlst_people_id_seq;
CREATE TABLE WAITLISTPEOPLE(
    wtlst_people_id int not null PRIMARY KEY DEFAULT nextval('wtlst_people_id_seq'),
    wtlst_id int not null REFERENCES WAITLIST(wtlst_id),
    user_id int not NULL REFERENCES USERS(user_id)
);

INSERT INTO USER_TYPE_REF(usr_type_desc) VALUES ('Administrator');
INSERT INTO USER_TYPE_REF(usr_type_desc) VALUES ('Professor');
INSERT INTO USER_TYPE_REF(usr_type_desc) VALUES ('Student');
INSERT INTO USERS(first_nm, last_nm, scrn_nm, pass_wd, email_id, type_id) VALUES ('Admin', 'User', 'admin_user', 'aupassword', 'admin_user@example.com', 1);
INSERT INTO COLLEGE(cllge_nm, cllge_desc) VALUES ('Metropolitan College', 'MET');
INSERT INTO DEPARTMENT(cllge_id, dept_nm, dept_desc) VALUES (1, 'Department of CS', 'The CS Department');
INSERT INTO DEPARTMENT(cllge_id, dept_nm, dept_desc) VALUES (1, 'Department of CIS', 'The CIS Department');