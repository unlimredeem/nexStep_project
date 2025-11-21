// const mongoose = require('mongoose');

// const adminSchema = new mongoose.Schema({
//     username: { type: String, required: true, unique: true },
//     password: { type: String, required: true }
// });

const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://shauryaprabhakar097_db_user:darko7@learning.jqzdv2j.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

// const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    label: String,
    type: { type: String, enum: ['text', 'rating', 'multiple-choice'] }
});

const formSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    formName: { type: String, required: true },
    questions: [questionSchema]
});

module.exports = mongoose.model('Form', formSchema);