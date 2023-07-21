const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// let ADMINS = [];
// let USERS = [];
// let COURSES = [];

const url = 'mongodb://localhost:27017/course-website';
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4 // Use IPv4, skip trying IPv6
}

// connect mongoose
mongoose
  .connect(url, options)
  .then(() => {
    console.log('connection success');
  })
  .catch((err) =>
    console.log('error : ' + err)
  )

// define schemas
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
})

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  purchased: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Courses' }]
})

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean
});

// define models
const Users = mongoose.model("Users", userSchema);
const Admins = mongoose.model('Admins', adminSchema);
const Courses = mongoose.model('Courses', courseSchema);

const privateKey = 'somesecret@keyfor-users-and-admins-alike';

function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization || null;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, privateKey, (err, user) => {
      if (err) {
        res.status(403).json({ message: 'invalid token' });
      } else {
        req.user = user;
        next();
      }
    })
  } else {
    res.status(403).json({ message: 'invalid token' });
  }
}

// Admin routes
app.post('/admin/signup', async (req, res) => {
  // logic to sign up admin
  const { username, password } = req.headers;
  const admin = await Admins.findOne({ username });
  if (admin) {
    res.status(403).json({ message: 'Admin already exists' });
  } else {
    const newAdmin = new Admins({ username, password });
    await newAdmin.save();
    const token = jwt.sign({ username, role: 'admin' }, privateKey, { expiresIn: '1h' });
    res.json({ message: 'Admin created successfully', token });
  }
});

app.post('/admin/login', async (req, res) => {
  // logic to log in admin
  const { username, password } = req.headers;

  const admin = await Admins.findOne({ username, password });
  if (admin) {
    const token = jwt.sign({ username, role: 'admin' }, privateKey, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token })
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }
});

app.post('/admin/courses', authenticateJwt, async (req, res) => {
  // logic to create a course
  const course = new Courses(req.body);
  try {
    await course.save();
  } catch {
    console.log('save error');
    res.status(501).json({
      message: "server side error, couldn't save the course"
    })
  }

  res.json({ message: 'Course created successfully', courseId: course.id });
});

app.put('/admin/courses/:courseId', authenticateJwt, async (req, res) => {
  // logic to edit a course
  const courseId = req.params.courseId;

  const course = await Courses.findByIdAndUpdate(courseId, req.body, { new: true });
  if (course) {
    res.json({ message: 'Course updated successfully' });
  } else {
    res.status(404).json({ message: 'Course not found' });
  }
});

app.get('/admin/courses', authenticateJwt, async (req, res) => {
  // logic to get all courses
  const courses = await Courses.find();

  res.json({ courses });
});

// User routes
app.post('/users/signup', async (req, res) => {
  // logic to sign up user
  const { username, password } = req.body;

  // check if user already exists
  const user = await Users.findOne({ username });

  if (user) {
    res.status(403).json({ message: 'user already exists' });
  } else {
    const token = jwt.sign({ username, role: 'user' }, privateKey, { expiresIn: '1h' });
    const newUser = new Users({ username, password });
    await newUser.save();
    res.json({ message: 'User created successfully', token });
  }

});

app.post('/users/login', async (req, res) => {
  // logic to log in user
  const { username, password } = req.headers;

  // check if valid credentials
  const user = await Users.findOne({ username, password });

  if (user) {
    const token = jwt.sign({ username, role: 'user' }, privateKey, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }
});

app.get('/users/courses', authenticateJwt, async (req, res) => {
  // logic to list all courses
  const courses = await Courses.find({ published: true });

  res.json({ courses });
});

app.post('/users/courses/:courseId', authenticateJwt, async (req, res) => {
  const courseId = req.params.courseId;

  const course = await Courses.findById(courseId);

  if (course) {
    const username = req.user.username;
    const user = await Users.findOne({ username });

    if (user) {
      user.purchased.push(courseId); // Add the courseId to the purchased array
      await user.save();
      console.log(user);
      res.json({ message: 'Course purchased successfully' });
    } else {
      res.status(403).json({ message: 'User not found' });
    }
  } else {
    res.status(404).json({ message: 'Course not found' });
  }
});

app.get('/users/purchasedCourses', authenticateJwt, async (req, res) => {
  // logic to view purchased courses
  const username = req.user.username;
  const user = await Users.findOne({ username }).populate('purchased');
  if (user) {
    res.json({ purchasedCourses: user.purchased || [] });
  } else {
    res.status(403).json({ message: 'User not found' });
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
