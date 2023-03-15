import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import { MongoClient } from "mongodb";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = process.env.PORT;

// const MONGO_URL = "mongodb://127.0.0.1";

const MONGO_URL = process.env.MONGO_URL;
export const client = new MongoClient(MONGO_URL);
await client.connect(); // call
console.log("Mongo is connected !!!  ");

//3rd party middle ware
app.use(express.json());
app.use(cors());

app.get("/", function (request, response) {
  response.send("🙋‍♂️, 🌏 🎊✨🤩");
});

// Endpoint to scrape product data from Amazon
app.get("/scrape-amazon-product/:keyword", async (req, res) => {
  const { keyword } = req.params;
  const amazonProductUrl = `https://www.amazon.com/s?k=${keyword}`;
  if (!amazonProductUrl) {
    return res.status(400).send("Please provide a valid Amazon product URL");
  }

  try {
    const scrapedData = await scrapeAmazonProduct(amazonProductUrl);
    const storeInDb = await client
      .db("b42wd2")
      .collection("webscrape")
      .insertOne(scrapedData[0]);
    const getData = await client
      .db("b42wd2")
      .collection("webscrape")
      .find({})
      .toArray();
    return res.send(getData.slice(-1));
  } catch (error) {
    console.error(error);
    return res.status(500).send("Failed to scrape product data");
  }
});

// Function to scrape product data from Amazon
const scrapeAmazonProduct = async (url) => {
  try {
    const response = await axios.get(url);

    const $ = cheerio.load(response.data);

    // Extract data using Cheerio selectors
    const products = $("div.s-result-item");
    const scrapedData = [];

    products.each((i, el) => {
      const productName = $(el).find("h2 a").text().trim();
      const productImage = $(el).find("img").attr("src");
      const productPrice = $(el)
        .find("span.a-price span.a-offscreen")
        .text()
        .trim();
      const productRating = $(el).find("span.a-icon-alt").text();
      // console.log("Name:", productName);
      // console.log("Price:", productPrice);
      // console.log("Rating:", productRating);
      // console.log("Image:", productImage);
      if (
        productName !== "" &&
        productPrice !== "" &&
        productRating !== "" &&
        productImage !== ""
      ) {
        scrapedData.push({
          name: productName,
          price: productPrice,
          rating: productRating,
          image: productImage,
        });
      }
    });
    // Return an array of objects containing the extracted data
    return scrapedData;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to scrape Amazon product data");
  }
};

// Start the Express server
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
