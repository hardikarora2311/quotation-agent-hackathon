/**
 * Client-side service for scraping IndiaMart suppliers
 * This file uses fetch() instead of direct child_process execution
 */

/**
 * Scrapes IndiaMart for suppliers of a product in a location
 *
 * @param {string} product - The product to search for
 * @param {string} location - The location to search in
 * @returns {Promise<Array<Object>>} - Array of supplier objects
 */
export async function scrapeIndiaMart(product, location) {
  console.log(`Requesting IndiaMart data for ${product} in ${location}...`);

  try {
    // Sanitize inputs to prevent injection
    const sanitizedProduct = product.replace(/[^a-zA-Z0-9 ]/g, "");
    const sanitizedLocation = location.replace(/[^a-zA-Z0-9 ]/g, "");

    // Get the base URL from environment or construct it
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000");

    // Call our server-side API endpoint that runs the Python script
    const response = await fetch(`${baseUrl}/api/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scriptName: "scrape_indiamart.py",
        args: [sanitizedProduct, sanitizedLocation],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }

    const { result } = await response.json();

    // Validate response
    if (!Array.isArray(result)) {
      console.warn("Invalid response from scraper:", result);
      return [];
    }

    return result;
  } catch (error) {
    console.error("Error scraping IndiaMart:", error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

/**
 * Format supplier information for display
 * @param {Array<Object>} suppliers - List of supplier objects
 * @returns {string} - Formatted supplier information as markdown
 */
export function formatSupplierInfo(suppliers) {
  if (!suppliers || suppliers.length === 0) {
    return "No supplier information available.";
  }

  return suppliers
    .map((supplier, index) => {
      const contactDetails = supplier.contactDetails || {};
      const products = Array.isArray(supplier.products)
        ? supplier.products
        : [];

      return `
### Supplier ${index + 1}: ${supplier.name || "Unknown"}

**GST Number**: ${supplier.gstNumber || "Not available"}
**Products**: ${products.length > 0 ? products.join(", ") : "Not specified"}
**Price**: ${supplier.price || "Not available"}${
        supplier.unit ? "/" + supplier.unit : ""
      }
**IMAGE**: ${supplier.image || "Not available"}
**URL**: ${supplier.url || "Not available"}
${
  contactDetails.contactPerson
    ? `**Contact Person**: ${contactDetails.contactPerson}`
    : ""
}
${contactDetails.phone ? `**Phone**: ${contactDetails.phone}` : ""}
${contactDetails.whatsapp ? `**WhatsApp**: ${contactDetails.whatsapp}` : ""}
${contactDetails.email ? `**Email**: ${contactDetails.email}` : ""}
${contactDetails.address ? `**Address**: ${contactDetails.address}` : ""}
${
  contactDetails.businessType
    ? `**Business Type**: ${contactDetails.businessType}`
    : ""
}
${contactDetails.rating ? `**Rating**: ${contactDetails.rating}/5` : ""}
    `.trim();
    })
    .join("\n\n");
}
