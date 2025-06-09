/*
* =================================================================
* FILE: routes/api/auth.js
* =================================================================
*/
const express_auth = require('express');
const router_auth = express_auth.Router();
const bcrypt_auth = require('bcryptjs');
const jwt_auth = require('jsonwebtoken');
const { check: check_auth, validationResult: validationResult_auth } = require('express-validator');
const User_auth = require('../../models/User');
const UserProfile_auth = require('../../models/UserProfile');

router_auth.post('/register', [
    check_auth('username', 'Username is required').not().isEmpty(),
    check_auth('email', 'Please include a valid email').isEmail(),
    check_auth('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
], async (req, res) => {
    const errors = validationResult_auth(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { username, email, password } = req.body;
    try {
        let user = await User_auth.findOne({ email });
        if (user) return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
        user = new User_auth({ username, email, password });
        const salt = await bcrypt_auth.genSalt(10);
        user.password = await bcrypt_auth.hash(password, salt);
        await user.save();
        const userProfile = new UserProfile_auth({ user: user.id });
        await userProfile.save();
        res.status(201).send('User registered');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router_auth.post('/login', [
    check_auth('email', 'Please include a valid email').isEmail(),
    check_auth('password', 'Password is required').exists(),
], async (req, res) => {
    const errors = validationResult_auth(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    try {
        let user = await User_auth.findOne({ email });
        if (!user) return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
        const isMatch = await bcrypt_auth.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
        const payload = { user: { id: user.id, role: user.role } };
        jwt_auth.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
module.exports = router_auth;


/*
* =================================================================
* FILE: routes/api/ai.js
* =================================================================
*/
const express_ai = require('express');
const router_ai = express_ai.Router();
const auth_ai = require('../../middleware/auth');
const fetch_ai = require('node-fetch');

router_ai.post('/generate', auth_ai, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ msg: 'Prompt is required' });
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    try {
        const geminiResponse = await fetch_ai(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Gemini API Error:", errorData);
            return res.status(geminiResponse.status).json({ msg: 'Error from Gemini API' });
        }
        const data = await geminiResponse.json();
        if (data.candidates && data.candidates.length > 0) {
            res.json(data.candidates[0].content.parts[0]);
        } else {
            res.status(500).json({ msg: 'No content generated' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
module.exports = router_ai;


/*
* =================================================================
* FILE: routes/api/courses.js
* =================================================================
*/
const express_courses = require('express');
const router_courses = express_courses.Router();
const Course_courses = require('../../models/Course');

router_courses.get('/', async (req, res) => {
    try {
        const courses = await Course_courses.find();
        res.json(courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router_courses;


/*
* =================================================================
* FILE: routes/api/users.js
* =================================================================
*/
const express_users = require('express');
const router_users = express_users.Router();
const auth_users = require('../../middleware/auth');
const UserProfile_users = require('../../models/UserProfile');
const Course_users = require('../../models/Course');

router_users.get('/me', auth_users, async (req, res) => {
    try {
        const profile = await UserProfile_users.findOne({ user: req.user.id }).populate('user', ['username', 'email']);
        if (!profile) return res.status(400).json({ msg: 'There is no profile for this user' });
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router_users.post('/enroll/:course_id', auth_users, async (req, res) => {
    try {
        const course = await Course_users.findById(req.params.course_id);
        if(!course) return res.status(404).json({ msg: 'Course not found' });
        const profile = await UserProfile_users.findOne({ user: req.user.id });
        if (profile.enrolledCourses.some(c => c.course.toString() === req.params.course_id)) {
            return res.status(400).json({ msg: 'User already enrolled in this course' });
        }
        profile.enrolledCourses.unshift({ course: req.params.course_id });
        await profile.save();
        res.json(profile);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router_users;
