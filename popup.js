document.addEventListener('DOMContentLoaded', async () => {
    const content = document.getElementById('content');
    
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('youtube.com/watch')) {
            return;
        }
        
        // Send message to content script to get video info
        chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }, (response) => {
            if (chrome.runtime.lastError) {
                showError('Unable to connect to YouTube page. Please refresh the page.');
                return;
            }
            
            if (response && response.success) {
                displayVideoInfo(response.data);
            } else {
                showError('No video found on this page');
            }
        });
        
    } catch (error) {
        showError('Error accessing current tab');
    }
});

function displayVideoInfo(videoData) {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="video-info">
            <div class="video-title">${videoData.title || 'Unknown Title'}</div>
            <div class="video-duration">${videoData.duration || 'Unknown Duration'}</div>
        </div>
        
        <div class="download-section">
            <div class="section-title">📹 Video Formats</div>
            <div class="download-buttons">
                <button class="download-btn" id="btn-360p">360p MP4</button>
                <button class="download-btn" id="btn-720p">720p MP4</button>
                <button class="download-btn" id="btn-1080p">1080p MP4</button>
                <button class="download-btn" id="btn-1440p">1440p MP4</button>
            </div>
        </div>
        
        <div class="download-section">
            <div class="section-title">🎵 Audio Formats</div>
            <div class="download-buttons">
                <button class="download-btn" id="btn-mp3">MP3</button>
                <button class="download-btn" id="btn-m4a">M4A</button>
                <button class="download-btn" id="btn-webm">WebM Audio</button>
                <button class="download-btn" id="btn-wav">WAV</button>
            </div>
        </div>
        
        <div id="status"></div>
    `;

    // Attach listeners
    document.getElementById('btn-360p')?.addEventListener('click', () => downloadVideo('360p'));
    document.getElementById('btn-720p')?.addEventListener('click', () => downloadVideo('720p'));
    document.getElementById('btn-1080p')?.addEventListener('click', () => downloadVideo('1080p'));
    document.getElementById('btn-1440p')?.addEventListener('click', () => downloadVideo('1440p'));

    document.getElementById('btn-mp3')?.addEventListener('click', () => downloadAudio('mp3'));
    document.getElementById('btn-m4a')?.addEventListener('click', () => downloadAudio('m4a'));
    document.getElementById('btn-webm')?.addEventListener('click', () => downloadAudio('webm'));
    document.getElementById('btn-wav')?.addEventListener('click', () => downloadAudio('wav'));
}


async function downloadVideo(quality) {
    showStatus('Preparing download...', 'loading');
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { 
            action: 'downloadVideo', 
            quality: quality 
        }, (response) => {
            if (response && response.success) {
                showStatus('Download started!', 'success');
            } else {
                showStatus(response?.error || 'Download failed', 'error');
            }
        });
        
    } catch (error) {
        showStatus('Error initiating download', 'error');
    }
}

async function downloadAudio(format) {
    showStatus('Preparing audio download...', 'loading');
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { 
            action: 'downloadAudio', 
            format: format 
        }, (response) => {
            if (response && response.success) {
                showStatus('Audio download started!', 'success');
            } else {
                showStatus(response?.error || 'Audio download failed', 'error');
            }
        });
        
    } catch (error) {
        showStatus('Error initiating audio download', 'error');
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.className = `status ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                status.textContent = '';
                status.className = 'status';
            }, 3000);
        }
    }
}

function showError(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="not-youtube">
            <p>${message}</p>
        </div>
    `;
}