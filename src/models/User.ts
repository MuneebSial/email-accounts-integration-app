import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
});

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
