const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const Product = require('./models/Product');

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully!"))
    .catch(err => console.error("MongoDB connection error:", err));

app.get('/api/test', (req, res) => {
    res.json({ message: "Backend Server successfully connected!" });
});

// Updated seed route (12 High-Performance Dynamic Products)
app.get('/api/products/seed', async (req, res) => {
    try {
        await Product.deleteMany({}); 

        const premiumCatalog = [
            // --- ELECTRONICS ---
            {
                name: "Nexus Mechanical Pro",
                description: "Hot-swappable tactile RGB custom build mechanical keyboard.",
                price: 180,
                category: "Electronics",
                image: "https://assets.mixkit.co/videos/preview/mixkit-mechanical-keyboard-keys-pressing-down-41224-large.mp4"
            },
            {
                name: "Titan Wireless Pods",
                description: "Intelligent active noise cancellation with ultra-bass driver arrays.",
                price: 110,
                category: "Electronics",
                image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600"
            },
            {
                name: "Quantum OLED Monitor",
                description: "240Hz ultra-wide workspace display built for flawless compiler layouts.",
                price: 650,
                category: "Electronics",
                image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600"
            },
            {
                name: "Streamline Desk Light",
                description: "Monitor screen bar with automatic ambient dimming sensors.",
                price: 75,
                category: "Electronics",
                image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600"
            },

            // --- ACCESSORIES ---
            {
                name: "Alpha Minimal Backpack",
                description: "Clean dual-compartment organizer with ballistic tech exterior.",
                price: 140,
                category: "Accessories",
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"
            },
            {
                name: "Modular Desk Mat",
                description: "Premium vegan leather texture workspace protector with alignment grids.",
                price: 55,
                category: "Accessories",
                image: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=500"
            },
            {
                name: "MagSafe Charger Stand",
                description: "Anodized aluminum 3-in-1 fast charging geometric array.",
                price: 90,
                category: "Accessories",
                image: "https://images.unsplash.com/photo-1622445262465-2481c4574875?w=600"
            },
            {
                name: "Carbon EDC Wallet",
                description: "Military-grade RFID blocking ultra-slim card retention vault.",
                price: 45,
                category: "Accessories",
                image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600"
            },

            // --- FASHION ---
            {
                name: "Fibre Active Hoodie",
                description: "Double-weave structural tech fibers engineered for long sessions.",
                price: 95,
                category: "Fashion",
                image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600"
            },
            {
                name: "Nomad Running Shell",
                description: "Windbreaker outer shell with hydro-phobic Nanotech element shield.",
                price: 125,
                category: "Fashion",
                image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500"
            },
            {
                name: "Chronograph Stealth Watch",
                description: "Matte black case with industrial minimalist dial markers.",
                price: 210,
                category: "Fashion",
                image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=600"
            },
            {
                name: "Knit Training Sneaker",
                description: "Breathable mesh geometric sole optimized for active movement.",
                price: 160,
                category: "Fashion",
                image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600"
            }
        ];

        await Product.insertMany(premiumCatalog);
        res.json({ message: `Successfully initialized ${premiumCatalog.length} structural retail assets.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});