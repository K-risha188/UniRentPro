import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Lookup user in DB
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return NextResponse.json(
        { error: "No profile found associated with this phone number. Please complete Sign Up first." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    console.error("API Login Error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
