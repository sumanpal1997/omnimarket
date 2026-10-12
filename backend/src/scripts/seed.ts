import mongoose from "mongoose";
import { config } from "../config/env.js";
import { UserModel } from "../modules/users/model/user.model.js";
import { SellerModel } from "../modules/sellers/model/seller.model.js";
import { CategoryModel } from "../modules/categories/model/category.model.js";
import { BrandModel } from "../modules/brands/model/brand.model.js";
import { ProductModel } from "../modules/products/model/product.model.js";
import { InventoryModel } from "../modules/inventory/model/inventory.model.js";
import { PasswordUtil } from "../core/utils/password.util.js";
import { logger } from "../core/logger/logger.js";

async function seed() {
  try {
    logger.info("Connecting to MongoDB for seeding...");
    await mongoose.connect(config.MONGODB_URI);
    logger.info("Connected to MongoDB.");

    // 1. Create Admin Account
    const adminPasswordHash = await PasswordUtil.hash("Admin123!");
    let admin = await UserModel.findOne({ email: "admin@omnimarket.com" });
    if (!admin) {
      admin = await UserModel.create({
        email: "admin@omnimarket.com",
        passwordHash: adminPasswordHash,
        firstName: "System",
        lastName: "Admin",
        role: "ADMIN",
        status: "ACTIVE",
        isEmailVerified: true,
        addresses: [],
      });
      logger.info("Created Admin account: admin@omnimarket.com / Admin123!");
    }

    // 2. Create Customer Account with Sample Address
    const customerPasswordHash = await PasswordUtil.hash("Customer123!");
    let customer = await UserModel.findOne({ email: "customer@omnimarket.com" });
    if (!customer) {
      customer = await UserModel.create({
        email: "customer@omnimarket.com",
        passwordHash: customerPasswordHash,
        firstName: "Aarav",
        lastName: "Sharma",
        role: "CUSTOMER",
        status: "ACTIVE",
        isEmailVerified: true,
        phone: "+919876543210",
        addresses: [
          {
            label: "HOME",
            isDefault: true,
            street: "42 MG Road, Indiranagar",
            city: "Bengaluru",
            state: "Karnataka",
            postalCode: "560038",
            country: "India",
            phone: "+919876543210",
          },
        ],
      });
      logger.info("Created Customer account: customer@omnimarket.com / Customer123!");
    }

    // 3. Create Seller User & Store
    const sellerPasswordHash = await PasswordUtil.hash("Seller123!");
    let sellerUser = await UserModel.findOne({ email: "seller@omnimarket.com" });
    if (!sellerUser) {
      sellerUser = await UserModel.create({
        email: "seller@omnimarket.com",
        passwordHash: sellerPasswordHash,
        firstName: "Vikram",
        lastName: "Mehta",
        role: "SELLER",
        status: "ACTIVE",
        isEmailVerified: true,
        addresses: [],
      });
      logger.info("Created Seller user account: seller@omnimarket.com / Seller123!");
    }

    let seller = await SellerModel.findOne({ userId: sellerUser._id });
    if (!seller) {
      seller = await SellerModel.create({
        userId: sellerUser._id,
        storeName: "Apex Electronics Hub",
        slug: "apex-electronics",
        description: "Official authorized retailer for premium audio, computing & accessories.",
        commissionRate: 10,
        status: "ACTIVE",
        businessInfo: {
          legalName: "Apex Retail Solutions Private Limited",
          registrationNumber: "U72200KA2022PTC123456",
          taxId: "29AAAAA0000A1Z5",
          address: "Unit 401, Tech Towers, Electronic City, Bengaluru",
        },
        bankAccount: {
          bankName: "HDFC Bank",
          accountNumberMasked: "••••••••4321",
          routingCode: "HDFC0000123",
        },
      });
      logger.info("Created Active Merchant Profile: Apex Electronics Hub (/stores/apex-electronics)");
    }

    // 4. Create Taxonomy: Categories
    const categoriesData = [
      { name: "Electronics", slug: "electronics", ancestors: [] },
      { name: "Audio & Headphones", slug: "audio", ancestors: [] },
      { name: "Computers & Laptops", slug: "computers", ancestors: [] },
      { name: "Wearables & Smartwatches", slug: "wearables", ancestors: [] },
      { name: "Fashion & Apparel", slug: "fashion", ancestors: [] },
      { name: "Home & Smart Living", slug: "home-living", ancestors: [] },
    ];

    const categoryMap = new Map<string, any>();
    for (const cat of categoriesData) {
      let existingCat = await CategoryModel.findOne({ slug: cat.slug });
      if (!existingCat) {
        existingCat = await CategoryModel.create(cat);
      }
      categoryMap.set(cat.slug, existingCat);
    }
    logger.info("Taxonomy categories seeded.");

    // 5. Create Brands
    const brandsData = [
      { name: "Sony", slug: "sony" },
      { name: "Apple", slug: "apple" },
      { name: "Logitech", slug: "logitech" },
      { name: "Bose", slug: "bose" },
      { name: "Nike", slug: "nike" },
      { name: "Samsung", slug: "samsung" },
      { name: "Dyson", slug: "dyson" },
    ];

    const brandMap = new Map<string, any>();
    for (const br of brandsData) {
      let existingBrand = await BrandModel.findOne({ slug: br.slug });
      if (!existingBrand) {
        existingBrand = await BrandModel.create(br);
      }
      brandMap.set(br.slug, existingBrand);
    }
    logger.info("Brands seeded.");

    // 6. Create Demo Products & Allocate Concurrency Inventory
    const demoProducts = [
      {
        title: "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones",
        slug: "sony-wh-1000xm5-wireless-headphones",
        description:
          "Industry-leading noise cancellation with two processors and 8 microphones. Up to 30-hour battery life with quick charging. Crystal clear hands-free calling with 4 beamforming microphones.",
        categoryId: categoryMap.get("audio")._id,
        brandId: brandMap.get("sony")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.8, totalReviews: 42 },
        variants: [
          {
            sku: "SONY-WHXM5-BLK",
            title: "Midnight Black",
            priceMinor: 2999000, // ₹29,990.00
            compareAtPriceMinor: 3499000, // ₹34,990.00
            attributes: { Color: "Black", Edition: "Standard" },
            images: [],
            isActive: true,
          },
          {
            sku: "SONY-WHXM5-SLV",
            title: "Platinum Silver",
            priceMinor: 2999000,
            compareAtPriceMinor: 3499000,
            attributes: { Color: "Silver", Edition: "Standard" },
            images: [],
            isActive: true,
          },
        ],
      },
      {
        title: "Apple MacBook Pro 16-inch M3 Max (36GB Unified Memory, 1TB SSD)",
        slug: "apple-macbook-pro-16-m3-max",
        description:
          "The 16-inch MacBook Pro blasts forward with M3 Max, an extraordinarily advanced chip that brings serious performance and capabilities for the most extreme workflows. Up to 22 hours of battery life.",
        categoryId: categoryMap.get("computers")._id,
        brandId: brandMap.get("apple")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.9, totalReviews: 28 },
        variants: [
          {
            sku: "MBP-16-M3MAX-SPG",
            title: "Space Black / 36GB / 1TB",
            priceMinor: 34990000, // ₹3,49,900.00
            compareAtPriceMinor: 36990000,
            attributes: { Color: "Space Black", Storage: "1TB", RAM: "36GB" },
            images: [],
            isActive: true,
          },
        ],
      },
      {
        title: "Logitech MX Master 3S Performance Wireless Mouse",
        slug: "logitech-mx-master-3s-wireless-mouse",
        description:
          "Quiet clicks with 8K DPI any-surface tracking. MagSpeed electromagnetic scrolling for remarkable speed and precision. Ergonomic silhouette crafted for all-day comfort.",
        categoryId: categoryMap.get("electronics")._id,
        brandId: brandMap.get("logitech")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.7, totalReviews: 19 },
        variants: [
          {
            sku: "LOGI-MX3S-GRY",
            title: "Graphite",
            priceMinor: 899500, // ₹8,995.00
            compareAtPriceMinor: 1099500,
            attributes: { Color: "Graphite" },
            images: [],
            isActive: true,
          },
        ],
      },
      {
        title: "Bose QuietComfort Ultra Wireless Earbuds with Spatial Audio",
        slug: "bose-quietcomfort-ultra-wireless-earbuds",
        description:
          "Breakthrough spatialized audio for more immersive listening that makes your music feel more real than ever. CustomTune technology personalizes the sound shape to your ears.",
        categoryId: categoryMap.get("audio")._id,
        brandId: brandMap.get("bose")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.6, totalReviews: 34 },
        variants: [
          {
            sku: "BOSE-QCU-BLK",
            title: "Triple Black",
            priceMinor: 2590000, // ₹25,900.00
            compareAtPriceMinor: 2990000,
            attributes: { Color: "Black" },
            images: [],
            isActive: true,
          },
        ],
      },
      {
        title: "Apple Watch Ultra 2 GPS + Cellular 49mm Titanium Case",
        slug: "apple-watch-ultra-2-titanium",
        description:
          "The most rugged and capable Apple Watch ever. Designed for outdoor adventures and supercharged workouts with a lightweight titanium case, extra-long battery life, and the brightest display ever.",
        categoryId: categoryMap.get("wearables")._id,
        brandId: brandMap.get("apple")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.9, totalReviews: 64 },
        variants: [
          {
            sku: "AW-ULTRA2-ORG",
            title: "Titanium / Orange Alpine Loop",
            priceMinor: 8990000, // ₹89,900.00
            compareAtPriceMinor: 9490000,
            attributes: { Case: "49mm Titanium", Band: "Orange Alpine" },
            images: [],
            isActive: true,
          },
        ],
      },
      {
        title: "Nike Air Zoom Pegasus 40 Pro Running Sneakers",
        slug: "nike-air-zoom-pegasus-40-sneakers",
        description:
          "A springy ride for every run, the Peg's familiar, just-for-you feel returns to help you accomplish your goals. Dual Zoom Air units and React foam cushioning provide responsive energy return.",
        categoryId: categoryMap.get("fashion")._id,
        brandId: brandMap.get("nike")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.7, totalReviews: 88 },
        variants: [
          {
            sku: "NIKE-PEG40-RED-9",
            title: "Crimson Red / UK 9",
            priceMinor: 1189500, // ₹11,895.00
            compareAtPriceMinor: 1399500,
            attributes: { Color: "Crimson Red", Size: "UK 9" },
            images: [],
            isActive: true,
          },
          {
            sku: "NIKE-PEG40-RED-10",
            title: "Crimson Red / UK 10",
            priceMinor: 1189500,
            compareAtPriceMinor: 1399500,
            attributes: { Color: "Crimson Red", Size: "UK 10" },
            images: [],
            isActive: true,
          },
        ],
      },
      {
        title: "Samsung Odyssey OLED G9 49-Inch 240Hz Curved Gaming Monitor",
        slug: "samsung-odyssey-oled-g9-49-monitor",
        description:
          "Revolutionary Dual QHD 49-inch 1800R curved OLED panel with Neo Quantum Processor Pro, 0.03ms response time, and 240Hz refresh rate for unmatched ultra-wide immersion.",
        categoryId: categoryMap.get("computers")._id,
        brandId: brandMap.get("samsung")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.8, totalReviews: 31 },
        variants: [
          {
            sku: "SAM-G9-OLED-49",
            title: "49-inch Dual QHD 240Hz",
            priceMinor: 13999000, // ₹1,39,990.00
            compareAtPriceMinor: 17500000,
            attributes: { Size: "49-inch", RefreshRate: "240Hz" },
            images: [],
            isActive: true,
          },
        ],
      },
      {
        title: "Dyson V15 Detect Absolute Cordless Vacuum with Laser Illumination",
        slug: "dyson-v15-detect-cordless-vacuum",
        description:
          "Engineered with laser dust detection and acoustic piezo sensor technology that counts and sizes microscopic dust particles, automatically adapting suction power across floor types.",
        categoryId: categoryMap.get("home-living")._id,
        brandId: brandMap.get("dyson")._id,
        sellerId: seller._id,
        status: "APPROVED",
        images: [
          "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80",
        ],
        ratingSummary: { averageRating: 4.9, totalReviews: 53 },
        variants: [
          {
            sku: "DYSON-V15-GLD",
            title: "Nickel / Yellow Gold",
            priceMinor: 6590000, // ₹65,900.00
            compareAtPriceMinor: 7290000,
            attributes: { Finish: "Nickel Gold" },
            images: [],
            isActive: true,
          },
        ],
      },
    ];

    for (const prodData of demoProducts) {
      let product = await ProductModel.findOne({ slug: prodData.slug });
      if (!product) {
        product = await ProductModel.create(prodData);
        logger.info(`Created product: ${prodData.title}`);

        // Seed inventory for each variant
        for (const variant of prodData.variants) {
          await InventoryModel.findOneAndUpdate(
            { sku: variant.sku },
            {
              sku: variant.sku,
              productId: product._id,
              sellerId: seller._id,
              stock: 50,
              reserved: 0,
            },
            { upsert: true, new: true }
          );
          logger.info(`Initialized inventory for SKU ${variant.sku}: 50 units.`);
        }
      }
    }

    logger.info("🎉 Database seeding completed successfully!");
    logger.info("Demo Accounts Available:");
    logger.info("  Admin:    admin@omnimarket.com    / Admin123!");
    logger.info("  Seller:   seller@omnimarket.com   / Seller123!");
    logger.info("  Customer: customer@omnimarket.com / Customer123!");
  } catch (error) {
    logger.error({ error }, "❌ Error seeding database");
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB.");
  }
}

seed();
