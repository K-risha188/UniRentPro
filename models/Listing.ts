import mongoose, { Schema, Document } from "mongoose";

export interface IListing extends Document {
  title: string;
  category: string;
  price: number;
  university: string;
  ownerName: string;
  ownerPhone: string;
  ownerUid: string;
  availableDate: string;
  description: string;
  imageColor: string;
  createdAt: Date;
}

const ListingSchema: Schema = new Schema({
  title: { type: String, required: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true },
  university: { type: String, required: true, index: true },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  ownerUid: { type: String, required: true, index: true },
  availableDate: { type: String, required: true },
  description: { type: String, required: true },
  imageColor: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);
