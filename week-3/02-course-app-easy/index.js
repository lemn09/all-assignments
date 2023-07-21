const express = require('express');
const app = express();

app.use(express.json());

let ADMINS = [];
// let ADMINS = [
//   {
//     username: 'admin1',
//     password: 'password1',
//   },
//   {
//     username: 'admin2',
//     password: 'password2',
//   },
//   {
//     username: 'admin3',
//     password: 'password3',
//   },
// ];
let USERS = [];
// let USERS = [
//   {
//     username: 'user1',
//     password: 'password1',
//     purchasedCourses: []
//   },
//   {
//     username: 'user2',
//     password: 'password2',
//     purchasedCourses: []
//   },
//   {
//     username: 'user3',
//     password: 'password3',
//     purchasedCourses: []
//   },
// ];
let COURSES = [];
// let COURSES = [
//   {
//     id: 1,
//     title: 'Introduction to Programming',
//     description: 'Learn the basics of programming.',
//     price: 29.99,
//     imageLink: 'https://example.com/intro-programming.jpg',
//     published: true,
//   },
//   {
//     id: 2,
//     title: 'Web Development Fundamentals',
//     description: 'Explore the essentials of web development.',
//     price: 49.99,
//     imageLink: 'https://example.com/web-dev-fundamentals.jpg',
//     published: true,
//   },
//   {
//     id: 3,
//     title: 'Data Science for Beginners',
//     description: 'Get started with data science concepts.',
//     price: 39.99,
//     imageLink: 'https://example.com/data-science.jpg',
//     published: false,
//   },
// ];


function adminAuthentication(req, res, next) {
  const { username, password } = req.headers;
  const admin = ADMINS.find(a => a.username === username && a.password === password);

  if (admin) {
    next();
  } else {
    res.status(403).json({ message: 'Admin authentication failed' });
  }
}

const userAuthentication = (req, res, next) => {
  const { username, password } = req.headers;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    req.user = user;  // Add user object to the request
    next();
  } else {
    res.status(403).json({ message: 'User authentication failed' });
  }
};

// Admin routes
app.post('/admin/signup', (req, res) => {
  // logic to sign up admin
  const admin = req.body;

  const checkAdmin = ADMINS.find(a => a.username === admin.username);
  if (checkAdmin) {
    res.status(403).json({ message: 'Admin already exists' });
    return;
  }

  ADMINS.push(admin);
  res.json({ message: 'Admin created Successfully' });
});

app.post('/admin/login', adminAuthentication, (req, res) => {
  // logic to log in admin
  res.json({ message: 'Logged in successfully' });
});

app.post('/admin/courses', adminAuthentication, (req, res) => {
  // logic to create a course
  const course = req.body;
  course.id = Date.now();

  COURSES.push(course);
  const output = {
    message: 'Course created successfully',
    courseId: course.id
  };

  res.json(output);

});

app.put('/admin/courses/:courseId', adminAuthentication, (req, res) => {
  // logic to edit a course

  const id = +req.params.courseId;

  const course = COURSES.find((a) => a.id === id);

  if (course) {
    Object.assign(course, req.body);
    res.json({ message: 'Course updated successfully' });
  } else {
    res.status(404).send('course not found');
  }
});

app.get('/admin/courses', adminAuthentication, (req, res) => {
  res.json({ courses: COURSES });
});

// User routes
app.post('/users/signup', (req, res) => {
  // logic to sign up user
  const user = { ...req.body, purchasedCourses: [] };

  USERS.push(user);
  res.json({ message: 'User created successfully' });
});

app.post('/users/login', userAuthentication, (req, res) => {
  // logic to log in user
  res.json({ message: 'Logged in successfully' });
});

app.get('/users/courses', userAuthentication, (req, res) => {
  // logic to list all courses
  const publishedCourses = COURSES.filter((course) => course.published);
  res.json({ courses: publishedCourses });

});

app.post('/users/courses/:courseId', userAuthentication, (req, res) => {
  // logic to purchase a course

  const id = +req.params.courseId;

  const course = COURSES.find((course) => {
    return course.id === id;
  }) || null;

  if (course === null) {
    res.status(404).json({ message: 'Course not found or not available' });
  } else {
    req.user.purchasedCourses.push(id);
    res.json({ message: 'Course purchased successfully' });
  }
});

app.get('/users/purchasedCourses', userAuthentication, (req, res) => {
  // logic to view purchased courses

  const purchasedCourses = COURSES.filter(c => req.user.purchasedCourses.includes(c.id));

  res.json({ purchasedCourses });
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
