import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { uid, name, phoneNumber, universityName, universityEmail, enrollmentNumber } = body;

    if (!uid || !name || !phoneNumber || !universityName || !universityEmail || !enrollmentNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if phone or email already registered
    const existingUser = await User.findOne({
      $or: [{ phoneNumber }, { universityEmail }],
    });

    if (existingUser) {
      // If it exists, update the user or return error
      // Since it's sign up, return error
      return NextResponse.json(
        { error: "Phone number or University Email is already registered." },
        { status: 400 }
      );
    }

    const newUser = await User.create({
      uid,
      name,
      phoneNumber,
      universityName,
      universityEmail,
      enrollmentNumber,
    });

    return NextResponse.json(
      { message: "Registration successful", user: newUser },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Register Error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
