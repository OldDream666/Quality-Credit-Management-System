-- 表: classes
CREATE TABLE IF NOT EXISTS classes (
    id integer(32) DEFAULT nextval('classes_id_seq'::regclass) NOT NULL,
    name character varying(32) NOT NULL,
    grade_id integer(32),
    major_id integer(32),
    PRIMARY KEY (id),
    UNIQUE (name),
    UNIQUE (grade_id),
    UNIQUE (major_id)
);

-- 表: credits
CREATE TABLE IF NOT EXISTS credits (
    id integer(32) DEFAULT nextval('credits_id_seq'::regclass) NOT NULL,
    user_id integer(32) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    score numeric(4,2),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reject_reason character varying(255),
    PRIMARY KEY (id)
);

-- 表: credits_proofs
CREATE TABLE IF NOT EXISTS credits_proofs (
    id integer(32) DEFAULT nextval('credits_proofs_id_seq'::regclass) NOT NULL,
    credit_id integer(32),
    file bytea NOT NULL,
    filename character varying(255) NOT NULL,
    mimetype character varying(128) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 表: grades
CREATE TABLE IF NOT EXISTS grades (
    id integer(32) DEFAULT nextval('grades_id_seq'::regclass) NOT NULL,
    name character varying(32) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 表: login_attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    username character varying(100) NOT NULL,
    count integer(32) DEFAULT 0 NOT NULL,
    last_attempt timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (username)
);

-- 表: majors
CREATE TABLE IF NOT EXISTS majors (
    id integer(32) DEFAULT nextval('majors_id_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- 表: notices
CREATE TABLE IF NOT EXISTS notices (
    id integer(32) DEFAULT nextval('notices_id_seq'::regclass) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 表: users
CREATE TABLE IF NOT EXISTS users (
    id integer(32) DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'student'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(50),
    student_id character varying(32),
    grade character varying(16),
    major character varying(64),
    class character varying(32),
    PRIMARY KEY (id),
    UNIQUE (username),
    UNIQUE (student_id)
);

-- 索引
CREATE UNIQUE INDEX classes_name_grade_id_major_id_key ON public.classes USING btree (name, grade_id, major_id);
CREATE INDEX idx_credits_created_at ON public.credits USING btree (created_at DESC);
CREATE INDEX idx_credits_status ON public.credits USING btree (status);
CREATE INDEX idx_credits_type ON public.credits USING btree (type);
CREATE INDEX idx_credits_user_id ON public.credits USING btree (user_id);
CREATE INDEX idx_credits_proofs_created_at ON public.credits_proofs USING btree (created_at DESC);
CREATE INDEX idx_credits_proofs_credit_id ON public.credits_proofs USING btree (credit_id);
CREATE UNIQUE INDEX grades_name_key ON public.grades USING btree (name);
CREATE INDEX idx_login_attempts_last_attempt ON public.login_attempts USING btree (last_attempt);
CREATE UNIQUE INDEX majors_name_key ON public.majors USING btree (name);
CREATE INDEX idx_notices_created_at ON public.notices USING btree (created_at DESC);
CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);
CREATE INDEX idx_users_role ON public.users USING btree (role);
CREATE INDEX idx_users_student_id ON public.users USING btree (student_id);
CREATE INDEX idx_users_username ON public.users USING btree (username);
CREATE UNIQUE INDEX users_student_id_key ON public.users USING btree (student_id);
CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

-- 序列
CREATE SEQUENCE IF NOT EXISTS classes_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS credits_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS credits_proofs_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS grades_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS majors_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS notices_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS users_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;

