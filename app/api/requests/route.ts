import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RentRequest from "@/models/Request";

// GET handler: Fetch requests filtered by listingId, ownerUid, or requesterUid
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listingId");
    const ownerUid = searchParams.get("ownerUid");
    const requesterUid = searchParams.get("requesterUid");

    const query: any = {};
    if (listingId) query.listingId = listingId;
    if (ownerUid) query.ownerUid = ownerUid;
    if (requesterUid) query.requesterUid = requesterUid;

    const requests = await RentRequest.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    console.error("GET requests error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST handler: Submit a new rental request
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { listingId, requesterUid, requesterName, requesterPhone, ownerUid } = body;

    if (!listingId || !requesterUid || !requesterName || !requesterPhone || !ownerUid) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if a request already exists for this listing and requester
    const existingRequest = await RentRequest.findOne({ listingId, requesterUid });
    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: "You have already requested to rent this item" },
        { status: 400 }
      );
    }

    const newRequest = await RentRequest.create({
      listingId,
      requesterUid,
      requesterName,
      requesterPhone,
      ownerUid,
      status: "pending"
    });

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error("POST request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create request" },
      { status: 500 }
    );
  }
}

// PATCH handler: Approve or decline a request
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { requestId, status } = body;

    if (!requestId || !status || !["approved", "declined"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status or request ID" },
        { status: 400 }
      );
    }

    const updatedRequest = await RentRequest.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedRequest });
  } catch (error: any) {
    console.error("PATCH request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update request" },
      { status: 500 }
    );
  }
}
