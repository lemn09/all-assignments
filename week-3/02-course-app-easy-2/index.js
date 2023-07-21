const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');

app.use(express.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];

const privateKey = 'courseappprivatekey';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader === undefined) {
    res.status(401).json({ error: 'No token provided' });
  } else {
    const token = authHeader.substr(7);
    jwt.verify(token, privateKey, (err, decoded) => {
      if (err) {
        res.status(403).json({ error: 'invalid token' });
      } else {
        next();
      }
    })
  }

}

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization || null;

  if (authHeader === null) {
    res.status(401).json({ error: 'No token provided' });
  } else {
    const token = authHeader.substr(7);
    jwt.verify(token, privateKey, (err, decoded) => {
      if (err) {
        res.status(403).json({ error: 'invalid token' });
      } else {
        req.user = decoded;
        next();
      }
    })
  }
}

function generateToken(input) {
  const payload = { username: input.username };
  return jwt.sign(payload, privateKey, { expiresIn: '1h' });
}

// Admin routes
app.post('/admin/signup', (req, res) => {
  // logic to sign up admin
  const { username, password } = req.headers;

  const admin = ADMINS.find((a) => a.username === username) || null;

  if (admin) {
    res.status(403).json({ message: 'Admin already exists!!' })
  } else {
    ADMINS.push({ username, password });
    const jwtToken = generateToken({ username, password });
    res.json({ message: 'Admin created successfully', jwtToken });
  }
});

app.post('/admin/login', (req, res) => {
  // logic to log in admin
  const { username, password } = req.headers;

  const admin = ADMINS.find((a) => a.username === username && a.password === password) || null;

  if (admin === null) {
    res.status(403).json({ message: 'invalid credentials' });
  } else {
    token = generateToken({ username, password });
    res.json({ message: 'Logged in successfully', token });
  }
});

app.post('/admin/courses', authenticateAdmin, (req, res) => {
  // logic to create a course
  const newCourse = { ...req.body };
  newCourse.id = Date.now();

  COURSES.push(newCourse);
  res.json({ message: 'Course created successfully', courseId: newCourse.id })
});

app.put('/admin/courses/:courseId', authenticateAdmin, (req, res) => {
  // logic to edit a course
  const courseId = +req.params.courseId;

  const course = COURSES.find((c) => c.id === courseId) || null;

  if (course) {
    Object.assign(course, req.body);
    res.json({ message: 'Course updated successfully' });
  } else {
    res.json({ message: 'Course does not exist' });
  }
});

app.get('/admin/courses', authenticateAdmin, (req, res) => {
  // logic to get all courses
  res.json({ courses: COURSES });
});

// User routes
app.post('/users/signup', (req, res) => {
  // logic to sign up user
  const user = req.headers;
  user.purchased = [];

  const check = USERS.find((a) => a.username === user.username) || null;

  if (check) {
    res.status(403).json({ message: 'user already exists!!! signup failed' });
  } else {
    USERS.push(user);
    const token = generateToken(user);
    res.json({ message: 'User created successfully', token });
  }
});

app.post('/users/login', (req, res) => {
  // logic to log in user
  const { username, password } = req.headers;

  const check = USERS.find((user) => user.username === username && user.password === password) || null;

  if (check === null) {
    res.status(403).json({ message: 'invalid credentials' });
  } else {
    const token = generateToken({ username, password });
    res.json({ message: 'Logged in successfully', token });
  }
});

app.get('/users/courses', authenticateUser, (req, res) => {
  // logic to list all courses
  const publishedCourses = COURSES.filter((course) => course.published === true);

  res.json({ courses: publishedCourses });
});

app.post('/users/courses/:courseId', authenticateUser, (req, res) => {
  // logic to purchase a course
  const courseId = +req.params.courseId;

  const course = COURSES.find((c) => c.id === courseId) || null;

  if (course === null) {
    res.status(403).send("course doesn't exist");
  } else {
    console.log(req.user);
    const user = USERS.find((u) => u.username === req.user.username);
    user.purchased.push(courseId);
    console.log(`searched user : ${user}`);
    res.json({ message: 'Course purchased successfully' });
  }
});

app.get('/users/purchasedCourses', authenticateUser, (req, res) => {
  // logic to view purchased courses
  const user = USERS.find((u) => u.username === req.user.username);
  const purchasedCourses = COURSES.filter((course) => user.purchased.includes(course.id));

  res.json({ purchasedCourses });
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
