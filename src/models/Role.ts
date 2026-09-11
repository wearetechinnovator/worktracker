const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: String,
    short_description: String,

    created_by:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    modified_by:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    status: Boolean

}, {timestamps: true})


const Role =
    mongoose.models.Role ||
    mongoose.model("Role", roleSchema);

export default Role;