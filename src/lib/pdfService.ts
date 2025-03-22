import { jsPDF } from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";

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

/**
 * Generates a PDF quotation document using jsPDF
 * @param quotation The quotation data
 * @returns The filename of the generated PDF
 */
export const generateQuotationPDF = (quotation: Quotation): string => {
  // Create a new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Set font
  doc.setFont("helvetica");

  // Add header
  doc.setFillColor(41, 98, 255);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("QUOTATION", pageWidth / 2, 15, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Add quotation details
  doc.setFontSize(12);
  doc.text(`Quotation #: ${quotation.id}`, 15, 40);
  doc.text(`Date: ${quotation.date}`, pageWidth - 15, 40, { align: "right" });
  doc.text(`Valid Till: ${quotation.validTill}`, pageWidth - 15, 48, {
    align: "right",
  });

  // Add supplier info
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("From", 15, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const supplierInfo = [
    quotation.supplierName,
    `GSTIN: ${quotation.supplierGSTIN}`,
    `Phone: ${quotation.supplierPhone}`,
    `Email: ${quotation.supplierEmail}`,
    `Address: ${quotation.supplierAddress}`,
  ];
  let y = 70;
  supplierInfo.forEach((line) => {
    doc.text(line, 15, y);
    y += 8;
  });

  // Add customer info
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("To", pageWidth - 15, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const customerInfo = [
    quotation.seekerName,
    `Phone: ${quotation.seekerPhone}`,
    `Email: ${quotation.seekerEmail}`,
    `Address: ${quotation.seekerAddress}`,
  ];
  y = 70;
  customerInfo.forEach((line) => {
    doc.text(line, pageWidth - 15, y, { align: "right" });
    y += 8;
  });

  // Add items table
  const startY = Math.max(y, 110);

  // @ts-ignore - jspdf-autotable is not properly typed
  doc.autoTable({
    startY: startY,
    head: [["Description", "MOQ", "Price/Unit", "Quantity", "Amount"]],
    body: quotation.items.map((item) => [
      item.description,
      item.moq,
      item.pricePerUnit,
      item.quantity,
      item.amount,
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    foot: [["", "", "", "Total", quotation.totalAmount]],
    footStyles: {
      fillColor: [240, 240, 240],
      fontStyle: "bold",
    },
  });

  // Add terms and conditions
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Terms and Conditions", 15, finalY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const terms = [
    "1. Prices are valid for the duration specified above.",
    "2. Delivery time: 3-4 weeks from the date of confirmed order.",
    "3. Payment terms: 50% advance, 50% before dispatch.",
    "4. Prices are subject to change based on material costs at the time of order confirmation.",
    "5. GST will be charged extra as applicable.",
    "6. Warranty as per manufacturer terms.",
  ];

  let termsY = finalY + 10;
  terms.forEach((term) => {
    doc.text(term, 15, termsY);
    termsY += 7;
  });

  // Add signature area
  doc.setFontSize(12);
  doc.text("For " + quotation.supplierName, 15, termsY + 20);
  doc.line(15, termsY + 40, 80, termsY + 40);
  doc.text("Authorized Signatory", 15, termsY + 50);

  // Generate the filename
  const fileName = `Quotation_${quotation.supplierName.replace(
    /\s+/g,
    "_"
  )}_${quotation.date.replace(/\//g, "-")}.pdf`;

  // Save the PDF
  doc.save(fileName);

  return fileName;
};

/**
 * Generates HTML content for a quotation using the custom template
 * @param quotation The quotation data
 * @returns HTML string for the quotation
 */
export const generateQuotationHTML = (quotation: Quotation): string => {
  // Format the item rows
  let itemRows = "";
  quotation.items.forEach((item) => {
    itemRows += `
      <tr>
        <td>${item.description}</td>
        <td>${item.moq}</td>
        <td>${item.pricePerUnit}</td>
        <td>${item.amount}</td>
      </tr>
    `;
  });

  // Format the date
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pice Invoice</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: white;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .logo {
            margin-bottom: 50px;
        }
        .logo img {
            height: 60px;
        }
        .celebration {
            text-align: center;
            margin: 40px 0;
            font-size: 24px;
            color: #333;
        }
        .confetti {
            text-align: center;
            margin: 30px 0;
            position: relative;
        }
        .confetti img {
            max-width: 100%;
            height: auto;
        }
        .quotation-header {
            margin-bottom: 20px;
        }
        .quotation-title {
            color: #4CAF50;
            font-size: 24px;
            font-weight: bold;
            display: inline;
        }
        .seeker-name {
            font-size: 24px;
            margin-left: 10px;
            color: #333;
        }
        .date {
            color: #666;
            margin-top: 5px;
        }
        .quotation-id {
            color: #666;
            margin-top: 5px;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
        }
        .from, .to {
            width: 45%;
        }
        .from h3, .to h3 {
            color: #FF9800;
            margin-bottom: 10px;
        }
        .party-details {
            line-height: 1.6;
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f5f5f5;
            padding: 15px;
            text-align: left;
            color: #333;
        }
        th:last-child {
            text-align: right;
        }
        td {
            padding: 15px;
            border-top: 1px solid #ddd;
            color: #333;
        }
        td:last-child {
            text-align: right;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 20px 0;
            padding-right: 15px;
        }
        .total-label {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .estimated {
            color: #666;
            font-size: 14px;
            margin-left: 5px;
        }
        .total-amount {
            color: #333;
            font-weight: bold;
            text-align: right;
            font-size: 18px;
        }
        .disclaimer {
            color: #666;
            margin: 10px 0 50px 0;
            font-size: 14px;
        }
        .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        .questions {
            font-size: 20px;
            margin-bottom: 10px;
            color: #333;
        }
        .contact {
            color: #666;
        }
        .social-icons a {
            margin-left: 10px;
        }
        .social-icons svg {
            fill: #333;
        }
        .generate-more {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .generate-more a {
            color: #5757ff;
            text-decoration: none;
            font-size: 16px;
        }
        .generate-more a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="logo">
        <img src="/logo_img.png" alt="Pice Logo">
    </div>

    <div class="confetti">
        <img src="/confetti.png" alt="Decorative confetti with hexagon">
    </div>

    <div class="celebration">
        Hurray! We have fetched a quotation for you
    </div>

    <div class="quotation-header">
        <div class="quotation-title">Product Quotation</div>
        <div class="date">${formattedDate}</div>
        <div class="quotation-id">Invoice No: ${quotation.id}</div>
    </div>

    <div class="parties">
        <div class="from">
            <h3>From</h3>
            <div class="party-details">
                ${quotation.supplierName}<br>
                ${quotation.supplierPhone}
            </div>
        </div>
        <div class="to">
            <h3>To</h3>
            <div class="party-details">
                ${quotation.seekerName}<br>
                ${quotation.seekerPhone}<br>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Item Name</th>
                <th>Item Quantity<br></th>
                <th>Unit Price</th>
                <th>Total Amount</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows}
        </tbody>
    </table>

    <div class="total-row">
        <div class="total-label">
            TOTAL <span class="estimated">(Estimated, exclusive of taxes)</span>
        </div>
        <div class="total-amount">${quotation.totalAmount}</div>
    </div>

    <div class="disclaimer">
        Actual prices may vary with estimated quotation and tax slabs
    </div>

    <div class="footer">
        <div>
            <div class="questions">Questions?</div>
            <div class="contact">Reach us at +91-9177245754| dhanraj@pice.one</div>
        </div>
        <div class="social-icons">
            <a href="https://www.instagram.com/pice_404_designer/" target="_blank">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#333">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
            </a>
        </div>
    </div>

    <div class="generate-more">
        <a href="http://www.piceapp.com" target="_blank">Generate another quotation at piceapp.com</a>
    </div>
</body>
</html>`;
};

/**
 * Generates a PDF from the custom HTML template
 * @param quotation The quotation data
 * @returns Promise resolving with the filename of the generated PDF
 */
export const generateHTMLtoPDF = async (
  quotation: Quotation
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate the HTML content
      const htmlContent = generateQuotationHTML(quotation);

      // Create a temporary container to render the HTML
      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);

      // Wait for any images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Use html2canvas to render the HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
      });

      // Remove the temporary container
      document.body.removeChild(container);

      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add the canvas as an image to the PDF
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add the image to the PDF
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // If the content is longer than one page, add more pages
      if (imgHeight > pdf.internal.pageSize.getHeight()) {
        let remainingHeight = imgHeight;
        let position = -pdf.internal.pageSize.getHeight();

        while (remainingHeight > 0) {
          position += pdf.internal.pageSize.getHeight();
          remainingHeight -= pdf.internal.pageSize.getHeight();

          if (remainingHeight > 0) {
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          }
        }
      }

      // Generate the filename
      const fileName = `Quotation_${quotation.supplierName.replace(
        /\s+/g,
        "_"
      )}_${quotation.date.replace(/\//g, "-")}.pdf`;

      // Save the PDF
      pdf.save(fileName);

      resolve(fileName);
    } catch (error) {
      console.error("Error generating PDF from HTML:", error);
      reject(error);
    }
  });
};

/**
 * Opens a quotation in a new window using the custom HTML template
 * @param quotation The quotation data
 */
export const openQuotationInNewWindow = (quotation: Quotation): void => {
  const htmlContent = generateQuotationHTML(quotation);
  const newWindow = window.open("", "_blank");

  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    newWindow.focus();
  } else {
    alert("Please allow pop-ups for this website to view the quotation.");
  }
};
