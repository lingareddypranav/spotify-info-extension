let currentSongId = null;
let songTitle = '';  
let songArtist = '';

document.addEventListener('DOMContentLoaded', function () {
    const backendUrl = 'https://spotify-info-backend-production.up.railway.app';  // Replace with your live backend URL when deploying

    async function getSpotifyToken() {
        // Generate the OAuth URL
        const clientId = await fetch(`${backendUrl}/getSpotifyClientId`).then(res => res.json()).then(data => data.clientId);
        const redirectUri = chrome.identity.getRedirectURL();
        const scopes = 'user-read-playback-state user-read-currently-playing';

        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, function (redirectUrl) {
                if (chrome.runtime.lastError || redirectUrl.includes('error=')) {
                    reject('Error during OAuth');
                    return;
                }

                const accessToken = new URLSearchParams(new URL(redirectUrl).hash.substring(1)).get('access_token');
                resolve(accessToken);
            });
        });
    }


    async function getCurrentlyPlaying(accessToken) {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    
        if (response.status === 204 || response.status > 400) {
            document.getElementById('song-title').textContent = "No song playing";
            return;
        }
    
        const data = await response.json();
        songTitle = data.item.name;
        songArtist = data.item.artists.map(artist => artist.name).join(", ");
        const albumCoverUrl = data.item.album.images[0].url;  // Get the album cover image URL
        
        if (data.item.id !== currentSongId) {
            currentSongId = data.item.id;

            document.getElementById('song-title').textContent = songTitle;
            document.getElementById('song-artist').textContent = songArtist;
            document.getElementById('album-cover').src = albumCoverUrl;  // Set the album cover image

            document.getElementById('summary').textContent = ''; //reset view
            document.getElementById('learn-more').style.display = 'block';
        }
        
    }

    document.getElementById('learn-more').addEventListener('click', async () => {
        const refinedPrompt = `${songTitle} by ${songArtist}. Provide a factual summary of this song, including its release period, any interesting facts, and whether it has been famously sampled. Do not include conversational phrases or ask follow-up questions.`;
        const summary = await getOpenAISummary(refinedPrompt);
        document.getElementById('summary').textContent = summary;
        document.getElementById('learn-more').style.display = 'none';
    });

    async function getOpenAISummary(prompt) {
        const response = await fetch(`${backendUrl}/getOpenAISummary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
    
        const data = await response.json();
    
        // Check the content of `data` to ensure it is the summary string
        if (typeof data === 'string') {
            return data;  
        } else if (data && data.error) {
            throw new Error(data.error);  // Handle error returned by the backend
        } else {
            throw new Error('Unexpected response format');
        }
    }

    async function main() {
        try {
            const accessToken = await getSpotifyToken();
            await getCurrentlyPlaying(accessToken);

            setInterval(async () => {
                await getCurrentlyPlaying(accessToken);
            }, 5000); 
        } catch (error) {
            console.error(error);
            document.getElementById('song-title').textContent = "Error during Spotify login.";
        }
    }

    main();
});