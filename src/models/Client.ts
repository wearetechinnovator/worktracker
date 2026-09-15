import mongoose, { Schema } from "mongoose";

const contactMemberSchema = new Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    designation: {
      type: String,
      default: "",
      trim: true,
    },
    label: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const clientSchema = new Schema(
  {
    id: {
      type: String,
      default: null,
    },

    qd_id: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    projects: {
      type: [String],
      default: [],
    },

    duration: {
      type: String,
      default: "",
    },

    contract_start_date: {
      type: Date,
      default: null,
    },

    contract_end_date: {
      type: Date,
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: [String],
      default: [],
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    contact_members: {
      type: [contactMemberSchema],
      default: [],
    },

    created_by: {
      type: Number,
      default: null,
    },

    created_on: {
      type: Date,
      default: Date.now,
    },

    modified_by: {
      type: Number,
      default: null,
    },

    modified_on: {
      type: Date,
      default: null,
    },

    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: false,
  }
);

const Client =
  mongoose.models.Client ||
  mongoose.model("Client", clientSchema);

export default Client;