import React from "react";

// Using the same interfaces as your existing QuotationViewer component
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

interface StyledQuotationPreviewProps {
  activeQuotation: Quotation;
}

const StyledQuotationPreview: React.FC<StyledQuotationPreviewProps> = ({
  activeQuotation,
}) => {
  return (
    <div className="bg-white text-gray-800 max-w-4xl mx-auto p-6 rounded-lg shadow-md">
      {/* Logo */}
      <div className="mb-12">
        <img src="/logo_img.png" alt="logo" className="h-[60px]" />
      </div>

      {/* Confetti Image */}
      <div className="text-center my-8">
        <img
          src="/confetti.png"
          alt="Decorative confetti with hexagon"
          className="max-w-full"
        />
      </div>

      {/* Celebration Text */}
      <div className="text-center my-10">
        <h2 className="text-2xl font-bold text-gray-700">
          Hurray! We have fetched a quotation for you
        </h2>
      </div>

      {/* Quotation Header */}
      <div className="mb-6">
        <div className="inline">
          <span className="text-2xl font-bold text-green-600">
            Product Quotation
          </span>
        </div>
        <div className="text-gray-500 mt-1">{activeQuotation.date}</div>
        <div className="text-gray-500 mt-1">
          Invoice No: {activeQuotation.id}
        </div>
      </div>

      {/* From/To Section */}
      <div className="flex flex-col md:flex-row justify-between my-8">
        <div className="w-full md:w-5/12 mb-6 md:mb-0">
          <h3 className="text-xl font-semibold text-orange-500 mb-3">From</h3>
          <div className="text-gray-700 leading-relaxed">
            <p>{activeQuotation.supplierName}</p>
            <p>{activeQuotation.supplierGSTIN}</p>
            <p>{activeQuotation.supplierPhone}</p>
            <p>{activeQuotation.supplierEmail}</p>
            <p>{activeQuotation.supplierAddress}</p>
          </div>
        </div>
        <div className="w-full md:w-5/12">
          <h3 className="text-xl font-semibold text-orange-500 mb-3">To</h3>
          <div className="text-gray-700 leading-relaxed">
            <p>{activeQuotation.seekerName}</p>
            <p>{activeQuotation.seekerPhone}</p>
            {/* {activeQuotation.seekerEmail && (
              <p>{activeQuotation.seekerEmail}</p>
            )} */}
            {/* <p>{activeQuotation.seekerAddress}</p> */}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto my-8">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left text-gray-700">Item Name</th>
              <th className="p-4 text-left text-gray-700">Item Quantity</th>
              <th className="p-4 text-left text-gray-700">Unit Price</th>
              <th className="p-4 text-right text-gray-700">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {activeQuotation.items && activeQuotation.items.length > 0 ? (
              activeQuotation.items.map((item, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="p-4 text-gray-700">{item.description}</td>
                  <td className="p-4 text-gray-700">{item.moq}</td>
                  <td className="p-4 text-gray-700">{item.pricePerUnit}</td>
                  <td className="p-4 text-right text-gray-700">
                    {item.amount}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="p-4 text-gray-500 text-center">
                  No items available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Total Section */}
      <div className="flex justify-between items-center my-6 pr-4">
        <div className="text-lg font-bold text-gray-700">
          TOTAL{" "}
          <span className="text-sm font-normal text-gray-500">
            (Estimated, exclusive of taxes)
          </span>
        </div>
        <div className="text-xl font-bold text-gray-700 text-right">
          {activeQuotation.totalAmount}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-gray-500 text-sm my-6">
        Actual prices may vary with estimated quotation and tax slabs
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-12 mb-8 pt-6 border-t border-gray-200">
        <div>
          <div className="text-xl font-semibold text-gray-700 mb-2">
            Questions?
          </div>
          <div className="text-gray-500">
            Reach us at +91-9177245754 | dhanraj@pice.one
          </div>
        </div>
        <div className="mt-4 md:mt-0">
          <a
            href="https://www.instagram.com/pice_404_designer/"
            target="_blank"
            rel="noreferrer"
            className="text-gray-700"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Generate More Link */}
      <div className="text-center mt-10 pt-6 border-t border-gray-200">
        <a
          href="http://www.piceapp.com"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          Generate another quotation at piceapp.com
        </a>
      </div>
    </div>
  );
};

export default StyledQuotationPreview;
