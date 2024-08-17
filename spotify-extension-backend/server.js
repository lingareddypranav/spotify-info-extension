const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Spotify Extension Backend');
});

// Spotify OAuth Token Endpoint
app.post('/getSpotifyToken', async (req, res) => {
    const authOptions = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
        },
        data: 'grant_type=client_credentials'
    };

    try {
        const response = await axios(authOptions);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve Spotify token' });
    }
});

app.get('/getSpotifyClientId', (req, res) => {
    res.json({ clientId: process.env.SPOTIFY_CLIENT_ID });
});

// OpenAI API Endpoint
app.post('/getOpenAISummary', async (req, res) => {
    const { prompt } = req.body;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo", // Replace model if you're using another one
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 100,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const summary = response.data.choices[0].message.content.trim();
        res.json(summary);

    } catch (error) {
        console.error('OpenAI API error:', error.response ? error.response.data : error.message);

        res.status(500).json({ error: 'Failed to retrieve OpenAI summary' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});