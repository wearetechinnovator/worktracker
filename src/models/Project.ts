import mongoose, { Schema } from "mongoose";
import { number } from "motion";

const projectSchema = new Schema({
  name: String,
  short_description: String,

  project_users: Array,
  start_date: {
    type: Date,
    default: Date.now()
  },
  end_date: Date,
  client: String,

  created_by: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },


  modified_by: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },


  status: Boolean,
},
  { timestamps: true, });

const Project =
  mongoose.models.Project ||
  mongoose.model("Project", projectSchema);

export default Project;
