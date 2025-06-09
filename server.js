/*
* =================================================================
* FILE: server.js (Root Directory)
* =================================================================
* This is the main entry point for the Node.js application.
* It initializes the Express server, connects to the database,
* defines middleware, and sets up the API routes.
*/

const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Connect to Database
connectDB();

// Init Middleware
// This allows us to accept JSON data in the body of requests.
app.use(express.json({ extended: false }));
// Enable Cross-Origin Resource Sharing so the frontend can communicate with this backend
app.use(cors());

// Define Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/ai', require('./routes/api/ai'));
app.use('/api/courses', require('./routes/api/courses'));
app.use('/api/users', require('./routes/api/users'));


app.get('/', (req, res) => res.send('Stellar Academy API is running...'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
