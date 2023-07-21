const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path')

const app = express();

app.use(express.json());

const adminPrivateKey = 'admins@key';
const userPrivateKey = 'user@key';

function generateTokenAdmin(admin) {
  const payload = { username: admin.username };

  return jwt.sign(payload, adminPrivateKey, { expiresIn: '1h' });
}

function generateTokenUser(user) {
  const payload = { username: user.username };

  return jwt.sign(payload, userPrivateKey, { expiresIn: '1h' });
}

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || null;

  if (authHeader === null) {
    res.status(401).json({ error: 'No token provided' });
  } else {
    const token = authHeader.substr(7);
    jwt.verify(token, adminPrivateKey, (err, decode) => {
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
    jwt.verify(token, userPrivateKey, (err, decode) => {
      if (err) {
        res.status(403).json({ error: 'invalid token' });
      } else {
        req.username = decode.username;
        next();
      }
    })
  }
}

function readFileData(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      }
    })
  })
}

function writeData(filePath, data) {
  data = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, 'utf-8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve('write data successful');
      }
    })
  })
}

// Admin routes
app.post('/admin/signup', (req, res) => {
  // logic to sign up admin
  const { username, password } = req.headers;
  const getAdmins = readFileData('./ADMINS.json');

  getAdmins.then((data) => {

    const admins = data['ADMINS'];

    const check = admins.find((a) => a.username === username) || null;

    if (check) {
      res.status(409).json({ message: 'user already exists, please login' });
    } else {
      admins.push({ username, password });
      const token = generateTokenAdmin({ username, password });

      data['ADMINS'] = admins;

      writeData('./ADMINS.JSON', data).then((response) => {
        res.json({ message: 'Admin created successfully', token });
        return;
      }).catch((error) => res.status(500).json({ error }));
    }
  })
    .catch((error) => {
      res.status(500).json({ error });
    })
});

app.post('/admin/login', (req, res) => {
  // logic to log in admin
  const { username, password } = req.headers;

  readFileData('./ADMINS.json')
    .then((data) => {
      const admins = data['ADMINS'];

      const verify = admins.find((admin) => admin.username === username && admin.password === password) || null;

      if (verify === null) {
        res.status(403).json({ message: 'invalid credentials' });
      } else {
        const token = generateTokenAdmin({ username, password });

        res.json({ message: 'Logged in successfully', token });
        return;
      }
    })
    .catch((error) => {
      res.status(500).json({ error: 'Internal server error' });
    });

});

app.post('/admin/courses', authenticateAdmin, (req, res) => {
  // logic to create a course
  const course = { ...req.body, id: Date.now() };

  readFileData('./COURSES.json')
    .then((data) => {
      data['COURSES'].push(course);
      return writeData('./COURSES.json', data);
    })
    .then((mssg) => {
      res.json({ message: 'Course created successfully', courseId: course.id });
    })
    .catch((error) => {
      res.status(500).json({ message: 'Internal server error' });
    });

});

app.put('/admin/courses/:courseId', authenticateAdmin, (req, res) => {
  // logic to edit a course
  const updatedCourse = req.body;
  const courseId = +req.params.courseId

  readFileData('./COURSES.json')
    .then((data) => {
      const courses = data['COURSES'];
      const course = courses.find((c) => c.id === courseId) || null;

      if (course !== null) {
        Object.assign(course, updatedCourse);
        console.log(courses);
        data['COURSES'] = courses;

        writeData('./COURSES.json', data)
          .then((mssg) => {
            res.json({ message: 'Course updated successfully' });
          })
          .catch((error) => {
            // Handle writeData error
            res.status(500).json({ error: 'Internal Server error : write' });
          });
      } else {
        res.status(404).json({ error: 'Course not found' });
      }
    })
    .catch((error) => {
      // Handle readFileData error
      res.status(500).json({ error: 'Internal Server error : read' });
    });
});

app.get('/admin/courses', authenticateAdmin, (req, res) => {
  // logic to get all courses
  readFileData('./COURSES.json')
    .then((data) => {
      res.json({ courses: data['COURSES'] });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Internal Server error' });
    })
});

// User routes
app.post('/users/signup', (req, res) => {
  // logic to sign up user
  const user = req.headers;

  readFileData('./USERS.json')
    .then((data) => {
      const users = data['USERS'];
      const check = users.find((u) => u.username === user.username) || null;

      if (check) {
        res.status(403).json({ message: 'user already exists! please login' });
      } else {
        user.purchased = [];
        users.push(user);
        data['USERS'] = users;

        const token = generateTokenUser(user);

        writeData('./USERS.json', data)
          .then((mssg) => {
            res.json({ message: 'user created successfully', token });
          })
          .catch((err) => {
            res.status(500).json({ message: 'internal server error : write' });
          })
      }

    })
    .catch((err) => {
      res.status(500).json({ message: 'internal server error : read' });
    })
});

app.post('/users/login', (req, res) => {
  // logic to log in user
  const { username, password } = req.headers;

  readFileData('./USERS.json')
    .then((data) => {
      const users = data['USERS'];
      const user = users.find((u) => u.username === username && u.password === password) || null;

      if (user === null) {
        res.status(403).json({ message: 'Invalid credentials' });
        return;
      }
      const token = generateTokenUser({ username, password });
      res.json({ message: 'Logged in successfully', token });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Internal server error: read' });
    });
});

app.get('/users/courses', authenticateUser, (req, res) => {
  // logic to list all courses
  readFileData('./COURSES.json')
    .then((data) => {
      const courses = data['COURSES'];
      const publishedCourses = courses.filter((course) => course.published === true);

      res.json({ courses: publishedCourses });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Internal server error: read' });
    })
});

app.post('/users/courses/:courseId', authenticateUser, (req, res) => {
  // logic to purchase a course
  const courseId = +req.params.courseId;
  readFileData('./COURSES.json')
    .then((data) => {
      const courses = data['COURSES'];
      const course = courses.find((c) => c.id === courseId) || null;

      if (course === null) {
        res.status(403).send("course doesn't exist");
      } else {
        readFileData('./USERS.json')
          .then((data) => {
            const users = data['USERS'];
            const user = users.find((u) => u.username === req.username);
            user.purchased.push(courseId);
            data['USERS'] = users;
            writeData('./USERS.json', data)
              .then((mssg) => {
                res.json({ message: 'Course purchased successfully' });
              })
              .catch((err) => {
                res.status(501).json({ error: 'server side error : write' });
              })
          })
          .catch((err) => {
            res.status(501).json({ error: 'server side error : read' });
          })
      }
    })
    .catch((err) => {
      res.status(501).json({ error: 'server side error : read' });
    })
});

app.get('/users/purchasedCourses', authenticateUser, (req, res) => {
  // logic to view purchased courses
  readFileData('./USERS.json')
    .then((data) => {
      const users = data['USERS'];
      const user = users.find((u) => u.username === req.username);
      readFileData('./COURSES.json')
        .then((data2) => {
          const courses = data2['COURSES'];
          const purchasedCourses = courses.filter((c) => user.purchased.includes(c.id));


          res.json({ purchasedCourses });
        })
        .catch((err) => {
          res.status(501).json({ error: 'server side error : read' });
        })
    })
    .catch((err) => {
      res.status(501).json({ error: 'server side error : read' });
    })
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
