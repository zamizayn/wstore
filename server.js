require('dotenv').config();

const express = require('express');
const cors = require('cors');

const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('WhatsApp Store Backend Running 🚀');
});

app.use('/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});