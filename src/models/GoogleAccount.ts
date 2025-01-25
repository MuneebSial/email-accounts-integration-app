import mongoose, { Schema, Document } from "mongoose";

export interface IGoogleAccount extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  needsReauth: boolean;
  startHistoryId: string;
  historyId: string;
  watchExpiry: number;
}

const GoogleAccountSchema = new Schema<IGoogleAccount>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  picture: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiryDate: { type: Number, required: true },
  needsReauth: { type: Boolean, default: false },
  startHistoryId: { type: String },
  historyId: { type: String },
  watchExpiry: { type: Number },
});

export default mongoose.models.GoogleAccount ||
  mongoose.model<IGoogleAccount>("GoogleAccount", GoogleAccountSchema);
