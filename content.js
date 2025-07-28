// YouTube Video Downloader Content Script

class YouTubeDownloader {
    constructor() {
        this.videoData = null;
        this.init();
    }

    init() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getVideoInfo') {
                this.getVideoInfo().then(sendResponse);
                return true; // Will respond asynchronously
            } else if (request.action === 'downloadVideo') {
                this.downloadVideo(request.quality).then(sendResponse);
                return true;
            } else if (request.action === 'downloadAudio') {
                this.downloadAudio(request.format).then(sendResponse);
                return true;
            }
        });
    }

    async getVideoInfo() {
        try {
            const videoId = this.extractVideoId();
            if (!videoId) {
                return { success: false, error: 'No video ID found' };
            }

            const title = this.getVideoTitle();
            const duration = this.getVideoDuration();

            this.videoData = {
                videoId,
                title,
                duration,
                url: window.location.href
            };

            return {
                success: true,
                data: this.videoData
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    extractVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    getVideoTitle() {
        const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer') ||
                           document.querySelector('h1.title') ||
                           document.querySelector('[data-title]') ||
                           document.querySelector('title');
        
        return titleElement ? titleElement.textContent.trim() : 'Unknown Title';
    }

    getVideoDuration() {
        const durationElement = document.querySelector('.ytp-time-duration') ||
                              document.querySelector('[data-duration]');
        
        return durationElement ? durationElement.textContent.trim() : 'Unknown Duration';
    }

    async downloadVideo(quality) {
        try {
            if (!this.videoData) {
                await this.getVideoInfo();
            }

            const downloadUrl = await this.getVideoDownloadUrl(quality);
            if (!downloadUrl) {
                return { success: false, error: `${quality} format not available` };
            }

            const filename = this.sanitizeFilename(`${this.videoData.title}_${quality}.mp4`);
            
            // Send download request to background script
            chrome.runtime.sendMessage({
                action: 'download',
                url: downloadUrl,
                filename: filename
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async downloadAudio(format) {
        try {
            if (!this.videoData) {
                await this.getVideoInfo();
            }

            const downloadUrl = await this.getAudioDownloadUrl(format);
            if (!downloadUrl) {
                return { success: false, error: `${format} format not available` };
            }

            const filename = this.sanitizeFilename(`${this.videoData.title}_audio.${format}`);
            
            // Send download request to background script
            chrome.runtime.sendMessage({
                action: 'download',
                url: downloadUrl,
                filename: filename
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getVideoDownloadUrl(quality) {
        try {
            // This is a simplified approach - in reality, you'd need to parse YouTube's player response
            // and extract the appropriate stream URLs based on the quality requested
            
            const playerResponse = await this.getPlayerResponse();
            if (!playerResponse) return null;

            const formats = playerResponse.streamingData?.formats || [];
            const adaptiveFormats = playerResponse.streamingData?.adaptiveFormats || [];
            
            // Quality mapping
            const qualityMap = {
                '360p': ['18', '134'],
                '720p': ['22', '136'],
                '1080p': ['137'],
                '1440p': ['271'],
                '2160p': ['313']
            };

            const targetItags = qualityMap[quality] || [];
            
            // Look for the requested quality in formats
            for (const format of [...formats, ...adaptiveFormats]) {
                if (targetItags.includes(format.itag?.toString())) {
                    return format.url;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting video download URL:', error);
            return null;
        }
    }

    async getAudioDownloadUrl(format) {
        try {
            const playerResponse = await this.getPlayerResponse();
            if (!playerResponse) return null;

            const adaptiveFormats = playerResponse.streamingData?.adaptiveFormats || [];
            
            // Find audio-only streams
            const audioFormats = adaptiveFormats.filter(f => f.mimeType?.includes('audio'));
            
            // Format preference mapping
            const formatPreference = {
                'mp3': ['mp4a'],
                'm4a': ['mp4a'],
                'webm': ['opus'],
                'wav': ['mp4a'] // Will need conversion
            };

            const preferredCodecs = formatPreference[format] || ['mp4a'];
            
            for (const codec of preferredCodecs) {
                const audioFormat = audioFormats.find(f => 
                    f.mimeType?.includes(codec) && f.url
                );
                if (audioFormat) {
                    return audioFormat.url;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting audio download URL:', error);
            return null;
        }
    }

    async getPlayerResponse() {
        try {
            // Use the global player response if available
            if (window.ytInitialPlayerResponse) {
                return window.ytInitialPlayerResponse;
            }

            // Try to extract from ytplayer.config
            if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
                const playerResponseString = window.ytplayer.config.args.player_response;
                if (playerResponseString) {
                    return JSON.parse(playerResponseString);
                }
            }

            // Fallback: search through script tags
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent;
                const match = content.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
                if (match) {
                    return JSON.parse(match[1]);
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting player response:', error);
            return null;
        }
    }


    sanitizeFilename(filename) {
        // Remove invalid characters for filenames
        return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
    }
}

// Initialize the downloader
const downloader = new YouTubeDownloader();