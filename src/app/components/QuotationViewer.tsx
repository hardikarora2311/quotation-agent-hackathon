"use client";

import React, { useState } from "react";
import {
  generateHTMLtoPDF,
  openQuotationInNewWindow,
} from "../../lib/pdfService";
import StyledQuotationPreview from "./StyledQuotationPreview";

interface QuotationItem {
  description: string;
  moq: string;
  pricePerUnit: string;
  quantity: number;
  amount: string;
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
  items: QuotationItem[];
  totalAmount: string;
  date: string;
  validTill: string;
}

interface QuotationViewerProps {
  quotations: Quotation[];
}

const QuotationViewer: React.FC<QuotationViewerProps> = ({ quotations }) => {
  const [selectedQuotation, setSelectedQuotation] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isViewingHtml, setIsViewingHtml] = useState<boolean>(false);

  if (!quotations || quotations.length === 0) {
    return (
      <div className="text-center text-gray-500 py-6">
        No quotations available
      </div>
    );
  }

  const activeQuotation = quotations[selectedQuotation];

  const generatePDF = async (quotation: Quotation) => {
    try {
      setIsDownloading(true);

      // Use the HTML template to PDF service
      await generateHTMLtoPDF(quotation);

      setIsDownloading(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setIsDownloading(false);
      alert("Error generating PDF. Please try again.");
    }
  };

  const viewHTMLQuotation = (quotation: Quotation) => {
    setIsViewingHtml(true);
    openQuotationInNewWindow(quotation);
    // Reset state after a short delay
    setTimeout(() => setIsViewingHtml(false), 1000);
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
      {/* Quotation tabs navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {quotations.map((quotation, index) => (
          <button
            key={quotation.id}
            onClick={() => setSelectedQuotation(index)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              selectedQuotation === index
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-700 hover:text-blue-600"
            }`}
          >
            {quotation.supplierName}
          </button>
        ))}
      </div>

      {/* Active quotation details */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {activeQuotation.supplierName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Quotation {activeQuotation.id}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => viewHTMLQuotation(activeQuotation)}
              disabled={isViewingHtml}
              className="px-4 cursor-pointer py-2 bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Preview as PDF
            </button>
            {/* <button
              onClick={() => generatePDF(activeQuotation)}
              disabled={isDownloading}
              className="px-4 cursor-pointer py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download PDF
                </>
              )}
            </button> */}
          </div>
        </div>

        {/* Quotation preview */}
        <StyledQuotationPreview activeQuotation={activeQuotation} />
      </div>
    </div>
  );
};

export default QuotationViewer;
