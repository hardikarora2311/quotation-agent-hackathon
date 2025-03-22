"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { notifySuppliers } from "../../lib/apiService";

interface SupplierDetails {
  [key: string]: string;
}

interface Supplier {
  id: number;
  name: string;
  details: SupplierDetails;
  image?: string;
  url?: string;
}

interface SupplierSelectorProps {
  content: string;
  textBefore: string;
  textAfter: string;
  parseSupplierInfo: (content: string) => Supplier[];
  imageError: { [key: string]: boolean };
  setImageError: React.Dispatch<
    React.SetStateAction<{ [key: string]: boolean }>
  >;
  onRequestQuotations: () => void;
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  content,
  textBefore,
  textAfter,
  parseSupplierInfo,
  imageError,
  setImageError,
  onRequestQuotations,
}) => {
  const suppliers = parseSupplierInfo(content);
  const [selectedSuppliers, setSelectedSuppliers] = useState<{
    [key: number]: boolean;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load selected suppliers from localStorage on component mount
  useEffect(() => {
    const storedSelections = localStorage.getItem("selectedSuppliers");
    if (storedSelections) {
      try {
        setSelectedSuppliers(JSON.parse(storedSelections));
      } catch (e) {
        console.error("Error loading selections from localStorage:", e);
      }
    }
  }, []);

  // Save selections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "selectedSuppliers",
      JSON.stringify(selectedSuppliers)
    );
  }, [selectedSuppliers]);

  // Toggle selection for a supplier
  const toggleSelection = (supplierId: number) => {
    setSelectedSuppliers((prev) => ({
      ...prev,
      [supplierId]: !prev[supplierId],
    }));
  };

  // Select or deselect all suppliers
  const toggleAll = () => {
    const allSelected = suppliers.every(
      (supplier) => selectedSuppliers[supplier.id]
    );
    const newSelections: { [key: number]: boolean } = {};

    suppliers.forEach((supplier) => {
      newSelections[supplier.id] = !allSelected;
    });

    setSelectedSuppliers(newSelections);
  };

  // Count selected suppliers
  const selectedCount = Object.values(selectedSuppliers).filter(Boolean).length;

  // Process the content to extract and store information markers if present
  useEffect(() => {
    const processContent = () => {
      const infoRegex = /<!--STORE_INFO:(.*?)-->/;
      const match = content.match(infoRegex);

      if (match && match[1]) {
        try {
          // Parse the JSON data
          const infoData = JSON.parse(match[1]);

          // Store in localStorage
          localStorage.setItem("productInfo", match[1]);
          localStorage.setItem("productName", infoData.product);
          localStorage.setItem("productLocation", infoData.location);
          localStorage.setItem("productQuantity", infoData.quantity);
          localStorage.setItem("deliveryPincode", infoData.pincode);
          localStorage.setItem("deliveryDays", infoData.deliveryDays);

          console.log(
            "Stored product information in SupplierSelector:",
            infoData
          );
        } catch (e) {
          console.error("Error parsing product information:", e);
        }
      }
    };

    processContent();
  }, [content]);

  // Function to detect and trim duplicated text
  const trimDuplicatedText = (text: string): string => {
    if (!text) return text;

    // Check if the text is duplicated (same text repeated)
    const halfLength = Math.floor(text.length / 2);
    const firstHalf = text.substring(0, halfLength);
    const secondHalf = text.substring(halfLength);

    // If the second half starts with the same content as the first half,
    // or if the text contains itself, return only the first half
    if (
      secondHalf.startsWith(firstHalf) ||
      text.indexOf(text.substring(0, Math.floor(text.length / 4))) >
        Math.floor(text.length / 4)
    ) {
      return firstHalf;
    }

    // Another approach: check for exact repetition
    for (let i = 1; i <= halfLength; i++) {
      const pattern = text.substring(0, i);
      if (text === pattern.repeat(Math.ceil(text.length / i))) {
        return pattern;
      }
    }

    return text;
  };

  // Handle the request quotations button click
  const handleRequestQuotations = async () => {
    try {
      setIsSubmitting(true);

      // Store the selected suppliers data
      const selectedData = suppliers.filter(
        (supplier) => selectedSuppliers[supplier.id]
      );

      localStorage.setItem(
        "selectedSuppliersData",
        JSON.stringify(selectedData)
      );

      // Prepare API request data
      const userMobile = localStorage.getItem("userMobile") || "9999999999";
      const userName = localStorage.getItem("userName") || "userName";

      // Use the original key "Products" as you've been using
      const productType =
        localStorage.getItem("productName") ||
        selectedData[0]?.details["Products"] ||
        "Product";

      // Get additional information from localStorage
      const quantity = localStorage.getItem("productQuantity") || "100";
      const deliveryDays = localStorage.getItem("deliveryDays") || "5";
      const deliveryPincode =
        localStorage.getItem("deliveryPincode") || "400001";

      // Create suppliers array for API using your original "GST Number" key
      const suppliersForAPI = selectedData.map((supplier) => {
        // Use the original key but provide a fallback
        const gst = supplier.details["GST Number"];
        console.log(`Supplier ${supplier.name} GST:`, gst);
        return {
          supp_gst: gst,
          supp_gst_name: supplier.name,
          supp_email: "supplier1@example.com", // Keeping your original value
        };
      });

      // Create request body with your original values and keys
      const requestBody = {
        seek_mobile: userMobile,
        item_name: productType,
        suppliers: suppliersForAPI,
        seek_gst: "29AAHCN8165F1Z2", // Keeping your original value
        seek_gst_name: userName, // Keeping your original value
        seek_item_qty_req: quantity,
        seek_item_del_day_req: deliveryDays,
        seek_delivery_pin: deliveryPincode,
      };

      console.log("Sending request with body:", requestBody);

      // Make API call using our service
      const responseData = await notifySuppliers(requestBody);

      // Check if the request was successful
      if (responseData.meta && responseData.meta.success) {
        // Store the requirement_id in localStorage
        if (responseData.data && responseData.data.requirement_id) {
          localStorage.setItem(
            "requirement_id",
            responseData.data.requirement_id
          );
        }

        // Call the parent component's onRequestQuotations function
        onRequestQuotations();
      } else {
        throw new Error(
          responseData.meta?.message || "Failed to contact suppliers"
        );
      }
    } catch (error) {
      console.error("Error contacting suppliers:", error);
      alert("There was an error contacting suppliers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process textBefore to remove any information markers
  const processTextBefore = (text: string) => {
    const infoRegex = /<!--STORE_INFO:(.*?)-->/;
    return text.replace(infoRegex, "");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Render text before suppliers list if it exists */}
      {textBefore && (
        <div className="whitespace-pre-wrap text-black">
          {processTextBefore(textBefore)}
        </div>
      )}

      {/* Selection controls */}
      <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg mb-3 border border-indigo-100 shadow-sm">
        <div className="flex items-center">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              id="select-all"
              className="h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              checked={
                suppliers.length > 0 &&
                suppliers.every((supplier) => selectedSuppliers[supplier.id])
              }
              onChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="ml-2 text-sm font-medium text-indigo-800"
            >
              Select All Suppliers
            </label>
          </div>
        </div>
        <div className="text-sm font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
          {selectedCount} of {suppliers.length} selected
        </div>
      </div>

      {/* Render all supplier cards */}
      <div className="grid grid-cols-1 gap-6">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className={`cursor-pointer bg-white rounded-xl shadow-md overflow-hidden border transition-all duration-300 flex flex-col md:flex-row
              ${
                selectedSuppliers[supplier.id]
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-gray-200 hover:shadow-lg"
              }`}
          >
            {/* Image Section - Square on the left */}
            <div
              className="w-full md:w-48 flex-shrink-0 relative"
              onClick={() => toggleSelection(supplier.id)}
            >
              {supplier.image && !imageError[supplier.id] ? (
                <div className="w-full h-full bg-slate-50 flex justify-center items-center border-b md:border-b-0 md:border-r border-gray-200">
                  <img
                    src={supplier.image || "/placeholder.svg"}
                    alt={supplier.name}
                    className="size-[192px] object-contain p-2"
                    onError={() =>
                      setImageError((prev) => ({
                        ...prev,
                        [supplier.id]: true,
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
                  <div className="flex flex-col items-center justify-center p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 text-indigo-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-xs text-indigo-400 mt-2">
                      No image available
                    </span>
                  </div>
                </div>
              )}

              {/* Verified badge if supplier has GST */}
              {supplier.details["GST Number"] && (
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Verified
                </div>
              )}
            </div>

            {/* Content Section - Details on the right */}
            <div
              className="p-5 flex-grow pl-8 md:pl-5"
              onClick={() => toggleSelection(supplier.id)}
            >
              <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center">
                {supplier.name}
                {selectedSuppliers[supplier.id] && (
                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </h3>
              <div className="space-y-2.5">
                {Object.entries(supplier.details).map(([key, value]) => (
                  <div key={key} className="text-sm flex">
                    <span className="font-medium text-indigo-700 min-w-[100px]">
                      {key}:
                    </span>
                    <span className="text-gray-800 ml-2 font-medium">
                      {key === "Products" ? trimDuplicatedText(value) : value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Visit GST verification link */}
              {supplier.details["GST Number"] && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <a
                    href={`https://piceapp.com/gst-number-search/${supplier.details["GST Number"]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show action buttons if suppliers are selected */}
      {selectedCount > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-5 rounded-lg mt-4 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-sm border border-indigo-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-800">
                {selectedCount} supplier{selectedCount !== 1 ? "s" : ""}{" "}
                selected
              </p>
              <p className="text-xs text-indigo-600">
                Ready to request quotations
              </p>
            </div>
          </div>
          <button
            className="px-5 py-2.5 cursor-pointer bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 shadow-md font-medium transition-all duration-200 flex items-center"
            onClick={handleRequestQuotations}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing Request...
              </span>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z"
                  />
                </svg>
                Request Quotations
              </>
            )}
          </button>
        </div>
      )}

      {/* Render text after suppliers list if it exists */}
      {textAfter && (
        <div className="whitespace-pre-wrap text-black mt-4">{textAfter}</div>
      )}
    </div>
  );
};

export default SupplierSelector;
