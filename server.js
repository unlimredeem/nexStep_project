const express = require('express');
const mongoose = require('mongoose');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const User = require('./models/admin.model');
const Form = require('./models/feedback.model');
const Response = require('./models/response.model');

const app = express();
const PORT = 3000;
const MONGO_URI = 'mongodb+srv://shauryaprabhakar097_db_user:darko7@learning.jqzdv2j.mongodb.net/';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', './layouts/main');

app.use(session({
    secret: 'mySecretKey123',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}));

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/login');
};

app.use((req, res, next) => {
    res.locals.user = req.session.userId;
    next();
});

app.get('/login', (req, res) => res.render('login', { title: 'Login' }));
app.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));

app.post('/auth/signup', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = await User.create({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        });
        req.session.userId = newUser._id;
        res.redirect('/');
    } catch (error) {
        res.send("Error creating user");
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({
            $or: [
                { email: req.body.email },
                { username: req.body.username }
            ]
        });

        if (user) {
            const isMatch = await bcrypt.compare(req.body.password, user.password);
            if (isMatch) {
                req.session.userId = user._id;
                return res.redirect('/dashboard');
            }
        }
        res.send("Invalid Credentials");
    } catch (error) {
        res.send("Login Error");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const userForms = await Form.find({ creator: req.session.userId });
        res.render('dashboard', {
            title: 'My Dashboard',
            forms: userForms
        });
    } catch (error) {
        res.send("Error loading dashboard");
    }
});

app.get('/create', isAuthenticated, (req, res) => {
    res.render('form-builder', { title: 'Create Form' });
});

app.post('/api/forms', isAuthenticated, async (req, res) => {
    try {
        const newForm = new Form({
            formName: req.body.formName,
            questions: req.body.questions,
            creator: req.session.userId
        });
        await newForm.save();
        res.redirect('/dashboard');
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

app.get('/feedback/:id', async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).send('Form not found');
        res.render('public-form', {
            title: form.formName,
            form: form,
            isPublic: true
        });
    } catch (error) {
        res.status(404).send('Invalid Form URL');
    }
});

app.post('/feedback/:id/submit', async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        const answersArray = form.questions.map((q, index) => ({
            questionLabel: q.label,
            answer: req.body.answers[index]
        }));
        await Response.create({
            formId: form._id,
            answers: answersArray
        });
        res.render('success', { title: 'Thank You' });
    } catch (error) {
        res.send("Error submitting form");
    }
});

app.get('/dashboard/analytics/:id', isAuthenticated, async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        const responses = await Response.find({ formId: req.params.id }).sort({ submittedAt: -1 });

        let stats = { total: responses.length, positive: 0, neutral: 0, negative: 0 };
        let allText = "";

        responses.forEach(r => {
            const textAnswers = r.answers.map(a => a.answer).join(" ");
            allText += " " + textAnswers;
            const analysis = sentiment.analyze(textAnswers);
            if (analysis.score > 0) stats.positive++;
            else if (analysis.score < 0) stats.negative++;
            else stats.neutral++;
        });

        const words = allText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
        const stopWords = ['the', 'and', 'is', 'to', 'in', 'it', 'of', 'for', 'this', 'a', 'an', 'i', 'my', 'very', 'was'];
        const wordCounts = {};

        words.forEach(word => {
            if (!stopWords.includes(word) && word.length > 2) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });

        const wordCloud = Object.keys(wordCounts)
            .map(key => ({ text: key, count: wordCounts[key] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20)
            .map(w => ({
                text: w.text,
                weight: w.count > 5 ? 'text-4xl' : w.count > 3 ? 'text-2xl' : 'text-sm',
                color: ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-red-500'][Math.floor(Math.random() * 4)]
            }));

        res.render('analytics', {
            title: 'Analytics',
            form,
            stats,
            wordCloud,
            recentFeedback: responses.slice(0, 5)
        });

    } catch (error) {
        res.redirect('/dashboard');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
