const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    qd_id: String,

    user_role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    },

    full_name: String,
    email: String,

    phone_number: {
        type: Number,
        default: null
    },

    password: String,
    
    profile_picture: {
        type: String,
        default: null
    },

    designation:{
        type: String,
        default: null
    },

    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'group',
        default: null
    },
    created_by:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    },
    modified_by:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    },
    isVerify: {
        type: Boolean,
        default: false
    },
    status: Boolean

}, {timestamps: true})

const userModel = new mongoose.model("users", userSchema);

module.exports = userModel;