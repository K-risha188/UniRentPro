import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  uid: string;
  name: string;
  phoneNumber: string;
  universityName: string;
  universityEmail: string;
  enrollmentNumber: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  uid: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true, index: true },
  universityName: { type: String, required: true },
  universityEmail: { type: String, required: true, unique: true, index: true },
  enrollmentNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
