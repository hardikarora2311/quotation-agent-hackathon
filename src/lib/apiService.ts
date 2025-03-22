// /lib/apiService.ts

/**
 * API response interface for the notify-suppliers endpoint
 */
interface NotifySuppliersResponse {
  meta: {
    success: boolean;
    code: string;
    message: string;
    isPaginated: boolean;
  };
  data: {
    seek_gst: string | null;
    seek_mobile: string | null;
    seek_gst_name: string | null;
    requirement_id: string;
    item_name: string | null;
    seek_item_qty_req: string | null;
    seek_item_del_day_req: string | null;
    seek_delivery_pin: string | null;
    suppliers: any | null;
  };
}

/**
 * Interface for the notify-suppliers request body
 */
interface NotifySuppliersRequest {
  seek_mobile: string;
  item_name: string;
  suppliers: Array<{
    supp_gst: string;
    supp_gst_name: string;
    supp_email?: string;
  }>;
  seek_gst?: string;
  seek_gst_name?: string;
  seek_item_qty_req?: string;
  seek_item_del_day_req?: string;
  seek_delivery_pin?: string;
}

/**
 * Interface for quotation items
 */
interface QuotationItem {
  description: string;
  moq: string;
  pricePerUnit: string;
  quantity: number;
  amount: string;
}

/**
 * Interface for the quotation data in our application format
 */
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

/**
 * Interface for API quotation data
 */
interface ApiQuotation {
  quotation_id: string;
  supplier_name: string;
  supplier_gst: string;
  supplier_address: string;
  supplier_email: string;
  supplier_registration_date: string;
  supplier_mobile: string;
  supp_item_qty_fulfilled: string;
  supp_item_del_day_fulfilled: string;
  supp_item_pin_fulfilled: string;
  supp_item_price: string;
  seeker_name: string;
  seeker_gst: string;
  seeker_mobile: string;
  seeker_email: string;
  seeker_address: string;
  seeker_item_name: string;
  seeker_quantity_required: string;
  quotation_received_at: string;
}

/**
 * Interface for fetchQuotations response
 */
interface FetchQuotationsResponse {
  meta: {
    success: boolean;
    code: string;
    message: string;
    isPaginated: boolean;
  };
  data: ApiQuotation[];
}

/**
 * Notifies suppliers about a quotation request
 * @param request Request data containing mobile, item name, and suppliers
 * @returns Promise with the API response
 */
export const notifySuppliers = async (
  request: NotifySuppliersRequest
): Promise<NotifySuppliersResponse> => {
  try {
    console.log(
      "Sending notification to suppliers:",
      JSON.stringify(request, null, 2)
    );

    const response = await fetch(
      "https://uat-loan.pice.one/rrr/notify-suppliers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pice-Platform": "WEB",
          "X-Pice-Api-Version": "2",
          "X-Pice-Device-Id": "6E7EVEBBE",
          "X-Pice-Location": "76.4567,78.5678",
          "X-Pice-App-Version": "79",
          "X-Pice-Language": "en",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log("Notification response:", responseData);

    return responseData;
  } catch (error) {
    console.error("Error notifying suppliers:", error);
    throw error;
  }
};

/**
 * Fetches quotations for a specific requirement
 * @param requirementId The requirement ID received from notifySuppliers
 * @returns Promise with the quotation data
 */
export const fetchQuotations = async (
  requirementId: string
): Promise<FetchQuotationsResponse> => {
  try {
    console.log(`Fetching quotations for requirement ID: ${requirementId}`);

    // Use the POST endpoint with the requirement_id in the request body
    const response = await fetch("https://uat-loan.pice.one/rrr/quotations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pice-Platform": "WEB",
        "X-Pice-Api-Version": "2",
        "X-Pice-Device-Id": "6E7EVEBBE",
        "X-Pice-Location": "76.4567,78.5678",
        "X-Pice-App-Version": "79",
        "X-Pice-Language": "en",
      },
      body: JSON.stringify({ requirement_id: requirementId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Quotations response:", data);

    return data;
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
export const mapQuotationsFromAPI = (
  apiQuotations: ApiQuotation[]
): Quotation[] => {
  return apiQuotations.map((quote) => ({
    id: quote.quotation_id,
    supplierName: quote.supplier_name,
    supplierGSTIN: quote.supplier_gst,
    supplierRegDate: quote.supplier_registration_date,
    supplierPhone: quote.supplier_mobile,
    supplierEmail: quote.supplier_email,
    supplierAddress: quote.supplier_address,
    seekerName: quote.seeker_name,
    seekerGSTIN: quote.seeker_gst,
    seekerPhone: quote.seeker_mobile,
    seekerEmail: quote.seeker_email,
    seekerAddress: quote.seeker_address,
    items: [
      {
        description: quote.seeker_item_name,
        moq: quote.seeker_quantity_required,
        pricePerUnit: `₹${quote.supp_item_price}`,
        quantity: parseInt(quote.seeker_quantity_required) || 1,
        amount: `₹${(
          parseInt(quote.supp_item_price) *
          (parseInt(quote.seeker_quantity_required) || 1)
        ).toFixed(2)}`,
      },
    ],
    totalAmount: `₹${(
      parseInt(quote.supp_item_price) *
      (parseInt(quote.seeker_quantity_required) || 1)
    ).toFixed(2)}`,
    date: quote.quotation_received_at.split(" ")[0],
    validTill: new Date(
      new Date(quote.quotation_received_at).getTime() + 30 * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
  }));
};

/**
 * For demo purposes, generate mock quotations without an API call
 * @param suppliers Array of selected suppliers
 * @param userData User data for the quotation
 * @returns Array of quotations
 */
export const generateMockQuotations = (
  suppliers: any[],
  userData: any
): Quotation[] => {
  return suppliers.map((supplier, index) => {
    const randomPrice = Math.floor(Math.random() * 5000) + 1000;
    const randomQuantity = Math.floor(Math.random() * 10) + 1;

    return {
      id: `QT-${Date.now()}-${index}`,
      supplierName: supplier.name,
      supplierGSTIN:
        supplier.details["GST Number"] || `29AAHCN${supplier.id}165F1Z2`,
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
            supplier.details["Products"] || "Product"
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
