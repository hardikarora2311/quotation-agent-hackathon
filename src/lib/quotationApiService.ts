// /lib/quotationApiService.ts

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

/**
 * Send a request to suppliers for quotations
 * @param suppliers Array of selected suppliers
 * @param userData User data for the quotation
 * @returns Promise resolving to the API response
 */
export const requestQuotations = async (
  suppliers: Supplier[],
  userData: any
) => {
  try {
    // Prepare the request body
    const requestBody = {
      seek_mobile: userData.phone || "9999999999",
      item_name: suppliers[0]?.details["Product Type"] || "Product",
      suppliers: suppliers.map((supplier) => ({
        supp_gst: supplier.details["GSTIN"] || `29AAHCN${supplier.id}165F1Z2`,
        supp_gst_name: supplier.name,
      })),
    };

    // Make the API request
    const response = await fetch(
      "https://uat-loan.pice.one/rrr/notify-suppliers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to request quotations: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error requesting quotations:", error);
    throw error;
  }
};

/**
 * Fetch quotations from suppliers
 * @param requirementId The requirement ID received from notifySuppliers
 * @returns Promise resolving to the quotations
 */
export const fetchQuotations = async (requirementId: string) => {
  try {
    const response = await fetch(
      `https://uat-loan.pice.one/rrr/quotations/${requirementId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch quotations: ${response.status}`);
    }

    const data = await response.json();

    // Map the API response to our application format
    // This will need to be adjusted based on the actual API response structure
    if (data.meta && data.meta.success && data.data && data.data.quotations) {
      return mapQuotationsFromAPI(data.data.quotations);
    }

    return [];
  } catch (error) {
    console.error("Error fetching quotations:", error);
    throw error;
  }
};

/**
 * Maps the API quotation data to our application format
 * @param apiQuotations The quotations received from the API
 * @returns Formatted quotation data for our app
 */
const mapQuotationsFromAPI = (apiQuotations: any[]): Quotation[] => {
  // This function will need to be adjusted based on the actual API response structure
  return apiQuotations.map((q) => ({
    id: q.quotation_id || `QT-${Date.now()}`,
    supplierName: q.supplier_name,
    supplierGSTIN: q.supplier_gstin,
    supplierRegDate: q.registration_date || new Date().toLocaleDateString(),
    supplierPhone: q.supplier_phone,
    supplierEmail: q.supplier_email,
    supplierAddress: q.supplier_address,
    seekerName: q.seeker_name,
    seekerGSTIN: q.seeker_gstin,
    seekerPhone: q.seeker_phone,
    seekerEmail: q.seeker_email,
    seekerAddress: q.seeker_address,
    items: (q.items || []).map((item: any) => ({
      description: item.description,
      moq: item.moq,
      pricePerUnit: item.price_per_unit,
      quantity: item.quantity,
      amount: item.amount,
    })),
    totalAmount: q.total_amount,
    date: q.date,
    validTill: q.valid_till,
  }));
};

/**
 * For demo purposes, generate mock quotations without an API call
 * @param suppliers Array of selected suppliers
 * @param userData User data for the quotation
 * @returns Array of quotations
 */
export const generateMockQuotations = (
  suppliers: Supplier[],
  userData: any
): Quotation[] => {
  return suppliers.map((supplier, index) => {
    const randomPrice = Math.floor(Math.random() * 5000) + 1000;
    const randomQuantity = Math.floor(Math.random() * 10) + 1;

    return {
      id: `QT-${Date.now()}-${index}`,
      supplierName: supplier.name,
      supplierGSTIN:
        supplier.details["GSTIN"] || `29AAHCN${supplier.id}165F1Z2`,
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
      seekerEmail:
        userData.email ||
        `${
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
  });
};
