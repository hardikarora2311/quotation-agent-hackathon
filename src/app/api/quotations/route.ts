// /app/api/quotations/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Interface for quotation items
interface QuotationItem {
  description: string;
  moq: string;
  pricePerUnit: string;
  quantity: number;
  amount: string;
}

// Interface for quotation data
interface Quotation {
  id: string;
  supplierName: string;
  supplierGSTIN: string;
  supplierRegDate: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  seekerName: string;
  seekerGSTIN: string;
  seekerPhone: string;
  seekerEmail: string;
  seekerAddress: string;
  items: QuotationItem[];
  totalAmount: string;
  date: string;
  validTill: string;
}

// Interface for supplier data
interface Supplier {
  id: number;
  name: string;
  details: {
    [key: string]: string;
  };
  image?: string;
  url?: string;
}

// Function to generate a random quotation for a supplier
function generateMockQuotation(supplier: Supplier, userData: any): Quotation {
  const randomPrice = Math.floor(Math.random() * 5000) + 1000;
  const randomQuantity = Math.floor(Math.random() * 10) + 1;

  return {
    id: `QT-${Date.now()}-${supplier.id}`,
    supplierName: supplier.name,
    supplierGSTIN: `29AADCB2230${supplier.id}1ZA`,
    supplierRegDate: "01/01/2020",
    supplierPhone: supplier.details["Contact"] || "9876543210",
    supplierEmail: `${supplier.name
      .toLowerCase()
      .replace(/\s+/g, ".")}@example.com`,
    supplierAddress:
      supplier.details["Address"] ||
      "123 Business Street, Industrial Area, India",
    seekerName: userData.name || "Customer",
    seekerGSTIN: "29AADCB2230M1ZX",
    seekerPhone: userData.phone || "9876543210",
    seekerEmail: `${
      userData.name?.toLowerCase().replace(/\s+/g, ".") || "customer"
    }@gmail.com`,
    seekerAddress:
      userData.address || "789 Customer Lane, Buyer District, India",
    items: [
      {
        description: `${
          supplier.details["Product Type"] || "Product"
        } - Premium Quality`,
        moq: `${Math.floor(Math.random() * 50) + 10} units`,
        pricePerUnit: `₹${randomPrice.toFixed(2)}`,
        quantity: randomQuantity,
        amount: `₹${(randomPrice * randomQuantity).toFixed(2)}`,
      },
    ],
    totalAmount: `₹${(randomPrice * randomQuantity).toFixed(2)}`,
    date: new Date().toLocaleDateString(),
    validTill: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
  };
}

// POST endpoint to request quotations
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const data = await req.json();
    const { suppliers, userData } = data;

    // In a real application, you would initiate a background process
    // to contact these suppliers and request quotations

    // For now, we'll just return a success response
    return NextResponse.json({
      success: true,
      message: `Quotation requests sent to ${suppliers.length} suppliers.`,
    });
  } catch (error) {
    console.error("Error processing quotation request:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process quotation request",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check for quotations
export async function GET(req: NextRequest) {
  try {
    // In a real application, you would check a database for completed quotations

    // Get the suppliers from the URL query parameter
    const url = new URL(req.url);
    const suppliersParam = url.searchParams.get("suppliers");
    const userDataParam = url.searchParams.get("userData");

    if (!suppliersParam) {
      return NextResponse.json(
        {
          success: false,
          message: "No suppliers specified",
        },
        { status: 400 }
      );
    }

    // Parse the suppliers
    const suppliers = JSON.parse(decodeURIComponent(suppliersParam));
    const userData = userDataParam
      ? JSON.parse(decodeURIComponent(userDataParam))
      : {};

    // Generate mock quotations
    const quotations = suppliers.map((supplier: Supplier) =>
      generateMockQuotation(supplier, userData)
    );

    // Return the quotations
    return NextResponse.json({
      success: true,
      quotations,
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch quotations",
      },
      { status: 500 }
    );
  }
}
