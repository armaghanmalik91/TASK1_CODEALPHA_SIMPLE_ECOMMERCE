const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true }, 
    category: { type: String, required: true, default: "Electronics" }, // Category dynamic handling ke liye
    stock: { type: Number, required: true, default: 10 }
});

module.exports = mongoose.model('Product', productSchema);