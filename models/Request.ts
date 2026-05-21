import mongoose, { Schema, Document } from "mongoose";

export interface IRequest extends Document {
  listingId: mongoose.Types.ObjectId;
  requesterUid: string;
  requesterName: string;
  requesterPhone: string;
  ownerUid: string;
  status: "pending" | "approved" | "declined";
  createdAt: Date;
}

const RequestSchema: Schema = new Schema({
  listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
  requesterUid: { type: String, required: true, index: true },
  requesterName: { type: String, required: true },
  requesterPhone: { type: String, required: true },
  ownerUid: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ["pending", "approved", "declined"], 
    default: "pending",
    index: true 
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Request || mongoose.model<IRequest>("Request", RequestSchema);
