"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import SupplierSelector from "./components/SupplierSelector";
import QuotationViewer from "./components/QuotationViewer";
import { fetchQuotations, mapQuotationsFromAPI } from "../lib/apiService";
import { generateMockQuotations } from "../lib/quotationApiService";

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
  items: Array<{
    description: string;
    moq: string;
    pricePerUnit: string;
    quantity: number;
    amount: string;
  }>;
  totalAmount: string;
  date: string;
  validTill: string;
}

interface ProductInfo {
  product: string | null;
  location: string | null;
  quantity: string | null;
  pincode: string | null;
  deliveryDays: string | null;
}

export default function Chat() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [nameError, setNameError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [isQuotationRequested, setIsQuotationRequested] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [quotationError, setQuotationError] = useState("");
  const [supplierSelectionVisible, setSupplierSelectionVisible] =
    useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo>({
    product: null,
    location: null,
    quantity: null,
    pincode: null,
    deliveryDays: null,
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/chat",
    streamProtocol: "text",
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedMobile = localStorage.getItem("userMobile");

    if (storedName && storedMobile) {
      setName(storedName);
      setMobileNumber(storedMobile);
      setIsLoggedIn(true);
    }
  }, []);

  // Check if there's a pending quotation request in localStorage
  useEffect(() => {
    const quotationRequestStatus = localStorage.getItem(
      "quotationRequestStatus"
    );
    if (quotationRequestStatus === "pending") {
      setIsQuotationRequested(true);
    }
  }, []);

  // Process messages to extract and store product information
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Process the last assistant message for any special markers
      const lastAssistantMessage = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistantMessage) {
        const content = lastAssistantMessage.content;

        // Look for the information storage marker
        const infoRegex = /<!--STORE_INFO:(.*?)-->/;
        const match = content.match(infoRegex);

        if (match && match[1]) {
          try {
            // Parse the JSON data
            const infoData = JSON.parse(match[1]);

            // Update the state
            setProductInfo(infoData);

            // Store in localStorage
            localStorage.setItem("productInfo", match[1]);
            localStorage.setItem("productName", infoData.product);
            localStorage.setItem("productLocation", infoData.location);
            localStorage.setItem("productQuantity", infoData.quantity);
            localStorage.setItem("deliveryPincode", infoData.pincode);
            localStorage.setItem("deliveryDays", infoData.deliveryDays);

            console.log("Stored product information:", infoData);

            // Modify the displayed message to remove the marker
            const cleanedContent = content.replace(infoRegex, "");

            // Create a new messages array with the cleaned content
            const updatedMessages = messages.map((m) => {
              if (m.id === lastAssistantMessage.id) {
                return { ...m, content: cleanedContent };
              }
              return m;
            });

            // Update the messages state
            setMessages(updatedMessages);
          } catch (e) {
            console.error("Error parsing product information:", e);
          }
        }
      }
    }
  }, [messages, setMessages]);

  const validateForm = () => {
    let isValid = true;

    // Validate name
    if (!name.trim()) {
      setNameError("Please enter your name");
      isValid = false;
    } else {
      setNameError("");
    }

    // Validate mobile number - simple check for 10 digits
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      setMobileError("Please enter a valid 10-digit mobile number");
      isValid = false;
    } else {
      setMobileError("");
    }

    return isValid;
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validateForm()) {
      // Save to localStorage
      localStorage.setItem("userName", name);
      localStorage.setItem("userMobile", mobileNumber);
      setIsLoggedIn(true);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const [examples] = useState([
    "Cotton in Delhi",
    "Steel machinery in Mumbai",
    "Napkins in Bangalore",
    "Spices in Kerala",
    "Leather goods in Kanpur",
  ]);

  // Function to use an example
  const useExample = useCallback(
    (example: string) => {
      handleInputChange({
        target: { value: example },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [handleInputChange]
  );

  // Add state to track image errors
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

  // Function to safely parse supplier information
  const parseSupplierInfo = (content: string): Supplier[] => {
    try {
      const suppliers: Supplier[] = [];
      const supplierBlocks = content.split("### Supplier").slice(1);

      supplierBlocks.forEach((block, index) => {
        const lines = block.trim().split("\n");
        const nameMatch = lines[0].match(/\d+: (.+)/);
        if (!nameMatch) return;

        const supplier: Supplier = {
          id: index + 1,
          name: nameMatch[1].trim(),
          details: {},
        };

        lines.forEach((line) => {
          if (line.startsWith("**")) {
            const [key, ...valueParts] = line.replace(/\*\*/g, "").split(":");
            const value = valueParts.join(":").trim();

            if (key === "IMAGE") {
              supplier.image = value;
            } else if (key === "URL") {
              supplier.url = value;
            } else {
              supplier.details[key.trim()] = value;
            }
          }
        });

        suppliers.push(supplier);
      });

      return suppliers;
    } catch (error) {
      console.error("Error parsing supplier info:", error);
      return [];
    }
  };

  // Function to request quotations from selected suppliers
  const requestQuotations = async () => {
    try {
      // This function now only handles the UI flow, not the API call
      setIsLoadingQuotations(true);
      setIsQuotationRequested(true);
      setSupplierSelectionVisible(false);

      // Set the quotation request status in localStorage
      localStorage.setItem("quotationRequestStatus", "pending");

      // Add a message from the assistant about the quotation request
      const waitingMessage = {
        id: Date.now().toString(),
        role: "assistant" as const,
        content:
          "I'm contacting the selected suppliers to get quotations for you. This usually takes around 2 minutes. Please click the 'Check for Quotations' button to see if they're ready.",
      };

      setMessages([...messages, waitingMessage]);
      setIsLoadingQuotations(false);

      // SupplierSelector component will handle the actual API call and store the requirement_id
    } catch (error) {
      console.error("Error requesting quotations:", error);
      setQuotationError("Failed to request quotations");
      setIsLoadingQuotations(false);
    }
  };

  // Function to refresh and check for quotations
  // Function to refresh and check for quotations
  const refreshQuotations = async () => {
    try {
      setIsLoadingQuotations(true);
      setQuotationError("");

      // Get the requirement_id from localStorage
      const requirement_id = localStorage.getItem("requirement_id");

      if (!requirement_id) {
        setQuotationError("Quotation request not found");
        setIsLoadingQuotations(false);
        return;
      }

      console.log("Fetching quotations for requirement ID:", requirement_id);

      let fetchedQuotations: Quotation[] = [];

      try {
        // Make a single API call to fetch quotations using the requirement_id
        const response = await fetchQuotations(requirement_id);

        // Check if the request was successful
        if (response.meta && response.meta.success) {
          // Map the API response to our application's format
          fetchedQuotations = mapQuotationsFromAPI(response.data);
          console.log("Mapped quotations:", fetchedQuotations);
        } else {
          throw new Error(
            response.meta?.message || "Failed to fetch quotations"
          );
        }
      } catch (error) {
        console.error("API error:", error);

        // Get selected suppliers data from localStorage (for mock data generation)
        const selectedSuppliersData = localStorage.getItem(
          "selectedSuppliersData"
        );

        if (!selectedSuppliersData) {
          setQuotationError("No suppliers selected");
          setIsLoadingQuotations(false);
          return;
        }

        const selectedSuppliers = JSON.parse(selectedSuppliersData);

        if (selectedSuppliers.length === 0) {
          setQuotationError("No suppliers selected");
          setIsLoadingQuotations(false);
          return;
        }

        // Create user data object from localStorage
        const userData = {
          name: localStorage.getItem("userName"),
          phone: localStorage.getItem("userMobile"),
          email: `${localStorage
            .getItem("userName")
            ?.toLowerCase()
            .replace(/\s+/g, ".")}@gmail.com`,
          address: "Customer Address, City, State, India",
        };

        // Simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Generate quotations using our mock service as a fallback
        fetchedQuotations = generateMockQuotations(selectedSuppliers, userData);
      }

      setQuotations(fetchedQuotations);

      // Clear the pending status
      localStorage.removeItem("quotationRequestStatus");

      // Add a message from the assistant about the quotations
      const quotationsReadyMessage = {
        id: Date.now().toString(),
        role: "assistant" as const,
        content: `Great news! I've received quotations from ${
          fetchedQuotations.length
        } supplier${
          fetchedQuotations.length > 1 ? "s" : ""
        }. You can view the details below.`,
      };

      setMessages([...messages, quotationsReadyMessage]);

      setIsLoadingQuotations(false);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      setQuotationError("Failed to fetch quotations. Please try again.");
      setIsLoadingQuotations(false);
    }
  };

  // Helper function to process AI responses and extract information markers
  const processAIResponse = (content: string): string => {
    // Extract information markers if present
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
          "Stored product information in renderMessageContent:",
          infoData
        );

        // Remove the marker for display
        return content.replace(infoRegex, "");
      } catch (e) {
        console.error("Error parsing product information:", e);
      }
    }

    return content;
  };

  // Render message content based on type
  const renderMessageContent = (content: string) => {
    // Process the content to extract and store information
    const processedContent = processAIResponse(content);

    // Check if the processed content contains supplier information
    if (processedContent.includes("### Supplier")) {
      // Find all lines that contain "**URL**:" as these mark the end of each supplier section
      const lines = processedContent.split("\n");
      const firstSupplierIndex = processedContent.indexOf("### Supplier");
      const textBefore = processedContent
        .substring(0, firstSupplierIndex)
        .trim();

      // Find the last URL line index
      let lastURLLineIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes("**URL**:")) {
          lastURLLineIndex = i;
          break;
        }
      }

      // Extract text after the last supplier section
      let textAfter = "";
      if (lastURLLineIndex !== -1 && lastURLLineIndex < lines.length - 1) {
        textAfter = lines
          .slice(lastURLLineIndex + 1)
          .join("\n")
          .trim();
      }

      // Use the SupplierSelector component
      return (
        <SupplierSelector
          content={processedContent}
          textBefore={textBefore}
          textAfter={textAfter}
          parseSupplierInfo={parseSupplierInfo}
          imageError={imageError}
          setImageError={setImageError}
          onRequestQuotations={requestQuotations}
        />
      );
    }

    // If there are no suppliers, render the content as is
    return (
      <div className="whitespace-pre-wrap text-black">{processedContent}</div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden h-[85vh] border border-gray-200">
      {/* Header with gradient background */}
      <div className="p-6 bg-gradient-to-r from-indigo-900 to-indigo-700 border-b border-indigo-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 mr-3"
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
              SourceIt
            </h1>
            <p className="text-sm text-indigo-200 mt-2 ml-10">
              New Suppliers are just a click away
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="bg-indigo-800/50 px-3 py-1.5 rounded-full text-xs font-medium text-indigo-100 flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
              Secure Connection
            </div>
          </div>
        </div>
      </div>

      {/* Chat messages area with improved spacing and styling */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
        {messages.length > 0 ? (
          messages.map((m, index) => (
            <div key={m.id} className={`w-full ${index > 0 ? "mt-6" : ""}`}>
              {m.role === "assistant" ? (
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center mr-3 mt-1 flex-shrink-0 shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="max-w-[90%]">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border border-indigo-100 border-l-indigo-500">
                      {renderMessageContent(m.content)}
                    </div>
                    <p className="text-xs font-medium mt-1 text-indigo-700 ml-1">
                      FinSource AI
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-end">
                  <div className="max-w-[80%]">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl p-4 shadow-md">
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                    <p className="text-xs font-medium mt-1 text-gray-500 text-right mr-1">
                      You
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-800 to-indigo-900 flex items-center justify-center ml-3 mt-1 flex-shrink-0 shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            {isLoggedIn ? (
              <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto shadow-md border border-indigo-100">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-semibold mb-4 text-indigo-900">
                  Hi {name} 👋🏻 <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
                    How can I help you source products?
                  </span>
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Tell me what product you're looking for and where, and I'll
                  find suppliers for you from across India.
                </p>

                <div className="mt-8">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Try an example:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {examples.map((example, i) => (
                      <button
                        key={i}
                        onClick={() => useExample(example)}
                        className="cursor-pointer text-left px-4 py-3.5 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors text-sm text-indigo-700 font-medium shadow-sm hover:shadow-md flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2 text-indigo-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 max-w-md mx-auto shadow-lg border border-indigo-100">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800 text-center">
                  Get Started
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  I'll find suppliers for you from across India.
                </p>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1  text-left"
                    >
                      Your Name or Company Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 shadow-sm text-black"
                    />
                    {nameError && (
                      <p className="mt-1 text-sm text-red-600">{nameError}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="mobile"
                      className="block text-sm font-medium text-gray-700 mb-1 text-left"
                    >
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id="mobile"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 shadow-sm text-black"
                      maxLength={10}
                    />
                    {mobileError && (
                      <p className="mt-1 text-sm text-red-600">{mobileError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="cursor-pointer w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3.5 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-colors font-medium shadow-md"
                  >
                    Continue to Product Search
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    By continuing, you agree to our Terms of Service and Privacy
                    Policy.
                  </p>
                </form>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center mr-3 mt-1 flex-shrink-0 shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="max-w-[90%]">
              <div className="rounded-2xl p-5 bg-white text-gray-800 border-l-4 border border-indigo-100 border-l-indigo-500 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse"></div>
                  <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse delay-150"></div>
                  <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse delay-300"></div>
                </div>
              </div>
              <p className="text-xs font-medium mt-1 text-indigo-700 ml-1">
                FinSource AI
              </p>
            </div>
          </div>
        )}

        {/* Quotation Status and Controls */}
        {isQuotationRequested && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-100 mt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              {quotations.length > 0 ? (
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Quotations Received!
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    We've received {quotations.length} quotation
                    {quotations.length !== 1 ? "s" : ""} for you.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Quotation Request Pending
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    We're waiting for suppliers to respond. Check back in a
                    moment.
                  </p>
                </div>
              )}

              {quotationError && (
                <div className="text-sm bg-red-50 text-red-600 p-3 rounded-lg w-full text-center">
                  {quotationError}
                </div>
              )}

              <button
                onClick={refreshQuotations}
                disabled={isLoadingQuotations}
                className="cursor-pointer mt-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-colors font-medium disabled:opacity-50 flex items-center gap-2 shadow-md"
              >
                {isLoadingQuotations ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                    Checking for quotations...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {quotations.length > 0
                      ? "Refresh Quotations"
                      : "Check for Quotations"}
                  </>
                )}
              </button>
            </div>

            {/* Display Quotations */}
            {quotations.length > 0 && (
              <div className="mt-6">
                <QuotationViewer quotations={quotations} />
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area with improved styling */}
      <div className="p-5 bg-white border-t border-gray-200 shadow-inner">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault(); // Important: prevent default form submission
              handleSubmit(e);
            }}
            className="flex items-center space-x-3"
          >
            <input
              className="flex-1 border border-gray-300 rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 shadow-sm text-black"
              value={input}
              placeholder="What product are you looking for? (e.g., cotton in Delhi)"
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3.5 rounded-full disabled:opacity-50 hover:from-indigo-700 hover:to-indigo-800 transition-colors shadow-md flex items-center justify-center min-w-[120px] font-medium"
            >
              {isLoading ? (
                <span className="flex items-center">
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
                  Searching
                </span>
              ) : (
                <span className="flex items-center cursor-pointer">
                  Send
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4 ml-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
