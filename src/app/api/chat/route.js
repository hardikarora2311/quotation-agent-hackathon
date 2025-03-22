// Import the correct utilities
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";

// Import the client-side scraper service
import {
  scrapeIndiaMart,
  formatSupplierInfo,
} from "../../../lib/scraperService";

export const runtime = "edge";

// Define the prompt template for extracting product and location information
const extractionPrompt = PromptTemplate.fromTemplate(`
You are a helpful assistant that extracts information from user queries.
Extract the following information from the user's latest message AND consider any information from the previous conversation.

Previous conversation:
{chatHistory}

Latest user message: {query}

Please provide the product, location, quantity, pincode, and delivery days in JSON format. 
If any field is not specified in the current message but was mentioned in previous messages, include it.
If a field is not specified anywhere in the conversation, use null.

Example format (use double braces in actual implementation): 
{{
  "product": "cotton", 
  "location": "Delhi", 
  "quantity": "500 kg", 
  "pincode": "110001", 
  "deliveryDays": "7"
}}
`);

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const currentMessage = messages[messages.length - 1].content;

    // Initialize the language model
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
      streaming: true,
    });

    // Extract previous messages for chat history context
    const chatHistory = messages
      .slice(0, -1)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    // Create the extraction chain
    const extractionChain = RunnableSequence.from([
      extractionPrompt,
      model,
      new StringOutputParser(),
    ]);

    // Create a TextEncoder for streaming
    const encoder = new TextEncoder();

    // Create a ReadableStream that will carry our response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Extract information from the current message and chat history
          const extractionResult = await extractionChain.invoke({
            query: currentMessage,
            chatHistory: chatHistory,
          });

          console.log("Extraction result:", extractionResult);

          let extractedData;
          try {
            extractedData = JSON.parse(extractionResult);
            console.log("Parsed extracted data:", extractedData);
          } catch (e) {
            console.error("Error parsing extraction result:", e);
            extractedData = {
              product: null,
              location: null,
              quantity: null,
              pincode: null,
              deliveryDays: null,
            };
          }

          // Generate user-friendly values for display
          const productValue = extractedData.product || "unspecified product";
          const locationValue =
            extractedData.location || "unspecified location";
          const quantityValue =
            extractedData.quantity || "unspecified quantity";
          const pincodeValue = extractedData.pincode || "unspecified pincode";
          const deliveryDaysValue =
            extractedData.deliveryDays || "unspecified delivery timeframe";

          // Check if all required information is available
          if (
            extractedData.product &&
            extractedData.location &&
            extractedData.quantity &&
            extractedData.pincode &&
            extractedData.deliveryDays
          ) {
            // Let the user know we have all the information and are proceeding
            controller.enqueue(
              encoder.encode(
                `I have all the information I need:\n- Product: ${productValue}\n- Location: ${locationValue}\n- Quantity: ${quantityValue}\n- Pincode: ${pincodeValue}\n- Delivery timeframe: ${deliveryDaysValue}\n\nI'm now searching for suppliers. This might take a moment...\n\n`
              )
            );

            try {
              // Run the IndiaMart scraper
              const suppliers = await scrapeIndiaMart(
                productValue,
                locationValue
              );

              if (!suppliers || suppliers.length === 0) {
                controller.enqueue(
                  encoder.encode(
                    "I couldn't find any suppliers matching your criteria. Would you like to try a different product or location?\n\n"
                  )
                );
                controller.close();
                return;
              }

              controller.enqueue(
                encoder.encode(
                  `Found ${suppliers.length} suppliers with their details.\n\n`
                )
              );

              // Format the supplier information
              const supplierInfo = formatSupplierInfo(suppliers);

              // Add the additional information to the response for storing in local storage
              const infoForLocalStorage = JSON.stringify({
                product: productValue,
                location: locationValue,
                quantity: quantityValue,
                pincode: pincodeValue,
                deliveryDays: deliveryDaysValue,
              });

              // Stream the formatted supplier info
              controller.enqueue(
                encoder.encode(
                  `Here are the suppliers I found for ${productValue} in ${locationValue}:\n\n`
                )
              );

              // Add a special marker for the client to detect and store this information
              controller.enqueue(
                encoder.encode(`<!--STORE_INFO:${infoForLocalStorage}-->\n`)
              );

              // Stream the supplier info directly without splitting into chunks
              controller.enqueue(encoder.encode(supplierInfo + "\n\n"));

              controller.enqueue(
                encoder.encode(
                  "Would you like me to help you generate quotations from these suppliers?\n\n"
                )
              );
              controller.close();
            } catch (error) {
              console.error("Error during scraping:", error);
              controller.enqueue(
                encoder.encode(
                  "I encountered an error while searching for suppliers. Let's try again. Could you please verify the information you provided?\n\n"
                )
              );
              controller.close();
            }
          } else {
            // If any information is missing, ask for it
            let missingInfo = [];
            if (!extractedData.product) missingInfo.push("product");
            if (!extractedData.location) missingInfo.push("location");
            if (!extractedData.quantity) missingInfo.push("quantity required");
            if (!extractedData.pincode) missingInfo.push("delivery pincode");
            if (!extractedData.deliveryDays)
              missingInfo.push("delivery timeframe (in days)");

            let response;
            if (missingInfo.length === 1) {
              response = `I need one more piece of information: could you please provide the ${missingInfo[0]}?\n\n`;
            } else {
              const lastItem = missingInfo.pop();
              response = `I need a few more details: could you please provide the ${missingInfo.join(
                ", "
              )} and ${lastItem}?\n\n`;
            }

            // Add a summary of what we already know
            if (
              extractedData.product ||
              extractedData.location ||
              extractedData.quantity ||
              extractedData.pincode ||
              extractedData.deliveryDays
            ) {
              response += "Here's what I already know:\n";
              if (extractedData.product)
                response += `- Product: ${productValue}\n`;
              if (extractedData.location)
                response += `- Location: ${locationValue}\n`;
              if (extractedData.quantity)
                response += `- Quantity: ${quantityValue}\n`;
              if (extractedData.pincode)
                response += `- Pincode: ${pincodeValue}\n`;
              if (extractedData.deliveryDays)
                response += `- Delivery timeframe: ${deliveryDaysValue}\n`;
              response += "\n";
            }

            controller.enqueue(encoder.encode(response));
            controller.close();
          }
        } catch (error) {
          console.error("Error in chat processing:", error);
          controller.enqueue(
            encoder.encode(
              "I'm sorry, but I encountered an error while processing your request. Please try again.\n\n"
            )
          );
          controller.close();
        }
      },
    });

    // Return the stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error handling request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
