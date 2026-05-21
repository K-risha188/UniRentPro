import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Listing from "@/models/Listing";

export async function GET() {
  try {
    await dbConnect();
    // Retrieve all active listings, sorted by newest first
    const listings = await Listing.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ listings }, { status: 200 });
  } catch (error: any) {
    console.error("API GET Listings Error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to fetch listings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { 
      title, 
      category, 
      price, 
      university, 
      ownerName, 
      ownerPhone, 
      ownerUid, 
      availableDate, 
      description, 
      imageColor 
    } = body;

    // Simple validation
    if (
      !title || 
      !category || 
      !price || 
      !university || 
      !ownerName || 
      !ownerPhone || 
      !ownerUid || 
      !availableDate || 
      !description || 
      !imageColor
    ) {
      return NextResponse.json(
        { error: "Please provide all required listing details." },
        { status: 400 }
      );
    }

    const listing = await Listing.create({
      title,
      category,
      price: Number(price),
      university,
      ownerName,
      ownerPhone,
      ownerUid,
      availableDate,
      description,
      imageColor
    });

    return NextResponse.json(
      { message: "Listing created successfully", listing },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API POST Listing Error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to save listing." },
      { status: 500 }
    );
  }
}
